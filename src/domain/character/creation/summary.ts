import type { CharacterDraft } from "@domain/contracts/character";
import type { Ability } from "@domain/contracts/primitives";
import type { EntityId } from "@domain/contracts/ids";
import { asCreationCatalog, ABILITIES, type CreationCatalogInput } from "./model";
import { creationAbilityScore, defaultBaseScore } from "./limits";

/**
 * Resumo da ficha em criação: tudo o que já está definido e DE ONDE vem (raça, classe,
 * antecedente, escolha), mais os conflitos entre fontes (perícia, ferramenta, idioma ou item
 * repetidos). Aceita rascunho incompleto: só resume o que existe.
 */

export type SummarySourceKind = "race" | "subrace" | "class" | "subclass" | "background" | "choice";

export interface SummarySource {
  readonly kind: SummarySourceKind;
  /** Nome da raça, classe, antecedente… que concede. */
  readonly name: string;
  /** Detalhe da origem, ex.: "escolha de perícias" ou "pacote do explorador". */
  readonly via?: string;
}

export interface SummaryLine {
  readonly id: string;
  readonly name: string;
  readonly sources: readonly SummarySource[];
  readonly quantity?: number;
  readonly weightGrams?: number;
  readonly level?: number;
  readonly expertise?: boolean;
}

export interface SummaryAbility {
  readonly ability: Ability;
  readonly base: number;
  readonly isDefault: boolean;
  readonly parts: readonly { readonly label: string; readonly amount: number }[];
  readonly final: number;
  readonly modifier: number;
}

export type SummaryStep = "race" | "class" | "background" | "ability-scores" | "equipment" | "spells";

export interface SummaryConflict {
  readonly id: string;
  readonly severity: "warning" | "info";
  readonly step: SummaryStep;
  readonly message: string;
}

export interface CreationSummary {
  readonly abilities: readonly SummaryAbility[];
  readonly skills: readonly SummaryLine[];
  readonly proficiencies: readonly SummaryLine[];
  readonly languages: readonly SummaryLine[];
  readonly equipment: readonly SummaryLine[];
  readonly spells: readonly SummaryLine[];
  readonly features: readonly SummaryLine[];
  readonly hitPoints?: { readonly die: number; readonly conModifier: number; readonly total: number };
  readonly weightGrams: number;
  readonly conflicts: readonly SummaryConflict[];
}

const SKILL_IDS = new Set(["athletics", "acrobatics", "sleight-of-hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal-handling", "insight", "medicine", "perception", "survival", "performance", "deception", "intimidation", "persuasion"]);
const LANGUAGE_IDS = new Set(["common", "dwarvish", "elvish", "halfling", "draconic", "dragonborn", "gnomish", "orc", "abyssal", "celestial", "infernal", "primordial", "sylvan", "undercommon", "deep-speech", "giant", "goblin"]);

const modifierOf = (score: number): number => Math.floor((score - 10) / 2);

class Collector {
  private readonly lines = new Map<string, { name: string; sources: SummarySource[]; quantity: number; weightGrams?: number; level?: number; expertise?: boolean }>();
  add(id: string, name: string, source: SummarySource, extra: { quantity?: number; weightGrams?: number; level?: number; expertise?: boolean } = {}): void {
    const current = this.lines.get(id) ?? { name, sources: [], quantity: 0, ...(extra.weightGrams !== undefined ? { weightGrams: extra.weightGrams } : {}), ...(extra.level !== undefined ? { level: extra.level } : {}) };
    current.quantity += extra.quantity ?? 1;
    current.sources.push(source);
    if (extra.expertise) current.expertise = true;
    this.lines.set(id, current);
  }
  list(): readonly SummaryLine[] {
    return [...this.lines.entries()].map(([id, line]) => ({
      id, name: line.name, sources: line.sources, quantity: line.quantity,
      ...(line.weightGrams !== undefined ? { weightGrams: line.weightGrams } : {}), ...(line.level !== undefined ? { level: line.level } : {}), ...(line.expertise ? { expertise: true } : {}),
    }));
  }
}

const sourceKey = (source: SummarySource): string => `${source.kind}:${source.name}`;
const describeSource = (source: SummarySource): string => {
  const prefix = { race: "Raça", subrace: "Sub-raça", class: "Classe", subclass: "Subclasse", background: "Antecedente", choice: "Escolha" }[source.kind];
  return `${prefix} ${source.name}${source.via ? ` (${source.via})` : ""}`;
};
const distinctSources = (line: SummaryLine): readonly SummarySource[] => [...new Map(line.sources.map((entry) => [`${sourceKey(entry)}:${entry.via ?? ""}`, entry])).values()];

