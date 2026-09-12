import { describe, expect, it, vi } from "vitest";

import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { mount, click, fireEvent } from "@components/ui/testUtils";

import { CharacterProgression } from "./CharacterProgression";

const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(loaded.error.message);

describe("CharacterProgression", () => {
  it("mostra pendência de XP e mantém confirmar bloqueado", async () => {
    const mounted = await mount(<CharacterProgression character={minimalCharacter} catalog={loaded.value} onApplyLevelUp={vi.fn()} />);
    expect(mounted.container.textContent).toContain("XP insuficiente");
    const confirm = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar avanço")) as HTMLButtonElement;
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    await mounted.unmount();
  });

  it("emite intenção única de avanço e registra XP por callback", async () => {
    const onApplyLevelUp = vi.fn();
    const onGrantXp = vi.fn();
    const mounted = await mount(<CharacterProgression character={{ ...minimalCharacter, xp: 300 }} catalog={loaded.value} onApplyLevelUp={onApplyLevelUp} onGrantXp={onGrantXp} />);
    const confirm = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar avanço")) as HTMLElement;
    await click(confirm);
    await click(confirm);
    expect(onApplyLevelUp).toHaveBeenCalledOnce();
    const xp = [...mounted.container.querySelectorAll("input")].at(-1) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(xp, "120");
    await fireEvent(xp, new Event("input", { bubbles: true }));
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Registrar XP")) as HTMLElement);
    expect(onGrantXp).toHaveBeenCalledWith(120);
    await mounted.unmount();
  });
});
