import { asEntityId, asRulesetId, type DefinitionRef, type EntityId, type RulesetId } from "@domain/contracts/ids";
import { type SourceRef } from "@domain/contracts/primitives";

/** Identidade do pack local; IDs de magia não dependem da tradução do nome. */
export const RULESET_ID: RulesetId = asRulesetId("phb-ptbr-local-2017");

export function spellRef(entityId: string): DefinitionRef {
  return { rulesetId: RULESET_ID, entityId: asEntityId(entityId) };
}

export function spellSource(printedPage: number, pdfPage: number, section: string): SourceRef {
  return {
    sourceId: RULESET_ID,
    chapter: "Capítulo 11 — Magias",
    printedPage,
    pdfPage,
    section,
  };
}

export function spellId(value: string): EntityId {
  return asEntityId(value);
}
