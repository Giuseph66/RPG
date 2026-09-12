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
import { lerDado, type LeituraDado } from "./readout";
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

const PASSO = 1 / 60;

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
  private readonly instancias: Instancia[] = [];
  private readonly materialFisico = new CANNON.Material("dado");

  private relogio = new THREE.Clock();
  private frame = 0;
  private descartado = false;
  private rolando: {
    alvos: Instancia[];
    decorrido: number;
    resolve: (r: RollOutcome[]) => void;
  } | null = null;

  constructor(opts: DiceTableOptions) {
    this.canvas = opts.canvas;
    this.basePath = opts.basePath ?? CAMINHO_PADRAO;
    this.bounds = opts.bounds ?? 26;
    this.random = opts.random ?? Math.random;
    this.maxRollSeconds = opts.maxRollSeconds ?? 8;

    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      alpha: opts.background === null,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (opts.background !== null) {
      this.scene.background = new THREE.Color(opts.background ?? "#12141b");
    }

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 500);
    this.camera.position.set(0, 46, 34);
    this.camera.lookAt(0, 0, 0);

    this.montarLuzes();
    this.montarMundo(opts.gravity ?? -981);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ------------------------------------------------------------------ cena

  private montarLuzes(): void {
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1b1d26, 1.1));

    const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
    key.position.set(-22, 40, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
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

    // paredes invisíveis: sem elas o dado sai rolando para fora da mesa
    const b = this.bounds;
    const paredes: Array<[CANNON.Vec3, [number, number, number]]> = [
      [new CANNON.Vec3(-b, 0, 0), [0, Math.PI / 2, 0]],
      [new CANNON.Vec3(b, 0, 0), [0, -Math.PI / 2, 0]],
      [new CANNON.Vec3(0, 0, -b), [0, 0, 0]],
      [new CANNON.Vec3(0, 0, b), [0, Math.PI, 0]],
    ];
    for (const [pos, rot] of paredes) {
      const p = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
        material: materialMesa,
      });
      p.position.copy(pos);
      p.quaternion.setFromEuler(rot[0], rot[1], rot[2]);
      this.world.addBody(p);
    }

    const sombra = new THREE.Mesh(
      new THREE.PlaneGeometry(b * 2.4, b * 2.4),
      new THREE.ShadowMaterial({ opacity: 0.38 }),
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.receiveShadow = true;
    this.scene.add(sombra);
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

  /** Lança os dados indicados e resolve quando todos pararem. */
  roll(ids?: string[], opts: RollOptions = {}): Promise<RollOutcome[]> {
    const alvos = ids
      ? this.instancias.filter((i) => ids.includes(i.id))
      : [...this.instancias];
    if (alvos.length === 0) return Promise.resolve([]);

    const altura = opts.height ?? 24;
    const espalhar = opts.spread ?? Math.min(this.bounds * 0.45, 10);
    const impulso = opts.impulse ?? 70;
    const giro = opts.spin ?? 22;

    alvos.forEach((inst, k) => {
      const ang = (k / alvos.length) * Math.PI * 2 + this.random();
      const raio = espalhar * (0.35 + 0.65 * this.random());
      const [qx, qy, qz, qw] = this.quatUniforme();

      inst.corpo.wakeUp();
      inst.corpo.position.set(
        Math.cos(ang) * raio,
        altura + this.random() * 8,
        Math.sin(ang) * raio,
      );
      inst.corpo.quaternion.set(qx, qy, qz, qw);
      inst.corpo.velocity.set(this.faixa(impulso), -impulso * 0.3, this.faixa(impulso));
      inst.corpo.angularVelocity.set(this.faixa(giro), this.faixa(giro), this.faixa(giro));
      inst.corpo.force.setZero();
      inst.corpo.torque.setZero();
    });

    return new Promise<RollOutcome[]>((resolve) => {
      this.rolando?.resolve([]);
      this.rolando = { alvos, decorrido: 0, resolve };
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

  private tick(): void {
    if (this.descartado) return;
    const dt = Math.min(this.relogio.getDelta(), 0.1);
    this.world.step(PASSO, dt, 4);

    for (const inst of this.instancias) {
      const p = inst.corpo.position;
      const q = inst.corpo.quaternion;
      inst.grupo.position.set(p.x, p.y, p.z);
      inst.grupo.quaternion.set(q.x, q.y, q.z, q.w);
    }

    if (this.rolando) {
      this.rolando.decorrido += dt;
      const parados = this.rolando.alvos.every(
        (i) => i.corpo.sleepState === CANNON.Body.SLEEPING,
      );
      if (parados || this.rolando.decorrido >= this.maxRollSeconds) {
        const { alvos, resolve } = this.rolando;
        this.rolando = null;
        resolve(alvos.map((i) => this.ler(i)));
      }
    }

    this.frame += 1;
    this.renderer.render(this.scene, this.camera);
  }

  /** Reajusta a câmera e o buffer ao tamanho atual do canvas. */
  resize(): void {
    const l = this.canvas.clientWidth || 1;
    const a = this.canvas.clientHeight || 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(l, a, false);
    this.camera.aspect = l / a;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.descartado = true;
    this.renderer.setAnimationLoop(null);
    for (const inst of this.instancias) {
      this.world.removeBody(inst.corpo);
      this.scene.remove(inst.grupo);
      inst.materialCorpo.dispose();
      inst.materialNumeros.dispose();
    }
    this.instancias.length = 0;
    this.renderer.dispose();
  }
}
