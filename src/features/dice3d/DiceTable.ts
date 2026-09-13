/**
 * Mesa de dados 3D: cena three.js + mundo de corpos rígidos cannon-es.
 *
 * Sem dependência de React — é uma classe que recebe um `<canvas>`. O binding
 * React fica em `useDiceTable.ts`.
 *
 * Escala: **1 unidade = 1 cm**, gravidade `-981 cm/s²`. É a mesma escala em que
 * a simulação foi validada no Blender (qui-quadrado sobre 600 lançamentos de
 * d6 e d20, ambos uniformes a 95%).
 */

import * as CANNON from "cannon-es";
import * as THREE from "three";

import {
  APARENCIA_PADRAO,
  atualizarMaterialCorpo,
  criarMaterialCorpo,
  criarMaterialNumeros,
  type DieAppearance,
} from "./appearance";
import { CAMINHO_PADRAO, carregarDado } from "./assets";
import {
  PASSO,
  aplicarInerciaIsotropica,
  simularAlinhado,
  type Gravacao,
  type PoseInicial,
} from "./rollSimulation";
import { lerDado, type LeituraDado } from "./readout";
import { limitesVisiveis } from "./viewportBounds";
import type { DieMeta, Quat } from "./types";

export interface DiceTableOptions {
  canvas: HTMLCanvasElement;
  /** Onde estão os assets. Padrão `/dice`. */
  basePath?: string;
  /** Gravidade em cm/s². Padrão `-981`. */
  gravity?: number;
  /** Metade do lado da mesa, em cm. Padrão `26`. */
  bounds?: number;
  /** Cor de fundo; `null` deixa transparente. */
  background?: THREE.ColorRepresentation | null;
  /**
   * Fonte de aleatoriedade. Injete aqui o `RandomSource` do domínio para que
   * o lançamento use o RNG auditado do projeto em vez de `Math.random`.
   */
  random?: () => number;
  /** Segundos de simulação antes de desistir de esperar o dado parar. */
  maxRollSeconds?: number;
  /** Ajustes baratos para telas pequenas; não altera a matemática do dado. */
  mobile?: boolean;
  /** Subpassos máximos do mundo por frame (o padrão é 4). */
  maxPhysicsSubsteps?: number;
}

export interface RollOutcome extends LeituraDado {
  id: string;
  /** Índice da instância quando o mesmo tipo é lançado mais de uma vez. */
  slot: number;
}

export interface RollOptions {
  /** Altura de lançamento, em cm. */
  height?: number;
  /** Raio do espalhamento horizontal, em cm. */
  spread?: number;
  /** Módulo máximo do impulso linear. */
  impulse?: number;
  /** Módulo máximo do giro inicial, em rad/s. */
  spin?: number;
  /**
   * Valores finais desejados, na mesma ordem dos dados alvo (`ids`, ou a
   * ordem de inserção quando `ids` for omitido).
   *
   * O número NUNCA vem da física: vem do motor de dados do domínio
   * (`RandomSource` auditado, usado no histórico/reroll/rngVersion).
   *
   * A queda não é encenada nem corrigida no meio do caminho: a física roda
   * solta e, depois, a gravação inteira é girada por uma simetria do casco do
   * dado — mesma silhueta e mesmos contatos em todos os quadros, só a
   * numeração gira junto até a face pedida ficar em cima. Ver `simularAlinhado`.
   */
  results?: readonly number[];
}

interface Instancia {
  id: string;
  slot: number;
  meta: DieMeta;
  grupo: THREE.Group;
  corpo: CANNON.Body;
  materialCorpo: THREE.MeshPhysicalMaterial;
  materialNumeros: THREE.MeshStandardMaterial;
}

export class DiceTable {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly world = new CANNON.World();

  private readonly canvas: HTMLCanvasElement;
  private readonly basePath: string;
  private readonly bounds: number;
  private readonly random: () => number;
  private readonly maxRollSeconds: number;
  private readonly pixelRatioCap: number;
  private maxPhysicsSubsteps: number;
  private readonly instancias: Instancia[] = [];
  private readonly materialFisico = new CANNON.Material("dado");

