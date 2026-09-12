/**
 * action-dispatcher — implementa `ActionsProps.onIntent` (UI-003, `src/features/actions/types.ts`)
 * ligando um `ActionIntent` clicado na página `/actions` à `ActionCapabilityExecution`
 * correspondente produzida por `deriveActionCapabilities` (`./action-capabilities.ts`).
 *
 * Desenho deliberadamente genérico: este arquivo não conhece `Command.kind`, `RulePack` nem
 * nenhuma função de `src/domain/rules/**`/`src/domain/spells/**`. Tudo isso já foi resolvido em
 * `action-capabilities.ts` e empacotado em `{ command, rollPlan, resolve }`. O dispatcher só:
 *
 * 1. Localiza a execução por `intent.capabilityId` (mapa OU função de lookup — quem monta a
 *    composição em `src/app/bootstrap.tsx` decide qual forma é mais simples de manter em sincronia
 *    com a lista de capacidades exibida).
 * 2. Lê o personagem ATIVO agora (`characterService.store.getSnapshot().value`) — nunca reusa um
 *    personagem capturado no momento da derivação, que pode estar desatualizado.
 * 3. Gera cada rolagem do `rollPlan` com o RNG real injetado, usando o id pré-alocado no comando
 *    (nunca gera aleatoriedade antes disso, nunca gera RuleResult sem as rolagens que o comando
 *    exige — 10-RULES-ENGINE.md, 11-DICE-ENGINE.md).
 * 4. Chama `execution.resolve({ character, rolls, value: intent.value, targetArmorClass:
 *    intent.targetArmorClass })`, que devolve o `RuleResult`. `value` e `targetArmorClass` vêm
 *    direto do `ActionIntent` (types.ts) sem nenhuma interpretação aqui — quem decide o que
 *    fazer com eles (fallback para preset, ou `needsInput` honesto quando ausentes) é
 *    `action-capabilities.ts`, mantendo este dispatcher genérico.
 * 5. Se o resultado é `"success"`, persiste via `characterService.commands.commit(...)` — SÓ
 *    quando esse serviço existe (`commandDependencies` foi passado ao criar o
 *    `CharacterApplicationService`; ver `service.ts`). Quando não existe, devolve um `RuleResult`
 *    `"rejected"` explicando que a composição atual não conecta persistência de comandos — nunca
 *    lança exceção.
 *
 * Cancelamento (`ActionsProps.onCancel`): `src/features/actions/Actions.tsx` (`cancel()`) só
 * limpa o estado local selecionado e chama `onCancel` — nunca chama `onIntent`/o dispatcher. Não
 * existe portanto nenhum caminho de cancelamento que passe por este arquivo: `commit` só é
 * alcançável através de `dispatch(intent)`, e cancelar nunca invoca `dispatch`. Isso é validado
 * em `action-dispatcher.test.ts` ("cancelamento não invoca o dispatcher nem commit").
 */

import { type Character } from "@domain/contracts/character";
import { type RandomSource, type DiceRoll } from "@domain/contracts/dice";
import { type Uuid } from "@domain/contracts/ids";
import { type RuleResult } from "@domain/contracts/rules";
import { type SourceRef } from "@domain/contracts/primitives";
import { rollExpression } from "@domain/dice";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";
import { type ActionIntent, type ActionCommitResult } from "@features/actions/types";

import { type ActionCapabilityExecution } from "./action-capabilities";
import { type CharacterApplicationService } from "./service";

export type ActionCapabilityLookup = ReadonlyMap<string, ActionCapabilityExecution> | ((capabilityId: string) => ActionCapabilityExecution | undefined);

export interface ActionDispatcherOptions {
  readonly characterService: CharacterApplicationService;
  readonly capabilitiesById: ActionCapabilityLookup;
  readonly rng: RandomSource;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

function lookup(capabilitiesById: ActionCapabilityLookup, capabilityId: string): ActionCapabilityExecution | undefined {
  return typeof capabilitiesById === "function" ? capabilitiesById(capabilityId) : capabilitiesById.get(capabilityId);
}

function rejected(message: string, sourceRefs: readonly SourceRef[] = []): RuleResult {
  return { status: "rejected", errors: [{ code: "invalid-context", message }], sourceRefs };
}

/**
 * Cria o handler de `ActionsProps.onIntent`. Assinatura estável para wiring em
 * `src/app/bootstrap.tsx`:
 *
 * `createActionDispatcher(options: ActionDispatcherOptions): (intent: ActionIntent) => Promise<RuleResult>`
 */
export function createActionDispatcher(options: ActionDispatcherOptions): (intent: ActionIntent) => ActionCommitResult {
  const { characterService, capabilitiesById, rng, idGenerator, clock } = options;

  return async (intent: ActionIntent): Promise<RuleResult> => {
    const execution = lookup(capabilitiesById, intent.capabilityId);
    if (!execution) {
      return rejected(`Capacidade "${intent.capabilityId}" não foi encontrada nesta sessão; a lista de ações pode ter mudado — recarregue as capacidades antes de tentar de novo.`);
    }

    const character: Character | undefined = characterService.store.getSnapshot().value;
    if (!character) {
      return rejected("Nenhum personagem ativo para executar este comando.");
    }
    if (character.id !== intent.characterId || character.id !== execution.command.characterId) {
      return rejected("O personagem ativo não corresponde ao comando desta capacidade; recarregue as capacidades antes de confirmar.");
    }

    const rolls = new Map<Uuid, DiceRoll>();
    for (const planned of execution.rollPlan) {
      const rolled = rollExpression(planned.expression, rng, {
        id: planned.id,
        timestamp: clock.now(),
        purpose: planned.purpose,
        characterId: character.id,
        commandId: execution.command.commandId,
      });
      if (!rolled.ok) {
        return rejected(`Não foi possível gerar a rolagem exigida pelo comando: ${rolled.error.message}`);
      }
      rolls.set(planned.id, rolled.value);
    }

    let result: RuleResult;
    try {
      result = execution.resolve({ character, rolls, value: intent.value, targetArmorClass: intent.targetArmorClass });
    } catch (cause) {
      return rejected(cause instanceof Error ? cause.message : "Falha inesperada ao resolver o comando de domínio.");
    }

    if (result.status !== "success") return result;

    if (!characterService.commands) {
      return rejected(
        "Esta composição não conectou a persistência de comandos (CharacterApplicationService foi criado sem commandDependencies); o resultado foi calculado corretamente mas não pôde ser salvo.",
        result.sourceRefs,
      );
    }

    const committed = await characterService.commands.commit(execution.command, result, [...rolls.values()]);
    if (!committed.ok) {
      return rejected(`Falha ao persistir o comando: ${committed.error.message}`, result.sourceRefs);
    }
    // idGenerator é injetado para simetria com o restante da camada de aplicação (todo Command
    // novo nasce de um id gerado pela aplicação, nunca pelo domínio) — este dispatcher não cria
    // Command novos (isso é responsabilidade de `deriveActionCapabilities`), então não há uso
    // direto aqui além de deixar a dependência explícita no construtor para quem for estender
    // este dispatcher com comandos gerados em tempo de despacho (ex.: retry com novo commandId).
    void idGenerator;
    return committed.value.result;
  };
}
