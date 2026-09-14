/**
 * Simulação da queda dos dados — só cannon-es, sem three.js e sem DOM.
 *
 * Fica separada da `DiceTable` de propósito: é a parte da qual depende a
 * CORREÇÃO do resultado exibido, então precisa ser testável de cabeça, num
 * mundo de física montado à mão, sem depender de WebGL.
 *
 * A física roda inteira aqui, antes de qualquer quadro aparecer na tela; a
 * mesa só reproduz a trajetória gravada. Isso evita empurrar o dado enquanto
 * ele está apoiado na mesa — o que antes produzia tremor (o solver reagindo à
 * correção a cada quadro) e resultado divergente (o dado assentava numa face
 * e não havia mais como virá-lo).
 */

import * as CANNON from "cannon-es";

import { orientationForValue, upDirectionForValue } from "./orientationFor";
import { lerDado } from "./readout";
import type { DieMeta, Quat } from "./types";

/** Passo fixo da simulação, em segundos. */
export const PASSO = 1 / 60;
/** Passos consecutivos praticamente imóveis para considerar o dado assentado. */
const PASSOS_PARADO = 20;
/**
 * Passos extras, com atrito exagerado, concedidos a quem não parou sozinho
 * dentro do orçamento normal.
 *
 * Existe por causa do Zocchiedro do d100: quase esférico, ele rola até o teto
 * de passos em qualquer tamanho de mesa (medido: 480/480 em arenas de 4,5 a
 * 26 cm). A gravação terminava com o dado em movimento — daí o tremor no fim
 * da animação, e uma pose final instável, que é o pior lugar possível para
 * medir qual face ficou para cima.
 */
const PASSOS_ASSENTAR = 90;
const AMORTECIMENTO_ASSENTAR = { linear: 0.9, angular: 0.96 };
/**
 * Janela usada para decidir se o dado ainda está indo a algum lugar, e o
 * caminho mínimo que ele precisa percorrer nela para a queda continuar.
 *
 * Substitui um detector de "rastejo" que olhava a velocidade instantânea e
 * zerava o contador a cada quadro acima do limiar. O Zocchiedro do d100 não
 * desacelera suavemente: ele vibra, com a velocidade oscilando em volta do
 * limiar, então o contador reiniciava sem parar e a saída antecipada nunca
 * disparava — o dado ficava até 4,25 s tremendo na tela (medido: 11 de 12
 * lançamentos batendo no teto de passos).
 *
 * Caminho percorrido não tem esse problema: ele acumula, imune à oscilação.
 * Medido em 0,5 s de tela, o d100 tremendo percorre ~0,5 cm enquanto um d20
 * ainda rolando percorre ~9,5 cm — quase vinte vezes mais. O corte em 2 cm cai
 * no meio dessa distância, longe dos dois.
 */
const JANELA_PROGRESSO = 30; // quadros (0,5 s)
const CAMINHO_MINIMO = 2; // cm percorridos na janela
/** Passos finais com o corpo travado, garantindo fim de animação imóvel. */
const PASSOS_CONGELAR = 10;
const VEL_PARADO = 0.6; // cm/s
const VEL_ANG_PARADO = 0.6; // rad/s

export interface DadoSimulavel {
  readonly corpo: CANNON.Body;
  readonly meta: DieMeta;
}

/** Pose de lançamento, sorteada antes de qualquer simulação. */
export interface PoseInicial {
  readonly pos: CANNON.Vec3;
  readonly quat: CANNON.Quaternion;
  readonly vel: CANNON.Vec3;
  readonly angVel: CANNON.Vec3;
}

/**
 * Trajetória gravada: para cada dado, `passos * 7` floats
 * (`x, y, z, qx, qy, qz, qw`) — uma amostra por passo.
 */
export interface Gravacao {
  readonly passos: number;
  readonly trilhas: readonly Float32Array[];
}

export interface OpcoesAlinhamento {
  /** Teto de passos simulados até considerar a queda encerrada. */
  readonly maxPassos: number;
}

