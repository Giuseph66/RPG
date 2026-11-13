import { describe, expect, it } from "vitest";
import type { CreatureStatBlock } from "@domain/creatures";
import { mount } from "@components/ui/testUtils";
import { asCentimeters } from "@domain/contracts/primitives";
import { StatBlock } from "./StatBlock";

const syntheticBeast: CreatureStatBlock = {
  id: "synthetic-wolf" as CreatureStatBlock["id"],
  name: "Lobo de teste",
  creatureType: "beast",
  size: "medium",
  tags: ["teste", "monster-manual-appendix-a"],
  armorClass: 13,
  hitPoints: { average: 11, hitDice: "2d8+2" },
  speeds: { walkCm: asCentimeters(4000), swimCm: asCentimeters(2000), flyCm: asCentimeters(6000), sourceText: "Escavação 3 m" },
  abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
  challengeRating: { numerator: 1, denominator: 4 },
  sourceRefs: [{ sourceId: "manual-dos-monstros-apendice-a" as never, chapter: "Apêndice A: Criaturas Diversas", printedPage: 1 }],
  bonusActions: [{ id: "bonus", name: "Investida", description: "Move-se até o alvo." }],
  reactions: [{ id: "reaction", name: "Esquiva", description: "Afasta-se do perigo." }],
  legendaryActions: { actionsPerTurn: 2, actions: [{ id: "legend", name: "Uivo", description: "Emite um uivo." }] },
  lairActions: [{ id: "lair", name: "Névoa", description: "A névoa cobre a clareira." }],
  regionalEffects: [{ id: "regional", name: "Rastros", description: "Rastros aparecem no bosque." }],
  additionalInfo: { habitat: "Bosque de teste", equipment: "Coleira de couro" },
  sourceText: { "Nota da fonte": "Valor literal de teste" },
};

describe("StatBlock", () => {
  it("renderiza o bloco suplementar sem perder campos e sinaliza movimento indisponível", async () => {
    const { container, unmount } = await mount(<StatBlock creature={syntheticBeast} hitPointsOverride={{ current: 8, maximum: 11 }} hiddenSpeeds={["flyCm", "swimCm"]} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Lobo de teste");
    expect(text).toContain("8/11 (2d8+2)");
    expect(text).toContain("Ações bônus");
    expect(text).toContain("Investida");
    expect(text).toContain("Reações");
    expect(text).toContain("Ações lendárias (2 por turno)");
    expect(text).toContain("Ações de covil");
    expect(text).toContain("Efeitos regionais");
    expect(text).toContain("Coleira de couro");
    expect(text).toContain("Valor literal de teste");
    expect(text).toContain("Deslocamento: 40 m");
    expect(text).not.toContain("Deslocamento Deslocamento:");
    expect(text).toContain("Apêndice A: Criaturas Diversas");
    expect(text).not.toContain("monster-manual-appendix-a");
    expect(text).not.toContain("Voo: 60 m");
    expect(text).not.toContain("Natação: 20 m");
    expect(text).toContain("voo e natação indisponíveis nesta forma");
    await unmount();
  });
});
