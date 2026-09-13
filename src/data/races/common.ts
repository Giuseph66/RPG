import { asEntityId, type DefinitionRef } from "@domain/contracts/ids";
import { type ChoiceDefinition, type ChoiceSelector, type RuleModifier, type SourceRef } from "@domain/contracts/primitives";
import { PHB_PTBR_LOCAL_2017_ID } from "@data/rulepacks/manifest";

export const RULESET_ID = PHB_PTBR_LOCAL_2017_ID;
export const RACE_CHAPTER = "Capítulo 2 — Raças";

export function ref(entityId: string): DefinitionRef {
  return { rulesetId: RULESET_ID, entityId: asEntityId(entityId) };
}

export function source(printedPage: number, section?: string): SourceRef {
  return {
    sourceId: RULESET_ID,
    chapter: RACE_CHAPTER,
    printedPage,
    pdfPage: printedPage - 1,
    ...(section ? { section } : {}),
  };
}

export function explicitChoice(
  id: string,
  kind: ChoiceDefinition["kind"],
  options: readonly string[],
  sourceRef: SourceRef,
  count = 1,
  unique = true,
): ChoiceDefinition {
  return {
    id,
    kind,
    count: { min: count, max: count },
    optionSet: { kind: "explicit", options: options.map(ref) },
    prerequisites: [],
    unique,
    sourceRefs: [sourceRef],
  };
}

export function selectorChoice(
  id: string,
  kind: ChoiceDefinition["kind"],
  selector: ChoiceSelector,
  sourceRef: SourceRef,
  count = 1,
  unique = true,
): ChoiceDefinition {
  return {
    id,
    kind,
    count: { min: count, max: count },
    optionSet: { kind: "selector", selector },
    prerequisites: [],
    unique,
    sourceRefs: [sourceRef],
  };
}

export function modifier(
  id: string,
  sourceRef: SourceRef,
  target: RuleModifier["target"],
  operator: RuleModifier["operator"],
  value: RuleModifier["value"],
  predicate: RuleModifier["predicate"] = { kind: "always" },
): RuleModifier {
  return { id, sourceRef, target, operator, value, predicate };
}

export function customTraitModifier(
  id: string,
  sourceRef: SourceRef,
  description: string,
  predicate: RuleModifier["predicate"] = { kind: "always" },
): RuleModifier {
  return modifier(id, sourceRef, { kind: "custom", description }, "annotate", { kind: "flag" }, predicate);
}

export function contextualAdvantageModifier(id: string, sourceRef: SourceRef, description: string): RuleModifier {
  return modifier(id, sourceRef, { kind: "custom", description }, "grant-advantage", { kind: "flag" });
}

export function contextualResistanceModifier(id: string, sourceRef: SourceRef, description: string, damageType: RuleModifier["value"]): RuleModifier {
  return modifier(id, sourceRef, { kind: "custom", description }, "grant-resistance", damageType);
}

export function levelPredicate(level: number): RuleModifier["predicate"] {
  return { kind: "min-total-level", level };
}
