import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { click, focus, keyDown, mount } from "@components/ui/testUtils";
import { minimalCharacter } from "@domain/contracts/fixtures";
import type { CastPreview, SpellDefinition } from "@domain/contracts/definitions/spell";
import { asCommandId, asEntityId, asUuid } from "@domain/contracts/ids";
import type { RuleResult } from "@domain/contracts/rules";
import { previewCast } from "@domain/spells";
import type { ActionCapability, ActionIntent } from "./types";
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

function realConcentrationPreview(): RuleResult {
  const spellId = asEntityId("fey-summon");
  const spellRef = { rulesetId: characterA.rulesetRef.id, entityId: spellId };
  const poolId = asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd");
  const sourceId = asUuid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee");
  const spell: SpellDefinition = {
    id: spellId, name: "Invocar Feérico", tags: [], sourceRefs: [sourceRef], level: 1, school: "conjuration",
    castingTime: { kind: "action" }, range: { kind: "special" }, components: { verbal: false, somatic: false },
    duration: { kind: "minutes", amount: 1, unit: "minute", endTriggers: [] }, concentration: true, ritual: false,
    classes: [asEntityId("ranger")], targetType: { type: "creature", restrictions: [], visibilityRequired: false },
    attackType: "none", damage: [], healing: [], higherLevels: { kind: "none" },
    effects: [{ kind: "summon", description: "Invocação assistida." }], automationStatus: "assisted", pendingDecisionIds: [],
  };
  const character = {
    ...characterA,
    castingSources: [{
      id: sourceId,
      grantingRef: { rulesetId: characterA.rulesetRef.id, entityId: asEntityId("fey-reinforcements") },
      sourceKind: "feature" as const,
      spellListClassId: asEntityId("ranger"),
      ability: "wis" as const,
      knownSpellRefs: [spellRef], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [poolId], usesSpellSlots: true,
      featureSpellOverrides: [{ spellRef, concentrationAlternativeMinutes: 1 }],
    }],
    spellSlots: [{ poolId, kind: "spellcasting" as const, slotLevel: 1, spent: 0 }],
    concentration: {
      effectId: asUuid("ffffffff-ffff-4fff-8fff-ffffffffffff"),
      sourceRef: { rulesetId: characterA.rulesetRef.id, entityId: asEntityId("old-concentration") },
      duration: { kind: "instant" as const }, pendingSaveIds: [],
    },
  };
  return previewCast(character, spell, {
    commandId: asCommandId("real-preview-reinforcement"), characterId: character.id, expectedRevision: character.revision,
    spellRef, castingSourceId: sourceId, mode: "normal", resourcePoolId: poolId, slotLevel: 1,
    targetContext: { targetIds: [] }, componentContext: { materialProvided: false, focusUsed: false }, choices: [],
  }, { classId: asEntityId("ranger"), availableActions: ["action"] });
}