export interface SummaryLabels {
  readonly skill?: (id: string) => string;
  readonly language?: (id: string) => string;
  readonly proficiency?: (id: string) => string | undefined;
}

export function buildCreationSummary(input: CreationCatalogInput, draft: CharacterDraft, labels: SummaryLabels = {}): CreationSummary {
  const { rulePack: pack, equipmentBundles } = asCreationCatalog(input);
  const partial = draft.partial;
  const race = partial.raceRef ? pack.races.get(partial.raceRef.entityId) : undefined;
  const subrace = partial.subraceRef ? pack.subraces.get(partial.subraceRef.entityId) : undefined;
  const classEntry = partial.classes?.[0];
  const classDefinition = classEntry ? pack.classes.get(classEntry.classId) : undefined;
  const subclass = classEntry?.subclassId ? pack.subclasses.get(classEntry.subclassId) : undefined;
  const background = partial.backgroundRef ? pack.backgrounds.get(partial.backgroundRef.entityId) : undefined;
  const variantId = (partial as { readonly backgroundVariantId?: string }).backgroundVariantId;
  const variant = background?.variants.find((entry) => entry.id === variantId);

  const raceSource: SummarySource | undefined = race ? { kind: "race", name: race.name } : undefined;
  const subraceSource: SummarySource | undefined = subrace ? { kind: "subrace", name: subrace.name } : undefined;
  const classSource: SummarySource | undefined = classDefinition ? { kind: "class", name: classDefinition.name } : undefined;
  const subclassSource: SummarySource | undefined = subclass ? { kind: "subclass", name: subclass.name } : undefined;
  const backgroundSource: SummarySource | undefined = background ? { kind: "background", name: background.name } : undefined;

  const owners = new Map<string, SummarySource>();
  if (race && raceSource) owners.set(String(race.id), raceSource);
  if (subrace && subraceSource) owners.set(String(subrace.id), subraceSource);
  if (classDefinition && classSource) owners.set(String(classDefinition.id), classSource);
  if (subclass && subclassSource) owners.set(String(subclass.id), subclassSource);
  if (background && backgroundSource) owners.set(String(background.id), backgroundSource);

  const skills = new Collector();
  const proficiencies = new Collector();
  const languages = new Collector();
  const equipment = new Collector();
  const spells = new Collector();
  const features = new Collector();
  const skillName = (id: string): string => labels.skill?.(id) ?? id;
  const languageName = (id: string): string => labels.language?.(id) ?? id;
  const equipmentName = (id: string): string => pack.equipment.get(id as EntityId)?.name ?? id;
  const addEquipment = (id: string, quantity: number, source: SummarySource): void => {
    const item = pack.equipment.get(id as EntityId);
    equipment.add(id, equipmentName(id), source, { quantity, ...(item ? { weightGrams: Number(item.weightGrams) } : {}) });
  };

  // Concessões fixas.
  for (const ref of race?.proficiencies ?? []) {
    const id = String(ref.entityId).replace(/^proficiency\./, "");
    if (SKILL_IDS.has(id) && raceSource) skills.add(id, skillName(id), raceSource);
    else if (raceSource) proficiencies.add(String(ref.entityId), String(ref.entityId), raceSource);
  }
  for (const language of race?.languages ?? []) if (raceSource) languages.add(String(language), languageName(String(language)), raceSource);
  for (const skill of background?.skillProficiencies ?? []) if (backgroundSource) skills.add(skill, skillName(skill), backgroundSource);
  for (const skill of variant?.skillProficiencies ?? []) if (backgroundSource) skills.add(skill, skillName(skill), { ...backgroundSource, via: variant?.name ?? "variante" });
  for (const ref of classDefinition?.initialProficiencies ?? []) if (classSource) proficiencies.add(String(ref.entityId), String(ref.entityId), classSource);
  for (const grant of background?.equipment ?? []) if (backgroundSource) addEquipment(String(grant.equipmentRef.entityId), grant.quantity, backgroundSource);

  // Escolhas feitas.
  for (const selection of partial.choices ?? []) {
    const ownerId = selection.choiceId.split(".")[0];
    const owner = owners.get(ownerId) ?? { kind: "choice" as const, name: ownerId };
    const isExpertise = selection.choiceId.includes("expertise");
    const isEquipment = /\.equipment$|\.equipment\./.test(selection.choiceId);
    for (const ref of selection.selectedIds) {
      const id = String(ref.entityId);
      if (SKILL_IDS.has(id)) skills.add(id, skillName(id), { ...owner, via: isExpertise ? "especialização" : "escolha" }, { expertise: isExpertise });
      else if (id.startsWith("proficiency.")) proficiencies.add(id, id, { ...owner, via: "escolha" });
      else if (LANGUAGE_IDS.has(id)) languages.add(id, languageName(id), { ...owner, via: "escolha" });
      else if (pack.spells.has(id as EntityId)) {
        const spell = pack.spells.get(id as EntityId)!;
        spells.add(id, spell.name, owner, { level: spell.level });
      } else if (isEquipment) {
        const bundle = equipmentBundles?.find((entry) => String(entry.id) === id);
        if (bundle) for (const grant of bundle.grants) addEquipment(String(grant.equipmentRef.entityId), grant.quantity, { ...owner, via: `pacote ${id}` });
        else if (pack.equipment.has(id as EntityId)) addEquipment(id, 1, { ...owner, via: "escolha" });
      }
    }
  }

  // Características.
  for (const trait of [...(race?.traits ?? []), ...(subrace?.traits ?? [])]) if (raceSource) features.add(String(trait.id), trait.name, subrace?.traits.includes(trait) && subraceSource ? subraceSource : raceSource);
  for (const ref of classDefinition?.progression[0]?.featureRefs ?? []) {
    const feature = pack.features.get(ref.entityId);
    if (feature && classSource) features.add(String(ref.entityId), feature.name, classSource);
  }
  if (subclass && subclassSource) features.add(String(subclass.id), subclass.name, subclassSource);
  if (background && backgroundSource) features.add(`${background.id}.feature`, background.feature.name, backgroundSource);

  // Atributos.
  const chosenAbilities = (partial.choices ?? []).flatMap((selection) => selection.selectedIds.map((ref) => String(ref.entityId))).filter((id) => (ABILITIES as readonly string[]).includes(id));
  const abilities: SummaryAbility[] = ABILITIES.map((ability) => {
    const parts: { label: string; amount: number }[] = [];
    let anyIndex = 0;
    for (const increase of race?.abilityIncreases ?? []) {
      if (increase.ability === "any") { if (chosenAbilities[anyIndex++] === ability) parts.push({ label: `Raça ${race?.name ?? ""} (escolha)`, amount: increase.amount }); }
      else if (increase.ability === ability) parts.push({ label: `Raça ${race?.name ?? ""}`, amount: increase.amount });
    }
    for (const modifier of subrace?.additionalModifiers ?? []) {
      if (modifier.target.kind === "ability-score" && modifier.target.ability === ability && modifier.operator === "add" && modifier.value.kind === "number") parts.push({ label: `Sub-raça ${subrace?.name ?? ""}`, amount: modifier.value.amount });
    }
    const final = creationAbilityScore(pack, partial, ability);
    const base = defaultBaseScore(partial.abilityGeneration, ability);
    return { ability, base, isDefault: !partial.abilityGeneration?.baseScores[ability], parts, final, modifier: modifierOf(final) };
  });
  const con = abilities.find((entry) => entry.ability === "con");

  const proficiencyList = proficiencies.list().map((line) => {
    const item = pack.equipment.get(line.id.replace(/^proficiency\./, "") as EntityId);
    const label = labels.proficiency?.(line.id) ?? item?.name;
    return label ? { ...line, name: label } : line;
  });

  const equipmentList = equipment.list();
  const weightGrams = equipmentList.reduce((sum, line) => sum + (line.weightGrams ?? 0) * (line.quantity ?? 1), 0);

  // Conflitos entre fontes.
  const conflicts: SummaryConflict[] = [];
  const joined = (line: SummaryLine): string => distinctSources(line).map(describeSource).join(" e ");
  for (const line of skills.list()) {
    const sources = distinctSources(line);
    if (sources.length > 1 && !(line.expertise && sources.length === 2)) conflicts.push({ id: `skill:${line.id}`, severity: "warning", step: sources.some((entry) => entry.kind === "background") ? "background" : "class", message: `A perícia ${line.name} vem de mais de uma fonte: ${joined(line)}. Só conta uma vez; escolha outra perícia para não desperdiçar a escolha.` });
  }
  for (const line of proficiencyList) {
    const sources = distinctSources(line);
    if (sources.length > 1) conflicts.push({ id: `proficiency:${line.id}`, severity: "warning", step: sources.some((entry) => entry.kind === "background") ? "background" : "class", message: `A proficiência em ${line.name} vem de mais de uma fonte: ${joined(line)}. Só conta uma vez; escolha outra ferramenta ou proficiência.` });
  }
  for (const line of languages.list()) {
    const sources = distinctSources(line);
    if (sources.length > 1) conflicts.push({ id: `language:${line.id}`, severity: "warning", step: "race", message: `O idioma ${line.name} vem de mais de uma fonte: ${joined(line)}. Escolha outro idioma.` });
  }
  for (const line of equipmentList) {
    const sources = distinctSources(line);
    if ((line.quantity ?? 1) > 1 && sources.length > 1) conflicts.push({ id: `equipment:${line.id}`, severity: "warning", step: "equipment", message: `Você recebe ${line.quantity}× ${line.name}: ${sources.map((entry) => `1 de ${describeSource(entry)}`).join(" e ")}. Se não quer repetir, tire uma das escolhas na etapa de Equipamento.` });
  }
  for (const line of spells.list()) {
    const sources = distinctSources(line);
    if (sources.length > 1) conflicts.push({ id: `spell:${line.id}`, severity: "info", step: "spells", message: `${line.name} foi escolhida mais de uma vez (${joined(line)}); só conta uma.` });
  }

  return {
    abilities,
    skills: skills.list(), proficiencies: proficiencyList, languages: languages.list(), equipment: equipmentList, spells: spells.list(), features: features.list(),
    ...(classDefinition && con ? { hitPoints: { die: classDefinition.hitDie, conModifier: con.modifier, total: classDefinition.hitDie + con.modifier } } : {}),
    weightGrams, conflicts,
  };
}

