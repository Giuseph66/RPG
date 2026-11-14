import { describe, expect, it, vi } from "vitest";
import { fireEvent, mount } from "@components/ui/testUtils";
import { JourneyCampaign } from "./JourneyCampaign";

describe("JourneyCampaign", () => {
  it("separa o catálogo em aba Criaturas e mantém Elenco sem catálogo", async () => {
    const onTabChange = vi.fn();
    const mounted = await mount(<JourneyCampaign campaigns={[]} creaturesPanel={<p>Gerenciamento do Elenco</p>} creaturesCatalogPanel={<p>Catálogo completo</p>} onTabChange={onTabChange} />);
    const tabs = [...mounted.container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toContain("Criaturas");
    await fireEvent(tabs.find((tab) => tab.textContent === "Elenco")!, new MouseEvent("click", { bubbles: true }));
    expect(mounted.container.textContent).toContain("Gerenciamento do Elenco");
    expect(mounted.container.textContent).not.toContain("Catálogo completo");
    await fireEvent(tabs.find((tab) => tab.textContent === "Criaturas")!, new MouseEvent("click", { bubbles: true }));
    expect(mounted.container.textContent).toContain("Catálogo completo");
    expect(onTabChange).toHaveBeenLastCalledWith("creatures");
    await mounted.unmount();
  });

  it("não oferece Criaturas só por a campanha reconhecer papel de mestre", async () => {
    const mounted = await mount(<JourneyCampaign campaigns={[]} role="master" creaturesPanel={<p>Gerenciamento do Elenco</p>} />);
    expect([...mounted.container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)).not.toContain("Criaturas");
    await mounted.unmount();
  });
});
