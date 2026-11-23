/** Fixed provider and models, all on the free tier: the fallbacks answer, in order, only when the main model fails. Users never pick one. */
export const CHAT_PROVIDER = { baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-4-hydrogen", fallbackModels: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] } as const;
export const CHAT_MODELS: readonly string[] = [CHAT_PROVIDER.model, ...CHAT_PROVIDER.fallbackModels];
import type { ChatAction, ChatAttachment, ChatCompletion, ChatMemory, ChatModelMessage, ChatScope, ChatToolDefinition, ChatTrace } from "./chat-agent";

export interface ChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly createdAt: number;
  readonly trace?: ChatTrace;
  readonly turnId?: string;
  readonly attachments?: readonly ChatAttachment[];
}

export interface ChatConversation {
  readonly id: string;
  readonly title: string;
  readonly preview: string;
  readonly updatedAt: number;
  readonly scope?: ChatScope;
  readonly archived?: boolean;
  readonly deleted?: boolean;
  readonly summary?: string;
  readonly summarizedThrough?: number;
}

/** Each account may register up to this many Gemini keys in the shared pool. */
export const MAX_CREDENTIALS_PER_USER = 5;

export interface ChatCredentialSummary {
  readonly id: string;
  readonly ownerUid: string;
  readonly label: string;
  readonly status: "active" | "cooldown" | "invalid";
  readonly cooldownUntil: number;
  readonly createdAt: number;
}

export interface ChatCredential extends ChatCredentialSummary {
  readonly apiKey: string;
}

export type ChatBlockReason = "day" | "minute" | "overload" | "unavailable";
/** Shared control row of one key and model; never holds the key itself. */
export interface ChatModelUsage {
  readonly keyId: string;
  readonly model: string;
  /** Changes when the owner replaces the secret, which voids the row. */
  readonly keyHash: string;
  /** Pacific date and epoch minute the counters refer to. */
  readonly day: string;
  readonly minute: number;
  readonly requests: number;
  readonly tokens: number;
  readonly minuteRequests: number;
  readonly minuteTokens: number;
  /** Daily limit informed by Google, 0 while unknown. */
  readonly dayLimit: number;
  readonly blockedUntil: number;
  readonly reason: ChatBlockReason | "";
  readonly lastUsedAt: number;
}
export interface ChatUsageChange {
  readonly keyId: string;
  readonly model: string;
  readonly keyHash: string;
  readonly now: number;
  readonly requests?: number;
  readonly tokens?: number;
  readonly dayLimit?: number;
  readonly block?: { readonly until: number; readonly reason: ChatBlockReason };
}

export type ChatWatch<T> = (onValue: (value: T) => void, onError: (error: Error) => void) => () => void;

export interface ChatRepository {
  watchCredentials(uid: string): ChatWatch<readonly ChatCredentialSummary[]>;
  watchConversations(uid: string): ChatWatch<readonly ChatConversation[]>;
  watchMessages(uid: string, conversationId: string): ChatWatch<readonly ChatMessage[]>;
  /** Creates a new key in the first free slot, or replaces `credentialId` when given. */
  saveCredential(uid: string, label: string, apiKey: string, credentialId?: string): Promise<void>;
  removeCredential(uid: string, credentialId: string): Promise<void>;
  listCredentials(): Promise<readonly ChatCredential[]>;
  setCredentialState(credential: ChatCredential, status: "cooldown" | "invalid", cooldownUntil: number): Promise<void>;
  /** Live control table shared by everyone who uses the pool. */
  watchUsage(): ChatWatch<readonly ChatModelUsage[]>;
  recordUsage(previous: ChatModelUsage | undefined, change: ChatUsageChange): Promise<void>;
  createConversation(uid: string, title: string, scope?: ChatScope): Promise<string>;
  appendMessage(uid: string, conversationId: string, role: ChatMessage["role"], content: string, metadata?: { readonly id?: string; readonly turnId?: string; readonly trace?: ChatTrace; readonly attachments?: readonly ChatAttachment[]; readonly actions?: readonly ChatAction[] }): Promise<string>;
  recentMessages(uid: string, conversationId: string): Promise<readonly ChatMessage[]>;
  allMessages(uid: string, conversationId: string): Promise<readonly ChatMessage[]>;
  getConversation(uid: string, conversationId: string): Promise<ChatConversation>;
  pinScope(uid: string, conversationId: string, scope: ChatScope): Promise<ChatScope>;
  updateConversation(uid: string, conversationId: string, patch: { readonly title?: string; readonly archived?: boolean; readonly deleted?: boolean }): Promise<void>;
  saveSummary(uid: string, conversationId: string, summary: string, through: number): Promise<void>;
  watchActions(uid: string, conversationId: string): ChatWatch<readonly ChatAction[]>;
  claimAction(uid: string, conversationId: string, actionId: string, undo?: boolean): Promise<ChatAction>;
  finishAction(uid: string, conversationId: string, actionId: string, status: ChatAction["status"], result: string, undo?: Record<string, unknown>): Promise<void>;
  campaignRole(uid: string, campaignId: string): Promise<"master" | "player" | undefined>;
  listMemories(uid: string, scope: ChatScope): Promise<readonly ChatMemory[]>;
  saveMemory(uid: string, memory: ChatMemory, expectedUpdatedAt?: string): Promise<void>;
  deleteMemory(uid: string, memory: ChatMemory): Promise<void>;
}

/**
 * What a failed call means for the pool: `invalid` and `cooldown` mark the key; `unavailable` and
 * `transient` only move on to the next one; `rejected` is a problem with the request, not the key.
 */
export type ChatFailureKind = "invalid" | "cooldown" | "unavailable" | "transient" | "rejected";

export interface ChatQuotaFailure { readonly period: "day" | "minute"; readonly dayLimit?: number; /** False when the limit covers every model of the key. */ readonly perModel: boolean }

export class ChatRequestError extends Error {
  constructor(message: string, readonly status: number, readonly kind: ChatFailureKind, readonly retryAfterMs = 60_000, /** The model ran, but its output could not be used. */ readonly unusable = false, /** Quota Google says was exceeded. */ readonly quota?: ChatQuotaFailure) {
    super(message);
    this.name = "ChatRequestError";
  }
}

/** Estado da última chamada feita com a chave; o Gemini não informa saldo nas respostas. */
export interface ChatUsage {
  readonly observedAt: number;
  readonly limited: boolean;
  readonly retryAt?: number;
}

export interface ChatCredentialUsage extends ChatUsage {
  readonly credentialId: string;
  readonly credentialLabel: string;
  readonly cooldownUntil?: number;
}

export interface ChatClient {
  turn(apiKey: string, messages: readonly ChatModelMessage[], tools: readonly ChatToolDefinition[], signal?: AbortSignal, onText?: (text: string) => void, forceText?: boolean, onUsage?: (usage: ChatUsage) => void, model?: string): Promise<ChatCompletion>;
}
