# Yuklab olingan mashina modelini o'yinga tayyorlash: asl teksturalar/materiallar saqlanadi,
# geometriya telefon ko'taradigan darajaga soddalashtiriladi (+ uzoq masofa uchun LOD).
# Ishlatish:
#   blender --background --factory-startup --python tools/blender/import_full.py -- <id> <manba.glb> <chiqish.glb>
# Natija: <chiqish>.glb (~40k uchburchak: body + wheel-front-left ...) va <chiqish>_lod.glb (~4k, teksturasiz —
#   o'yin materiallarni asl modeldan nom bo'yicha oladi). Draco siqish.
# Byudjet ko'rinish muhimligiga qarab: hi (kuzov, oyna, chiroq) x3, lo (salon ichi, tag) x0.15; LOD'da lo o'chiriladi.
import os, sys, re
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix

CFG = {
    'delorean': dict(length=4.21, junk=r'^Icosphere$', wheel=r'Wheel1A|Calliper',
                     hi=r'Paint|Window|Light|light_glass|red_glas|orange_glass|Grille|Badge', lo=r'Interior|SeatBelt'),
    'az1': dict(length=None, junk=r'^$', wheel=r'^wheel|^Tire$|Rim_Chrome|DiskChrome|Metal_Red',
                hi=r'Car_Paint|Glass|Transpraent|Head_light|Tail_|Front_In_Light|Chrome|Plastic_bumper|Glossy_Panel|Roof|Mirror',
                lo=r'^(Interior|Leather|Red_leather|Chassis|Shadeless_shader|Red_Plastic|Needle|Speedometer|Interior_Light|Shade|Simple_Plastic|aZ-1|Metal_Red)$'),
}
argv = sys.argv[sys.argv.index('--') + 1:]
CID, SRC, OUT = argv[0], argv[1], argv[2]
C = CFG[CID]
HI, LO = re.compile(C['hi']), re.compile(C['lo'])
BODY_T = int(os.environ.get('BODY_TRIS', 36000))
WHEEL_T = int(os.environ.get('WHEEL_TRIS', 1100))
LOD_T = int(os.environ.get('LOD_TRIS', 4000))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene


def meshes():
    return [o for o in sc.objects if o.type == 'MESH']


def mats_of(o):
    return [m.name if m else '' for m in o.data.materials]


# ---------- tekislash, keraksizlar, transformlar ----------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
for o in list(sc.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
junk = re.compile(C['junk'])
for o in meshes():
    if junk.search(o.name):
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = meshes()[0]
bpy.ops.object.make_single_user(object=True, obdata=True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def obj_bbox(o):
    co = np.empty(len(o.data.vertices) * 3)
    o.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    return Vector(co.min(0)), Vector(co.max(0))


lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for o in meshes():
    a, b = obj_bbox(o)
    lo, hi = Vector(np.minimum(lo, a)), Vector(np.maximum(hi, b))
s = (C['length'] / (hi.y - lo.y)) if C['length'] else 1.0
M = Matrix.Scale(s, 4) @ Matrix.Translation(-Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)))
for o in meshes():
    o.data.transform(M)
    o.data.update()
lo, hi = M @ lo, M @ hi
print("[full] o'lcham: eni %.2f uzunligi %.2f balandligi %.2f" % (hi.x - lo.x, hi.y - lo.y, hi.z - lo.z))

# ---------- g'ildiraklar ----------
wre = re.compile(C['wheel'])
quad = {}
for o in meshes():
    if any(wre.search(m) for m in mats_of(o)) or wre.search(o.name):
        a, b = obj_bbox(o)
        c = (a + b) / 2
        if abs(c.x) < (hi.x - lo.x) * 0.25 or c.z > (hi.z - lo.z) * 0.45:
            continue      # rul chambaragi va ichki qismlar g'ildirak emas
        quad.setdefault(('front' if c.y < 0 else 'back', 'left' if c.x > 0 else 'right'), []).append((o, a, b))
