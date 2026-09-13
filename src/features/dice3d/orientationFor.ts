/**
 * Orientação final que faz um dado físico assentar mostrando um valor
 * ESCOLHIDO — não descoberto pela física.
 *
 * O motor de dados do domínio (`@domain/dice`, RandomSource auditado,
 * rejection sampling) é a única fonte do número. A simulação 3D só cuida da
 * trajetória (queda, quique, giro); o resultado exibido tem que bater com o
 * que já foi decidido e persistido no `DiceRoll`. Por isso a mesa física
 * corrige suavemente a pose final para o valor certo em vez de deixar a
 * física "decidir" — do contrário o número na tela poderia divergir do
 * número gravado no histórico/rngVersion.
 */

import type { DieMeta, Quat, Vec3 } from "./types";

function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalizeQuat(q: [number, number, number, number]): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/** Quaternion `[x,y,z,w]` que gira o vetor unitário `from` até `to`. */
function quatBetween(from: Vec3, to: Vec3): Quat {
  const f = normalize(from);
  const t = normalize(to);
  const d = dot(f, t);
  if (d > 0.999999) return [0, 0, 0, 1];
  if (d < -0.999999) {
    let axis = cross([1, 0, 0], f);
    if (Math.hypot(axis[0], axis[1], axis[2]) < 1e-6) axis = cross([0, 1, 0], f);
    axis = normalize(axis);
    return [axis[0], axis[1], axis[2], 0];
  }
  const c = cross(f, t);
  return normalizeQuat([c[0], c[1], c[2], 1 + d]);
}

/** Produto de Hamilton: aplica `b` primeiro, depois `a`. */
function multiplyQuat(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function yawQuat(rad: number): Quat {
  const h = rad / 2;
  return [0, Math.sin(h), 0, Math.cos(h)];
}

/**
 * Direção, **no referencial do próprio dado**, que precisa apontar para o céu
 * (+Y do mundo) para o dado exibir `value`.
 *
 * É a inversa exata da regra de `lerDado`:
 * - `top`   → a normal da face vale como "pra cima";
 * - `bottom`→ a face fica apoiada, então quem aponta pra cima é a normal
 *             invertida;
 * - `apex`  → não é face nenhuma, é o vértice numerado.
 *
 * Serve de alvo tanto para `orientationForValue` quanto para o alinhamento
 * iterativo da mesa física (`DiceTable`), que compara esta direção com a que
 * de fato ficou pra cima ao fim da simulação.
 */
export function upDirectionForValue(meta: DieMeta, value: number): Vec3 {
  if (meta.readout === "apex") {
    const points = meta.vertexPoints;
    const values = meta.vertexValues;
    if (!points || !values) {
      throw new Error(`Dado "${meta.id}" é apex mas não tem vertexPoints/vertexValues`);
    }
    const i = values.indexOf(value);
    if (i < 0) throw new Error(`Dado "${meta.id}" não tem o valor ${value}`);
    return normalize(points[i]);
  }

  const i = meta.values.indexOf(value);
  if (i < 0) throw new Error(`Dado "${meta.id}" não tem o valor ${value}`);
  const n = normalize(meta.faceNormals[i]);
  return meta.readout === "bottom" ? [-n[0], -n[1], -n[2]] : n;
}

/**
 * Orientação que faz o dado assentar mostrando `value`, respeitando a
 * convenção de leitura do dado (topo / base / ápice — ver `readout.ts`).
 *
 * `random` decide só o giro em torno do eixo vertical: gira em torno de Y
 * (eixo que a etapa de alinhamento já deixa fixo), então não interfere em
 * qual face fica pra cima — existe só pra dois dados iguais não pousarem
 * sempre na mesma pose visual.
 */
export function orientationForValue(
  meta: DieMeta,
  value: number,
  random: () => number = Math.random,
): Quat {
  const yaw = yawQuat(random() * Math.PI * 2);
  return multiplyQuat(yaw, quatBetween(upDirectionForValue(meta, value), [0, 1, 0]));
}
