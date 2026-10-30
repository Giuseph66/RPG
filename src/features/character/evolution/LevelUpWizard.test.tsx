import { describe, expect, it, vi } from "vitest";
import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft, materializeCharacter } from "@domain/character/creation";
import { mount, click } from "@components/ui/testUtils";

import { LevelUpWizard } from "./LevelUpWizard";

const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(loaded.error.message);
const pack = loaded.value;
let serial = 0;
const newId = () => asUuid(`00000000-0000-4000-8000-${(++serial).toString(16).padStart(12, "0")}`);

function druid() {
  const draft = createCharacterDraft({ id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), rulesetRef, createdAt: asIsoTimestamp("2024-01-01T00:00:00.000Z"), partial: { name: "Bromm", raceRef: { rulesetId: rulesetRef.id, entityId: asEntityId("human") }, classes: [{ classId: asEntityId("druid"), level: 1, choices: [] }], abilityGeneration: { method: "manual", baseScores: { str: 10, dex: 12, con: 14, int: 10, wis: 16, cha: 10 } } } });
  if (!draft.ok) throw new Error(draft.error.message);
  const result = materializeCharacter({ rulePack: pack, equipmentBundles }, draft.value, { idGenerator: newId });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.character;
}

const button = (container: Element, label: string) => [...container.querySelectorAll("button")].find((entry) => entry.textContent === label) as HTMLElement;

describe("LevelUpWizard", () => {
  it("percorre classe, nível e revisão e entrega a ficha evoluída", async () => {
    const onConfirm = vi.fn(async () => ({ ok: true }));
    const mounted = await mount(<LevelUpWizard character={druid()} pack={pack} newId={newId} onConfirm={onConfirm} onCancel={() => undefined} />);
    try {
      expect(mounted.container.textContent).toContain("Qual classe sobe de nível?");
      expect(mounted.container.textContent).toContain("Nível 1 → 2");
      await click(button(mounted.container, "Continuar"));
      expect(mounted.container.textContent).toContain("Druida 1 → 2");
      expect(mounted.container.textContent).toContain("Pontos de vida (d8");
      expect(mounted.container.textContent).toContain("Forma Selvagem");
      while (button(mounted.container, "Continuar")) await click(button(mounted.container, "Continuar"));
      expect(mounted.container.textContent).toContain("Revise antes de confirmar");
      await click(button(mounted.container, "Confirmar nível"));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      const [next] = onConfirm.mock.calls[0] as unknown as [{ classes: { level: number }[]; spellSlots: { slotLevel: number }[] }];
      expect(next.classes[0].level).toBe(2);
      expect(next.spellSlots.filter((slot) => slot.slotLevel === 1)).toHaveLength(3);
    } finally {
      await mounted.unmount();
    }
  });

  it("mostra a escolha de subclasse e permite adiar", async () => {
    const mounted = await mount(<LevelUpWizard character={druid()} pack={pack} newId={newId} onConfirm={async () => ({ ok: true })} onCancel={() => undefined} />);
    try {
      await click(button(mounted.container, "Continuar"));
      const select = mounted.container.querySelector("select") as HTMLSelectElement;
      expect([...select.options].map((option) => option.textContent)).toEqual(expect.arrayContaining(["Escolher depois", "Círculo da Terra", "Círculo da Lua"]));
    } finally {
      await mounted.unmount();
    }
  });
});
