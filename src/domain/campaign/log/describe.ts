import { CAMPAIGN_LOG_LIMITS, type CampaignLogEntry } from "@domain/contracts/campaign-log";
import { type Character, type ManualAdjustment } from "@domain/contracts/character";
import { type DicePurpose, type DiceRoll } from "@domain/contracts/dice";
import { formatDiceFormula } from "@domain/dice";

/** Parte da entrada que depende só do que aconteceu; identidade, autor e horário vêm de fora. */
export type CampaignLogDraft = Pick<CampaignLogEntry, "kind" | "summary" | "detail" | "rollPurpose" | "rollTotal">;

const PURPOSE_LABELS: Readonly<Record<DicePurpose, string>> = {
  free: "Rolagem",
  attack: "Ataque",
  damage: "Dano",
  healing: "Cura",
  "saving-throw": "Resistência",
  "skill-check": "Teste",
  initiative: "Iniciativa",
  "death-save": "Teste contra a morte",
  "ability-score-generation": "Atributos",
};

const ADJUSTMENT_LABELS: Readonly<Record<string, string>> = {
  "armor-class": "CA",
  initiative: "Iniciativa",
  "attack-roll": "Ataque",
  "ability-check": "Testes",
};

const clip = (value: string, limit: number) => value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
const signed = (value: number) => value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";

export function describeRoll(roll: DiceRoll): CampaignLogDraft {
  const purpose = PURPOSE_LABELS[roll.purpose];
  const label = roll.label && roll.label !== purpose ? `${purpose} · ${roll.label}` : roll.label ?? purpose;
  const dice = roll.rawDice.map((value, index) => roll.discardedIndexes.includes(index) ? `~${value}~` : String(value)).join(", ");
  const mode = roll.expression.mode === "advantage" ? " com vantagem" : roll.expression.mode === "disadvantage" ? " com desvantagem" : "";
  return {
    kind: "roll",
    summary: clip(`${label}: ${roll.total}`, CAMPAIGN_LOG_LIMITS.summary),
    detail: clip(`${formatDiceFormula(roll.expression)}${mode} [${dice}]`, CAMPAIGN_LOG_LIMITS.detail),
    rollPurpose: roll.purpose,
    rollTotal: roll.total,
  };
}

function adjustmentText(adjustment: ManualAdjustment): string | undefined {
  if (adjustment.value.kind !== "number") return undefined;
  const target = ADJUSTMENT_LABELS[adjustment.target.kind] ?? adjustment.target.kind;
  return `${target} ${signed(adjustment.value.amount)}${adjustment.reason ? ` (${adjustment.reason})` : ""}`;
}

/**
 * Compara duas versões da mesma ficha e descreve o que mudou em PV, condições e ajustes.
 * Outras edições (nome, inventário, magias) não entram no histórico da mesa.
 */
export function describeCharacterChange(
  previous: Character | undefined,
  next: Character,
  conditionName: (entityId: string) => string,
): readonly CampaignLogDraft[] {
  if (!previous) return [];
  const drafts: CampaignLogDraft[] = [];

  const before = previous.hp;
  const after = next.hp;
  if (before.current !== after.current || before.temp !== after.temp) {
    const parts: string[] = [];
    const delta = after.current - before.current;
    if (delta < 0) parts.push(`${Math.abs(delta)} de dano`);
    if (delta > 0) parts.push(`${delta} de cura`);
    if (before.temp !== after.temp) parts.push(`PV temporários ${before.temp} → ${after.temp}`);
    drafts.push({
      kind: "hit-points",
      summary: before.current !== after.current ? `PV ${before.current} → ${after.current}` : `PV temporários ${before.temp} → ${after.temp}`,
      ...(parts.length && before.current !== after.current ? { detail: parts.join(" · ") } : {}),
    });
  }

  const idsOf = (character: Character) => new Set(character.conditions.map((condition) => String(condition.definitionRef.entityId)));
  const beforeConditions = idsOf(previous);
  const afterConditions = idsOf(next);
  const added = [...afterConditions].filter((id) => !beforeConditions.has(id)).map(conditionName);
  const removed = [...beforeConditions].filter((id) => !afterConditions.has(id)).map(conditionName);
  if (added.length || removed.length) {
    const summary = [added.length ? `Ganhou ${added.join(", ")}` : "", removed.length ? `Perdeu ${removed.join(", ")}` : ""].filter(Boolean).join(" · ");
    drafts.push({ kind: "conditions", summary: clip(summary, CAMPAIGN_LOG_LIMITS.summary) });
  }

  const key = (adjustment: ManualAdjustment) => `${adjustment.id}|${adjustmentText(adjustment) ?? ""}`;
  const beforeAdjustments = new Map(previous.manualAdjustments.map((adjustment) => [key(adjustment), adjustment]));
  const afterAdjustments = new Map(next.manualAdjustments.map((adjustment) => [key(adjustment), adjustment]));
  const addedAdjustments = [...afterAdjustments].filter(([id]) => !beforeAdjustments.has(id)).flatMap(([, adjustment]) => adjustmentText(adjustment) ?? []);
  const removedAdjustments = [...beforeAdjustments].filter(([id]) => !afterAdjustments.has(id)).flatMap(([, adjustment]) => adjustmentText(adjustment) ?? []);
  if (addedAdjustments.length || removedAdjustments.length) {
    const summary = [addedAdjustments.length ? `Ajuste ${addedAdjustments.join(", ")}` : "", removedAdjustments.length ? `Removido ${removedAdjustments.join(", ")}` : ""].filter(Boolean).join(" · ");
    drafts.push({ kind: "adjustments", summary: clip(summary, CAMPAIGN_LOG_LIMITS.summary) });
  }

  return drafts;
}
