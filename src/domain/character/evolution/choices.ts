import type { Character } from "@domain/contracts/character";
import type { ChoiceDefinition, ChoiceKind } from "@domain/contracts/primitives";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { SourceRef } from "@domain/contracts/primitives";
import { asEntityId } from "@domain/contracts/ids";
import { castingSourcesOf, projectClasses } from "./context";
import { ARCANUM_LEVEL, SUBCLASS_BONUS_CANTRIPS } from "./spell-rules";
import { cantripsKnownAt, spellsKnownAt } from "./spell-tables";

const spellSelector = (filterTag?: string) => ({ kind: "any-entity-of-type" as const, entityType: "spell" as const, ...(filterTag ? { filterTag } : {}) });

function spellChoice(id: string, kind: ChoiceKind, max: number, sources: readonly SourceRef[], filterTag?: string): ChoiceDefinition {
  return { id, kind, count: { min: 0, max }, optionSet: { kind: "selector", selector: spellSelector(filterTag) }, prerequisites: [], unique: true, sourceRefs: sources };
}

/**
 * Escolhas de magia e de troca que dependem da tabela de classe e do nível, geradas do estado
 * futuro do personagem. O pack só publica as do 1º nível; as demais saem das tabelas do livro
 * (truques e magias conhecidas, grimório, Segredos Mágicos, Arcana Mística, trocas…).
 */
export function generatedChoices(character: Pick<Character, "classes">, pack: RulePack, classId: string, targetLevel: number, subclassId?: string): readonly ChoiceDefinition[] {
  const definition = pack.classes.get(asEntityId(classId));
  if (!definition) return [];
  const refs = definition.sourceRefs;
  const classes = projectClasses(character, classId, targetLevel, subclassId);
  const subclass = classes.find((entry) => String(entry.classId) === classId)?.subclassId;
  const out: ChoiceDefinition[] = [];

  for (const source of castingSourcesOf(classes).filter((entry) => entry.classId === classId)) {
    const key = source.key;
    const level = source.level;
    const startLevel = source.profile.startLevel;
    const isThird = source.profile.profile === "third";
    // No nível inicial das classes de classe, o pack já publica as escolhas do 1º nível.
    const publishedAtStart = level === 1 && !isThird;
    if (!publishedAtStart) {
      const cantrips = cantripsKnownAt(key, level) - cantripsKnownAt(key, level - 1);
      if (cantrips > 0) out.push(spellChoice(`${key}.cantrips.${level}`, "cantrip", cantrips, refs, "cantrip"));
      const spells = source.profile.kind === "spellbook" ? (level > 1 ? 2 : 0) : source.profile.kind === "known" ? spellsKnownAt(key, level) - spellsKnownAt(key, level - 1) : 0;
      if (spells > 0) out.push(spellChoice(`${key}.spells.${level}`, "spell", spells, refs));
    }
    if (source.profile.kind === "known" && level > startLevel) {
      out.push({ id: `${key}.spell-swap.${level}`, kind: "spell", count: { min: 0, max: 2 }, optionSet: { kind: "selector", selector: spellSelector() }, prerequisites: [], unique: false, sourceRefs: refs });
    }
    if (key === "warlock") {
      if (ARCANUM_LEVEL[level]) out.push(spellChoice(`warlock.arcanum.${level}`, "spell", 1, refs));
      if (level === 3) out.push(spellChoice("warlock.tome-cantrips.3", "cantrip", 3, refs, "cantrip"));
      if (level >= 3) {
        const invocations = [...pack.features.values()].filter((feature) => feature.tags.includes("invocation")).map((feature) => ({ rulesetId: pack.manifest.id, entityId: feature.id }));
        out.push({ id: `warlock.invocation-swap.${level}`, kind: "other", count: { min: 0, max: 2 }, optionSet: { kind: "explicit", options: invocations }, prerequisites: [], unique: false, sourceRefs: refs });
      }
    }
    if (key === "bard" && [10, 14, 18].includes(level)) out.push(spellChoice(`bard.magical-secrets.${level}`, "spell", 2, refs));
    if (key === "wizard" && level === 18) out.push(spellChoice("wizard.spell-mastery.18", "spell", 2, refs));
    if (key === "wizard" && level === 20) out.push(spellChoice("wizard.signature-spells.20", "spell", 2, refs));
  }

  if (subclass) {
    const subclassKey = String(subclass);
    const bonus = SUBCLASS_BONUS_CANTRIPS[subclassKey];
    if (bonus && bonus.classId === classId && targetLevel === bonus.level) out.push(spellChoice(`${subclassKey}.cantrip.${bonus.level}`, "cantrip", 1, refs, "cantrip"));
    if (subclassKey === "college-of-lore" && targetLevel === 6) out.push(spellChoice("college-of-lore.additional-secrets.6", "spell", 2, refs));
  }
  return out;
}
