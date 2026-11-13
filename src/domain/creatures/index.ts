/**
 * Blocos imutáveis de criatura. O catálogo guarda texto e estatísticas publicados sem
 * executar fórmulas narrativas; regras como elegibilidade de Forma Selvagem ficam em
 * `domain/rules/wild-shape`.
 */

import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type EntityId } from "@domain/contracts/ids";
import { isDiceFaces, type Ability, type Centimeters, type DamageType, type DiceFormula, type Size, type Skill, type SourceRef } from "@domain/contracts/primitives";

export const CREATURE_TYPES = [
  "aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey",
  "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead",
] as const;
export type CreatureType = (typeof CREATURE_TYPES)[number];

export const CREATURE_SIZES: readonly Size[] = ["tiny", "small", "medium", "large", "huge", "gargantuan"];

export interface CreatureHitPoints {
  readonly average: number;
  readonly hitDice?: string;
}

export interface CreatureSpeeds {
  readonly walkCm?: Centimeters;
  readonly climbCm?: Centimeters;
  readonly swimCm?: Centimeters;
  readonly flyCm?: Centimeters;
  readonly burrowCm?: Centimeters;
  readonly hover?: boolean;
  /** Texto de velocidade impresso, preservado quando não houver unidade normalizável. */
  readonly sourceText?: string;
}

export interface CreatureSense {
  readonly kind: string;
  readonly rangeCm?: Centimeters;
  readonly description?: string;
}

