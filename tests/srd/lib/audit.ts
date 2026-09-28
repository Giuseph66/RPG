/**
 * Compara o rule pack local (Livro do Jogador pt-BR) com o snapshot da SRD 5.1
 * (`tests/srd/snapshot.json`). Cada divergência diz o valor nosso, o valor da API já
 * convertido para as unidades do livro e, quando o campo é um literal simples do catálogo,
 * o patch que `--aplica` grava em `src/data/**`.
 *
 * Conversões do livro pt-BR: 1,5 m por 5 pés (×0,3) e 0,5 kg por libra.
 */
import { type Prerequisite } from "@domain/contracts/primitives";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { type SpellDefinition } from "@domain/contracts/definitions/spell";
import { type ExtractedBookSpell } from "@data/spells/spells-book-catalog";
import { type SkillDefinition } from "@data/skills/skills";
import { EQUIPMENT_ALIASES, normalizeName, SCHOOL_PT, SPELL_ALIASES, SUBRACE_ALIASES } from "./aliases";
import { catalogWeightGrams, printedCostCp } from "@data/correto/integracao/equipment-weights";
import { EXCECOES, excecaoKey, REVISAO_MANUAL } from "./excecoes";
import { raw, type PatchValue, type SourcePatch } from "./patch";

export type Domain = "classes" | "progressao" | "racas" | "subracas" | "pericias" | "condicoes" | "equipamento" | "magias-livro" | "magias-pack";

export interface Divergence {
  readonly domain: Domain;
  readonly id: string;
  readonly apiIndex: string;
  readonly field: string;
  readonly ours: unknown;
  readonly api: unknown;
  /** Presente quando `--aplica` sabe corrigir o literal no catálogo. */
  readonly patch?: SourcePatch;
  /** Motivo de exigir revisão manual. */
  readonly manual?: string;
  /** Divergência revisada: nosso valor fica (ver excecoes.ts). */
  readonly excecao?: string;
}

export interface Coverage {
  readonly domain: Domain;
  readonly compared: number;
  readonly oursOnly: readonly string[];
  readonly apiOnly: readonly string[];
}

export interface AuditResult {
  readonly divergences: readonly Divergence[];
  readonly coverage: readonly Coverage[];
}

type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface SrdSnapshot {
  readonly source: string;
  readonly fetchedAt: string;
  readonly conditions: readonly { index: string; name: string; namePt?: string }[];
  readonly skills: readonly { index: string; ability: Ability }[];
  readonly classes: readonly {
    index: string;
    hitDie: number;
    savingThrows: Ability[];
    skillChoices: number;
    subclassLevel?: number;
    multiclassPrerequisites: { any?: { ability: Ability; score: number }[]; all?: { ability: Ability; score: number }[] };
    levels: { level: number; profBonus: number; asi: boolean; slots?: number[] }[];
  }[];
  readonly races: readonly { index: string; speedFt: number; size: string; abilityBonuses: Partial<Record<Ability, number>> }[];
  readonly subraces: readonly { index: string; race: string; abilityBonuses: Partial<Record<Ability, number>> }[];
  readonly equipment: readonly {
    index: string;
    name: string;
    category: string;
    costGp?: number;
    weightLb?: number;
    weaponCategory?: string;
    damageDice?: string;
    damageType?: string;
    rangeFt?: { normal: number; long?: number };
    properties?: string[];
    armorCategory?: string;
    baseArmorClass?: number;
    dexBonus?: boolean;
    maxDexBonus?: number;
    strMinimum?: number;
    stealthDisadvantage?: boolean;
  }[];
  readonly spells: readonly { index: string; namePt?: string; level: number; school: string; ritual: boolean; concentration: boolean; components: string[]; classes: string[] }[];
}

export interface AuditInput {
  readonly pack: RulePack;
  readonly bookSpells: readonly ExtractedBookSpell[];
  readonly skills: readonly SkillDefinition[];
  readonly snapshot: SrdSnapshot;
}

