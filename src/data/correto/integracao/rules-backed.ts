/**
 * Liga os cards curados de Regras/Combate/Aventura ao texto integral do Livro do Jogador.
 *
 * Os ids (`ability-check`, `attack-roll`, …) já existiam no compêndio com um resumo escrito
 * à mão; aqui apenas se anexa o recorte literal da fonte ao MESMO id, sem criar card novo.
 *
 * Exceção registrada: `d20-resolution` aponta para a Introdução do livro ("O d20"), e essa
 * seção não está entre as extrações do repositório. O card segue com o resumo curado até que
 * a fonte exista; nada foi inventado para preencher a lacuna.
 */
import { PHB_ABILITIES_AND_SKILLS } from "@data/correto/abilities-and-skills";
import { PHB_ADVENTURING } from "@data/correto/adventuring";
import { PHB_COMBAT } from "@data/correto/combat";

import { sliceSection } from "./section-text";

type SourceSection = { readonly name: string; readonly sourceHeading: string; readonly pdfPages: readonly [number, number]; readonly printedPages: readonly [number, number]; readonly text: string };

export interface BookBackedRuleText {
  readonly id: string;
  readonly sourceHeading: string;
  readonly pdfPages: readonly [number, number];
  readonly printedPages: readonly [number, number];
  readonly text: string;
}

function section(entries: readonly SourceSection[], name: string): SourceSection {
  const found = entries.find((entry) => entry.name === name);
  if (!found) throw new Error(`Seção "${name}" ausente na extração do Livro do Jogador.`);
  return found;
}

/** `heading` vazio usa a seção inteira; senão recorta a subseção até o primeiro `stop`. */
function backed(id: string, source: SourceSection, heading: string, stopHeadings: readonly string[] = []): BookBackedRuleText {
  const text = heading === "" ? source.text : sliceSection(source.text, heading, stopHeadings);
  if (!text.trim()) throw new Error(`Recorte vazio para "${id}" em "${source.name}".`);
  return { id, sourceHeading: heading === "" ? source.sourceHeading : heading, pdfPages: source.pdfPages, printedPages: source.printedPages, text };
}

const abilityScores = section(PHB_ABILITIES_AND_SKILLS, "Valores E Modificadores De Habilidade");
const advantage = section(PHB_ABILITIES_AND_SKILLS, "Vantagem E Desvantagem");
const proficiency = section(PHB_ABILITIES_AND_SKILLS, "Bônus De Proficiência");
const abilityChecks = section(PHB_ABILITIES_AND_SKILLS, "Testes De Habilidade");
const savingThrows = section(PHB_ABILITIES_AND_SKILLS, "Testes De Resistência");

export const PHB_RULES_BACKED_TEXTS: readonly BookBackedRuleText[] = [
  backed("ability-modifier", abilityScores, ""),
  backed("advantage-disadvantage", advantage, ""),
  backed("proficiency-bonus", proficiency, ""),
  backed("ability-check", abilityChecks, "TESTES DE HABILIDADE", ["TESTES RESISTIDOS"]),
  backed("contested-check", abilityChecks, "TESTES RESISTIDOS", ["PERÍCIAS"]),
  backed("passive-check", abilityChecks, "TESTES PASSIVOS", ["TRABALHO EM EQUIPE"]),
  backed("group-check", abilityChecks, "TESTES EM GRUPO"),
  backed("saving-throw", savingThrows, ""),
];

const combatOrder = section(PHB_COMBAT, "A Ordem De Combate");
const combatActions = section(PHB_COMBAT, "Ações Em Combate");
const makingAttack = section(PHB_COMBAT, "Realizando Um Ataque");
const cover = section(PHB_COMBAT, "Cobertura");
const damageHealing = section(PHB_COMBAT, "Dano E Cura");

export const PHB_COMBAT_BACKED_TEXTS: readonly BookBackedRuleText[] = [
  backed("combat-order", combatOrder, "A ORDEM DE COMBATE", ["SEU TURNO"]),
  backed("combat-turn-economy", combatOrder, "SEU TURNO"),
  backed("combat-actions", combatActions, ""),
  backed("attack-roll", makingAttack, "REALIZANDO UM ATAQUE", ["ATAQUES DE OPORTUNIDADE"]),
  backed("opportunity-attack", makingAttack, "ATAQUES DE OPORTUNIDADE", ["COMBATER COM DUAS ARMAS"]),
  backed("cover", cover, ""),
  backed("damage-and-healing", damageHealing, "DANO E CURA", ["TESTES DE RESISTÊNCIA CONTRA A MORTE"]),
  backed("death-saving-throw", damageHealing, "TESTES DE RESISTÊNCIA CONTRA A MORTE", ["PONTOS DE VIDA TEMPORÁRIOS"]),
  backed("temporary-hit-points", damageHealing, "PONTOS DE VIDA TEMPORÁRIOS"),
];

const gameTime = section(PHB_ADVENTURING, "Tempo");
const environment = section(PHB_ADVENTURING, "O Ambiente");
const social = section(PHB_ADVENTURING, "Interação Social");
const downtime = section(PHB_ADVENTURING, "Entre Aventuras");

export const PHB_ADVENTURE_BACKED_TEXTS: readonly BookBackedRuleText[] = [
  backed("game-time", gameTime, ""),
  backed("environment-visibility", environment, "LUZ E VISÃO", ["COMIDA E ÁGUA"]),
  backed("fall", environment, "QUEDA", ["ASFIXIA"]),
  backed("suffocation", environment, "ASFIXIA", ["DIVIDINDO O GRUPO"]),
  backed("object-interaction", environment, "INTERAÇÃO COM OBJETOS"),
  backed("social-interaction", social, ""),
  backed("downtime", downtime, ""),
];

/** Todos os recortes acima, indexados pelo id canônico do card. */
export const PHB_BACKED_TEXT_BY_ID: ReadonlyMap<string, BookBackedRuleText> = new Map(
  [...PHB_RULES_BACKED_TEXTS, ...PHB_COMBAT_BACKED_TEXTS, ...PHB_ADVENTURE_BACKED_TEXTS].map((entry) => [entry.id, entry]),
);

/** `d20-resolution` continua sem fonte integral no repositório; ver cabeçalho do arquivo. */
export const PHB_RULES_WITHOUT_SOURCE: readonly string[] = ["d20-resolution"];
