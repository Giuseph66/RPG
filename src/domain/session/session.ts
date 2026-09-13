import { type AccountId, type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { type Revision } from "@domain/contracts/versioning";

export const SESSION_SCHEMA_VERSION = 1;
export type SessionStatus = "planned" | "active" | "ended";

/** Presença explícita: uma conta pode controlar mais de um personagem. */
export interface SessionAttendance {
  readonly characterId: Uuid;
  readonly playerId: AccountId;
  readonly present: boolean;
}

/** Registro serializável da sessão; permanece útil sem rede. */
export interface CampaignSession {
  readonly id: Uuid;
  readonly campaignId: Uuid;
  readonly schemaVersion: typeof SESSION_SCHEMA_VERSION;
  readonly revision: Revision;
  readonly number: number;
  readonly title: string;
  readonly notes: string;
  readonly summary: string;
  readonly status: SessionStatus;
  readonly attendance: readonly SessionAttendance[];
  readonly startedAt?: IsoTimestamp;
  readonly endedAt?: IsoTimestamp;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}
