import { describe, expect, it } from "vitest";

import { asEntityId } from "@domain/contracts/ids";
import { isOk } from "@domain/contracts/errors";

import { resolveClass, resolveEquipment, resolveRace } from "../lookup";
import { validateRulePack } from "../validate";
import { PHB_PTBR_LOCAL_2017_INPUT, loadPhbPtBrLocal2017 } from "./index";

const ref = (entityId: string) => ({ rulesetId: PHB_PTBR_LOCAL_2017_INPUT.manifest.id, entityId: asEntityId(entityId) });

describe("loadPhbPtBrLocal2017", () => {
  it("publica os catálogos aceitos e valida o manifesto", () => {
    const result = loadPhbPtBrLocal2017();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.manifest.id).toBe("phb-ptbr-local-2017");
      expect(result.value.races.size).toBe(9);
      expect(result.value.classes.size).toBe(12);
      expect(result.value.equipment.size).toBe(220);
      expect(result.value.progression.table).toHaveLength(20);
      expect(isOk(resolveRace(result.value, ref("dwarf")))).toBe(true);
      expect(isOk(resolveClass(result.value, ref("barbarian")))).toBe(true);
      expect(isOk(resolveEquipment(result.value, ref("dagger")))).toBe(true);
    }
  });

  it("mantém a validação estrita do input publicado", () => {
    const result = validateRulePack(PHB_PTBR_LOCAL_2017_INPUT);
    expect(isOk(result)).toBe(true);
  });

  it("expõe abilities/skills/dice na entrada, fora do RulePack publicado", () => {
    expect(PHB_PTBR_LOCAL_2017_INPUT.abilities?.length).toBe(6);
    expect(PHB_PTBR_LOCAL_2017_INPUT.skills?.length).toBe(18);
    expect(PHB_PTBR_LOCAL_2017_INPUT.diceFaces?.length).toBe(7);
  });
});
