"""
dice_lib.py - Gerador procedural de dados poliedricos para Blender.

Metodo:
  * Solidos platonicos  -> coordenadas exatas.
  * Solidos de Catalan  -> dual polar do solido de Arquimedes correspondente,
                           cujos vertices sao a orbita de um ponto semente sob
                           o grupo de rotacao octaedrico (24) ou icosaedrico (60).
  * Trapezoedros        -> dual polar do antiprisma uniforme de n lados.
  * Bipiramides         -> dual polar do prisma uniforme de n lados.
  * Zocchiedro (d100)   -> dual polar do fecho convexo de 100 pontos Fibonacci.

Unidade: 1 Blender Unit = 1 cm.
"""

import math
import bmesh
import bpy
from mathutils import Matrix, Vector

PHI = (1.0 + 5.0 ** 0.5) / 2.0
SQ2 = 2.0 ** 0.5


# --------------------------------------------------------------- utilitarios

def _vkey(v, nd=6):
    return tuple(round(float(c), nd) + 0.0 for c in v)


def _mkey(m, nd=5):
    return tuple(round(float(m[i][j]), nd) + 0.0 for i in range(3) for j in range(3))


def _mmul(a, b):
    """Produto 3x3 em float64 puro (mathutils.Matrix e precisao simples)."""
    return tuple(
        tuple(sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3))
        for i in range(3)
    )


def _mapply(m, v):
    return (
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    )


def _rot(axis, angle):
    """Rotacao de Rodrigues como tupla 3x3 de float64."""
    n = math.sqrt(sum(c * c for c in axis))
    x, y, z = (c / n for c in axis)
    c, s = math.cos(angle), math.sin(angle)
    t = 1.0 - c
    return (
        (t * x * x + c,     t * x * y - s * z, t * x * z + s * y),
        (t * x * y + s * z, t * y * y + c,     t * y * z - s * x),
        (t * x * z - s * y, t * y * z + s * x, t * z * z + c),
    )


_IDENT3 = ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))


def close_group(gens, limit=256):
    """Fecho multiplicativo de um conjunto de geradores de rotacao."""
    elems = {_mkey(_IDENT3): _IDENT3}
    frontier = [_IDENT3]
    while frontier:
        nxt = []
        for a in frontier:
            for g in gens:
                b = _mmul(g, a)
                k = _mkey(b)
                if k not in elems:
                    elems[k] = b
                    nxt.append(b)
                    if len(elems) > limit:
                        raise RuntimeError(
                            "grupo nao fechou: %d elementos" % len(elems))
        frontier = nxt
    return list(elems.values())


_GROUPS = {}


def group_oct():
    """Grupo de rotacao octaedrico O, ordem 24."""
    if "O" not in _GROUPS:
        g = close_group(
            [_rot((0, 0, 1), math.pi / 2), _rot((1, 1, 1), 2 * math.pi / 3)], limit=48
        )
        assert len(g) == 24, "grupo octaedrico com %d elementos" % len(g)
        _GROUPS["O"] = g
    return _GROUPS["O"]


def group_ico():
    """Grupo de rotacao icosaedrico I, ordem 60."""
    if "I" not in _GROUPS:
        g = close_group(
            [_rot((0, 1, PHI), 2 * math.pi / 5), _rot((1, 1, 1), 2 * math.pi / 3)],
            limit=120,
        )
        assert len(g) == 60, "grupo icosaedrico com %d elementos" % len(g)
        _GROUPS["I"] = g
    return _GROUPS["I"]


def group_oct_full():
    """Grupo octaedrico completo O_h (com reflexoes), ordem 48."""
    if "Oh" not in _GROUPS:
        g = close_group(
            [_rot((0, 0, 1), math.pi / 2),
             _rot((1, 1, 1), 2 * math.pi / 3),
             ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, -1.0))],
            limit=96,
        )
        assert len(g) == 48, "O_h com %d elementos" % len(g)
        _GROUPS["Oh"] = g
    return _GROUPS["Oh"]


def group_ico_full():
    """Grupo icosaedrico completo I_h (com inversao), ordem 120."""
    if "Ih" not in _GROUPS:
        g = close_group(
            [_rot((0, 1, PHI), 2 * math.pi / 5),
             _rot((1, 1, 1), 2 * math.pi / 3),
             ((-1.0, 0.0, 0.0), (0.0, -1.0, 0.0), (0.0, 0.0, -1.0))],
            limit=240,
        )
        assert len(g) == 120, "I_h com %d elementos" % len(g)
        _GROUPS["Ih"] = g
    return _GROUPS["Ih"]


