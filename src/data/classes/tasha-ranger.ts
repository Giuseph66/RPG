import { asEntityId, asRulesetId, type DefinitionRef } from "@domain/contracts/ids";
import { asCentimeters, asCopperPieces, type ChoiceDefinition, type SourceRef } from "@domain/contracts/primitives";
import type { ClassDefinition, SubclassDefinition } from "@domain/contracts/definitions/class";
import type { FeatureDefinition } from "@domain/contracts/definitions/feature";
import type { OptionalRuleContentPack, OptionalClassFeatureReplacement, OptionalClassOption } from "@domain/contracts/definitions/rulepack";
import type { ResourceDefinition } from "@domain/contracts/definitions/resource";
import type { SpellDefinition } from "@domain/contracts/definitions/spell";
import { tashaPrimalCompanions, tashaSummonedCreatures } from "@data/creatures/supplement-creatures";
import { PHB_PTBR_LOCAL_2017_ID } from "@data/rulepacks/manifest";

const sourceId = asRulesetId("tasha-cauldron-of-everything");
const ptbr = PHB_PTBR_LOCAL_2017_ID;
const source = (page: number, section: string): SourceRef => ({
  sourceId, chapter: "Capítulo 1 — Opções de Personagens", printedPage: page, pdfPage: page, section,
});
const ref = (value: string): DefinitionRef => ({ rulesetId: ptbr, entityId: asEntityId(value) });
const feature = (
  id: string,
  name: string,
  page: number,
  section: string,
  description: string,
  activation: FeatureDefinition["activation"] = { kind: "passive" },
  effects: FeatureDefinition["effects"] = [{ kind: "narrative", description }],
  eligibility: FeatureDefinition["eligibility"] = [],
  choices: readonly ChoiceDefinition[] = [],
): FeatureDefinition => ({
  id: asEntityId(id), name, tags: ["tasha", "ranger-option"], sourceRefs: [source(page, section)], activation,
  eligibility, effects,
  resourceCosts: effects.flatMap((effect) => effect.kind === "grants-resource" ? [{ resourceRef: effect.resourceRef, amount: 1 }] : []),
  choices, automationStatus: "assisted", pendingDecisionIds: [],
});
const minRanger = (level: number) => [{ kind: "min-class-level" as const, classRef: ref("ranger"), level }];
const skillChoice = (id: string, level: number, page: number): ChoiceDefinition => ({
  id, kind: "expertise", count: { min: 1, max: 1 }, optionSet: { kind: "selector", selector: { kind: "any-skill" } },
  prerequisites: minRanger(level), unique: true, sourceRefs: [source(page, "Hábil")],
});
const languageChoice = (id: string, count: number, page: number): ChoiceDefinition => ({
  id, kind: "language", count: { min: count, max: count }, optionSet: { kind: "selector", selector: { kind: "any-language" } },
  prerequisites: minRanger(1), unique: true, sourceRefs: [source(page, "Hábil")],
});
const explicitSkillChoice = (id: string, skillIds: readonly string[], page: number): ChoiceDefinition => ({
  id, kind: "skill-proficiency", count: { min: 1, max: 1 },
  optionSet: { kind: "explicit", options: skillIds.map(ref) },
  prerequisites: minRanger(3), unique: true, sourceRefs: [source(page, "Glamour Sobrenatural")],
});
const druidCantripChoice: ChoiceDefinition = {
  id: "ranger.cantrips.2", kind: "cantrip", count: { min: 2, max: 2 },
  optionSet: { kind: "explicit", options: [
    "bordao-mistico", "chicote-de-espinhos", "consertar", "criar-chamas", "druidismo", "orientacao", "rajada-de-veneno", "resistencia",
  ].map(ref) },
  prerequisites: minRanger(2), unique: true, sourceRefs: [source(52, "Estilos de Luta: Guerreiro Druídico")],
};
export const TASHA_ADDITIONAL_RANGER_SPELL_IDS = [
  "destruicao-lancinante", "constricao",
  "aprimorar-habilidade", "arma-magica", "ajuda", "lufada-de-vento", "invocar-fera",
  "arma-elemental", "invocar-feerico", "mesclar-se-as-rochas", "revivify",
  "dominar-besta", "invocar-elemental", "restauracao-maior",
] as const;
const tashaSpells: readonly SpellDefinition[] = [
  {
    id: asEntityId("invocar-fera"), name: "Invocar Fera", tags: ["tasha", "conjuration", "summon"], sourceRefs: [source(111, "Invocar Fera")],
    level: 2, school: "conjuration", castingTime: { kind: "action" }, range: { kind: "distance", distanceCm: asCentimeters(1800), origin: "caster" },
    components: { verbal: true, somatic: false }, duration: { kind: "hours", amount: 1, unit: "hour", endTriggers: [{ kind: "table-decision", description: "A fonte local imprime duração de 1 hora sem indicar concentração." }] }, concentration: false, ritual: false,
    classes: [asEntityId("druid")], targetType: { type: "creature", count: 1, restrictions: ["convoca espírito feral em espaço desocupado visível; escolha ambiente Ar, Terra ou Água"], visibilityRequired: true },
    attackType: "none", damage: [], healing: [], higherLevels: { kind: "custom", description: "A partir do 3º círculo, use o círculo mais alto para os valores indicados no bloco do espírito." },
    effects: [{ kind: "summon", description: "Invoca um Espírito Feral aliado. Escolha ambiente Ar, Terra ou Água e o bloco correspondente (tasha-summoned-beast-air, tasha-summoned-beast-land ou tasha-summoned-beast-water). Os blocos mostram valores do círculo mínimo; aplique as fórmulas da fonte ao círculo do espaço (mínimo 2). A criatura age após você, obedece comandos verbais e usa Esquiva sem comando." }], automationStatus: "assisted", pendingDecisionIds: [],
  },
  {
    id: asEntityId("invocar-feerico"), name: "Invocar Feérico", tags: ["tasha", "conjuration", "summon"], sourceRefs: [source(111, "Invocar Feérico")],
    level: 3, school: "conjuration", castingTime: { kind: "action" }, range: { kind: "distance", distanceCm: asCentimeters(2700), origin: "caster" },
    components: { verbal: true, somatic: true, material: { descriptionSummary: "flor de ouro no valor de 300 po", costCp: asCopperPieces(30000), consumed: false } },
    duration: { kind: "hours", amount: 1, unit: "hour", endTriggers: [{ kind: "concentration-ends" }] }, concentration: true, ritual: false,
    classes: [asEntityId("druid")], targetType: { type: "creature", count: 1, restrictions: ["convoca espírito feérico em espaço desocupado visível; escolha humor"], visibilityRequired: true },
    attackType: "none", damage: [], healing: [], higherLevels: { kind: "custom", description: "A partir do 4º círculo, use o círculo mais alto para os valores indicados no bloco do feérico." },
    effects: [{ kind: "summon", description: "Invoca um Espírito Feérico Pequeno aliado. Escolha humor Irritadiço, Jubiloso ou Brincalhão e o bloco correspondente (tasha-summoned-fey-irritable, tasha-summoned-fey-joyful ou tasha-summoned-fey-playful). Os blocos mostram valores do círculo mínimo; aplique as fórmulas da fonte ao círculo do espaço (mínimo 3)." }], automationStatus: "assisted", pendingDecisionIds: [],
  },
  {
    id: asEntityId("invocar-elemental"), name: "Invocar Elemental", tags: ["tasha", "conjuration", "summon"], sourceRefs: [source(110, "Invocar Elemental")],
    level: 4, school: "conjuration", castingTime: { kind: "action" }, range: { kind: "distance", distanceCm: asCentimeters(2700), origin: "caster" },
    components: { verbal: true, somatic: true, material: { descriptionSummary: "ar, cascalho, cinzas e água dentro de frasco banhado a ouro no valor de 400 po", costCp: asCopperPieces(40000), consumed: false } },
    duration: { kind: "hours", amount: 1, unit: "hour", endTriggers: [{ kind: "concentration-ends" }] }, concentration: true, ritual: false,
    classes: [asEntityId("druid")], targetType: { type: "creature", count: 1, restrictions: ["convoca espírito elemental em espaço desocupado visível; escolha elemento Ar, Água, Terra ou Fogo"], visibilityRequired: true },
    attackType: "none", damage: [], healing: [], higherLevels: { kind: "custom", description: "A partir do 5º círculo, use o círculo mais alto para os valores indicados no bloco do elemental." },
    effects: [{ kind: "summon", description: "Invoca um Espírito Elemental Médio aliado. Escolha Ar, Água, Terra ou Fogo e o bloco correspondente (tasha-summoned-elemental-air, tasha-summoned-elemental-water, tasha-summoned-elemental-earth ou tasha-summoned-elemental-fire). Os blocos mostram valores do círculo mínimo; aplique as fórmulas da fonte ao círculo do espaço (mínimo 4)." }], automationStatus: "assisted", pendingDecisionIds: [],
  },
];

