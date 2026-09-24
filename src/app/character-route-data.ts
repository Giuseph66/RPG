/**
 * Dados resolvidos do rule pack para a rota da ficha. Os componentes de feature não
 * consultam o pack: recebem listas e totais prontos daqui.
 */
import type { Character } from "@domain/contracts/character";
import type { CharacterDerived } from "@domain/contracts/derived";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { DefinitionRef } from "@domain/contracts/ids";
import type { InventoryCarrying, InventoryCatalogOption } from "@features/inventory";
import type { SheetEquipmentInfo, SheetSpellOption } from "@features/character/sheet";
import { carryingCapacityGrams } from "@data/rules/encumbrance";
import { EXTRACTED_PHB_SPELLS } from "@data/spells/spells-book-catalog";

/** Itens concretos do catálogo (sem escolhas abstratas como "símbolo sagrado à escolha"). */
export function equipmentCatalog(pack: RulePack | undefined): readonly InventoryCatalogOption[] {
  if (!pack) return [];
  return [...pack.equipment.values()]
    .filter((definition) => !(definition.tags as readonly string[]).includes("background-grant") && !definition.name.includes("(à escolha)"))
    .map((definition) => ({
      equipmentRef: { rulesetId: pack.manifest.id, entityId: definition.id },
      name: definition.name,
      category: definition.category,
      unitWeightGrams: definition.weightGrams,
      unitValueCp: definition.valueCp,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function equipmentInfo(pack: RulePack | undefined, entityId: string): SheetEquipmentInfo | undefined {
  const definition = pack?.equipment.get(entityId as never);
  return definition ? { category: definition.category, weightGrams: Number(definition.weightGrams) } : undefined;
}

/** Peso total do inventário e capacidade do livro (7,5 kg × Força). */
export function carryingFor(character: Character, derived: CharacterDerived | undefined, pack: RulePack | undefined): InventoryCarrying | undefined {
  const strength = derived?.abilityScores.find((entry) => entry.ability === "str")?.score.value;
  if (strength === undefined || !pack) return undefined;
  const totalGrams = character.inventory.reduce((sum, item) => sum + Number(pack.equipment.get(item.equipmentRef.entityId)?.weightGrams ?? 0) * item.quantity, 0);
  return {
    totalGrams,
    capacityGrams: carryingCapacityGrams(strength),
    strengthScore: strength,
  };
}

const SCHOOL_BY_PT: ReadonlyArray<readonly [RegExp, string]> = [
  [/^a?bjura/, "abjuration"], [/^conjura/, "conjuration"], [/^adivinha/, "divination"], [/^encant/, "enchantment"],
  [/^evoca/, "evocation"], [/^ilus/, "illusion"], [/^necro/, "necromancy"], [/^transmuta/, "transmutation"],
];

function schoolKey(schoolPtBr: string): string {
  const normalized = schoolPtBr.trim().toLowerCase();
  return SCHOOL_BY_PT.find(([pattern]) => pattern.test(normalized))?.[1] ?? normalized;
}

/**
 * Magias da lista das classes conjuradoras do personagem, até o maior círculo de espaço
 * disponível. Usa o catálogo completo extraído do capítulo 11; o rule pack, quando cobre
 * a magia, fornece o mesmo id (as refs continuam resolvíveis pelo Rules Engine).
 */
export function spellOptionsFor(character: Character, pack: RulePack | undefined): readonly SheetSpellOption[] {
  if (!pack) return [];
  const classIds = new Set(character.castingSources.map((source) => String(source.grantingRef.entityId)));
  if (classIds.size === 0) return [];
  const maxSlot = character.spellSlots.reduce((max, slot) => Math.max(max, slot.slotLevel), 0);
  return EXTRACTED_PHB_SPELLS
    .filter((spell) => spell.classes.some((classId) => classIds.has(classId)) && spell.level <= maxSlot)
    .map((spell) => {
      const structured = pack.spells.get(spell.id as never);
      return {
        ref: { rulesetId: pack.manifest.id, entityId: (structured?.id ?? spell.id) as never },
        name: structured?.name ?? spell.name,
        level: spell.level,
        school: structured?.school ?? schoolKey(spell.schoolPtBr),
        ritual: spell.ritual,
        concentration: structured?.concentration ?? /concentra/i.test(spell.duration),
      };
    })
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
}

export function conditionOptionsFor(pack: RulePack | undefined): readonly { readonly ref: DefinitionRef; readonly name: string }[] {
  if (!pack) return [];
  return [...pack.conditions.values()]
    .map((condition) => ({ ref: { rulesetId: pack.manifest.id, entityId: condition.id }, name: condition.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
