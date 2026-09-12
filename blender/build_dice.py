"""build_dice.py - Monta a colecao completa de dados, com cor e numero por face."""

import importlib
import math
import sys

import bmesh
import bpy
from mathutils import Vector

LIB_DIR = "/home/jesus/Progetos/RPG/blender"
if LIB_DIR not in sys.path:
    sys.path.append(LIB_DIR)

import dice_lib as D
import dice_numbers as N

importlib.reload(D)
importlib.reload(N)

PHI = D.PHI
SQ2 = D.SQ2

# nome | resultados | solido | construtor | diam (cm) | cor | faces numeradas | inicio
SPECS = [
    ("d1",   1,   "Esfera",
     lambda: D.sphere(4), 2.0, (0.92, 0.14, 0.08), "one", 1, True),
    ("d2",   2,   "Lente / moeda",
     lambda: D.coin(64, thick=0.30), 2.4, (0.95, 0.72, 0.12), "largest:2", 1, False),
    ("d3",   3,   "Esfera com 3 facetas (referencia STL)",
     lambda: D.sphere_with_flats(3, R=1.15, cut=0.80),
     2.4, (0.93, 0.33, 0.12), "belt:3:0.80", 1, True),
    ("d4",   4,   "Tetraedro (Platonico)",
     lambda: D.platonic("tetra"), 2.8, (0.87, 0.11, 0.20), "vertices", 1, False),
    ("d5",   5,   "Esfera com 5 facetas (referencia STL)",
     lambda: D.sphere_with_flats(5, R=1.20, cut=0.90),
     2.5, (0.96, 0.55, 0.08), "belt:5:0.90", 1, True),
    ("d6",   6,   "Hexaedro / cubo (Platonico)",
     lambda: D.platonic("cube"), 2.4, (0.97, 0.78, 0.06), "all", 1, False),
    ("d7",   7,   "Prisma pentagonal",
     lambda: D.prism_die(5, h_ratio=1.15), 2.4, (0.72, 0.86, 0.10), "all", 1, False),
    ("d8",   8,   "Octaedro (Platonico)",
     lambda: D.platonic("octa"), 2.4, (0.20, 0.78, 0.25), "all", 1, False),
    ("d10",  10,  "Trapezoedro pentagonal",
     lambda: D.trapezohedron(5, k=1.25), 2.7, (0.05, 0.78, 0.58), "all", 0, False),
    ("d12",  12,  "Dodecaedro (Platonico)",
     lambda: D.platonic("dodeca"), 2.5, (0.06, 0.70, 0.85), "all", 1, False),
    ("d14",  14,  "Trapezoedro heptagonal",
     lambda: D.trapezohedron(7, k=1.25), 2.8, (0.10, 0.50, 0.92), "all", 1, False),
    ("d16",  16,  "Bipiramide octogonal",
     lambda: D.bipyramid(8, k=1.0), 2.5, (0.16, 0.32, 0.93), "all", 1, False),
    ("d20",  20,  "Icosaedro (Platonico)",
     lambda: D.platonic("icosa"), 2.7, (0.40, 0.22, 0.94), "all", 1, False),
    ("d24",  24,  "Hexaedro tetraquis (Catalan)",
     lambda: D.catalan(D.group_oct_full(), (0.0, 1.0, 2.0)),
     2.8, (0.62, 0.18, 0.92), "all", 1, False),
    ("d30",  30,  "Triacontaedro rombico (Catalan)",
     lambda: D.catalan(D.group_ico_full(), (0.0, 0.0, PHI)),
     3.0, (0.82, 0.16, 0.86), "all", 1, False),
    ("d48",  48,  "Dodecaedro disdiaquis (Catalan)",
     lambda: D.catalan(D.group_oct_full(), (1.0, 1.0 + SQ2, 1.0 + 2.0 * SQ2)),
     3.2, (0.93, 0.14, 0.62), "all", 1, False),
    ("d50",  50,  "Poliedro esferico de 50 faces",
     lambda: D.zocchihedron(50), 3.3, (0.95, 0.18, 0.40), "all", 1, False),
    ("d60",  60,  "Hexecontaedro deltoidal (Catalan)",
     lambda: D.catalan(D.group_ico_full(), (1.0, 1.0, PHI ** 3)),
     3.4, (1.00, 0.62, 0.02), "all", 1, False),
    ("d100", 100, "Zocchiedro - 100 faces",
     lambda: D.zocchihedron(100), 4.5, (0.52, 0.06, 0.85), "all", 1, False),
    ("d120", 120, "Triacontaedro disdiaquis (Catalan)",
     lambda: D.catalan(D.group_ico_full(), (1.0 / PHI, 1.0 / PHI, 3.0 + PHI)),
     5.0, (0.05, 0.80, 0.72), "all", 1, False),
]