const primalAwarenessSpellGrants = [
  [3, "falar-com-animais"], [5, "sentido-bestial"], [9, "falar-com-plantas"],
  [13, "localizar-criatura"], [17, "comunhao-com-a-natureza"],
] as const;
const primalAwarenessFeatures: readonly FeatureDefinition[] = primalAwarenessSpellGrants.map(([level, spellId]) => {
  const featureId = level === 3 ? "ranger.primal-awareness" : `ranger.primal-awareness-level-${level}`;
  const resourceId = `ranger.primal-awareness-level-${level}-use`;
  const spellName = spellId.replaceAll("-", " ");
  return {
    ...feature(featureId, `Consciência Primordial (${spellName})`, 52, "Consciência Primordial", `A partir do ${level}º nível de Guardião, aprende ${spellName}; não conta entre as magias conhecidas. Pode conjurá-la uma vez sem espaço por descanso longo e também usando espaços de magia.`, { kind: "passive" }, [
      { kind: "grants-spell", spellRef: ref(spellId), alwaysPrepared: false, resourceRef: ref(resourceId) },
      { kind: "grants-resource", resourceRef: ref(resourceId) },
    ], minRanger(level)),
    spellcastingSource: { ability: "wis", spellListClassId: asEntityId("ranger"), usesSpellSlots: true },
  };
});