/**
 * Força o tensor de inércia do corpo a ser isotrópico (igual nos três eixos).
 *
 * Não é um "arredondamento": um sólido isoédrico — todo dado clássico — TEM
 * inércia isotrópica por simetria; é justamente o que faz o dado ser honesto.
 * O cannon-es, porém, aproxima a inércia de um poliedro convexo pela caixa
 * envolvente, que não é isotrópica.
 *
 * Isso importa muito aqui: o alinhamento do resultado gira a pose inicial por
 * uma simetria `D` do casco. Com inércia isotrópica, `D` comuta com o tensor e
 * a queda inteira sai idêntica (só muda a face de cima), então uma correção
 * basta e vários dados podem ser corrigidos de uma vez sem interferir entre
 * si. Com a inércia enviesada da caixa, cada correção mudava a trajetória e a
 * convergência se perdia.
 */
export function aplicarInerciaIsotropica(corpo: CANNON.Body, meta: DieMeta): void {
  const raios = meta.collider.vertices.map(([x, y, z]) => Math.hypot(x, y, z));
  const raio = raios.reduce((a, b) => a + b, 0) / Math.max(1, raios.length);
  const i = 0.4 * corpo.mass * raio * raio; // esfera sólida equivalente
  corpo.inertia.set(i, i, i);
  corpo.invInertia.set(1 / i, 1 / i, 1 / i);
  corpo.updateInertiaWorld(true);
}

/** Valor atualmente exibido pelo dado, lido da orientação do corpo rígido. */
export function valorExibido(dado: DadoSimulavel): number {
  const q = dado.corpo.quaternion;
  return lerDado(dado.meta, [q.x, q.y, q.z, q.w] as Quat).value;
}

// ------------------------------------------------- simetria do casco

/** `true` se `R` leva o conjunto de vértices exatamente nele mesmo. */
function ehSimetria(
  R: CANNON.Quaternion,
  pontos: readonly CANNON.Vec3[],
  tol: number,
): boolean {
  for (const p of pontos) {
    const q = R.vmult(p);
    let maisPerto = Infinity;
    for (const o of pontos) {
      const d = q.distanceTo(o);
      if (d < maisPerto) maisPerto = d;
    }
    if (maisPerto > tol) return false;
  }
  return true;
}

/**
 * Rotação que leva `deLocal` a apontar para `paraCima` **e** é uma simetria do
 * casco de colisão.
 *
 * Só girar uma face até a outra pelo caminho mais curto não basta: essa
 * rotação mínima quase nunca é simetria do sólido, então o casco visto pelo
 * motor de física muda e a queda inteira sai diferente. Com mais de um dado
 * isso é fatal — corrigir um bagunça o resultado dos outros.
 *
 * Toda rotação que satisfaz a primeira condição é `giro(paraCima, θ) ∘ base`,
 * porque girar em torno do próprio eixo de destino não mexe nele. Então basta
 * achar o θ certo: pegamos um vértice bem afastado do eixo e testamos só os θ
 * que o levam sobre algum outro vértice de mesma altura e mesmo raio — um
 * conjunto pequeno e exato de candidatos, em vez de chutar frações de volta
 * (que falham em dados de face escalena, como o trapezoedro do d10, onde a
 * face não tem simetria de rotação própria).
 */
function rotacaoSimetrica(
  deLocal: CANNON.Vec3,
  paraCima: CANNON.Vec3,
  pontos: readonly CANNON.Vec3[],
  tol: number,
): CANNON.Quaternion {
  const base = new CANNON.Quaternion().setFromVectors(deLocal, paraCima);
  const u = paraCima.unit();

  // vértice mais distante do eixo: maximiza a precisão angular de θ
  let v: CANNON.Vec3 | null = null;
  let melhorRaio = 0;
  for (const p of pontos) {
    const a = base.vmult(p);
    const raio = a.vsub(u.scale(a.dot(u))).length();
    if (raio > melhorRaio) {
      melhorRaio = raio;
      v = a;
    }
  }
  if (!v || melhorRaio < tol) return base;

  const alturaV = v.dot(u);
  const perpV = v.vsub(u.scale(alturaV));

  const candidatos = [0];
  for (const w of pontos) {
    const alturaW = w.dot(u);
    if (Math.abs(alturaW - alturaV) > tol) continue;
    const perpW = w.vsub(u.scale(alturaW));
    if (Math.abs(perpW.length() - melhorRaio) > tol) continue;
    candidatos.push(
      Math.atan2(perpV.cross(perpW).dot(u), perpV.dot(perpW)),
    );
  }

  for (const theta of candidatos) {
    const giro = new CANNON.Quaternion().setFromAxisAngle(u, theta);
    const R = giro.mult(base);
    if (ehSimetria(R, pontos, tol)) return R;
  }
  // sem simetria exata (ex.: Zocchiedro do d100): o laço de tentativas resolve
  return base;
}

