/**
 * Opções escolhidas ao evoluir (Livro do Jogador, cap. 3). Cada opção vira uma característica
 * publicada no pack (`<grupo>.<id>`), para que as escolhas referenciem entidades que existem.
 * `descKey` aponta para o texto bruto em `src/data/correto/descricoes/features.ts`.
 */

export type OptionGroupId =
  | "fighting-style"
  | "metamagic"
  | "invocation"
  | "pact-boon"
  | "maneuver"
  | "hunters-prey"
  | "defensive-tactics"
  | "multiattack"
  | "superior-hunters-defense"
  | "totem"
  | "favored-enemy"
  | "greater-favored-enemy"
  | "dragon-ancestry"
  | "elemental-discipline"
  | "beast-companion"
  | "druid-terrain";

export interface OptionPrerequisites {
  /** Nível mínimo na classe dona do grupo. */
  readonly classLevel?: number;
  /** Dádiva do Pacto exigida (id sem o prefixo do grupo). */
  readonly pact?: "chain" | "blade" | "tome";
  /** Truque que o personagem precisa conhecer. */
  readonly cantrip?: string;
}

export interface OptionSpec {
  readonly id: string;
  readonly name: string;
  readonly summary?: string;
  /** Chave em PHB_FEATURE_DESCRIPTIONS quando o texto da opção está separado. */
  readonly descKey?: string;
  readonly prerequisites?: OptionPrerequisites;
}

export interface OptionGroup {
  readonly id: OptionGroupId;
  /** Classe ou subclasse dona do grupo (usada para o nível mínimo). */
  readonly ownerId: string;
  readonly label: string;
  readonly options: readonly OptionSpec[];
}

const o = (id: string, name: string, extra: Partial<OptionSpec> = {}): OptionSpec => ({ id, name, ...extra });

