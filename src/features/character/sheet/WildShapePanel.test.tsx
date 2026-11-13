import { describe, expect, it, vi } from "vitest";

import { click, fireEvent, mount } from "@components/ui/testUtils";
import { ok } from "@domain/contracts/errors";
import type { Character } from "@domain/contracts/character";
import { asEntityId, asRulesetId, asUuid } from "@domain/contracts/ids";
import type { BeastDefinition } from "@domain/creatures";
import { asRevision } from "@domain/contracts/versioning";
import { asCentimeters } from "@domain/contracts/primitives";

import { WildShapePanel } from "./WildShapePanel";

const beast: BeastDefinition = {
  id: asEntityId("lobo-cinzento"), name: "Lobo cinzento", creatureType: "beast", size: "medium", armorClass: 13,
  hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: asCentimeters(400), flyCm: asCentimeters(600), swimCm: asCentimeters(300) },
  abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, challengeRating: { numerator: 1, denominator: 4 },
  sourceRefs: [{ sourceId: asRulesetId("manual-apendice-a"), chapter: "Bestiário", printedPage: 320 }],
};

const character = {
  id: asUuid("00000000-0000-4000-8000-00000000c011"),
  revision: asRevision(1),
  rulesetRef: { id: asRulesetId("phb-ptbr-local-2017"), version: "1.0.0" },
  hp: { current: 28, temp: 0 },
} as Character;

describe("WildShapePanel", () => {
  it("exige escolha explícita de besta vista e disposição de equipamento", async () => {
    const onEnter = vi.fn(async () => ok({ result: { status: "success" } as never }));
    const { container, unmount } = await mount(<WildShapePanel character={character} eligibleBeasts={[{ beast, reasons: ["ND compatível com esta ficha."] }]} onEnter={onEnter} />);
    const selects = container.querySelectorAll("select");
    const setSelect = async (select: HTMLSelectElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, value);
      await fireEvent(select, new Event("change", { bubbles: true }));
    };
    const transform = container.querySelector("button[type='submit']")!;
    expect(transform.getAttribute("aria-disabled")).toBe("true");
    await setSelect(selects[0]!, String(beast.id));
    expect(container.textContent).toContain("ND compatível com esta ficha.");
    expect(container.textContent).toContain("voo e natação indisponíveis nesta forma");
    expect(transform.getAttribute("aria-disabled")).toBe("true");
    await setSelect(selects[1]!, "dropped");
    expect(transform.hasAttribute("aria-disabled")).toBe(false);
    await click(transform);
    expect(onEnter).toHaveBeenCalledWith({ rulesetId: character.rulesetRef.id, entityId: beast.id }, "dropped", undefined);
    await unmount();
  });

  it("mostra PV de forma e original guardados após reload", async () => {
    const transformed = {
      ...character,
      transformation: {
        formSnapshot: beast,
        formHp: { current: 5, temp: 2 },
        formMaximumHitPoints: 11,
        originalSnapshot: { ...character, hp: { current: 28, temp: 1 } },
        originalMaximumHitPoints: 34,
      },
    } as Character;
    const { container, unmount } = await mount(<WildShapePanel character={transformed} eligibleBeasts={[]} />);
    expect(container.textContent).toContain("PV da forma");
    expect(container.textContent).toContain("5 / 11 + 2 temporários");
    expect(container.textContent).toContain("PV originais guardados");
    expect(container.textContent).toContain("28 / 34 + 1 temporários");
    expect(container.textContent).toContain("Voltar à forma original");
    await unmount();
  });

  it("exibe e avança minutos de jogo persistidos sem usar relógio real", async () => {
    const transformed = {
      ...character,
      transformation: {
        formSnapshot: beast,
        formHp: { current: 5, temp: 0 },
        formMaximumHitPoints: 11,
        originalSnapshot: { ...character, hp: { current: 28, temp: 0 } },
        originalMaximumHitPoints: 34,
        duration: { kind: "hours", value: 1 },
        elapsedMinutes: 15,
      },
    } as Character;
    const onAdvanceTime = vi.fn(async () => ok({ result: { status: "success", explanations: [{ value: "Tempo avançado." }] } as never }));
    const { container, unmount } = await mount(<WildShapePanel character={transformed} eligibleBeasts={[]} onAdvanceTime={onAdvanceTime} />);
    expect(container.textContent).toContain("45min");
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Avançar 10 min")) as HTMLElement);
    expect(onAdvanceTime).toHaveBeenCalledWith(10);
    await unmount();
  });

  it("encaminha o custo do TurnPanel e impede reentrada quando nenhum custo está disponível", async () => {
    const onEnter = vi.fn(async () => ok({ result: { status: "success" } as never }));
    const { container, unmount } = await mount(<WildShapePanel
      character={character}
      eligibleBeasts={[{ beast, reasons: [] }]}
      actionBudget={{ tracked: true, enterCost: "bonus-action" }}
      onEnter={onEnter}
    />);
    const selects = container.querySelectorAll("select");
    const setSelect = async (select: HTMLSelectElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, value);
      await fireEvent(select, new Event("change", { bubbles: true }));
    };
    await setSelect(selects[0]!, String(beast.id));
    await setSelect(selects[1]!, "dropped");
    await click(container.querySelector("button[type='submit']") as HTMLElement);
    expect(onEnter).toHaveBeenCalledWith({ rulesetId: character.rulesetRef.id, entityId: beast.id }, "dropped", "bonus-action");
    await unmount();

    const blocked = await mount(<WildShapePanel character={character} eligibleBeasts={[{ beast, reasons: [] }]} actionBudget={{ tracked: true }} onEnter={onEnter} />);
    expect(blocked.container.textContent).toContain("nenhuma ação disponível");
    expect(blocked.container.querySelector("button[type='submit']")?.getAttribute("aria-disabled")).toBe("true");
    await blocked.unmount();
  });
});
