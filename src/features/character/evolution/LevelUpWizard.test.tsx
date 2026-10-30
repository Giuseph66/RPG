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

  it("avisa o ganho de espaços de magia e o novo limite de preparadas", async () => {
    const mounted = await mount(<LevelUpWizard character={druid()} pack={pack} newId={newId} onConfirm={async () => ({ ok: true })} onCancel={() => undefined} />);
    try {
      await click(button(mounted.container, "Continuar"));
      expect(mounted.container.textContent).toContain("Espaços de magia do 1º círculo: 2 → 3");
      expect(mounted.container.textContent).toMatch(/Magias preparadas: até \d+ \(antes \d+\)/);
    } finally {
      await mounted.unmount();
    }
  });

  it("mostra a escolha de subclasse, com o que cada uma faz, e permite adiar", async () => {
    const subclassInfo = (id: string) => (id === "circle-of-the-land" ? { name: "Círculo da Terra", intro: ["O Círculo da Terra é constituído por místicos e sábios que guardam ritos antigos."], features: [{ level: 2, name: "Truque adicional", paragraphs: ["Você aprende um truque de druida adicional."] }] } : undefined);
    const mounted = await mount(<LevelUpWizard character={druid()} pack={pack} newId={newId} subclassInfo={subclassInfo} onConfirm={async () => ({ ok: true })} onCancel={() => undefined} />);
    try {
      await click(button(mounted.container, "Continuar"));
      const text = mounted.container.textContent ?? "";
      expect(text).toContain("Escolher depois");
      expect(text).toContain("Círculo da Terra");
      expect(text).toContain("Círculo da Lua");
      expect(text).toContain("O Círculo da Terra é constituído por místicos");
      expect(text).toContain("nível 2: Truque adicional");
      await click(button(mounted.container, "Ver o que Círculo da Terra faz"));
      expect(mounted.container.textContent).toContain("Você aprende um truque de druida adicional.");
    } finally {
      await mounted.unmount();
    }
  });

  it("explica o que é e como escolher em cada escolha da classe", async () => {
    const mounted = await mount(<LevelUpWizard character={druid()} pack={pack} newId={newId} onConfirm={async () => ({ ok: true })} onCancel={() => undefined} />);
    try {
      await click(button(mounted.container, "Continuar"));
      const select = mounted.container.querySelector('input[type="radio"][name^="subclass"]:not(:checked)') as HTMLInputElement;
      await click(select);
      await click(button(mounted.container, "Continuar"));
      expect(mounted.container.textContent).toContain("O que é e como escolher");
    } finally {
      await mounted.unmount();
    }
  });
});
