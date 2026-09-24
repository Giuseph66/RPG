import { describe, expect, it, vi } from "vitest";

import { fireEvent, mount } from "@components/ui/testUtils";
import { asUuid } from "@domain/contracts/ids";
import { asEntityId } from "@domain/contracts/ids";
import { ok } from "@domain/contracts/errors";

import { CampaignPanel, CampaignRecords } from "./index";

const campaigns = [{ id: "one", name: "Costa", description: "Uma campanha" }, { id: "two", name: "Ruínas" }];

describe("CampaignPanel", () => {
  it("requests a guarded switch when a draft is pending", async () => {
    const onIntent = vi.fn();
    const { container, unmount } = await mount(<CampaignPanel campaigns={campaigns} activeCampaignId="one" draftPending onIntent={onIntent} />);
    const selector = container.querySelector('select[aria-label="Campanha ativa"]') as HTMLSelectElement;
    selector.value = "two";
    await fireEvent(selector, new Event("change", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "switch-campaign", campaignId: "two" });
    await unmount();
  });

  it("does not delete when exclusion is canceled and requires backup confirmation", async () => {
    const onIntent = vi.fn();
    const { container, unmount } = await mount(<CampaignPanel campaigns={campaigns} activeCampaignId="one" onIntent={onIntent} />);
    const remove = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Excluir campanha")) as HTMLButtonElement;
    await fireEvent(remove, new MouseEvent("click", { bubbles: true }));
    const cancel = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("Cancelar")) as HTMLButtonElement;
    expect(cancel).toBeDefined();
    await fireEvent(cancel, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).not.toHaveBeenCalled();
    await unmount();
  });

  it("keeps mission completion as an explicit intent", async () => {
    const onIntent = vi.fn();
    const timestamp = "2026-01-01T00:00:00.000Z" as never;
    const { container, unmount } = await mount(<CampaignRecords quests={[{ id: "quest" as never, title: "Ponte", description: "Encontrar", status: "active", linkedEntityIds: [], createdAt: timestamp, updatedAt: timestamp }]} onIntent={onIntent} />);
    const complete = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Concluir")) as HTMLButtonElement;
    await fireEvent(complete, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "complete-quest", questId: "quest" });
    await unmount();
  });

  it("creates an NPC with an explicit narrative type", async () => {
    const onIntent = vi.fn();
    const { container, unmount } = await mount(<CampaignRecords npcs={[]} sections={["npcs"]} onIntent={onIntent} />);
    const create = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Novo NPC"))!;
    await fireEvent(create, new MouseEvent("click", { bubbles: true }));
    const input = container.querySelector('input[maxlength="80"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, "Mira, a cartógrafa");
    await fireEvent(input, new Event("input", { bubbles: true }));
    const description = container.querySelector("textarea") as HTMLTextAreaElement;
    const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    textareaSetter?.call(description, "Conhece os caminhos do norte.");
    await fireEvent(description, new Event("input", { bubbles: true }));
    const save = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar ao elenco"))!;
    await fireEvent(save, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "create-npc", name: "Mira, a cartógrafa", description: "Conhece os caminhos do norte.", recordKind: "npc" });
    await unmount();
  });

  it("can attach a complete character sheet to an NPC", async () => {
    const onIntent = vi.fn();
    const sheetId = asUuid("00000000-0000-4000-8000-000000000091");
    const { container, unmount } = await mount(<CampaignRecords npcs={[]} sections={["npcs"]} availableCharacters={[{ id: sheetId, name: "Mira" }]} onIntent={onIntent} />);
    const create = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Novo NPC"))!;
    await fireEvent(create, new MouseEvent("click", { bubbles: true }));
    const input = container.querySelector('input[maxlength="80"]') as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "Mira");
    await fireEvent(input, new Event("input", { bubbles: true }));
    const sheet = [...container.querySelectorAll("select")].find((item) => item.querySelector('option[value=""]')?.textContent === "Somente registro narrativo")!;
    sheet.value = String(sheetId);
    await fireEvent(sheet, new Event("change", { bubbles: true }));
    const save = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar ao elenco"))!;
    await fireEvent(save, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ kind: "create-npc", name: "Mira", characterRef: sheetId }));
    await unmount();
  });

  it("generates and links an NPC sheet from published race and class options", async () => {
    const onIntent = vi.fn();
    const sheetId = asUuid("00000000-0000-4000-8000-000000000092");
    const raceId = asEntityId("race.human");
    const classId = asEntityId("class.fighter");
    const onGenerateSheet = vi.fn().mockResolvedValue(ok(sheetId));
    const { container, unmount } = await mount(<CampaignRecords npcs={[]} sections={["npcs"]} onIntent={onIntent} raceOptions={[{ id: raceId, name: "Humano" }]} classOptions={[{ id: classId, name: "Guerreiro" }]} onGenerateSheet={onGenerateSheet} />);
    await fireEvent([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Novo NPC"))!, new MouseEvent("click", { bubbles: true }));
    const name = container.querySelector('input[maxlength="80"]') as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(name, "Mira");
    await fireEvent(name, new Event("input", { bubbles: true }));
    const race = container.querySelector('select[aria-label="Raça do NPC"]') as HTMLSelectElement;
    race.value = String(raceId);
    await fireEvent(race, new Event("change", { bubbles: true }));
    const characterClass = container.querySelector('select[aria-label="Classe do NPC"]') as HTMLSelectElement;
    characterClass.value = String(classId);
    await fireEvent(characterClass, new Event("change", { bubbles: true }));
    await fireEvent([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Gerar ficha e adicionar"))!, new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ kind: "create-npc", name: "Mira", characterRef: sheetId })));
    expect(onGenerateSheet).toHaveBeenCalledWith({ name: "Mira", raceId, classId });
    await unmount();
  });
});
