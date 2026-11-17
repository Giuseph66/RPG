export interface ChatPreferences {
  readonly baseUrl: string;
  readonly model: string;
}

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = { baseUrl: "https://ollama.com", model: "" };

export interface ChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly createdAt: number;
}

export interface ChatConversation {
  readonly id: string;
  readonly title: string;
  readonly preview: string;
  readonly updatedAt: number;
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
  watchPreferences(uid: string): ChatWatch<ChatPreferences>;
  watchCredential(uid: string): ChatWatch<ChatCredentialSummary | undefined>;
  watchConversations(uid: string): ChatWatch<readonly ChatConversation[]>;
  watchMessages(uid: string, conversationId: string): ChatWatch<readonly ChatMessage[]>;
  savePreferences(uid: string, preferences: ChatPreferences): Promise<void>;
  saveCredential(uid: string, label: string, apiKey: string): Promise<void>;
  removeCredential(uid: string): Promise<void>;
  listCredentials(): Promise<readonly ChatCredential[]>;
  setCredentialState(credential: ChatCredential, status: "cooldown" | "invalid", cooldownUntil: number): Promise<void>;
  createConversation(uid: string, title: string): Promise<string>;
  appendMessage(uid: string, conversationId: string, role: ChatMessage["role"], content: string): Promise<void>;
  recentMessages(uid: string, conversationId: string): Promise<readonly ChatMessage[]>;
  readPreferences(uid: string): Promise<ChatPreferences>;
}

export class OllamaRequestError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterMs = 300_000) {
    super(message);
    this.name = "OllamaRequestError";
  }
}

export interface OllamaClient {
  listModels(baseUrl: string, apiKey: string, signal?: AbortSignal): Promise<readonly string[]>;
  complete(baseUrl: string, apiKey: string, model: string, messages: readonly Pick<ChatMessage, "role" | "content">[], context: string, signal?: AbortSignal): Promise<string>;
}
