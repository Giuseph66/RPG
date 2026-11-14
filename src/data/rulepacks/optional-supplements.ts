import { type EntityId, asEntityId } from "@domain/contracts/ids";
import type { OptionalRuleContentPack } from "@domain/contracts/definitions/rulepack";
import { FAIRY_OPTIONAL_PACK } from "@data/races/fairy";
import { TASHA_RANGER_OPTIONAL_PACK } from "@data/classes/tasha-ranger";
import { variantHuman } from "@data/races/races";

export const VARIANT_HUMAN_SUPPLEMENT_ID = asEntityId("variant-human-option");
/** LdJ cap. 2, p. 31: humano variante é opção de campanha que usa a regra opcional de talentos. */
export const VARIANT_HUMAN_OPTIONAL_PACK: OptionalRuleContentPack = {
  id: VARIANT_HUMAN_SUPPLEMENT_ID, name: "Humano variante", sourceRefs: variantHuman.sourceRefs, races: [variantHuman],
};

export const OPTIONAL_RULE_PACK_LIST: readonly OptionalRuleContentPack[] = [FAIRY_OPTIONAL_PACK, TASHA_RANGER_OPTIONAL_PACK, VARIANT_HUMAN_OPTIONAL_PACK];
export const OPTIONAL_RULE_PACKS: ReadonlyMap<EntityId, OptionalRuleContentPack> = new Map(
  OPTIONAL_RULE_PACK_LIST.map((pack) => [pack.id, pack]),
);

export const FAIRY_SUPPLEMENT_ID = asEntityId("fairy-supplement");
export const TASHA_RANGER_SUPPLEMENT_ID = asEntityId("tasha-ranger-options");
