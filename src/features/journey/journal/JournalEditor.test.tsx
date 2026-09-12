import { describe, expect, it, vi } from "vitest";

import { fireEvent, keyDown, mount } from "@components/ui/testUtils";
import { asUuid } from "@domain/contracts";
import { createJournalDraft } from "@domain/campaign/journal";

import { JournalEditor, JournalEntryList } from "./index";

const campaignId = asUuid("00000000-0000-4000-8000-000000000001");

describe("JournalEditor", () => {
  it("emits text edits and Ctrl+S as intents while keeping markup as text", async () => {
    const onIntent = vi.fn();
    const draft = createJournalDraft(campaignId);
    const { container, unmount } = await mount(<JournalEditor draft={draft} onIntent={onIntent} status="dirty" />);
    const body = container.querySelector("textarea") as HTMLTextAreaElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(body, "<b>texto</b>");
    await fireEvent(body, new Event("input", { bubbles: true }));
    await keyDown(body, "s", { ctrlKey: true });
    expect(onIntent).toHaveBeenCalledWith({ kind: "update-draft", patch: { body: "<b>texto</b>" } });
    expect(onIntent).toHaveBeenCalledWith({ kind: "save-draft" });
    await unmount();
  });

  it("shows autosave failure, missing links and keyboard reachable actions", async () => {
    const { container, unmount } = await mount(<JournalEditor draft={draft} status="error" error="Falha de gravação" links={[{ id: asUuid("00000000-0000-4000-8000-000000000009"), exists: false }]} onIntent={vi.fn()} />);
    expect(container.textContent).toContain("Falha de gravação");
    expect(container.textContent).toContain("Vínculo ausente");
    const save = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Salvar")) as HTMLButtonElement;
    save.focus();
    expect(document.activeElement).toBe(save);
    await unmount();
  });

  it("renders an empty list and selectable records", async () => {
    const empty = await mount(<JournalEntryList entries={[]} />);
    expect(empty.container.textContent).toContain("Nenhum registro");
    await empty.unmount();
  });
});

const draft = createJournalDraft(campaignId);
