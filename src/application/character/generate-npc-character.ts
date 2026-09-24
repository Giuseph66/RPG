import type { Character } from "@domain/contracts/character";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import { appError, err, ok, type Result } from "@domain/contracts/errors";
import { asEntityId, asIsoTimestamp, asUuid, type DefinitionRef, type EntityId, type Uuid } from "@domain/contracts/ids";
import type { Ability, ChoiceDefinition, ChoiceSelection } from "@domain/contracts/primitives";
import { createCharacterDraft, materializeCharacter, type CreationCatalog } from "@domain/character/creation";

const abilities: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
const skillIds = ["acrobatics", "animal-handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight-of-hand", "stealth", "survival"];
const languageIds = ["elvish", "dwarvish", "halfling", "gnomish", "orc", "draconic", "infernal", "celestial"];
const toolIds = ["proficiency.gaming-set", "proficiency.vehicle-land", "proficiency.thieves-tools", "proficiency.herbalism-kit"];
const skillSet = new Set(skillIds);

export interface GenerateNpcCharacterInput {
  readonly name: string;
  readonly raceId: EntityId;
  readonly classId: EntityId;
  readonly id?: Uuid;
  readonly now?: ReturnType<typeof asIsoTimestamp>;
}

export interface GenerateNpcCatalog extends CreationCatalog {
  /** Published options for selector choices not represented by a V1 entity catalog. */
  readonly selectorOptions?: Readonly<Record<string, readonly string[]>>;
}

function choicesFor(choice: ChoiceDefinition, catalog: GenerateNpcCatalog, usedProficiencies: Set<string>, usedOptions: Set<string>): readonly DefinitionRef[] | undefined {
  const pack = catalog.rulePack;
  const ref = (id: string): DefinitionRef => ({ rulesetId: pack.manifest.id, entityId: asEntityId(id) });
  let options: readonly DefinitionRef[];
  if (choice.optionSet.kind === "explicit") options = choice.optionSet.options;
  else {
    const selector = choice.optionSet.selector;
    if (selector.kind === "any-skill") options = skillIds.map(ref);
    else if (selector.kind === "any-language") options = languageIds.map(ref);
    else if (selector.kind === "any-tool-proficiency") options = toolIds.map(ref);
    else if (selector.entityType === "spell") options = [...pack.spells.values()].filter((spell) => !selector.filterTag || spell.tags.includes(selector.filterTag)).map((spell) => ref(String(spell.id)));
    else if (selector.entityType === "equipment") options = [...pack.equipment.keys()].map((id) => ref(String(id)));
    else if (catalog.selectorOptions?.[choice.id]) options = catalog.selectorOptions[choice.id].map(ref);
    else options = [];
  }
  const eligible = options.filter((option) => {
    const id = String(option.entityId);
    if (skillSet.has(id) || id.startsWith("proficiency.")) return !usedProficiencies.has(id);
    if (choice.unique && usedOptions.has(id)) return false;
    const bundle = catalog.equipmentBundles?.find((candidate) => candidate.id === option.entityId);
    return !bundle || bundle.choices.every((internal) => internal.count.min === 0);
  });
  if (eligible.length < choice.count.min) return undefined;
  const selected = eligible.slice(0, choice.count.min);
  for (const option of selected) {
    const id = String(option.entityId);
    if (skillSet.has(id) || id.startsWith("proficiency.")) usedProficiencies.add(id);
    usedOptions.add(id);
  }
  return selected;
}