const rangerFeatures: readonly FeatureDefinition[] = [
  feature("ranger.canny", "Hábil", 51, "Hábil", "Escolha uma perícia em que seja proficiente: seu bônus de proficiência é dobrado nela. Aprende dois idiomas à sua escolha.", { kind: "passive" }, [{ kind: "narrative", description: "Expertise em uma perícia proficiente e dois idiomas à escolha." }], minRanger(1), [skillChoice("ranger.canny.skill", 1, 51), languageChoice("ranger.canny.languages", 2, 51)]),
  feature("ranger.roving", "Peregrino", 51, "Peregrino", "A partir do 6º nível, seu deslocamento de caminhada aumenta em 1,5 m; você recebe deslocamento de escalada e natação igual ao deslocamento total.", { kind: "passive" }, [
    { kind: "modifier", modifier: { id: "ranger.roving.walk", sourceRef: source(51, "Peregrino"), target: { kind: "speed", speedKind: "walk" }, operator: "add", value: { kind: "number", amount: 150 }, predicate: { kind: "always" } } },
    { kind: "modifier", modifier: { id: "ranger.roving.climb", sourceRef: source(51, "Peregrino"), target: { kind: "speed-copy", speedKind: "climb", from: "walk" }, operator: "annotate", value: { kind: "flag" }, predicate: { kind: "always" } } },
    { kind: "modifier", modifier: { id: "ranger.roving.swim", sourceRef: source(51, "Peregrino"), target: { kind: "speed-copy", speedKind: "swim", from: "walk" }, operator: "annotate", value: { kind: "flag" }, predicate: { kind: "always" } } },
  ], minRanger(6)),
  feature("ranger.tireless", "Incansável", 51, "Hábil", "A partir do 10º nível, ação para ganhar 1d8 + modificador de Sabedoria (mínimo 1) PV temporários; usos iguais ao bônus de proficiência por descanso longo. Ao terminar descanso curto, reduz exaustão em 1.", { kind: "action" }, [{ kind: "grants-resource", resourceRef: ref("ranger.tireless-use") }, { kind: "narrative", description: "Ação: PV temporários 1d8 + modificador de Sabedoria, mínimo 1; descanso curto reduz exaustão em 1." }], minRanger(10)),
  feature("ranger.favored-foe", "Inimigo Eleito", 51, "Inimigo Eleito", "Quando acerta uma criatura com jogada de ataque, pode marcá-la por 1 minuto ou até perder concentração. A primeira vez em cada um dos seus turnos que acerta e causa dano ao inimigo marcado, inclusive no turno em que o marca, causa 1d4 adicional; aumenta para d6 no 6º nível e d8 no 14º. Usos iguais ao bônus de proficiência por descanso longo. Interage com Matador de Inimigos.", { kind: "free" }, [{ kind: "grants-resource", resourceRef: ref("ranger.favored-foe-use") }, { kind: "narrative", description: "Marca após acertar, concentração até 1 minuto; a primeira vez, em cada um dos seus turnos, que acerta e causa dano ao inimigo marcado, causa dano adicional, escalando para d6 no nível 6 e d8 no nível 14." }], minRanger(1)),
  ...primalAwarenessFeatures,
  feature("ranger.natures-veil", "Véu Natural", 52, "Véu Natural", "A partir do 10º nível, como ação bônus, fica magicamente invisível junto com o equipamento até o começo do próximo turno. Usos iguais ao bônus de proficiência; recupera-os em descanso longo.", { kind: "bonus-action" }, [
    { kind: "grants-resource", resourceRef: ref("ranger.natures-veil-use") },
    { kind: "narrative", description: "Ação bônus: fica magicamente invisível junto com o equipamento até o começo do próximo turno; usos iguais ao bônus de proficiência por descanso longo." },
  ], minRanger(10)),
  feature("ranger.martial-versatility", "Versatilidade Marcial", 52, "Versatilidade Marcial", "Ao alcançar um nível que concede Incremento no Valor de Habilidade, pode substituir um estilo de luta conhecido por outro da lista disponível para Guardiões.", { kind: "passive" }, [{ kind: "narrative", description: "Ao receber Incremento no Valor de Habilidade, pode trocar seu estilo de luta." }], minRanger(4)),
  feature("ranger.blind-fighting", "Luta às Cegas", 52, "Estilos de Luta", "Percepção às cegas a 3 m. Dentro desse alcance, percebe qualquer coisa que não esteja sob cobertura total, mesmo cego ou na escuridão, e criaturas invisíveis, exceto se a criatura se esconder de você com sucesso.", { kind: "passive" }),
  {
    ...feature("ranger.druidic-warrior", "Guerreiro Druídico", 52, "Estilos de Luta", "Aprende dois truques da lista de Druida; eles contam como magias de Guardião e usam Sabedoria. Pode trocar um ao ganhar nível de Guardião.", { kind: "passive" }, [{ kind: "narrative", description: "Os dois truques da lista de Druida contam como magias de Guardião e usam Sabedoria; a escolha só existe após selecionar Guerreiro Druídico." }], [], [druidCantripChoice]),
    spellcastingSource: { ability: "wis", spellListClassId: asEntityId("druid") },
  },
  feature("ranger.thrown-weapon-fighting", "Luta com Armas Arremessadas", 52, "Estilos de Luta", "Pode sacar arma com propriedade arremesso como parte do ataque; ataques à distância com arma arremessada causam +2 de dano."),
  feature("ranger.druidic-focus", "Foco de Conjuração", 52, "Foco de Conjuração", "Pode utilizar um foco druídico como foco de conjuração para suas magias de Guardião.", { kind: "passive" }, [{ kind: "narrative", description: "Aceita foco druídico para conjurar magias de Guardião." }], minRanger(2)),
  feature("ranger.primal-companion", "Companheiro Primitivo", 55, "Companheiro Primitivo", "Substitui Fera Companheira do Senhor das Feras. Invoca uma Fera da Terra, do Mar ou do Céu que usa PB e nível de Guardião conforme o bloco local. Pode retornar de morte recente ao gastar espaço de magia; pode trocar a forma após descanso longo.", { kind: "passive" }, [{ kind: "narrative", description: "Use um dos três blocos locais do companheiro primitivo; ND não se aplica e não é elegível para Forma Selvagem." }], minRanger(3)),
];

const subclassFeatures: readonly FeatureDefinition[] = [
  feature("fey-wanderer.dreadful-strikes", "Golpes Aterrorizantes", 53, "Andarilho Feérico", "Quando acerta uma criatura com uma arma, pode causar 1d4 de dano psíquico adicional a ela; cada alvo só pode sofrer esse dano adicional uma vez por turno. Aumenta para 1d6 no nível 11."),
  feature("fey-wanderer.otherworldly-glamour", "Glamour Sobrenatural", 53, "Andarilho Feérico", "Recebe bônus igual ao modificador de Sabedoria (mínimo +1) em testes de Carisma e proficiência em Atuação, Enganação ou Persuasão à escolha.", { kind: "passive" }, [
    { kind: "ability-check-bonus", ability: "cha", modifierAbility: "wis", minimum: 1 },
    { kind: "narrative", description: "Bônus de Sabedoria, mínimo +1, em testes de Carisma." },
  ], minRanger(3), [explicitSkillChoice("fey-wanderer.otherworldly-glamour.skill", ["performance", "deception", "persuasion"], 53)]),
  feature("fey-wanderer-beguiling-twists", "Distorcer Engodo", 53, "Andarilho Feérico", "Tem vantagem em salvaguardas contra amedrontamento e enfeitiçamento. Quando você ou criatura visível a até 36 m obtém sucesso em uma dessas salvaguardas, pode usar reação para outra criatura visível a até 36 m fazer salvaguarda de Sabedoria contra sua CD de magia; em falha, escolha amedrontada ou enfeitiçada por 1 minuto, com nova salvaguarda ao fim de cada turno.", { kind: "reaction", trigger: "quando você ou criatura visível a até 36 m tem sucesso contra amedrontamento ou enfeitiçamento" }),
  {
    ...feature("fey-wanderer-fey-reinforcements", "Reforço Feérico", 54, "Andarilho Feérico", "Aprende Invocar Feérico sem contar no limite de magias conhecidas e pode conjurá-la sem componente material. Uma vez por descanso longo pode fazê-lo sem espaço. Ao começar a conjurá-la, pode dispensar concentração; se fizer isso, sua duração passa a 1 minuto.", { kind: "passive" }, [
    { kind: "grants-spell", spellRef: ref("invocar-feerico"), alwaysPrepared: false, resourceRef: ref("fey-wanderer.fey-reinforcements-use"), ignoreMaterialComponents: true, concentrationAlternativeMinutes: 1 },
    { kind: "grants-resource", resourceRef: ref("fey-wanderer.fey-reinforcements-use") },
    ], minRanger(11)),
    spellcastingSource: { ability: "wis", spellListClassId: asEntityId("ranger"), usesSpellSlots: true },
  },
  {
    ...feature("fey-wanderer-misty-wanderer", "Andarilho da Névoa", 54, "Andarilho Feérico", "A partir do nível 15, conjura Passo Nebuloso sem espaço um número de vezes igual ao modificador de Sabedoria (mínimo 1) por descanso longo; pode levar criatura visível voluntária adjacente para espaço desocupado a até 1,5 m do destino.", { kind: "free" }, [
    { kind: "grants-spell", spellRef: ref("passo-nebuloso"), alwaysPrepared: false, resourceRef: ref("fey-wanderer.misty-wanderer-use") },
    { kind: "grants-resource", resourceRef: ref("fey-wanderer.misty-wanderer-use") },
    ], minRanger(15)),
    spellcastingSource: { ability: "wis", spellListClassId: asEntityId("ranger"), usesSpellSlots: true },
  },
  feature("swarmkeeper-gathered-swarm", "Enxame Reunido", 54, "Portador do Enxame", "Uma vez por turno, imediatamente após acertar uma criatura: causa 1d6 perfurante; ou move o alvo horizontalmente até 4,5 m após falha em salvaguarda de Força contra sua CD de magia; ou move-se horizontalmente 1,5 m sem provocar ataques de oportunidade."),
  feature("swarmkeeper-writhing-tide", "Maré Ondulante", 54, "Portador do Enxame", "A partir do 7º nível, ação bônus para ganhar voo de 3 m e pairar por até 1 minuto ou até ficar incapacitado; usos iguais ao bônus de proficiência por descanso longo.", { kind: "bonus-action" }, [{ kind: "grants-resource", resourceRef: ref("swarmkeeper.writhing-tide-use") }], minRanger(7)),
  feature("swarmkeeper-mighty-swarm", "Enxame Poderoso", 55, "Portador do Enxame", "No nível 11, Enxame Reunido causa 1d8; se o alvo falhar na salvaguarda contra movimento, pode também derrubá-lo; quando você se move pelo enxame, ganha meia cobertura até o começo do próximo turno."),
  feature("swarmkeeper-swarming-dispersal", "Dispersão do Enxame", 55, "Portador do Enxame", "A partir do 15º nível, quando sofre dano pode usar reação para ganhar resistência a esse dano, desaparecer no enxame e se teleportar a espaço desocupado visível a até 9 m; usos iguais ao bônus de proficiência por descanso longo.", { kind: "reaction", trigger: "quando recebe dano" }, [{ kind: "grants-resource", resourceRef: ref("swarmkeeper.swarming-dispersal-use") }], minRanger(15)),
];

const subclass = (id: string, name: string, page: number, grants: readonly [number, string][], spells: readonly [number, string][]): SubclassDefinition => ({
  id: asEntityId(id), name, tags: ["tasha", "ranger-subclass"], sourceRefs: [source(page, name)], classId: asEntityId("ranger"), selectionLevel: 3,
  featureGrants: grants.map(([level, featureId]) => ({ level, featureRef: ref(featureId) })),
  spellGrants: spells.map(([level, spellId]) => ({ level, spellRef: ref(spellId), alwaysPrepared: false, knownWithoutCount: true })), resourceChanges: [], choices: [],
});
const subclasses: readonly SubclassDefinition[] = [
  subclass("fey-wanderer", "Andarilho Feérico", 53, [[3, "fey-wanderer.dreadful-strikes"], [3, "fey-wanderer.otherworldly-glamour"], [7, "fey-wanderer-beguiling-twists"], [11, "fey-wanderer-fey-reinforcements"], [15, "fey-wanderer-misty-wanderer"]], [[3, "enfeiticar-pessoa"], [5, "passo-nebuloso"], [9, "dissipar-magia"], [13, "porta-dimensional"], [17, "despistar"]]),
  subclass("swarmkeeper", "Portador do Enxame", 54, [[3, "swarmkeeper-gathered-swarm"], [7, "swarmkeeper-writhing-tide"], [11, "swarmkeeper-mighty-swarm"], [15, "swarmkeeper-swarming-dispersal"]], [[3, "fogo-das-fadas"], [3, "maos-magicas"], [5, "teia"], [9, "forma-gasosa"], [13, "olho-arcano"], [17, "praga-de-insetos"]]),
];

const replacement = (id: string, replaces: readonly string[], featureIds: readonly string[], level: number, page: number, section: string, subclassId?: string): OptionalClassFeatureReplacement => ({
  id: asEntityId(id), classId: asEntityId("ranger"), replacesFeatureId: asEntityId(replaces[0]), replacesFeatureIds: replaces.map(asEntityId), replacementFeatureIds: featureIds.map(asEntityId), choiceLevel: level, sourceRefs: [source(page, section)], ...(subclassId ? { subclassId: asEntityId(subclassId) } : {}),
});
const option = (id: string, kind: OptionalClassOption["kind"], features: readonly string[], level: number, page: number, section: string, spells: readonly string[] = []): OptionalClassOption => ({
  id: asEntityId(id), classId: asEntityId("ranger"), kind, choiceLevel: level, featureRefs: features.map(asEntityId), ...(spells.length ? { spellRefs: spells.map(asEntityId) } : {}), sourceRefs: [source(page, section)],
});
const replacements: readonly OptionalClassFeatureReplacement[] = [
  replacement("ranger.optional-canny", ["ranger.natural-explorer"], ["ranger.canny", "ranger.roving", "ranger.tireless"], 1, 51, "Hábil"),
  replacement("ranger.optional-favored-foe", ["ranger.favored-enemy"], ["ranger.favored-foe"], 1, 51, "Inimigo Eleito"),
  replacement("ranger.optional-primal-awareness", ["ranger.primeval-awareness"], primalAwarenessFeatures.map((entry) => String(entry.id)), 3, 52, "Consciência Primordial"),
  replacement("ranger.optional-natures-veil", ["ranger.hide-in-plain-sight"], ["ranger.natures-veil"], 10, 52, "Véu Natural"),
  replacement("ranger.optional-primal-companion", ["beast-conclave-feature-level-3"], ["ranger.primal-companion"], 3, 55, "Companheiro Primitivo", "beast-conclave"),
];
const classOptions: readonly OptionalClassOption[] = [
  { ...option("ranger.optional-fighting-style", "choice", ["ranger.blind-fighting", "ranger.druidic-warrior", "ranger.thrown-weapon-fighting"], 2, 52, "Estilos de Luta"), choiceId: "ranger.fighting-style.2" },
  option("ranger.optional-druidic-focus", "extend", ["ranger.druidic-focus"], 2, 52, "Foco de Conjuração"),
  option("ranger.optional-martial-versatility", "extend", ["ranger.martial-versatility"], 4, 52, "Versatilidade Marcial"),
  option("ranger.optional-additional-spells", "extend", [], 2, 52, "Magias Adicionais de Guardião", TASHA_ADDITIONAL_RANGER_SPELL_IDS),
];
const resource = (id: string, name: string, owner: string, page: number, section: string, byProficiency = false): ResourceDefinition => ({
  id: asEntityId(id), name, tags: ["tasha", "ranger-resource"], sourceRefs: [source(page, section)], ownerRef: ref(owner), unit: "uses",
  capacityRule: byProficiency ? { kind: "proficiency-bonus" } : { kind: "fixed", amount: 1 },
  spendRules: [{ kind: "per-use", amount: 1 }], recoveryTriggers: [{ kind: "long-rest" }], recoveryAmountRule: { kind: "full" },
});
const resources: readonly ResourceDefinition[] = [
  resource("ranger.tireless-use", "Incansável", "ranger.tireless", 51, "Hábil", true),
  resource("ranger.favored-foe-use", "Inimigo Eleito", "ranger.favored-foe", 51, "Inimigo Eleito", true),
  resource("ranger.natures-veil-use", "Véu Natural", "ranger.natures-veil", 52, "Véu Natural", true),
  ...primalAwarenessSpellGrants.map(([level]) => {
    const featureId = level === 3 ? "ranger.primal-awareness" : `ranger.primal-awareness-level-${level}`;
    return resource(`ranger.primal-awareness-level-${level}-use`, `Consciência Primordial (${level}º)`, featureId, 52, "Consciência Primordial");
  }),
  resource("fey-wanderer.fey-reinforcements-use", "Reforço Feérico", "fey-wanderer-fey-reinforcements", 54, "Andarilho Feérico"),
  {
    id: asEntityId("fey-wanderer.misty-wanderer-use"), name: "Andarilho da Névoa", tags: ["tasha", "ranger-resource"], sourceRefs: [source(54, "Andarilho Feérico")], ownerRef: ref("fey-wanderer-misty-wanderer"), unit: "uses",
    capacityRule: { kind: "ability-modifier", ability: "wis", minimum: 1 }, spendRules: [{ kind: "per-use", amount: 1 }], recoveryTriggers: [{ kind: "long-rest" }], recoveryAmountRule: { kind: "full" },
  },
  resource("swarmkeeper.writhing-tide-use", "Maré Ondulante", "swarmkeeper-writhing-tide", 54, "Portador do Enxame", true),
  resource("swarmkeeper.swarming-dispersal-use", "Dispersão do Enxame", "swarmkeeper-swarming-dispersal", 55, "Portador do Enxame", true),
];

/** Conteúdo opcional e revisado do Guardião/Patrulheiro em Tasha; nunca substitui o PHB sem escolha explícita. */
export const TASHA_RANGER_OPTIONAL_PACK: OptionalRuleContentPack = {
  id: asEntityId("tasha-ranger-options"), name: "Opções de Guardião (Tasha)",
  sourceRefs: [source(51, "Opções de classe de Guardião"), source(52, "Magias e estilos de luta"), source(53, "Andarilho Feérico"), source(54, "Portador do Enxame"), source(55, "Companheiro Primitivo"), source(56, "Blocos de companheiro primitivo")],
  features: [...rangerFeatures, ...subclassFeatures], subclasses, classFeatureReplacements: replacements,
  classOptions, resources, creatures: [...tashaPrimalCompanions, ...tashaSummonedCreatures], spells: tashaSpells,
};

export const TASHA_RANGER_SOURCE_REFS = TASHA_RANGER_OPTIONAL_PACK.sourceRefs;
