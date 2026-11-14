import { asEntityId } from "@domain/contracts/ids";
import type { CreatureContent } from "@domain/campaign/creatures";
import type { CreatureStatBlock } from "@domain/creatures";

function randomSuffix(): string {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random()}`).replaceAll("-", "").replaceAll(".", "");
}

/** ND impresso: “1/4”, “2” ou “—” quando o livro não informa. */
export function challengeText(challenge: CreatureStatBlock["challengeRating"]): string {
  if (!challenge) return "—";
  return challenge.denominator === 1 ? String(challenge.numerator) : `${challenge.numerator}/${challenge.denominator}`;
}

/** O catálogo guarda os nomes do livro em caixa-alta (“LOBO ATROZ”); na cópia viram “Lobo atroz”. */
export function friendlyName(name: string): string {
  const trimmed = name.trim();
  if (trimmed !== trimmed.toLocaleUpperCase("pt-BR") || trimmed === trimmed.toLocaleLowerCase("pt-BR")) return trimmed;
  const lower = trimmed.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

/** Resumo de PV no formato do campo livre do elenco, ex.: “11 (2d8+2)”. */
function hitPointsText(block: CreatureStatBlock): string {
  return `${block.hitPoints.average}${block.hitPoints.hitDice ? ` (${block.hitPoints.hitDice})` : ""}`;
}

/** Nomes das ações e traços, para preencher “Habilidades e magias” sem copiar texto de regras. */
function abilitiesText(block: CreatureStatBlock): string {
  const traits = (block.traits ?? []).map((trait) => trait.name);
  const actions = (block.actions ?? []).map((action) => action.name);
  // O campo livre do elenco aceita até 1200 caracteres.
  return [traits.length ? `Características: ${traits.join(", ")}.` : "", actions.length ? `Ações: ${actions.join(", ")}.` : ""].filter(Boolean).join(" ").slice(0, 1200);
}

/**
 * Cópia editável de um bloco do livro. Ganha id novo — o editor só ressincroniza quando o id muda e
 * dois blocos com o mesmo id colidiriam no catálogo de sugestões — e mantém as fontes originais.
 */
export function copyBookStatBlock(template: CreatureStatBlock, name: string): CreatureStatBlock {
  const note = `Copiado de “${friendlyName(template.name)}” (ND ${challengeText(template.challengeRating)}) como ponto de partida; edite livremente.`;
  return {
    ...template,
    id: asEntityId(`manual-creature-b${randomSuffix()}`),
    name: name.trim() || friendlyName(template.name),
    additionalInfo: { ...template.additionalInfo, notes: [template.additionalInfo?.notes, note].filter(Boolean).join("\n") },
  };
}

/**
 * Altera só o que está vazio: o que o mestre já escreveu nunca é sobrescrito. O bloco estatístico é a
 * exceção, porque é a escolha explícita feita no seletor (o seletor avisa quando há um bloco a substituir).
 */
export function applyBookBase(draft: CreatureContent, template: CreatureStatBlock): Partial<CreatureContent> {
  const patch: { -readonly [Key in keyof CreatureContent]?: CreatureContent[Key] } = { statBlock: copyBookStatBlock(template, draft.name) };
  if (!draft.name.trim()) patch.name = friendlyName(template.name);
  if (!draft.race.trim()) patch.race = friendlyName(template.name);
  if (!draft.hitPoints.trim()) patch.hitPoints = hitPointsText(template);
  if (!draft.armorClass.trim()) patch.armorClass = String(template.armorClass);
  if (!draft.abilities.trim()) patch.abilities = abilitiesText(template);
  return patch;
}
