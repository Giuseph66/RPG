/**
 * Resolvedor de `Command.kind: "spend-resource"` — gasto de recursos de classe/personagem
 * (`ResourceState`, `domain/contracts/character.ts`). Autoridade: 10-RULES-ENGINE.md,
 * personagem/recursos.md ("Usos negativos ou acima de limites são rejeitados, nunca
 * silenciosamente normalizados").
 *
 * `capacity` (máximo atual do recurso) é responsabilidade do chamador informar — este módulo
 * não deriva regra (`by-class-level`/`ability-modifier`/etc. já foram resolvidas em
 * `deriveCharacter`/`resourceCapacities`, RULE-001); replicar esse cálculo aqui duplicaria a
 * fonte de verdade. Mesmo padrão de `resolveCombatCommand` recebendo `maximumHitPoints` pronto.
 */

import { type Character, type ResourceState } from "@domain/contracts/character";
import { type DiceRoll } from "@domain/contracts/dice";
import { asEntityId, type DefinitionRef } from "@domain/contracts/ids";
import { type SourceRef } from "@domain/contracts/primitives";
import { type Effect, type RuleError, type RuleResult, type SpendResourcePayload } from "@domain/contracts/rules";
import { applyTempHp } from "@domain/rules/combat";

const SOURCE: SourceRef = {
  sourceId: "phb-ptbr-local-2017" as SourceRef["sourceId"],
  chapter: "Capítulo 4",
  printedPage: 127,
  pdfPage: 126,
  section: "Recursos e recuperação",
};

function sourceOf(source: DefinitionRef | SourceRef | undefined): DefinitionRef | SourceRef {
  return source ?? SOURCE;
}

function sourceRefOf(source: DefinitionRef | SourceRef | undefined): SourceRef {
  return "chapter" in (source ?? SOURCE) ? (source as SourceRef) : SOURCE;
}

function reject(message: string, code: RuleError["code"] = "invalid-command", source?: DefinitionRef | SourceRef): RuleResult {
  return { status: "rejected", errors: [{ code, message, sourceRef: sourceOf(source) }], sourceRefs: [sourceRefOf(source)] };
}

function success(character: Character, nextState: Character, effects: readonly Effect[], descriptions: readonly string[], source?: DefinitionRef | SourceRef): RuleResult {
  const ref = sourceOf(source);
  return {
    status: "success",
    nextState,
    effects,
    explanations: descriptions.map((description) => ({ value: description, contributions: [{ sourceRef: ref, description }] })),
    sourceRefs: [sourceRefOf(source)],
  };
}

function validAmount(amount: number): boolean {
  return Number.isFinite(amount) && Number.isInteger(amount) && amount > 0;
}

export interface SpendResourceInput extends SpendResourcePayload {
  /** Máximo atual do recurso já derivado (`CharacterDerived.resourceCapacities`); nunca recalculado aqui. */
  readonly capacity: number;
  readonly sourceRef?: DefinitionRef | SourceRef;
  /**
   * Vínculo já validado pelo adaptador de composição (classe/feature). O
   * caminho direto mantém o padrão legado: o dono esperado é o personagem.
   */
  readonly ownerInstanceId?: ResourceState["ownerInstanceId"];
}

/**
 * Gasta `amount` unidades de `resourceStateId`, sem mutar `character`. Rejeita (sem descontar
 * nada) quando o recurso não existe/não pertence ao personagem, a quantidade não é positiva, ou
 * o saldo restante é insuficiente.
 */
