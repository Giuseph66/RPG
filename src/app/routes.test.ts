import { describe, expect, it } from "vitest";

import { matchRoute, PRIMARY_ROUTES } from "./routes";

describe("app routes", () => {
  it("keeps exactly four primary destinations and resolves deep links", () => {
    expect(PRIMARY_ROUTES.map((route) => route.id)).toEqual(["character", "actions", "journey", "compendium"]);
    expect(matchRoute("/character/hero-7")).toMatchObject({ kind: "character", primary: "character", params: { id: "hero-7" } });
    expect(matchRoute("/compendium/spells/fire-bolt?from=character")).toMatchObject({ kind: "compendium", primary: "compendium", params: { type: "spells", id: "fire-bolt" } });
    expect(matchRoute("/character#hp")).toMatchObject({ kind: "character", primary: "character" });
  });

  it("uses onboarding and safe recovery matches for root and unknown paths", () => {
    expect(matchRoute("/").kind).toBe("onboarding");
    expect(matchRoute("/unknown").kind).toBe("not-found");
    expect(matchRoute("/settings").kind).toBe("settings");
  });
});