  private relogio = new THREE.Timer();
  private frame = 0;
  private descartado = false;
  private animationRunning = false;
  /** Paredes de colisão; reposicionadas a cada `resize` (ver `atualizarLimites`). */
  private paredes: CANNON.Body[] = [];
  private limiteX = 26;
  private limiteZ = 26;
  private reproduzindo: {
    alvos: Instancia[];
    gravacao: Gravacao;
    tempo: number;
    resolve: (r: RollOutcome[]) => void;
  } | null = null;

  constructor(opts: DiceTableOptions) {
    this.canvas = opts.canvas;
    this.basePath = opts.basePath ?? CAMINHO_PADRAO;
    this.bounds = opts.bounds ?? 26;
    this.random = opts.random ?? Math.random;
    this.maxRollSeconds = opts.maxRollSeconds ?? 8;
    const mobile = opts.mobile === true;
    this.pixelRatioCap = mobile ? 1.25 : 2;
    this.maxPhysicsSubsteps = Math.max(1, Math.trunc(opts.maxPhysicsSubsteps ?? (mobile ? 3 : 4)));

    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: !mobile,
      alpha: opts.background === null,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    if (typeof document !== "undefined") this.relogio.connect(document);

    if (opts.background !== null) {
      this.scene.background = new THREE.Color(opts.background ?? "#12141b");
    }

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 500);
    this.camera.position.set(0, 46, 34);
    this.camera.lookAt(0, 0, 0);

