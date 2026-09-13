import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase/firestore", () => ({
  initializeFirestore: vi.fn(),
  getFirestore: vi.fn(),
  memoryLocalCache: vi.fn(() => ({ kind: "memory" })),
  persistentLocalCache: vi.fn(() => ({ kind: "persistent" })),
  persistentMultipleTabManager: vi.fn(() => ({ kind: "multi-tab" })),
}));

import { getFirestoreClient, resetFirestoreClientCacheForTests } from "./firestore-client";

const fakeApp = {} as never;
const fakeFirestore = { id: "firestore" } as never;

describe("getFirestoreClient", () => {
  afterEach(() => {
    resetFirestoreClientCacheForTests();
  });

  it("habilita cache persistente quando o SDK aceita a config", () => {
    const initializeFirestore = vi.fn(() => fakeFirestore);
    const getFirestore = vi.fn();

    const result = getFirestoreClient(fakeApp, { initializeFirestore, getFirestore });

    expect(result.offlinePersistenceEnabled).toBe(true);
    expect(result.firestore).toBe(fakeFirestore);
    expect(initializeFirestore).toHaveBeenCalledTimes(1);
  });

  it("degrada para cache em memória sem lançar quando persistência não é suportada", () => {
    const initializeFirestore = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("unsupported environment");
      })
      .mockImplementationOnce(() => fakeFirestore);
    const getFirestore = vi.fn();

    const result = getFirestoreClient(fakeApp, { initializeFirestore, getFirestore });

    expect(result.offlinePersistenceEnabled).toBe(false);
    expect(result.firestore).toBe(fakeFirestore);
    expect(initializeFirestore).toHaveBeenCalledTimes(2);
  });

  it("reutiliza a instância existente quando nem a configuração persistente nem a de memória inicializam", () => {
    const getFirestore = vi.fn(() => fakeFirestore);
    const initializeFirestore = vi.fn(() => {
      throw new Error("already initialized");
    });

    const result = getFirestoreClient(fakeApp, { initializeFirestore, getFirestore });

    expect(result).toEqual({ firestore: fakeFirestore, offlinePersistenceEnabled: false });
    expect(getFirestore).toHaveBeenCalledWith(fakeApp);
  });

  it("memoiza a instância entre chamadas", () => {
    const initializeFirestore = vi.fn(() => fakeFirestore);
    const getFirestore = vi.fn();

    const first = getFirestoreClient(fakeApp, { initializeFirestore, getFirestore });
    const second = getFirestoreClient(fakeApp, { initializeFirestore, getFirestore });

    expect(first).toBe(second);
    expect(initializeFirestore).toHaveBeenCalledTimes(1);
  });
});
