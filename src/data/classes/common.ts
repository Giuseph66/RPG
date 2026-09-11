import { asEntityId, type DefinitionRef, type EntityId } from "@domain/contracts/ids";
import { type ChoiceDefinition, type ChoiceSelector, type SourceRef } from "@domain/contracts/primitives";
import { PHB_PTBR_LOCAL_2017_ID } from "@data/rulepacks/manifest";

export const RULESET_ID = PHB_PTBR_LOCAL_2017_ID;

export function ref(entityId: string): DefinitionRef {
  return { rulesetId: RULESET_ID, entityId: asEntityId(entityId) };
}

export function id(entityId: string): EntityId {
  return asEntityId(entityId);
}

export function source(printedPage: number, pdfPage: number, section?: string): SourceRef {
  return {
    sourceId: RULESET_ID,
    chapter: "Capítulo 3 — Classes",
    printedPage,
    pdfPage,
    ...(section ? { section } : {}),
  };
}

export function choice(
  choiceId: string,
  kind: ChoiceDefinition["kind"],
  count: number,
  selector: ChoiceSelector,
  sourceRef: SourceRef,
): ChoiceDefinition {
  return {
    id: choiceId,
    kind,
    count: { min: count, max: count },
    optionSet: { kind: "selector", selector },
    prerequisites: [],
    unique: true,
    sourceRefs: [sourceRef],
  };
}

export function featureRef(featureId: string): DefinitionRef {
  return ref(featureId);
}
