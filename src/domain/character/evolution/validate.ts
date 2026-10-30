import type { Character } from "@domain/contracts/character";
import type { Ability, ChoiceDefinition, ChoiceSelection, Prerequisite } from "@domain/contracts/primitives";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { EntityId } from "@domain/contracts/ids";
import type { ProgressionIssue } from "@domain/character/progression/model";
import { castingSourcesOf, chosenOptionIds, featureIdsOwned, projectClasses } from "./context";
import { knownSpellIds, parseEvolutionChoiceId, spellConstraintFor, spellProblem } from "./spell-rules";

const issue = (code: ProgressionIssue["code"], field: string, message: string): ProgressionIssue => ({ code, field, message, blocking: true });

export interface EvolutionValidationInput {
  readonly character: Character;
  readonly pack: RulePack;
  readonly classId: string;
  readonly targetLevel: number;
  readonly subclassId?: string;
  readonly choices: readonly ChoiceSelection[];
  readonly definitions: readonly ChoiceDefinition[];
  /** Valores finais de atributo (já com raça e aumentos); sem eles, requisitos de atributo de talentos não bloqueiam. */
  readonly abilityScores?: Readonly<Partial<Record<Ability, number>>>;
}

const ABILITY_NAMES: Readonly<Record<string, string>> = { str: "Força", dex: "Destreza", con: "Constituição", int: "Inteligência", wis: "Sabedoria", cha: "Carisma" };

function unionKnown(character: Character): ReadonlySet<string> {
  const known = new Set<string>();
  for (const source of character.castingSources) for (const id of knownSpellIds(character, String(source.grantingRef.entityId))) known.add(id);
  return known;
}

function describe(prerequisite: Prerequisite, pack: RulePack): string {
  if (prerequisite.kind === "min-class-level") return `${pack.classes.get(prerequisite.classRef.entityId)?.name ?? String(prerequisite.classRef.entityId)} nível ${prerequisite.level}`;
  if (prerequisite.kind === "has-feature") return pack.features.get(prerequisite.featureRef.entityId)?.name ?? String(prerequisite.featureRef.entityId);
  if (prerequisite.kind === "knows-spell") return `conhecer ${pack.spells.get(prerequisite.spellRef.entityId)?.name ?? String(prerequisite.spellRef.entityId)}`;
  if (prerequisite.kind === "min-ability-score") return `${ABILITY_NAMES[prerequisite.ability] ?? prerequisite.ability} ${prerequisite.score}`;
  if (prerequisite.kind === "spellcasting-ability-present") return "poder conjurar magias";
  return "";
}

export interface PrerequisiteContext {
  readonly classLevels: ReadonlyMap<string, number>;
  readonly ownedFeatures: ReadonlySet<string>;
  readonly knownSpells: ReadonlySet<string>;
  readonly casts: boolean;
  readonly abilityScores?: Readonly<Partial<Record<Ability, number>>>;
}

/** `true` quando atendido, `false` quando não, `undefined` quando o requisito não é verificável aqui. */
export function prerequisiteMet(prerequisite: Prerequisite, context: PrerequisiteContext): boolean | undefined {
  switch (prerequisite.kind) {
    case "min-class-level": return (context.classLevels.get(String(prerequisite.classRef.entityId)) ?? 0) >= prerequisite.level;
    case "has-feature": return context.ownedFeatures.has(String(prerequisite.featureRef.entityId));
    case "knows-spell": return context.knownSpells.has(String(prerequisite.spellRef.entityId));
    case "spellcasting-ability-present": return context.casts;
    case "min-ability-score": return context.abilityScores ? (context.abilityScores[prerequisite.ability] ?? 0) >= prerequisite.score : undefined;
    case "any-of": {
      const results = prerequisite.options.map((option) => prerequisiteMet(option, context));
      return results.includes(true) ? true : results.includes(undefined) ? undefined : false;
    }
    default: return undefined;
  }
}