export const FILES = {
  classes: "src/data/classes/classes.ts",
  races: "src/data/races/races.ts",
  skills: "src/data/skills/skills.ts",
  armor: "src/data/equipment/armor.ts",
  weapons: "src/data/equipment/weapons.ts",
  gear: "src/data/equipment/gear.ts",
  tools: "src/data/equipment/tools.ts",
  bookSpells: "src/data/spells/spells-book-catalog.ts",
  packSpells: "src/data/spells/spells.ts",
} as const;

const FEET_TO_METERS = 0.3;
const GRAMS_PER_POUND = 500;

const round2 = (value: number) => Math.round(value * 100) / 100;
const sorted = (values: Iterable<string>) => [...values].sort();
const sameSet = (a: Iterable<string>, b: Iterable<string>) => JSON.stringify(sorted(new Set(a))) === JSON.stringify(sorted(new Set(b)));
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function abilityMap(entries: readonly { ability: string; amount: number }[]): Record<string, number> {
  return Object.fromEntries([...entries].sort((a, b) => a.ability.localeCompare(b.ability)).map((entry) => [entry.ability, entry.amount]));
}

function sortedRecord(record: Partial<Record<string, number>>): Record<string, number> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b))) as Record<string, number>;
}

class Collector {
  readonly divergences: Divergence[] = [];
  readonly coverage: Coverage[] = [];

  /** Nosso valor confere com o livro impresso: fica, mesmo divergindo da SRD. */
  keep(entry: Omit<Divergence, "patch" | "manual" | "excecao">, reason: string) {
    const forcedManual = REVISAO_MANUAL[excecaoKey(entry.domain, entry.id, "*")];
    this.divergences.push(forcedManual ? { ...entry, manual: forcedManual } : { ...entry, excecao: reason });
  }

  diff(entry: Omit<Divergence, "patch" | "manual" | "excecao">, fix: { readonly file: string; readonly key: string; readonly value: PatchValue; readonly position?: number } | { readonly manual: string }) {
    const excecao = EXCECOES[excecaoKey(entry.domain, entry.id, entry.field)];
    const forcedManual = REVISAO_MANUAL[excecaoKey(entry.domain, entry.id, "*")];
    if (forcedManual) this.divergences.push({ ...entry, manual: forcedManual });
    else if (excecao) this.divergences.push({ ...entry, excecao });
    else if ("manual" in fix) this.divergences.push({ ...entry, manual: fix.manual });
    else this.divergences.push({ ...entry, patch: { file: fix.file, id: entry.id, key: fix.key, value: fix.value, ...(fix.position === undefined ? {} : { position: fix.position }) } });
  }
}

