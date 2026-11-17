import { describe, expect, it, vi } from "vitest";
import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { composeCharacterRuleContent, createCharacterDraft, materializeCharacter, optionalRuleOptionsForLevel } from "@domain/character/creation";
import { evolveCharacter } from "@domain/character/evolution";
import type { Character } from "@domain/contracts/character";
import { mount, click, fireEvent } from "@components/ui/testUtils";

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

const TASHA = asEntityId("tasha-ranger-options");
function tashaRanger(): Character {
  const draft = createCharacterDraft({ id: asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), rulesetRef, createdAt: asIsoTimestamp("2024-01-01T00:00:00.000Z"), partial: { name: "Guardiã", raceRef: { rulesetId: rulesetRef.id, entityId: asEntityId("human") }, classes: [{ classId: asEntityId("ranger"), level: 1, choices: [] }], selectedSupplementIds: [TASHA], optionalRuleSelections: [], abilityGeneration: { method: "manual", baseScores: { str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 10 } } } });
  if (!draft.ok) throw new Error(draft.error.message);
  const result = materializeCharacter({ rulePack: pack, equipmentBundles }, draft.value, { idGenerator: newId });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.character;
}
const composedFor = (character: Character) => { const composed = composeCharacterRuleContent(pack, character); if (!composed.ok) throw new Error(composed.error.message); return composed.value; };

const button = (container: Element, label: string) => [...container.querySelectorAll("button")].find((entry) => entry.textContent === label) as HTMLElement;

describe("LevelUpWizard", () => {
  it("Tasha: oferece só as opções alcançadas e amplia os estilos de luta na mesma subida (1→2)", async () => {
    const character = tashaRanger();
    const onConfirm = vi.fn(async () => ({ ok: true }));
    const mounted = await mount(<LevelUpWizard character={character} pack={composedFor(character)} newId={newId} onConfirm={onConfirm} onCancel={() => undefined} />);
    try {
      await click(button(mounted.container, "Continuar"));
      const text = mounted.container.textContent ?? "";
      expect(text).toContain("Opções do suplemento neste nível");
      expect(text).toContain("Adicionar à lista de Estilos de Luta");
      // Nível 3+ ainda não alcançado; nível 1 já foi decidido na criação.
      expect(text).not.toContain("Consciência Primordial");
      expect(text).not.toContain("Véu Natural");
      expect(text).not.toContain("Usar Hábil");
      const extend = [...mounted.container.querySelectorAll('input[type="checkbox"]')].find((input) => input.parentElement?.textContent?.includes("Adicionar à lista de Estilos de Luta")) as HTMLInputElement;
      await click(extend);
      await click(button(mounted.container, "Continuar"));
      expect(mounted.container.textContent).toContain("Luta às Cegas");
      while (button(mounted.container, "Continuar")) await click(button(mounted.container, "Continuar"));
      await click(button(mounted.container, "Confirmar nível"));
      const [next] = onConfirm.mock.calls[0] as unknown as [Character];
      expect(next.optionalRuleSelections?.map((selection) => String(selection.optionId))).toEqual(["ranger.optional-fighting-style"]);
    } finally {
      await mounted.unmount();
    }
  });

  it("Tasha: Consciência Primordial ligada no 3º nível fica gravada e recompõe com a magia concedida", async () => {
    const level1 = tashaRanger();
    const level2 = evolveCharacter(level1, { classId: asEntityId("ranger"), targetClassLevel: 2, hitPointGain: { kind: "fixed-average", amount: 6 }, choices: [], mode: "milestone" }, composedFor(level1), { idGenerator: newId, now: asIsoTimestamp("2024-01-02T00:00:00.000Z") });
    if (!level2.ok) throw new Error(JSON.stringify(level2.error));
    const onConfirm = vi.fn(async () => ({ ok: true }));
    const mounted = await mount(<LevelUpWizard character={level2.value} pack={composedFor(level2.value)} newId={newId} onConfirm={onConfirm} onCancel={() => undefined} />);
    try {
      await click(button(mounted.container, "Continuar"));
      const primal = [...mounted.container.querySelectorAll('input[type="checkbox"]')].find((input) => input.parentElement?.textContent?.includes("Usar Consciência Primordial")) as HTMLInputElement;
      expect(primal).toBeDefined();
      // Estilo de luta do 2º nível já passou: ampliar a lista agora não faria nada.
      expect(mounted.container.textContent).not.toContain("Adicionar à lista de Estilos de Luta");
      await click(primal);
      expect(mounted.container.textContent).toContain("Consciência Primordial (Falar com Animais)");
      while (button(mounted.container, "Continuar")) await click(button(mounted.container, "Continuar"));
      await click(button(mounted.container, "Confirmar nível"));
      const [next] = onConfirm.mock.calls[0] as unknown as [Character];
      expect(next.optionalRuleSelections?.map((selection) => String(selection.optionId))).toEqual(["ranger.optional-primal-awareness"]);
      const reloaded = composedFor(next);
      const ranger = reloaded.classes.get(asEntityId("ranger"))!;
      expect(ranger.progression[2]?.featureRefs.map((ref) => String(ref.entityId))).toContain("ranger.primal-awareness");
      expect(ranger.progression[2]?.featureRefs.map((ref) => String(ref.entityId))).not.toContain("ranger.primeval-awareness");
      expect(next.castingSources.flatMap((source) => source.knownSpellRefs.map((ref) => String(ref.entityId)))).toContain("falar-com-animais");

      // Regra da mesa: opção só no nível exato. Quem sobe para o 4º não vê mais Consciência Primordial (3º).
      const skipped = evolveCharacter(level2.value, { classId: asEntityId("ranger"), targetClassLevel: 3, hitPointGain: { kind: "fixed-average", amount: 6 }, choices: [], mode: "milestone" }, composedFor(level2.value), { idGenerator: newId, now: asIsoTimestamp("2024-01-03T00:00:00.000Z") });
      if (!skipped.ok) throw new Error(JSON.stringify(skipped.error));
      expect(optionalRuleOptionsForLevel(composedFor(skipped.value), skipped.value, asEntityId("ranger"), 4).map((option) => String(option.optionId))).toEqual(["ranger.optional-martial-versatility"]);
    } finally {
      await mounted.unmount();
    }
  });

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

  it("deixa desfazer a escolha de multiclasse voltando para \"Nenhuma\"", async () => {
    const mounted = await mount(<LevelUpWizard character={druid()} pack={pack} newId={newId} onConfirm={async () => ({ ok: true })} onCancel={() => undefined} />);
    try {
      const select = mounted.container.querySelector("select") as HTMLSelectElement;
      const card = () => button(mounted.container, "DruidaNível 1 → 2");
      const choose = async (value: string) => { select.value = value; await fireEvent(select, new Event("change", { bubbles: true })); };
      await choose("monk");
      expect(select.value).toBe("monk");
      expect(card().getAttribute("aria-pressed")).toBe("false");
      await choose("");
      expect(select.value).toBe("");
      expect(card().getAttribute("aria-pressed")).toBe("true");
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
