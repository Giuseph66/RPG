import { describe, expect, it } from "vitest";

import { type CharacterRepository } from "@application/ports/character-repository";
import { appError, err, ok } from "@domain/contracts/errors";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { asEntityId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type Character } from "@domain/contracts/character";
import { createCharacterApplicationService } from "./service";

const beast = {
  id: asEntityId("test-wolf"),
  name: "Lobo de teste",
  creatureType: "beast" as const,
  size: "medium" as const,
  armorClass: 12,
  hitPoints: { average: 11, hitDice: "2d8+2" },
  speeds: { walkCm: 900 as never },
  abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
  challengeRating: { numerator: 1, denominator: 4 },
  sourceRefs: [],
};

function transformedCharacter(): Character {
  return {
    ...minimalCharacter,
    hp: { current: 7, temp: 0 },
    transformation: {
      id: asUuid("33333333-3333-4333-8333-333333333333"),
      formRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: beast.id },
      originalSnapshotRef: asUuid("33333333-3333-4333-8333-333333333333"),
      originalSnapshot: minimalCharacter,
      originalMaximumHitPoints: 10,
      formSnapshot: beast,
      formMaximumHitPoints: 11,
      formHp: { current: 4, temp: 2 },
      duration: { kind: "hours", value: 1 },
      elapsedMinutes: 0,
      equipmentDisposition: "worn",
      retainedFeatureIds: [],
    },
  };
}

function repositoryFor(initial: Character): CharacterRepository {
  return repositoryForMany([initial]);
}

function repositoryForMany(initial: readonly Character[]): CharacterRepository {
  const currentById = new Map(initial.map((character) => [character.id, character]));
  return {
    get: async (id) => {
      const current = currentById.get(id);
      return current ? ok(current) : err(appError.notFound("character", id));
    },
    list: async () => ok([]),
    save: async (character, expectedRevision) => {
      const current = currentById.get(character.id);
      if (!current) return err(appError.notFound("character", character.id));
      if (expectedRevision !== current.revision) return err(appError.conflict(expectedRevision, current.revision));
      const saved = { ...character, revision: asRevision(expectedRevision + 1) };
      currentById.set(character.id, saved);
      return ok(saved.revision);
    },
    delete: async () => ok(undefined),
    getDraft: async () => err(appError.notFound("draft", "missing")),
    listDrafts: async () => ok([]),
    saveDraft: async (draft) => ok(draft),
    deleteDraft: async () => ok(undefined),
  };
}

