import { describe, expect, it, vi } from "vitest";

import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft, type CreationCatalog } from "@domain/character/creation";
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
  it("começa pela identidade, bloqueia avanço inválido e preserva escolhas ao voltar", async () => {
    const mounted = await mount(<CharacterCreationWizard draft={draft()} catalog={catalog()} />);
    expect(mounted.container.textContent).toContain("Identidade");
    const continueButton = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Continuar")) as HTMLButtonElement;
    expect(continueButton.getAttribute("aria-disabled")).toBe("true");
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

  it("confirma uma única vez depois da revisão válida", async () => {
    const saveCharacter = vi.fn(async () => ({ ok: true as const, value: asRevision(1) }));
    const service = { saveDraft: vi.fn(), deleteDraft: vi.fn(), saveCharacter } as never;
    const onCreated = vi.fn();
    const mounted = await mount(<CharacterCreationWizard draft={completeDraft()} catalog={catalog()} service={service} onCreated={onCreated} />);
    const confirm = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar")) as HTMLElement;
    await click(confirm);
    await click(confirm);
    expect(saveCharacter).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledOnce();
    await mounted.unmount();
  });
});
