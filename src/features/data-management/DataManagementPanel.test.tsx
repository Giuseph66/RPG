import { describe, expect, it, vi } from "vitest";
import { fireEvent, mount } from "@components/ui/testUtils";
import { asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
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

  it("mantém cópia e substituição disponíveis para colisão de ID", async () => {
    const onIntent = vi.fn();
    const preview = { rootName: "Campanha", kind: "campaign" as const, estimatedBytes: 12, conflicts: [{ kind: "duplicate-id" as const, id: asUuid("00000000-0000-4000-8000-000000000001"), entity: "state" }], rulesetRefs: [], schemaVersion: 1, counts: {}, warnings: [] };
    const mounted = await mount(<DataManagementPanel onIntent={onIntent} preview={preview} pendingEnvelope={{} as never} />);
    const confirm = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar importação")) as HTMLButtonElement;
    expect(confirm.getAttribute("aria-disabled")).toBeNull();
    await fireEvent(confirm, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "commit-import", mode: "copy" }));
    const policy = mounted.container.querySelector("select") as HTMLSelectElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(policy, "replace");
    await fireEvent(policy, new Event("change", { bubbles: true }));
    await fireEvent(confirm, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "commit-import", mode: "replace" }));
    await mounted.unmount();
  });

  it("mantém bloqueio para ruleset ausente", async () => {
    const preview = { rootName: "Campanha", kind: "campaign" as const, estimatedBytes: 12, conflicts: [{ kind: "missing-ruleset" as const, rulesetRef: { id: asRulesetId("outro-pack"), version: asPackVersion("1.0.0") } }], rulesetRefs: [], schemaVersion: 1, counts: {}, warnings: [] };
    const mounted = await mount(<DataManagementPanel onIntent={vi.fn()} preview={preview} pendingEnvelope={{} as never} />);
    const confirm = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar importação")) as HTMLButtonElement;
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    expect(mounted.container.textContent).toContain("Resolva os conflitos de regras ou referências");
    await mounted.unmount();
  });

  it("limpa o seletor após ler o arquivo e aceita selecionar o mesmo backup novamente", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<DataManagementPanel onIntent={onIntent} />);
    const input = mounted.container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{}"], "backup.json", { type: "application/json" });
    const selectFile = async () => {
      Object.defineProperty(input, "files", { configurable: true, value: [file] });
      await fireEvent(input, new Event("change", { bubbles: true }));
    };
    await selectFile();
    await vi.waitFor(() => expect(onIntent).toHaveBeenCalledTimes(1));
    expect(input.value).toBe("");
    await selectFile();
    await vi.waitFor(() => expect(onIntent).toHaveBeenCalledTimes(2));
    await mounted.unmount();
  });
});
