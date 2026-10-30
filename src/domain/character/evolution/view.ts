import type { Character } from "@domain/contracts/character";
import type { Ability, ChoiceDefinition, ChoiceSelection } from "@domain/contracts/primitives";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { EntityId } from "@domain/contracts/ids";
import { castingSourcesOf, chosenOptionIds, featureIdsOwned, projectClasses } from "./context";
import { knownSpellIds, parseEvolutionChoiceId, spellConstraintFor, spellProblem } from "./spell-rules";
import { prerequisiteMet, type PrerequisiteContext } from "./validate";

export interface EvolutionViewContext {
  readonly character: Character;
  readonly pack: RulePack;
  readonly classId: string;
  readonly targetLevel: number;
  readonly subclassId?: string;
  /** Escolhas já feitas nesta evolução (afetam pré-requisitos e unicidade). */
  readonly selections: readonly ChoiceSelection[];
  readonly abilityScores?: Readonly<Partial<Record<Ability, number>>>;
}

export type ChoiceFlavor = "asi" | "feat" | "spells" | "swap" | "options" | "skills" | "languages" | "tools" | "expertise" | "other";

const TITLES: readonly (readonly [RegExp, string])[] = [
  [/\.asi\.\d+$/, "Aumento de Habilidade"],
  [/\.feat\.\d+$/, "Talento (no lugar do aumento)"],
  [/\.fighting-style\.\d+$|additional-fighting-style/, "Estilo de Luta"],
  [/\.expertise\.\d+$/, "Especialização (dobra a proficiência)"],
  [/\.metamagic\.\d+$/, "Metamagia"],
  [/\.invocation-swap\.\d+$/, "Trocar uma invocação"],
  [/\.invocations\.\d+$/, "Invocações Místicas"],
  [/\.pact-boon\.\d+$/, "Dádiva do Pacto"],
  [/tome-cantrips/, "Truques do Livro das Sombras (Pacto do Tomo)"],
  [/\.maneuvers\.\d+$/, "Manobras de Combate"],
  [/student-of-war/, "Estudioso da Guerra: ferramenta de artesão"],
  [/greater-favored-enemy-language/, "Idioma do inimigo favorito maior"],
  [/favored-enemy-language/, "Idioma do inimigo favorito"],
  [/greater-favored-enemy/, "Inimigo Favorito Maior"],
  [/favored-enemy/, "Inimigo Favorito"],
  [/totem-spirit/, "Totem Espiritual"],
  [/totem-aspect/, "Aspecto da Besta"],
  [/totem-attunement/, "Sintonia Totêmica"],
  [/\.terrain\.\d+$/, "Terreno do Círculo"],
  [/\.ancestry\.\d+$/, "Ancestral Dracônico"],
  [/\.disciplines\.\d+$/, "Disciplina Elemental"],
  [/\.companion\.\d+$/, "Companheiro Animal"],
  [/hunters-prey/, "Presa do Caçador"],
  [/defensive-tactics/, "Táticas Defensivas"],
  [/\.multiattack\.\d+$/, "Ataque Múltiplo"],
  [/superior-defense/, "Defesa de Caçador Superior"],
  [/bonus-skills/, "Perícias adicionais do Colégio"],
  [/knowledge-domain\.languages/, "Bênçãos do Conhecimento: idiomas"],
  [/knowledge-domain\.skills-expertise/, "Bênçãos do Conhecimento: perícias"],
  [/nature-domain\.skill/, "Acólito da Natureza: perícia"],
];

export function choiceTitle(choiceId: string): string {
  for (const [pattern, title] of TITLES) if (pattern.test(choiceId)) return title;
  const parsed = parseEvolutionChoiceId(choiceId);
  if (parsed) {
    switch (parsed.kind) {
      case "cantrips": case "cantrip": return "Novos truques";
      case "spells": return parsed.key === "wizard" ? "Magias para o grimório" : "Novas magias";
      case "spell-swap": return "Trocar uma magia conhecida";
      case "arcanum": return `Arcana Mística (${{ 11: 6, 13: 7, 15: 8, 17: 9 }[parsed.level] ?? "?"}º círculo)`;
      case "magical-secrets": case "additional-secrets": return "Segredos Mágicos (de qualquer classe)";
      case "tome-cantrips": return "Truques do Livro das Sombras";
      case "spell-mastery": return "Dominar Magia";
      case "signature-spells": return "Assinatura Mágica";
    }
  }
  return choiceId;
}

export function choiceFlavor(choice: ChoiceDefinition): ChoiceFlavor {
  if (/\.asi\.\d+$/.test(choice.id)) return "asi";
  if (/\.feat\.\d+$/.test(choice.id) || choice.kind === "feat") return "feat";
  if (/spell-swap/.test(choice.id)) return "swap";
  if (choice.kind === "spell" || choice.kind === "cantrip") return "spells";
  if (choice.kind === "expertise") return "expertise";
  if (choice.optionSet.kind === "explicit") return "options";
  if (choice.optionSet.kind === "selector") {
    if (choice.optionSet.selector.kind === "any-skill") return "skills";
    if (choice.optionSet.selector.kind === "any-language") return "languages";
    if (choice.optionSet.selector.kind === "any-tool-proficiency") return "tools";
  }
  return "other";
}

export interface ChoiceOptionView {
  readonly id: string;
  readonly label: string;
  /** Preenchido quando a opção não pode ser escolhida agora; explica por quê. */
  readonly disabledReason?: string;
}