function auditClasses(input: AuditInput, out: Collector) {
  const api = new Map(input.snapshot.classes.map((entry) => [entry.index, entry]));
  let compared = 0;
  for (const definition of input.pack.classes.values()) {
    const id = String(definition.id);
    const srd = api.get(id);
    if (!srd) continue;
    compared += 1;
    const base = { domain: "classes" as const, id, apiIndex: srd.index };
    if (definition.hitDie !== srd.hitDie) out.diff({ ...base, field: "Dado de Vida", ours: definition.hitDie, api: srd.hitDie }, { file: FILES.classes, key: "hitDie", value: srd.hitDie });
    if (!sameSet(definition.savingThrowProficiencies, srd.savingThrows)) out.diff({ ...base, field: "Resistências", ours: definition.savingThrowProficiencies, api: srd.savingThrows }, { file: FILES.classes, key: "saves", value: srd.savingThrows });
    const skillCount = definition.skillChoices.count.max;
    if (skillCount !== srd.skillChoices) out.diff({ ...base, field: "Perícias escolhidas", ours: skillCount, api: srd.skillChoices }, { file: FILES.classes, key: "skillCount", value: srd.skillChoices });
    if (srd.subclassLevel !== undefined && definition.subclassSelectionLevel !== srd.subclassLevel) out.diff({ ...base, field: "Nível da subclasse", ours: definition.subclassSelectionLevel, api: srd.subclassLevel }, { file: FILES.classes, key: "subclassLevel", value: srd.subclassLevel });
    const ourAsi = definition.progression.filter((row) => row.choicesGranted.some((choice) => choice.kind === "ability-score-increase")).map((row) => row.level);
    const apiAsi = srd.levels.filter((row) => row.asi).map((row) => row.level);
    if (!sameJson(ourAsi, apiAsi)) out.diff({ ...base, field: "Níveis de Incremento de Habilidade", ours: ourAsi, api: apiAsi }, { file: FILES.classes, key: "asi", value: apiAsi });

    const abilityOptions = (prerequisites: readonly Prerequisite[]) => prerequisites.flatMap((entry) => (entry.kind === "min-ability-score" ? [{ ability: entry.ability, score: entry.score }] : []));
    const ourAny = definition.multiclassPrerequisites.flatMap((entry) => (entry.kind === "any-of" ? [abilityOptions(entry.options)] : []));
    const ourAll = abilityOptions(definition.multiclassPrerequisites);
    const srdAny = srd.multiclassPrerequisites.any && srd.multiclassPrerequisites.any.length > 1 ? srd.multiclassPrerequisites.any : undefined;
    const srdAll = srdAny ? [] : srd.multiclassPrerequisites.all ?? srd.multiclassPrerequisites.any ?? [];
    const shape = (entries: readonly { ability: string; score: number }[]) => JSON.stringify([...entries].sort((a, b) => a.ability.localeCompare(b.ability)));
    if (srdAny) {
      if (!(ourAny.length === 1 && ourAll.length === 0 && shape(ourAny[0]) === shape(srdAny))) {
        out.diff({ ...base, field: "Pré-requisito de multiclasse", ours: ourAny.length ? `qualquer um: ${shape(ourAny[0])}` : `todos: ${shape(ourAll)}`, api: `qualquer um: ${shape(srdAny)}` }, { manual: "a fonte exige UM dos atributos (OU): usar `multiclassRequirement: \"any\"` na spec da classe" });
      }
    } else if (ourAny.length > 0 || shape(ourAll) !== shape(srdAll)) {
      out.diff({ ...base, field: "Pré-requisito de multiclasse", ours: ourAny.length ? `qualquer um: ${shape(ourAny[0])}` : ourAll, api: srdAll }, { file: FILES.classes, key: "multiclassPrerequisites", value: srdAll.map((entry) => ({ ability: entry.ability, score: entry.score })) });
    }

    const slotDiffs: string[] = [];
    for (const row of srd.levels) {
      const ours = definition.progression.find((entry) => entry.level === row.level)?.spellSlotsGranted?.slotsByLevel ?? [];
      const ourSlots = Array.from({ length: 9 }, (_, index) => ours.find((entry) => entry.slotLevel === index + 1)?.count ?? 0);
      const apiSlots = row.slots ?? Array.from({ length: 9 }, () => 0);
      const describe = (slots: readonly number[]) => slots.map((count, index) => (count ? `${count}×${index + 1}º` : "")).filter(Boolean).join(" ") || "nenhum";
      if (!sameJson(ourSlots, apiSlots)) slotDiffs.push(`nv${row.level}: ${describe(ourSlots)} → ${describe(apiSlots)}`);
    }
    if (slotDiffs.length) {
      out.diff({ ...base, field: "Espaços de magia por nível", ours: `${slotDiffs.length} nível(is) divergente(s)`, api: slotDiffs.join("; ") }, { manual: "tabela derivada de `slotProfile`; corrigir a função `spellSlots` em src/data/classes/classes.ts" });
    }
  }
  out.coverage.push({
    domain: "classes",
    compared,
    oursOnly: sorted([...input.pack.classes.keys()].map(String).filter((id) => !api.has(id))),
    apiOnly: sorted([...api.keys()].filter((id) => !input.pack.classes.has(id as never))),
  });
}

