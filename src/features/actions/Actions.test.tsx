import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { click, focus, keyDown, mount } from "@components/ui/testUtils";
import { minimalCharacter } from "@domain/contracts/fixtures";
import type { CastPreview } from "@domain/contracts/definitions/spell";
import { asCommandId, asUuid } from "@domain/contracts/ids";
import type { RuleResult } from "@domain/contracts/rules";
import type { ActionCapability } from "./types";
import { Actions } from "./Actions";

const sourceRef = { sourceId: "phb" as never, chapter: "Capítulo de teste", printedPage: 10 };
const characterA = { ...minimalCharacter, id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), name: "Alda" };
const characterB = { ...minimalCharacter, id: asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), name: "Borin" };

function preview(message = "Regra validada"): RuleResult {
  return { status: "success", nextState: characterA, effects: [], explanations: [{ value: message, contributions: [] }], sourceRefs: [sourceRef] };
}

function capability(id: string, kind: ActionCapability["kind"], extra: Partial<ActionCapability> = {}): ActionCapability {
  return { id, commandId: asCommandId(`command-${id}`), kind, label: id, preview: preview(), sourceRefs: [sourceRef], ...extra };
}

function button(container: HTMLElement, text: string): HTMLButtonElement {
  return [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(text)) as HTMLButtonElement;
}

/** Abre o modal da ação rápida ("Ataque", "Magias", "Descanso curto"…) que lista as capacidades. */
async function openQuickAction(container: HTMLElement, title: string): Promise<void> {
  const card = [...container.querySelectorAll("button")].find((candidate) => candidate.querySelector("strong")?.textContent === title);
  await click(card as HTMLElement);
}

async function reviewAndConfirm(container: HTMLElement, label: string, cardIndex = 0): Promise<void> {
  const cards = [...container.querySelectorAll("article")];
  await click(cards[cardIndex]?.querySelector("button") as HTMLElement);
  expect(container.textContent).toContain(label);
  await click(button(container, "Confirmar execução"));
}

/**
 * Digita num `<input>` controlado pelo React: atribuição direta de `.value` não passa pelo
 * setter que o React monkey-patcha para rastrear o valor anterior, então o evento "input"
 * disparado a seguir não aciona `onChange`. Usar o setter nativo (via o protótipo, antes do
 * patch) contorna isso — é o mesmo truque usado por bibliotecas de teste de React.
 */
