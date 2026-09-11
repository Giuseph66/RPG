import { describe, expect, it } from "vitest";

import { mount } from "../../testUtils";
import { InlineStatus } from "./InlineStatus";

describe("InlineStatus", () => {
  it("uses role=status by default (polite, non-interrupting)", async () => {
    const { container, unmount } = await mount(
      <InlineStatus tone="info">Salvo automaticamente</InlineStatus>,
    );
    const el = container.querySelector('[role="status"]');
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain("Salvo automaticamente");
    await unmount();
  });

  it("uses role=alert when assertive", async () => {
    const { container, unmount } = await mount(
      <InlineStatus tone="error" assertive>
        Falha ao salvar
      </InlineStatus>,
    );
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    await unmount();
  });

  it("pairs an aria-hidden glyph with visible text (not color alone)", async () => {
    const { container, unmount } = await mount(
      <InlineStatus tone="warning">Recurso quase esgotado</InlineStatus>,
    );
    const glyph = container.querySelector('[aria-hidden="true"]');
    expect(glyph).not.toBeNull();
    expect(container.textContent).toContain("Recurso quase esgotado");
    await unmount();
  });

  it("does not move focus (no tabindex/focus call)", async () => {
    const before = document.activeElement;
    const { unmount } = await mount(<InlineStatus tone="success">Feito</InlineStatus>);
    expect(document.activeElement).toBe(before);
    await unmount();
  });
});