export function spendResource(character: Character, input: SpendResourceInput): RuleResult {
  const source = input.sourceRef;
  if (!validAmount(input.amount)) return reject(`Quantidade de recurso inválida: ${input.amount}.`, "invalid-command", source);

  const resourceIndex = character.resources.findIndex((resource) => resource.id === input.resourceStateId);
  if (resourceIndex === -1) return reject(`Recurso "${input.resourceStateId}" não existe ou não está ligado a este personagem.`, "invalid-context", source);

  if (!Number.isFinite(input.capacity) || !Number.isInteger(input.capacity) || input.capacity < 0) {
    return reject("Capacidade do recurso não foi derivada; o motor não gasta recurso sem um máximo conhecido.", "invalid-context", source);
  }

  const resource = character.resources[resourceIndex];
  const expectedOwner = input.ownerInstanceId ?? character.id;
  if (resource.ownerInstanceId !== expectedOwner) {
    return reject("O recurso não pertence ao personagem/instância concedente informada.", "invalid-context", source);
  }
  if (!Number.isFinite(resource.spent) || !Number.isInteger(resource.spent) || resource.spent < 0) {
    return reject("Estado de gasto do recurso é inválido; esperado inteiro não negativo.", "invalid-context", source);
  }
  const remaining = input.capacity - resource.spent;
  if (remaining < 0) {
    return reject("Estado de gasto do recurso excede a capacidade derivada.", "invalid-context", source);
  }
  if (input.amount > remaining) return reject(`Saldo insuficiente: restam ${remaining} de ${input.capacity}, pedido foi ${input.amount}.`, "insufficient-resource", source);

  const newSpent = resource.spent + input.amount;
  const nextResource: ResourceState = { ...resource, spent: newSpent };
  const resources = character.resources.map((entry, index) => (index === resourceIndex ? nextResource : entry));
  const nextState: Character = { ...character, resources };

  const effect: Effect = {
    kind: "resource-spent",
    targetCharacterId: character.id,
    sourceRef: sourceOf(source),
    payload: { resourceStateId: resource.id, amount: input.amount, newSpent },
  };
  return success(character, nextState, [effect], [`${input.amount} unidade(s) gasta(s); ${remaining - input.amount} de ${input.capacity} restante(s).`], source);
}

export interface UseTirelessInput {
  readonly resourceStateId: ResourceState["id"];
  readonly capacity: number;
  readonly rollId: DiceRoll["id"];
  readonly roll: DiceRoll;
  readonly wisdomModifier: number;
  readonly sourceRef: DefinitionRef;
}

/** Resolve a ação Incansável numa transição atômica de gasto + PV temporários. */
export function useTireless(character: Character, input: UseTirelessInput): RuleResult {
  if (input.sourceRef.rulesetId !== character.rulesetRef.id || input.sourceRef.entityId !== asEntityId("ranger.tireless")) {
    return reject("Incansável exige a referência da feature Guardião Incansável ativa.", "invalid-context", input.sourceRef);
  }
  const roll = input.roll;
  const face = roll.rawDice.length === 1 ? roll.rawDice[0] : undefined;
  if (roll.id !== input.rollId || roll.purpose !== "healing" ||
    roll.expression.quantity !== 1 || roll.expression.faces !== 8 || roll.expression.modifier !== 0 || roll.expression.mode !== "normal" ||
    !Number.isInteger(face) || face! < 1 || face! > 8 || roll.selectedIndexes.length !== 1 || roll.selectedIndexes[0] !== 0 ||
    roll.discardedIndexes.length !== 0 || roll.subtotal !== face || roll.modifier !== 0 || roll.total !== face) {
    return reject("Incansável exige a rolagem d8 vinculada ao rollId do comando; recurso e PV temporários foram preservados.", "invalid-command", input.sourceRef);
  }
  if (!Number.isInteger(input.wisdomModifier)) return reject("Modificador de Sabedoria derivado ausente ou inválido; Incansável não foi aplicado.", "unresolved-rule", input.sourceRef);
  const resource = character.resources.find((entry) => entry.id === input.resourceStateId);
  if (!resource) return reject(`Recurso "${input.resourceStateId}" não existe ou não está ligado a este personagem.`, "invalid-context", input.sourceRef);
  if (resource.definitionRef.rulesetId !== character.rulesetRef.id || resource.definitionRef.entityId !== asEntityId("ranger.tireless-use")) {
    return reject("A feature Incansável só pode gastar o recurso de usos concedido por ela.", "invalid-context", input.sourceRef);
  }

  const spending = spendResource(character, {
    resourceStateId: input.resourceStateId,
    amount: 1,
    capacity: input.capacity,
    sourceRef: input.sourceRef,
  });
  if (spending.status !== "success") return spending;

  const temporaryHp = Math.max(1, roll.total + input.wisdomModifier);
  const applied = applyTempHp(spending.nextState, {
    amount: temporaryHp,
    stacking: "highest-wins",
    sourceRef: input.sourceRef,
  });
  if (applied.status !== "success") return applied;
  return {
    ...applied,
    effects: [...spending.effects, ...applied.effects],
    explanations: [...spending.explanations, ...applied.explanations],
    sourceRefs: [...new Set([...spending.sourceRefs, ...applied.sourceRefs])],
  };
}

export { SOURCE as RESOURCE_RULE_SOURCE_REF };
