# Blender model skriptlari uchun umumiy yordamchilar.
# Skriptda:  sys.path.insert(0, os.path.dirname(__file__)); from common import *
import bpy, bmesh, math, os, sys
from mathutils import Vector


def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return (a[0] if a else os.path.join(os.getcwd(), 'model.glb')), (a[1] if len(a) > 1 else None)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def material(name, hexcol, rough=0.55, metal=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(hexcol), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*lin(hexcol), 1)
        b.inputs['Emission Strength'].default_value = emit
    return m


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def activate(ob):
    for o in list(bpy.context.selected_objects):
        if o:
            o.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)


def apply_mods(ob):
    activate(ob)
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def set_mat(ob, m):
    ob.data.materials.clear()
    ob.data.materials.append(m)


def smooth(ob, angle=40):
    activate(ob)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))


def rbox(name, center, size, m, radius=0.03, segs=2, rot=(0, 0, 0)):
    """yumaloq burchakli quti. center = (x, f, z) — f oldinga (Blender'da -Y); size = (eni, uzunligi, balandligi)"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(center[0], -center[1], center[2]), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    activate(ob)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    set_mat(ob, m)
    if radius > 0:
        bv = ob.modifiers.new('bv', 'BEVEL')
        bv.width = radius
        bv.segments = segs
        bv.use_clamp_overlap = True
        apply_mods(ob)
    activate(ob)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return ob


def cyl(name, center, radius, depth, m, verts=12, axis='X', bevel=0.0):
    rot = {'X': (0, math.pi / 2, 0), 'Y': (math.pi / 2, 0, 0), 'Z': (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth,
                                        location=(center[0], -center[1], center[2]), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    set_mat(ob, m)
    if bevel > 0:
        bv = ob.modifiers.new('bv', 'BEVEL')
        bv.width = bevel
        bv.segments = 1
        apply_mods(ob)
    return ob


def join(objs, name):
    activate(objs[0])
    for o in objs[1:]:
        o.select_set(True)
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    ob.data.name = name
    return ob


def set_origin(ob, loc):
    activate(ob)
    bpy.context.scene.cursor.location = loc
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')


def tri_report(tag):
    tot = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles()
            n = len(ob.data.loop_triangles)
            tot += n
            print('   ', ob.name, n)
    print('[%s] uchburchaklar: %d' % (tag, tot))


def export_glb(path):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    for o in bpy.context.scene.objects:
        o.select_set(o.type == 'MESH')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_texcoords=False)
    print('[export]', path)


def render_views(out_dir, prefix, views, target=(0, 0, 0.6), floor='#e9e4f2', sky='#f3eefa'):
    """views: [(fayl_qo'shimchasi, (x, y, z) kamera joyi), ...] — Blender koordinatasida"""
    scene = bpy.context.scene
    os.makedirs(out_dir, exist_ok=True)
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
    set_mat(bpy.context.active_object, material('floor', floor, 0.9))
    world = bpy.data.worlds.new('w')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*lin(sky), 1)
    bg.inputs['Strength'].default_value = 0.9
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 3.2
    sun.angle = math.radians(12)
    sob = link(bpy.data.objects.new('sun', sun))
    sob.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    try:
        scene.render.engine = 'BLENDER_EEVEE'
    except TypeError:
        scene.render.engine = 'BLENDER_EEVEE_NEXT'
    try:
        scene.eevee.taa_render_samples = 48
    except Exception:
        pass
    scene.view_settings.view_transform = 'AgX'
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    cam = link(bpy.data.objects.new('cam', bpy.data.cameras.new('cam')))
    cam.data.lens = 50
    scene.camera = cam
    for suffix, pos in views:
        cam.location = pos
        cam.rotation_euler = (Vector(target) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(out_dir, '%s_%s.png' % (prefix, suffix))
        bpy.ops.render.render(write_still=True)
        print('[render]', scene.render.filepath)


def surface(target, origin, direction):
    """target sirtiga nur: (nuqta, normal) yoki None. origin/direction Blender koordinatasida"""
    from mathutils import Vector as V
    ok, loc, nrm, _ = target.ray_cast(V(origin), V(direction).normalized())
    return (loc, nrm.normalized()) if ok else None


def place_on(part, target, origin, direction, offset=0.004, yaw=0.0):
    """part'ni (markazi 0 da yasalgan) sirtga yotqizadi: lokal Z = sirt normali, lokal X = dunyo X ga yaqin"""
    from mathutils import Vector as V, Matrix
    hit = surface(target, origin, direction)
    if not hit:
        print('[place_on] sirt topilmadi:', part.name, origin)
        return None
    loc, z = hit
    ref = V((1, 0, 0)) if abs(z.x) < 0.9 else V((0, -1, 0))
    x = (ref - z * ref.dot(z)).normalized()
    y = z.cross(x)
    c, s = math.cos(yaw), math.sin(yaw)
    x, y = x * c + y * s, y * c - x * s
    rot = Matrix((x, y, z)).transposed()
    part.matrix_world = Matrix.Translation(loc + z * offset) @ rot.to_4x4()
    return loc


def export_extra(out_dir, name):
    """foydalanuvchi uchun qo'shimcha formatlar: .blend, .fbx, .obj (+ .mtl) -> out_dir/name.*"""
    os.makedirs(out_dir, exist_ok=True)
    for o in bpy.context.scene.objects:
        o.select_set(o.type == 'MESH')
    base = os.path.join(out_dir, name)
    bpy.ops.export_scene.fbx(filepath=base + '.fbx', use_selection=True, apply_scale_options='FBX_SCALE_ALL',
                             axis_forward='-Z', axis_up='Y', mesh_smooth_type='FACE')
    bpy.ops.wm.obj_export(filepath=base + '.obj', export_selected_objects=True, export_materials=True,
                          forward_axis='NEGATIVE_Z', up_axis='Y')
    bpy.context.preferences.filepaths.save_version = 0   # .blend1 zaxira nusxa kerak emas
    bpy.ops.wm.save_as_mainfile(filepath=base + '.blend', copy=True)
    print('[export]', base + '.{blend,fbx,obj}')