describe("CharacterApplicationService direct updates", () => {
  it("publica o vínculo e revisão no store da ficha ativa após a gravação", async () => {
    const characterId = asUuid("66666666-6666-4666-8666-666666666661");
    const campaignId = asUuid("66666666-6666-4666-8666-666666666662");
    const initial = { ...minimalCharacter, id: characterId, revision: asRevision(1) };
    const service = createCharacterApplicationService({ repository: repositoryFor(initial) });
    await service.select(characterId);

    const stale = await service.linkToCampaign(characterId, campaignId, asRevision(0));
    expect(stale.ok).toBe(false);
    expect(service.store.getSnapshot().value).toMatchObject({ id: characterId, revision: asRevision(1) });
    expect(service.store.getSnapshot().value?.campaignId).toBeUndefined();

    const linked = await service.linkToCampaign(characterId, campaignId, initial.revision);
    expect(linked).toMatchObject({ ok: true, value: asRevision(2) });
    expect(service.store.getSnapshot().value).toMatchObject({ id: characterId, campaignId, revision: asRevision(2) });
    service.dispose();
  });

  it("vincula outra ficha sem trocar a seleção ativa", async () => {
    const activeId = asUuid("66666666-6666-4666-8666-666666666663");
    const otherId = asUuid("66666666-6666-4666-8666-666666666664");
    const campaignId = asUuid("66666666-6666-4666-8666-666666666665");
    const active = { ...minimalCharacter, id: activeId, revision: asRevision(1) };
    const other = { ...minimalCharacter, id: otherId, revision: asRevision(1) };
    const service = createCharacterApplicationService({ repository: repositoryForMany([active, other]) });
    await service.select(activeId);

    const linked = await service.linkToCampaign(otherId, campaignId, other.revision);
    expect(linked.ok).toBe(true);
    expect(service.store.selectedId).toBe(activeId);
    expect(service.store.getSnapshot().value).toMatchObject({ id: activeId, revision: asRevision(1) });
    expect(service.store.getSnapshot().value?.campaignId).toBeUndefined();
    const otherAfter = await service.get(otherId);
    expect(otherAfter).toMatchObject({ ok: true, value: { campaignId, revision: asRevision(2) } });
    service.dispose();
  });

  it("publica imediatamente a saída automática da forma na ficha ativa após salvar Inconsciente", async () => {
    const initial = { ...transformedCharacter(), revision: asRevision(1) };
    const service = createCharacterApplicationService({ repository: repositoryFor(initial) });
    await service.select(initial.id);
    expect(service.store.getSnapshot().value?.transformation).toBeDefined();
    const condition = {
      id: asUuid("77777777-7777-4777-8777-777777777771"),
      definitionRef: { rulesetId: initial.rulesetRef.id, entityId: asEntityId("unconscious") },
      origin: { kind: "table-decision" as const, description: "Salvo pelo mestre" },
    };

    const stale = await service.saveSheetState(initial.id, asRevision(0), {
      hp: { current: 4, temp: 1 }, conditions: [condition],
    });
    expect(stale.ok).toBe(false);
    expect(service.store.getSnapshot().value?.transformation).toBeDefined();
    expect(service.store.getSnapshot().value?.hp).toEqual(initial.hp);

    const saved = await service.saveSheetState(initial.id, initial.revision, {
      hp: { current: 4, temp: 1 }, conditions: [condition],
    });
    expect(saved).toMatchObject({ ok: true, value: asRevision(2) });
    expect(service.store.getSnapshot().value).toMatchObject({
      id: initial.id,
      revision: asRevision(2),
      hp: { current: 7, temp: 1 },
      conditions: [condition],
    });
    expect(service.store.getSnapshot().value?.transformation).toBeUndefined();
    service.dispose();
  });

  it("salva estado de outra ficha sem trocar o snapshot selecionado", async () => {
    const active = { ...minimalCharacter, id: asUuid("77777777-7777-4777-8777-777777777772"), revision: asRevision(1) };
    const other = { ...transformedCharacter(), revision: asRevision(1) };
    const service = createCharacterApplicationService({ repository: repositoryForMany([active, other]) });
    await service.select(active.id);
    const condition = {
      id: asUuid("77777777-7777-4777-8777-777777777774"),
      definitionRef: { rulesetId: other.rulesetRef.id, entityId: asEntityId("unconscious") },
      origin: { kind: "table-decision" as const, description: "Salvo pelo mestre" },
    };

    const saved = await service.saveSheetState(other.id, other.revision, {
      hp: { current: 4, temp: 1 }, conditions: [condition],
    });

    expect(saved.ok).toBe(true);
    expect(service.store.selectedId).toBe(active.id);
    expect(service.store.getSnapshot().value).toMatchObject({ id: active.id, revision: active.revision });
    expect(service.store.getSnapshot().value?.conditions).toEqual(active.conditions);
    const otherAfter = await service.get(other.id);
    expect(otherAfter).toMatchObject({
      ok: true,
      value: { hp: { current: 7, temp: 1 }, conditions: [condition] },
    });
    if (otherAfter.ok) expect(otherAfter.value.transformation).toBeUndefined();
    service.dispose();
  });

  it("retorna da forma ao ficar inconsciente por uma atualização direta da ficha, sem custo", async () => {
    const initial = transformedCharacter();
    const service = createCharacterApplicationService({ repository: repositoryFor(initial), debounceMs: 0 });
    await service.select(initial.id);
    const condition = {
      id: asUuid("44444444-4444-4444-8444-444444444444"),
      definitionRef: { rulesetId: initial.rulesetRef.id, entityId: asEntityId("unconscious") },
      origin: { kind: "environment" as const, description: "Sono" },
    };

    const applied = service.update((current) => ({ ...current, conditions: [...current.conditions, condition] }), true);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.value.conditions).toEqual([condition]);
    expect(applied.value.transformation).toBeUndefined();
    expect(applied.value.hp).toEqual({ current: 7, temp: 2 });
    expect(applied.value.resources).toEqual(initial.resources);
    expect(applied.value.inventory).toEqual(initial.inventory);
    await service.flush();
    service.dispose();
  });

  it("persiste os PV efetivos da forma e retorna ao pool original ao chegar a zero", async () => {
    const initial = transformedCharacter();
    const service = createCharacterApplicationService({ repository: repositoryFor(initial) });
    const saved = await service.saveSheetState(initial.id, initial.revision, { hp: { current: 0, temp: 5 } });
    expect(saved.ok).toBe(true);
    const loaded = await service.get(initial.id);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.transformation).toBeUndefined();
    expect(loaded.value.hp).toEqual({ current: 7, temp: 5 });
    expect(loaded.value.resources).toEqual(initial.resources);
    expect(loaded.value.inventory).toEqual(initial.inventory);
    service.dispose();
  });

  it("normaliza consciência em saveCharacter preservando o pool original e campos atuais", async () => {
    const initial = transformedCharacter();
    const condition = {
      id: asUuid("55555555-5555-4555-8555-555555555555"),
      definitionRef: { rulesetId: initial.rulesetRef.id, entityId: asEntityId("unconscious") },
      origin: { kind: "environment" as const, description: "Sono" },
    };
    const changed = { ...initial, conditions: [condition], xp: initial.xp + 10 };
    const service = createCharacterApplicationService({ repository: repositoryFor(initial) });
    const saved = await service.saveCharacter(changed, initial.revision);
    expect(saved.ok).toBe(true);
    const loaded = await service.get(initial.id);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.transformation).toBeUndefined();
    expect(loaded.value.hp).toEqual({ current: 7, temp: 2 });
    expect(loaded.value.conditions).toEqual([condition]);
    expect(loaded.value.xp).toBe(initial.xp + 10);
    service.dispose();
  });
});