function realTargetMaterialPreview(hasTarget = false): RuleResult {
  const spellId = asEntityId("faerie-fire-test");
  const spellRef = { rulesetId: characterA.rulesetRef.id, entityId: spellId };
  const poolId = asUuid("abababab-abab-4bab-8bab-abababababab");
  const sourceId = asUuid("bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc");
  const spell: SpellDefinition = {
    id: spellId, name: "Fogo das Fadas", tags: [], sourceRefs: [sourceRef], level: 1, school: "evocation",
    castingTime: { kind: "action" }, range: { kind: "special" },
    components: { verbal: false, somatic: false, material: { descriptionSummary: "pó colorido", consumed: false } },
    duration: { kind: "rounds", amount: 1, unit: "round", endTriggers: [] }, concentration: false, ritual: false,
    classes: [asEntityId("ranger")], targetType: { type: "creature", count: 1, restrictions: [], visibilityRequired: true },
    attackType: "none", damage: [], healing: [], higherLevels: { kind: "none" }, effects: [], automationStatus: "assisted", pendingDecisionIds: [],
  };
  const character = {
    ...characterA,
    castingSources: [{
      id: sourceId,
      grantingRef: { rulesetId: characterA.rulesetRef.id, entityId: asEntityId("fairy") },
      sourceKind: "race" as const,
      spellListClassId: asEntityId("ranger"),
      ability: "wis" as const,
      knownSpellRefs: [spellRef], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [poolId], usesSpellSlots: true,
    }],
    spellSlots: [{ poolId, kind: "spellcasting" as const, slotLevel: 1, spent: 0 }],
  };
  return previewCast(character, spell, {
    commandId: asCommandId(`real-target-material-${hasTarget}`), characterId: character.id, expectedRevision: character.revision,
    spellRef, castingSourceId: sourceId, mode: "normal", resourcePoolId: poolId, slotLevel: 1,
    targetContext: { targetIds: hasTarget ? [character.id] : [] }, componentContext: { materialProvided: false, focusUsed: false }, choices: [],
  }, { classId: asEntityId("ranger"), availableActions: ["action"] });
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
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const onIntent = vi.fn((intent: ActionIntent) => { void intent; return pending; });
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Ataque", "attack"), capability("Dano", "damage")]} availableActions={["action"]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Ataque");
    await reviewAndConfirm(mounted.container, "Ataque");
    await click(button(mounted.container, "Confirmar execução"));
    expect(onIntent).toHaveBeenCalledTimes(1);
    release();
    await act(async () => { await pending; });
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

  it("mantém a alternativa Feérica de 1 minuto explícita e exibe a explicação devolvida pelo domínio", async () => {
    const option = { kind: "drop-concentration" as const, durationMinutes: 1 as const };
    const explanation = "Registre a criatura; encerre a invocação manualmente após 1 minuto.";
    const onIntent = vi.fn(() => ({ ...preview(explanation), explanations: [{ value: explanation, contributions: [] }] }));
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Reforço Feérico", "spell", {
      featureCastingOptions: [{ ...option, label: "Sem concentração (assistido; duração manual de 1 minuto)" }],
    })]} onIntent={onIntent} />);

    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    const checkbox = mounted.container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);
    expect(mounted.container.textContent).toContain("Sua concentração atual permanece ativa.");

    await click(button(mounted.container, "Cancelar"));
    expect(onIntent).not.toHaveBeenCalled();
    await click(button(mounted.container, "Revisar capacidade"));
    await click(mounted.container.querySelector('input[type="checkbox"]') as HTMLElement);
    await click(button(mounted.container, "Confirmar execução"));

    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ featureCastingOption: option }));
    expect(mounted.container.textContent).toContain("Registre a criatura; encerre a invocação manualmente após 1 minuto.");
    await mounted.unmount();
  });

  it("não envia a opção de conjuração especial quando a checkbox fica desmarcada", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Reforço Feérico", "spell", {
      featureCastingOptions: [{ kind: "drop-concentration", durationMinutes: 1, label: "Sem concentração (assistido; duração manual de 1 minuto)" }],
    })]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Magias");
    await reviewAndConfirm(mounted.container, "Reforço Feérico");
    expect(onIntent.mock.calls[0]?.[0]).not.toHaveProperty("featureCastingOption");
    await mounted.unmount();
  });

  it("só resolve a substituição de concentração do preview normal quando a variante de 1 minuto é marcada", async () => {
    const option = { kind: "drop-concentration" as const, durationMinutes: 1 as const };
    const replacementReason = "Confirme explicitamente a substituição da concentração ativa.";
    const needsInput = realConcentrationPreview();
    expect(needsInput.status).toBe("needsInput");
    if (needsInput.status !== "needsInput") throw new Error("esperava preview real pendente de substituição da concentração");
    expect(needsInput.requests.map((request) => request.reason)).toContain(replacementReason);
    const onIntent = vi.fn(() => preview());
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Reforço Feérico", "spell", {
      preview: needsInput,
      featureCastingOptions: [{ ...option, label: "Sem concentração (assistido; duração manual de 1 minuto)" }],
    })]} onIntent={onIntent} />);

    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain(replacementReason);
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    await click(mounted.container.querySelector('input[type="checkbox"]') as HTMLElement);
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).not.toBe("true");
    await click(button(mounted.container, "Confirmar execução"));
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ featureCastingOption: option }));
    await mounted.unmount();
  });

  it("renderiza custo e pendência de CastPreview sem confirmar", async () => {
    const castPreview: CastPreview = { slotCost: { poolId: asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), slotLevel: 1 }, resourceCosts: [], actionCost: { kind: "action" }, componentsConsumed: [], interventionsRequired: [{ reason: "Escolha o alvo no dispatcher." }], sourceRefs: [sourceRef] };
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Magia", "spell", { preview: undefined })]} previews={{ Magia: castPreview }} onIntent={vi.fn()} />);
    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("Espaço");
    expect(mounted.container.textContent).toContain("Ação");
    expect(mounted.container.textContent).not.toContain("action");
    expect(mounted.container.textContent).toContain("Escolha o alvo no dispatcher.");
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    await mounted.unmount();
  });

  it("coleta alvo visível e componente material antes de liberar uma magia pendente conhecida", async () => {
    const targetReason = "Informe explicitamente ao menos um alvo; o motor não escolhe alvos.";
    const materialReason = "Componente material ou foco permitido não foi fornecido.";
    const rejectedPreview = realTargetMaterialPreview();
    const materialPreview = realTargetMaterialPreview(true);
    expect(rejectedPreview.status).toBe("rejected");
    if (rejectedPreview.status !== "rejected") throw new Error("esperava rejeição real por falta de alvo");
    expect(rejectedPreview.errors.map((error) => error.message)).toContain(targetReason);
    expect(materialPreview.status).toBe("rejected");
    if (materialPreview.status !== "rejected") throw new Error("esperava rejeição real por falta de componente material");
    expect(materialPreview.errors.map((error) => error.message)).toContain(materialReason);
    const onIntent = vi.fn(() => preview());
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Fogo das Fadas", "spell", {
      preview: rejectedPreview,
      spellTargeting: { type: "creature", count: 1, restrictions: [], visibilityRequired: true },
      spellRequiresMaterial: true,
      spellAllowsFocus: false,
      spellMaterialRequiresTrackedItem: false,
    })]} onIntent={onIntent} />);

    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    expect(mounted.container.querySelector('input[type="radio"]')).toBeNull();

    let checkboxes = [...mounted.container.querySelectorAll('input[type="checkbox"]')];
    await click(checkboxes[0] as HTMLElement);
    checkboxes = [...mounted.container.querySelectorAll('input[type="checkbox"]')];
    await click(checkboxes[1] as HTMLElement);
    checkboxes = [...mounted.container.querySelectorAll('input[type="checkbox"]')];
    await click(checkboxes[2] as HTMLElement);
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).not.toBe("true");
    await click(button(mounted.container, "Confirmar execução"));

    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({
      spellTargetContext: { targetIds: [characterA.id] },
      spellComponentContext: { materialProvided: true, focusUsed: false },
    }));
    await mounted.unmount();
  });

  it("mantém pendência de conjuração desconhecida bloqueada mesmo com alvo escolhido", async () => {
    const castPreview: CastPreview = {
      resourceCosts: [], actionCost: { kind: "action" }, componentsConsumed: [],
      interventionsRequired: [{ reason: "Confirme que a criatura pode vocalizar o componente verbal." }], sourceRefs: [sourceRef],
    };
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Magia assistida", "spell", {
      preview: castPreview,
      spellTargeting: { type: "creature", count: 1, restrictions: [], visibilityRequired: false },
    })]} onIntent={onIntent} />);

    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    await click(mounted.container.querySelector('input[type="checkbox"]') as HTMLElement);
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    await click(button(mounted.container, "Confirmar execução"));
    expect(onIntent).not.toHaveBeenCalled();
    await mounted.unmount();
  });

  it("não transforma componente rastreado em declaração simples sem seleção de inventário", async () => {
    const materialReason = "Componente material ou foco permitido não foi fornecido.";
    const rejectedPreview: RuleResult = { status: "rejected", errors: [{ code: "invalid-context", message: materialReason }], sourceRefs: [sourceRef] };
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Componente custoso", "spell", {
      preview: rejectedPreview,
      spellRequiresMaterial: true,
      spellMaterialRequiresTrackedItem: true,
    })]} onIntent={onIntent} />);

    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("seleção ainda não disponível");
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    await mounted.unmount();
  });

  it("envia apenas o ponto de área digitado explicitamente", async () => {
    const pointReason = "Informe o ponto de origem da área; o motor não escolhe posição.";
    const rejectedPreview: RuleResult = { status: "rejected", errors: [{ code: "invalid-context", message: pointReason }], sourceRefs: [sourceRef] };
    const onIntent = vi.fn(() => preview());
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Magia de área", "spell", {
      preview: rejectedPreview,
      spellTargeting: { type: "point", restrictions: [], visibilityRequired: false },
    })]} onIntent={onIntent} />);

    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    const coordinates = [...mounted.container.querySelectorAll('input[type="number"]')];
    await typeValue(coordinates[0] as HTMLInputElement, "125");
    await typeValue(coordinates[1] as HTMLInputElement, "250");
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).not.toBe("true");
    await click(button(mounted.container, "Confirmar execução"));
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({
      spellTargetContext: { targetIds: [], pointCm: { x: 125, y: 250 } },
    }));
    await mounted.unmount();
  });

  it("oferece foco somente quando a fonte permite e envia a escolha do usuário", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Aumentar/Reduzir", "spell", {
      spellRequiresMaterial: true,
      spellAllowsFocus: true,
      spellMaterialRequiresTrackedItem: false,
    })]} onIntent={onIntent} />);

    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    const focusChoice = [...mounted.container.querySelectorAll("label")].find((label) => label.textContent?.includes("foco permitido"));
    expect(focusChoice).toBeTruthy();
    await click(focusChoice as HTMLElement);
    await click(button(mounted.container, "Confirmar execução"));
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({
      spellComponentContext: { materialProvided: false, focusUsed: true },
    }));
    await mounted.unmount();
  });

  it("mantém o uso gratuito e o espaço como capacidades independentes", async () => {
    const onIntent = vi.fn();
    const mounted = await mount(<Actions character={characterA} capabilities={[
      capability("spell:fada:feature", "spell", { label: "Fogo das Fadas · uso gratuito", costs: [{ label: "Uso gratuito", remaining: 0 }] }),
      capability("spell:fada:slot", "spell", { label: "Fogo das Fadas · espaço nível 1", costs: [{ label: "Espaço nível 1", value: "1º nível" }] }),
    ]} onIntent={onIntent} />);

    await openQuickAction(mounted.container, "Magias");
    let cards = [...mounted.container.querySelectorAll("article")];
    await click(cards[0]?.querySelector("button") as HTMLElement);
    expect(mounted.container.textContent).toContain("esgotado");
    expect(button(mounted.container, "Confirmar execução").getAttribute("aria-disabled")).toBe("true");
    await click(button(mounted.container, "Cancelar"));
    cards = [...mounted.container.querySelectorAll("article")];
    await click(cards[1]?.querySelector("button") as HTMLElement);
    await click(button(mounted.container, "Confirmar execução"));
    expect(onIntent).toHaveBeenCalledWith(expect.objectContaining({ capabilityId: "spell:fada:slot" }));
    await mounted.unmount();
  });

  it("rola a cura na revisão sem enviar intent nem alterar a ficha", async () => {
    const roll = vi.fn();
    const onIntent = vi.fn();
    const mounted = await mount(<Actions
      character={characterA}
      spellRolls={[{ id: "cure-wounds", name: "Curar Ferimentos", level: 1, effect: { quantity: 1, faces: 8, modifier: 3, kind: "healing" } }]}
      dice={{ history: [], roll }}
      capabilities={[capability("Curar Ferimentos", "spell")]}
      onIntent={onIntent}
    />);
    await openQuickAction(mounted.container, "Magias");
    await click(mounted.container.querySelector('button[aria-label="Rolar Cura 1d8+3"]') as HTMLElement);
    expect(roll).toHaveBeenCalledWith({ faces: 8, modifier: 3, purpose: "free", label: "Cura (Curar Ferimentos)" });
    await click(button(mounted.container, "Revisar capacidade"));
    await click(button(mounted.container, "Cancelar"));
    expect(onIntent).not.toHaveBeenCalled();
    await mounted.unmount();
  });

  it("rola o dano do ataque como dado informativo sem aplicar dano na ficha", async () => {
    const roll = vi.fn();
    const onIntent = vi.fn();
    const mounted = await mount(<Actions
      character={characterA}
      attackRolls={[{ id: "rapier", name: "Rapieira", attackBonus: 5, damage: { quantity: 1, faces: 8, modifier: 3 } }]}
      dice={{ history: [], roll }}
      capabilities={[capability("Ataque", "attack")]}
      onIntent={onIntent}
    />);
    await openQuickAction(mounted.container, "Ataque");
    await click(mounted.container.querySelector('button[aria-label="Rolar Dano 1d8+3"]') as HTMLElement);
    expect(roll).toHaveBeenCalledWith({ faces: 8, modifier: 3, purpose: "free", label: "Dano (Rapieira)" });
    expect(onIntent).not.toHaveBeenCalled();
    await mounted.unmount();
  });

  it("cancelar a revisão de cura não envia intent e a confirmação bem-sucedida fecha a revisão", async () => {
    const onIntent = vi.fn(() => preview());
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Curar Ferimentos", "spell", { effectSummary: ["Cura 1d8 + modificador de CAR na própria ficha, limitada ao máximo de PV."] })]} onIntent={onIntent} />);
    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("Cura 1d8 + modificador de CAR");
    await click(button(mounted.container, "Cancelar"));
    expect(onIntent).not.toHaveBeenCalled();
    expect(mounted.container.textContent).toContain("Revisão aguardando seleção");

    await click(button(mounted.container, "Revisar capacidade"));
    await click(button(mounted.container, "Confirmar execução"));
    expect(onIntent).toHaveBeenCalledTimes(1);
    expect([...mounted.container.querySelectorAll("button")].some((candidate) => candidate.textContent?.includes("Confirmar execução"))).toBe(false);
    expect(mounted.container.textContent).toContain("Aplicado na ficha.");
    expect(mounted.container.textContent).not.toContain("Sem efeito automático na ficha.");
    await mounted.unmount();
  });

  it("traduz a ação indisponível na revisão", async () => {
    const mounted = await mount(<Actions character={characterA} capabilities={[capability("Magia bônus", "spell", { actionCost: "bonus-action" })]} availableActions={["action"]} onIntent={vi.fn()} />);
    await openQuickAction(mounted.container, "Magias");
    await click(button(mounted.container, "Revisar capacidade"));
    expect(mounted.container.textContent).toContain("Ação indisponível: Ação bônus.");
    expect(mounted.container.textContent).not.toContain("bonus-action");
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