function auditProgression(input: AuditInput, out: Collector) {
  const reference = input.snapshot.classes.find((entry) => entry.index === "fighter") ?? input.snapshot.classes[0];
  for (const row of reference.levels) {
    const ours = input.pack.progression.table.find((entry) => entry.totalLevel === row.level)?.proficiencyBonus;
    if (ours !== row.profBonus) out.diff({ domain: "progressao", id: `nivel-${row.level}`, apiIndex: `${reference.index}-${row.level}`, field: "Bônus de proficiência", ours, api: row.profBonus }, { manual: "tabela em src/data/progression/progression.ts" });
  }
  out.coverage.push({ domain: "progressao", compared: reference.levels.length, oursOnly: [], apiOnly: [] });
}

function auditRaces(input: AuditInput, out: Collector) {
  const api = new Map(input.snapshot.races.map((entry) => [entry.index, entry]));
  let compared = 0;
  for (const race of input.pack.races.values()) {
    const id = String(race.id);
    const srd = api.get(id);
    if (!srd) continue;
    compared += 1;
    const base = { domain: "racas" as const, id, apiIndex: srd.index };
    const expectedCm = Math.round(srd.speedFt * FEET_TO_METERS * 100);
    if (race.speedCm !== expectedCm) out.diff({ ...base, field: "Deslocamento (m)", ours: race.speedCm / 100, api: expectedCm / 100 }, { file: FILES.races, key: "speedCm", value: raw(`asCentimeters(${expectedCm})`) });
    if (race.size !== srd.size) out.diff({ ...base, field: "Tamanho", ours: race.size, api: srd.size }, { file: FILES.races, key: "size", value: srd.size });
    const ours = abilityMap(race.abilityIncreases);
    const theirs = sortedRecord(srd.abilityBonuses);
    if (!sameJson(ours, theirs)) {
      out.diff({ ...base, field: "Aumento de atributo", ours, api: theirs }, { file: FILES.races, key: "abilityIncreases", value: Object.entries(srd.abilityBonuses).map(([ability, amount]) => ({ ability, amount: amount as number })) });
    }
  }
  out.coverage.push({
    domain: "racas",
    compared,
    oursOnly: sorted([...input.pack.races.keys()].map(String).filter((id) => !api.has(id))),
    apiOnly: sorted([...api.keys()].filter((id) => !input.pack.races.has(id as never))),
  });

  const apiSub = new Map(input.snapshot.subraces.map((entry) => [entry.index, entry]));
  const matched = new Set<string>();
  let subCompared = 0;
  for (const subrace of input.pack.subraces.values()) {
    const id = String(subrace.id);
    const srd = apiSub.get(SUBRACE_ALIASES[id] ?? id);
    if (!srd) continue;
    subCompared += 1;
    matched.add(srd.index);
    const base = { domain: "subracas" as const, id, apiIndex: srd.index };
    if (String(subrace.raceId) !== srd.race) out.diff({ ...base, field: "Raça", ours: subrace.raceId, api: srd.race }, { manual: "vínculo `raceId` da sub-raça" });
    const ours = sortedRecord(Object.fromEntries(subrace.additionalModifiers
      .filter((modifier) => modifier.target.kind === "ability-score" && modifier.operator === "add" && modifier.value.kind === "number")
      .map((modifier) => [(modifier.target as { ability: string }).ability, (modifier.value as { amount: number }).amount])));
    const theirs = sortedRecord(srd.abilityBonuses);
    if (!sameJson(ours, theirs)) out.diff({ ...base, field: "Aumento de atributo", ours, api: theirs }, { manual: "aumento modelado como `additionalModifiers` com fonte própria" });
  }
  out.coverage.push({
    domain: "subracas",
    compared: subCompared,
    oursOnly: sorted([...input.pack.subraces.keys()].map(String).filter((id) => !apiSub.has(SUBRACE_ALIASES[id] ?? id))),
    apiOnly: sorted([...apiSub.keys()].filter((index) => !matched.has(index))),
  });
}

