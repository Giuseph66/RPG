import { asCentimeters, type SourceRef } from "@domain/contracts/primitives";
import { asEntityId, asRulesetId } from "@domain/contracts/ids";
import type { CreatureStatBlock } from "@domain/creatures";

const tashaId = asRulesetId("tasha-cauldron-of-everything");
const arielId = asRulesetId("ariel-docx");
const tashaRef = (page: number, section: string): SourceRef => ({
  sourceId: tashaId, chapter: "Capítulo 1 — Opções de Personagens", printedPage: page, pdfPage: page, section,
});
const tashaSpellRef = (page: number, section: string): SourceRef => ({
  sourceId: tashaId, chapter: "Capítulo 3 — Magias", printedPage: page, pdfPage: page, section,
});
const arielRef = (section: string): SourceRef => ({ sourceId: arielId, chapter: "Bloco de estatísticas: Ariel, a Inquisidora (DOCX)", section });
const scores = { str: 14, dex: 14, con: 15, int: 8, wis: 14, cha: 11 } as const;
const companionTraits = (label: string, page: number, extra?: { readonly name: string; readonly description: string }) => [
  { id: `${label}-primitive-bond`, name: "Laço primitivo", description: "Adiciona o bônus de proficiência do Guardião a testes de habilidade e salvaguardas da fera." },
  ...(extra ? [{ id: `${label}-${extra.name.toLowerCase().replaceAll(" ", "-")}`, name: extra.name, description: extra.description }] : []),
];
const scaling = {
  proficiencyBonus: { perCharacterProficiencyBonus: 1 },
  armorClass: { base: 13, addProficiencyBonus: true },
  hitPoints: { base: 5, classId: asEntityId("ranger"), perClassLevel: 5, hitDie: 8 },
  attackAbility: "wis" as const,
  notes: "PB é o do Guardião; PV = 5 + 5 vezes nível de Guardião; quantidade de d8 de PV = nível de Guardião. Ataques usam o modificador de ataque mágico do Guardião; fórmulas dinâmicas não são avaliadas sem contexto.",
};
const companionBase = {
  size: "medium" as const, tags: ["tasha", "primal-companion"], alignment: "conforme escolha do mestre",
  armorClass: 13, armorClassNote: "13 + bônus de proficiência do Guardião (armadura natural)",
  hitPoints: { average: 5, hitDice: "1d8 por nível de Guardião" }, abilityScores: scores,
  senses: [{ kind: "darkvision", rangeCm: asCentimeters(1800) }, { kind: "passive-perception", description: "12" }],
  passivePerception: 12, languages: ["Compreende os idiomas que o Guardião fala"], challengeRating: null,
  scaling, sourceRefs: [tashaRef(55, "Companheiro Primitivo")],
};

