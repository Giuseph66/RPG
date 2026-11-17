/** Fixed provider and model: the Oráculo always answers with this model; users never pick one. */
export const CHAT_PROVIDER = { baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-20b" } as const;
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
}

export interface ChatCredentialSummary {
  readonly ownerUid: string;
  readonly label: string;
  readonly status: "active" | "cooldown" | "invalid";
  readonly cooldownUntil: number;
  readonly createdAt: number;
}

export interface ChatCredential extends ChatCredentialSummary {
  readonly apiKey: string;
}

export type ChatWatch<T> = (onValue: (value: T) => void, onError: (error: Error) => void) => () => void;

export interface ChatRepository {
  watchCredential(uid: string): ChatWatch<ChatCredentialSummary | undefined>;
  watchConversations(uid: string): ChatWatch<readonly ChatConversation[]>;
  watchMessages(uid: string, conversationId: string): ChatWatch<readonly ChatMessage[]>;
  saveCredential(uid: string, label: string, apiKey: string): Promise<void>;
  removeCredential(uid: string): Promise<void>;
  listCredentials(): Promise<readonly ChatCredential[]>;
  setCredentialState(credential: ChatCredential, status: "cooldown" | "invalid", cooldownUntil: number): Promise<void>;
  createConversation(uid: string, title: string, scope?: ChatScope): Promise<string>;
  appendMessage(uid: string, conversationId: string, role: ChatMessage["role"], content: string, metadata?: { readonly id?: string; readonly turnId?: string; readonly trace?: ChatTrace; readonly attachments?: readonly ChatAttachment[]; readonly actions?: readonly ChatAction[] }): Promise<string>;
  recentMessages(uid: string, conversationId: string): Promise<readonly ChatMessage[]>;
  allMessages(uid: string, conversationId: string): Promise<readonly ChatMessage[]>;
  getConversation(uid: string, conversationId: string): Promise<ChatConversation>;
  updateConversation(uid: string, conversationId: string, patch: { readonly title?: string; readonly archived?: boolean; readonly deleted?: boolean }): Promise<void>;
  watchActions(uid: string, conversationId: string): ChatWatch<readonly ChatAction[]>;
  claimAction(uid: string, conversationId: string, actionId: string, undo?: boolean): Promise<ChatAction>;
  finishAction(uid: string, conversationId: string, actionId: string, status: ChatAction["status"], result: string, undo?: Record<string, unknown>): Promise<void>;
  campaignRole(uid: string, campaignId: string): Promise<"master" | "player" | undefined>;
  listMemories(uid: string, scope: ChatScope): Promise<readonly ChatMemory[]>;
  saveMemory(uid: string, memory: ChatMemory): Promise<void>;
  deleteMemory(uid: string, memory: ChatMemory): Promise<void>;
}

export class ChatRequestError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterMs = 300_000) {
    super(message);
    this.name = "ChatRequestError";
  }
}

export interface ChatClient {
  turn(apiKey: string, messages: readonly ChatModelMessage[], tools: readonly ChatToolDefinition[], signal?: AbortSignal, onText?: (text: string) => void): Promise<ChatCompletion>;
}
