"""
roll_dice.py - Simulacao fisica de rolagem dos dados no Blender.

Monta um mundo de corpos rigidos em escala de centimetro, lanca cada dado
com posicao/orientacao/impulso aleatorios, roda a simulacao e le qual face
ficou voltada para cima.
"""

import math
import random

import bmesh
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

GRAVIDADE_CM = -981.0   # cm/s^2 (1 BU = 1 cm)
FPS = 60


def _override(**kw):
    sc = bpy.context.scene
    base = dict(scene=sc, view_layer=sc.view_layers[0],
                window=bpy.context.window_manager.windows[0]
                if bpy.context.window_manager.windows else None)
    base = {k: v for k, v in base.items() if v is not None}
    base.update(kw)
    return bpy.context.temp_override(**base)


def _layer_coll(nome, raiz=None):
    raiz = raiz or bpy.context.view_layer.layer_collection
    if raiz.collection.name == nome:
        return raiz
    for c in raiz.children:
        r = _layer_coll(nome, c)
        if r:
            return r
    return None


def free_cache(rbw):
    """Invalida o cache da simulacao. A operacao exige point_cache no contexto."""
    pc = rbw.point_cache
    try:
        with bpy.context.temp_override(scene=bpy.context.scene, point_cache=pc):
            bpy.ops.ptcache.free_bake()
        return True
    except Exception:
        pass
    try:
        with _override():
            bpy.ops.ptcache.free_bake_all()
        return True
    except Exception:
        return False


def dice_objects(names=None):
    c = bpy.data.collections.get("DADOS")
    if c is None:
        return []
    obs = [o for o in c.objects if o.type == "MESH" and "num_faces" in o]
    if names:
        want = set(names)
        obs = [o for o in obs if o.name in want]
    return sorted(obs, key=lambda o: o["resultados"])