export interface CreatureTrait {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface CreatureDamageEntry {
  readonly formula?: DiceFormula;
  readonly flatBonus?: number;
  readonly damageType: DamageType;
  readonly note?: string;
  /** A parte depende de condição/resistência/turno e deve ser resolvida manualmente. */
  readonly requiresManualResolution?: true;
}

export interface CreatureAction extends CreatureTrait {
  readonly attackBonus?: number;
  readonly reachCm?: Centimeters;
  readonly rangeCm?: Centimeters;
  readonly damage?: readonly CreatureDamageEntry[];
  readonly recharge?: string;
  readonly usage?: string;
  /** A ação não é um ataque imediato automatizável neste fluxo. */
  readonly requiresManualResolution?: true;
}

export interface CreatureLegendaryAction {
  readonly actionsPerTurn: number;
  readonly actions: readonly CreatureAction[];
  readonly description?: string;
}

export interface CreatureSpellcasting {
  readonly description: string;
  readonly ability?: Ability;
  readonly saveDc?: number;
  readonly attackBonus?: number;
  readonly spells?: readonly string[];
  readonly innate?: boolean;
  readonly slots?: Readonly<Record<string, number>>;
}

/** Fórmulas publicadas para companion escalável; dados são preservados, não avaliados implicitamente. */
export interface CreatureScaling {
  readonly proficiencyBonus?: { readonly base?: number; readonly perCharacterProficiencyBonus?: number };
  readonly armorClass?: { readonly base: number; readonly addProficiencyBonus?: boolean };
  readonly hitPoints?: {
    readonly base: number;
    /** Legado: nível total do personagem. Prefira classId/perClassLevel para companions. */
    readonly perCharacterLevel?: number;
    readonly classId?: EntityId;
    readonly perClassLevel?: number;
    readonly hitDie?: number;
  };
  readonly attackAbility?: Ability;
  readonly notes?: string;
}

export interface CreatureAdditionalInfo {
  readonly habitat?: string;
  readonly organization?: string;
  readonly treasure?: string;
  readonly equipment?: string;
  readonly notes?: string;
}

/** Estatísticas integrais para bestas, NPCs, monstros e outros tipos de criatura. */
export interface CreatureStatBlock {
  readonly id: EntityId;
  readonly name: string;
  readonly creatureType: CreatureType;
  readonly size: Size;
  readonly tags?: readonly string[];
  /** Verdadeiro para enxames; eles não são formas individuais de Forma Selvagem. */
  readonly isSwarm?: boolean;
  readonly alignment?: string;
  readonly armorClass: number;
  readonly armorClassNote?: string;
  readonly hitPoints: CreatureHitPoints;
  readonly speeds: CreatureSpeeds;
  readonly abilityScores: Readonly<Record<Ability, number>>;
  readonly savingThrows?: Partial<Readonly<Record<Ability, number>>>;
  readonly skills?: Partial<Readonly<Record<Skill, number>>>;
  readonly damageVulnerabilities?: readonly DamageType[];
  readonly damageResistances?: readonly DamageType[];
  readonly damageImmunities?: readonly DamageType[];
  readonly conditionImmunities?: readonly string[];
  readonly senses?: readonly CreatureSense[];
  readonly passivePerception?: number;
  readonly languages?: readonly string[];
  /** ND exato como fração; null preserva ND impresso como “—” e nunca equivale a 0. */
  readonly challengeRating: { readonly numerator: number; readonly denominator: number } | null;
  readonly experiencePoints?: number;
  readonly proficiencyBonus?: number;
  readonly traits?: readonly CreatureTrait[];
  readonly spellcasting?: CreatureSpellcasting;
  readonly innateSpellcasting?: CreatureSpellcasting;
  readonly actions?: readonly CreatureAction[];
  readonly bonusActions?: readonly CreatureAction[];
  readonly reactions?: readonly CreatureAction[];
  readonly legendaryActions?: CreatureLegendaryAction;
  readonly lairActions?: readonly CreatureTrait[];
  readonly regionalEffects?: readonly CreatureTrait[];
  readonly additionalInfo?: CreatureAdditionalInfo;
  readonly scaling?: CreatureScaling;
  readonly sourceRefs: readonly SourceRef[];
  /** Campos textuais complementares para preservar layout/nota específica da fonte. */
  readonly sourceText?: Readonly<Record<string, string>>;
}

export type BeastDefinition = CreatureStatBlock & { readonly creatureType: "beast" };

export interface CreatureStatBlockSuggestionInput {
  readonly id: EntityId;
  readonly name: string;
  readonly creatureType: CreatureType;
  readonly size: Size;
  readonly challengeRating?: CreatureStatBlock["challengeRating"];
  readonly role: "player-beast" | "master";
  readonly catalog: Iterable<CreatureStatBlock>;
}

export interface CreatureStatBlockSuggestion {
  readonly statBlock: CreatureStatBlock;
  readonly basedOn: EntityId | null;
  readonly templateKind: "published-template" | "generic-provisional";
  readonly reasons: readonly string[];
  readonly requiresReview: true;
}

const abilityNames: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
const validDamageTypes: readonly DamageType[] = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
const validSkills: readonly Skill[] = ["acrobatics", "animal-handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight-of-hand", "stealth", "survival"];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteInteger(value: unknown, minimum = Number.MIN_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= minimum;
}

function isTextArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCreatureTrait(value: unknown): value is CreatureTrait {
  return record(value) && typeof value.id === "string" && typeof value.name === "string" && typeof value.description === "string";
}

function isCreatureAction(value: unknown): value is CreatureAction {
  if (!record(value) || !isCreatureTrait(value)) return false;
  return (value.attackBonus === undefined || finiteInteger(value.attackBonus)) &&
    (value.requiresManualResolution === undefined || value.requiresManualResolution === true) &&
    (value.reachCm === undefined || finiteInteger(value.reachCm, 0)) &&
    (value.rangeCm === undefined || finiteInteger(value.rangeCm, 0)) &&
    (value.recharge === undefined || typeof value.recharge === "string") &&
    (value.usage === undefined || typeof value.usage === "string") &&
    (value.damage === undefined || (Array.isArray(value.damage) && value.damage.every((damage) => record(damage) && validDamageTypes.includes(damage.damageType as DamageType) &&
      (damage.flatBonus === undefined || finiteInteger(damage.flatBonus)) &&
      (damage.note === undefined || typeof damage.note === "string") &&
      (damage.requiresManualResolution === undefined || damage.requiresManualResolution === true) &&
      (damage.formula === undefined || (record(damage.formula) && finiteInteger(damage.formula.quantity, 1) && isDiceFaces(damage.formula.faces))))));
}

function isAbilityScores(value: unknown): value is Readonly<Record<Ability, number>> {
  return record(value) && abilityNames.every((ability) => finiteInteger(value[ability], 0));
}

/** Validação estrutural antes de persistir/importar conteúdo manual ou de suplemento. */
export function isCreatureStatBlock(value: unknown): value is CreatureStatBlock {
  if (!record(value)) return false;
  const speeds = value.speeds;
  const hp = value.hitPoints;
  const cr = value.challengeRating;
  const sourceRefs = value.sourceRefs;
  const validActions = (entries: unknown): entries is readonly CreatureAction[] => entries === undefined || (Array.isArray(entries) && entries.every(isCreatureAction));
  if (typeof value.id !== "string" || !value.id || typeof value.name !== "string" || !value.name.trim()) return false;
  if (!CREATURE_TYPES.includes(value.creatureType as CreatureType) || !CREATURE_SIZES.includes(value.size as Size)) return false;
  if ((value.tags !== undefined && !isTextArray(value.tags)) || (value.isSwarm !== undefined && typeof value.isSwarm !== "boolean")) return false;
  if (!finiteInteger(value.armorClass, 0) || !record(hp) || !finiteInteger(hp.average, 0) || (hp.hitDice !== undefined && typeof hp.hitDice !== "string")) return false;
  if (!record(speeds) || Object.entries(speeds).some(([key, speed]) => key.endsWith("Cm") && (speed === undefined || !finiteInteger(speed, 0))) || (speeds.hover !== undefined && typeof speeds.hover !== "boolean")) return false;
  if (!isAbilityScores(value.abilityScores)) return false;
  if (cr !== null && (!record(cr) || !finiteInteger(cr.numerator, 0) || !finiteInteger(cr.denominator, 1))) return false;
  if (!Array.isArray(sourceRefs) || sourceRefs.some((source) => !record(source) || typeof source.sourceId !== "string" || typeof source.chapter !== "string")) return false;
  if (value.savingThrows !== undefined && (!record(value.savingThrows) || Object.entries(value.savingThrows).some(([key, score]) => !abilityNames.includes(key as Ability) || !finiteInteger(score)))) return false;
  if (value.skills !== undefined && (!record(value.skills) || Object.entries(value.skills).some(([key, score]) => !validSkills.includes(key as Skill) || !finiteInteger(score)))) return false;
  for (const key of ["damageVulnerabilities", "damageResistances", "damageImmunities"] as const) {
    if (value[key] !== undefined && (!Array.isArray(value[key]) || value[key].some((damage) => !validDamageTypes.includes(damage as DamageType)))) return false;
  }
  if (value.conditionImmunities !== undefined && !isTextArray(value.conditionImmunities)) return false;
  if (value.senses !== undefined && (!Array.isArray(value.senses) || value.senses.some((sense) => !record(sense) || typeof sense.kind !== "string" || (sense.rangeCm !== undefined && !finiteInteger(sense.rangeCm, 0))))) return false;
  for (const key of ["languages"] as const) if (value[key] !== undefined && !isTextArray(value[key])) return false;
  for (const key of ["experiencePoints", "proficiencyBonus", "passivePerception"] as const) if (value[key] !== undefined && !finiteInteger(value[key], 0)) return false;
  for (const key of ["traits", "lairActions", "regionalEffects"] as const) if (value[key] !== undefined && (!Array.isArray(value[key]) || !value[key].every(isCreatureTrait))) return false;
  for (const key of ["actions", "bonusActions", "reactions"] as const) if (!validActions(value[key])) return false;
  if (value.legendaryActions !== undefined && (!record(value.legendaryActions) || !finiteInteger(value.legendaryActions.actionsPerTurn, 0) || !validActions(value.legendaryActions.actions))) return false;
  for (const key of ["alignment", "armorClassNote"] as const) if (value[key] !== undefined && typeof value[key] !== "string") return false;
  for (const key of ["spellcasting", "innateSpellcasting"] as const) if (value[key] !== undefined) {
    const spellcasting = value[key];
    if (!record(spellcasting) || typeof spellcasting.description !== "string" ||
      (spellcasting.ability !== undefined && !abilityNames.includes(spellcasting.ability as Ability)) ||
      (spellcasting.saveDc !== undefined && !finiteInteger(spellcasting.saveDc, 0)) ||
      (spellcasting.attackBonus !== undefined && !finiteInteger(spellcasting.attackBonus)) ||
      (spellcasting.spells !== undefined && !isTextArray(spellcasting.spells)) ||
      (spellcasting.innate !== undefined && typeof spellcasting.innate !== "boolean") ||
      (spellcasting.slots !== undefined && (!record(spellcasting.slots) || Object.values(spellcasting.slots).some((count) => !finiteInteger(count, 0))))
    ) return false;
  }
  if (value.additionalInfo !== undefined && (!record(value.additionalInfo) || Object.values(value.additionalInfo).some((item) => typeof item !== "string"))) return false;
  if (value.sourceText !== undefined && (!record(value.sourceText) || Object.values(value.sourceText).some((item) => typeof item !== "string"))) return false;
  if (value.scaling !== undefined) {
    const scaling = value.scaling;
    if (!record(scaling) || (scaling.proficiencyBonus !== undefined && (!record(scaling.proficiencyBonus) ||
      (scaling.proficiencyBonus.base !== undefined && !finiteInteger(scaling.proficiencyBonus.base, 0)) ||
      (scaling.proficiencyBonus.perCharacterProficiencyBonus !== undefined && !finiteInteger(scaling.proficiencyBonus.perCharacterProficiencyBonus, 0)))) ||
      (scaling.armorClass !== undefined && (!record(scaling.armorClass) || !finiteInteger(scaling.armorClass.base, 0) || (scaling.armorClass.addProficiencyBonus !== undefined && typeof scaling.armorClass.addProficiencyBonus !== "boolean"))) ||
      (scaling.hitPoints !== undefined && (!record(scaling.hitPoints) || !finiteInteger(scaling.hitPoints.base, 0) ||
        (scaling.hitPoints.perCharacterLevel !== undefined && !finiteInteger(scaling.hitPoints.perCharacterLevel, 0)) ||
        (scaling.hitPoints.perClassLevel !== undefined && !finiteInteger(scaling.hitPoints.perClassLevel, 0)) ||
        (scaling.hitPoints.classId !== undefined && (typeof scaling.hitPoints.classId !== "string" || scaling.hitPoints.classId.length === 0)) ||
        ((scaling.hitPoints.perClassLevel !== undefined) !== (scaling.hitPoints.classId !== undefined)) ||
        (scaling.hitPoints.perCharacterLevel !== undefined && scaling.hitPoints.perClassLevel !== undefined) ||
        (scaling.hitPoints.hitDie !== undefined && !finiteInteger(scaling.hitPoints.hitDie, 1)))) ||
      (scaling.attackAbility !== undefined && !abilityNames.includes(scaling.attackAbility as Ability)) ||
      (scaling.notes !== undefined && typeof scaling.notes !== "string")) return false;
  }
  return true;
}

export function validateCreatureStatBlock(value: unknown): Result<CreatureStatBlock, AppError> {
  return isCreatureStatBlock(value)
    ? ok(value)
    : err(appError.validation("statBlock", "O bloco de estatísticas da criatura está incompleto ou contém valores inválidos."));
}

export function isBeastDefinition(value: unknown): value is BeastDefinition {
  return isCreatureStatBlock(value) && value.creatureType === "beast" && value.isSwarm !== true && !(value.tags ?? []).includes("swarm");
}

/** Sugere um bloco editável a partir do template publicado mais próximo, sem inferir fórmulas ocultas. */
export function suggestCreatureStatBlock(input: CreatureStatBlockSuggestionInput): Result<CreatureStatBlockSuggestion, AppError> {
  if (!input.name.trim()) return err(appError.validation("name", "Informe um nome antes de gerar a sugestão."));
  if (input.role === "player-beast" && input.creatureType !== "beast") return err(appError.validation("creatureType", "Sugestões de jogador são limitadas a bestas."));
  if (input.challengeRating && (!finiteInteger(input.challengeRating.numerator, 0) || !finiteInteger(input.challengeRating.denominator, 1))) {
    return err(appError.validation("challengeRating", "O ND solicitado deve ser uma fração não negativa válida."));
  }
  const candidates = [...input.catalog].filter((candidate) =>
    isCreatureStatBlock(candidate) && candidate.creatureType === input.creatureType && candidate.size === input.size &&
    candidate.challengeRating !== null && candidate.scaling === undefined && candidate.isSwarm !== true && !(candidate.tags ?? []).includes("swarm"),
  );
  if (candidates.length === 0) {
    const provisional = provisionalTemplate(input);
    return ok({
      statBlock: provisional,
      basedOn: null,
      templateKind: "generic-provisional",
      requiresReview: true,
      reasons: [
        `Não há bloco publicado de ${input.creatureType} ${input.size}; foi usado um perfil genérico editável por porte.`,
        "CA, PV, atributos e deslocamento são valores provisórios de preenchimento, não estatísticas publicadas nem garantia de balanceamento.",
        input.challengeRating ? "O ND solicitado foi preservado como rascunho e precisa ser arbitrado pelo mestre." : "O ND ficou não definido; informe e arbitre o valor antes da aprovação.",
        "Este rascunho exige revisão do mestre; a sugestão não aprova o bloco nem registra avistamento.",
      ],
    });
  }
  const targetCr = input.challengeRating && input.challengeRating.denominator > 0
    ? input.challengeRating.numerator / input.challengeRating.denominator
    : undefined;
  candidates.sort((left, right) => {
    const leftCr = left.challengeRating!.numerator / left.challengeRating!.denominator;
    const rightCr = right.challengeRating!.numerator / right.challengeRating!.denominator;
    const crDistance = targetCr === undefined ? 0 : Math.abs(leftCr - targetCr) - Math.abs(rightCr - targetCr);
    return crDistance || left.name.localeCompare(right.name, "pt-BR") || String(left.id).localeCompare(String(right.id));
  });
  const template = candidates[0];
  const templateCr = template.challengeRating!;
  const crText = `${templateCr.numerator}/${templateCr.denominator}`;
  const note = `Sugestão editável gerada a partir do bloco publicado “${template.name}” (ND ${crText}); requer revisão do mestre antes de aprovação.`;
  const statBlock: CreatureStatBlock = {
    ...template,
    id: input.id,
    name: input.name.trim(),
    additionalInfo: {
      ...template.additionalInfo,
      notes: [template.additionalInfo?.notes, note].filter(Boolean).join("\n"),
    },
  };
  return ok({
    statBlock,
    basedOn: template.id,
    templateKind: "published-template",
    requiresReview: true,
    reasons: [
      `Template de mesmo tipo (${input.creatureType}) e tamanho (${input.size}).`,
      targetCr === undefined ? `ND ${crText} foi preservado do template mais próximo disponível.` : `ND ${crText} é o mais próximo do ND solicitado ${input.challengeRating!.numerator}/${input.challengeRating!.denominator}.`,
      "CA, PV, atributos, deslocamentos, sentidos e ações foram copiados integralmente do template para permitir edição sem inventar fórmulas.",
      "Este rascunho exige revisão do mestre; a sugestão não aprova o bloco nem registra avistamento.",
    ],
  });
}

/** Preenche um rascunho editável quando o catálogo não tem um exemplo do tipo/porte solicitado. */
function provisionalTemplate(input: CreatureStatBlockSuggestionInput): CreatureStatBlock {
  const profiles: Readonly<Record<Size, { readonly hitDie: number; readonly hitPoints: number; readonly armorClass: number; readonly walkCm: number; readonly str: number; readonly dex: number; readonly con: number }>> = {
    tiny: { hitDie: 4, hitPoints: 2, armorClass: 12, walkCm: 300, str: 3, dex: 13, con: 10 },
    small: { hitDie: 6, hitPoints: 5, armorClass: 12, walkCm: 600, str: 7, dex: 12, con: 11 },
    medium: { hitDie: 8, hitPoints: 8, armorClass: 10, walkCm: 900, str: 10, dex: 10, con: 10 },
    large: { hitDie: 10, hitPoints: 20, armorClass: 12, walkCm: 900, str: 16, dex: 10, con: 14 },
    huge: { hitDie: 12, hitPoints: 30, armorClass: 13, walkCm: 900, str: 20, dex: 8, con: 16 },
    gargantuan: { hitDie: 20, hitPoints: 50, armorClass: 14, walkCm: 900, str: 24, dex: 8, con: 20 },
  };
  const profile = profiles[input.size];
  const isHumanoid = input.creatureType === "humanoid";
  return {
    id: input.id,
    name: input.name.trim(),
    creatureType: input.creatureType,
    size: input.size,
    tags: ["provisional-template"],
    armorClass: profile.armorClass,
    armorClassNote: "Valor genérico provisório; revisar manualmente.",
    hitPoints: { average: profile.hitPoints, hitDice: `1d${profile.hitDie}` },
    speeds: { walkCm: profile.walkCm as CreatureSpeeds["walkCm"] },
    abilityScores: {
      str: profile.str,
      dex: profile.dex,
      con: profile.con,
      int: isHumanoid ? 10 : 3,
      wis: 10,
      cha: isHumanoid ? 10 : 6,
    },
    challengeRating: input.challengeRating ?? null,
    sourceRefs: [],
    additionalInfo: {
      notes: "Perfil genérico provisório gerado por porte; não representa estatísticas publicadas nem uma fórmula de balanceamento.",
    },
  };
}
