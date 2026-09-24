import { describe, expect, it, vi } from "vitest";

import { click, mount } from "@components/ui/testUtils";

vi.mock("@features/dice3d", () => ({ Dice3D: () => null }));

import { SettingsPanel } from "./SettingsPanel";

const characters = [
  { id: "a", name: "broom", detail: "Druida 1" },
  { id: "b", name: "Aric", detail: "Patrulheiro 5" },
];

describe("SettingsPanel — personagem ativo", () => {
  it("mostra o ativo no dropdown, lista as fichas e troca o personagem", async () => {
    const onSelect = vi.fn();
    const { container, unmount } = await mount(<SettingsPanel characters={characters} activeCharacterId="a" onSelectCharacter={onSelect} onCreateCharacter={vi.fn()} />);
    const trigger = container.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement;
    expect(trigger.textContent).toContain("broom");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    await click(trigger);
    const options = [...container.querySelectorAll('[role="option"]')];
    expect(options).toHaveLength(2);
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");
    await click(options[1]!.querySelector("button") as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith("b");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    await unmount();
  });

  it("oferece criar personagem como última opção, mesmo sem fichas", async () => {
    const onCreate = vi.fn();
    const { container, unmount } = await mount(<SettingsPanel characters={[]} onSelectCharacter={vi.fn()} onCreateCharacter={onCreate} />);
    const trigger = container.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement;
    expect(trigger.textContent).toContain("Nenhum personagem");
    await click(trigger);
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Criar novo personagem")) as HTMLElement);
    expect(onCreate).toHaveBeenCalled();
    await unmount();
  });

  it("lista rascunhos em \"Em criação\" e retoma o escolhido", async () => {
    const onResume = vi.fn();
    const { container, unmount } = await mount(<SettingsPanel characters={characters} activeCharacterId="a" onSelectCharacter={vi.fn()} onCreateCharacter={vi.fn()} drafts={[{ id: "d1", name: "Thorin", step: "Raça" }]} onResumeDraft={onResume} />);
    await click(container.querySelector('button[aria-haspopup="listbox"]') as HTMLElement);
    expect(container.querySelector('[role="group"][aria-label="Em criação"]')?.textContent).toContain("Parou em: Raça");
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Thorin")) as HTMLElement);
    expect(onResume).toHaveBeenCalledWith("d1");
    await unmount();
  });
});
