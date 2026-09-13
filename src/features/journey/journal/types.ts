import type { JournalEntry } from "@domain/contracts/campaign";
import type { JournalDraft, JournalDraftState, JournalLinkStatus } from "@domain/campaign/journal";

export type JournalIntent =
  | { readonly kind: "update-draft"; readonly patch: Partial<JournalDraft> }
  | { readonly kind: "save-draft" }
  | { readonly kind: "reload-draft" }
  | { readonly kind: "discard-draft" };

export interface JournalEditorProps {
  readonly draft: JournalDraft;
  readonly status?: JournalDraftState["status"];
  readonly error?: string;
  readonly links?: readonly JournalLinkStatus[];
  readonly onIntent?: (intent: JournalIntent) => void;
  readonly onCreateEntry?: () => void;
  readonly onBackToList?: () => void;
  readonly className?: string;
}

export interface JournalEntryListProps {
  readonly entries: readonly JournalEntry[];
  readonly selectedEntryId?: string;
  readonly onSelect?: (entryId: string) => void;
}
