import { describe, expect, it, vi } from "vitest";
import { click, fireEvent, mount } from "@components/ui/testUtils";
import { asEntityId, asRulesetId } from "@domain/contracts/ids";
import { suggestCreatureStatBlock, type CreatureStatBlock } from "@domain/creatures";
import { asCentimeters } from "@domain/contracts/primitives";
import { StatBlockEditor } from "./StatBlockEditor";

describe("StatBlockEditor", () => {
  it("permite editar campos avançados integrais e bloqueia JSON inválido", async () => {
    const onChange = vi.fn();
    const onValidityChange = vi.fn();
    const { container, unmount } = await mount(<StatBlockEditor name="Quimera de teste" onChange={onChange} onValidityChange={onValidityChange} />);
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar bloco estatístico"))!);
    const editor = container.querySelector('textarea[aria-describedby="stat-block-advanced-help"]')!;
    const advanced = {
      isSwarm: true,
      traits: [{ id: "trait-night", name: "Visão noturna", description: "Enxerga no escuro." }],
      sourceRefs: [{ sourceId: "manual-test", chapter: "Fonte local", printedPage: 2 }],
    };
    const setText = async (value: string) => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(editor, value);
      await fireEvent(editor, new Event("input", { bubbles: true }));
    };
    await setText(JSON.stringify(advanced));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining(advanced));
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    const armorClass = [...container.querySelectorAll("label")].find((label) => /^CA( |$)/.test(label.textContent?.trim() ?? ""))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(armorClass, "14");
    await fireEvent(armorClass, new Event("input", { bubbles: true }));
    await setText(JSON.stringify({ isSwarm: true, sourceRefs: advanced.sourceRefs }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ armorClass: 14, isSwarm: true }));
    expect(onChange.mock.lastCall?.[0]).not.toHaveProperty("traits");
    await setText("{");
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
    expect(container.textContent).toContain("JSON");
    await unmount();
  });

  it("edita traços, ações e idiomas com campos guiados", async () => {
    const onChange = vi.fn();
    const { container, unmount } = await mount(<StatBlockEditor name="Coruja cinzenta" onChange={onChange} />);
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar bloco estatístico"))!);
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar traço"))!);
    const traitName = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Nome do traço"))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(traitName, "Visão no escuro");
    await fireEvent(traitName, new Event("input", { bubbles: true }));
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar ação ou ataque"))!);
    const actionName = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Nome da ação"))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(actionName, "Garras");
    await fireEvent(actionName, new Event("input", { bubbles: true }));
    const languages = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Idiomas"))!.querySelector("textarea")!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(languages, "Comum\nÉlfico");
    await fireEvent(languages, new Event("input", { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      traits: [expect.objectContaining({ name: "Visão no escuro" })],
      actions: [expect.objectContaining({ name: "Garras" })],
      languages: ["Comum", "Élfico"],
    }));
    await unmount();
  });

  it("usa a sugestão determinística de domínio e mantém o tipo de proposta como besta", async () => {
    const template: CreatureStatBlock = {
      id: asEntityId("lobo-modelo"), name: "Lobo", creatureType: "beast", size: "medium", armorClass: 13,
      hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: asCentimeters(400) },
      abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, challengeRating: { numerator: 1, denominator: 4 },
      sourceRefs: [{ sourceId: asRulesetId("manual-local"), chapter: "Apêndice A", printedPage: 317 }],
    };
    const onChange = vi.fn();
    const onSuggest = (input: Omit<Parameters<typeof suggestCreatureStatBlock>[0], "catalog">) => suggestCreatureStatBlock({ ...input, catalog: [template] });
    const { container, unmount } = await mount(<StatBlockEditor name="Lobo da neve" onChange={onChange} creatureTypeMode="beast-only" onSuggest={onSuggest} />);
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar bloco estatístico"))!);
    const name = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Nome sugerido"))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "Lobo da neve");
    await fireEvent(name, new Event("input", { bubbles: true }));
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Gerar sugestão pelo catálogo"))!);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Lobo da neve", creatureType: "beast", hitPoints: template.hitPoints }));
    expect(container.textContent).toContain("requer revisão do mestre");
    expect((container.querySelector('input[aria-label="Tipo de criatura: besta"]') as HTMLInputElement)?.value).toBe("Besta");
    expect(container.textContent).toContain("Lobo");
    await unmount();
  });
  it("mostra o modificador de cada atributo ao vivo e o ND como fração", async () => {
    const onChange = vi.fn();
    const { container, unmount } = await mount(<StatBlockEditor name="Urso" onChange={onChange} />);
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar bloco estatístico"))!);
    const strength = container.querySelector<HTMLInputElement>("input[id$='-str']")!;
    const modifierOf = (input: HTMLInputElement) => document.getElementById(input.getAttribute("aria-describedby")!)!.textContent;
    expect(modifierOf(strength)).toContain("+0");
    for (const [score, expected] of [["18", "+4"], ["9", "−1"], ["1", "−5"], ["20", "+5"]] as const) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(strength, score);
      await fireEvent(strength, new Event("input", { bubbles: true }));
      expect(modifierOf(container.querySelector<HTMLInputElement>("input[id$='-str']")!)).toContain(expected);
    }
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ abilityScores: expect.objectContaining({ str: 20 }) }));
    // A dica explica o que cada sigla significa sem entrar no nome acessível do campo.
    expect(container.textContent).toContain("ND (nível de desafio)");
    expect(container.textContent).toContain("CA (classe de armadura)");
    expect(container.textContent).toContain("PV médios (pontos de vida)");
    expect(container.textContent).toContain("ND 0");
    await unmount();
  });
});
