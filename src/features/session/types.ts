import type { AuthSession } from "@application/ports/auth-port";
import type { SessionService } from "@application/session";
import type { AccountId, Uuid } from "@domain/contracts/ids";

export interface SessionCharacterOption {
  readonly id: Uuid;
  readonly name: string;
  readonly playerId: AccountId;
}

export type SessionSyncState = "local" | "pending" | "offline" | "synced";

export interface SessionPanelProps {
  readonly session?: SessionService;
  readonly authSession?: AuthSession | null;
  readonly campaignId?: Uuid;
  readonly characters?: readonly SessionCharacterOption[];
  readonly syncState?: SessionSyncState;
}