def orbit(group, seed):
    seed = tuple(float(c) for c in seed)
    out = {}
    for m in group:
        p = _mapply(m, seed)
        out[_vkey(p)] = p
    return list(out.values())


# ------------------------------------------------------- fecho convexo / dual

def hull_bm(points, merge=True):
    """Fecho convexo dos pontos; funde triangulos coplanares em n-gons."""
    bm = bmesh.new()
    for p in points:
        bm.verts.new(Vector(p))
    bm.verts.ensure_lookup_table()
    res = bmesh.ops.convex_hull(bm, input=bm.verts, use_existing_faces=False)
    for key in ("geom_unused", "geom_interior"):
        geom = [g for g in res.get(key, []) if g.is_valid]
        if geom:
            bmesh.ops.delete(bm, geom=geom, context="VERTS")
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if merge:
        bmesh.ops.dissolve_limit(
            bm,
            angle_limit=math.radians(0.75),
            verts=bm.verts[:],
            edges=bm.edges[:],
            delimit=set(),
        )
    bm.normal_update()
    return bm


def polar_dual_points(bm):
    """Vertice dual = n/d para cada face de plano x.n = d."""
    pts = []
    for f in bm.faces:
        n = f.normal.normalized()
        d = n.dot(f.verts[0].co)
        if abs(d) < 1e-9:
            continue
        pts.append(n / d)
    return pts


def dual_of(points):
    bm = hull_bm(points)
    pts = polar_dual_points(bm)
    bm.free()
    return hull_bm(pts)


# ------------------------------------------------------------------ familias