async function typeValue(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("Actions", () => {
  it("separa ataque e dano e não envia duas vezes o mesmo commandId", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Ataque", "attack"), capability("Dano", "damage")]} availableActions={["action"]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Ataque");
    await reviewAndConfirm(mounted.container, "Ataque");
    await click(button(mounted.container, "Confirmar execução"));
    await reviewAndConfirm(mounted.container, "Dano", 1);
    expect(onIntent).toHaveBeenCalledTimes(2);
    expect(onIntent.mock.calls.map(([intent]) => intent.kind)).toEqual(["attack", "damage"]);
    await mounted.unmount();
  });

  it("expõe substituição de concentração antes do commit", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Concentração", "concentration", { costs: [{ label: "Concentração ativa", value: "substituir explicitamente" }], effectSummary: ["Encerra o efeito anterior após confirmação"] })]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("substituir explicitamente");
    expect(mounted.container.textContent).toContain("Encerra o efeito anterior");
    await click(button(mounted.container, "Confirmar execução"));
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ kind: "concentration", characterId: characterA.id }));
    await mounted.unmount();
  });

  it("renderiza custo e pendência de CastPreview sem confirmar", async () => {
    const castPreview: CastPreview = { slotCost: { poolId: asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), slotLevel: 1 }, resourceCosts: [], actionCost: { kind: "action" }, componentsConsumed: [], interventionsRequired: [{ reason: "Escolha o alvo no dispatcher." }], sourceRefs: [sourceRef] };
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Magia", "spell", { preview: undefined })]} previews={{ Magia: castPreview }} onIntent={vi.fn()} />);
    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("Espaço");
    expect(mounted.container.textContent).toContain("Escolha o alvo no dispatcher.");
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    await mounted.unmount();
  });

  it("bloqueia recurso zerado e opção não suportada", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Recurso 0", "resource", { costs: [{ label: "Usos", remaining: 0 }] }), capability("Opção futura", "item", { status: "unsupported" })]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("esgotado");
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    await click(button(mounted.container, "Cancelar"));
    await click(mounted.container.querySelector('[role="dialog"] button[aria-label="Fechar"]') as HTMLElement);
    await openQuickAction(mounted.container, "Ataque");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("Opção futura");
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    expect(onIntent).not.toHaveBeenCalled();
    await mounted.unmount();
  });

  it("cancela descanso sem intent e mostra falha de commit", async () => {
    const onIntent = vi.fn((): RuleResult => ({ status: "rejected", errors: [{ code: "invalid-context", message: "Sessão mudou antes do commit." }], sourceRefs: [sourceRef] }));
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Descanso curto", "rest")]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Descanso curto");
    await click(button(mounted.container, "Revisar capacidade"));
    await click(button(mounted.container, "Cancelar"));
    expect(onIntent).not.toHaveBeenCalled();
    expect(mounted.container.textContent).toContain("Revisão aguardando seleção");
    await reviewAndConfirm(mounted.container, "Descanso curto");
    expect(mounted.container.textContent).toContain("Sessão mudou antes do commit.");
    await mounted.unmount();
  });

  it("limpa seleção e commandIds quando troca de personagem", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Ataque", "attack")]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Ataque");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("Confirmar execução");
    await mounted.rerender(<Actions character={characterB} capabilities={[capability("Ataque", "attack")] } onIntent={onIntent} />);
    // Troca de personagem fecha o modal e zera a seleção.
    expect(mounted.container.querySelector('[role="dialog"]')).toBeNull();
    await openQuickAction(mounted.container, "Ataque");
    expect(mounted.container.textContent).toContain("Revisão aguardando seleção");
    await mounted.unmount();
  });

  it("mantém revisão e confirmação alcançáveis por teclado", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Ataque", "attack")]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Ataque");
    const review = button(mounted.container, "Revisar capacidade");
    await focus(review);
    expect(document.activeElement).toBe(review);
    await keyDown(review, "Enter");
    await click(review);
    const confirm = button(mounted.container, "Confirmar execução");
    await focus(confirm);
    expect(document.activeElement).toBe(confirm);
    await mounted.unmount();
  });

  it("dano/cura manual: mostra quantidade com default 5 e inclui o valor digitado no ActionIntent", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Dano manual", "damage", { inputKind: "amount", inputDefault: 5 })]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Ataque");
    await click(button(mounted.container, "Revisar capacidade"));
    const input = mounted.container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("5"); // pré-preenchido com o default da capacidade
    const label = [...mounted.container.querySelectorAll("label")].find((candidate) => candidate.textContent?.includes("Quantidade"));
    expect(label).toBeDefined(); // rótulo permanente, não só placeholder

    await typeValue(input, "12");
    await click(button(mounted.container, "Confirmar execução"));
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ value: 12 }));
    await mounted.unmount();
  });

  it("dano/cura manual: sem digitar nada, confirma com o valor padrão da capacidade", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Cura manual", "damage", { inputKind: "amount", inputDefault: 5 })]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Ataque");
    await reviewAndConfirm(mounted.container, "Cura manual");
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ value: 5 }));
    await mounted.unmount();
  });

  it("ataque: exige CA do alvo (sem default) antes de habilitar a confirmação e inclui o valor no intent", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Ataque com CA", "attack", { inputKind: "target-armor-class" })]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Ataque");
    await click(button(mounted.container, "Revisar capacidade"));

    const input = mounted.container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.value).toBe(""); // nunca inventa uma CA
    const label = [...mounted.container.querySelectorAll("label")].find((candidate) => candidate.textContent?.includes("CA do alvo"));
    expect(label).toBeDefined();

    const confirmBeforeInput = button(mounted.container, "Confirmar execução");
    expect(confirmBeforeInput.getAttribute("aria-disabled")).toBe("true");
    await click(confirmBeforeInput);
    expect(onIntent).not.toHaveBeenCalled();

    await typeValue(input, "14");
    const confirmAfterInput = button(mounted.container, "Confirmar execução");
    expect(confirmAfterInput.getAttribute("aria-disabled")).toBeNull();
    await click(confirmAfterInput);
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ targetArmorClass: 14 }));
    await mounted.unmount();
  });

  it("dados: rola o dado escolhido sem abrir a mesa e mostra o último resultado com crítico", async () => {
    const roll = vi.fn();
    const openTable = vi.fn();
    const last = { id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), expression: { quantity: 1, faces: 20 as const, modifier: 0, mode: "normal" as const }, purpose: "skill-check" as const, label: "Teste de perícia (Sobrevivência)", timestamp: new Date().toISOString() as never, rawDice: [20], selectedIndexes: [0], discardedIndexes: [], subtotal: 20, modifier: 0, total: 20, rngVersion: "test" };
    const mounted = await mount(<Actions character={characterA} dice={{ history: [last], lastResult: last, roll, openTable }} />);
    expect(mounted.container.textContent).toContain("Último resultado");
    expect(mounted.container.textContent).toContain("Sucesso Crítico!");
    expect(mounted.container.textContent).toContain("Teste de perícia (Sobrevivência)");
    await click(mounted.container.querySelector('button[aria-label="Rolar d8"]') as HTMLElement);
    expect(roll).toHaveBeenCalledWith({ faces: 8, purpose: "free" });
    await click(mounted.container.querySelector('button[aria-label="Abrir mesa de dados e histórico"]') as HTMLElement);
    expect(openTable).toHaveBeenCalled();
    await mounted.unmount();
  });

  it("teste de perícia e iniciativa rolam 1d20 com o modificador da ficha e um rótulo", async () => {
    const roll = vi.fn();
    const explanation = (value: number) => ({ value, contributions: [] });
    const derived = {
      characterId: characterA.id, characterRevision: characterA.revision, rulesetRef: characterA.rulesetRef,
      abilityScores: [], skills: [{ skill: "survival" as const, modifier: explanation(4), proficient: true, expertise: false, passiveScore: explanation(14) }],
      savingThrows: [], armorClass: explanation(12), initiative: explanation(2), speedsCm: [], proficiencyBonus: explanation(2),
      hitPointsMax: explanation(10), resourceCapacities: [], attacks: [], spellcastingSources: [],
      resistanceProfile: { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] }, passivePerception: explanation(12),
    } as never;
    const mounted = await mount(<Actions character={characterA} derived={derived} dice={{ history: [], roll }} />);
    await openQuickAction(mounted.container, "Teste de perícia");
    await click(mounted.container.querySelector('[role="dialog"] button[aria-label^="Rolar Teste de perícia (Sobrevivência)"]') as HTMLElement);
    expect(roll).toHaveBeenCalledWith({ faces: 20, modifier: 4, purpose: "skill-check", label: "Teste de perícia (Sobrevivência)" });
    await openQuickAction(mounted.container, "Iniciativa");
    expect(roll).toHaveBeenLastCalledWith({ faces: 20, modifier: 2, purpose: "initiative", label: "Iniciativa" });
    await mounted.unmount();
  });

  it("prévia sem fontes não derruba a revisão", async () => {
    const semFontes = { status: "success", nextState: characterA, effects: [], explanations: [] } as unknown as RuleResult;
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Descanso longo", "rest", { preview: semFontes, sourceRefs: [undefined as never] })]} onIntent={vi.fn()} />);
    await openQuickAction(mounted.container, "Descanso curto");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("Confirmar execução");
    await mounted.unmount();
  });
});