function auditSkills(input: AuditInput, out: Collector) {
  const api = new Map(input.snapshot.skills.map((entry) => [entry.index, entry]));
  for (const skill of input.skills) {
    const srd = api.get(skill.id);
    if (srd && srd.ability !== skill.defaultAbility) out.diff({ domain: "pericias", id: skill.id, apiIndex: srd.index, field: "Atributo padrão", ours: skill.defaultAbility, api: srd.ability }, { file: FILES.skills, key: "defaultAbility", value: srd.ability });
  }
  out.coverage.push({
    domain: "pericias",
    compared: input.skills.filter((skill) => api.has(skill.id)).length,
    oursOnly: sorted(input.skills.map((skill) => skill.id).filter((id) => !api.has(id))),
    apiOnly: sorted([...api.keys()].filter((id) => !input.skills.some((skill) => skill.id === id))),
  });
}

function auditConditions(input: AuditInput, out: Collector) {
  const ours = new Set([...input.pack.conditions.keys()].map(String));
  const api = new Set(input.snapshot.conditions.map((entry) => entry.index));
  out.coverage.push({
    domain: "condicoes",
    compared: [...ours].filter((id) => api.has(id)).length,
    oursOnly: sorted([...ours].filter((id) => !api.has(id))),
    apiOnly: sorted([...api].filter((id) => !ours.has(id))),
  });
}

function equipmentApiIndex(id: string, api: ReadonlyMap<string, unknown>): string | undefined {
  const [first, ...rest] = id.split("-");
  const candidates = [EQUIPMENT_ALIASES[id], id, `${id}-armor`, rest.length > 0 ? `${first}s-${rest.join("-")}` : undefined];
  return candidates.find((candidate): candidate is string => candidate !== undefined && api.has(candidate));
}

/** "1d4" → 1d4; dano fixo "1" → 1d1 (a única face que sempre rola 1). */
function parseDice(dice: string | undefined): { quantity: number; faces: number } | undefined {
  const fixed = /^(\d+)$/.exec(dice ?? "");
  if (fixed) return { quantity: Number(fixed[1]), faces: 1 };
  const match = /^(\d+)d(\d+)$/.exec(dice ?? "");
  return match ? { quantity: Number(match[1]), faces: Number(match[2]) } : undefined;
}

function equipmentFile(definition: EquipmentDefinition): string {
  if (definition.armor) return FILES.armor;
  if (definition.weapon) return FILES.weapons;
  if (definition.tool) return FILES.tools;
  return FILES.gear;
}

/** Ferramentas são tuplas `[id, nome, preçoPo, pesoG]`. */
const TOOL_POSITION: Readonly<Record<string, number>> = { valueGold: 2, weightGrams: 3 };