/** Roda a física em passo fixo gravando cada passo. Não renderiza nada. */
export function simularEGravar(
  world: CANNON.World,
  dados: readonly DadoSimulavel[],
  poses: readonly PoseInicial[],
  correcoes: readonly CANNON.Quaternion[],
  maxPassos: number,
): Gravacao {
  // `world.time` alimenta a detecção de sono do cannon-es; sem zerar, a
  // segunda tentativa herdaria o relógio da primeira e dormiria cedo demais
  world.time = 0;

  dados.forEach((dado, k) => {
    const pose = poses[k];
    const corpo = dado.corpo;
    corpo.type = CANNON.Body.DYNAMIC;
    corpo.position.copy(pose.pos);
    corpo.quaternion.copy(pose.quat.mult(correcoes[k]));
    corpo.velocity.copy(pose.vel);
    corpo.angularVelocity.copy(pose.angVel);
    corpo.force.setZero();
    corpo.torque.setZero();
    corpo.previousPosition.copy(pose.pos);
    corpo.previousQuaternion.copy(corpo.quaternion);
    corpo.interpolatedPosition.copy(pose.pos);
    corpo.interpolatedQuaternion.copy(corpo.quaternion);
    corpo.timeLastSleepy = 0;
    corpo.wakeUp();
  });

  const limite = maxPassos + PASSOS_ASSENTAR + PASSOS_CONGELAR;
  const trilhas = dados.map(() => new Float32Array(limite * 7));
  let passos = 0;
  let quietos = 0;

  const estaParado = () =>
    dados.every(
      (d) =>
        d.corpo.sleepState === CANNON.Body.SLEEPING ||
        (d.corpo.velocity.length() < VEL_PARADO &&
          d.corpo.angularVelocity.length() < VEL_ANG_PARADO),
    );

  // Caminho percorrido por dado dentro da janela deslizante, em buffer
  // circular: `somaCaminho[k]` é sempre o total dos últimos
  // `JANELA_PROGRESSO` quadros, atualizado em O(1) por quadro.
  const caminhoNaJanela = dados.map(() => new Float64Array(JANELA_PROGRESSO));
  const somaCaminho = dados.map(() => 0);
  const posAnterior = dados.map((d) => d.corpo.position.clone());

  const registrarCaminho = (s: number) => {
    dados.forEach((d, k) => {
      const anterior = posAnterior[k];
      const avanco = d.corpo.position.distanceTo(anterior);
      anterior.copy(d.corpo.position);
      const i = s % JANELA_PROGRESSO;
      somaCaminho[k] += avanco - caminhoNaJanela[k][i];
      caminhoNaJanela[k][i] = avanco;
    });
  };

  /** Nenhum dado saiu do lugar na última janela: a queda acabou, o resto é tremor. */
  const semProgresso = (s: number) =>
    s >= JANELA_PROGRESSO &&
    dados.every(
      (d, k) =>
        d.corpo.sleepState === CANNON.Body.SLEEPING || somaCaminho[k] < CAMINHO_MINIMO,
    );

  const gravarPasso = (s: number) => {
    dados.forEach((dado, k) => {
      const { position: p, quaternion: q } = dado.corpo;
      const base = s * 7;
      const t = trilhas[k];
      t[base] = p.x;
      t[base + 1] = p.y;
      t[base + 2] = p.z;
      t[base + 3] = q.x;
      t[base + 4] = q.y;
      t[base + 5] = q.z;
      t[base + 6] = q.w;
    });
  };

  for (let s = 0; s < maxPassos; s += 1) {
    // passo fixo de um argumento = determinístico, sem subpassos variáveis
    world.step(PASSO);
    gravarPasso(s);
    registrarCaminho(s);
    passos = s + 1;

    quietos = estaParado() ? quietos + 1 : 0;
    if (quietos >= PASSOS_PARADO) break;

    if (semProgresso(s)) break;
  }

  // Quem ainda rolava ganha um trecho final com atrito alto até deitar. A
  // queda já aconteceu: este trecho não decide nada, só entrega uma pose final
  // estável — sem ele o d100 termina a animação girando.
  if (quietos < PASSOS_PARADO) {
    const amortecimentoOriginal = dados.map((d) => ({
      linear: d.corpo.linearDamping,
      angular: d.corpo.angularDamping,
    }));
    dados.forEach((d) => {
      d.corpo.linearDamping = AMORTECIMENTO_ASSENTAR.linear;
      d.corpo.angularDamping = AMORTECIMENTO_ASSENTAR.angular;
    });

    for (let s = passos; s < limite; s += 1) {
      world.step(PASSO);
      gravarPasso(s);
      registrarCaminho(s);
      passos = s + 1;

      quietos = estaParado() ? quietos + 1 : 0;
      if (quietos >= PASSOS_PARADO) break;

      // Aqui NÃO se corta por falta de progresso, ao contrário do laço da
      // queda: é justamente quando o dado já não anda que o atrito exagerado
      // precisa agir, para deitar a face. Cortar cedo devolve uma pose ainda
      // instável — medido: 16 de 120 d100 mudavam de face ao continuar a
      // simulação, contra 0 de 120 deixando o trecho correr.
    }

    // Ainda rastejando no fim do orçamento: o corpo é travado e ainda leva
    // alguns passos para acomodar na face. A pose final é imposta logo depois
    // (ver `simularAlinhado`), então nada aqui decide resultado — isto existe
    // só para a animação terminar parada.
    if (quietos < PASSOS_PARADO) {
      dados.forEach((d) => {
        d.corpo.velocity.setZero();
        d.corpo.angularVelocity.setZero();
      });
      const ate = Math.min(limite, passos + PASSOS_CONGELAR);
      for (let s = passos; s < ate; s += 1) {
        world.step(PASSO);
        gravarPasso(s);
        passos = s + 1;
      }
    }

    dados.forEach((d, k) => {
      d.corpo.linearDamping = amortecimentoOriginal[k].linear;
      d.corpo.angularDamping = amortecimentoOriginal[k].angular;
    });
  }

  return { passos, trilhas };
}

