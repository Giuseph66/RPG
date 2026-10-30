import { describe, expect, it, vi } from "vitest";
import { act } from "react";

import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft, materializeCharacter, type CreationCatalog } from "@domain/character/creation";
import { err, ok } from "@domain/contracts/errors";
import { mount, click, fireEvent } from "@components/ui/testUtils";

import { CharacterCreationWizard } from "./CharacterCreationWizard";

const now = asIsoTimestamp("2024-01-01T00:00:00.000Z");
const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const ref = (entityId: string) => ({ rulesetId: rulesetRef.id, entityId: asEntityId(entityId) });

function draft() {
  const result = createCharacterDraft({ id: asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), rulesetRef, createdAt: now });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function completeDraft() {
  const result = createCharacterDraft({
    id: asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), rulesetRef, createdAt: now,
    partial: {
      name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      choices: [
        { choiceId: "human.language", selectedIds: [ref("elvish")], grantedAtLevel: 1, grantingRef: ref("human") },
        { choiceId: "fighter.skills", selectedIds: [ref("acrobatics"), ref("perception")], grantedAtLevel: 1, grantingRef: ref("fighter") },
        { choiceId: "fighter.equipment", selectedIds: [ref("dungeoneer-pack")], grantedAtLevel: 1, grantingRef: ref("fighter") },
        { choiceId: "soldier.tools", selectedIds: [ref("proficiency.gaming-set"), ref("proficiency.vehicle-land")], grantedAtLevel: 1, grantingRef: ref("soldier") },
      ],
      inventory: [], castingSources: [], appearance: "",
    },
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function catalog(): CreationCatalog {
  const loaded = loadPhbPtBrLocal2017();
  if (!loaded.ok) throw new Error(loaded.error.message);
  return { rulePack: loaded.value, equipmentBundles };
}

describe("CharacterCreationWizard", () => {
  it("expõe opções para uma escolha dinâmica de idioma", async () => {
    const result = createCharacterDraft({
      id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), rulesetRef, createdAt: now,
      partial: {
        name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"),
        classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
        abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "2. Raça") as HTMLElement);
      const language = [...mounted.container.querySelectorAll("select")].find((select) => [...select.options].some((option) => option.value === "elvish")) as HTMLSelectElement | undefined;
      expect(language).toBeDefined();
      expect([...language?.options ?? []].map((option) => option.value)).toContain("elvish");
    } finally {
      await mounted.unmount();
    }
  });

  it("torna a escolha múltipla de perícias tocável e limita a cardinalidade", async () => {
    const result = createCharacterDraft({
      id: asUuid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"), rulesetRef, createdAt: now,
      partial: { name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"), classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }] },
    });
    if (!result.ok) throw new Error(result.error.message);
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "3. Classe") as HTMLElement);
      const choices = [...mounted.container.querySelectorAll('fieldset[aria-label="Perícias · Guerreiro"] input[type="checkbox"]')] as HTMLInputElement[];
      expect(choices.length).toBeGreaterThan(2);
      expect(mounted.container.textContent).toContain("Atletismo");
      await click(choices[0]);
      await click(choices[1]);
      expect(mounted.container.textContent).toContain("2 de 2 selecionada(s)");
      expect(choices[2].disabled).toBe(true);
    } finally {
      await mounted.unmount();
    }
  });

  it("oferece ao bardo apenas truques de nível 0 e magias de nível 1 da lista da classe", async () => {
    const result = createCharacterDraft({
      id: asUuid("abababab-abab-4bab-8bab-abababababab"), rulesetRef, createdAt: now,
      partial: {
        name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"),
        classes: [{ classId: asEntityId("bard"), level: 1, choices: [] }],
        abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
        inventory: [], castingSources: [], appearance: "",
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const loaded = catalog();
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={loaded} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Magias")) as HTMLElement);
      const assertEligible = (label: string, level: number) => {
        const values = [...mounted.container.querySelectorAll(`fieldset[aria-label="${label}"] input[type="checkbox"]`)].map((input) => (input as HTMLInputElement).value);
        expect(values.length).toBeGreaterThan(0);
        for (const value of values) {
          const spell = loaded.rulePack.spells.get(asEntityId(value));
          expect(spell?.level).toBe(level);
          expect(spell?.classes.map(String)).toContain("bard");
        }
      };
      assertEligible("Truques · Bardo", 0);
      assertEligible("Magias · Bardo", 1);
    } finally {
      await mounted.unmount();
    }
  });

  it("começa pela identidade, permite avançar sem campos opcionais e preserva escolhas ao voltar", async () => {
    const mounted = await mount(<CharacterCreationWizard draft={draft()} catalog={catalog()} />);
    expect(mounted.container.textContent).toContain("Identidade");
    const continueButton = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Continuar")) as HTMLButtonElement;
    expect(continueButton.getAttribute("aria-disabled")).toBeNull();
    const name = mounted.container.querySelector("input") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(name, "Artemis");
    await fireEvent(name, new Event("input", { bubbles: true }));
    expect(continueButton.getAttribute("aria-disabled")).toBeNull();
    await click(continueButton);
    expect(mounted.container.textContent).toContain("Escolha uma raça");
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Voltar") as HTMLElement);
    expect((mounted.container.querySelector("input") as HTMLInputElement).value).toBe("Artemis");
    await mounted.unmount();
  });

  it("mantém a identidade ao reabrir um rascunho salvo só com o nome", async () => {
    const result = createCharacterDraft({ id: asUuid("ffffffff-ffff-4fff-8fff-ffffffffffff"), rulesetRef, createdAt: now, partial: { name: "Artemis" } });
    if (!result.ok) throw new Error(result.error.message);
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} />);
    expect(mounted.container.textContent).toContain("Identidade");
    expect(mounted.container.textContent).not.toContain("Escolha uma raça");
    const playerName = [...mounted.container.querySelectorAll("input")][1] as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(playerName, "Jogador");
    await fireEvent(playerName, new Event("input", { bubbles: true }));
    expect(mounted.container.textContent).toContain("Identidade");
    await mounted.unmount();
  });

  it("salva o draft apenas uma vez por intenção", async () => {
    const saveDraft = vi.fn(async () => ({ ok: true as const, value: draft() }));
    const service = { saveDraft, deleteDraft: vi.fn(), saveCharacter: vi.fn() } as never;
    const mounted = await mount(<CharacterCreationWizard draft={draft()} catalog={catalog()} service={service} />);
    const save = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Salvar rascunho") as HTMLElement;
    await click(save);
    await click(save);
    expect(saveDraft).toHaveBeenCalledOnce();
    await mounted.unmount();
  });

  it("permite salvar novamente após editar o rascunho", async () => {
    const saveDraft = vi.fn(async (value) => ({ ok: true as const, value }));
    const service = { saveDraft, deleteDraft: vi.fn(), saveCharacter: vi.fn() } as never;
    const mounted = await mount(<CharacterCreationWizard draft={draft()} catalog={catalog()} service={service} />);
    try {
      const save = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Salvar rascunho") as HTMLElement;
      await click(save);
      const name = mounted.container.querySelector("input") as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(name, "Artemis");
      await fireEvent(name, new Event("input", { bubbles: true }));
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Salvar rascunho") as HTMLElement);
      expect(saveDraft).toHaveBeenCalledTimes(3);
    } finally {
      await mounted.unmount();
    }
  });

  it("salva localmente cada decisão de criação", async () => {
    const saveDraft = vi.fn(async (value) => ({ ok: true as const, value }));
    const service = { saveDraft, deleteDraft: vi.fn(), saveCharacter: vi.fn() } as never;
    const mounted = await mount(<CharacterCreationWizard draft={draft()} catalog={catalog()} service={service} />);
    try {
      const name = mounted.container.querySelector("input") as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(name, "Artemis");
      await fireEvent(name, new Event("input", { bubbles: true }));
      await vi.waitFor(() => expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({ partial: expect.objectContaining({ name: "Artemis" }) })));
    } finally {
      await mounted.unmount();
    }
  });

  it("confirma uma única vez depois da revisão válida", async () => {
    const saveCharacter = vi.fn(async () => ({ ok: true as const, value: asRevision(1) }));
    const deleteDraft = vi.fn(async () => ok(undefined));
    const service = { saveDraft: vi.fn(), deleteDraft, saveCharacter } as never;
    const onCreated = vi.fn();
    const mounted = await mount(<CharacterCreationWizard draft={completeDraft()} catalog={catalog()} service={service} onCreated={onCreated} />);
    const confirm = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar")) as HTMLElement;
    await click(confirm);
    await click(confirm);
    expect(saveCharacter).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledOnce();
    expect(deleteDraft).toHaveBeenCalledWith(completeDraft().id);
    await mounted.unmount();
  });

  it("retoma confirmação idêntica sem gravar novamente e preserva uma ficha alterada", async () => {
    const input = completeDraft();
    const materialized = materializeCharacter(catalog(), input);
    if (!materialized.ok) throw new Error("Fixture inválida");
    const existing = { ...materialized.value.character, revision: asRevision(2) };
    const saveCharacter = vi.fn();
    const deleteDraft = vi.fn(async () => ok(undefined));
    const loadCharacter = vi.fn(async () => ok(existing));
    const service = { saveDraft: vi.fn(), deleteDraft, saveCharacter, loadCharacter, canReuseCharacter: () => true };
    const onCreated = vi.fn();
    const mounted = await mount(<CharacterCreationWizard draft={input} catalog={catalog()} service={service} onCreated={onCreated} />);
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar"))!);
    expect(saveCharacter).not.toHaveBeenCalled();
    expect(deleteDraft).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledWith(existing, asRevision(2));
    await mounted.unmount();

    loadCharacter.mockResolvedValue(ok({ ...existing, name: "Editado na ficha" }));
    deleteDraft.mockClear(); onCreated.mockClear();
    const changed = await mount(<CharacterCreationWizard draft={input} catalog={catalog()} service={service} onCreated={onCreated} />);
    await click([...changed.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar"))!);
    expect(changed.container.textContent).toContain("já foi alterado");
    expect(saveCharacter).not.toHaveBeenCalled();
    expect(deleteDraft).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    await changed.unmount();
  });

  it("mantém o rascunho quando a ficha não pôde ser salva", async () => {
    const deleteDraft = vi.fn(async () => ok(undefined));
    const service = { saveDraft: vi.fn(), deleteDraft, saveCharacter: vi.fn(async () => err({ code: "conflict" as const, message: "Conflito preservado", expectedRevision: asRevision(0), actualRevision: asRevision(1) })) };
    const mounted = await mount(<CharacterCreationWizard draft={completeDraft()} catalog={catalog()} service={service} />);
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar"))!);
    expect(mounted.container.textContent).toContain("Conflito preservado");
    expect(deleteDraft).not.toHaveBeenCalled();
    await mounted.unmount();
  });

  it("aguarda o autosave antes de criar e remover o rascunho", async () => {
    const input = completeDraft();
    let finishSave!: (value: ReturnType<typeof ok<typeof input>>) => void;
    const pending = new Promise<ReturnType<typeof ok<typeof input>>>((resolve) => { finishSave = resolve; });
    const saveCharacter = vi.fn(async () => ok(asRevision(1)));
    const deleteDraft = vi.fn(async () => ok(undefined));
    const service = { saveDraft: vi.fn(() => pending), saveCharacter, deleteDraft };
    const mounted = await mount(<CharacterCreationWizard draft={input} catalog={catalog()} service={service} />);
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "1. Identidade")!);
    const name = mounted.container.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(name, "Artemis nova");
    await fireEvent(name, new Event("input", { bubbles: true }));
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "9. Revisão")!);
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar"))!);
    expect(saveCharacter).not.toHaveBeenCalled();
    expect(deleteDraft).not.toHaveBeenCalled();
    await act(async () => { finishSave(ok(input)); await pending; });
    expect(saveCharacter).toHaveBeenCalledOnce();
    expect(deleteDraft).toHaveBeenCalledOnce();
    expect(saveCharacter.mock.invocationCallOrder[0]).toBeLessThan(deleteDraft.mock.invocationCallOrder[0]);
    await mounted.unmount();
  });
});
