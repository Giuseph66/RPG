import { type AssetRepository } from "@application/ports/asset-repository";
import { type Clock } from "@application/ports/clock";
import { type Uuid } from "@domain/contracts/ids";
import { type Asset } from "@domain/contracts/campaign";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { isValidAssetShape, readValidated } from "./record-guards";
import { STORE_NAMES } from "./schema";
import { requestToPromise, runTransaction } from "./transaction";

/** Adapter para bytes de imagem persistidos em IndexedDB. */
export class IndexedDbAssetRepository implements AssetRepository {
  constructor(private readonly db: IDBDatabase, private readonly clock: Clock) {}

  async get(id: Uuid): Promise<Result<Asset, AppError>> {
    return readValidated(this.db, STORE_NAMES.assets, id, this.clock.now(), isValidAssetShape, "asset");
  }

  async put(asset: Asset): Promise<Result<Asset, AppError>> {
    if (!isValidAssetShape(asset)) return err(appError.validation("asset", "Asset inválido."));
    return runTransaction(this.db, [STORE_NAMES.assets], "readwrite", async (tx) => {
      await requestToPromise(tx.objectStore(STORE_NAMES.assets).put(asset));
      return ok(asset);
    });
  }

  async delete(id: Uuid): Promise<Result<void, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.assets], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.assets);
      const raw = await requestToPromise(store.get(id));
      if (raw === undefined) return err(appError.notFound("asset", id));
      if (!isValidAssetShape(raw)) return err(appError.corruptRecord(id));
      await requestToPromise(store.delete(id));
      return ok(undefined);
    });
  }
}