/** Builds a level-one sheet from published rule definitions and validates every automatic choice. */
export function generateNpcCharacter(catalog: GenerateNpcCatalog, input: GenerateNpcCharacterInput): Result<Character> {
  const pack: RulePack = catalog.rulePack;
  const race = pack.races.get(input.raceId);
  const characterClass = pack.classes.get(input.classId);
  if (!input.name.trim()) return err(appError.validation("name", "Informe o nome antes de gerar a ficha."));
  if (!race || !characterClass) return err(appError.validation("raceOrClass", "Escolha uma raça e uma classe publicadas nas regras."));
  const now = input.now ?? asIsoTimestamp(new Date().toISOString());
  const ref = (id: EntityId): DefinitionRef => ({ rulesetId: pack.manifest.id, entityId: id });
  const subraces = race.subraceIds.length ? race.subraceIds.flatMap((id) => { const entry = pack.subraces.get(id); return entry ? [entry] : []; }) : [undefined];
  if (!subraces.length) return err(appError.validation("subrace", "A sub-raça exigida por esta raça não está disponível."));
  const subclass = characterClass.subclassSelectionLevel <= 1 ? pack.subclasses.get(characterClass.subclassIds[0]) : undefined;
  if (characterClass.subclassSelectionLevel <= 1 && !subclass) return err(appError.validation("subclass", "A subclasse exigida por esta classe não está disponível."));
  const scoreOrder = [...new Set<Ability>([...characterClass.primaryAbilities, "con", "dex", "wis", ...abilities])].slice(0, 6);
  const scores = [15, 14, 13, 12, 10, 8];
  const baseScores = Object.fromEntries(scoreOrder.map((ability, index) => [ability, scores[index]])) as Record<Ability, number>;
  let lastProblem = "Nenhuma combinação automática válida foi encontrada para esta raça e classe.";

  for (const subrace of subraces) for (const background of pack.backgrounds.values()) {
    const usedProficiencies = new Set<string>([
      ...race.proficiencies.map((entry) => String(entry.entityId)),
      ...characterClass.initialProficiencies.map((entry) => String(entry.entityId)),
      ...background.skillProficiencies,
      ...(subrace?.traits.flatMap((trait) => trait.modifiers.filter((modifier) => modifier.operator === "grant-proficiency").map((modifier) => modifier.id)) ?? []),
    ]);
    const usedOptions = new Set<string>();
    const definitionChoices: { choice: ChoiceDefinition; grantingRef: DefinitionRef }[] = [
      ...race.choices.map((choice) => ({ choice, grantingRef: ref(race.id) })),
      ...(subrace?.choices.map((choice) => ({ choice, grantingRef: ref(subrace.id) })) ?? []),
      { choice: characterClass.skillChoices, grantingRef: ref(characterClass.id) },
      ...characterClass.initialEquipmentChoices.map((choice) => ({ choice, grantingRef: ref(characterClass.id) })),
      ...(characterClass.progression[0]?.choicesGranted.map((choice) => ({ choice, grantingRef: ref(characterClass.id) })) ?? []),
      ...background.toolChoices.map((choice) => ({ choice, grantingRef: ref(background.id) })),
      ...background.languageChoices.map((choice) => ({ choice, grantingRef: ref(background.id) })),
    ];
    const selections: ChoiceSelection[] = [];
    let unresolved = false;
    for (const { choice, grantingRef } of definitionChoices) {
      const selectedIds = choicesFor(choice, catalog, usedProficiencies, usedOptions);
      if (!selectedIds) { unresolved = true; lastProblem = `Não há opções válidas para ${choice.id}.`; break; }
      selections.push({ choiceId: choice.id, selectedIds, grantedAtLevel: 1, grantingRef });
    }
    if (unresolved) continue;
    const draft = createCharacterDraft({
      id: input.id ?? asUuid(crypto.randomUUID()),
      rulesetRef: { id: pack.manifest.id, version: pack.manifest.version },
      createdAt: now,
      partial: {
        name: input.name.trim(), raceRef: ref(race.id), ...(subrace ? { subraceRef: ref(subrace.id) } : {}),
        classes: [{ classId: characterClass.id, level: 1, ...(subclass ? { subclassId: subclass.id } : {}), choices: [] }],
        backgroundRef: ref(background.id),
        abilityGeneration: { method: "standard-array", baseScores },
        choices: selections,
      },
    });
    if (!draft.ok) return draft;
    const materialized = materializeCharacter(catalog, draft.value, { now, idGenerator: () => asUuid(crypto.randomUUID()) });
    if (materialized.ok) return ok(materialized.value.character);
    lastProblem = materialized.error[0]?.message ?? lastProblem;
  }
  return err(appError.validation("npc", `Não foi possível gerar esta ficha automaticamente: ${lastProblem}`));
}
