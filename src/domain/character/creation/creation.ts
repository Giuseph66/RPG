import { CHARACTER_DRAFT_SCHEMA_VERSION, type CharacterDraft, type CharacterDraftPartial, type CharacterDraftStep } from "@domain/contracts/character";
import { appError, err, ok, type Result } from "@domain/contracts/errors";
import { type CreationDecision, type CreateCharacterDraftInput, CREATION_STEPS } from "./model";

function nextStep(completed: readonly CharacterDraftStep[]): CharacterDraftStep {
  return CREATION_STEPS.find((step) => !completed.includes(step)) ?? "review";
}

export function createCharacterDraft(input: CreateCharacterDraftInput): Result<CharacterDraft, ReturnType<typeof appError.validation>> {
  if (!input.id || !input.rulesetRef?.id || !input.rulesetRef.version) {
    return err(appError.validation("draft", "id e rulesetRef são obrigatórios."));
  }
  const updatedAt = input.updatedAt ?? input.createdAt;
  const partial = input.partial ?? {};
  const completed = CREATION_STEPS.filter((step) => {
    if (step === "race") return partial.raceRef !== undefined;
    if (step === "class") return partial.classes !== undefined;
    if (step === "background") return partial.backgroundRef !== undefined;
    if (step === "ability-scores") return partial.abilityGeneration !== undefined;
    if (step === "equipment") return partial.inventory !== undefined;
    if (step === "spells") return partial.castingSources !== undefined;
    if (step === "details") return partial.appearance !== undefined;
    return false;
  });
  return ok({
    id: input.id,
    schemaVersion: CHARACTER_DRAFT_SCHEMA_VERSION,
    rulesetRef: input.rulesetRef,
    completedSteps: completed,
    currentStep: nextStep(completed),
    partial,
    pendingValidations: [],
    createdAt: input.createdAt,
    updatedAt,
  });
}

function mergeSelections(current: CharacterDraftPartial["choices"], incoming: NonNullable<CharacterDraftPartial["choices"]>): NonNullable<CharacterDraftPartial["choices"]> {
  const byChoice = new Map((current ?? []).map((selection) => [selection.choiceId, selection]));
  for (const selection of incoming) byChoice.set(selection.choiceId, selection);
  return [...byChoice.values()];
}

/** Aplica uma decisão imutavelmente; decisões posteriores substituem apenas a mesma etapa. */
export function applyCreationDecision(draft: CharacterDraft, decision: CreationDecision): Result<CharacterDraft, ReturnType<typeof appError.validation>> {
  let partial: CharacterDraftPartial = draft.partial;
  let completedStep: CharacterDraftStep | undefined;
  switch (decision.kind) {
    case "identity": partial = { ...partial, name: decision.name, ...(decision.playerName === undefined ? {} : { playerName: decision.playerName }) }; break;
    case "race": partial = { ...partial, raceRef: decision.raceRef, choices: [], ...(decision.subraceRef === undefined ? { subraceRef: undefined } : { subraceRef: decision.subraceRef }) }; completedStep = "race"; break;
    case "class": partial = { ...partial, classRef: decision.classRef, classes: [{ classId: decision.classRef.entityId, level: 1, ...(decision.subclassRef ? { subclassId: decision.subclassRef.entityId } : {}), choices: [] }], choices: [] } as CharacterDraftPartial; completedStep = "class"; break;
    case "background": partial = { ...partial, backgroundRef: decision.backgroundRef, choices: [], ...(decision.variantId === undefined ? {} : { backgroundVariantId: decision.variantId }) } as CharacterDraftPartial; completedStep = "background"; break;
    case "ability-scores": partial = { ...partial, abilityGeneration: decision.method }; completedStep = "ability-scores"; break;
    case "choices":
      partial = { ...partial, choices: mergeSelections(partial.choices, decision.selections) };
      break;
    case "equipment":
      partial = { ...partial, choices: mergeSelections(partial.choices, decision.selections) };
      completedStep = "equipment";
      break;
    case "spells":
      partial = { ...partial, choices: mergeSelections(partial.choices, decision.selections) };
      completedStep = "spells";
      break;
    case "details": partial = { ...partial, ...decision.details }; completedStep = "details"; break;
    default: return err(appError.validation("decision", "Decisão de criação desconhecida."));
  }
  const completed = completedStep && !draft.completedSteps.includes(completedStep)
    ? [...draft.completedSteps, completedStep]
    : draft.completedSteps;
  return ok({ ...draft, partial, completedSteps: completed, currentStep: nextStep(completed), pendingValidations: [], updatedAt: draft.updatedAt });
}