function auditEquipment(input: AuditInput, out: Collector) {
  const api = new Map(input.snapshot.equipment.map((entry) => [entry.index, entry]));
  const matched = new Set<string>();
  const oursOnly: string[] = [];
  for (const definition of input.pack.equipment.values()) {
    const id = String(definition.id);
    const index = equipmentApiIndex(id, api);
    const srd = index ? api.get(index) : undefined;
    if (!srd) { oursOnly.push(id); continue; }
    matched.add(srd.index);
    const base = { domain: "equipamento" as const, id, apiIndex: srd.index };
    const file = equipmentFile(definition);
    const fix = (key: string, value: PatchValue) => (file === FILES.tools ? { file, key, value, position: TOOL_POSITION[key] } : { file, key, value });

    // Itens-conteúdo de pacotes vêm da API sem preço nem peso (0/0): nada a comparar.
    if (srd.costGp === 0 && srd.weightLb === 0) continue;
    // Preço e peso: o livro pt-BR impresso é a autoridade; a SRD só aponta onde olhar.
    const bookCp = printedCostCp(id);
    if (srd.costGp !== undefined) {
      const apiCp = Math.round(srd.costGp * 100);
      const entry = { ...base, field: "Preço (po)", ours: definition.valueCp / 100, api: srd.costGp };
      if (bookCp !== undefined && definition.valueCp === bookCp) {
        if (bookCp !== apiCp) out.keep(entry, `preço impresso no livro pt-BR: ${bookCp / 100} po`);
      } else if (bookCp !== undefined && definition.valueCp === apiCp) {
        out.diff({ ...entry, api: `${srd.costGp} (livro: ${bookCp / 100})` }, { manual: `nosso valor = SRD, mas o livro impresso diz ${bookCp / 100} po — confirmar se é erro de impressão` });
      } else if (bookCp !== undefined) out.diff({ ...entry, api: `${srd.costGp} (livro: ${bookCp / 100})` }, fix("valueGold", bookCp / 100));
      else if (definition.valueCp !== apiCp) out.diff(entry, fix("valueGold", srd.costGp));
    }
    if (srd.weightLb !== undefined) {
      const apiGrams = Math.round(srd.weightLb * GRAMS_PER_POUND);
      const bookGrams = catalogWeightGrams(id);
      const entry = { ...base, field: "Peso (kg)", ours: definition.weightGrams / 1000, api: apiGrams / 1000 };
      if (bookGrams !== undefined && definition.weightGrams === bookGrams) {
        if (Math.abs(bookGrams - apiGrams) > Math.max(50, apiGrams * 0.05)) out.keep(entry, `peso impresso no livro pt-BR: ${bookGrams / 1000} kg`);
      } else if (bookGrams !== undefined && Math.abs(definition.weightGrams - apiGrams) <= Math.max(50, apiGrams * 0.05)) {
        out.diff({ ...entry, api: `${apiGrams / 1000} (livro: ${bookGrams / 1000})` }, { manual: `nosso valor ≈ SRD, mas o livro impresso diz ${bookGrams / 1000} kg — confirmar se é erro de impressão` });
      } else if (bookGrams !== undefined) out.diff({ ...entry, api: `${apiGrams / 1000} (livro: ${bookGrams / 1000})` }, fix("weightGrams", bookGrams));
      else if (Math.abs(definition.weightGrams - apiGrams) > Math.max(50, apiGrams * 0.05)) out.diff(entry, fix("weightGrams", apiGrams));
    }

    if (definition.weapon && srd.weaponCategory) {
      const weapon = definition.weapon;
      if (weapon.proficiencyCategory !== srd.weaponCategory) out.diff({ ...base, field: "Categoria de arma", ours: weapon.proficiencyCategory, api: srd.weaponCategory }, fix("proficiency", srd.weaponCategory));
      const dice = parseDice(srd.damageDice);
      const ourDamage = weapon.damageParts[0];
      if (srd.damageDice && !dice) {
        if (ourDamage) out.diff({ ...base, field: "Dano", ours: `${ourDamage.expression.quantity}d${ourDamage.expression.faces}`, api: srd.damageDice }, { manual: "dano fixo não cabe em DiceFormula" });
        else out.diff({ ...base, field: "Dano", ours: "(sem dano)", api: `${srd.damageDice} ${srd.damageType ?? ""}`.trim() }, { manual: "dano fixo não cabe em DiceFormula; contrato precisa aceitar valor fixo" });
      } else if (dice) {
        const ourDice = ourDamage ? { quantity: ourDamage.expression.quantity, faces: ourDamage.expression.faces } : undefined;
        if (!sameJson(ourDice, dice)) out.diff({ ...base, field: "Dado de dano", ours: ourDice ? `${ourDice.quantity}d${ourDice.faces}` : "(sem dano)", api: srd.damageDice }, fix("damage", dice));
        if (ourDamage?.damageType !== srd.damageType) out.diff({ ...base, field: "Tipo de dano", ours: ourDamage?.damageType, api: srd.damageType }, fix("damageType", srd.damageType));
      }
      const apiProperties = srd.properties ?? [];
      if (!sameSet(weapon.properties, apiProperties)) out.diff({ ...base, field: "Propriedades", ours: sorted(weapon.properties), api: sorted(apiProperties) }, fix("properties", apiProperties));
      const ourRange = weapon.rangeCm ? [weapon.rangeCm.normal / 100, weapon.rangeCm.long / 100] : undefined;
      const apiRange = srd.rangeFt ? [round2(srd.rangeFt.normal * FEET_TO_METERS), round2((srd.rangeFt.long ?? srd.rangeFt.normal) * FEET_TO_METERS)] : undefined;
      if (!sameJson(ourRange, apiRange)) out.diff({ ...base, field: "Alcance (m)", ours: ourRange?.join("/") ?? "(nenhum)", api: apiRange?.join("/") ?? "(nenhum)" }, fix("range", apiRange));
      if (apiProperties.includes("finesse") && weapon.abilityPolicy.kind !== "finesse") {
        out.diff({ ...base, field: "Atributo de ataque (acuidade)", ours: weapon.abilityPolicy, api: "finesse: str ou dex" }, fix("ability", { kind: "finesse", abilities: ["str", "dex"] }));
      }
    }

    if (definition.armor && srd.armorCategory) {
      const armor = definition.armor;
      if (armor.baseArmorClass !== srd.baseArmorClass) out.diff({ ...base, field: "CA base", ours: armor.baseArmorClass, api: srd.baseArmorClass }, fix("baseArmorClass", srd.baseArmorClass));
      if (srd.armorCategory !== "shield") {
        const expectedCap = srd.dexBonus ? srd.maxDexBonus : 0;
        if (armor.dexModifierCap !== expectedCap) out.diff({ ...base, field: "Limite de Destreza", ours: armor.dexModifierCap ?? "sem limite", api: expectedCap ?? "sem limite" }, fix("dexModifierCap", expectedCap));
      }
      if ((armor.strengthRequirement ?? undefined) !== (srd.strMinimum ?? undefined)) out.diff({ ...base, field: "Força mínima", ours: armor.strengthRequirement ?? "—", api: srd.strMinimum ?? "—" }, fix("strengthRequirement", srd.strMinimum));
      if (armor.stealthDisadvantage !== srd.stealthDisadvantage) out.diff({ ...base, field: "Desvantagem em Furtividade", ours: armor.stealthDisadvantage, api: srd.stealthDisadvantage }, fix("stealthDisadvantage", Boolean(srd.stealthDisadvantage)));
    }
  }
  out.coverage.push({
    domain: "equipamento",
    compared: matched.size,
    oursOnly: sorted(oursOnly),
    apiOnly: sorted([...api.values()].filter((entry) => !matched.has(entry.index) && entry.category !== "mounts-and-vehicles").map((entry) => entry.index)),
  });
}

