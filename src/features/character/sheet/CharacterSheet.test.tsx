import { describe, expect, it, vi } from "vitest";

import { asCentimeters, type SourceRef } from "@domain/contracts/primitives";
import { asEntityId, asUuid } from "@domain/contracts/ids";
import { minimalCharacter } from "@domain/contracts/fixtures";
import type { Character } from "@domain/contracts/character";
import type { CharacterDerived } from "@domain/contracts/derived";
import { mount, click, fireEvent } from "@components/ui/testUtils";

import { CharacterSheet } from "./CharacterSheet";

const source: SourceRef = { sourceId: minimalCharacter.rulesetRef.id, chapter: "Capítulo 1", printedPage: 15 };
const explanation = (value: number) => ({ value, contributions: [{ sourceRef: source, amount: value, description: "valor de teste" }] });
const derived: CharacterDerived = {
  characterId: minimalCharacter.id,
  characterRevision: minimalCharacter.revision,
  rulesetRef: minimalCharacter.rulesetRef,
  abilityScores: ["str", "dex", "con", "int", "wis", "cha"].map((ability) => ({ ability: ability as CharacterDerived["abilityScores"][number]["ability"], score: explanation(12), modifier: explanation(1) })),
  skills: [{ skill: "perception", modifier: explanation(3), proficient: true, expertise: false, passiveScore: explanation(13) }],
  savingThrows: [{ ability: "str", modifier: explanation(3), proficient: true }],
  armorClass: explanation(16),
  initiative: explanation(1),
  speedsCm: [{ kind: "walk", value: { ...explanation(asCentimeters(900)), value: asCentimeters(900) } }],
  proficiencyBonus: explanation(2),
  hitPointsMax: explanation(10),
  resourceCapacities: [],
  attacks: [],
  spellcastingSources: [],
  resistanceProfile: { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] },
  passivePerception: explanation(13),
};

function withCharacter(patch: Partial<Character>): Character {
  return { ...minimalCharacter, ...patch };
}

describe("CharacterSheet", () => {
  it("mostra empty state sem inventar personagem", async () => {
    const { container, unmount } = await mount(<CharacterSheet />);
    expect(container.textContent).toContain("Nenhum personagem selecionado");
    expect(container.textContent).not.toContain("Guerreiro de Teste");
    await unmount();
  });

  it("mapeia PV temporários separadamente, marca 0 PV e expõe origem de bônus", async () => {
    const character = withCharacter({ hp: { current: 0, temp: 4 }, conditions: [{ id: asUuid("55555555-5555-4555-8555-555555555555"), definitionRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("poisoned") }, origin: { kind: "environment", description: "Névoa do pântano" } }] });
    const { container, unmount } = await mount(<CharacterSheet character={character} derived={derived} />);
    expect(container.querySelector('[aria-label="Pontos de vida atuais"]')?.getAttribute("value")).toBe("0");
    expect(container.querySelector('[aria-label="Pontos de vida temporários"]')?.getAttribute("value")).toBe("4");
    expect(container.textContent).toContain("PV zerados");
    expect(container.textContent).toContain("Poisoned");
    await click(container.querySelector("details.provenance summary, details summary") as HTMLElement);
    expect(container.textContent).toContain("valor de teste");
    await unmount();
  });

  it("emite intent contextual de perícia e preserva draft ao atualizar o mesmo ID", async () => {
    const onRoll = vi.fn();
    const onDraftChange = vi.fn();
    const service = { update: vi.fn(() => ({ ok: true as const, value: minimalCharacter })), save: vi.fn(async () => ({ ok: true as const, value: minimalCharacter.revision })), retry: vi.fn(), flush: vi.fn() };
    const mounted = await mount(<CharacterSheet character={minimalCharacter} derived={derived} service={service} onRoll={onRoll} onDraftChange={onDraftChange} />);
    const roll = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Rolar");
    await click(roll as HTMLElement);
    expect(onRoll).toHaveBeenCalledWith(expect.objectContaining({ kind: "skill", skill: "perception", modifier: 3, characterId: minimalCharacter.id }));
    const quickName = mounted.container.querySelector('h1') as HTMLElement;
    expect(quickName.textContent).toContain("Guerreiro de Teste");
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Expandida") as HTMLElement);
    const nameLabel = [...mounted.container.querySelectorAll("label")].find((label) => label.textContent === "Nome") as HTMLLabelElement;
    const expandedName = document.getElementById(nameLabel.htmlFor) as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setValue?.call(expandedName, "Nome em rascunho");
    await fireEvent(expandedName, new Event("input", { bubbles: true }));
    expect(onDraftChange).toHaveBeenCalledWith({ name: "Nome em rascunho" });
    await mounted.rerender(<CharacterSheet character={withCharacter({ name: "Nome recarregado" })} derived={derived} service={service} onRoll={onRoll} onDraftChange={onDraftChange} initialView="expanded" />);
    expect((document.getElementById(nameLabel.htmlFor) as HTMLInputElement).value).toBe("Nome em rascunho");
    await mounted.unmount();
  });
});