def platonic(kind):
    if kind == "tetra":
        pts = [(1, 1, 1), (1, -1, -1), (-1, 1, -1), (-1, -1, 1)]
    elif kind == "cube":
        pts = [(x, y, z) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    elif kind == "octa":
        pts = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
    elif kind == "dodeca":
        pts = [(x, y, z) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
        for a in (-1, 1):
            for b in (-1, 1):
                pts += [
                    (0, a / PHI, b * PHI),
                    (a / PHI, b * PHI, 0),
                    (a * PHI, 0, b / PHI),
                ]
    elif kind == "icosa":
        pts = []
        for a in (-1, 1):
            for b in (-1, 1):
                pts += [(0, a, b * PHI), (a, b * PHI, 0), (a * PHI, 0, b)]
    else:
        raise ValueError(kind)
    return hull_bm(pts)


def catalan(group, seed):
    """Solido de Catalan = dual polar da orbita da semente."""
    return dual_of(orbit(group, seed))


def antiprism_points(n):
    """Antiprisma uniforme de n lados, aresta 1."""
    R = 1.0 / (2.0 * math.sin(math.pi / n))
    h2 = 1.0 - 2.0 * R * R * (1.0 - math.cos(math.pi / n))
    h = math.sqrt(max(h2, 1e-9))
    pts = []
    for k in range(n):
        a = 2.0 * math.pi * k / n
        b = a + math.pi / n
        pts.append((R * math.cos(a), R * math.sin(a), h / 2.0))
        pts.append((R * math.cos(b), R * math.sin(b), -h / 2.0))
    return pts


def prism_points(n, h_ratio=1.0):
    """Prisma de n lados, aresta lateral = h_ratio * aresta da base."""
    R = 1.0 / (2.0 * math.sin(math.pi / n))
    h = h_ratio
    pts = []
    for k in range(n):
        a = 2.0 * math.pi * k / n
        pts.append((R * math.cos(a), R * math.sin(a), h / 2.0))
        pts.append((R * math.cos(a), R * math.sin(a), -h / 2.0))
    return pts


def _antiprism_rh(n, R):
    """Pontos de um antiprisma de n lados, raio R, meia-altura 1."""
    pts = []
    for k in range(n):
        a = 2.0 * math.pi * k / n
        b = a + math.pi / n
        pts.append((R * math.cos(a), R * math.sin(a), 1.0))
        pts.append((R * math.cos(b), R * math.sin(b), -1.0))
    return pts


def _antiprism_side_dist(n, R):
    """Distancia da origem ao plano de uma face lateral triangular."""
    a0 = Vector((R, 0.0, 1.0))
    a1 = Vector((R * math.cos(2 * math.pi / n), R * math.sin(2 * math.pi / n), 1.0))
    b0 = Vector((R * math.cos(math.pi / n), R * math.sin(math.pi / n), -1.0))
    nrm = (a1 - a0).cross(b0 - a0)
    if nrm.length < 1e-12:
        return 0.0
    return abs(nrm.normalized().dot(a0))


def trapezohedron(n, k=1.2):
    """Trapezoedro de n lados -> 2n faces em pipa (kite).

    k = razao entre a distancia do apice e o raio equatorial do solido.
    k=1 da um dado 'redondo'; k>1 alonga as pontas (formato do d10 real).
    """
    lo, hi = 1e-4, 1e4
    for _ in range(120):                      # bisecao: acha R com d_lateral = k
        mid = (lo + hi) / 2.0
        if _antiprism_side_dist(n, mid) < k:
            lo = mid
        else:
            hi = mid
    R = (lo + hi) / 2.0
    return dual_of(_antiprism_rh(n, R))


def bipyramid(n, k=1.0):
    """Bipiramide de n lados -> 2n faces triangulares.

    k=1 deixa a distancia do apice igual ao raio equatorial (formato redondo);
    k>1 alonga o dado, k<1 achata.
    """
    return dual_of(prism_points(n, h_ratio=k / math.sin(math.pi / n)))


def prism_die(n, h_ratio=1.15):
    """Prisma como dado: n faces retangulares + 2 tampas = n+2 faces."""
    return hull_bm(prism_points(n, h_ratio=h_ratio))


def rolling_log(n, R=1.0, body=2.4, tip=0.75):
    """Bastao rolante: n faces laterais uteis + 2 pontas conicas."""
    bm = bmesh.new()
    top, bot = [], []
    off = math.pi / n
    for k in range(n):
        a = 2.0 * math.pi * k / n + off
        x, y = R * math.cos(a), R * math.sin(a)
        top.append(bm.verts.new((x, y, body / 2.0)))
        bot.append(bm.verts.new((x, y, -body / 2.0)))
    ap_t = bm.verts.new((0, 0, body / 2.0 + tip))
    ap_b = bm.verts.new((0, 0, -body / 2.0 - tip))
    for k in range(n):
        j = (k + 1) % n
        bm.faces.new((bot[k], bot[j], top[j], top[k]))
        bm.faces.new((top[k], top[j], ap_t))
        bm.faces.new((bot[j], bot[k], ap_b))
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return bm


def prism_points_rh(n, R, h):
    pts = []
    for k in range(n):
        a = 2.0 * math.pi * k / n
        pts.append((R * math.cos(a), R * math.sin(a), h / 2.0))
        pts.append((R * math.cos(a), R * math.sin(a), -h / 2.0))
    return pts


def sphere_with_flats(n, R=1.0, cut=0.5, subdiv=4):
    """Esfera com n cortes planos em volta de um eixo - o d3/d5 de referencia real.

    As faces de corte ficam LISAS (sem numero); os algarismos vao gravados nos
    vaos curvos entre facetas vizinhas (ver dice_numbers.build_belt_numbers).
    Isso reproduz a peca fisica de referencia (fotografada e escaneada em STL):
    3 (ou 5) facetas circulares planas de apoio, sem gravacao, e o numero
    aparece na regiao arredondada entre duas facetas - a que fica no topo
    quando a peca esta apoiada na faceta oposta.

    `cut` e a distancia do plano de corte ao centro, em fracao de R: quanto
    mais perto de 1.0, mais raso o corte (faceta pequena); valores da peca
    real ficam por volta de 0.5-0.6.
    """
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=R)
    for k in range(n):
        ang = 2.0 * math.pi * k / n
        normal = Vector((math.cos(ang), math.sin(ang), 0.0))
        co = normal * (R * cut)
        res = bmesh.ops.bisect_plane(
            bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
            plane_co=co, plane_no=normal, clear_outer=True,
        )
        corte = [g for g in res["geom_cut"] if isinstance(g, bmesh.types.BMEdge)]
        if corte:
            bmesh.ops.edgeloop_fill(bm, edges=corte)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return bm


def gap_value_for_flat(n, k, start=1):
    """Numero que aparece no topo quando a faceta `k` (0-indexado) fica embaixo.

    Vale para n IMPAR (caso do d3/d5): o ponto mais alto, quando a faceta k
    esta apoiada na mesa, e sempre o centro exato do vao entre duas OUTRAS
    facetas - nunca uma faceta isolada. A prova: se as facetas ficam em
    angulos a_j = j*360/n e os vaos em g_j = (j+0.5)*360/n, o topo da faceta
    k fica em a_k+180. Resolvendo a_k+180 = g_j da j = k + (n-1)/2 (mod n),
    que so cai em inteiro quando n e impar - por isso essa peca nao existe
    com n par.
    """
    if n % 2 == 0:
        raise ValueError("gap_value_for_flat exige n impar (d3, d5, d7 impar...)")
    j = int(k + (n - 1) // 2) % n
    return start + j


def rounded_die(n, R=1.15, body=0.80, tip=0.78, offset=0.34, segments=14):
    """Dado 'almofada' arredondado com n faces laterais planas (d3 / d5 reais).

    O corpo e um prisma de n lados terminado em duas pontas conicas; o bisel
    pesado arredonda tudo menos as faces laterais. Sem tampa plana, o dado nao
    tem apoio estavel nas extremidades: so pode parar sobre uma das n faces.
    """
    bm = rolling_log(n, R=R, body=body, tip=tip)
    bmesh.ops.bevel(
        bm,
        geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
        offset=offset,
        offset_type="OFFSET",
        segments=segments,
        profile=0.5,
        affect="EDGES",
        clamp_overlap=True,
        loop_slide=True,
    )
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return bm


def coin(segments=64, R=1.0, thick=0.34):
    """d2 - moeda/lente."""
    bm = bmesh.new()
    try:
        bmesh.ops.create_cone(
            bm, cap_ends=True, cap_tris=False, segments=segments,
            radius1=R, radius2=R, depth=thick,
        )
    except TypeError:
        bmesh.ops.create_cone(
            bm, cap_ends=True, cap_tris=False, segments=segments,
            diameter1=R, diameter2=R, depth=thick,
        )
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    return bm


def sphere(subdiv=4, R=1.0):
    """d1 - esfera."""
    bm = bmesh.new()
    try:
        bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=R)
    except TypeError:
        bmesh.ops.create_icosphere(bm, subdivisions=subdiv, diameter=R)
    bm.normal_update()
    return bm


def fibonacci_points(n):
    pts = []
    ga = math.pi * (3.0 - 5.0 ** 0.5)
    for i in range(n):
        z = 1.0 - 2.0 * (i + 0.5) / n
        r = math.sqrt(max(0.0, 1.0 - z * z))
        a = ga * i
        pts.append((r * math.cos(a), r * math.sin(a), z))
    return pts


def zocchihedron(n=100):
    """d100 - aproximacao do Zocchiedro: dual polar de n pontos Fibonacci."""
    bm = hull_bm(fibonacci_points(n), merge=False)
    pts = polar_dual_points(bm)
    bm.free()
    return hull_bm(pts)


# --------------------------------------------------------------- normalizacao

def normalize(bm, size, w_in=0.35):
    """Centraliza no centroide e escala pelo raio de referencia.

    O raio de referencia mistura o raio inscrito e o circunscrito, para que
    solidos pontudos (tetraedro, trapezoedro) nao fiquem visualmente menores
    que solidos redondos com o mesmo diametro nominal.
    """
    cen = Vector((0.0, 0.0, 0.0))
    for v in bm.verts:
        cen += v.co
    cen /= len(bm.verts)
    for v in bm.verts:
        v.co -= cen
    bm.normal_update()
    rout = max(v.co.length for v in bm.verts)
    rin = min(abs(f.normal.normalized().dot(f.verts[0].co)) for f in bm.faces)
    rref = w_in * rin + (1.0 - w_in) * rout
    s = (size / 2.0) / rref
    for v in bm.verts:
        v.co *= s
    bm.normal_update()
    return bm


def face_stats(bm):
    """(n_faces, n_verts, n_edges, raio_inscrito, raio_circunscrito)."""
    rin = min(abs(f.normal.normalized().dot(f.verts[0].co)) for f in bm.faces)
    rout = max(v.co.length for v in bm.verts)
    return len(bm.faces), len(bm.verts), len(bm.edges), rin, rout


def bm_to_object(bm, name, coll, color=(0.8, 0.2, 0.2, 1.0), bevel=0.0,
                 material=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    me.update()
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)

    if material is not None:
        ob.data.materials.append(material)
        if bevel > 0.0:
            m = ob.modifiers.new("Bevel", "BEVEL")
            m.width = bevel
            m.segments = 3
            m.limit_method = "ANGLE"
            m.angle_limit = math.radians(25.0)
        for p in ob.data.polygons:
            p.use_smooth = smooth
        return ob

    mat = bpy.data.materials.get("MAT_" + name)
    if mat is None:
        mat = bpy.data.materials.new("MAT_" + name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = color
            bsdf.inputs["Roughness"].default_value = 0.22
            for key in ("Specular IOR Level", "Specular"):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = 0.55
                    break
    ob.data.materials.append(mat)

    if bevel > 0.0:
        m = ob.modifiers.new("Bevel", "BEVEL")
        m.width = bevel
        m.segments = 3
        m.limit_method = "ANGLE"
        m.angle_limit = math.radians(25.0)
        m.harden_normals = False
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob
