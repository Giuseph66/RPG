import { type SpellDefinition } from "@domain/contracts/definitions/spell";
import { asCentimeters, asCopperPieces } from "@domain/contracts/primitives";
import { isEntityId, type EntityId } from "@domain/contracts/ids";
import { RULESET_ID, spellId, spellSource } from "./common";
import { EXTRACTED_PHB_SPELLS, type ExtractedBookSpell } from "./spells-book-catalog";

const classes = (...ids: string[]): readonly EntityId[] => ids.map(spellId);
const instant = { kind: "instantaneous" as const, endTriggers: [] as const };

const BARD_INITIAL_CATALOG_IDS = [
  "ilusao-menor", "maos-magicas", "prestidigitacao", "zombaria-viciosa",
  "disfarcar-se", "enfeiticar-pessoa", "fogo-das-fadas", "heroismo", "onda-trovejante", "sussurros-dissonantes",
] as const;

const schoolByPtBr: Readonly<Record<string, SpellDefinition["school"]>> = {
  abjuração: "abjuration", conjuração: "conjuration", adivinhação: "divination", encantamento: "enchantment",
  evocação: "evocation", ilusão: "illusion", necromancia: "necromancy", transmutação: "transmutation",
};

function extractedCastingTime(value: ExtractedBookSpell["castingTime"]): SpellDefinition["castingTime"] {
  if (value.includes("ação bônus")) return { kind: "bonus-action" };
  if (value.includes("reação")) return { kind: "reaction" };
  if (value.includes("minuto")) return { kind: "minutes", amount: 1, unit: "minute" };
  if (value.includes("hora")) return { kind: "hours", amount: 1, unit: "hour" };
  return { kind: "action" };
}

function extractedComponents(value: ExtractedBookSpell["components"]): SpellDefinition["components"] {
  const verbal = /\bV\b/.test(value);
  const somatic = /\bS\b/.test(value);
  return value.includes("M") ? { verbal, somatic, material: { descriptionSummary: value, consumed: /consumid/i.test(value) } } : { verbal, somatic };
}

/** Publicação de opções do catálogo textual sem promover prosa a efeito automatizado. */
function assistedFromBook(entry: ExtractedBookSpell): SpellDefinition {
  return {
    id: spellId(entry.id), name: entry.name, tags: ["book-catalog", ...(entry.level === 0 ? ["cantrip"] : [])],
    sourceRefs: [spellSource(entry.source.printedPage, entry.source.pdfPage, entry.name)], level: entry.level,
    school: schoolByPtBr[entry.schoolPtBr] ?? "transmutation", castingTime: extractedCastingTime(entry.castingTime), range: { kind: "special" },
    components: extractedComponents(entry.components), duration: { kind: "special", endTriggers: [{ kind: "table-decision", description: "Duração publicada no catálogo textual; modelagem estruturada pendente." }] },
    concentration: entry.duration.includes("Concentração"), ritual: entry.ritual, classes: entry.classes.map((classId) => spellId(classId)),
    targetType: { type: "mixed", restrictions: ["Alvo e efeito aguardam modelagem estruturada; a entrada permanece bloqueada."], visibilityRequired: false },
    attackType: "none", damage: [], healing: [], higherLevels: entry.higherLevels ? { kind: "custom", description: entry.higherLevels } : { kind: "none" },
    effects: [], automationStatus: "blocked", pendingDecisionIds: ["PEND-SPELL-STRUCTURE"],
  };
}

const assistedBardInitialSpells = EXTRACTED_PHB_SPELLS
  .filter((entry) => (BARD_INITIAL_CATALOG_IDS as readonly string[]).includes(entry.id))
  .map(assistedFromBook);

/**
 * Conteúdo estruturado coberto por esta entrega. A prosa integral do PDF não é embutida;
 * cada entrada contém apenas os metadados necessários ao compêndio e ao Rules Engine.
 */
export const spells: readonly SpellDefinition[] = [
  {
    id: spellId("cure-wounds"), name: "Curar Ferimentos", tags: ["healing"],
    sourceRefs: [spellSource(236, 235, "Curar Ferimentos")], level: 1, school: "evocation",
    castingTime: { kind: "action" }, range: { kind: "touch" },
    components: { verbal: true, somatic: true }, duration: instant, concentration: false, ritual: false,
    classes: classes("bard", "cleric", "druid", "paladin", "ranger"),
    targetType: { type: "creature", count: 1, restrictions: ["não afeta mortos-vivos ou constructos"], visibilityRequired: false },
    attackType: "none", damage: [],
    // A habilidade vem da fonte de conjuração (bard=CAR, cleric/druid=SAB), não da magia.
    healing: [{ expression: { quantity: 1, faces: 8 }, bonusPerCastingSourceAbility: true }],
    higherLevels: { kind: "extra-healing-dice-per-slot-level", diceIncrease: { quantity: 1, faces: 8 } },
    effects: [], automationStatus: "automated", pendingDecisionIds: [],
  },
  {
    id: spellId("fireball"), name: "Bola de Fogo", tags: ["damage", "area"],
    sourceRefs: [spellSource(223, 222, "Bola de Fogo")], level: 3, school: "evocation",
    castingTime: { kind: "action" }, range: { kind: "distance", distanceCm: asCentimeters(4500), origin: "point-chosen-in-range" },
    components: { verbal: true, somatic: true, material: { descriptionSummary: "uma pequena bola de guano de morcego e enxofre", consumed: false } },
    duration: instant, concentration: false, ritual: false, classes: classes("sorcerer", "wizard"),
    targetType: { type: "point", restrictions: [], visibilityRequired: false },
    area: { shape: "sphere", dimensionsCm: [asCentimeters(600)], originPolicy: "point-in-range" },
    savingThrow: { ability: "dex", successOutcome: "half-damage" }, attackType: "none",
    damage: [{ expression: { quantity: 8, faces: 6 }, damageType: "fire", target: "all-in-area" }], healing: [],
    higherLevels: { kind: "extra-damage-dice-per-slot-level", diceIncrease: { quantity: 1, faces: 6 }, perSlotLevels: 1 },
    effects: [], automationStatus: "assisted", pendingDecisionIds: [],
  },
  {
    id: spellId("detect-magic"), name: "Detectar Magia", tags: ["divination", "ritual", "concentration"],
    sourceRefs: [spellSource(239, 238, "Detectar Magia")], level: 1, school: "divination",
    castingTime: { kind: "action" }, range: { kind: "self" }, components: { verbal: true, somatic: true },
    duration: { kind: "minutes", amount: 10, unit: "minute", endTriggers: [] }, concentration: true, ritual: true,
    classes: classes("bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "wizard"),
    targetType: { type: "self", restrictions: [], visibilityRequired: false }, attackType: "none", damage: [], healing: [],
    higherLevels: { kind: "none" },
    effects: [{ kind: "narrative", description: "Detecta presença de magia e permite examinar a aura de uma criatura ou objeto visível." }],
    automationStatus: "assisted", pendingDecisionIds: [],
  },
  {
    id: spellId("fire-bolt"), name: "Raio de Fogo", tags: ["cantrip", "damage", "attack"],
    sourceRefs: [spellSource(274, 273, "Raio de Fogo")], level: 0, school: "evocation",
    castingTime: { kind: "action" }, range: { kind: "distance", distanceCm: asCentimeters(3600), origin: "caster" },
    components: { verbal: true, somatic: true }, duration: instant, concentration: false, ritual: false,
    classes: classes("sorcerer", "wizard"),
    targetType: { type: "mixed", count: 1, restrictions: ["criatura ou objeto"], visibilityRequired: false },
    attackType: "ranged-spell", damage: [{ expression: { quantity: 1, faces: 10 }, damageType: "fire" }], healing: [],
    higherLevels: { kind: "custom", description: "Dano aumenta para 2d10, 3d10 e 4d10 nos níveis de personagem 5, 11 e 17." },
    effects: [{ kind: "narrative", description: "Objeto inflamável que não esteja sendo vestido ou carregado pode incendiar." }],
    automationStatus: "assisted", pendingDecisionIds: [],
  },
  {
    id: spellId("healing-word"), name: "Palavra Curativa", tags: ["healing", "bonus-action"],
    sourceRefs: [spellSource(266, 265, "Palavra Curativa")], level: 1, school: "evocation",
    castingTime: { kind: "bonus-action" }, range: { kind: "distance", distanceCm: asCentimeters(1800), origin: "caster" },
    components: { verbal: true, somatic: false }, duration: instant, concentration: false, ritual: false,
    classes: classes("bard", "cleric", "druid"),
    targetType: { type: "creature", count: 1, restrictions: ["criatura visível; não afeta mortos-vivos ou constructos"], visibilityRequired: true },
    // A habilidade vem da fonte de conjuração (bard=CAR, cleric/druid=SAB), não da magia.
    attackType: "none", damage: [], healing: [{ expression: { quantity: 1, faces: 4 }, bonusPerCastingSourceAbility: true }],
    higherLevels: { kind: "extra-healing-dice-per-slot-level", diceIncrease: { quantity: 1, faces: 4 } },
    effects: [], automationStatus: "automated", pendingDecisionIds: [],
  },
  {
    id: spellId("revivify"), name: "Revivificar", tags: ["healing", "consumed-component"],
    sourceRefs: [spellSource(279, 278, "Revivificar")], level: 3, school: "necromancy",
    castingTime: { kind: "action" }, range: { kind: "touch" },
    components: { verbal: true, somatic: true, material: { descriptionSummary: "um diamante no valor de pelo menos 300 po", costCp: asCopperPieces(30000), consumed: true } },
    duration: instant, concentration: false, ritual: false, classes: classes("cleric", "paladin"),
    targetType: { type: "creature", count: 1, restrictions: ["criatura morta há no máximo 1 minuto"], visibilityRequired: false },
    attackType: "none", damage: [], healing: [], higherLevels: { kind: "none" },
    effects: [{ kind: "narrative", description: "Retorna a criatura à vida com 1 ponto de vida; não restaura partes perdidas nem reverte velhice." }],
    automationStatus: "assisted", pendingDecisionIds: [],
  },
] as const;

export const SPELL_DEFINITIONS: readonly SpellDefinition[] = [...spells, ...assistedBardInitialSpells];
export const spellsById: ReadonlyMap<EntityId, SpellDefinition> = new Map(SPELL_DEFINITIONS.map((spell) => [spell.id, spell]));

export function findSpell(spellIdValue: string): SpellDefinition | undefined {
  return isEntityId(spellIdValue) ? spellsById.get(spellIdValue) : undefined;
}

/**
 * Catálogo de V1 ainda não é a transcrição estrutural integral das 300+ descrições do PDF.
 * A lacuna é pública para impedir que consumidores tratem ausência como “sem acesso”.
 */
export const SPELL_CATALOG_COVERAGE = {
  status: "partial" as const,
  sourceId: RULESET_ID,
  includedIds: SPELL_DEFINITIONS.map((spell) => spell.id),
  unresolved: "As demais magias e listas do capítulo 11 ainda aguardam catalogação campo a campo a partir do PDF local.",
} as const;

/** Atributos da fonte de classe; origem racial/característica é resolvida por SPELL-002. */
export const SPELLCASTING_ABILITIES_BY_CLASS = {
  bard: "cha", cleric: "wis", druid: "wis", sorcerer: "cha", wizard: "int", paladin: "cha",
} as const;
