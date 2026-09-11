import { describe, expect, it, vi } from "vitest";

import { asRevision, type Revision } from "@domain/contracts/versioning";
import { err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { AggregateStore, type AggregateRepository } from "./aggregate-store";

interface TestAggregate {
  readonly id: string;
  readonly revision: Revision;
  readonly label: string;
}

function repositoryFor(values: TestAggregate[]) {
  const records = new Map(values.map((value) => [value.id, value]));
  const saves: TestAggregate[] = [];
  let saveResult: Result<Revision, AppError> = ok(asRevision(1));
  const pendingGets = new Map<string, { resolve: (result: Result<TestAggregate, AppError>) => void }>();
  const repository: AggregateRepository<TestAggregate> = {
    get: (id) => new Promise((resolve) => pendingGets.set(id, { resolve })),
    save: async (value) => {
      saves.push(value);
      if (saveResult.ok) records.set(value.id, { ...value, revision: saveResult.value });
      return saveResult;
    },
  };
  return {
    repository,
    saves,
    records,
    pendingGets,
    setSaveResult: (result: Result<Revision, AppError>) => { saveResult = result; },
    resolveGet: (id: string, value: Result<TestAggregate, AppError>) => pendingGets.get(id)?.resolve(value),
  };
}

const aggregate = (id: string, label = id): TestAggregate => ({ id, label, revision: asRevision(0) });

describe("AggregateStore", () => {
  it("descarta hidratação tardia depois da troca de ID", async () => {
    const fake = repositoryFor([aggregate("a"), aggregate("b")]);
    const store = new AggregateStore(fake.repository, { debounceMs: 0 });
    const first = store.select("a");
    const second = store.select("b");
    fake.resolveGet("b", ok(aggregate("b", "B")));
    await second;
    fake.resolveGet("a", ok(aggregate("a", "A")));
    await first;
    expect(store.getSnapshot().selectedId).toBe("b");
    expect(store.getSnapshot().value?.label).toBe("B");
  });

  it("mantém a edição local quando uma leitura chega depois dela", async () => {
    const fake = repositoryFor([aggregate("a", "durável")]);
    const store = new AggregateStore(fake.repository, { debounceMs: 10_000 });
    const load = store.select("a");
    fake.resolveGet("a", ok(aggregate("a", "antigo")));
    await load;
    store.update((current) => ({ ...current, label: "rascunho" }));
    await store.hydrate("a");
    expect(store.getSnapshot().value?.label).toBe("rascunho");
  });

  it("serializa o autosave e grava somente a última edição do debounce", async () => {
    vi.useFakeTimers();
    try {
      const fake = repositoryFor([aggregate("a")]);
      const store = new AggregateStore(fake.repository, { debounceMs: 500 });
      const load = store.select("a");
      fake.resolveGet("a", ok(aggregate("a")));
      await load;
      store.update((current) => ({ ...current, label: "um" }));
      store.update((current) => ({ ...current, label: "dois" }));
      await vi.advanceTimersByTimeAsync(500);
      await store.flush();
      expect(fake.saves).toHaveLength(1);
      expect(fake.saves[0]?.label).toBe("dois");
      expect(store.getSnapshot().status).toBe("clean");
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserva o rascunho em conflito e permite retry idempotente", async () => {
    const fake = repositoryFor([aggregate("a")]);
    const store = new AggregateStore(fake.repository, { debounceMs: 10_000 });
    const load = store.select("a");
    fake.resolveGet("a", ok(aggregate("a")));
    await load;
    store.update((current) => ({ ...current, label: "rascunho" }));
    fake.setSaveResult(err({ code: "conflict", message: "conflito", expectedRevision: asRevision(0), actualRevision: asRevision(1) }));
    const conflict = await store.save();
    expect(conflict.ok).toBe(false);
    expect(store.getSnapshot().value?.label).toBe("rascunho");
    expect(store.getSnapshot().status).toBe("conflict");
    fake.setSaveResult(ok(asRevision(2)));
    const retry = await store.retry();
    expect(retry.ok).toBe(true);
    expect(store.getSnapshot().status).toBe("clean");
    expect(fake.saves).toHaveLength(2);
  });

  it("notifica seletor somente quando o valor selecionado muda", async () => {
    const fake = repositoryFor([aggregate("a")]);
    const store = new AggregateStore(fake.repository);
    const load = store.select("a");
    fake.resolveGet("a", ok(aggregate("a")));
    await load;
    const listener = vi.fn();
    const unsubscribe = store.subscribeSelector((snapshot) => snapshot.value?.label, listener);
    store.update((current) => ({ ...current, label: "novo" }));
    store.update((current) => ({ ...current }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
