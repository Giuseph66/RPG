import { CHARACTER_SCHEMA_VERSION, type Character, type CharacterDraft, type ClassLevel, type AbilityGeneration } from "@domain/contracts/character";
import { appError, err, ok, type Result } from "@domain/contracts/errors";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { asUuid, type Uuid } from "@domain/contracts/ids";
import { type DefinitionRef, type IsoTimestamp } from "@domain/contracts/ids";
import { type ChoiceSelection } from "@domain/contracts/primitives";
import { deriveCharacter } from "@domain/rules/derived";
import { asCreationCatalog, type CreationCatalogInput, type CreationCatalog, type CreationIssue, type MaterializeOptions, type MaterializedCharacter } from "./model";
import { validateCharacterCreation } from "./validate";
import { syncSpellcasting } from "@domain/character/evolution/spell-state";
import { defaultBaseScore } from "./limits";

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
      // Escolhas internas do pacote ficam em aberto; não inventamos equipamento por elas.
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

/** Atributos não preenchidos (ausentes ou 0) viram 10, ou 8 na compra de pontos. */
function withDefaultScores(generation: CharacterDraft["partial"]["abilityGeneration"]): AbilityGeneration {
  return {
    ...(generation ?? { method: "manual" as const }),
    baseScores: { str: defaultBaseScore(generation, "str"), dex: defaultBaseScore(generation, "dex"), con: defaultBaseScore(generation, "con"), int: defaultBaseScore(generation, "int"), wis: defaultBaseScore(generation, "wis"), cha: defaultBaseScore(generation, "cha") },
  } as AbilityGeneration;
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
  if (!classRef || !partial.raceRef) return err([{
    code: "required-choice", field: "partial", message: "Decisões essenciais estão ausentes.",
  }]);
  const classDefinition = pack.classes.get(classRef.classId);
  if (!classDefinition) return err([{ code: "invalid-reference", field: "classes[0]", message: "Classe não encontrada." }]);
  const abilityGeneration = withDefaultScores(partial.abilityGeneration);
  const levelClass: ClassLevel = { classId: classRef.classId, level: 1, ...(classRef.subclassId ? { subclassId: classRef.subclassId } : {}), choices: [] };
  const now = options.now ?? draft.updatedAt;
  const revision: Revision = options.revision ?? asRevision(0);
  const progressionEntry = classDefinition.progression[0];
  const hpGainId = makeId(options, "progression", 0);
  const base: Character = {
    id: draft.id, schemaVersion: CHARACTER_SCHEMA_VERSION, revision, rulesetRef: draft.rulesetRef, createdAt: draft.createdAt, updatedAt: now,
    name: partial.name?.trim() || "Aventureiro sem nome", ...(partial.playerName === undefined ? {} : { playerName: partial.playerName }), raceRef: partial.raceRef, ...(partial.subraceRef ? { subraceRef: partial.subraceRef } : {}), ...(partial.backgroundRef ? { backgroundRef: partial.backgroundRef } : {}),
    appearance: partial.appearance ?? "", personalityTraits: partial.personalityTraits ?? [], ideals: partial.ideals ?? [], bonds: partial.bonds ?? [], flaws: partial.flaws ?? [], history: partial.history ?? "",
    classes: [levelClass], abilityGeneration, choices: partial.choices ?? [], progressionHistory: [{ id: hpGainId, classId: classDefinition.id, level: 1, hitPointGain: { kind: "first-level-max", amount: classDefinition.hitDie }, choices: [], recordedAt: now }],
    xp: 0, inspiration: false, hp: { current: classDefinition.hitDie, temp: 0 }, hitDiceSpent: [{ classId: classDefinition.id, hitDie: classDefinition.hitDie, spent: 0 }], deathSaves: { successes: 0, failures: 0, stable: false }, conditions: [],
    resources: (progressionEntry?.resourceChanges ?? []).map((change, index) => ({ id: makeId(options, "resource", index), definitionRef: change.resourceRef, ownerInstanceId: draft.id, spent: 0 })), pendingResolutions: [], inventory: equipment.value.inventory, currency: equipment.value.currency,
    castingSources: [], spellSlots: [], spellbookEntries: [], preparedSelections: [], manualAdjustments: [],
  };
  const context = options.context ?? { gameTime: { day: 0, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] };
  const character = syncSpellcasting(base, pack, partial.choices ?? [], { autoPrepare: true, ...(options.idGenerator ? { idGenerator: options.idGenerator } : {}) });
  const derived = deriveCharacter(character, pack, context);
  if (!derived.ok) return err([{ code: derived.error.code === "unresolved-rule" ? "unresolved-source" : "invalid-reference", field: "derived", message: derived.error.message }]);
  return ok({ character: { ...character, hp: { current: derived.value.hitPointsMax.value, temp: 0 } }, derived: derived.value });
}
