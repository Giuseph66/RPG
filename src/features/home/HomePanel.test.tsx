import { describe, expect, it, vi } from "vitest";

import { click, mount } from "@components/ui/testUtils";

import { HomePanel } from "./HomePanel";

const button = (container: HTMLElement, label: string) => [...container.querySelectorAll("button")].find((item) => item.textContent?.includes(label)) as HTMLElement;

describe("HomePanel", () => {
  it("sem ficha convida a criar a primeira", async () => {
    const onCreate = vi.fn();
    const { container, unmount } = await mount(<HomePanel onCreateCharacter={onCreate} />);
    expect(container.querySelector("h1")?.textContent).toBe("Abra sua mesa");
    await click(button(container, "Criar personagem"));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("Importar backup");
    await unmount();
  });

  it("com ficha mostra PV reais, campanha e abre a ficha", async () => {
    const onOpen = vi.fn();
    const { container, unmount } = await mount(<HomePanel
      character={{ id: "a", name: "Broom", detail: "Druida 1", classId: "druid", hp: { current: 7, maximum: 9 }, conditions: 1 }}
      campaign={{ name: "Vale Sombrio", activeQuests: 2, objectives: 1 }}
      characterCount={2}
      onOpenCharacter={onOpen}
    />);
    expect(container.querySelector("h1")?.textContent).toBe("Broom");
    expect(container.textContent).toContain("Druida 1");
    expect(container.textContent).toContain("7/9");
    expect(container.textContent).toContain("1 condição ativa");
    expect(container.textContent).toContain("Vale Sombrio");
    expect(container.textContent).toContain("missões em andamento");
    expect(button(container, "Trocar personagem")).toBeTruthy();
    await click(button(container, "Abrir ficha"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it("oferece retomar o rascunho e navega pelos atalhos", async () => {
    const onResume = vi.fn();
    const onNavigate = vi.fn();
    const { container, unmount } = await mount(<HomePanel draft={{ id: "d1", name: "Aric", step: "Classe" }} onResumeDraft={onResume} onNavigate={onNavigate} />);
    expect(container.textContent).toContain("Parou na etapa Classe");
    await click(button(container, "Retomar rascunho"));
    expect(onResume).toHaveBeenCalledWith("d1");
    await click(button(container, "Regras"));
    expect(onNavigate).toHaveBeenCalledWith("/compendium");
    await unmount();
  });

  it("mostra estado de carregamento", async () => {
    const { container, unmount } = await mount(<HomePanel status="loading" />);
    expect(container.textContent).toContain("Abrindo a mesa");
    await unmount();
  });
});
