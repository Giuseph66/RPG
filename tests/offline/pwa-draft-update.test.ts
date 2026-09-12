import { describe, expect, it, vi } from "vitest";

import { createApplicationRuntime, hasPendingApplicationWork } from "@app/bootstrap";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { asIsoTimestamp } from "@domain/contracts/ids";
import { IndexedDbCharacterRepository, openDatabase } from "@infrastructure/persistence/indexeddb";
import { registerPwa } from "@infrastructure/pwa";

function isolatedSettings(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe("PWA e persistência durante atualização", () => {
  it("adia a aplicação enquanto há gravação pendente e preserva rascunho após reabrir o banco", async () => {
    const name = `pwa-draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const clock = { now: () => asIsoTimestamp("2026-09-12T12:00:00.000Z") };
    const seed = await openDatabase({ name });
    if (!seed.ok) throw new Error(seed.error.message);
    const seedRepository = new IndexedDbCharacterRepository(seed.value, clock);
    expect(await seedRepository.save(minimalCharacter, minimalCharacter.revision)).toMatchObject({ ok: true });
    seed.value.close();

    const runtime = await createApplicationRuntime({ database: { name }, settingsStorage: isolatedSettings() });
    const postMessage = vi.fn();
    let draftId: typeof minimalCharacter.id | undefined;
    try {
      expect(await runtime.services.character.select(minimalCharacter.id)).toMatchObject({ ok: true });
      const initialDraft = runtime.createDraft();
      draftId = initialDraft.id;
      // Mantém uma alteração de agregado em voo enquanto o rascunho é alterado/salvo.
      expect(runtime.services.character.update((current) => ({ ...current, history: "alteração ainda não confirmada" }))).toMatchObject({ ok: true });
      expect(hasPendingApplicationWork(runtime.services)).toBe(true);
      const savedDraft = await runtime.services.character.saveDraft({ ...initialDraft, partial: { ...initialDraft.partial, name: "Rascunho preservado durante update" } });
      expect(savedDraft).toMatchObject({ ok: true, value: { partial: { name: "Rascunho preservado durante update" } } });
      const registration = { waiting: { postMessage }, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const registered = await registerPwa({
        platform: { serviceWorker: { register: vi.fn(async () => registration) } },
        hasPendingWork: () => hasPendingApplicationWork(runtime.services),
      });
      expect(registered).toMatchObject({ ok: true });
      if (!registered.ok) return;
      expect(registered.value.applyUpdate()).toMatchObject({ ok: false, error: { code: "update-deferred" } });
      expect(postMessage).not.toHaveBeenCalled();

      expect(await runtime.services.character.flush()).toMatchObject({ ok: true });
      expect(hasPendingApplicationWork(runtime.services)).toBe(false);
      expect(registered.value.applyUpdate()).toMatchObject({ ok: true });
      expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING", version: expect.any(String) });
      registered.value.dispose();
    } finally {
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }

    if (!draftId) throw new Error("O teste não criou o rascunho.");
    const reopened = await openDatabase({ name });
    if (!reopened.ok) throw new Error(reopened.error.message);
    try {
      const repository = new IndexedDbCharacterRepository(reopened.value, clock);
      const draft = await repository.getDraft(draftId);
      expect(draft).toMatchObject({ ok: true, value: { partial: { name: "Rascunho preservado durante update" } } });
    } finally {
      reopened.value.close();
    }
  });
});
