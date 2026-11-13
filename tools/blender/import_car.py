# Tayyor (yuklab olingan) mashina modelini o'yinga moslashtirish.
# Ishlatish:
#   blender --background --factory-startup --python tools/blender/import_car.py -- <id> <manba.glb> <art_papka> [render_papka]
#   id: CFG dagi kalit (delorean | az1)
# Qadamlar: import -> ichki/ortiqcha qismlarni o'chirish -> haqiqiy o'lcham, yerga qo'yish ->
#   g'ildiraklarni avtomatik ajratish -> tekstura rangini uchlarga "pishirish" (vertex color) ->
#   materiallarni o'yin kalitlariga (paint/glass/hl/tl/vc) -> har qismni maydoniga qarab soddalashtirish -> glb
import os, sys, re, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import material, export_glb, render_views, tri_report, activate, export_extra
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix

CFG = {
    'delorean': dict(
        length=4.21,
        drop=r'^map2:|Icosphere|Interior_Geo|SeatBelt',
        paint=r'Paint_Material1|^paint_2$', glass=r'Window_Material1', hl=r'LightA_Material|light_glass',
        tl=r'red_glas', wheel=r'Wheel1A|Calliper', body_tris=18000, wheel_tris=800, paint_col='#b9bcbf'),
    'az1': dict(
        length=None,
        drop=r'^(Interior|Leather|Red_leather|Chassis|Needle|Speedometer|Metal_Red|Interior_Light|Shade|Shadeless_shader|Red_Plastic|Simple_Plastic|aZ-1)$',
        paint=r'^Car_Paint$', glass=r'Glass|Transpraent', hl=r'^Head_light$|^Front_In_Light$',
        tl=r'^Tail_Red_Light$', wheel=r'^wheel|^Tire$|Rim_Chrome|DiskChrome', body_tris=16000, wheel_tris=800,
        paint_col='#c8102e'),
}

argv = sys.argv[sys.argv.index('--') + 1:]
CID, SRC, ART = argv[0], argv[1], argv[2]
RENDER_DIR = argv[3] if len(argv) > 3 else None
C = CFG[CID]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene


def meshes():
    return [o for o in sc.objects if o.type == 'MESH']


def mats_of(o):
    return [m.name if m else '' for m in o.data.materials]


