"""
dice_numbers.py - Numeracao e cor por face.

  * escolhe quais faces recebem numero (estrategia por tipo de dado);
  * numera com a regra classica "faces opostas somam N+1" quando o solido
    e centralmente simetrico, senao numera em sequencia;
  * pinta cada face com uma cor propria (rampa de matiz dentro da familia
    de cor do dado), via atributo de cor por canto de face;
  * gera UM unico objeto de malha com todos os algarismos, sem usar bpy.ops.
"""

import colorsys
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

_GLYPHS = {}
_FONT_OB = None


# ------------------------------------------------------------ selecao de face

def select_faces(me, strategy):
    """Devolve a lista de indices de face que recebem numero."""
    polys = me.polygons
    if strategy == "all":
        return list(range(len(polys)))
    kind, _, arg = strategy.partition(":")
    n = int(arg) if arg else 1
    if kind == "one":
        return [max(range(len(polys)), key=lambda i: polys[i].normal.z)]
    if kind == "largest":
        return sorted(range(len(polys)), key=lambda i: -polys[i].area)[:n]
    if kind == "side":
        # cuidado: so vale se a malha ainda nao foi reorientada, pois o
        # criterio e a normal ser horizontal no eixo original da peca
        cand = [i for i in range(len(polys)) if abs(polys[i].normal.normalized().z) < 0.5]
        if len(cand) < n:
            return sorted(range(len(polys)), key=lambda i: -polys[i].area)[:n]
        return sorted(cand, key=lambda i: -polys[i].area)[:n]
    raise ValueError(strategy)


# ----------------------------------------------------------------- numeracao

def number_faces(me, idxs, start=1):
    """Mapa indice_de_face -> numero, opostos somando N+1 quando possivel."""
    n = len(idxs)
    normals = {i: me.polygons[i].normal.normalized() for i in idxs}
    remaining = set(idxs)
    pairs = []
    for i in idxs:
        if i not in remaining:
            continue
        remaining.discard(i)
        best, bd = None, -2.0
        for j in remaining:
            d = -normals[i].dot(normals[j])
            if d > bd:
                bd, best = d, j
        if best is not None and bd > 0.985:
            remaining.discard(best)
            pairs.append((i, best))
        else:
            pairs.append((i, None))

    full = all(b is not None for _, b in pairs) and len(pairs) * 2 == n
    out = {}
    if full:
        hi = start + n - 1
        for k, (a, b) in enumerate(pairs):
            out[a] = start + k
            out[b] = hi - k
    else:
        for k, i in enumerate(idxs):
            out[i] = start + k
    return out


# --------------------------------------------------------------- cor por face

def paint_faces(ob, face_nums, base_rgb, attr="FaceCol"):
    """Atributo de cor por canto: rampa dentro da familia de cor do dado."""
    me = ob.data
    for a in list(me.color_attributes):
        me.color_attributes.remove(a)
    ca = me.color_attributes.new(name=attr, type="FLOAT_COLOR", domain="CORNER")

    h0, s0, v0 = colorsys.rgb_to_hsv(*base_rgb)
    nums = sorted(face_nums.values())
    lo, hi = (nums[0], nums[-1]) if nums else (0, 1)
    span = max(1, hi - lo)

    base = colorsys.hsv_to_rgb(h0, min(1.0, s0 * 1.0), min(1.0, v0 * 0.88))
    colors = [base] * len(me.loops)

    for fi, num in face_nums.items():
        t = (num - lo) / span
        h = (h0 + (t - 0.5) * 0.24) % 1.0
        s = min(1.0, max(0.45, s0) * (0.86 + 0.20 * t))
        v = min(1.0, max(0.35, v0) * (0.78 + 0.42 * t))
        rgb = colorsys.hsv_to_rgb(h, s, v)
        p = me.polygons[fi]
        for li in range(p.loop_start, p.loop_start + p.loop_total):
            colors[li] = rgb

    ca.data.foreach_set(
        "color", [c for rgb in colors for c in (rgb[0], rgb[1], rgb[2], 1.0)]
    )
    me.update()
    return attr


