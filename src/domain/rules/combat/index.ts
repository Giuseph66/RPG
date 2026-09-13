import { type DiceRoll } from "@domain/contracts/dice";
import { type Character, type HitPointsState } from "@domain/contracts/character";
import { type CommandId, type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { type DamageType, type SourceRef } from "@domain/contracts/primitives";
import {
  type ApplyDamagePayload,
  type ApplyHealingPayload,
  type ApplyTempHpPayload,
  type Command,
  type Effect,
  type EndConcentrationPayload,
  type InputRequest,
  type ResolveAttackPayload,
  type ResolveDeathSavePayload,
  type RuleError,
  type RuleResult,
} from "@domain/contracts/rules";

const SOURCE: SourceRef = {
  sourceId: "phb-ptbr-local-2017" as SourceRef["sourceId"],
  chapter: "Capítulo 9",
  printedPage: 198,
  pdfPage: 197,
  section: "Dano, pontos de vida e morte",
};

export interface DamageDefense {
  readonly resistances?: readonly DamageType[];
  readonly immunities?: readonly DamageType[];
  readonly vulnerabilities?: readonly DamageType[];
  /** Redução fixa já autorizada pela fonte e filtrada pelo chamador. */
  readonly flatReduction?: number;
}

export interface ApplyDamageInput extends Omit<ApplyDamagePayload, "diceResultIds"> {
  readonly defense?: DamageDefense;
  readonly maximumHitPoints?: number;
  readonly critical?: boolean;
  /** O dano continua sendo um evento de concentração mesmo se foi absorvido por PV temporários. */
  readonly concentrationSave?: boolean;
}

export interface ApplyHealingInput extends Omit<ApplyHealingPayload, "diceResultIds"> {
  readonly maximumHitPoints: number;
}

export interface ApplyTempHpInput extends Omit<ApplyTempHpPayload, "diceResultIds"> {}

export interface AttackDamageComponent {
  readonly roll: DiceRoll;
  readonly damageType: DamageType;
  readonly defense?: DamageDefense;
}

export interface ResolveAttackInput extends Omit<ResolveAttackPayload, "attackRollId" | "damageRollIds"> {
  readonly attackRoll: DiceRoll;
  readonly damageParts: readonly AttackDamageComponent[];
  readonly targetArmorClass?: number;
  readonly maximumHitPoints?: number;
}

function sourceOf(source: DefinitionRef | SourceRef | undefined): DefinitionRef | SourceRef {
  return source ?? SOURCE;
}

function sourceRefOf(source: DefinitionRef | SourceRef | undefined): SourceRef {
  return "chapter" in (source ?? SOURCE) ? (source as SourceRef) : SOURCE;
}

function reject(character: Character, message: string, code: RuleError["code"] = "invalid-command", source?: DefinitionRef | SourceRef): RuleResult {
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

function needsInput(reason: string, requestId: Uuid, source?: DefinitionRef | SourceRef): RuleResult {
  return {
    status: "needsInput",
    requests: [{ id: requestId, reason, validOptions: [] } satisfies InputRequest],
    sourceRefs: [sourceRefOf(source)],
  };
}

function validAmount(amount: number): boolean {
  return Number.isFinite(amount) && Number.isInteger(amount) && amount >= 0;
}

function defenseAmount(amount: number, damageType: DamageType, defense: DamageDefense = {}): { readonly amount: number; readonly note: string } {
  const afterReduction = Math.max(0, amount - Math.max(0, defense.flatReduction ?? 0));
  if ((defense.immunities ?? []).includes(damageType)) return { amount: 0, note: "imunidade ao tipo de dano reduziu a parcela a 0" };
  const resistant = (defense.resistances ?? []).includes(damageType);
  const vulnerable = (defense.vulnerabilities ?? []).includes(damageType);
  // Resistência repetida não é composta; a vulnerabilidade é aplicada uma vez.
  const afterResistance = resistant ? Math.floor(afterReduction / 2) : afterReduction;
  const finalAmount = vulnerable ? afterResistance * 2 : afterResistance;
  return { amount: finalAmount, note: `${resistant ? "resistência aplicou metade arredondada para baixo" : "sem resistência"}; ${vulnerable ? "vulnerabilidade dobrou uma vez" : "sem vulnerabilidade"}` };
}

function addConcentrationPending(character: Character, nextHp: number, damage: number, enabled: boolean): Character {
  // Dropping to 0 PV is still a damage event. Keep the concentration save
  // request so the caller can resolve both domain consequences explicitly.
  if (!enabled || !character.concentration || damage <= 0 || nextHp < 0) return character;
  const description = `Teste de resistência de Constituição para concentração: CD ${Math.max(10, Math.floor(damage / 2))}, por dano recebido ${damage}.`;
  if (character.pendingResolutions.some((pending) => pending.kind === "unresolved-rule" && pending.description === description)) return character;
  return { ...character, pendingResolutions: [...character.pendingResolutions, { kind: "unresolved-rule", description, sourceRef: SOURCE }] };
}

/** Aplica dano final aos PV temporários e depois aos PV atuais, sem mutar o personagem. */
export function applyDamage(character: Character, input: ApplyDamageInput): RuleResult {
  const source = input.sourceRef;
  if (!validAmount(input.amount)) return reject(character, `Quantidade de dano inválida: ${input.amount}.`, "invalid-command", source);
  const resolved = defenseAmount(input.amount, input.damageType, input.defense);
  const before = character.hp;
  const absorbed = Math.min(before.temp, resolved.amount);
  const remaining = resolved.amount - absorbed;
  const newCurrent = Math.max(0, before.current - remaining);
  const enteredZero = before.current > 0 && newCurrent === 0;
  const criticalAtZero = input.critical === true && before.current === 0;
  let deathSaves = character.deathSaves;
  if (newCurrent > 0) {
    deathSaves = { successes: 0, failures: 0, stable: false };
  } else if (resolved.amount > 0 && (before.current === 0 || enteredZero)) {
    const failures = Math.min(3, deathSaves.failures + (criticalAtZero ? 2 : 1));
    deathSaves = { successes: before.current === 0 ? 0 : deathSaves.successes, failures, stable: false };
  } else if (enteredZero) {
    deathSaves = { successes: 0, failures: 0, stable: false };
  }
  if (input.maximumHitPoints !== undefined && (!validAmount(input.maximumHitPoints) || input.maximumHitPoints <= 0)) {
    return reject(character, "Máximo de PV inválido para resolver dano e morte.", "invalid-command", source);
  }
  // Massive damage also applies when the character was already at 0 PV.  The
  // damage event itself is what kills in that state; temporary PV do not turn
  // damage at 0 PV into a non-lethal hit.
  const instantDeath = input.maximumHitPoints !== undefined && (
    (enteredZero && remaining - before.current >= input.maximumHitPoints)
    || (before.current === 0 && resolved.amount >= input.maximumHitPoints)
  );
  if (instantDeath) deathSaves = { successes: 0, failures: 3, stable: false };
  const hp: HitPointsState = { current: newCurrent, temp: before.temp - absorbed };
  let nextState: Character = { ...character, hp, deathSaves };
  nextState = addConcentrationPending(nextState, newCurrent, resolved.amount, input.concentrationSave !== false);
  const effect: Effect = { kind: "hp-changed", targetCharacterId: character.id, sourceRef: sourceOf(source), payload: { delta: -(resolved.amount), newCurrent, newTemp: hp.temp } };
  const descriptions = [
    `${input.amount} de ${input.damageType} → ${resolved.amount} após redução e defesas (${resolved.note}).`,
    `${absorbed} absorvido por PV temporários; PV atuais ${before.current} → ${newCurrent}.`,
  ];
  if (enteredZero) descriptions.push(instantDeath ? "Dano excedente igual ou superior ao máximo de PV causou morte instantânea." : "Atingir 0 PV iniciou a resolução de queda.");
  if (nextState.pendingResolutions.length > character.pendingResolutions.length) descriptions.push("Dano recebido enquanto concentrando deixou uma solicitação de teste pendente; a concentração ainda não foi encerrada.");
  return success(character, nextState, [effect], descriptions, source);
}

/** Cura normal limitada ao máximo; excesso não vira PV temporário. */
export function applyHealing(character: Character, input: ApplyHealingInput): RuleResult {
  if (!validAmount(input.amount) || !validAmount(input.maximumHitPoints) || input.maximumHitPoints <= 0) return reject(character, "Quantidade ou máximo de PV inválido para cura.", "invalid-command", input.sourceRef);
  if (character.deathSaves.failures >= 3) return reject(character, "Personagem morto não recebe cura normal.", "invalid-context", input.sourceRef);
  const current = Math.min(input.maximumHitPoints, character.hp.current + input.amount);
  const recovered = current - character.hp.current;
  const nextState: Character = { ...character, hp: { current, temp: character.hp.temp }, deathSaves: current > 0 ? { successes: 0, failures: 0, stable: false } : character.deathSaves };
  const effect: Effect = { kind: "hp-changed", targetCharacterId: character.id, sourceRef: sourceOf(input.sourceRef), payload: { delta: recovered, newCurrent: current, newTemp: character.hp.temp } };
  return success(character, nextState, [effect], [`Cura ${input.amount} limitada a ${recovered}; PV ${character.hp.current} → ${current}, teto ${input.maximumHitPoints}.`, ...(current > 0 ? ["Recuperar PV encerrou queda e zerou contadores de morte."] : [])], input.sourceRef);
}

/** PV temporários não acumulam: a política do comando escolhe substituir ou conservar. */
export function applyTempHp(character: Character, input: ApplyTempHpInput): RuleResult {
  if (!validAmount(input.amount) || input.amount <= 0) return reject(character, `Quantidade de PV temporários inválida: ${input.amount}.`, "invalid-command", input.sourceRef);
  const newTemp = input.stacking === "highest-wins" ? Math.max(character.hp.temp, input.amount) : input.amount;
  const nextState = newTemp === character.hp.temp ? character : { ...character, hp: { ...character.hp, temp: newTemp } };
  const effect: Effect = { kind: "hp-changed", targetCharacterId: character.id, sourceRef: sourceOf(input.sourceRef), payload: { delta: 0, newCurrent: nextState.hp.current, newTemp } };
  return success(character, nextState, [effect], [`PV temporários ${character.hp.temp} → ${newTemp}; ${input.stacking === "highest-wins" ? "prevaleceu o maior valor" : "a fonte substituiu o valor existente"}.`], input.sourceRef);
}

/** Resolve ataque somente quando o alvo é explicitamente informado e é este personagem. */
export function resolveAttack(character: Character, input: ResolveAttackInput): RuleResult {
  if (!input.targetId) return needsInput("Informe explicitamente o alvo do ataque; o motor não escolhe alvo.", input.attackRoll.id, input.attackSourceRef);
  if (input.targetId !== character.id) return reject(character, "O alvo informado não pertence ao estado recebido.", "invalid-context", input.attackSourceRef);
  if (input.damageParts.length === 0) return reject(character, "Ataque sem parcelas de dano resolvíveis.", "unresolved-rule", input.attackSourceRef);
  const targetArmorClass = input.targetArmorClass;
  if (typeof targetArmorClass !== "number" || !Number.isInteger(targetArmorClass) || targetArmorClass < 0) return needsInput("Informe a CA do alvo para resolver o ataque; o motor não deriva um alvo ausente.", input.attackRoll.id, input.attackSourceRef);
  const armorClass = targetArmorClass as number;
  if (input.attackRoll.purpose !== "attack") return reject(character, "A rolagem vinculada não é uma rolagem de ataque.", "invalid-command", input.attackSourceRef);
  if (input.attackRoll.total < 1 && input.attackRoll.rawDice.length === 0) return reject(character, "Rolagem de ataque sem resultado.", "invalid-command", input.attackSourceRef);
  const natural = input.attackRoll.rawDice.length > 0 ? input.attackRoll.rawDice[input.attackRoll.selectedIndexes[0] ?? 0] : undefined;
  if (natural === undefined) return reject(character, "Rolagem de ataque sem dado natural selecionável.", "invalid-command", input.attackSourceRef);
  if (natural === 1) return success(character, character, [], ["1 natural: ataque errou sem aplicar dano."], input.attackSourceRef);
  if (natural !== 20 && input.attackRoll.total < armorClass) return success(character, character, [], ["Ataque não atingiu a CA do alvo; nenhum dano aplicado."], input.attackSourceRef);
  const critical = natural === 20;
  let state = character;
  const effects: Effect[] = [];
  const explanations: string[] = [critical ? "20 natural: ataque acertou criticamente; dados de dano foram dobrados." : "Ataque acertou; cada parcela de dano foi resolvida separadamente."];
  for (const component of input.damageParts) {
    const amount = (critical ? component.roll.subtotal * 2 : component.roll.subtotal) + component.roll.modifier;
    const result = applyDamage(state, { amount, damageType: component.damageType, defense: component.defense, maximumHitPoints: input.maximumHitPoints, critical, sourceRef: input.attackSourceRef });
    if (result.status !== "success") return result;
    state = result.nextState;
    effects.push(...result.effects);
    explanations.push(...result.explanations.map((item) => String(item.value)));
  }
  return success(character, state, effects, explanations, input.attackSourceRef);
}

/** Teste de morte: usa o valor natural, sem inventar atributo ou proficiência. */
export function resolveDeathSave(character: Character, input: ResolveDeathSavePayload & { readonly natural?: number; readonly total?: number }): RuleResult {
  if (character.hp.current !== 0 || character.deathSaves.stable) return reject(character, "Teste contra a morte só ocorre com 0 PV e estado morrendo.", "invalid-context");
  if (character.deathSaves.failures >= 3) return reject(character, "Personagem já atingiu três falhas e está morto.", "invalid-context");
  // A total modified by bonuses is not the natural d20.  Callers must pass
  // the selected die face (the dispatcher extracts it from rawDice).
  const natural = input.natural;
  if (typeof natural !== "number" || !Number.isInteger(natural) || natural < 1 || natural > 20) return reject(character, "Resultado natural do teste contra a morte deve vir do dado bruto (rawDice), entre 1 e 20.", "invalid-command");
  const naturalValue = natural as number;
  if (naturalValue === 20) {
    const nextState = { ...character, hp: { ...character.hp, current: 1 }, deathSaves: { successes: 0, failures: 0, stable: false } };
    const effect: Effect = { kind: "hp-changed", targetCharacterId: character.id, sourceRef: SOURCE, payload: { delta: 1, newCurrent: 1, newTemp: character.hp.temp } };
    return success(character, nextState, [effect], ["20 natural no teste contra a morte recuperou 1 PV e zerou contadores."], SOURCE);
  }
  const failures = Math.min(3, character.deathSaves.failures + (naturalValue === 1 ? 2 : 1));
  const successes = naturalValue >= 10 ? Math.min(3, character.deathSaves.successes + 1) : character.deathSaves.successes;
  const stable = successes >= 3;
  const deathSaves = stable ? { successes: 0, failures: 0, stable: true } : { successes, failures, stable: false };
  const nextState = { ...character, deathSaves };
  const effect: Effect = { kind: "death-save-recorded", targetCharacterId: character.id, sourceRef: SOURCE, payload: { deathSaves } };
  return success(character, nextState, [effect], [naturalValue === 1 ? "1 natural registrou duas falhas." : `${naturalValue >= 10 ? "Sucesso" : "Falha"} no teste contra a morte: ${successes} sucessos, ${failures} falhas.`, ...(stable ? ["Três sucessos estabilizaram o personagem e zeraram os contadores."] : []), ...(failures >= 3 ? ["Três falhas causaram morte."] : [])], SOURCE);
}

export function endConcentration(character: Character, input: EndConcentrationPayload): RuleResult {
  if (!character.concentration) return success(character, character, [], ["Concentração já estava encerrada; comando idempotente."], SOURCE);
  const concentration = character.concentration;
  const nextState: Character = { ...character, concentration: undefined, pendingResolutions: character.pendingResolutions.filter((pending) => !(pending.kind === "unresolved-rule" && pending.description.includes("concentração"))) };
  const effect: Effect = { kind: "concentration-ended", targetCharacterId: character.id, sourceRef: concentration.sourceRef, payload: { reason: input.reason } };
  return success(character, nextState, [effect], [`Concentração encerrada por ${input.reason}; pedidos dependentes foram concluídos.`], concentration.sourceRef);
}

/** Expõe a CD determinística para a camada que coletará a rolagem antes de resolver o teste. */
export function concentrationSaveRequest(character: Character, damageReceived: number): InputRequest | undefined {
  if (!character.concentration || !validAmount(damageReceived) || damageReceived <= 0) return undefined;
  return { id: character.concentration.effectId, reason: `Teste de Constituição para manter concentração, CD ${Math.max(10, Math.floor(damageReceived / 2))}.`, validOptions: [] };
}

export interface CombatCommandContext {
  readonly diceResults?: ReadonlyMap<Uuid, DiceRoll>;
  readonly processedCommandIds?: ReadonlySet<CommandId>;
  readonly targetArmorClass?: number;
  readonly maximumHitPoints?: number;
  readonly defense?: DamageDefense;
  readonly damageTypes?: ReadonlyMap<Uuid, DamageType>;
}

/** Dispatcher opcional para a camada de aplicação; não persiste e não gera aleatoriedade. */
export function resolveCombatCommand(character: Character, command: Command, context: CombatCommandContext = {}): RuleResult {
  if (command.characterId !== character.id) return reject(character, "Comando não pertence ao personagem recebido.", "invalid-context");
  if (context.processedCommandIds?.has(command.commandId)) return success(character, character, [], ["Comando já processado; nenhum efeito foi reaplicado."], SOURCE);
  switch (command.kind) {
    case "apply-damage":
      return applyDamage(character, { ...command.payload, defense: context.defense, maximumHitPoints: context.maximumHitPoints });
    case "apply-healing":
      if (context.maximumHitPoints === undefined) return needsInput("Informe o máximo efetivo de PV para curar.", character.id, command.payload.sourceRef);
      return applyHealing(character, { ...command.payload, maximumHitPoints: context.maximumHitPoints });
    case "apply-temp-hp":
      return applyTempHp(character, command.payload);
    case "resolve-death-save": {
      const roll = context.diceResults?.get(command.payload.rollId);
      if (!roll) return needsInput("Informe a rolagem vinculada do teste contra a morte.", command.payload.rollId);
      return resolveDeathSave(character, { ...command.payload, natural: roll.rawDice[roll.selectedIndexes[0] ?? 0], total: roll.total });
    }
    case "end-concentration":
      return endConcentration(character, command.payload);
    case "resolve-attack": {
      const attackRoll = context.diceResults?.get(command.payload.attackRollId);
      if (!attackRoll) return needsInput("Informe a rolagem de ataque vinculada ao comando.", command.payload.attackRollId, command.payload.attackSourceRef);
      const damageParts = command.payload.damageRollIds.map((id) => {
        const roll = context.diceResults?.get(id);
        const damageType = context.damageTypes?.get(id);
        return roll && damageType ? { roll, damageType, defense: context.defense } : undefined;
      });
      if (damageParts.some((part) => part === undefined)) return needsInput("Informe todas as rolagens e o tipo de cada parcela de dano pela definição do ataque.", command.payload.damageRollIds.find((id) => !context.diceResults?.has(id) || !context.damageTypes?.has(id)) ?? command.payload.attackRollId, command.payload.attackSourceRef);
      return resolveAttack(character, { attackSourceRef: command.payload.attackSourceRef, targetId: command.payload.targetId, attackRoll, damageParts: damageParts as AttackDamageComponent[], maximumHitPoints: context.maximumHitPoints, targetArmorClass: context.targetArmorClass });
    }
    default:
      return reject(character, `Comando de combate não suportado: ${command.kind}.`, "invalid-command");
  }
}

export { SOURCE as COMBAT_SOURCE_REF };
