import type { AuthSession } from "@application/ports/auth-port";
import type { SessionService } from "@application/session";
import type { AccountId, Uuid } from "@domain/contracts/ids";
import type { NpcRecord } from "@domain/contracts/campaign";

export interface SessionCharacterOption {
  readonly id: Uuid;
  readonly name: string;
  readonly playerId: AccountId;
  readonly initiative?: number;
  readonly hitPoints?: { readonly current: number; readonly maximum?: number };
}

export type SessionSyncState = "local" | "pending" | "offline" | "synced";

export interface SessionPanelProps {
  readonly session?: SessionService;
  readonly authSession?: AuthSession | null;
  readonly campaignId?: Uuid;
  readonly characters?: readonly SessionCharacterOption[];
  readonly npcs?: readonly NpcRecord[];
  readonly syncState?: SessionSyncState;
}
