import { CHARACTER_SCHEMA_VERSION, type Character, type CharacterDraft, type ClassLevel, type AbilityGeneration } from "@domain/contracts/character";
import { appError, err, ok, type Result } from "@domain/contracts/errors";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { asUuid, type Uuid } from "@domain/contracts/ids";
import { type DefinitionRef, type IsoTimestamp } from "@domain/contracts/ids";
import { type ChoiceSelection } from "@domain/contracts/primitives";
import { deriveCharacter } from "@domain/rules/derived";
import { asCreationCatalog, type CreationCatalogInput, type CreationCatalog, type CreationIssue, type MaterializeOptions, type MaterializedCharacter } from "./model";
import { validateCharacterCreation } from "./validate";

function fallbackId(purpose: string, index: number): Uuid {
  const namespace = [...purpose].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) & 0xffffff, 0);
  const suffix = `${namespace.toString(16).padStart(6, "0")}${index.toString(16).padStart(6, "0")}`;
  return asUuid(`00000000-0000-4000-8000-${suffix}`);
}

function makeId(options: MaterializeOptions, purpose: string, index: number): Uuid {
  return options.idGenerator?.(purpose, index) ?? fallbackId(purpose, index);
}

function issuesAsError(issues: readonly CreationIssue[]): readonly CreationIssue[] { return issues; }
function localRef(ref: DefinitionRef, rulesetId: CreationCatalog["rulePack"]["manifest"]["id"]): boolean { return ref.rulesetId === rulesetId; }

function initialEquipment(
  draft: CharacterDraft,
  catalog: CreationCatalog,
  options: MaterializeOptions,
): Result<Pick<Character, "inventory" | "currency">, readonly CreationIssue[]> {
  const pack = catalog.rulePack;
  const selected = (draft.partial.choices ?? []).flatMap((selection) => {
    const choiceId = selection.choiceId.toLowerCase();
    return choiceId.includes("equipment") || choiceId.includes("pack") ? selection.selectedIds : [];
  });
  const refs: { readonly equipmentRef: DefinitionRef; readonly quantity: number }[] = [];
  const background = draft.partial.backgroundRef && pack.backgrounds.get(draft.partial.backgroundRef.entityId);
  for (const grant of background?.equipment ?? []) refs.push(grant);
  let index = 0;
  for (const selectedRef of selected) {
    const bundle = catalog.equipmentBundles?.find((candidate) => candidate.id === selectedRef.entityId);
    if (bundle) {
      for (const grant of bundle.grants) refs.push(grant);
      for (const choice of bundle.choices) {
        // A bundle-level unresolved choice stays explicit; accepting it would invent equipment.
        if (choice.count.min > 0) return err([{
          code: "required-choice", field: `equipment.${choice.id}`, message: `Escolha interna do pacote "${bundle.id}" não foi resolvida.`, sourceRefs: choice.sourceRefs,
        }]);
      }
      continue;
    }
    if (pack.equipment.has(selectedRef.entityId)) refs.push({ equipmentRef: selectedRef, quantity: 1 });
  }
  const inventory = refs.map((grant) => ({
    id: makeId(options, "inventory", index++), equipmentRef: grant.equipmentRef, quantity: grant.quantity, equippedState: "carried" as const,
    notes: "",
  }));
  return ok({ inventory, currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } });
}

function spellState(draft: CharacterDraft, catalog: CreationCatalog, options: MaterializeOptions, classLevel: ClassLevel): Pick<Character, "castingSources" | "spellSlots" | "spellbookEntries" | "preparedSelections"> {
  const pack = catalog.rulePack;
  const definition = pack.classes.get(classLevel.classId);
  const castsAtLevelOne = definition?.progression[0]?.featureRefs.some((ref) => String(ref.entityId).endsWith(".spellcasting"));
  if (!definition?.spellcasting || !castsAtLevelOne) return { castingSources: [], spellSlots: [], spellbookEntries: [], preparedSelections: [] };
  const sourceId = makeId(options, "casting-source", 0);
  const sourceRef: DefinitionRef = { rulesetId: pack.manifest.id, entityId: classLevel.classId };
  const selections = (draft.partial.choices ?? []).filter((selection) => selection.choiceId.toLowerCase().includes("spell") || selection.choiceId.toLowerCase().includes("cantrip"));
  const spellRefs = selections.flatMap((selection) => selection.selectedIds).filter((ref) => pack.spells.has(ref.entityId));
  const known = definition.spellcasting.kind === "known" ? spellRefs : [];
  const prepared = definition.spellcasting.kind === "prepared" ? spellRefs : [];
  const spellbook = definition.spellcasting.kind === "spellbook-prepared" ? spellRefs : [];
  const slots = (definition.progression[0]?.spellSlotsGranted?.slotsByLevel ?? []).map((entry, index) => ({ poolId: makeId(options, "spell-slot", index + 1), kind: definition.spellcasting?.progressionType === "pact" ? "pact" as const : "spellcasting" as const, slotLevel: entry.slotLevel, spent: 0 }));
  return {
    castingSources: [{ id: sourceId, grantingRef: sourceRef, ability: definition.spellcasting.ability, knownSpellRefs: known, preparedSpellRefs: prepared, spellbookRefs: spellbook, resourcePoolIds: slots.map((slot) => slot.poolId) }],
    spellSlots: slots,
    spellbookEntries: spellbook.map((spellRef, index) => ({ id: makeId(options, "spellbook", index), spellRef, castingSourceId: sourceId })),
    preparedSelections: [...prepared, ...spellbook].map((spellRef) => ({ castingSourceId: sourceId, spellRef, alwaysPrepared: false })),
  };
}