function componentLetters(text: string): string[] {
  const head = text.split("(")[0];
  return sorted(head.split(/[,\s]+/).map((part) => part.trim().toUpperCase()).filter((part) => part === "V" || part === "S" || part === "M"));
}

function auditBookSpells(input: AuditInput, out: Collector) {
  const byIndex = new Map(input.snapshot.spells.map((entry) => [entry.index, entry]));
  const byName = new Map(input.snapshot.spells.filter((entry) => entry.namePt).map((entry) => [normalizeName(entry.namePt as string), entry]));
  const matched = new Set<string>();
  const oursOnly: string[] = [];
  for (const spell of input.bookSpells) {
    const srd = byIndex.get(SPELL_ALIASES[spell.id] ?? spell.id) ?? byName.get(normalizeName(spell.name)) ?? byName.get(normalizeName(spell.sourceName));
    if (!srd) { oursOnly.push(spell.id); continue; }
    matched.add(srd.index);
    const base = { domain: "magias-livro" as const, id: spell.id, apiIndex: srd.index };
    if (spell.level !== srd.level) out.diff({ ...base, field: "Círculo", ours: spell.level, api: srd.level }, { file: FILES.bookSpells, key: "level", value: srd.level });
    const school = SCHOOL_PT[srd.school];
    if (school && spell.schoolPtBr !== school) out.diff({ ...base, field: "Escola", ours: spell.schoolPtBr, api: school }, { file: FILES.bookSpells, key: "schoolPtBr", value: school });
    if (spell.ritual !== srd.ritual) out.diff({ ...base, field: "Ritual", ours: spell.ritual, api: srd.ritual }, { file: FILES.bookSpells, key: "ritual", value: srd.ritual });
    const concentration = /^concentra/i.test(spell.duration.trim());
    if (concentration !== srd.concentration) out.diff({ ...base, field: "Concentração", ours: concentration, api: srd.concentration }, { manual: `texto da duração: "${spell.duration}"` });
    const letters = componentLetters(spell.components);
    if (!sameSet(letters, srd.components)) out.diff({ ...base, field: "Componentes", ours: letters.join(", "), api: sorted(srd.components).join(", ") }, { manual: `texto dos componentes: "${spell.components}"` });
    if (!sameSet(spell.classes, srd.classes)) out.diff({ ...base, field: "Classes", ours: sorted(spell.classes), api: sorted(srd.classes) }, { file: FILES.bookSpells, key: "classes", value: sorted(srd.classes) });
  }
  out.coverage.push({
    domain: "magias-livro",
    compared: matched.size,
    oursOnly: sorted(oursOnly),
    apiOnly: sorted([...byIndex.keys()].filter((index) => !matched.has(index))),
  });
}

