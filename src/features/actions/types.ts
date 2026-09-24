import type { Character } from "@domain/contracts/character";
import type { DiceRoll } from "@domain/contracts/dice";
import type { CastPreview } from "@domain/contracts/definitions/spell";
import type { CommandId, DefinitionRef, EntityId, Uuid } from "@domain/contracts/ids";
import type { AvailableAction, RuleResult } from "@domain/contracts/rules";
import type { SourceRef } from "@domain/contracts/primitives";

export type ActionCapabilityKind = "attack" | "damage" | "spell" | "resource" | "item" | "rest" | "concentration";
export type ActionCapabilityStatus = "available" | "blocked" | "pending" | "unsupported";
export type ActionsDieFaces = 4 | 6 | 8 | 20 | 100;

export interface ActionsDice {
  readonly history: readonly DiceRoll[];
  readonly busy: boolean;
  readonly onRoll: (faces: ActionsDieFaces) => void;
}
/**
 * Sinaliza que a `ReviewPanel` (Actions.tsx) precisa coletar um número do usuário antes de
 * habilitar a confirmação: "amount" pede uma quantidade livre (dano/cura manual, ver
 * `docs/criacao/regras/dano-e-cura.md`) e sempre tem um fallback seguro (`inputDefault`), nunca
 * bloqueia a confirmação; "target-armor-class" pede a CA do alvo para resolver "attack" (ver
 * `docs/criacao/regras/combate.md`) e NÃO tem fallback — a confirmação fica desabilitada até o
 * usuário informar um valor explícito, porque inventar CA 0/10 seria inventar acerto contra um
 * alvo desconhecido. Capacidades sem este campo mantêm o fluxo anterior (sem input).
 */
export type ActionCapabilityInputKind = "amount" | "target-armor-class";
export type ActionPreview = RuleResult | CastPreview;
export type ActionSourceRef = DefinitionRef | SourceRef;

export interface ActionCost {
  readonly label: string;
  readonly value?: string | number;
  readonly available?: boolean;
  readonly remaining?: number;
}

/** A resolved capability supplied by the caller; this feature never derives rules. */
export interface ActionCapability {
  readonly id: string;
  readonly commandId: CommandId;
  readonly kind: ActionCapabilityKind;
  readonly label: string;
  readonly description?: string;
  readonly costs?: readonly ActionCost[];
  readonly effectSummary?: readonly string[];
  readonly sourceRefs?: readonly ActionSourceRef[];
  readonly preview?: ActionPreview;
  readonly status?: ActionCapabilityStatus;
  readonly blockedReason?: string;
  readonly pendingReasons?: readonly string[];
  readonly actionCost?: AvailableAction;
  /** Ver `ActionCapabilityInputKind`. Ausente = a capacidade não pede nenhum input numérico. */
  readonly inputKind?: ActionCapabilityInputKind;
  /** Valor pré-preenchido no input quando `inputKind === "amount"` (ex.: 5). Ignorado para "target-armor-class" — esse campo nunca tem default. */
  readonly inputDefault?: number;
}

export interface ActionIntent {
  readonly commandId: CommandId;
  readonly characterId: Uuid;
  readonly capabilityId: string;
  readonly kind: ActionCapabilityKind;
  /**
   * Quantidade de dano/cura manual digitada pelo usuário (capacidades com
   * `inputKind === "amount"`). Ausente = o resolvedor usa seu próprio preset (ver
   * `action-capabilities.ts`).
   */
  readonly value?: number;
  /**
   * CA do alvo informada pelo usuário para resolver "attack" (capacidades com
   * `inputKind === "target-armor-class"`). Ausente = o motor de combate devolve `needsInput`
   * pedindo a CA em vez de inventar um valor.
   */
  readonly targetArmorClass?: number;
}

export type ActionCommitResult = void | RuleResult | Promise<void | RuleResult>;

export type ActionsStatus = "idle" | "loading" | "error";

export interface ActionsProps {
  readonly character?: Character;
  readonly dice?: ActionsDice;
  readonly capabilities?: readonly ActionCapability[];
  /** Optional lookup for callers that keep previews separate from capability metadata. */
  readonly previews?: ReadonlyMap<string, ActionPreview> | Readonly<Record<string, ActionPreview>>;
  readonly availableActions?: readonly AvailableAction[];
  readonly status?: ActionsStatus;
  readonly error?: unknown;
  readonly title?: string;
  readonly onIntent?: (intent: ActionIntent) => ActionCommitResult;
  readonly onCancel?: (intent: Pick<ActionIntent, "capabilityId" | "kind">) => void;
}

export type ActionPageProps = ActionsProps;

export interface ActionPreviewDetails {
  readonly status?: RuleResult["status"];
  readonly effects: readonly string[];
  readonly explanations: readonly string[];
  readonly pending: readonly string[];
  readonly blocked: readonly string[];
  readonly sources: readonly ActionSourceRef[];
}

export type ActionId = EntityId | string;
