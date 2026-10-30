import { describe, expect, it, vi } from "vitest";

import { asEntityId, asRulesetId } from "@domain/contracts/ids";
import { mount, click } from "@components/ui/testUtils";

import { SpellManagerModal } from "./SheetEditors";
import type { SpellInfo } from "../spell-info";

const rulesetId = asRulesetId("phb-ptbr-local-2017");
const option = (id: string, name: string, level: number) => ({ ref: { rulesetId, entityId: asEntityId(id) }, name, level, school: "transmutation", ritual: false, concentration: false });
const whip: SpellInfo = {
  name: "Chicote de Espinhos", level: 0, school: "transmutação", castingTime: "1 ação", range: "9 metros", components: "V, S, M", duration: "Instantânea", ritual: false,
  description: ["Você cria um longo chicote de vinhas coberto por espinhos que chicoteia uma criatura.", "Se o ataque atingir, a criatura sofre 1d6 de dano perfurante."],
  higherLevels: "O dano aumenta em 1d6 no 5° nível.", source: "Livro do Jogador, p. 226",
};

describe("SpellManagerModal", () => {
  it("mostra resumo e expande a descrição completa sem marcar a magia", async () => {
    const onChange = vi.fn();
    const mounted = await mount(<SpellManagerModal open onClose={() => undefined} options={[option("chicote-de-espinhos", "Chicote de Espinhos", 0), option("consertar", "Consertar", 0)]} spellInfo={(id) => (id === "chicote-de-espinhos" ? whip : undefined)} selected={new Set()} onChange={onChange} leveledLabel="Magias preparadas" />);
    try {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.textContent).toContain("Transmutação · 1 ação · 9 metros");
      expect(dialog.textContent).toContain("Você cria um longo chicote de vinhas");
      expect(dialog.textContent).toContain("Evolui: O dano aumenta em 1d6 no 5° nível.");
      expect(dialog.textContent).not.toContain("Livro do Jogador, p. 226");
      // Sem descrição publicada, a opção continua só com nome e escola.
      expect(dialog.querySelector('button[aria-label="Descrição de Consertar"]')).toBeNull();

      const info = dialog.querySelector('button[aria-label="Descrição de Chicote de Espinhos"]') as HTMLElement;
      await click(info);
      expect(info.getAttribute("aria-expanded")).toBe("true");
      expect(document.getElementById("spell-detail-chicote-de-espinhos")?.textContent).toContain("Se o ataque atingir");
      expect(dialog.textContent).toContain("Livro do Jogador, p. 226");
      expect(onChange).not.toHaveBeenCalled();

      await click(dialog.querySelector('button[aria-label="Ocultar descrição de Chicote de Espinhos"]') as HTMLElement);
      expect(document.getElementById("spell-detail-chicote-de-espinhos")).toBeNull();
    } finally {
      await mounted.unmount();
    }
  });
});