export function prerequisiteContextFor(view: EvolutionViewContext): PrerequisiteContext {
  const { character, pack, classId, targetLevel, subclassId, selections } = view;
  const classes = projectClasses(character, classId, targetLevel, subclassId);
  const requested = new Set(selections.flatMap((selection) => selection.selectedIds.map((ref) => String(ref.entityId))));
  const known = new Set<string>(requested);
  for (const source of character.castingSources) for (const id of knownSpellIds(character, String(source.grantingRef.entityId))) known.add(id);
  return {
    classLevels: new Map(classes.map((entry) => [String(entry.classId), entry.level])),
    ownedFeatures: new Set([...featureIdsOwned({ choices: character.choices, classes }, pack), ...requested]),
    knownSpells: known,
    casts: castingSourcesOf(classes).length > 0,
    ...(view.abilityScores ? { abilityScores: view.abilityScores } : {}),
  };
}

/** Opções explícitas de uma escolha, marcando as que já foram tomadas ou cujo pré-requisito falta. */
export function explicitOptionsFor(choice: ChoiceDefinition, view: EvolutionViewContext, labelFor: (id: string) => string): readonly ChoiceOptionView[] {
  if (choice.optionSet.kind !== "explicit") return [];
  const context = prerequisiteContextFor(view);
  const prior = chosenOptionIds(view.character.choices);
  return choice.optionSet.options.map((option) => {
    const id = String(option.entityId);
    const feature = view.pack.features.get(id as EntityId);
    const feat = view.pack.feats.get(id as EntityId);
    let disabledReason: string | undefined;
    if (choice.unique && (feature?.tags.includes("evolution-option") || feat) && prior.has(id) && !/swap/.test(choice.id)) disabledReason = "Já escolhida antes.";
    for (const prerequisite of feature?.eligibility ?? []) {
      if (disabledReason) break;
      if (prerequisiteMet(prerequisite, context) === false) disabledReason = prerequisiteLabel(prerequisite, view.pack);
    }
    return { id, label: feature?.name ?? feat?.name ?? labelFor(id), ...(disabledReason ? { disabledReason } : {}) };
  });
}

function prerequisiteLabel(prerequisite: Parameters<typeof prerequisiteMet>[0], pack: RulePack): string {
  if (prerequisite.kind === "min-class-level") return `Exige ${pack.classes.get(prerequisite.classRef.entityId)?.name ?? "a classe"} nível ${prerequisite.level}.`;
  if (prerequisite.kind === "has-feature") return `Exige ${pack.features.get(prerequisite.featureRef.entityId)?.name ?? "uma característica"}.`;
  if (prerequisite.kind === "knows-spell") return `Exige conhecer ${pack.spells.get(prerequisite.spellRef.entityId)?.name ?? "a magia"}.`;
  if (prerequisite.kind === "min-ability-score") return `Exige ${prerequisite.ability.toUpperCase()} ${prerequisite.score}.`;
  return "Pré-requisito não atendido.";
}

/** Talentos disponíveis para a escolha, com o requisito que falta quando existe. */
export function featOptionsFor(view: EvolutionViewContext): readonly ChoiceOptionView[] {
  const context = prerequisiteContextFor(view);
  const prior = chosenOptionIds(view.character.choices);
  return [...view.pack.feats.values()].map((feat) => {
    let disabledReason: string | undefined = prior.has(String(feat.id)) ? "Já escolhido antes." : undefined;
    for (const prerequisite of feat.prerequisites) {
      if (disabledReason) break;
      if (prerequisiteMet(prerequisite, context) === false) disabledReason = prerequisiteLabel(prerequisite, view.pack);
    }
    return { id: String(feat.id), label: feat.name, ...(disabledReason ? { disabledReason } : {}) };
  }).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export interface SpellOptionView {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly school: string;
  readonly disabledReason?: string;
}

/** Magias que cabem em uma escolha (lista da classe, círculo, escola) e o motivo quando não cabem. */
export function spellOptionsForChoice(choice: ChoiceDefinition, view: EvolutionViewContext, mode: "learn" | "forget" = "learn"): readonly SpellOptionView[] {
  const { character, pack } = view;
  const parsed = parseEvolutionChoiceId(choice.id);
  if (!parsed) return [];
  const classes = projectClasses(character, view.classId, view.targetLevel, view.subclassId);
  const sources = castingSourcesOf(classes);
  const constraint = spellConstraintFor(parsed, sources, pack);
  if (!constraint) return [];
  const known = new Set<string>();
  for (const source of character.castingSources) for (const id of knownSpellIds(character, String(source.grantingRef.entityId))) known.add(id);
  const selectedHere = new Set(view.selections.filter((selection) => selection.choiceId !== choice.id).flatMap((selection) => selection.selectedIds.map((ref) => String(ref.entityId))));
  if (mode === "forget") {
    const own = knownSpellIds(character, parsed.key);
    return [...pack.spells.values()].filter((spell) => own.has(String(spell.id)) && spell.level > 0).map((spell) => ({ id: String(spell.id), name: spell.name, level: spell.level, school: spell.school })).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
  }
  const fromSpellbook = parsed.kind === "spell-mastery" || parsed.kind === "signature-spells";
  const own = knownSpellIds(character, "wizard");
  return [...pack.spells.values()].flatMap((spell) => {
    const id = String(spell.id);
    if (spellProblem(pack, id, constraint)) return [];
    const disabledReason = fromSpellbook ? (own.has(id) ? undefined : "Precisa estar no grimório.") : known.has(id) ? "Você já conhece." : selectedHere.has(id) ? "Já escolhida em outra escolha." : undefined;
    return [{ id, name: spell.name, level: spell.level, school: spell.school, ...(disabledReason ? { disabledReason } : {}) }];
  }).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
}
