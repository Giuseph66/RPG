/**
 * Dados resolvidos do rule pack para a rota da ficha. Os componentes de feature não
 * consultam o pack: recebem listas e totais prontos daqui.
 */
import type { Character } from "@domain/contracts/character";
import type { CharacterDerived } from "@domain/contracts/derived";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { DefinitionRef } from "@domain/contracts/ids";
import type { InventoryCarrying, InventoryCatalogOption } from "@features/inventory";
import type { ActionAttackRoll, ActionSpellRoll } from "@features/actions";
import { DAMAGE_LABELS } from "@features/character/sheet/mapping";
import { DICE_FACES, type Ability, type DiceFaces } from "@domain/contracts/primitives";
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

const DAMAGE_TYPE_WORDS = /de dano (\w+)/i;

function abilityModifier(derived: CharacterDerived, ability: Ability): number {
  return derived.abilityScores.find((entry) => entry.ability === ability)?.modifier.value ?? 0;
}

function asFaces(value: number): DiceFaces | undefined {
  return (DICE_FACES as readonly number[]).includes(value) ? value as DiceFaces : undefined;
}

/** Armas equipadas com bônus e dano derivados pela ficha, mais o ataque desarmado. */
export function attackRollsFor(character: Character, derived: CharacterDerived | undefined, pack: RulePack | undefined): readonly ActionAttackRoll[] {
  if (!derived) return [];
  const weapons = derived.attacks.map((attack, index) => {
    const part = attack.damageParts[0];
    const name = pack?.equipment.get(attack.sourceRef.entityId)?.name ?? String(attack.sourceRef.entityId);
    return {
      id: `weapon:${index}:${String(attack.sourceRef.entityId)}`,
      name,
      attackBonus: attack.attackModifier.value,
      ...(part ? { damage: { quantity: part.expression.quantity, faces: part.expression.faces, modifier: part.modifierBonus.value, typeLabel: DAMAGE_LABELS[part.damageType] } } : {}),
    };
  });
  // Livro do Jogador, cap. 9: ataque desarmado usa FOR + proficiência e causa 1 + FOR de dano.
  const strength = abilityModifier(derived, "str");
  const unarmed = { id: "unarmed", name: "Ataque desarmado", attackBonus: strength + derived.proficiencyBonus.value, fixedDamage: `${Math.max(1, 1 + strength)} de dano contundente` };
  return character ? [...weapons, unarmed] : weapons;
}

/** Nomes das armas carregadas mas não equipadas (para sugerir equipar na ficha). */
export function unequippedWeaponsFor(character: Character, pack: RulePack | undefined): readonly string[] {
  if (!pack) return [];
  return character.inventory
    .filter((item) => item.equippedState !== "equipped" && pack.equipment.get(item.equipmentRef.entityId)?.category === "weapon")
    .map((item) => item.customName || pack.equipment.get(item.equipmentRef.entityId)?.name || String(item.equipmentRef.entityId));
}

/**
 * Magias conhecidas/preparadas com o que dá para rolar, lido do texto do livro (cap. 11):
 * ataque mágico, teste de resistência (CD e atributo) e o primeiro dado de dano ou cura.
 * Truques escalam nos níveis 5, 11 e 17; "+ seu modificador de habilidade de conjuração"
 * soma o atributo da fonte.
 */
export function spellRollsFor(character: Character, derived: CharacterDerived | undefined, pack: RulePack | undefined): readonly ActionSpellRoll[] {
  if (!derived) return [];
  const totalLevel = character.classes.reduce((sum, entry) => sum + entry.level, 0);
  const cantripTier = 1 + Number(totalLevel >= 5) + Number(totalLevel >= 11) + Number(totalLevel >= 17);
  const rolls: ActionSpellRoll[] = [];
  const seen = new Set<string>();
  for (const source of character.castingSources) {
    const casting = derived.spellcastingSources.find((entry) => entry.castingSourceId === source.id);
    const abilityMod = abilityModifier(derived, source.ability);
    for (const ref of [...source.knownSpellRefs, ...source.preparedSpellRefs, ...source.spellbookRefs]) {
      const id = String(ref.entityId);
      if (seen.has(id)) continue;
      seen.add(id);
      const book = EXTRACTED_PHB_SPELLS.find((spell) => spell.id === id);
      const name = pack?.spells.get(ref.entityId)?.name ?? book?.name ?? id;
      const level = book?.level ?? pack?.spells.get(ref.entityId)?.level ?? 0;
      const text = (book?.description ?? "").replace(/\s+/g, " ");
      const attackBonus = casting?.spellAttackModifier.value ?? abilityMod + derived.proficiencyBonus.value;
      const roll: { -readonly [K in keyof ActionSpellRoll]: ActionSpellRoll[K] } = { id, name, level };

      const weaponDie = text.match(/dado de dano da arma se torna um d(\d+)/i);
      if (weaponDie) {
        // Bordão Místico e afins: a arma usa o atributo de conjuração no ataque e no dano.
        const faces = asFaces(Number(weaponDie[1]));
        roll.attackBonus = attackBonus;
        if (faces) roll.effect = { kind: "damage", quantity: 1, faces, modifier: abilityMod, typeLabel: "contundente" };
        rolls.push(roll);
        continue;
      }
      if (/ataque [^.]{0,40}com magia/i.test(text)) roll.attackBonus = attackBonus;
      const save = text.match(/teste de resist[êe]ncia de (\p{L}+)/iu);
      if (save) {
        roll.saveAbility = save[1];
        roll.saveDc = casting?.spellSaveDc.value ?? 8 + derived.proficiencyBonus.value + abilityMod;
      }
      const sentence = text.split(/(?<=\.)\s/).find((part) => /\d+d\d+/.test(part));
      const dice = sentence?.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
      const faces = dice ? asFaces(Number(dice[2])) : undefined;
      if (dice && faces && sentence) {
        const healing = /recupera|pontos de vida/i.test(sentence) && !/de dano/i.test(sentence);
        const flat = dice[3] ? Number(dice[3]) : 0;
        const withAbility = /modificador de habilidade de conjura/i.test(sentence) ? abilityMod : 0;
        const scales = level === 0 && /aumenta em \d+d\d+ quando voc[êe] alcan[çc]a o 5/i.test(text);
        roll.effect = {
          kind: healing ? "healing" : "damage",
          quantity: Number(dice[1]) * (scales ? cantripTier : 1),
          faces,
          modifier: flat + withAbility,
          ...(healing ? {} : { typeLabel: sentence.match(DAMAGE_TYPE_WORDS)?.[1] }),
        };
      }
      rolls.push(roll);
    }
  }
  return rolls.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
}