def face_color_material(name, attr="FaceCol"):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    node = nt.nodes.new("ShaderNodeAttribute")
    node.attribute_name = attr
    node.location = (-330, 240)
    nt.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.09
    for key in ("Specular IOR Level", "Specular"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = 0.62
            break
    for key in ("Coat Weight", "Clearcoat"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = 0.85
            break
    for key in ("Coat Roughness", "Clearcoat Roughness"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = 0.04
            break
    return mat


# ------------------------------------------------------------------- glifos

def _font_object():
    global _FONT_OB
    if _FONT_OB is None or _FONT_OB.name not in bpy.data.objects:
        cu = bpy.data.curves.new("GLYPH_SRC", type="FONT")
        cu.align_x = "CENTER"
        cu.align_y = "CENTER"
        cu.size = 1.0
        cu.extrude = 0.0
        ob = bpy.data.objects.new("GLYPH_SRC", cu)
        bpy.context.scene.collection.objects.link(ob)
        ob.hide_viewport = True
        ob.hide_render = True
        _FONT_OB = ob
    return _FONT_OB


def glyph(text):
    """(verts, faces) do texto em tamanho 1, centrado na origem, plano XY."""
    if text in _GLYPHS:
        return _GLYPHS[text]
    ob = _font_object()
    ob.data.body = text
    ob.hide_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    verts = [v.co.copy() for v in me.vertices]
    faces = [tuple(p.vertices) for p in me.polygons]
    ev.to_mesh_clear()
    ob.hide_viewport = True
    if verts:
        cx = sum(v.x for v in verts) / len(verts)
        cy = sum(v.y for v in verts) / len(verts)
        for v in verts:
            v.x -= cx
            v.y -= cy
            v.z = 0.0
    _GLYPHS[text] = (verts, faces)
    return _GLYPHS[text]


def _face_frame(normal):
    """Base ortonormal com +Z na normal e +Y 'para cima' na face."""
    n = normal.normalized()
    ref = Vector((0.0, 0.0, 1.0)) if abs(n.z) < 0.93 else Vector((0.0, 1.0, 0.0))
    x = ref.cross(n)
    if x.length < 1e-6:
        x = Vector((1.0, 0.0, 0.0))
    x.normalize()
    y = n.cross(x).normalized()
    return Matrix(((x.x, y.x, n.x), (x.y, y.y, n.y), (x.z, y.z, n.z))).to_4x4()


def _emit(bm, text, m, underline=False):
    """Escreve o texto na malha acumuladora com a matriz de colocacao dada."""
    verts, faces = glyph(text)
    if not verts:
        return
    base = [bm.verts.new(m @ v) for v in verts]
    for f in faces:
        try:
            bm.faces.new([base[i] for i in f])
        except ValueError:
            pass
    if underline and text in ("6", "9"):
        w, t = 0.62, 0.12
        quad = [Vector((-w / 2, -0.86, 0.0)), Vector((w / 2, -0.86, 0.0)),
                Vector((w / 2, -0.86 - t, 0.0)), Vector((-w / 2, -0.86 - t, 0.0))]
        uv = [bm.verts.new(m @ q) for q in quad]
        try:
            bm.faces.new(uv)
        except ValueError:
            pass


def _finish_numbers(bm, ob, coll):
    nm = bpy.data.meshes.new(ob.name + "_num")
    bm.to_mesh(nm)
    bm.free()
    nm.update()
    nob = bpy.data.objects.new(ob.name + "_num", nm)
    coll.objects.link(nob)
    mat = bpy.data.materials.get("MAT_NUM")
    if mat is None:
        mat = bpy.data.materials.new("MAT_NUM")
        mat.use_nodes = True
        b = mat.node_tree.nodes.get("Principled BSDF")
        b.inputs["Base Color"].default_value = (0.97, 0.97, 0.98, 1.0)
        b.inputs["Roughness"].default_value = 0.35
    nm.materials.append(mat)
    nob.parent = ob
    nob.matrix_parent_inverse = Matrix.Identity(4)
    return nob


def number_vertices(me, start=1):
    """Numera os VERTICES do solido (convencao do d4)."""
    return {i: start + i for i in range(len(me.vertices))}


def build_vertex_numbers(ob, vert_nums, coll, lift=0.010, frac=0.58, fill=0.34):
    """Numeracao de d4: cada face recebe os numeros dos seus 3 cantos.

    O algarismo fica perto do canto e com o topo apontando para ele, de modo
    que fique em pe quando aquele vertice for o apice. O resultado da rolagem
    e o numero do vertice que aponta para cima - que aparece igual nas tres
    faces visiveis, como nos d4 reais.
    """
    me = ob.data
    bm = bmesh.new()
    for p in me.polygons:
        nrm = p.normal.normalized()
        c = p.center
        diam = 2.0 * math.sqrt(max(p.area, 1e-9) / math.pi)
        for vi in p.vertices:
            num = vert_nums.get(vi)
            if num is None:
                continue
            s = str(num)
            d = me.vertices[vi].co - c
            if d.length < 1e-9:
                continue
            up = d.normalized()
            right = up.cross(nrm).normalized()
            base = Matrix(((right.x, up.x, nrm.x),
                           (right.y, up.y, nrm.y),
                           (right.z, up.z, nrm.z))).to_4x4()
            size = fill * diam / max(1.0, 0.60 * len(s))
            m = (Matrix.Translation(c + d * frac + nrm * lift)
                 @ base @ Matrix.Scale(size, 4))
            _emit(bm, s, m)
    return _finish_numbers(bm, ob, coll)


def build_numbers(ob, face_nums, coll, lift=0.012, fill=0.52, underline=True):
    """Cria um unico objeto de malha com todos os algarismos da peca."""
    me = ob.data
    bm = bmesh.new()
    for fi, num in sorted(face_nums.items()):
        p = me.polygons[fi]
        s = str(num)
        verts, faces = glyph(s)
        if not verts:
            continue
        diam = 2.0 * math.sqrt(max(p.area, 1e-9) / math.pi)
        size = fill * diam / max(1.0, 0.60 * len(s))
        m = (
            Matrix.Translation(p.center + p.normal.normalized() * lift)
            @ _face_frame(p.normal)
            @ Matrix.Scale(size, 4)
        )
        _emit(bm, s, m, underline=underline)

    return _finish_numbers(bm, ob, coll)


def check_opposite_sum(me, face_nums):
    """Devolve a soma constante das faces opostas, ou None se nao houver."""
    idxs = list(face_nums)
    normals = {i: me.polygons[i].normal.normalized() for i in idxs}
    sums = set()
    for i in idxs:
        best, bd = None, -2.0
        for j in idxs:
            if j == i:
                continue
            d = -normals[i].dot(normals[j])
            if d > bd:
                bd, best = d, j
        if best is None or bd < 0.985:
            return None
        sums.add(face_nums[i] + face_nums[best])
    return sums.pop() if len(sums) == 1 else None
