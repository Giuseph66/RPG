/**
 * AssetRepository. Autoridade: 08-PERSISTENCIA-LOCAL.md ("IndexedDB armazena ... assets").
 * Blobs binários trafegam como Uint8Array — nunca Blob/File do DOM neste contrato.
 */

import { type Uuid } from "@domain/contracts/ids";
import { type Asset } from "@domain/contracts/campaign";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type TransactionContext } from "./unit-of-work";

export interface AssetRepository {
  get(id: Uuid, context?: TransactionContext): Promise<Result<Asset, AppError>>;
  put(asset: Asset): Promise<Result<Asset, AppError>>;
  delete(id: Uuid): Promise<Result<void, AppError>>;
}
