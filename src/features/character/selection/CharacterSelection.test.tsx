import { describe, expect, it, vi } from "vitest";

import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { mount, click } from "@components/ui/testUtils";

import { CharacterSelection } from "./CharacterSelection";
import type { DraftSummary } from "./types";

const id = asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const updatedAt = asIsoTimestamp("2024-01-01T00:00:00.000Z");

describe("CharacterSelection", () => {
  it("mostra estado vazio e permite iniciar criação", async () => {
    const onCreate = vi.fn();
    const mounted = await mount(<CharacterSelection characters={[]} onCreate={onCreate} />);
    expect(mounted.container.textContent).toContain("Nenhum personagem ainda");
    await click(mounted.container.querySelector("button") as HTMLElement);
    expect(onCreate).toHaveBeenCalledOnce();
    await mounted.unmount();
  });

  it("expõe loading/erro e retoma draft somente por intenção explícita", async () => {
    const retry = vi.fn();
    const loading = await mount(<CharacterSelection characters={[]} status="loading" onRetry={retry} />);
    expect(loading.container.textContent).toContain("Carregando personagens");
    await loading.unmount();

    const onResumeDraft = vi.fn();
    const draft: DraftSummary = { id, currentStep: "class", updatedAt, name: "Rascunho" };
    const error = await mount(<CharacterSelection characters={[]} drafts={[draft]} status="error" error={new Error("falha") } onResumeDraft={onResumeDraft} onRetry={retry} />);
    expect(error.container.textContent).toContain("falha");
    await click(error.container.querySelector("button") as HTMLElement);
    expect(retry).toHaveBeenCalledOnce();
    await error.unmount();

    const ready = await mount(<CharacterSelection characters={[]} drafts={[draft]} onResumeDraft={onResumeDraft} />);
    await click([...ready.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Retomar")) as HTMLElement);
    expect(onResumeDraft).toHaveBeenCalledWith(id);
    await ready.unmount();
  });
});