export interface ResultadoAlinhamento {
  readonly gravacao: Gravacao;
  /** Valor com que cada dado de fato terminou — igual a `results` quando fecha. */
  readonly valores: number[];
  /** `true` quando todos os dados terminaram no valor pedido. */
  readonly alinhado: boolean;
  /** Simulações gastas. Sempre 1: a correção é aplicada na gravação. */
  readonly simulacoes: number;
}

/**
 * Simula até a queda terminar com os valores pedidos, devolvendo a gravação
 * já conferida.
 *
 * A física roda UMA vez, livre. Depois, para cada dado, gira-se a gravação
 * inteira por uma rotação que é simetria do casco: para um sólido isoédrico
 * (todo dado clássico: d4, d6, d8, d10, d12, d20, d24, d30…) sempre existe uma
 * que leva a face sorteada na face que calhou de cair para cima. Como é
 * simetria, o sólido ocupa o mesmo espaço em todos os quadros — a queda vista
 * é exatamente a que a física produziu; só a numeração gira junto.
 *
 * Formas sem simetria exata (o Zocchiedro do d100, quase esférico) caem na
 * rotação mínima: o desvio geométrico é imperceptível, mas o resultado fica
 * garantido do mesmo jeito. `alinhado` informa se todos fecharam.
 */
