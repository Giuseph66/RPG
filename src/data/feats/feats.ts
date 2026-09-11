import { type FeatDefinition } from "@domain/contracts/definitions/feat";
import { type Prerequisite, type RuleModifier } from "@domain/contracts/primitives";
import { asEntityId } from "@domain/contracts/ids";
import { ref, RULESET_ID } from "@data/classes/common";

type FeatSpec = { id: string; name: string; page: number; pdfPage: number; prerequisite?: Prerequisite; scoreAbility?: "str" | "dex" | "con" | "int" | "wis" | "cha"; repeatable?: boolean; choice?: "ability" | "spell-list" | "skill-or-tool" | "element" };
const FLEXIBLE_ABILITY_CHOICES: Readonly<Record<string, readonly ("str" | "dex" | "con" | "int" | "wis" | "cha")[]>> = {
  athlete: ["str", "dex"],
  "tavern-brawler": ["str", "con"],
  "weapon-master": ["str", "dex"],
  observant: ["int", "wis"],
  "lightly-armored": ["str", "dex"],
  "moderately-armored": ["str", "dex"],
};
const spellcasting: Prerequisite = { kind: "spellcasting-ability-present" };
const source = (page: number, pdfPage: number) => ({ sourceId: RULESET_ID, chapter: "Capítulo 6 — Opções de Personalização", printedPage: page, pdfPage });
/** Pendências sem campo próprio no contrato de talento; consumidores devem manter a seleção assistida. */
export const FEAT_PENDING_DECISIONS: Readonly<Record<string, readonly string[]>> = {
  grappler: ["PEND-018"],
  "medium-armor-master": ["PEND-019"],
};
const abilityScore = (id: string, ability: FeatSpec["scoreAbility"], sourceRef: ReturnType<typeof source>): RuleModifier[] => ability ? [{ id: `${id}.ability-score`, sourceRef, target: { kind: "ability-score", ability }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }] : [];
const feat = (spec: FeatSpec): FeatDefinition => {
  const sourceRef = source(spec.page, spec.pdfPage);
  const allowedAbilities = FLEXIBLE_ABILITY_CHOICES[spec.id];
  const choices = allowedAbilities || spec.choice === "ability" ? [{ id: `${spec.id}.ability`, kind: "ability-score-increase" as const, count: { min: 1, max: 1 }, optionSet: { kind: "explicit" as const, options: (allowedAbilities ?? ["str", "dex", "con", "int", "wis", "cha"]).map(ref) }, prerequisites: [], unique: true, sourceRefs: [sourceRef] }] : spec.choice === "spell-list" ? [{ id: `${spec.id}.spell-list`, kind: "spell" as const, count: { min: 1, max: 1 }, optionSet: { kind: "selector" as const, selector: { kind: "any-entity-of-type" as const, entityType: "spell" as const } }, prerequisites: [], unique: true, sourceRefs: [sourceRef] }] : spec.choice === "skill-or-tool" ? [{ id: `${spec.id}.proficiency`, kind: "other" as const, count: { min: 3, max: 3 }, optionSet: { kind: "selector" as const, selector: { kind: "any-tool-proficiency" as const } }, prerequisites: [], unique: true, sourceRefs: [sourceRef] }] : spec.choice === "element" ? [{ id: `${spec.id}.damage-type`, kind: "other" as const, count: { min: 1, max: 1 }, optionSet: { kind: "selector" as const, selector: { kind: "any-entity-of-type" as const, entityType: "condition" as const, filterTag: "elemental-damage-type" } }, prerequisites: [], unique: true, sourceRefs: [sourceRef] }] : [];
  return { id: asEntityId(spec.id), name: spec.name, tags: ["player-handbook", "optional-rule", "feat"], sourceRefs: [sourceRef], prerequisites: spec.prerequisite ? [spec.prerequisite] : [], grants: allowedAbilities || spec.choice === "ability" ? [] : abilityScore(spec.id, spec.scoreAbility, sourceRef), choices, repeatable: spec.repeatable ?? false, optionalRule: true };
};