export function validateEvolutionChoices(input: EvolutionValidationInput): readonly ProgressionIssue[] {
  const { character, pack, classId, targetLevel, subclassId, choices, definitions } = input;
  const issues: ProgressionIssue[] = [];
  const classes = projectClasses(character, classId, targetLevel, subclassId);
  const sources = castingSourcesOf(classes);
  const known = unionKnown(character);
  const requested = new Set(choices.flatMap((selection) => selection.selectedIds.map((ref) => String(ref.entityId))));
  const owned = new Set<string>([...featureIdsOwned({ choices: character.choices, classes }, pack), ...requested]);
  const priorOptions = chosenOptionIds(character.choices);
  const context: PrerequisiteContext = {
    classLevels: new Map(classes.map((entry) => [String(entry.classId), entry.level])),
    ownedFeatures: owned,
    knownSpells: new Set([...known, ...requested]),
    casts: sources.length > 0,
    ...(input.abilityScores ? { abilityScores: input.abilityScores } : {}),
  };
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const expertiseBefore = new Set(character.choices.filter((selection) => selection.choiceId.includes("expertise")).flatMap((selection) => selection.selectedIds.map((ref) => String(ref.entityId))));

  for (const selection of choices) {
    const field = `choices.${selection.choiceId}`;
    const ids = selection.selectedIds.map((ref) => String(ref.entityId));
    const parsed = parseEvolutionChoiceId(selection.choiceId);
    if (parsed) {
      const constraint = spellConstraintFor(parsed, sources, pack);
      if (!constraint) { issues.push(issue("invalid-choice", field, `A escolha "${selection.choiceId}" não se aplica a este personagem.`)); continue; }
      if (parsed.kind === "spell-swap") {
        if (ids.length !== 0 && ids.length !== 2) issues.push(issue("invalid-choice", field, "A troca de magia exige a magia que sai e a que entra."));
        if (ids.length === 2) {
          const keyKnown = knownSpellIds(character, parsed.key);
          if (!keyKnown.has(ids[0])) issues.push(issue("invalid-choice", field, `Você não conhece "${pack.spells.get(ids[0] as EntityId)?.name ?? ids[0]}" para trocá-la.`));
          if (keyKnown.has(ids[1])) issues.push(issue("duplicate-choice", field, `Você já conhece "${pack.spells.get(ids[1] as EntityId)?.name ?? ids[1]}".`));
          const problem = spellProblem(pack, ids[1], constraint);
          if (problem) issues.push(issue("invalid-choice", field, problem));
        }
        continue;
      }
      const fromSpellbook = parsed.kind === "spell-mastery" || parsed.kind === "signature-spells";
      for (const id of ids) {
        const problem = spellProblem(pack, id, constraint);
        if (problem) issues.push(issue("invalid-choice", field, problem));
        if (fromSpellbook && !knownSpellIds(character, "wizard").has(id)) issues.push(issue("invalid-choice", field, `"${pack.spells.get(id as EntityId)?.name ?? id}" precisa estar no seu grimório.`));
        if (!fromSpellbook && known.has(id)) issues.push(issue("duplicate-choice", field, `Você já conhece "${pack.spells.get(id as EntityId)?.name ?? id}".`));
      }
      if (parsed.kind === "spell-mastery" && ids.length === 2) {
        const levels = ids.map((id) => pack.spells.get(id as EntityId)?.level).sort();
        if (levels[0] !== 1 || levels[1] !== 2) issues.push(issue("invalid-choice", field, "Dominar Magia exige uma magia de 1º nível e uma de 2º nível."));
      }
      continue;
    }

    const definition = definitionById.get(selection.choiceId);
    for (const id of ids) {
      const feature = pack.features.get(id as EntityId);
      if (feature?.tags.includes("evolution-option")) {
        for (const prerequisite of feature.eligibility) {
          if (prerequisiteMet(prerequisite, context) === false) issues.push(issue("invalid-choice", field, `${feature.name} exige ${describe(prerequisite, pack)}.`));
        }
        if (definition?.unique && priorOptions.has(id) && !/invocation-swap/.test(selection.choiceId)) issues.push(issue("duplicate-choice", field, `${feature.name} já foi escolhida e não pode se repetir.`));
      }
      if (definition?.kind === "feat") {
        const feat = pack.feats.get(id as EntityId);
        if (feat) {
          if (priorOptions.has(id)) issues.push(issue("duplicate-choice", field, `O talento ${feat.name} já foi escolhido.`));
          for (const prerequisite of feat.prerequisites) if (prerequisiteMet(prerequisite, context) === false) issues.push(issue("invalid-choice", field, `${feat.name} exige ${describe(prerequisite, pack)}.`));
        }
      }
      if (definition?.kind === "expertise" && expertiseBefore.has(id)) issues.push(issue("duplicate-choice", field, `Você já tem especialização em "${id}".`));
    }
    if (/\.invocation-swap\.\d+$/.test(selection.choiceId) && ids.length !== 0) {
      if (ids.length !== 2) issues.push(issue("invalid-choice", field, "A troca de invocação exige a invocação que sai e a que entra."));
      else if (!priorOptions.has(ids[0])) issues.push(issue("invalid-choice", field, "Você só pode trocar uma invocação que já conhece."));
    }
  }

  // Aumento de Habilidade ou talento: um dos dois por nível de classe.
  const asi = choices.find((selection) => new RegExp(`^${classId}\\.asi\\.${targetLevel}$`).test(selection.choiceId));
  const feat = choices.find((selection) => new RegExp(`^${classId}\\.feat\\.${targetLevel}$`).test(selection.choiceId));
  if ((asi?.selectedIds.length ?? 0) > 0 && (feat?.selectedIds.length ?? 0) > 0) issues.push(issue("invalid-choice", `choices.${classId}.feat.${targetLevel}`, "Escolha aumento de atributo ou um talento, não os dois."));
  return issues;
}
