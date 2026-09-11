"""render_setup.py - camera com enquadramento automatico, luzes e render."""

import math
import os
import bpy
from mathutils import Vector

OUT = "/home/jesus/Progetos/RPG/blender/renders"


def pick_engine():
    items = bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys()
    for cand in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
        if cand in items:
            return cand
    return list(items)[0]


def clear(names):
    for n in names:
        ob = bpy.data.objects.get(n)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)


def setup_world(strength=0.40):
    w = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.028, 0.032, 0.045, 1.0)
    bg.inputs["Strength"].default_value = strength


def setup_lights(scale=1.15):
    clear(["Light", "KeyLight", "FillLight", "RimLight"])
    specs = [
        ("KeyLight", (-20, -24, 40), 26000.0, 18.0, (1.00, 0.95, 0.88)),
        ("FillLight", (24, -16, 26), 11000.0, 22.0, (0.72, 0.84, 1.00)),
        ("RimLight", (0, 30, 22), 16000.0, 26.0, (0.80, 0.88, 1.00)),
    ]
    for name, loc, energy, size, color in specs:
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy * scale
        ld.color = color
        ld.size = size
        ob = bpy.data.objects.new(name, ld)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


def world_points(objs):
    """Cantos das caixas envolventes no espaco do mundo.

    Usa a matriz AVALIADA: depois de uma rolagem, ob.matrix_world ainda guarda
    a pose de autoria, e o enquadramento sairia no lugar errado.
    """
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for ob in objs:
        ev = ob.evaluated_get(dg)
        mw = ev.matrix_world
        for c in ev.bound_box:
            pts.append(mw @ Vector(c))
    return pts


def frame_camera(objs, view_dir=(0.0, 0.52, -0.85), lens=58.0, margin=1.03,
                 res=(2000, 1400), name="Camera"):
    """Posiciona a camera na direcao dada, a distancia minima que enquadra tudo."""
    clear([name])
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cam = bpy.data.objects.new(name, cd)
    bpy.context.scene.collection.objects.link(cam)

    pts = world_points(objs)
    lo = Vector((min(p[i] for p in pts) for i in range(3)))
    hi = Vector((max(p[i] for p in pts) for i in range(3)))
    target = (lo + hi) / 2.0

    f = Vector(view_dir).normalized()
    up_hint = Vector((0.0, 0.0, 1.0))
    right = f.cross(up_hint).normalized()
    up = right.cross(f).normalized()

    sw = cd.sensor_width
    aspect = res[0] / res[1]
    tan_h = (sw / 2.0) / lens
    tan_v = tan_h / aspect

    dist = 1.0
    for p in pts:
        rel = Vector(p) - target
        a, b, c = rel.dot(right), rel.dot(up), rel.dot(f)
        dist = max(dist, abs(a) / tan_h - c, abs(b) / tan_v - c)
    dist *= margin

    cam.location = target - f * dist
    cam.rotation_euler = f.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    return cam


def render(path, res=(2000, 1400), samples=64, exposure=-0.05):
    sc = bpy.context.scene
    sc.render.engine = pick_engine()
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = path
    ee = getattr(sc, "eevee", None)
    if ee is not None:
        if hasattr(ee, "taa_render_samples"):
            ee.taa_render_samples = samples
        for attr in ("use_gtao", "use_raytracing", "use_shadows"):
            if hasattr(ee, attr):
                try:
                    setattr(ee, attr, True)
                except Exception:
                    pass
    if sc.render.engine == "CYCLES":
        sc.cycles.samples = samples
    vs = sc.view_settings
    vs.view_transform = "Standard"   # cores saturadas, estilo foto de produto
    vs.look = "None"
    vs.exposure = exposure
    vs.gamma = 1.0
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    return path


def scene_objects():
    objs = []
    for cn in ("DADOS", "ROTULOS"):
        c = bpy.data.collections.get(cn)
        if c:
            objs += [o for o in c.objects if o.type in ("MESH", "FONT")]
    return objs


def run(res=(2000, 1400)):
    setup_world()
    setup_lights()
    frame_camera(scene_objects(), res=res)
    return render(OUT + "/dados_grade.png", res=res)


RESULT = run()
result = {"render": RESULT, "engine": bpy.context.scene.render.engine}