def volume(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    v = abs(bm.calc_volume(signed=True))
    bm.free()
    return v


def ensure_world(substeps=12, iterations=12):
    sc = bpy.context.scene
    if sc.rigidbody_world is None:
        with _override():
            bpy.ops.rigidbody.world_add()
    rbw = sc.rigidbody_world
    if rbw.collection is None:
        rbw.collection = bpy.data.collections.new("RigidBodyWorld")
    # limpa referencias a objetos removidos por uma reconstrucao da colecao
    for o in list(rbw.collection.objects):
        if o.name not in bpy.data.objects:
            rbw.collection.objects.unlink(o)
    sc.gravity = (0.0, 0.0, GRAVIDADE_CM)
    sc.render.fps = FPS
    rbw.substeps_per_frame = substeps
    rbw.solver_iterations = iterations
    rbw.enabled = True
    return rbw


def _add_rb(ob, kind):
    if ob.rigid_body is None:
        with _override(object=ob, active_object=ob, selected_objects=[ob]):
            bpy.ops.rigidbody.object_add(type=kind)
    ob.rigid_body.type = kind
    return ob.rigid_body


def make_tray(size=46.0, wall=9.0, thick=1.0):
    """Chao + 4 paredes invisiveis para os dados nao sairem da mesa."""
    made = []
    floor = bpy.data.objects.get("Chao")
    if floor is not None:
        rb = _add_rb(floor, "PASSIVE")
        rb.collision_shape = "MESH"
        rb.friction = 0.75
        rb.restitution = 0.22
        made.append(floor.name)

    for i, (dx, dy, sx, sy) in enumerate([
        (size, 0, thick, size), (-size, 0, thick, size),
        (0, size, size, thick), (0, -size, size, thick),
    ]):
        nm = "Parede_%d" % i
        ob = bpy.data.objects.get(nm)
        if ob is None:
            bpy.ops.mesh.primitive_cube_add(size=2, location=(dx, dy, wall / 2))
            ob = bpy.context.active_object
            ob.name = nm
        ob.location = (dx, dy, wall / 2)
        ob.scale = (sx, sy, wall / 2)
        ob.hide_render = True
        ob.display_type = "WIRE"
        rb = _add_rb(ob, "PASSIVE")
        rb.collision_shape = "BOX"
        rb.friction = 0.5
        rb.restitution = 0.2
        made.append(nm)
    return made


def make_dynamic(ob, densidade=0.02):
    rb = _add_rb(ob, "ACTIVE")
    rb.collision_shape = "CONVEX_HULL"
    rb.mesh_source = "FINAL"
    rb.mass = max(0.05, volume(ob) * densidade)
    rb.friction = 0.62
    rb.restitution = 0.32
    rb.linear_damping = 0.06
    rb.angular_damping = 0.14
    rb.use_margin = True
    rb.collision_margin = 0.002
    rb.use_deactivation = True
    rb.deactivate_linear_velocity = 0.6
    rb.deactivate_angular_velocity = 0.9
    return rb


def _clear_anim(ob):
    ob.animation_data_clear()


def quat_uniforme(rng):
    """Rotacao uniforme em SO(3) (Shoemake). Essencial para a rolagem ser justa."""
    u1, u2, u3 = rng.random(), rng.random(), rng.random()
    s1, s2 = math.sqrt(1.0 - u1), math.sqrt(u1)
    t2, t3 = 2.0 * math.pi * u2, 2.0 * math.pi * u3
    return Quaternion((s2 * math.cos(t3), s1 * math.sin(t2),
                       s1 * math.cos(t2), s2 * math.sin(t3)))


def arm(ob, rng, altura=18.0, espalhar=2.6, variacao=4.0):
    """Posiciona o dado no ar com orientacao aleatoria uniforme.

    Sem keyframes de transformacao: fcurves de location/rotation seguram o
    ultimo valor depois do fim e sobrepoem o solver, congelando o dado no ar.
    O estado inicial do corpo rigido vem do transform do objeto no quadro de
    inicio, entao basta escrever a pose direto.
    """
    hx, hy = ob["home"]
    _clear_anim(ob)
    ob.rotation_mode = "QUATERNION"
    ob.location = (hx + rng.uniform(-espalhar, espalhar),
                   hy + rng.uniform(-espalhar, espalhar),
                   altura + rng.uniform(0.0, variacao))
    ob.rotation_quaternion = quat_uniforme(rng)
    if ob.rigid_body:
        ob.rigid_body.kinematic = False


def evaluated_matrix(ob):
    """Transform do objeto APOS a simulacao.

    O solver de corpos rigidos escreve no objeto avaliado do depsgraph, nao no
    datablock original - ob.matrix_world continua na pose de autoria. Ler o
    original faz todo dado "cair" sempre na mesma face.
    """
    dg = bpy.context.evaluated_depsgraph_get()
    return ob.evaluated_get(dg).matrix_world.copy()


def read_die(ob, limiar=0.90):
    """Le o resultado do dado assentado.

    Convencao 'topo': ha uma face voltada para cima (a normal quase coincide
    com +Z). Vale para todo solido com faces opostas - d6, d8, d20, d120...

    Convencao 'base': nenhuma face aponta para cima, entao le-se a face
    apoiada na mesa. E o caso do tetraedro (d4) e dos dados de numero impar
    de faces em torno de um eixo (d3, d5), exatamente como nos dados reais.
    """
    mw = evaluated_matrix(ob)
    me = ob.data

    if ob.get("vertex_mode"):
        # d4: o resultado e o numero do vertice que aponta para cima
        melhor, zmax = None, -1e9
        for vi, val in zip(list(ob["vert_ids"]), list(ob["vert_values"])):
            z = (mw @ me.vertices[vi].co).z
            if z > zmax:
                zmax, melhor = z, val
        nm = mw.to_3x3().inverted_safe().transposed()
        base = min((nm @ p.normal).normalized().z for p in me.polygons)
        return melhor, -base, "apice"

    nmat = mw.to_3x3().inverted_safe().transposed()
    faces = list(ob["num_faces"])
    vals = list(ob["num_values"])

    topo, d_topo = None, -2.0
    base, d_base = None, 2.0
    for fi, val in zip(faces, vals):
        z = (nmat @ me.polygons[fi].normal).normalized().z
        if z > d_topo:
            d_topo, topo = z, val
        if z < d_base:
            d_base, base = z, val

    if d_topo >= limiar:
        return topo, d_topo, "topo"
    return base, -d_base, "base"


def top_face(ob):
    n, d, _ = read_die(ob)
    return n, d


def simulate(frames, inicio=2):
    """Avanca os quadros. Comeca em 2: o quadro 1 ja e o estado inicial escrito."""
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    for f in range(inicio, frames + 1):
        sc.frame_set(f)


def roll(names=None, frames=150, seed=None, **kw):
    rng = random.Random(seed)
    sc = bpy.context.scene
    rbw = ensure_world()
    make_tray()

    dados = dice_objects(names)
    for ob in dados:
        make_dynamic(ob)
        if ob.name not in rbw.collection.objects:
            rbw.collection.objects.link(ob)

    sc.frame_start = 1
    sc.frame_end = frames
    rbw.point_cache.frame_start = 1
    rbw.point_cache.frame_end = frames
    free_cache(rbw)
    sc.frame_set(1)
    for ob in dados:
        arm(ob, rng, **kw)
    simulate(frames)

    out = []
    for ob in dados:
        num, dot, conv = read_die(ob)
        out.append({
            "dado": ob.name,
            "resultado": num,
            "faces": ob["resultados"],
            "assentado": round(dot, 4),
            "leitura": conv,
            "torto": dot < 0.90,
        })
    return out


def teste_uniformidade(nome, n=300, frames=110, seed=0, acc=None):
    """Rola o mesmo dado n vezes e roda qui-quadrado sobre a distribuicao."""
    rng = random.Random(seed)
    sc = bpy.context.scene
    ensure_world()
    make_tray()
    dados = dice_objects([nome])
    if not dados:
        raise ValueError("dado %s nao encontrado" % nome)
    ob = dados[0]
    make_dynamic(ob)
    rbw = sc.rigidbody_world
    if ob.name not in rbw.collection.objects:
        rbw.collection.objects.link(ob)

    sc.frame_start = 1
    sc.frame_end = frames
    rbw.point_cache.frame_start = 1
    rbw.point_cache.frame_end = frames

    contagem = dict(acc["contagem"]) if acc else {}
    tortos = acc["tortos"] if acc else 0
    feitas = acc["rolagens"] if acc else 0
    rng = random.Random((seed, feitas).__hash__())
    # isola o dado testado: exclui malhas pesadas do depsgraph para a
    # simulacao nao reavaliar a cena inteira a cada quadro
    excluidas, escondidas = [], []
    for cn in ("NUMEROS", "ROTULOS"):
        lc = _layer_coll(cn)
        if lc is not None and not lc.exclude:
            lc.exclude = True
            excluidas.append(lc)
    for outro in dice_objects():
        if outro is not ob and not outro.hide_viewport:
            outro.hide_viewport = True
            escondidas.append(outro)

    try:
        for i in range(n):
            free_cache(rbw)
            sc.frame_set(1)
            arm(ob, rng)
            simulate(frames)
            num, dot, _ = read_die(ob)
            if dot < 0.85:
                tortos += 1
            contagem[num] = contagem.get(num, 0) + 1
    finally:
        for lc in excluidas:
            lc.exclude = False
        for outro in escondidas:
            outro.hide_viewport = False

    faces = ob["resultados"]
    n = feitas + n
    esperado = n / faces
    chi2 = sum((contagem.get(k, 0) - esperado) ** 2 / esperado
               for k in set(list(contagem) + list(ob["num_values"])))
    gl = faces - 1
    # valor critico 95% por Wilson-Hilferty
    crit = gl * (1 - 2.0 / (9 * gl) + 1.6449 * math.sqrt(2.0 / (9 * gl))) ** 3
    return {
        "dado": nome, "rolagens": n, "faces": faces,
        "min": min(contagem.values()), "max": max(contagem.values()),
        "esperado": round(esperado, 2),
        "chi2": round(chi2, 2), "gl": gl, "critico_95": round(crit, 2),
        "uniforme": chi2 < crit, "tortos": tortos,
        "contagem": dict(sorted(contagem.items())),
    }


def reset_grid(deselecionar=True):
    """Devolve os dados as posicoes da grade, apoiados no chao e sem rotacao."""
    from mathutils import Quaternion as _Q
    sc = bpy.context.scene
    free_cache(sc.rigidbody_world) if sc.rigidbody_world else None
    sc.frame_set(1)
    for ob in dice_objects():
        hx, hy = ob["home"]
        dz = -min((ob.matrix_basis.to_3x3() @ v.co).z for v in ob.data.vertices)
        ob.rotation_mode = "QUATERNION"
        ob.rotation_quaternion = _Q((1.0, 0.0, 0.0, 0.0))
        dz = -min(v.co.z for v in ob.data.vertices)
        ob.location = (hx, hy, dz)
        if deselecionar:
            ob.select_set(False)
    bpy.context.view_layer.update()
    for win in bpy.context.window_manager.windows:
        for area in win.screen.areas:
            area.tag_redraw()
    return len(dice_objects())


def mostrar_no_viewport(shading="MATERIAL", esconder_paredes=True):
    """Ajusta a viewport aberta: sombreamento com cor e enquadra so os dados."""
    if esconder_paredes:
        for ob in bpy.data.objects:
            if ob.name.startswith("Parede_"):
                ob.hide_set(True)
    dados = dice_objects()
    for ob in bpy.data.objects:
        ob.select_set(False)
    for ob in dados:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = dados[0]
    n = 0
    for win in bpy.context.window_manager.windows:
        for area in win.screen.areas:
            if area.type != "VIEW_3D":
                continue
            area.spaces.active.shading.type = shading
            rgn = next((r for r in area.regions if r.type == "WINDOW"), None)
            if rgn:
                with bpy.context.temp_override(window=win, area=area, region=rgn):
                    bpy.ops.view3d.view_selected()
                n += 1
            area.tag_redraw()
    for ob in dados:
        ob.select_set(False)
    return n
