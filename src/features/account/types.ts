import type { AuthPort, AuthSession } from "@application/ports/auth-port";
import type { MembershipService } from "@application/membership";
import type { CampaignRole } from "@domain/contracts/cloud-sync";
import type { Uuid } from "@domain/contracts/ids";
import type { AppError, Result } from "@domain/contracts/errors";

export type AccountSyncState = "local" | "pending" | "offline" | "error" | "synced";

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
  /** Motivo normalizado da última falha de sincronização, quando houver. */
  readonly syncMessage?: string;
  /** Campanhas fornecidas pelo agregado de campanha; a conta nunca inventa cards. */
  readonly campaigns?: readonly AccountCampaign[];
  /** Abre a entrada existente de Colaboração. */
  readonly onOpenCollaboration?: () => void;
  /** Abre uma sessão existente da campanha selecionada. */
  readonly onOpenSession?: (campaignId: Uuid) => void;
  /** Abre configurações já existentes, quando o shell as fornecer. */
  readonly onOpenSettings?: () => void;
  /** Publica, uma única vez por ficha, personagens locais criados antes do login. */
  readonly onPublishLocalCharacters?: () => Promise<Result<number, AppError>>;
}

export interface AccountCampaign {
  readonly id: Uuid;
  readonly name: string;
  readonly role?: CampaignRole;
  readonly participantCount?: number;
  /** URL/blob já resolvida pelo consumidor; ausência usa apenas o fallback vetorial. */
  readonly thumbnailUrl?: string;
}

export type AccountSessionState =
  | { readonly status: "unavailable"; readonly session: null }
  | { readonly status: "loading"; readonly session: AuthSession | null }
  | { readonly status: "signed-out"; readonly session: null }
  | { readonly status: "signed-in"; readonly session: AuthSession };
