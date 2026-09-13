import type { AuthPort, AuthSession } from "@application/ports/auth-port";
import type { MembershipService } from "@application/membership";

export type AccountSyncState = "local" | "pending" | "offline" | "synced";

export interface AccountAvailability {
  readonly available: boolean;
  readonly missingKeys?: readonly string[];
}

export interface AccountPanelProps {
  /** AuthPort é opcional: sem adapter a aplicação permanece local-first. */
  readonly auth?: AuthPort;
  readonly availability?: AccountAvailability;
  readonly onBackToLocal?: () => void;
  /** Perfil local opcional, mantido pelo caso de uso de membership. */
  readonly membership?: MembershipService;
  readonly syncState?: AccountSyncState;
}

export type AccountSessionState =
  | { readonly status: "unavailable"; readonly session: null }
  | { readonly status: "loading"; readonly session: AuthSession | null }
  | { readonly status: "signed-out"; readonly session: null }
  | { readonly status: "signed-in"; readonly session: AuthSession };
