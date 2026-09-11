import { describe, expect, it, vi } from "vitest";

import { err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type AppSettings, type SettingsRepository } from "@application/ports/settings-repository";

import { SettingsStore } from "./store";

const initial: AppSettings = { theme: "system", reducedMotion: undefined, diceHistoryRetention: 1000, language: "pt-BR" };

function fakeRepository() {
  let value = initial;
  let updateResult: Result<AppSettings, AppError> = ok(value);
  const updates: Partial<AppSettings>[] = [];
  const repository: SettingsRepository = {
    get: async () => ok(value),
    update: async (patch) => { updates.push(patch); if (!updateResult.ok) return updateResult; value = { ...value, ...patch }; return ok(value); },
    reset: async () => { value = initial; return ok(value); },
  };
  return { repository, updates, setResult: (result: Result<AppSettings, AppError>) => { updateResult = result; } };
}

describe("SettingsStore", () => {
  it("hidrata, serializa atualizações e não perde a última preferência", async () => {
    const fake = fakeRepository();
    const store = new SettingsStore(fake.repository);
    await store.hydrate();
    await Promise.all([store.update({ theme: "dark" }), store.update({ reducedMotion: true })]);
    await store.flush();
    expect(fake.updates.at(-1)).toMatchObject({ theme: "dark", reducedMotion: true });
    expect(store.getSnapshot().status).toBe("clean");
  });

  it("preserva a preferência otimista e retenta depois de falha", async () => {
    const fake = fakeRepository();
    const store = new SettingsStore(fake.repository);
    await store.hydrate();
    fake.setResult(err({ code: "storage-unavailable", message: "indisponível" }));
    const failure = await store.update({ theme: "dark" });
    expect(failure.ok).toBe(false);
    expect(store.getSnapshot().value?.theme).toBe("dark");
    fake.setResult(ok({ ...initial, theme: "dark" }));
    expect((await store.retry()).ok).toBe(true);
    expect(store.getSnapshot().status).toBe("clean");
  });

  it("não publica uma hidratação antiga depois de uma nova solicitação", async () => {
    const first = vi.fn<SettingsRepository["get"]>();
    let resolve!: (result: Result<AppSettings, AppError>) => void;
    first.mockImplementationOnce(() => new Promise((r) => { resolve = r; })).mockImplementationOnce(async () => ok({ ...initial, theme: "dark" }));
    const repository: SettingsRepository = { get: first, update: async (patch) => ok({ ...initial, ...patch }), reset: async () => ok(initial) };
    const store = new SettingsStore(repository);
    const old = store.hydrate();
    const current = store.hydrate();
    resolve(ok(initial));
    await old;
    await current;
    expect(store.getSnapshot().value?.theme).toBe("dark");
  });
});