export function materializeCharacter(input: CreationCatalogInput, draft: CharacterDraft, options: MaterializeOptions = {}): Result<MaterializedCharacter, readonly CreationIssue[]> {
  const catalog = asCreationCatalog(input);
  const validation = validateCharacterCreation(catalog, draft);
  if (!validation.valid) return err(issuesAsError(validation.issues));
  const pack = catalog.rulePack;
  const partial = draft.partial;
  const equipment = initialEquipment(draft, catalog, options);
  if (!equipment.ok) return equipment;
  const classRef = partial.classes?.[0];
  if (!classRef || !partial.raceRef || !partial.backgroundRef || !partial.abilityGeneration) return err([{
    code: "required-choice", field: "partial", message: "Decisões essenciais estão ausentes.",
  }]);
  const classDefinition = pack.classes.get(classRef.classId);
  if (!classDefinition) return err([{ code: "invalid-reference", field: "classes[0]", message: "Classe não encontrada." }]);
  const abilityGeneration = partial.abilityGeneration as AbilityGeneration;
  const levelClass: ClassLevel = { classId: classRef.classId, level: 1, ...(classRef.subclassId ? { subclassId: classRef.subclassId } : {}), choices: [] };
  const now = options.now ?? draft.updatedAt;
  const revision: Revision = options.revision ?? asRevision(0);
  const progressionEntry = classDefinition.progression[0];
  const hpGainId = makeId(options, "progression", 0);
  const character: Character = {
    id: draft.id, schemaVersion: CHARACTER_SCHEMA_VERSION, revision, rulesetRef: draft.rulesetRef, createdAt: draft.createdAt, updatedAt: now,
    name: partial.name!.trim(), ...(partial.playerName === undefined ? {} : { playerName: partial.playerName }), raceRef: partial.raceRef, ...(partial.subraceRef ? { subraceRef: partial.subraceRef } : {}), backgroundRef: partial.backgroundRef,
    appearance: partial.appearance ?? "", personalityTraits: partial.personalityTraits ?? [], ideals: partial.ideals ?? [], bonds: partial.bonds ?? [], flaws: partial.flaws ?? [], history: partial.history ?? "",
    classes: [levelClass], abilityGeneration, choices: partial.choices ?? [], progressionHistory: [{ id: hpGainId, classId: classDefinition.id, level: 1, hitPointGain: { kind: "first-level-max", amount: classDefinition.hitDie }, choices: [], recordedAt: now }],
    xp: 0, inspiration: false, hp: { current: classDefinition.hitDie, temp: 0 }, hitDiceSpent: [{ classId: classDefinition.id, hitDie: classDefinition.hitDie, spent: 0 }], deathSaves: { successes: 0, failures: 0, stable: false }, conditions: [],
    resources: (progressionEntry?.resourceChanges ?? []).map((change, index) => ({ id: makeId(options, "resource", index), definitionRef: change.resourceRef, ownerInstanceId: draft.id, spent: 0 })), pendingResolutions: [], inventory: equipment.value.inventory, currency: equipment.value.currency,
    ...spellState(draft, catalog, options, levelClass), manualAdjustments: [],
  };
  const context = options.context ?? { gameTime: { day: 0, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] };
  const derived = deriveCharacter(character, pack, context);
  if (!derived.ok) return err([{ code: derived.error.code === "unresolved-rule" ? "unresolved-source" : "invalid-reference", field: "derived", message: derived.error.message }]);
  return ok({ character: { ...character, hp: { current: derived.value.hitPointsMax.value, temp: 0 } }, derived: derived.value });
}
