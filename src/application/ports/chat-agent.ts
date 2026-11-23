export type ChatSourceKind = "rule" | "sheet" | "journal" | "campaign" | "session" | "memory" | "attachment" | "suggestion";
export type ChatToolKind = "rules" | "sheet" | "journal" | "dice" | "campaign" | "session" | "memory" | "action";
export interface ChatSource { readonly id: number; readonly kind: ChatSourceKind; readonly title: string; readonly locator: string; readonly excerpt: string; readonly href?: string; readonly updatedAt?: string }
export interface ChatToolTrace { readonly id: string; readonly kind: ChatToolKind; readonly label: string; readonly input: string; readonly output: string; readonly status: "ok" | "empty" | "error"; readonly durationMs?: number }
export interface ChatTrace { readonly model?: string; readonly durationMs?: number; readonly tokens?: number; readonly tools?: readonly ChatToolTrace[]; readonly sources?: readonly ChatSource[]; readonly notices?: readonly string[] }
export interface ChatScope {
  readonly characterId?: string;
  readonly campaignId?: string;
  readonly rules: boolean;
  readonly sheet: boolean;
  readonly campaign: boolean;
  readonly memory: boolean;
  /** Captured from authorization, never from model output. */
  readonly master?: boolean;
}
export const DEFAULT_CHAT_SCOPE: ChatScope = { rules: true, sheet: true, campaign: true, memory: true };
export interface ChatAttachment { readonly name: string; readonly text: string }
export interface ChatMemory { readonly id: string; readonly title: string; readonly body: string; readonly campaignId?: string; readonly characterId?: string; readonly visibility: "private" | "party" | "master"; readonly updatedAt: string }
export interface ChatToolDefinition { readonly type: "function"; readonly function: { readonly name: string; readonly description: string; readonly parameters: Record<string, unknown> } }
export interface ChatToolRequest { readonly id: string; readonly type: "function"; readonly function: { readonly name: string; readonly arguments: string } }
export interface ChatModelMessage { readonly role: "system" | "user" | "assistant" | "tool"; readonly content: string | null; readonly tool_calls?: readonly ChatToolRequest[]; readonly tool_call_id?: string; /** Provider parts of a model turn, opaque to the application and returned unchanged. */ readonly native?: unknown }
export interface ChatCompletion { readonly content: string; readonly tools: readonly ChatToolRequest[]; readonly tokens: number; readonly truncated?: boolean; readonly native?: unknown }
export interface ChatAction {
  readonly id: string;
  readonly messageId: string;
  readonly name: string;
  readonly label: string;
  readonly input: Record<string, unknown>;
  readonly scope: ChatScope;
  readonly expectedRevision?: number;
  readonly review?: string;
  readonly status: "pending" | "executing" | "done" | "rejected" | "failed";
  readonly result?: string;
  readonly undo?: Record<string, unknown>;
  readonly createdAt: number;
}
export interface ChatToolResult {
  readonly content: string;
  readonly sources?: readonly Omit<ChatSource, "id">[];
  readonly proposal?: Omit<ChatAction, "id" | "messageId" | "status" | "createdAt">;
}
export interface ChatAgent {
  options(uid: string): Promise<{ readonly characters: readonly { id: string; name: string; campaignId?: string }[]; readonly campaigns: readonly { id: string; name: string }[]; readonly defaults: ChatScope }>;
  context(uid: string, scope: ChatScope): Promise<{ readonly scope: ChatScope; readonly text: string; readonly alerts?: readonly string[] }>;
  tools(scope: ChatScope): readonly ChatToolDefinition[];
  invoke(uid: string, scope: ChatScope, name: string, input: Record<string, unknown>): Promise<ChatToolResult>;
  execute(uid: string, action: ChatAction): Promise<{ readonly content: string; readonly undo?: Record<string, unknown> }>;
  undo(uid: string, action: ChatAction): Promise<string>;
}
