"""
export_web.py - Exporta cada dado para uso na web.

Para cada dado gera dois arquivos em public/dice/:

  <id>.glb   malha do corpo + malha dos numeros, materiais separados,
             com UV para o consumidor aplicar a textura que quiser.
  <id>.json  metadados: colisor convexo, mapa normal-da-face -> numero,
             convencao de leitura, massa e dimensoes.

Convencoes:
  * 1 unidade = 1 cm (igual a cena do Blender). Use gravidade -981.
  * O JSON esta em Y-up (glTF), nao no Z-up do Blender. A conversao e
    (x, y, z)_blender -> (x, z, -y)_gltf, a mesma que o exportador aplica.
  * A origem de cada malha esta no centroide. Sem isso o corpo rigido gira
    fora do centro de massa e o dado cai sempre na mesma face.
"""

import json
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

SAIDA = "/home/jesus/Progetos/RPG/public/dice"
DENSIDADE = 0.02


def yup(v):
    """Z-up do Blender -> Y-up do glTF."""
    return [round(v.x, 6), round(v.z, 6), round(-v.y, 6)]


# O exportador glTF nao publica suas propriedades via bl_rna (bl_rna lista so
# as 14 do Operator base), entao filtrar por introspeccao descarta ate o
# filepath. Chamamos com o conjunto completo e caimos para o nucleo estavel
# se a versao rejeitar algum argumento.
_GLTF_NUCLEO = ("filepath", "export_format", "use_selection", "export_apply",
                "export_yup", "export_materials")


def _exportar_gltf(desejado):
    try:
        bpy.ops.export_scene.gltf(**desejado)
        return sorted(desejado)
    except TypeError:
        nucleo = {k: v for k, v in desejado.items() if k in _GLTF_NUCLEO}
        bpy.ops.export_scene.gltf(**nucleo)
        return sorted(nucleo)


def unwrap(ob):
    """Smart UV Project: cada face vira uma ilha, pronta para textura."""
    vl = bpy.context.view_layer
    anterior = vl.objects.active
    for o in bpy.data.objects:
        o.select_set(False)
    ob.select_set(True)
    vl.objects.active = ob
    try:
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(66.0), island_margin=0.02)
        bpy.ops.object.mode_set(mode="OBJECT")
    except Exception:
        try:
            bpy.ops.object.mode_set(mode="OBJECT")
        except Exception:
            pass
    ob.select_set(False)
    vl.objects.active = anterior


def colisor(ob):
    """Casco convexo da malha base, sem o bisel.

    Devolve as faces como poligonos (faces) e tambem trianguladas (indices).
    Motores como cannon-es aceitam poligonos direto no ConvexPolyhedron, o que
    corta pela metade o numero de faces a testar em dados como o d120.
    A ordem dos vertices e anti-horaria vista de fora, e a conversao Z-up ->
    Y-up preserva a orientacao (determinante +1), entao a winding continua valida.
    """
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    verts = [yup(v.co) for v in bm.verts]
    faces = [[v.index for v in f.verts] for f in bm.faces]
    vol = abs(bm.calc_volume(signed=True))
    tris = []
    for f in faces:                       # leque a partir do primeiro vertice
        for k in range(1, len(f) - 1):
            tris.append([f[0], f[k], f[k + 1]])
    bm.free()
    return verts, faces, tris, vol


def metadados(ob):
    me = ob.data
    verts, faces_poly, tris, vol = colisor(ob)
    faces = list(ob["num_faces"])
    vals = [int(v) for v in ob["num_values"]]

    d = {
        "id": ob.name,
        "faces": int(ob["resultados"]),
        "solid": ob["solido"],
        "unit": "cm",
        "gravity": -981.0,
        "mass": round(max(0.05, vol * DENSIDADE), 4),
        "diameterCm": round(2.0 * max(Vector(v).length for v in
                                      (Vector(x) for x in verts)), 3),
        "collider": {"vertices": verts, "faces": faces_poly, "indices": tris},
        "faceAreaRatio": float(ob["area_min_max"]),
    }

    if ob.get("vertex_mode"):
        # d4: o resultado e o numero do vertice que aponta para cima
        d["readout"] = "apex"
        d["vertexPoints"] = [yup(me.vertices[i].co) for i in list(ob["vert_ids"])]
        d["vertexValues"] = [int(v) for v in list(ob["vert_values"])]
        d["faceNormals"] = [yup(me.polygons[i].normal.normalized()) for i in faces]
        d["values"] = vals
    else:
        d["faceNormals"] = [yup(me.polygons[i].normal.normalized()) for i in faces]
        d["values"] = vals
        # "top" se existe face oposta a cada face; senao le-se a face apoiada
        normals = [Vector(me.polygons[i].normal.normalized()) for i in faces]
        tem_oposta = all(
            any(n.dot(m) < -0.985 for j, m in enumerate(normals) if j != i)
            for i, n in enumerate(normals)
        )
        d["readout"] = "top" if tem_oposta else "bottom"
    return d


def exportar(ob, ncoll_nome="NUMEROS"):
    nums = bpy.data.objects.get(ob.name + "_num")
    loc, rot, mode = ob.location.copy(), ob.rotation_quaternion.copy(), ob.rotation_mode
    ob.rotation_mode = "QUATERNION"
    ob.location = (0.0, 0.0, 0.0)
    ob.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    bpy.context.view_layer.update()

    for o in bpy.data.objects:
        o.select_set(False)
    ob.select_set(True)
    if nums:
        nums.select_set(True)
    bpy.context.view_layer.objects.active = ob

    caminho = os.path.join(SAIDA, ob.name + ".glb")
    desejado = dict(
        filepath=caminho,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )
    _exportar_gltf(desejado)

    ob.select_set(False)
    if nums:
        nums.select_set(False)
    ob.location = loc
    ob.rotation_quaternion = rot
    ob.rotation_mode = mode
    return caminho


def run():
    os.makedirs(SAIDA, exist_ok=True)
    coll = bpy.data.collections.get("DADOS")
    dados = sorted([o for o in coll.objects if "num_faces" in o],
                   key=lambda o: o["resultados"])

    indice = []
    for ob in dados:
        unwrap(ob)
        meta = metadados(ob)
        exportar(ob)
        with open(os.path.join(SAIDA, ob.name + ".json"), "w") as f:
            json.dump(meta, f, separators=(",", ":"))
        indice.append({
            "id": meta["id"], "faces": meta["faces"], "solid": meta["solid"],
            "readout": meta["readout"], "diameterCm": meta["diameterCm"],
            "model": "/dice/%s.glb" % meta["id"],
            "meta": "/dice/%s.json" % meta["id"],
        })

    with open(os.path.join(SAIDA, "index.json"), "w") as f:
        json.dump({"unit": "cm", "gravity": -981.0, "dice": indice}, f, indent=1)
    return indice


RESULT = run()
result = {"exportados": len(RESULT), "ids": [d["id"] for d in RESULT]}