export function simularAlinhado(
  world: CANNON.World,
  dados: readonly DadoSimulavel[],
  poses: readonly PoseInicial[],
  results: readonly number[] | undefined,
  opcoes: OpcoesAlinhamento,
): ResultadoAlinhamento {
  const identidade = dados.map(() => new CANNON.Quaternion(0, 0, 0, 1));
  const gravacao = simularEGravar(world, dados, poses, identidade, opcoes.maxPassos);

  const alvoValido = results !== undefined && results.length === dados.length;
  if (!alvoValido) {
    return { gravacao, valores: dados.map(valorExibido), alinhado: true, simulacoes: 1 };
  }

  const cascos = dados.map((d) =>
    d.meta.collider.vertices.map(([x, y, z]) => new CANNON.Vec3(x, y, z)),
  );
  const tolerancias = cascos.map(
    (pontos) => 0.02 * Math.max(...pontos.map((p) => p.length())),
  );

  dados.forEach((dado, k) => {
    const natural = valorExibido(dado);
    if (natural === results[k]) return;
    // Direções EXATAS do dado, não a orientação medida: o dado assentado fica
    // sempre com uma inclinação mínima em relação à normal ideal, e não há
    // simetria exata entre uma direção exata e uma torta.
    const de = upDirectionForValue(dado.meta, results[k]);
    const para = upDirectionForValue(dado.meta, natural);
    const D = rotacaoSimetrica(
      new CANNON.Vec3(de[0], de[1], de[2]),
      new CANNON.Vec3(para[0], para[1], para[2]),
      cascos[k],
      tolerancias[k],
    );
    girarTrilha(gravacao.trilhas[k], gravacao.passos, D);
    dado.corpo.quaternion.copy(dado.corpo.quaternion.mult(D));

    if (valorExibido(dado) === results[k]) return;

    // Sem simetria exata do casco (Zocchiedro do d100, d50), a rotação mínima
    // leva a face pedida para o lugar da que caiu, mas gira junto o campo de
    // normais inteiro — e outra face pode terminar mais alta que ela. Medido:
    // até 12 de 12 lançamentos exibindo um número diferente do sorteado.
    //
    // Então aqui a pose final deixa de ser derivada e passa a ser imposta: a
    // face pedida aponta exatamente para +Y, o que a torna a mais alta por
    // construção. O dado fica com a inclinação da parceira quase oposta (no
    // d100, no máximo ~12°), imperceptível num sólido quase esférico.
    const alvo = orientationForValue(dado.meta, results[k]);
    const qFinal = new CANNON.Quaternion(alvo[0], alvo[1], alvo[2], alvo[3]);
    const correcao = dado.corpo.quaternion.inverse().mult(qFinal);
    girarTrilha(gravacao.trilhas[k], gravacao.passos, correcao);
    dado.corpo.quaternion.copy(dado.corpo.quaternion.mult(correcao));
  });

  const valores = dados.map(valorExibido);
  return {
    gravacao,
    valores,
    alinhado: valores.every((v, k) => v === results[k]),
    simulacoes: 1,
  };
}

/**
 * Pós-multiplica toda a trilha por `D`, girando o dado em torno do próprio
 * centro em cada quadro.
 *
 * É aqui que o resultado é fixado, e não mexendo na física: como `D` é uma
 * simetria do casco, o sólido ocupa exatamente o mesmo espaço em todos os
 * instantes — mesma silhueta, mesmos contatos, mesma queda. O que gira é a
 * numeração pintada nele. Corrigir a física em vez disso exigiria repetir a
 * simulação até acertar, e ela nunca repete igual: o solver de contatos do
 * cannon-es depende da ordem de enumeração dos contatos, então a menor
 * diferença vira uma trajetória completamente outra — o que inviabilizava a
 * convergência, sobretudo com vários dados colidindo entre si.
 */
function girarTrilha(trilha: Float32Array, passos: number, D: CANNON.Quaternion): void {
  const q = new CANNON.Quaternion();
  for (let s = 0; s < passos; s += 1) {
    const base = s * 7;
    q.set(trilha[base + 3], trilha[base + 4], trilha[base + 5], trilha[base + 6]);
    const r = q.mult(D);
    trilha[base + 3] = r.x;
    trilha[base + 4] = r.y;
    trilha[base + 5] = r.z;
    trilha[base + 6] = r.w;
  }
}