export const OPTION_GROUPS: readonly OptionGroup[] = [
  {
    id: "fighting-style", ownerId: "fighter", label: "Estilo de Luta",
    options: [
      o("archery", "Arquearia", { summary: "+2 nas jogadas de ataque com armas à distância." , descKey: "guerreiro.arquearia" }),
      o("defense", "Defesa", { summary: "+1 de CA enquanto usa armadura.", descKey: "guerreiro.defesa" }),
      o("dueling", "Duelismo", { summary: "+2 de dano com uma arma corpo a corpo em uma mão.", descKey: "guerreiro.duelismo" }),
      o("great-weapon-fighting", "Combate com Armas Grandes", { summary: "Rerrola 1 e 2 nos dados de dano de armas de duas mãos.", descKey: "guerreiro.combate-com-armas-grandes" }),
      o("protection", "Proteção", { summary: "Reação com escudo impõe desvantagem a ataques contra aliados.", descKey: "guerreiro.protecao" }),
      o("two-weapon-fighting", "Combate com Duas Armas", { summary: "Soma o modificador ao dano do ataque da segunda arma.", descKey: "guerreiro.combate-com-duas-armas" }),
    ],
  },
  {
    id: "metamagic", ownerId: "sorcerer", label: "Metamagia",
    options: [
      o("careful-spell", "Magia Cuidadosa", { descKey: "feiticeiro.magia-cuidadosa" }),
      o("distant-spell", "Magia Distante", { descKey: "feiticeiro.magia-distante" }),
      o("empowered-spell", "Magia Potencializada", { descKey: "feiticeiro.magia-potencializada" }),
      o("extended-spell", "Magia Estendida", { descKey: "feiticeiro.magia-estendida" }),
      o("heightened-spell", "Magia Aumentada", { descKey: "feiticeiro.magia-aumentada" }),
      o("quickened-spell", "Magia Acelerada", { descKey: "feiticeiro.magia-acelerada" }),
      o("subtle-spell", "Magia Sutil", { descKey: "feiticeiro.magia-sutil" }),
      o("twinned-spell", "Magia Duplicada", { descKey: "feiticeiro.magia-duplicada" }),
    ],
  },
  {
    id: "pact-boon", ownerId: "warlock", label: "Dádiva do Pacto",
    options: [
      o("chain", "Pacto da Corrente", { descKey: "bruxo.pacto-da-corrente" }),
      o("blade", "Pacto da Lâmina", { descKey: "bruxo.pacto-da-lamina" }),
      o("tome", "Pacto do Tomo", { descKey: "bruxo.pacto-do-tomo" }),
    ],
  },
  {
    id: "invocation", ownerId: "warlock", label: "Invocações Místicas",
    options: [
      o("armor-of-shadows", "Armadura de Sombras", { descKey: "the-great-old-one.armadura-de-sombras" }),
      o("agonizing-blast", "Explosão Agonizante", { descKey: "the-great-old-one.explosao-agonizante", prerequisites: { cantrip: "rajada-mistica" } }),
      o("ascendant-step", "Passo Ascendente", { descKey: "the-great-old-one.passo-ascendente", prerequisites: { classLevel: 9 } }),
      o("beast-speech", "Idioma Bestial", { descKey: "the-great-old-one.idioma-bestial" }),
      o("beguiling-influence", "Influência Enganadora", { descKey: "the-great-old-one.influencia-enganadora" }),
      o("bewitching-whispers", "Sussurros Sedutores", { descKey: "the-great-old-one.sussurros-sedutores", prerequisites: { classLevel: 7 } }),
      o("book-of-ancient-secrets", "Livro de Segredos Antigos", { descKey: "the-great-old-one.livro-de-segredos-antigos", prerequisites: { pact: "tome" } }),
      o("chains-of-carceri", "Correntes de Cárceri", { descKey: "the-great-old-one.correntes-de-carceri", prerequisites: { classLevel: 15, pact: "chain" } }),
      o("devils-sight", "Visão Diabólica", { descKey: "the-great-old-one.visao-diabolica" }),
      o("dreadful-word", "Palavra Terrível", { descKey: "the-great-old-one.palavra-terrivel", prerequisites: { classLevel: 7 } }),
      o("eldritch-sight", "Visão Mística", { descKey: "the-great-old-one.visao-mistica" }),
      o("eldritch-spear", "Lança Mística", { descKey: "the-great-old-one.lanca-mistica", prerequisites: { cantrip: "rajada-mistica" } }),
      o("eyes-of-the-rune-keeper", "Olhos do Guardião das Runas", { descKey: "the-great-old-one.olhos-do-guardiao-das-runas" }),
      o("fiendish-vigor", "Vigor Abissal", { descKey: "the-great-old-one.vigor-abissal" }),
      o("gaze-of-two-minds", "Olhar de Duas Mentes", { descKey: "the-great-old-one.olhar-de-duas-mentes" }),
      o("lifedrinker", "Sorvedor de Vida", { descKey: "the-great-old-one.sorvedor-de-vida", prerequisites: { classLevel: 12, pact: "blade" } }),
      o("mask-of-many-faces", "Máscara das Muitas Faces", { descKey: "the-great-old-one.mascara-das-muitas-faces" }),
      o("master-of-myriad-forms", "Mestre das Infindáveis Formas", { descKey: "the-great-old-one.mestre-das-infindaveis-formas", prerequisites: { classLevel: 15 } }),
      o("minions-of-chaos", "Lacaios do Caos", { descKey: "the-great-old-one.lacaios-do-caos", prerequisites: { classLevel: 9 } }),
      o("mire-the-mind", "Encharcar a Mente", { descKey: "the-great-old-one.encharcar-a-mente", prerequisites: { classLevel: 5 } }),
      o("misty-visions", "Visões nas Brumas", { descKey: "the-great-old-one.visoes-nas-brumas" }),
      o("one-with-shadows", "Uno com as Sombras", { descKey: "the-great-old-one.uno-com-as-sombras", prerequisites: { classLevel: 5 } }),
      o("otherworldly-leap", "Salto Transcendental", { descKey: "the-great-old-one.salto-transcendental", prerequisites: { classLevel: 9 } }),
      o("repelling-blast", "Explosão Repulsiva", { descKey: "the-great-old-one.explosao-repulsiva", prerequisites: { cantrip: "rajada-mistica" } }),
      o("sculptor-of-flesh", "Escultor de Carne", { descKey: "the-great-old-one.escultor-de-carne", prerequisites: { classLevel: 7 } }),
      o("sign-of-ill-omen", "Sinal de Mau Agouro", { descKey: "the-great-old-one.sinal-de-mau-agouro", prerequisites: { classLevel: 5 } }),
      o("thief-of-five-fates", "Larápio dos Cinco Destinos", { descKey: "the-great-old-one.larapio-dos-cinco-destinos" }),
      o("thirsting-blade", "Lâmina Sedenta", { descKey: "the-great-old-one.lamina-sedenta", prerequisites: { classLevel: 5, pact: "blade" } }),
      o("visions-of-distant-realms", "Visões de Reinos Distantes", { descKey: "the-great-old-one.visoes-de-reinos-distantes", prerequisites: { classLevel: 15 } }),
      o("voice-of-the-chain-master", "Voz do Mestre das Correntes", { descKey: "the-great-old-one.voz-do-mestre-das-correntes", prerequisites: { pact: "chain" } }),
      o("whispers-of-the-grave", "Sussurros da Sepultura", { descKey: "the-great-old-one.sussurros-da-sepultura", prerequisites: { classLevel: 9 } }),
      o("witch-sight", "Visão da Bruxa", { descKey: "the-great-old-one.visao-da-bruxa", prerequisites: { classLevel: 15 } }),
    ],
  },
  {
    id: "maneuver", ownerId: "battle-master", label: "Manobras",
    options: [
      o("commanders-strike", "Golpe do Comandante"), o("disarming-attack", "Ataque Desarmante"), o("distracting-strike", "Golpe Distrativo"),
      o("evasive-footwork", "Passo Evasivo"), o("feinting-attack", "Ataque de Finta"), o("goading-attack", "Ataque Provocante"),
      o("lunging-attack", "Ataque Estendido"), o("maneuvering-attack", "Ataque de Manobra"), o("menacing-attack", "Ataque Ameaçador"),
      o("parry", "Aparar"), o("precision-attack", "Ataque de Precisão"), o("pushing-attack", "Ataque de Encontrão"),
      o("rally", "Inspirar"), o("riposte", "Contra-Atacar"), o("sweeping-attack", "Ataque Trespassante"), o("trip-attack", "Derrubar"),
    ],
  },
  {
    id: "hunters-prey", ownerId: "hunter-conclave", label: "Presa do Caçador",
    options: [o("colossus-slayer", "Assassino de Colossos"), o("giant-killer", "Matador de Gigantes"), o("horde-breaker", "Destruidor de Hordas")],
  },
  {
    id: "defensive-tactics", ownerId: "hunter-conclave", label: "Táticas Defensivas",
    options: [o("escape-the-horde", "Escapar da Horda"), o("multiattack-defense", "Defesa Contra Múltiplos Ataques"), o("steel-will", "Vontade de Aço")],
  },
  {
    id: "multiattack", ownerId: "hunter-conclave", label: "Ataque Múltiplo",
    options: [o("volley", "Saraivada"), o("whirlwind-attack", "Ataque Giratório")],
  },
  {
    id: "superior-hunters-defense", ownerId: "hunter-conclave", label: "Defesa de Caçador Superior",
    options: [o("evasion", "Evasão"), o("stand-against-the-tide", "Manter-se Contra a Maré"), o("uncanny-dodge", "Esquiva Sobrenatural")],
  },
  {
    id: "totem", ownerId: "path-of-the-totem-warrior", label: "Totem",
    options: [o("bear", "Urso"), o("eagle", "Águia"), o("wolf", "Lobo")],
  },
  {
    id: "favored-enemy", ownerId: "ranger", label: "Inimigo Favorito",
    options: [o("beasts", "Bestas"), o("fey", "Fadas"), o("humanoids", "Humanoides"), o("monstrosities", "Monstruosidades"), o("undead", "Mortos-vivos")],
  },
  {
    id: "greater-favored-enemy", ownerId: "ranger", label: "Inimigo Favorito Maior",
    options: [o("aberrations", "Aberrações"), o("celestials", "Celestiais"), o("constructs", "Constructos"), o("fiends", "Corruptores"), o("dragons", "Dragões"), o("elementals", "Elementais"), o("giants", "Gigantes")],
  },
  {
    id: "dragon-ancestry", ownerId: "draconic-bloodline", label: "Ancestral Dracônico",
    options: [
      o("blue", "Azul (elétrico)"), o("white", "Branco (frio)"), o("bronze", "Bronze (elétrico)"), o("copper", "Cobre (ácido)"), o("brass", "Latão (fogo)"),
      o("black", "Negro (ácido)"), o("gold", "Ouro (fogo)"), o("silver", "Prata (frio)"), o("green", "Verde (veneno)"), o("red", "Vermelho (fogo)"),
    ],
  },
  {
    id: "elemental-discipline", ownerId: "monk", label: "Disciplinas Elementais",
    options: [
      o("water-whip", "Chicote de Água"), o("rush-of-the-gale-spirits", "Investida dos Espíritos da Ventania"), o("shape-the-flowing-river", "Moldar o Rio Corrente"),
      o("fangs-of-the-fire-snake", "Presas da Serpente de Fogo"), o("fist-of-unbroken-air", "Punho do Ar Contínuo"), o("fist-of-four-thunders", "Punho dos Quatro Trovões"),
      o("gong-of-the-summit", "Gongo do Pico", { prerequisites: { classLevel: 6 } }), o("clench-of-the-north-wind", "Serragem do Vento do Norte", { prerequisites: { classLevel: 6 } }),
      o("ride-the-wind", "Cavalgar o Vento", { prerequisites: { classLevel: 11 } }), o("flames-of-the-phoenix", "Chamas da Fênix", { prerequisites: { classLevel: 11 } }),
      o("mist-stance", "Postura da Neblina", { prerequisites: { classLevel: 11 } }), o("eternal-mountain-defense", "Defesa Eterna da Montanha", { prerequisites: { classLevel: 17 } }),
      o("wave-of-rolling-earth", "Onda de Pedras Rolantes", { prerequisites: { classLevel: 17 } }), o("river-of-hungry-flame", "Rio de Chamas Famintas", { prerequisites: { classLevel: 17 } }),
      o("breath-of-winter", "Sopro do Inverno", { prerequisites: { classLevel: 17 } }),
    ],
  },
  {
    id: "beast-companion", ownerId: "beast-conclave", label: "Companheiro Animal",
    options: [
      o("giant-weasel", "Arminho Gigante"), o("boar", "Javali"), o("ape", "Gorila"), o("wolf", "Lobo"),
      o("mule", "Mula"), o("panther", "Pantera"), o("giant-badger", "Texugo Gigante"), o("black-bear", "Urso Negro"),
    ],
  },
  {
    id: "druid-terrain", ownerId: "circle-of-the-land", label: "Terreno do Círculo",
    options: [
      o("arctic", "Ártico"), o("coast", "Costa"), o("desert", "Deserto"), o("forest", "Floresta"),
      o("mountain", "Montanha"), o("swamp", "Pântano"), o("grassland", "Planície"), o("underdark", "Subterrâneo"),
    ],
  },
];

/** Estilos de luta que cada classe pode escolher (Livro do Jogador). */
export const FIGHTING_STYLES_BY_CLASS: Readonly<Record<string, readonly string[]>> = {
  fighter: ["archery", "defense", "dueling", "great-weapon-fighting", "protection", "two-weapon-fighting"],
  paladin: ["defense", "dueling", "great-weapon-fighting", "protection"],
  ranger: ["archery", "defense", "dueling", "two-weapon-fighting"],
};

export function optionFeatureId(groupId: OptionGroupId, optionId: string): string {
  return `${groupId}.${optionId}`;
}

export function optionIdsOf(groupId: OptionGroupId): readonly string[] {
  return OPTION_GROUPS.find((group) => group.id === groupId)?.options.map((option) => optionFeatureId(groupId, option.id)) ?? [];
}