# ---------- 1. ierarxiyani tekislash, transformlarni qo'llash ----------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
for o in list(sc.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = meshes()[0]
bpy.ops.object.make_single_user(object=True, obdata=True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---------- 2. keraksiz qismlar ----------
drop = re.compile(C['drop'])
removed = 0
for o in meshes():
    ms = mats_of(o)
    if drop.search(o.name) or (ms and all(drop.search(m) for m in ms)) or not len(o.data.polygons):
        bpy.data.objects.remove(o, do_unlink=True)
        removed += 1
print('[import] o\'chirildi:', removed, 'qoldi:', len(meshes()))


# ---------- 3. o'lcham va joylashuv ----------
def bbox(objs):
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in objs:
        for v in o.data.vertices:
            p = v.co
            lo = Vector((min(lo.x, p.x), min(lo.y, p.y), min(lo.z, p.z)))
            hi = Vector((max(hi.x, p.x), max(hi.y, p.y), max(hi.z, p.z)))
    return lo, hi


def obj_bbox(o):
    co = np.empty(len(o.data.vertices) * 3)
    o.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    return Vector(co.min(0)), Vector(co.max(0))


lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for o in meshes():
    a, b = obj_bbox(o)
    lo = Vector(np.minimum(lo, a))
    hi = Vector(np.maximum(hi, b))
s = (C['length'] / (hi.y - lo.y)) if C['length'] else 1.0
off = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
M = Matrix.Scale(s, 4) @ Matrix.Translation(-off)
for o in meshes():
    o.data.transform(M)
    o.data.update()
lo, hi = (M @ lo), (M @ hi)
print('[import] o\'lcham: eni %.2f uzunligi %.2f balandligi %.2f (masshtab %.3f)' % (hi.x - lo.x, hi.y - lo.y, hi.z - lo.z, s))

# ---------- 4. g'ildiraklar ----------
wre = re.compile(C['wheel'])
quad = {}
for o in meshes():
    if any(wre.search(m) for m in mats_of(o)) or wre.search(o.name):
        a, b = obj_bbox(o)
        c = (a + b) / 2
        key = ('front' if c.y < 0 else 'back', 'left' if c.x > 0 else 'right')
        quad.setdefault(key, []).append((o, a, b))
WHEELS = {}
for key, items in quad.items():
    a = Vector(np.min([np.array(i[1]) for i in items], 0))
    b = Vector(np.max([np.array(i[2]) for i in items], 0))
    r = (b.z - a.z) / 2
    WHEELS[key] = dict(c=Vector(((a.x + b.x) / 2, (a.y + b.y) / 2, a.z + r)), r=r, objs=[i[0] for i in items])
for o in meshes():
    if any(o in w['objs'] for w in WHEELS.values()):
        continue
    a, b = obj_bbox(o)
    c = (a + b) / 2
    for w in WHEELS.values():
        if (c - w['c']).length < w['r'] * 0.9 and max(b - a) < w['r'] * 2.3:
            w['objs'].append(o)
            break
for k, w in WHEELS.items():
    print('[import] g\'ildirak', k, 'markaz', tuple(round(v, 2) for v in w['c']), 'r=%.2f' % w['r'], len(w['objs']), 'qism')


# ---------- 5. tekstura rangini uchlarga pishirish ----------
def s2l(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


IMG_CACHE = {}


def image_array(img):
    if img.name not in IMG_CACHE:
        w, h = img.size
        px = np.empty(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        arr = px.reshape(h, w, 4)[:, :, :3]
        if img.colorspace_settings.name.lower().startswith('srgb') and not img.is_float:
            arr = s2l(arr)
        IMG_CACHE[img.name] = arr
    return IMG_CACHE[img.name]


def base_info(m):
    """(asosiy rang (lineal), tekstura yoki None)"""
    if not m or not m.use_nodes:
        return np.array([0.6, 0.6, 0.6]), None
    bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        return np.array([0.5, 0.5, 0.5]), None
    inp = bsdf.inputs['Base Color']
    col = np.array(inp.default_value[:3])
    tex = None
    stack = [l.from_node for l in inp.links]
    seen = 0
    while stack and seen < 6:
        n = stack.pop()
        seen += 1
        if n.type == 'TEX_IMAGE' and n.image and n.image.size[0] > 0:
            tex = n.image
            break
        for i in n.inputs:
            stack.extend(l.from_node for l in i.links)
    if tex is not None:
        col = np.array([1.0, 1.0, 1.0])
        # MIX/MULTIPLY bo'lsa ham tekstura asosiy manba
    return col, tex


for o in meshes():
    me = o.data
    nl = len(me.loops)
    cols = np.ones((nl, 4), dtype=np.float32)
    pm = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('material_index', pm)
    ls = np.empty(len(me.polygons), dtype=np.int32)
    lt = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_start', ls)
    me.polygons.foreach_get('loop_total', lt)
    loop_mat = np.repeat(pm, lt)
    uv = None
    if me.uv_layers:
        uv = np.empty(nl * 2, dtype=np.float32)
        me.uv_layers.active.data.foreach_get('uv', uv)
        uv = uv.reshape(-1, 2)
    for mi, m in enumerate(me.materials):
        sel = loop_mat == mi
        if not sel.any():
            continue
        col, tex = base_info(m)
        if tex is not None and uv is not None:
            arr = image_array(tex)
            h, w = arr.shape[:2]
            u = np.mod(uv[sel, 0], 1.0)
            v = np.mod(uv[sel, 1], 1.0)
            px = arr[np.clip((v * h).astype(int), 0, h - 1), np.clip((u * w).astype(int), 0, w - 1)]
            cols[sel, :3] = px * col
        else:
            cols[sel, :3] = col
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    attr.data.foreach_set('color', cols.ravel())
    me.color_attributes.active_color = attr

# ---------- 6. materiallarni o'yin kalitlariga ----------
KEYM = {}
for k, hexc in (('paint', C['paint_col']), ('glass', '#1f2a36'), ('hl', '#fff4d8'), ('tl', '#d8332b'), ('vc', '#ffffff')):
    KEYM[k] = material(k, hexc, 0.4)
REG = [(k, re.compile(C[k])) for k in ('paint', 'glass', 'hl', 'tl')]


def key_of(name):
    for k, r in REG:
        if r.search(name or ''):
            return k
    return 'vc'


for o in meshes():
    for i, slot in enumerate(o.material_slots):
        slot.material = KEYM[key_of(slot.material.name if slot.material else '')]


# ---------- 7. soddalashtirish: har qismga maydoniga mos byudjet ----------
def area_tris(o):
    me = o.data
    me.calc_loop_triangles()
    a = np.empty(len(me.polygons))
    me.polygons.foreach_get('area', a)
    return float(a.sum()), len(me.loop_triangles)


def decimate(objs, budget):
    info = [(o,) + area_tris(o) for o in objs]
    tot_a = sum(i[1] for i in info) or 1
    for o, a, t in info:
        want = max(24, budget * a / tot_a)
        ratio = min(1.0, want / max(t, 1))
        if ratio < 0.98:
            d = o.modifiers.new('dec', 'DECIMATE')
            d.ratio = ratio
            d.use_collapse_triangulate = True
            activate(o)
            bpy.ops.object.modifier_apply(modifier='dec')


wheel_objs = set(o for w in WHEELS.values() for o in w['objs'])
body_objs = [o for o in meshes() if o not in wheel_objs]
decimate(body_objs, C['body_tris'])
for w in WHEELS.values():
    decimate(w['objs'], C['wheel_tris'])


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


body = join(body_objs, 'body')
for (fb, lr), w in WHEELS.items():
    wo = join(w['objs'], 'wheel-%s-%s' % (fb, lr))
    activate(wo)
    sc.cursor.location = w['c']
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
for o in meshes():
    for p in o.data.polygons:
        p.use_smooth = True

tri_report(CID)
os.makedirs(ART, exist_ok=True)
out = os.path.join(ART, CID + '.glb')
for o in sc.objects:
    o.select_set(o.type == 'MESH')
kw = dict(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_texcoords=False)
for extra in (dict(export_vertex_color='ACTIVE'), dict(export_colors=True), {}):
    try:
        bpy.ops.export_scene.gltf(**kw, **extra)
        print('[import] eksport', out, extra)
        break
    except TypeError as e:
        print('[import] eksport varianti ishlamadi:', extra, e)
export_extra(os.path.join(ART, 'export', CID), CID)

if RENDER_DIR:
    # vertex color'ni ko'rsatish uchun 'vc' materialiga Color Attribute ulash
    m = KEYM['vc']
    nt = m.node_tree
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    L = hi.y - lo.y
    d = L * 1.3
    render_views(RENDER_DIR, CID, [('front', (d * 0.78, -d * 0.95, 2.0)), ('rear', (-d * 0.8, d * 0.9, 2.2)),
                                   ('side', (d * 1.5, 0, 0.9))], target=(0, 0, 0.55))