export interface BackgroundOverviewLine {
  readonly id: string;
  readonly name: string;
  /** Fontes que já concedem o mesmo item ou perícia na ficha atual (sem este antecedente). */
  readonly alreadyFrom: readonly SummarySource[];
}

export interface BackgroundOverview {
  readonly id: string;
  readonly name: string;
  readonly skills: readonly BackgroundOverviewLine[];
  readonly toolChoices: number;
  readonly languageChoices: number;
  readonly equipment: readonly (BackgroundOverviewLine & { readonly quantity: number; readonly weightGrams: number })[];
  /** Ferramentas em que você já é proficiente por outra fonte: a escolha de ferramenta deve ser outra. */
  readonly ownedTools: readonly BackgroundOverviewLine[];
  readonly feature: { readonly name: string; readonly description: string };
  readonly variants: readonly { readonly id: string; readonly name: string; readonly description: string }[];
  readonly overlapCount: number;
}

/** O que o antecedente traz e o que dele já existe na ficha por classe, raça ou outras escolhas. */
export function backgroundOverview(input: CreationCatalogInput, draft: CharacterDraft, backgroundId: string, labels: SummaryLabels = {}): BackgroundOverview | undefined {
  const { rulePack: pack } = asCreationCatalog(input);
  const background = pack.backgrounds.get(backgroundId as EntityId);
  if (!background) return undefined;
  const { backgroundRef: _removed, ...rest } = draft.partial;
  const without: CharacterDraft = { ...draft, partial: { ...rest, choices: (draft.partial.choices ?? []).filter((selection) => !selection.choiceId.startsWith(`${backgroundId}.`)) } };
  const others = buildCreationSummary(input, without, labels);
  const fromOthers = (lines: readonly SummaryLine[], id: string): readonly SummarySource[] => lines.find((line) => line.id === id)?.sources ?? [];
  const skills = background.skillProficiencies.map((skill) => ({ id: skill, name: labels.skill?.(skill) ?? skill, alreadyFrom: fromOthers(others.skills, skill) }));
  const equipment = background.equipment.map((grant) => {
    const id = String(grant.equipmentRef.entityId);
    const item = pack.equipment.get(grant.equipmentRef.entityId);
    return { id, name: item?.name ?? id, quantity: grant.quantity, weightGrams: Number(item?.weightGrams ?? 0), alreadyFrom: fromOthers(others.equipment, id) };
  });
  const ownedTools = others.proficiencies.filter((line) => pack.equipment.get(line.id.replace(/^proficiency\./, "") as EntityId)?.category === "tool").map((line) => ({ id: line.id, name: line.name, alreadyFrom: line.sources }));
  return {
    id: backgroundId, name: background.name, skills,
    toolChoices: background.toolChoices.reduce((sum, choice) => sum + choice.count.max, 0),
    languageChoices: background.languageChoices.reduce((sum, choice) => sum + choice.count.max, 0),
    equipment, ownedTools, feature: background.feature,
    variants: background.variants.map((variant) => ({ id: variant.id, name: variant.name, description: variant.description })),
    overlapCount: skills.filter((line) => line.alreadyFrom.length > 0).length + equipment.filter((line) => line.alreadyFrom.length > 0).length,
  };
}
