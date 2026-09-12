import { describe, expect, it, vi } from "vitest";
import { fireEvent, mount } from "@components/ui/testUtils";
import { DataManagementPanel } from "./DataManagementPanel";

describe("DataManagementPanel", () => {
  it("expõe vazio, loading e erro sem acessar persistência", async () => {
    const { container, unmount } = await mount(<DataManagementPanel status="error" error="Falha local" />);
    expect(container.textContent).toContain("Falha local");
    expect(container.textContent).toContain("Nenhum registro corrompido");
    await unmount();
  });

  it("emite recuperação como intent explícito", async () => {
    const onIntent = vi.fn();
    const { container, unmount } = await mount(<DataManagementPanel onIntent={onIntent} recovery={[{ id: "bad", sourceStore: "characters", recordedAt: "agora", raw: null }]} />);
    const restore = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Restaurar")) as HTMLButtonElement;
    await fireEvent(restore, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "restore-recovery", id: "bad" });
    await unmount();
  });
});