assigned = set()
groups = {}
for key, items in quad.items():
    a = Vector(np.min([np.array(i[1]) for i in items], 0))
    b = Vector(np.max([np.array(i[2]) for i in items], 0))
    r = (b.z - a.z) / 2
    groups[key] = dict(c=Vector(((a.x + b.x) / 2, (a.y + b.y) / 2, a.z + r)), r=r, objs=[i[0] for i in items])
    assigned.update(i[0] for i in items)
for o in meshes():
    if o in assigned:
        continue
    a, b = obj_bbox(o)
    cc = (a + b) / 2
    for g in groups.values():
        if (cc - g['c']).length < g['r'] * 0.9 and max(b - a) < g['r'] * 2.3:
            g['objs'].append(o)
            assigned.add(o)
            break


# ---------- soddalashtirish ----------
def tris_of(o):
    o.data.calc_loop_triangles()
    return len(o.data.loop_triangles)


def area_of(o):
    a = np.empty(len(o.data.polygons))
    o.data.polygons.foreach_get('area', a)
    return float(a.sum())


def prio(o):
    ms = mats_of(o)
    if ms and all(LO.search(m) for m in ms):
        return 0.15
    if any(HI.search(m) for m in ms):
        return 3.0
    return 1.0


def dec(o, ratio):
    d = o.modifiers.new('dec', 'DECIMATE')
    d.ratio = max(0.0005, min(1.0, ratio))
    d.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='dec')


def decimate(objs, budget):
    """har qismga (maydon x muhimlik) ulushida uchburchak byudjeti (UV va materiallar saqlanadi)"""
    info = [(o, area_of(o) * prio(o), tris_of(o)) for o in objs]
    tot = sum(i[1] for i in info) or 1
    for o, w, t in info:
        want = max(12, budget * w / tot)
        if t > want * 1.1:
            dec(o, want / t)
            t2 = tris_of(o)
            if t2 > want * 1.5:      # ba'zan bir o'tishda yetarli kamaymaydi
                dec(o, want / t2)


def join(objs, name, origin=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    if origin is not None:
        sc.cursor.location = origin
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return ob


def export(path, images=True):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes():
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_image_format='AUTO' if images else 'NONE',
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                              export_draco_position_quantization=16, export_draco_normal_quantization=12,
                              export_draco_texcoord_quantization=14, export_draco_color_quantization=10)
    print('[full] eksport:', path, '%.2f MB' % (os.path.getsize(path) / 1048576), sum(tris_of(o) for o in meshes()), 'uchburchak')


print('[full] asl uchburchaklar:', sum(tris_of(o) for o in meshes()))
body_objs = [o for o in meshes() if o not in assigned]
decimate(body_objs, BODY_T)
for g in groups.values():
    decimate(g['objs'], WHEEL_T)
body = join(body_objs, 'body')       # bitta mesh: chizish chaqiruvi = material soni
wheels = []
for (fb, lr), g in groups.items():
    wheels.append(join(g['objs'], 'wheel-%s-%s' % (fb, lr), g['c']))
    print("[full] g'ildirak", fb, lr, tuple(round(v, 2) for v in g['c']))
export(OUT)

# ---------- LOD: salon ichi va tag o'chiriladi, g'ildiraklar kuzovga, ~4k ----------
for o in [body] + wheels:
    bm = bmesh.new()
    bm.from_mesh(o.data)
    names = mats_of(o)
    dead = [f for f in bm.faces if f.material_index < len(names) and LO.search(names[f.material_index])]
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(o.data)
    bm.free()
lod = join([body] + wheels, 'lod')
for _ in range(3):
    t = tris_of(lod)
    if t <= LOD_T * 1.15:
        break
    dec(lod, LOD_T / t)
export(OUT.replace('.glb', '_lod.glb'), images=False)