/** Companheiros primitivos: ND impresso como travessão permanece null, nunca CR 0. */
export const tashaPrimalCompanions: readonly CreatureStatBlock[] = [
  {
    ...companionBase,
    id: asEntityId("tasha-primal-companion-land"), name: "Fera da Terra", creatureType: "beast",
    speeds: { walkCm: asCentimeters(1200), climbCm: asCentimeters(1200) },
    traits: companionTraits("primal-land", 55, { name: "Carga", description: "Após mover 6 m em linha reta e acertar Pancada no mesmo turno, causa +1d6 cortante; se for criatura, salvaguarda de Força contra CD de magia do Guardião ou fica caída." }),
    actions: [{
      id: "primal-land-pounce", name: "Pancada", description: "Ataque corpo a corpo com arma: modificador de ataque mágico do Guardião para acertar, alcance 1,5 m. Acerto: 1d8 + 2 + PB de dano cortante.",
      reachCm: asCentimeters(150), damage: [{ formula: { quantity: 1, faces: 8 }, flatBonus: 2, damageType: "slashing", note: "+ bônus de proficiência do Guardião" }],
    }],
    sourceRefs: [tashaRef(55, "Fera da Terra")],
  },
  {
    ...companionBase,
    id: asEntityId("tasha-primal-companion-sea"), name: "Fera do Mar", creatureType: "beast",
    speeds: { walkCm: asCentimeters(1200), swimCm: asCentimeters(1800) },
    traits: companionTraits("primal-sea", 56, { name: "Anfíbio", description: "Respira tanto ar quanto água." }),
    actions: [{
      id: "primal-sea-grappling-strike", name: "Golpe aprisionador", description: "Ataque corpo a corpo com arma: modificador de ataque mágico do Guardião para acertar, alcance 1,5 m. Acerto: 1d6 + 2 + PB de dano perfurante ou contundente à escolha; o alvo fica agarrado (CD para escapar igual à CD de magia do Guardião). Enquanto agarra, não pode usar este ataque contra outro alvo.",
      reachCm: asCentimeters(150), damage: [
        { formula: { quantity: 1, faces: 6 }, flatBonus: 2, damageType: "piercing", note: "+ PB; tipo de dano alternativo contundente à escolha, não cumulativo" },
      ],
    }],
    sourceRefs: [tashaRef(56, "Fera do Mar")],
  },
  {
    ...companionBase,
    id: asEntityId("tasha-primal-companion-sky"), name: "Fera do Céu", creatureType: "beast",
    speeds: { walkCm: asCentimeters(1200), flyCm: asCentimeters(1800) },
    traits: companionTraits("primal-sky", 56, { name: "Sobrevoo", description: "Não provoca ataques de oportunidade ao voar para fora do alcance de um inimigo." }),
    actions: [{
      id: "primal-sky-rend", name: "Rasgar", description: "Ataque corpo a corpo com arma: modificador de ataque mágico do Guardião para acertar, alcance 1,5 m. Acerto: 1d4 + 3 + PB de dano cortante.",
      reachCm: asCentimeters(150), damage: [{ formula: { quantity: 1, faces: 4 }, flatBonus: 3, damageType: "slashing", note: "+ bônus de proficiência do Guardião" }],
    }],
    sourceRefs: [tashaRef(56, "Fera do Céu")],
  },
];

const summonAbilityScores = { str: 18, dex: 15, con: 17, int: 4, wis: 10, cha: 16 } as const;
const summonedBeastScores = { str: 18, dex: 11, con: 16, int: 4, wis: 14, cha: 5 } as const;
const summonedCommon = {
  size: "small" as const, alignment: "aliado do conjurador", tags: ["tasha", "summoned-spirit", "base-circle-stat-block"],
  passivePerception: 10, languages: ["Compreende os idiomas que você fala"], challengeRating: null,
};
const beastSummonBase = (id: string, name: string, page: number, speedText: string, hp: number, traits: CreatureStatBlock["traits"] = []): CreatureStatBlock => ({
  ...summonedCommon, id: asEntityId(id), name, creatureType: "beast", armorClass: 13, armorClassNote: "11 + círculo do espaço (armadura natural); valor exibido no círculo 2",
  hitPoints: { average: hp }, speeds: { sourceText: speedText }, abilityScores: summonedBeastScores,
  senses: [{ kind: "darkvision", rangeCm: asCentimeters(1800) }], passivePerception: 12, traits,
  actions: [
    { id: `${id}-multiattack`, name: "Ataques Múltiplos", description: "No círculo 2, 1 ataque; nos demais, quantidade igual à metade do círculo do espaço, arredondada para baixo." },
    { id: `${id}-mandibles`, name: "Mandíbulas", description: "Ataque corpo a corpo com arma: modificador de ataque mágico do conjurador para acertar, alcance 1,5 m. No círculo 2, acerto: 1d8 + 6 perfurante; em outros círculos, some o círculo do espaço a 1d8 + 4.", reachCm: asCentimeters(150), damage: [{ formula: { quantity: 1, faces: 8 }, flatBonus: 6, damageType: "piercing", note: "círculo 2; aumentar o bônus pelo círculo usado" }] },
  ],
  additionalInfo: { notes: `Bloco-base de ${name} no círculo 2, não é uma ficha resolvida. Fórmulas do espaço e variantes permanecem assistidas. Texto de PV impresso em p.112: “40 + 10 para cada círculo de magia acima do 4º; 20 (apenas Ar) ou 30 (apenas Terra e Água) + 5 para cada círculo de magia acima do 2º”; a linha contém cláusulas conflitantes e requer arbitragem antes de aplicar PV escalados.` },
  sourceText: { hitPointsPrinted: "40 + 10 para cada círculo de magia acima do 4º; 20 (apenas Ar) ou 30 (apenas Terra e Água) + 5 para cada círculo de magia acima do 2º." },
  sourceRefs: [tashaSpellRef(page, "Invocar Fera — bloco Espírito Feral")],
});