COLS = 5
SPACING_X = 8.2
SPACING_Y = 8.6


def purge():
    for cname in ("DADOS", "ROTULOS", "NUMEROS"):
        c = bpy.data.collections.get(cname)
        if c:
            for ob in list(c.objects):
                bpy.data.objects.remove(ob, do_unlink=True)
            bpy.data.collections.remove(c)
    for nm in ("Cube", "Chao", "GLYPH_SRC"):
        ob = bpy.data.objects.get(nm)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.curves):
        for b in list(block):
            if b.users == 0:
                block.remove(b)
    N._GLYPHS.clear()
    N._FONT_OB = None


def orient_face_down(bm, avoid_sides=False):
    """Gira bm para a maior face (ou maior face 'nao lateral') apontar para baixo.

    Devolve a matriz de rotacao usada. Para dados do tipo 'belt' (d3/d5), essa
    mesma matriz precisa ser aplicada tambem ao bmesh dos numeros gravados,
    que foi construido ANTES desta rotacao (a formula do angulo do vao so vale
    no referencial original da esfera com cortes) - ver o ramo 'belt:' em build().
    """
    f = max(bm.faces, key=lambda x: x.calc_area())
    if avoid_sides:
        cand = [x for x in bm.faces if abs(x.normal.normalized().z) < 0.5]
        if cand:
            f = max(cand, key=lambda x: x.calc_area())
    q = f.normal.normalized().rotation_difference(Vector((0.0, 0.0, -1.0)))
    m = q.to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts[:])
    bm.normal_update()
    return m


def floor_offset(bm):
    """Altura para apoiar a peca no chao, SEM mexer na malha.

    Importante: assar esse deslocamento nos vertices joga a origem do objeto
    para a base do dado. O solver de corpos rigidos gira o corpo em torno da
    origem, entao um dado com origem deslocada vira um joao-bobo: sempre se
    endireita e cai sempre na mesma face. A origem tem de ficar no centroide.
    """
    return -min(v.co.z for v in bm.verts)


def make_label(text, loc, coll, size=0.72):
    cu = bpy.data.curves.new("LBL", type="FONT")
    cu.body = text
    cu.size = size
    cu.align_x = "CENTER"
    ob = bpy.data.objects.new("LBL_" + text.split()[0], cu)
    ob.location = loc
    coll.objects.link(ob)
    mat = bpy.data.materials.get("MAT_LABEL")
    if mat is None:
        mat = bpy.data.materials.new("MAT_LABEL")
        mat.use_nodes = True
        b = mat.node_tree.nodes.get("Principled BSDF")
        b.inputs["Base Color"].default_value = (0.92, 0.94, 0.99, 1.0)
        b.inputs["Roughness"].default_value = 0.75
    ob.data.materials.append(mat)
    return ob


