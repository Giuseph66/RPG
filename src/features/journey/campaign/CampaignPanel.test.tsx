import { describe, expect, it, vi } from "vitest";

import { fireEvent, mount } from "@components/ui/testUtils";

import { CampaignPanel, CampaignRecords, JourneyCampaign } from "./index";

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

  it("allows the coordinator to create and edit objectives and missions", async () => {
    const onIntent = vi.fn();
    const timestamp = "2026-01-01T00:00:00.000Z" as never;
    const quest = { id: "quest" as never, title: "Ponte", description: "Encontrar", status: "active" as const, linkedEntityIds: [], createdAt: timestamp, updatedAt: timestamp };
    const { container, unmount } = await mount(<CampaignRecords objectives={["Chegar ao norte"]} quests={[quest]} onIntent={onIntent} />);
    const objectiveInput = container.querySelectorAll("form")[0]!.querySelector("input") as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(objectiveInput, "Salvar a vila");
    await fireEvent(objectiveInput, new Event("input", { bubbles: true }));
    await fireEvent(container.querySelectorAll("form")[0]!.querySelector('button[type="submit"]')!, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "create-objective", text: "Salvar a vila" });

    const editObjective = [...container.querySelectorAll("button")].find((button) => button.textContent === "Editar") as HTMLButtonElement;
    await fireEvent(editObjective, new MouseEvent("click", { bubbles: true }));
    const objectiveEditInput = container.querySelectorAll("form")[0]!.querySelector("input") as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(objectiveEditInput, "Proteger a vila");
    await fireEvent(objectiveEditInput, new Event("input", { bubbles: true }));
    await fireEvent(container.querySelectorAll("form")[0]!.querySelector('button[type="submit"]')!, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "update-objective", index: 0, text: "Proteger a vila" });

    const title = container.querySelectorAll("form")[1]!.querySelector("input") as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(title, "Abrir o portão");
    await fireEvent(title, new Event("input", { bubbles: true }));
    await fireEvent(container.querySelectorAll("form")[1]!.querySelector('button[type="submit"]')!, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "create-quest", title: "Abrir o portão", description: "" });
    await unmount();
  });

  it("keeps players away from mission completion and campaign deletion", async () => {
    const timestamp = "2026-01-01T00:00:00.000Z" as never;
    const records = await mount(<CampaignRecords quests={[{ id: "quest" as never, title: "Ponte", description: "Encontrar", status: "active", linkedEntityIds: [], createdAt: timestamp, updatedAt: timestamp }]} />);
    expect(records.container.textContent).not.toContain("Concluir");
    await records.unmount();
    const panel = await mount(<CampaignPanel campaigns={campaigns} activeCampaignId="one" canDelete={false} sectionLinks={["map", "journal", "npcs"]} metrics={[{ label: "Encontros", value: 2 }]} onIntent={vi.fn()} />);
    expect(panel.container.textContent).not.toContain("Excluir campanha");
    expect(panel.container.textContent).not.toContain("Sessões");
    expect(panel.container.textContent).toContain("Encontros2");
    await panel.unmount();
  });

  it("expõe Participantes ao jogador para vincular somente a própria ficha", async () => {
    const mounted = await mount(<JourneyCampaign campaigns={campaigns} role="player" requestedTabId="participants" participantsPanel={<p>Minha ficha na campanha</p>} />);
    const selected = mounted.container.querySelector('[role="tab"][aria-selected="true"]');
    expect(selected?.textContent).toContain("Participantes");
    expect(mounted.container.textContent).toContain("Minha ficha na campanha");
    expect(mounted.container.textContent).not.toContain("Sessões");
    await mounted.unmount();
  });
});