const feySummonBase = (id: string, name: string, actionDescription: string, page: number): CreatureStatBlock => ({
  ...summonedCommon, id: asEntityId(id), name, creatureType: "fey", size: "small", armorClass: 15,
  armorClassNote: "12 + círculo do espaço (armadura natural); valor exibido no círculo 3",
  hitPoints: { average: 30 }, speeds: { walkCm: asCentimeters(1200) }, abilityScores: summonAbilityScores,
  actions: [
    { id: `${id}-multiattack`, name: "Ataques Múltiplos", description: "No círculo 3, 1 ataque; nos demais, quantidade igual à metade do círculo do espaço, arredondada para baixo." },
    { id: `${id}-short-sword`, name: "Espada Curta", description: "Ataque corpo a corpo com arma: modificador de ataque mágico do conjurador para acertar, alcance 1,5 m. No círculo 3, acerto: 1d6 + 9 de dano de energia; em outros círculos, some o círculo do espaço a 1d6 + 6.", reachCm: asCentimeters(150), damage: [{ formula: { quantity: 1, faces: 6 }, flatBonus: 9, damageType: "force", note: "círculo 3; aumentar o bônus pelo círculo usado" }] },
  ],
  bonusActions: [{ id: `${id}-fey-step`, name: "Passo Feérico", description: actionDescription }],
  additionalInfo: { notes: "Bloco-base no círculo 3, não é uma ficha resolvida. PV: 30 + 10 por círculo acima do 3º. CA e Ataques Múltiplos usam o círculo do espaço; Passo Feérico muda pelo humor escolhido. A aplicação permanece assistida." },
  sourceText: { hitPointsPrinted: "30 + 10 para cada círculo de magia acima do 3º." },
  sourceRefs: [tashaSpellRef(page, "Invocar Feérico — bloco Espírito Feérico")],
});

const elementalSummonBase = (id: string, name: string, page: number, form: "air" | "water" | "earth" | "fire"): CreatureStatBlock => {
  const isAir = form === "air";
  const isWater = form === "water";
  const isEarth = form === "earth";
  const isFire = form === "fire";
  const traits = [
    ...(form !== "earth" ? [{ id: `${id}-amorphous`, name: "Forma Amorfa", description: "Apenas Ar, Água e Fogo: move-se por espaço estreito de até 2,5 cm sem se espremer." }] : []),
  ];
  return {
    ...summonedCommon, id: asEntityId(id), name, creatureType: "elemental", size: "medium", armorClass: 15,
    armorClassNote: "11 + círculo do espaço (armadura natural); valor exibido no círculo 4",
    hitPoints: { average: 50 }, speeds: {
      walkCm: asCentimeters(1200),
      ...(isEarth ? { burrowCm: asCentimeters(1200) } : {}),
      ...(isAir ? { flyCm: asCentimeters(1200), hover: true } : {}),
      ...(isWater ? { swimCm: asCentimeters(1200) } : {}),
    }, abilityScores: summonAbilityScores,
    damageResistances: [...(isWater ? ["acid" as const] : []), ...(isAir ? ["lightning" as const, "thunder" as const] : []), ...(isEarth ? ["bludgeoning" as const, "piercing" as const] : [])],
    damageImmunities: ["poison", ...(isFire ? ["fire" as const] : [])],
    conditionImmunities: ["poisoned", "exhaustion", "unconscious", "paralyzed", "petrified"],
    senses: [{ kind: "darkvision", rangeCm: asCentimeters(1800) }],
    traits,
    actions: [
      { id: `${id}-multiattack`, name: "Ataques Múltiplos", description: "No círculo 4, 2 ataques; nos demais, quantidade igual à metade do círculo do espaço, arredondada para baixo." },
      { id: `${id}-slam`, name: "Pancada", description: `Ataque corpo a corpo com arma: modificador de ataque mágico do conjurador para acertar, alcance 1,5 m. No círculo 4, acerto: 1d10 + 8 de dano ${isFire ? "ígneo" : "contundente"}; em outros círculos, some o círculo do espaço a 1d10 + 4.`, reachCm: asCentimeters(150), damage: [{ formula: { quantity: 1, faces: 10 }, flatBonus: 8, damageType: isFire ? "fire" : "bludgeoning", note: "círculo 4; aumentar o bônus pelo círculo usado" }] },
    ],
    additionalInfo: { notes: "Bloco-base no círculo 4, não é uma ficha resolvida. PV: 50 + 10 por círculo acima do 4º. CA e Ataques Múltiplos usam o círculo do espaço; a forma selecionada determina deslocamento, resistência, imunidade e tipo de dano. Aplicação assistida." },
    sourceText: { hitPointsPrinted: "50 + 10 para cada círculo de magia acima do 4º." },
    sourceRefs: [tashaSpellRef(page, "Invocar Elemental — bloco Espírito Elemental")],
  };
};

