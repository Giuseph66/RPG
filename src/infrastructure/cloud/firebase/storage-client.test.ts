import { afterEach, describe, expect, it, vi } from "vitest";

const getStorage = vi.fn((..._args: unknown[]) => ({ id: "storage" }));

vi.mock("firebase/storage", () => ({
  getStorage: (...args: unknown[]) => getStorage(...args),
}));

import { getStorageClient, resetStorageClientCacheForTests } from "./storage-client";

const fakeApp = {} as never;

describe("getStorageClient", () => {
  afterEach(() => {
    resetStorageClientCacheForTests();
    getStorage.mockClear();
  });

  it("cria o cliente lazy sob demanda", () => {
    const client = getStorageClient(fakeApp);

    expect(client).toEqual({ id: "storage" });
    expect(getStorage).toHaveBeenCalledTimes(1);
  });

  it("memoiza a instância entre chamadas", () => {
    getStorageClient(fakeApp);
    getStorageClient(fakeApp);

    expect(getStorage).toHaveBeenCalledTimes(1);
  });
});