function auditPackSpells(input: AuditInput, out: Collector) {
  const byIndex = new Map(input.snapshot.spells.map((entry) => [entry.index, entry]));
  let compared = 0;
  const oursOnly: string[] = [];
  for (const spell of input.pack.spells.values() as Iterable<SpellDefinition>) {
    const id = String(spell.id);
    const srd = byIndex.get(id);
    if (!srd) { oursOnly.push(id); continue; }
    compared += 1;
    const base = { domain: "magias-pack" as const, id, apiIndex: srd.index };
    if (spell.level !== srd.level) out.diff({ ...base, field: "Círculo", ours: spell.level, api: srd.level }, { file: FILES.packSpells, key: "level", value: srd.level });
    if (spell.school !== srd.school) out.diff({ ...base, field: "Escola", ours: spell.school, api: srd.school }, { file: FILES.packSpells, key: "school", value: srd.school });
    if (spell.ritual !== srd.ritual) out.diff({ ...base, field: "Ritual", ours: spell.ritual, api: srd.ritual }, { file: FILES.packSpells, key: "ritual", value: srd.ritual });
    if (spell.concentration !== srd.concentration) out.diff({ ...base, field: "Concentração", ours: spell.concentration, api: srd.concentration }, { file: FILES.packSpells, key: "concentration", value: srd.concentration });
    const letters = [spell.components.verbal ? "V" : "", spell.components.somatic ? "S" : "", spell.components.material ? "M" : ""].filter(Boolean);
    if (!sameSet(letters, srd.components)) out.diff({ ...base, field: "Componentes", ours: letters.join(", "), api: sorted(srd.components).join(", ") }, { manual: "objeto `components` com descrição do material" });
    const classes = spell.classes.map(String);
    if (!sameSet(classes, srd.classes)) out.diff({ ...base, field: "Classes", ours: sorted(classes), api: sorted(srd.classes) }, { file: FILES.packSpells, key: "classes", value: raw(`classes(${sorted(srd.classes).map((entry) => JSON.stringify(entry)).join(", ")})`) });
  }
  out.coverage.push({ domain: "magias-pack", compared, oursOnly: sorted(oursOnly), apiOnly: [] });
}

export function auditAgainstSrd(input: AuditInput): AuditResult {
  const out = new Collector();
  auditClasses(input, out);
  auditProgression(input, out);
  auditRaces(input, out);
  auditSkills(input, out);
  auditConditions(input, out);
  auditEquipment(input, out);
  auditBookSpells(input, out);
  auditPackSpells(input, out);
  return { divergences: out.divergences, coverage: out.coverage };
}