/** Blocos-base das formas escolhidas nas três invocações; fórmulas por círculo ficam visíveis, sem automação implícita. */
export const tashaSummonedCreatures: readonly CreatureStatBlock[] = [
  beastSummonBase("tasha-summoned-beast-air", "Espírito Feral — Ar", 112, "9 m de caminhada; voo 18 m apenas Ar", 20, [{ id: "tasha-summoned-beast-air-flyby", name: "Sobrevoo", description: "Não provoca ataques de oportunidade ao voar para fora do alcance de um inimigo." }]),
  beastSummonBase("tasha-summoned-beast-land", "Espírito Feral — Terra", 112, "9 m de caminhada; escalada 9 m apenas Terra", 30, [{ id: "tasha-summoned-beast-land-pack-tactics", name: "Tática de Matilha", description: "Vantagem em ataques contra criatura quando aliado não incapacitado está a até 1,5 m dela." }]),
  beastSummonBase("tasha-summoned-beast-water", "Espírito Feral — Água", 112, "9 m de caminhada; natação 9 m apenas Água", 30, [
    { id: "tasha-summoned-beast-water-pack-tactics", name: "Tática de Matilha", description: "Vantagem em ataques contra criatura quando aliado não incapacitado está a até 1,5 m dela." },
    { id: "tasha-summoned-beast-water-breathing", name: "Respiração Aquática", description: "Só pode respirar debaixo d'água." },
  ]),
  feySummonBase("tasha-summoned-fey-irritable", "Espírito Feérico — Irritadiço", "Teleporta-se até 9 m; tem vantagem na próxima jogada de ataque antes do fim do turno.", 111),
  feySummonBase("tasha-summoned-fey-joyful", "Espírito Feérico — Jubiloso", "Teleporta-se até 9 m; uma criatura visível a até 3 m faz salvaguarda de Sabedoria contra sua CD de magia ou fica enfeitiçada por você.", 111),
  feySummonBase("tasha-summoned-fey-playful", "Espírito Feérico — Brincalhão", "Teleporta-se até 9 m; preenche um cubo de 1,5 m a até 1,5 m com escuridão mágica até o fim do próximo turno do feérico.", 111),
  elementalSummonBase("tasha-summoned-elemental-air", "Espírito Elemental — Ar", 110, "air"),
  elementalSummonBase("tasha-summoned-elemental-water", "Espírito Elemental — Água", 110, "water"),
  elementalSummonBase("tasha-summoned-elemental-earth", "Espírito Elemental — Terra", 110, "earth"),
  elementalSummonBase("tasha-summoned-elemental-fire", "Espírito Elemental — Fogo", 110, "fire"),
];

const arielSpells = [
  "truques: Estabilizar; Taumaturgia",
  "1º nível: Armadura de Agathys, Comando, Curar Ferimentos, Destruição Lancinante, Detectar Magia, Duelo Compelido",
  "2º nível: Arma Espiritual, Imobilizar Pessoa, Restauração Menor, Zona da Verdade",
  "3º nível: Destruição Cegante, Dissipar Magia, Medo, Remover Maldição, Rogar Maldição",
  "4º nível: Localizar Criatura, Proteção contra a Morte",
  "5º nível: Onda Destrutiva",
];