export const feats: readonly FeatDefinition[] = ([
  ["elemental-adept", "Adepto Elemental", 167, 166, spellcasting, undefined, true, "element"],
  ["martial-adept", "Adepto Marcial", 167, 166],
  ["alert", "Alerta", 167, 166], ["dual-wielder", "Ambidestro", 167, 166], ["savage-attacker", "Atacante Bestial", 167, 166], ["sharpshooter", "Atirador Aguçado", 167, 166],
  ["spell-sniper", "Atirador de Magia", 167, 166, spellcasting, undefined, false, "spell-list"], ["athlete", "Atleta", 168, 167, undefined, "str"], ["actor", "Ator", 168, 167, undefined, "cha"],
  ["mounted-combatant", "Combatente Montado", 168, 167], ["war-caster", "Conjurador de Guerra", 169, 168, spellcasting], ["ritual-caster", "Conjurador de Ritual", 169, 168, undefined, undefined, false, "spell-list"],
  ["healer", "Curandeiro", 169, 168], ["defensive-duelist", "Duelista Defensivo", 169, 168, { kind: "min-ability-score", ability: "dex", score: 13 }], ["crossbow-expert", "Especialista em Besta", 169, 168], ["tavern-brawler", "Especialista em Briga", 169, 168, undefined, "str"],
  ["dungeon-delver", "Explorador de Cavernas", 169, 168], ["grappler", "Imobilizador", 169, 168, { kind: "min-ability-score", ability: "str", score: 13 }], ["magic-initiate", "Iniciado em Magia", 170, 169, undefined, undefined, false, "spell-list"], ["charger", "Investida Poderosa", 170, 169], ["inspiring-leader", "Líder Inspirador", 170, 169, { kind: "min-ability-score", ability: "cha", score: 13 }],
  ["polearm-master", "Maestria em Arma de Haste", 170, 169], ["medium-armor-master", "Maestria em Armadura Média", 170, 169, { kind: "has-proficiency", proficiencyRef: ref("proficiency.medium-armor") }], ["heavy-armor-master", "Maestria em Armadura Pesada", 170, 169, { kind: "has-proficiency", proficiencyRef: ref("proficiency.heavy-armor") }, "str"], ["mage-slayer", "Matador de Conjuradores", 170, 169], ["keen-mind", "Mente Afiada", 170, 169, undefined, "int"], ["weapon-master", "Mestre de Armas", 170, 169, undefined, "str", false, "skill-or-tool"],
  ["great-weapon-master", "Mestre de Armas Grandes", 171, 170], ["shield-master", "Mestre de Escudo", 171, 170], ["mobile", "Mobilidade", 171, 170], ["observant", "Observador", 171, 170, undefined, "wis"], ["skilled", "Perito", 172, 171, undefined, undefined, false, "skill-or-tool"], ["linguist", "Poliglota", 172, 171, undefined, "int"],
  ["lightly-armored", "Proteção Leve", 172, 171, undefined, "dex"], ["moderately-armored", "Proteção Moderada", 172, 171, { kind: "has-proficiency", proficiencyRef: ref("proficiency.light-armor") }, "dex"], ["heavily-armored", "Proteção Pesada", 172, 171, { kind: "has-proficiency", proficiencyRef: ref("proficiency.medium-armor") }, "str"], ["resilient", "Resiliente", 172, 171, undefined, undefined, false, "ability"], ["durable", "Resistente", 172, 171, undefined, "con"], ["tough", "Robusto", 172, 171], ["sentinel", "Sentinela", 172, 171], ["skulker", "Sorrateiro", 172, 171, { kind: "min-ability-score", ability: "dex", score: 13 }], ["lucky", "Sortudo", 172, 171],
] as const).map(([id, name, page, pdfPage, prerequisite, scoreAbility, repeatable, choice]) => feat({ id, name, page, pdfPage, prerequisite, scoreAbility, repeatable, choice }));

export const FEAT_DEFINITIONS = feats;
export const featsById: ReadonlyMap<string, FeatDefinition> = new Map(feats.map((entry) => [entry.id, entry]));
export function findFeat(featId: string): FeatDefinition | undefined { return featsById.get(featId); }