    this.montarLuzes();
    this.montarMundo(opts.gravity ?? -981);
    this.resize();
    this.renderFrame();
  }

  /** Inicia a renderização somente durante uma simulação física. */
  start(): void {
    if (this.descartado || this.animationRunning) return;
    this.animationRunning = true;
    this.relogio.reset();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  /** Pausa o loop quando os dados assentaram; a última pose permanece visível. */
  stop(): void {
    if (!this.animationRunning) return;
    this.animationRunning = false;
    this.renderer.setAnimationLoop(null);
  }

  /**
   * Orçamento de física do dispositivo.
   *
   * Desde que a queda passou a ser simulada antes e só reproduzida na tela,
   * não existe mais subpasso por quadro — a animação não roda solver nenhum e
   * o custo em aparelho fraco caiu junto. Mantido por compatibilidade de API.
   */
  setMaxPhysicsSubsteps(value: number): void {
    this.maxPhysicsSubsteps = Math.max(1, Math.trunc(value));
  }

  /** Passos de simulação da queda, derivados de `maxRollSeconds`. */
  private get maxPassosSim(): number {
    return Math.max(60, Math.round(this.maxRollSeconds / PASSO));
  }


  // ------------------------------------------------------------------ cena

  private montarLuzes(): void {
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1b1d26, 1.1));

    const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
    key.position.set(-22, 40, 18);
    key.castShadow = true;
    const shadowMapSize = this.isMobileViewport() ? 1024 : 2048;
    key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    const c = key.shadow.camera;
    c.near = 5;
    c.far = 120;
    c.left = -40;
    c.right = 40;
    c.top = 40;
    c.bottom = -40;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xbcd4ff, 0.7);
    fill.position.set(24, 20, -18);
    this.scene.add(fill);
  }

  private montarMundo(gravity: number): void {
    this.world.gravity.set(0, gravity, 0);
    this.world.allowSleep = true;
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 14;
    this.world.defaultContactMaterial.friction = 0.45;
    this.world.defaultContactMaterial.restitution = 0.28;

    const materialMesa = new CANNON.Material("mesa");
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.materialFisico, materialMesa, {
        friction: 0.55,
        restitution: 0.3,
      }),
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.materialFisico, this.materialFisico, {
        friction: 0.25,
        restitution: 0.35,
      }),
    );

    const chao = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: materialMesa,
    });
    chao.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(chao);

    // Paredes invisíveis. As posições reais saem de `atualizarLimites()`, que
    // as encaixa no retângulo de chão que a câmera realmente enxerga — caixa
    // fixa em cm deixava o dado "sumir" da tela em telas estreitas, onde o
    // campo de visão horizontal é muito menor que o vertical.
    const rotacoes: Array<[number, number, number]> = [
      [0, Math.PI / 2, 0], // -X
      [0, -Math.PI / 2, 0], // +X
      [0, 0, 0], // -Z
      [0, Math.PI, 0], // +Z
    ];
    for (const rot of rotacoes) {
      const p = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
        material: materialMesa,
      });
      p.quaternion.setFromEuler(rot[0], rot[1], rot[2]);
      this.world.addBody(p);
      this.paredes.push(p);
    }
    this.posicionarParedes();

    const sombra = new THREE.Mesh(
      new THREE.PlaneGeometry(this.bounds * 4, this.bounds * 4),
      new THREE.ShadowMaterial({ opacity: 0.38 }),
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.receiveShadow = true;
    this.scene.add(sombra);
  }

  private posicionarParedes(): void {
    const [mx, mz] = [this.limiteX, this.limiteZ];
    const destinos: Array<[number, number, number]> = [
      [-mx, 0, 0],
      [mx, 0, 0],
      [0, 0, -mz],
      [0, 0, mz],
    ];
    this.paredes.forEach((p, i) => {
      const [x, y, z] = destinos[i];
      p.position.set(x, y, z);
    });
  }

  /**
   * Encaixa a área jogável no retângulo de chão efetivamente visível.
   *
   * Lança um raio pelos quatro cantos da tela até o plano y=0 e usa a caixa
   * INSCRITA (mínimo de |x| e |z| entre os cantos) — assim toda a área de jogo
   * está garantidamente dentro do enquadramento, em qualquer proporção de tela.
   */
  private atualizarLimites(): void {
    const { x, z } = limitesVisiveis(this.camera, this.bounds);
    this.limiteX = x;
    this.limiteZ = z;
    this.posicionarParedes();
  }

  // ----------------------------------------------------------------- dados

  /**
   * Adiciona um dado à mesa. Chame várias vezes com o mesmo `id` para ter
   * múltiplas cópias (cada uma vira um `slot`).
   */
  async add(id: string, aparencia: DieAppearance = {}): Promise<number> {
    const { meta, gltf } = await carregarDado(id, this.basePath);
    const a = { ...APARENCIA_PADRAO, ...aparencia };

    const grupo = new THREE.Group();
    const materialCorpo = criarMaterialCorpo(a);
    const materialNumeros = criarMaterialNumeros(a);

    gltf.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const clone = new THREE.Mesh(
        o.geometry,
        o.name.endsWith("_num") ? materialNumeros : materialCorpo,
      );
      clone.castShadow = true;
      clone.receiveShadow = false;
      clone.name = o.name;
      grupo.add(clone);
    });
    this.scene.add(grupo);

    const corpo = new CANNON.Body({
      mass: meta.mass,
      shape: this.formaConvexa(meta),
      material: this.materialFisico,
      allowSleep: true,
      linearDamping: 0.06,
      angularDamping: 0.12,
    });
    corpo.sleepSpeedLimit = 0.9;
    corpo.sleepTimeLimit = 0.35;
    aplicarInerciaIsotropica(corpo, meta);
    corpo.sleep();
    this.world.addBody(corpo);

    const slot = this.instancias.filter((i) => i.id === id).length;
    this.instancias.push({
      id,
      slot,
      meta,
      grupo,
      corpo,
      materialCorpo,
      materialNumeros,
    });
    return slot;
  }

  /**
   * Casco convexo a partir do colisor exportado. As faces já vêm como
   * polígonos em ordem anti-horária vista de fora — usar os polígonos em vez
   * dos triângulos reduz pela metade o custo de colisão em dados como o d120.
   */
  private formaConvexa(meta: DieMeta): CANNON.ConvexPolyhedron {
    return new CANNON.ConvexPolyhedron({
      vertices: meta.collider.vertices.map(
        ([x, y, z]) => new CANNON.Vec3(x, y, z),
      ),
      faces: meta.collider.faces,
    });
  }

  /** Troca cor/textura/acabamento de um dado já na mesa. */
  setAppearance(id: string, aparencia: DieAppearance, slot = 0): void {
    const inst = this.buscar(id, slot);
    if (!inst) return;
    atualizarMaterialCorpo(inst.materialCorpo, aparencia);
    if (aparencia.numberColor !== undefined) {
      inst.materialNumeros.color.set(aparencia.numberColor);
    }
    if (aparencia.numberRoughness !== undefined) {
      inst.materialNumeros.roughness = aparencia.numberRoughness;
    }
    if (aparencia.numberMetalness !== undefined) {
      inst.materialNumeros.metalness = aparencia.numberMetalness;
    }
    inst.materialNumeros.needsUpdate = true;
  }

  private buscar(id: string, slot: number): Instancia | undefined {
    return this.instancias.find((i) => i.id === id && i.slot === slot);
  }

  /** Remove todos os dados da mesa (corpo físico, malha e materiais). */
  clear(): void {
    const estavaRolando = this.reproduzindo !== null;
    this.reproduzindo?.resolve([]);
    this.reproduzindo = null;
    if (estavaRolando) this.stop();
    for (const inst of this.instancias) {
      this.world.removeBody(inst.corpo);
      this.scene.remove(inst.grupo);
      inst.materialCorpo.dispose();
      inst.materialNumeros.dispose();
    }
    this.instancias.length = 0;
  }

  // --------------------------------------------------------------- rolagem

  /**
   * Quaternion uniforme em SO(3) pelo método de Shoemake. Sortear ângulos de
   * Euler independentes concentraria as orientações perto dos polos e
   * enviesaria o resultado — aqui a distribuição é realmente uniforme.
   */
  private quatUniforme(): [number, number, number, number] {
    const u1 = this.random();
    const u2 = this.random();
    const u3 = this.random();
    const s1 = Math.sqrt(1 - u1);
    const s2 = Math.sqrt(u1);
    const t2 = 2 * Math.PI * u2;
    const t3 = 2 * Math.PI * u3;
    return [s1 * Math.sin(t2), s1 * Math.cos(t2), s2 * Math.sin(t3), s2 * Math.cos(t3)];
  }

  private faixa(m: number): number {
    return (this.random() * 2 - 1) * m;
  }

  /**
   * Lança os dados e resolve quando a animação termina.
   *
   * A física roda ANTES de aparecer qualquer coisa: a queda é simulada
   * inteira, sem renderizar, e só a trajetória gravada é reproduzida. Isso
   * resolve de uma vez os dois problemas de empurrar o dado durante o
   * contato com a mesa — o tremor (solver brigando com a correção a cada
   * quadro) e o resultado divergente (o dado assentava numa face e a
   * correção não conseguia mais virá-lo). Aqui a gravação exibida já foi
   * conferida: a face de cima é o valor pedido.
   */
  roll(ids?: string[], opts: RollOptions = {}): Promise<RollOutcome[]> {
    const alvos = ids
      ? this.instancias.filter((i) => ids.includes(i.id))
      : [...this.instancias];
    if (alvos.length === 0) return Promise.resolve([]);

    const poses = this.sortearPoses(alvos, opts);
    const { gravacao } = simularAlinhado(this.world, alvos, poses, opts.results, {
      maxPassos: this.maxPassosSim,
    });

    this.reproduzindo?.resolve([]);
    this.start();
    return new Promise<RollOutcome[]>((resolve) => {
      this.reproduzindo = { alvos, gravacao, tempo: 0, resolve };
    });
  }

  /** Sorteia posição, orientação e impulso iniciais de cada dado. */
  private sortearPoses(alvos: Instancia[], opts: RollOptions): PoseInicial[] {
    const limite = Math.min(this.limiteX, this.limiteZ);
    const altura = opts.height ?? Math.max(16, limite * 1.1);
    const espalhar = opts.spread ?? limite * 0.45;
    const impulso = opts.impulse ?? limite * 2.4;
    const giro = opts.spin ?? 22;

    return alvos.map((_, k) => {
      const ang = (k / alvos.length) * Math.PI * 2 + this.random();
      const raio = espalhar * (0.35 + 0.65 * this.random());
      const [qx, qy, qz, qw] = this.quatUniforme();
      return {
        pos: new CANNON.Vec3(
          Math.cos(ang) * raio,
          altura + this.random() * 6,
          Math.sin(ang) * raio,
        ),
        quat: new CANNON.Quaternion(qx, qy, qz, qw),
        vel: new CANNON.Vec3(this.faixa(impulso), -impulso * 0.25, this.faixa(impulso)),
        angVel: new CANNON.Vec3(this.faixa(giro), this.faixa(giro), this.faixa(giro)),
      };
    });
  }


  /** Lê o resultado atual sem lançar de novo. */
  read(id: string, slot = 0): RollOutcome | null {
    const inst = this.buscar(id, slot);
    if (!inst) return null;
    return this.ler(inst);
  }

  private ler(inst: Instancia): RollOutcome {
    const q = inst.corpo.quaternion;
    const leitura = lerDado(inst.meta, [q.x, q.y, q.z, q.w] as Quat);
    return { id: inst.id, slot: inst.slot, ...leitura };
  }

  // ------------------------------------------------------------------ loop

  /**
   * Reproduz a trajetória gravada. Nada de física aqui: o corpo rígido só
   * recebe a pose já calculada, interpolada entre os dois passos vizinhos
   * para ficar fluido em qualquer taxa de atualização de tela (inclusive
   * 120 Hz) sem depender do custo do solver — o que também deixa o celular
   * bem mais leve durante a animação.
   */
  private tick(): void {
    if (this.descartado) return;
    this.relogio.update();
    const dt = Math.min(this.relogio.getDelta(), 0.1);

    const cena = this.reproduzindo;
    if (cena) {
      cena.tempo += dt;
      const { passos, trilhas } = cena.gravacao;
      const exato = cena.tempo / PASSO;
      const ultimo = passos - 1;
      const i0 = Math.min(Math.floor(exato), ultimo);
      const i1 = Math.min(i0 + 1, ultimo);
      const f = i1 > i0 ? exato - i0 : 0;

      cena.alvos.forEach((inst, k) => {
        const t = trilhas[k];
        const a = i0 * 7;
        const b = i1 * 7;
        inst.corpo.position.set(
          t[a] + (t[b] - t[a]) * f,
          t[a + 1] + (t[b + 1] - t[a + 1]) * f,
          t[a + 2] + (t[b + 2] - t[a + 2]) * f,
        );
        const qa = new CANNON.Quaternion(t[a + 3], t[a + 4], t[a + 5], t[a + 6]);
        const qb = new CANNON.Quaternion(t[b + 3], t[b + 4], t[b + 5], t[b + 6]);
        qa.slerp(qb, f, inst.corpo.quaternion);
        inst.corpo.quaternion.normalize();
      });

      if (exato >= ultimo) {
        const { alvos, resolve } = cena;
        this.reproduzindo = null;
        // congela os corpos na pose final: sem isso a gravidade voltaria a
        // agir no próximo `start()` e mexeria no dado já lido
        for (const inst of alvos) {
          inst.corpo.velocity.setZero();
          inst.corpo.angularVelocity.setZero();
          inst.corpo.sleep();
        }
        const resultados = alvos.map((i) => this.ler(i));
        this.renderFrame();
        this.stop();
        resolve(resultados);
        return;
      }
    }

    this.frame += 1;
    this.renderFrame();
  }

  private renderFrame(): void {
    for (const inst of this.instancias) {
      const p = inst.corpo.position;
      const q = inst.corpo.quaternion;
      inst.grupo.position.set(p.x, p.y, p.z);
      inst.grupo.quaternion.set(q.x, q.y, q.z, q.w);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private isMobileViewport(): boolean {
    return typeof window !== "undefined" &&
      (window.matchMedia?.("(max-width: 680px)").matches ?? window.innerWidth <= 680);
  }

  /** Reajusta a câmera e o buffer ao tamanho atual do canvas. */
  resize(): void {
    const l = this.canvas.clientWidth || 1;
    const a = this.canvas.clientHeight || 1;
    const devicePixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.pixelRatioCap));
    this.renderer.setSize(l, a, false);
    this.camera.aspect = l / a;
    this.camera.updateProjectionMatrix();
    this.atualizarLimites();
  }

  dispose(): void {
    this.descartado = true;
    this.stop();
    this.reproduzindo?.resolve([]);
    this.reproduzindo = null;
    for (const inst of this.instancias) {
      this.world.removeBody(inst.corpo);
      this.scene.remove(inst.grupo);
      inst.materialCorpo.dispose();
      inst.materialNumeros.dispose();
    }
    this.instancias.length = 0;
    this.renderer.dispose();
    this.relogio.dispose();
  }
}
