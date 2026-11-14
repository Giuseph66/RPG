import { describe, expect, it } from "vitest";

import { matchRoute } from "./routes";

describe("rotas de superfícies conectadas", () => {
  it("expõe seleção, backup e diário como destinos profundos", () => {
    expect(matchRoute("/character")).toMatchObject({ kind: "character", params: {} });
    expect(matchRoute("/character/abc")).toMatchObject({ kind: "character", params: { id: "abc" } });
    expect(matchRoute("/journey")).toMatchObject({ kind: "journey" });
    expect(matchRoute("/data")).toMatchObject({ kind: "data" });
    expect(matchRoute("/settings/data")).toMatchObject({ kind: "data" });
    expect(matchRoute("/account")).toMatchObject({ kind: "account", params: {} });
    expect(matchRoute("/collaboration")).toMatchObject({ kind: "collaboration", primary: "collaboration" });
    expect(matchRoute("/session/campaign-1")).toMatchObject({ kind: "session", params: { campaignId: "campaign-1" } });
  });
});

describe("rota de evolução", () => {
  it("reconhece /character/:id/evolve sem confundir com a ficha nem com a criação", () => {
    expect(matchRoute("/character/abc/evolve")).toMatchObject({ kind: "character", primary: "character", params: { id: "abc", mode: "evolve" } });
    expect(matchRoute("/character/abc").params).toEqual({ id: "abc" });
    expect(matchRoute("/character/create").params.mode).toBe("create");
  });
});

describe("rota contextual de criaturas", () => {
  it("reconhece a tela dedicada por ficha e não a confunde com a ficha normal", () => {
    expect(matchRoute("/character/abc/creatures")).toMatchObject({ kind: "character", primary: "character", params: { id: "abc", mode: "creatures" } });
    expect(matchRoute("/character/abc").params).toEqual({ id: "abc" });
  });

  it("mantém o link legado de Criaturas dentro das abas da Jornada", () => {
    expect(matchRoute("/creatures")).toMatchObject({ kind: "journey", primary: "journey", params: { id: "creatures" } });
    expect(matchRoute("/journey/creatures")).toMatchObject({ kind: "journey", primary: "journey", params: { id: "creatures" } });
    expect(matchRoute("/compendium").kind).toBe("compendium");
    expect(matchRoute("/journey/npcs").kind).toBe("journey");
  });
});
