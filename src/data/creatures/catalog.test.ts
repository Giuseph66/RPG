import { describe, expect, it } from "vitest";
import { isCreatureStatBlock } from "@domain/creatures";
import { appendixACreatures } from "./catalog";

describe("Apêndice A: catálogo de criaturas", () => {
  it("publica os 95 blocos com identificadores únicos e fonte por página", () => {
    expect(appendixACreatures).toHaveLength(95);
    expect(new Set(appendixACreatures.map((entry) => entry.id)).size).toBe(95);
    expect(appendixACreatures.every(isCreatureStatBlock)).toBe(true);
    expect(appendixACreatures.every((entry) => entry.sourceRefs.length > 0)).toBe(true);
    expect(appendixACreatures.every((entry) => {
      const contentIds = [...(entry.traits ?? []), ...(entry.actions ?? [])].map((content) => content.id);
      return new Set(contentIds).size === contentIds.length;
    })).toBe(true);
    expect(appendixACreatures.flatMap((entry) => entry.sourceRefs).every((source) =>
      source.sourceId === "manual-dos-monstros-apendice-a" && source.printedPage! >= 317 && source.printedPage! <= 340,
    )).toBe(true);
  });

  it("preserva velocidade, ND, traços, ações e tipos de criatura de páginas diferentes", () => {
    const byName = (name: string) => appendixACreatures.find((entry) => entry.name === name)!;
    const eagle = byName("ÁGUIA GIGANTE");
    expect(eagle).toMatchObject({
      size: "large",
      armorClass: 13,
      hitPoints: { average: 26, hitDice: "4d10 + 4" },
      speeds: { walkCm: 300, flyCm: 2400 },
      challengeRating: { numerator: 1, denominator: 1 },
      sourceRefs: [
        { printedPage: 317, pdfPage: 1 },
        { printedPage: 318, pdfPage: 2 },
      ],
    });
    expect(eagle.actions?.map((action) => action.name)).toEqual(["Ataques Múltiplos", "Bicada", "Garras"]);

    const awakenedShrub = byName("ARBUSTO DESPERTO");
    expect(awakenedShrub).toMatchObject({ creatureType: "plant", challengeRating: { numerator: 0, denominator: 1 } });

    const blinkDog = byName("CÃO TELEPORTADOR");
    expect(blinkDog).toMatchObject({ creatureType: "fey", size: "medium", challengeRating: { numerator: 1, denominator: 4 } });

    const ravenSwarm = byName("ENXAME DE CORVOS");
    expect(ravenSwarm).toMatchObject({ creatureType: "beast", size: "medium", isSwarm: true, challengeRating: { numerator: 1, denominator: 4 } });

    const worg = byName("WORG");
    expect(worg).toMatchObject({ creatureType: "monstrosity", size: "large", challengeRating: { numerator: 1, denominator: 2 } });
    expect(worg.sourceRefs[0]).toMatchObject({ printedPage: 340, pdfPage: 24 });
  });

  it("não transforma deslocamento de natação em caminhada nem ND zero em ND ausente", () => {
    const seahorse = appendixACreatures.find((entry) => entry.name === "CAVALO MARINHO")!;
    expect(seahorse.speeds).toMatchObject({ walkCm: 0, swimCm: 1200 });
    expect(seahorse.challengeRating).toEqual({ numerator: 0, denominator: 1 });
    expect(seahorse.experiencePoints).toBe(0);
  });

  it("preserva os cinco deslocamentos impressos em metros", () => {
    const byName = (name: string) => appendixACreatures.find((entry) => entry.name === name)!;
    expect(byName("CORUJA").speeds).toMatchObject({ walkCm: 150, flyCm: 1800 });
    expect(byName("CORUJA GIGANTE").speeds).toMatchObject({ walkCm: 150, flyCm: 1800 });
    expect(byName("MORCEGO").speeds).toMatchObject({ walkCm: 150, flyCm: 900 });
    expect(byName("POLVO").speeds).toMatchObject({ walkCm: 150, swimCm: 900 });
    expect(byName("TEXUGO").speeds).toMatchObject({ walkCm: 600, burrowCm: 150 });
  });

  it("separa ataques, traços e variantes sem misturar mecânicas", () => {
    const byName = (name: string) => appendixACreatures.find((entry) => entry.name === name)!;
    const actionsOf = (name: string) => byName(name).actions ?? [];
    const traitsOf = (name: string) => byName(name).traits ?? [];

    const spiderActions = actionsOf("ARANHA GIGANTE");
    expect(spiderActions.map((action) => action.name)).toEqual(["Mordida", "Teia"]);
    expect(spiderActions[0]).not.toHaveProperty("rangeCm");
    expect(spiderActions[1]).toMatchObject({ attackBonus: 5, rangeCm: 1800, recharge: "5–6" });

    const wolfActions = actionsOf("LOBO INVERNAL");
    expect(wolfActions.map((action) => action.name)).toEqual(["Mordida", "Sopro Congelante"]);
    expect(wolfActions[0].damage?.map((damage) => damage.damageType)).toEqual(["piercing"]);
    expect(wolfActions[1]).toMatchObject({ recharge: "5–6", damage: [{ damageType: "cold", formula: { quantity: 4, faces: 8 } }] });
    expect(traitsOf("LOBO INVERNAL").find((trait) => trait.name === "Camuflagem de Neve")?.description).toContain("Destreza (Furtividade) feitos em terrenos de neve");

    for (const [name, radius] of [["POLVO", "1,5 metro de raio"], ["POLVO GIGANTE", "6 metros de raio"]] as const) {
      const octopusActions = actionsOf(name);
      expect(octopusActions.map((action) => action.name)).toEqual(["Tentáculos", "Nuvem de Tinta"]);
      expect(octopusActions[0].description).not.toContain("Nuvem de Tinta");
      expect(octopusActions[1].description).toContain(radius);
      expect(traitsOf(name).find((trait) => trait.name === "Camuflagem Submersa")?.description).toContain("Destreza (Furtividade) feitos enquanto estiver submerso");
    }

    for (const [name, size, quantity, faces] of [["RÃ GIGANTE", "Pequeno", 2, 4], ["SAPO GIGANTE", "Médio", 3, 6]] as const) {
      const swallowActions = actionsOf(name);
      expect(swallowActions.map((action) => action.name)).toEqual(["Mordida", "Engolir"]);
      const swallow = swallowActions[1];
      expect(swallow.description).toContain(`${size} ou menor que esteja agarrando`);
      expect(swallow).not.toHaveProperty("attackBonus");
      expect(swallow).not.toHaveProperty("reachCm");
      expect(swallow.damage?.[0]).toMatchObject({
        damageType: "acid",
        formula: { quantity, faces },
        note: expect.stringContaining("no começo de cada turno"),
      });
    }

    expect(actionsOf("LAGARTO GIGANTE").map((action) => action.name)).toEqual(["Mordida"]);
    expect(traitsOf("LAGARTO GIGANTE").map((trait) => trait.name)).toEqual([
      "Prender a Respiração (variante)",
      "Escalada Aracnídea (variante)",
    ]);
    const insectSwarm = byName("ENXAME DE INSETOS");
    expect(insectSwarm.actions?.map((action) => action.name)).toEqual(["Mordidas"]);
    expect(insectSwarm.traits?.some((trait) => trait.name === "Enxame de Vespas (variante)")).toBe(true);
    expect(actionsOf("ENXAME DE CORVOS")[0].description).not.toContain("A NATUREZA DOS ENXAMES");

    const ratActions = actionsOf("RATO GIGANTE");
    expect(new Set(ratActions.map((action) => action.id)).size).toBe(ratActions.length);
    expect(ratActions[1]).toMatchObject({ id: "rato-gigante-infectado-mordida", name: "Mordida (rato gigante infectado)" });
    expect(byName("RATO GIGANTE").sourceText?.["variation.infectedGiantRat"]).toContain("nível de desafio 1/8 (25 XP)");

    expect(byName("CAVALO DE GUERRA").actions?.[0].description).not.toContain("ARMADURA PARA CAVALO");
    expect(byName("CAVALO DE GUERRA").sourceText?.["variation.armoredWarhorse"]).toContain("Classe de Armadura");
    expect(byName("URSO POLAR").actions?.[2].description).not.toContain("URSO DAS CAVERNAS");
    expect(byName("URSO POLAR").sourceText?.["variation.caveBear"]).toContain("visão no escuro");
  });

  it("mantém dano condicional e ações de resolução manual fora da automação", () => {
    const allActions = appendixACreatures.flatMap((creature) => creature.actions ?? []);
    const actionById = (id: string) => allActions.find((action) => action.id === id)!;
    const markedPoisonEntries = appendixACreatures.flatMap((creature) => (creature.actions ?? []).flatMap((action) =>
      (action.damage ?? [])
        .filter((damage) => damage.damageType === "poison" && damage.requiresManualResolution === true)
        .map(() => action.id),
    )).sort();
    expect(markedPoisonEntries).toEqual([
      "aranha-gigante-mordida",
      "aranha-interplanar-mordida",
      "aranha-lobo-gigante-mordida",
      "aranha-mordida",
      "centopeia-gigante-mordida",
      "enxame-de-serpentes-venenosas-mordidas",
      "escorpiao-ferrao",
      "escorpiao-gigante-ferrao",
      "serpente-venenosa-gigante-mordida",
      "serpente-venenosa-mordida",
      "vespa-gigante-ferrao",
    ].sort());

    const markedActions = allActions.filter((action) => action.requiresManualResolution === true).map((action) => action.id).sort();
    expect(markedActions).toEqual([
      "enxame-de-corvos-bicadas",
      "enxame-de-insetos-mordidas",
      "enxame-de-morcegos-mordidas",
      "enxame-de-piranhas-mordidas",
      "enxame-de-ratos-mordidas",
      "enxame-de-serpentes-venenosas-mordidas",
      "lobo-invernal-sopro-congelante",
      "ra-gigante-engolir",
      "rato-gigante-infectado-mordida",
      "sapo-gigante-engolir",
    ].sort());

    for (const actionId of markedPoisonEntries) {
      const poison = actionById(actionId).damage?.find((damage) => damage.damageType === "poison");
      expect(poison?.note).toMatch(/teste de resistência de Constituição CD \d+/);
    }
    expect(actionById("aranha-gigante-mordida").damage?.find((damage) => damage.damageType === "piercing"))
      .not.toHaveProperty("requiresManualResolution");
    for (const actionId of ["sapo-gigante-mordida", "cobra-voadora-mordida"]) {
      expect(actionById(actionId).damage?.find((damage) => damage.damageType === "poison"))
        .not.toHaveProperty("requiresManualResolution");
    }
    expect(actionById("rato-gigante-infectado-mordida").damage?.[0])
      .not.toHaveProperty("requiresManualResolution");
  });
});
