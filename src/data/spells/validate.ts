import { isEntityId } from "@domain/contracts/ids";
import { type SpellDefinition } from "@domain/contracts/definitions/spell";
import { RULESET_ID } from "./common";

export type SpellValidationCode =
  | "malformed" | "invalid-id" | "duplicate-id" | "missing-name" | "missing-source"
  | "foreign-source" | "invalid-level" | "invalid-school" | "invalid-range"
  | "invalid-duration" | "invalid-components" | "invalid-classes" | "invalid-meta";

export interface SpellValidationIssue {
  readonly code: SpellValidationCode;
  readonly field: string;
  readonly spellId?: string;
  readonly message: string;
}

const schools = new Set(["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"]);
const ranges = new Set(["self", "touch", "distance", "special"]);
const durations = new Set(["instantaneous", "rounds", "minutes", "hours", "until-dispelled", "special"]);

export function validateSpellDefinition(value: unknown): readonly SpellValidationIssue[] {
  const issues: SpellValidationIssue[] = [];
  if (!value || typeof value !== "object") return [{ code: "malformed", field: "spell", message: "Entrada de magia deve ser um objeto." }];
  const spell = value as Partial<SpellDefinition> & Record<string, unknown>;
  const id = typeof spell.id === "string" ? spell.id : undefined;
  if (!id || !isEntityId(id)) issues.push({ code: "invalid-id", field: "id", spellId: id, message: "ID deve ser EntityId em kebab-case." });
  if (typeof spell.name !== "string" || spell.name.trim() === "") issues.push({ code: "missing-name", field: "name", spellId: id, message: "Nome de exibição é obrigatório e não define o ID." });
  if (!Array.isArray(spell.sourceRefs) || spell.sourceRefs.length === 0) issues.push({ code: "missing-source", field: "sourceRefs", spellId: id, message: "Toda magia precisa de referência primária explícita." });
  else for (const source of spell.sourceRefs) {
    if (!source || typeof source !== "object" || source.sourceId !== RULESET_ID) issues.push({ code: "foreign-source", field: "sourceRefs.sourceId", spellId: id, message: "Fonte deve ser o pack local phb-ptbr-local-2017." });
  }
  if (!Number.isInteger(spell.level) || (spell.level as number) < 0 || (spell.level as number) > 9) issues.push({ code: "invalid-level", field: "level", spellId: id, message: "Nível deve ser inteiro entre 0 e 9; 0 representa truque." });
  if (typeof spell.school !== "string" || !schools.has(spell.school)) issues.push({ code: "invalid-school", field: "school", spellId: id, message: "Escola de magia ausente ou inválida." });
  if (!spell.range || typeof spell.range !== "object" || !ranges.has((spell.range as { kind?: string }).kind ?? "")) issues.push({ code: "invalid-range", field: "range", spellId: id, message: "Alcance deve declarar self, touch, distance ou special." });
  else if ((spell.range as { kind: string }).kind === "distance" && (!Number.isInteger((spell.range as { distanceCm?: number }).distanceCm) || ((spell.range as { distanceCm: number }).distanceCm) <= 0)) issues.push({ code: "invalid-range", field: "range.distanceCm", spellId: id, message: "Alcance à distância precisa de centímetros inteiros positivos." });
  if (!spell.duration || typeof spell.duration !== "object" || !durations.has((spell.duration as { kind?: string }).kind ?? "")) issues.push({ code: "invalid-duration", field: "duration", spellId: id, message: "Duração deve declarar kind fechado." });
  else if ((spell.duration as { kind: string }).kind !== "instantaneous" && (!Number.isInteger((spell.duration as { amount?: number }).amount) || ((spell.duration as { amount: number }).amount) <= 0)) issues.push({ code: "invalid-duration", field: "duration.amount", spellId: id, message: "Duração não instantânea precisa declarar quantidade inteira positiva." });
  if (!spell.components || typeof spell.components !== "object") issues.push({ code: "invalid-components", field: "components", spellId: id, message: "Componentes V/S/M devem ser declarados." });
  else {
    const components = spell.components as { verbal?: unknown; somatic?: unknown; material?: unknown };
    if (typeof components.verbal !== "boolean" || typeof components.somatic !== "boolean") issues.push({ code: "invalid-components", field: "components", spellId: id, message: "V e S devem ser booleanos explícitos." });
    if (components.material !== undefined) {
      const material = components.material as { descriptionSummary?: unknown; costCp?: unknown; consumed?: unknown };
      if (typeof material.descriptionSummary !== "string" || material.descriptionSummary.trim() === "" || typeof material.consumed !== "boolean") issues.push({ code: "invalid-components", field: "components.material", spellId: id, message: "M precisa de descrição e consumo explícitos." });
      if (material.costCp !== undefined && (!Number.isInteger(material.costCp) || (material.costCp as number) < 0)) issues.push({ code: "invalid-components", field: "components.material.costCp", spellId: id, message: "Custo material deve ser inteiro não negativo em peças de cobre." });
    }
  }
  if (!Array.isArray(spell.classes) || spell.classes.some((classId) => typeof classId !== "string" || !isEntityId(classId))) issues.push({ code: "invalid-classes", field: "classes", spellId: id, message: "Acesso deve usar IDs de classe, nunca labels traduzidos." });
  if (typeof spell.concentration !== "boolean" || typeof spell.ritual !== "boolean" || !spell.targetType || typeof spell.targetType !== "object" || !["melee-spell", "ranged-spell", "none"].includes(spell.attackType as string) || !Array.isArray(spell.damage) || !Array.isArray(spell.healing) || !Array.isArray(spell.effects) || !Array.isArray(spell.pendingDecisionIds)) issues.push({ code: "invalid-meta", field: "metadata", spellId: id, message: "Concentração/ritual, alvo, ataque e coleções de efeito devem ser explícitos." });
  return issues;
}

export function validateSpellCatalog(catalog: readonly unknown[]): readonly SpellValidationIssue[] {
  const issues: SpellValidationIssue[] = [];
  const seen = new Set<string>();
  catalog.forEach((entry, index) => {
    const id = entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : undefined;
    if (id && seen.has(id)) issues.push({ code: "duplicate-id", field: `[${index}].id`, spellId: id, message: `ID de magia duplicado: ${id}.` });
    if (id) seen.add(id);
    issues.push(...validateSpellDefinition(entry).map((issue) => ({ ...issue, field: `[${index}].${issue.field}` })));
  });
  return issues;
}