/** Exemplo mestre: reproduz integralmente os números fornecidos, inclusive suas inconsistências. */
export const arielInquisidora: CreatureStatBlock = {
  id: asEntityId("ariel-inquisidora"), name: "Ariel, a Inquisidora", creatureType: "celestial", size: "medium",
  tags: ["custom-example", "master-authored"], alignment: "leal e neutro", armorClass: 18, armorClassNote: "armadura de placas",
  hitPoints: { average: 157, hitDice: "20d10+53" },
  speeds: { walkCm: asCentimeters(900), flyCm: asCentimeters(4500), hover: true },
  abilityScores: { str: 18, dex: 14, con: 16, int: 12, wis: 12, cha: 16 },
  savingThrows: { wis: 7, cha: 9 },
  skills: { athletics: 10, intimidation: 9, perception: 7, religion: 7 },
  damageResistances: ["necrotic", "radiant"], conditionImmunities: ["amedrontado"],
  senses: [{ kind: "truesight", rangeCm: asCentimeters(1800) }, { kind: "darkvision", rangeCm: asCentimeters(3600) }],
  passivePerception: 17, languages: ["comum", "celestial"], challengeRating: { numerator: 12, denominator: 1 },
  experiencePoints: 8400, proficiencyBonus: 6,
  traits: [
    { id: "ariel-angelic-weapons", name: "Armas Angelicais", description: "Ataques armados são mágicos; ao acertar com qualquer arma, causa 4d8 de dano radiante adicional (já incluso no ataque)." },
    { id: "ariel-conquest-diadem", name: "Diadema da Conquista", description: "A sintonia não pode ser removida, separada ou transferida. Dissipar Magia não a encerra e Campo Antimagia não a suprime. Rompe instantaneamente se o portador se tornar caótico ou maligno, for controlado mentalmente ou morrer. Marcha Celestial, Resistência à Magia, voo e visão verdadeira vêm do diadema." },
    { id: "ariel-celestial-march", name: "Marcha Celestial", description: "Em viagem voando, se viajar só ou apenas com criaturas sintonizadas ao Diadema da Conquista, a distância de viagem é triplicada em qualquer ritmo. Não altera deslocamento de combate." },
    { id: "ariel-extermination-protocol", name: "Protocolo de Extermínio", description: "Se a sintonia romper fora de Monte Celestia, o diadema conjura imediatamente, em sequência: Farpa Mental de 9º nível contra cada criatura a até 18 m, uma vez por criatura; Bola de Fogo de 9º nível centrada no diadema; e Tempestade da Vingança de 9º nível por 24 h, sem concentração. Todas têm CD 18 e são conjuradas instantaneamente; os efeitos não distinguem aliados de inimigos e não protegem Ariel nem outras criaturas. Ao concluir, o diadema se desintegra." },
    { id: "ariel-magic-resistance", name: "Resistência à Magia", description: "Vantagem em testes de resistência contra magias e outros efeitos mágicos." },
  ],
  spellcasting: {
    description: `Conjuradora de 17º nível; Carisma; CD 17; +9 para atingir com ataques mágicos. Magias preparadas: ${arielSpells.join("; ")}`,
    ability: "cha", saveDc: 17, attackBonus: 9, innate: false,
    spells: arielSpells, slots: { "1": 4, "2": 3, "3": 3, "4": 3, "5": 1 },
  },
  actions: [
    { id: "ariel-multiattack", name: "Ataques Múltiplos", description: "Ariel realiza dois ataques corpo a corpo." },
    { id: "ariel-longsword-plus-three", name: "Espada Longa +3", description: "Ataque corpo a corpo com arma: +13 para atingir, alcance 1,5 m, um alvo. Acerto: 12 (1d10 + 7) cortante e 18 (4d8) radiante.", attackBonus: 13, reachCm: asCentimeters(150), damage: [
      { formula: { quantity: 1, faces: 10 }, flatBonus: 7, damageType: "slashing" },
      { formula: { quantity: 4, faces: 8 }, damageType: "radiant" },
    ] },
    { id: "ariel-healing-touch", name: "Toque Curativo", usage: "3/dia", description: "Toca outra criatura: recupera 20 (4d8 + 2) PV e a liberta de qualquer maldição, doença, veneno, cegueira ou surdez." },
    { id: "ariel-conquering-presence", name: "Presença Conquistadora", usage: "1/dia", description: "Criaturas escolhidas por Ariel a até 9 m fazem salvaguarda de Sabedoria CD 18; falha: amedrontada e deslocamento 0 por 1 minuto. Repetem a salvaguarda ao fim dos turnos." },
  ],
  sourceRefs: [arielRef("Bloco de estatísticas"), arielRef("Traços"), arielRef("Conjuração"), arielRef("Ações")],
  sourceText: { challengeRatingNote: "Valores do mestre preservados como recebidos: ND 12, PB +6, PV 157 e 20d10+53. Sem correção automática." },
};

export const creatureExamples: readonly CreatureStatBlock[] = [arielInquisidora];