def build():
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 0.01
    sc.unit_settings.length_unit = "CENTIMETERS"

    purge()
    coll = bpy.data.collections.new("DADOS")
    sc.collection.children.link(coll)
    ncoll = bpy.data.collections.new("NUMEROS")
    sc.collection.children.link(ncoll)
    lcoll = bpy.data.collections.new("ROTULOS")
    sc.collection.children.link(lcoll)

    mat = N.face_color_material("MAT_DADO_FACES")
    report = []
    rows = math.ceil(len(SPECS) / COLS)

    for i, (name, res, solido, builder, diam, rgb, strat, start, smooth) in enumerate(SPECS):
        bm = builder()
        D.normalize(bm, diam)
        nf, nv, ne, rin, rout = D.face_stats(bm)

        belt_pre = None
        if strat.startswith("belt:"):
            # PRECISA rodar antes de orient_face_down: a formula do angulo do
            # vao so vale no referencial original da esfera com cortes, onde
            # as normais das facetas ficam exatamente no plano XY (z=0),
            # igualmente espacadas. Depois da rotacao que deita o dado, esse
            # plano vira um circulo qualquer da esfera e atan2(y,x) deixa de
            # corresponder a ordem fisica das facetas.
            _, n_s, cut_s = strat.split(":")
            n_belt, cut = int(n_s), float(cut_s)
            bm.faces.ensure_lookup_table()
            cand_idx = sorted(range(len(bm.faces)),
                              key=lambda i: -bm.faces[i].calc_area())[:n_belt]
            ordem = sorted(cand_idx, key=lambda i: math.atan2(
                bm.faces[i].calc_center_median().y,
                bm.faces[i].calc_center_median().x))
            face_nums = {
                fi: D.gap_value_for_flat(n_belt, k, start=start)
                for k, fi in enumerate(ordem)
            }
            valores_vao = [start + j for j in range(n_belt)]
            # lift generoso: um glifo achatado sobre uma esfera "afunda" nas
            # bordas por causa da curvatura (efeito sagita) - lift pequeno
            # (o mesmo usado nas faces planas dos outros dados) deixa o
            # numero parcialmente embaixo da casca, invisivel.
            num_bm = N.belt_numbers_bmesh(n_belt, valores_vao,
                                          R=diam / 2.0, cut=cut, lift=diam * 0.05)
            belt_pre = (face_nums, num_bm)

        rot = orient_face_down(bm, avoid_sides=name in ("d3", "d5"))
        if belt_pre is not None:
            # mesma rotacao do corpo, para os numeros ficarem colados na casca
            bmesh.ops.transform(belt_pre[1], matrix=rot, verts=belt_pre[1].verts[:])
        dz = floor_offset(bm)

        col, row = i % COLS, i // COLS
        x = (col - (COLS - 1) / 2.0) * SPACING_X
        y = ((rows - 1) / 2.0 - row) * SPACING_Y

        bevel = 0.0 if smooth or nf > 40 else diam * 0.010
        ob = D.bm_to_object(bm, name, coll, bevel=bevel, material=mat, smooth=smooth)
        ob.location = (x, y, dz)

        if strat.startswith("belt:"):
            face_nums, num_bm = belt_pre
            N.paint_uniform(ob, rgb)
            N._finish_numbers(num_bm, ob, ncoll)
            nums = sorted(face_nums.values())
            opostos = None
            pares = sorted(face_nums.items())
            ob["num_faces"] = [k for k, _ in pares]
            ob["num_values"] = [v for _, v in pares]
        elif strat == "vertices":
            # convencao do d4: o numero fica nos cantos, o resultado e o apice
            vert_nums = N.number_vertices(ob.data, start=start)
            N.paint_uniform(ob, rgb)
            N.build_vertex_numbers(ob, vert_nums, ncoll, lift=diam * 0.005)
            vp = sorted(vert_nums.items())
            ob["vertex_mode"] = True
            ob["vert_ids"] = [k for k, _ in vp]
            ob["vert_values"] = [v for _, v in vp]
            ob["num_faces"] = list(range(len(ob.data.polygons)))
            ob["num_values"] = [i + 1 for i in range(len(ob.data.polygons))]
            nums = sorted(vert_nums.values())
            opostos = None
        else:
            idxs = N.select_faces(ob.data, strat)
            face_nums = N.number_faces(ob.data, idxs, start=start)
            N.paint_faces(ob, face_nums, rgb)
            nums = sorted(face_nums.values())
            opostos = N.check_opposite_sum(ob.data, face_nums)
            N.build_numbers(ob, face_nums, ncoll,
                            lift=diam * 0.006, fill=0.56)
            pares = sorted(face_nums.items())
            ob["num_faces"] = [k for k, _ in pares]
            ob["num_values"] = [v for _, v in pares]
        ob["resultados"] = res
        ob["solido"] = solido
        ob["home"] = [x, y]
        areas = [ob.data.polygons[k].area for k in ob["num_faces"]]
        ob["area_min_max"] = round(min(areas) / max(areas), 5)

        make_label("%s\n%d faces" % (name.upper(), res),
                   (x, y - diam * 0.5 - 1.9, 0.02), lcoll, size=0.78)

        report.append({
            "dado": name, "resultados": res, "faces_geom": nf,
            "numeradas": len(nums),
            "faixa": "%d-%d" % (nums[0], nums[-1]),
            "V_A_F": "%d/%d/%d" % (nv, ne, nf), "euler": nv - ne + nf,
            "solido": solido, "diam_mm": round(diam * 10, 1),
            "opostos_somam": opostos,
            "razao_area_faces": ob["area_min_max"],
        })

    bpy.ops.mesh.primitive_plane_add(size=160, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.name = "Chao"
    fm = bpy.data.materials.get("MAT_Chao") or bpy.data.materials.new("MAT_Chao")
    fm.use_nodes = True
    fb = fm.node_tree.nodes.get("Principled BSDF")
    fb.inputs["Base Color"].default_value = (0.055, 0.06, 0.075, 1.0)
    fb.inputs["Roughness"].default_value = 0.42
    floor.data.materials.clear()
    floor.data.materials.append(fm)
    return report


RESULT = build()
result = {"dados": RESULT}
