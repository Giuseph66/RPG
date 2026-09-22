/**
 * Registro para o agente integrar as descrições sem gerar IDs artificiais `book-*`.
 * Regra: quando a extração já possui `id`, preserve esse ID no Compêndio.
 */
import { PHB_SUBRACE_DESCRIPTIONS } from "@data/correto/descricoes/subraces";
import { PHB_SUBCLASS_DESCRIPTIONS } from "@data/correto/descricoes/subclasses";
import { PHB_FEATURE_DESCRIPTIONS } from "@data/correto/descricoes/features";
import { PHB_RESOURCE_DESCRIPTIONS } from "@data/correto/descricoes/resources";
import { PHB_TOTAL_LEVEL_PROGRESSION_DESCRIPTION } from "./progression-general";
import { PHB_REST_MISSING_DESCRIPTIONS } from "./rest-missing";
import { PHB_MOVEMENT_MISSING_DESCRIPTIONS } from "./movement-missing";
import { PHB_ARMOR_ITEM_DESCRIPTIONS } from "./armor-items";
import { PHB_SPECIAL_WEAPON_DESCRIPTIONS } from "./weapon-specials";

export const PHB_CANONICAL_DESCRIPTION_REGISTRY = [
  ...PHB_SUBRACE_DESCRIPTIONS.map((entry) => ({ ...entry, category: "subrace" as const })),
  ...PHB_SUBCLASS_DESCRIPTIONS.map((entry) => ({ ...entry, category: "subclass" as const })),
  ...PHB_FEATURE_DESCRIPTIONS.featureBlocks.map((entry) => ({ ...entry, category: "feature" as const })),
  ...PHB_RESOURCE_DESCRIPTIONS.map((entry) => ({ ...entry, category: "resource" as const })),
  PHB_TOTAL_LEVEL_PROGRESSION_DESCRIPTION,
  ...PHB_REST_MISSING_DESCRIPTIONS,
  ...PHB_MOVEMENT_MISSING_DESCRIPTIONS,
  ...PHB_ARMOR_ITEM_DESCRIPTIONS,
  ...PHB_SPECIAL_WEAPON_DESCRIPTIONS,
] as const;

export function findCanonicalDescription(category: string, id: string) {
  return PHB_CANONICAL_DESCRIPTION_REGISTRY.find((entry) => entry.category === category && entry.id === id);
}

export default PHB_CANONICAL_DESCRIPTION_REGISTRY;
