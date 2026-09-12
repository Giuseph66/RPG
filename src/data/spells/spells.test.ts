import { describe, expect, it } from "vitest";
import { getClassSpellcastingAbility, getSpellAccess, getSpellsForClass, hasClassAccess } from "./access";
import { findSpell, spells } from "./spells";
import { validateSpellCatalog, validateSpellDefinition } from "./validate";

describe("SPELL-001 — catálogo estruturado", () => {
  it("publica IDs únicos, fontes locais e os seis registros canônicos", () => {
    expect(spells).toHaveLength(6);
    expect(new Set(spells.map((spell) => spell.id)).size).toBe(spells.length);
    expect(spells.every((spell) => spell.sourceRefs[0]?.sourceId === "phb-ptbr-local-2017")).toBe(true);
    expect(spells.every((spell) => spell.level >= 0 && spell.level <= 9)).toBe(true);
  });

  it("preserva IDs quando labels são traduzidos e consulta por ID", () => {
    expect(findSpell("fireball")?.name).toBe("Bola de Fogo");
    expect(findSpell("Bola de Fogo")).toBeUndefined();
    expect(findSpell("fireball")?.id).toBe("fireball");
  });

  it("representa truque, concentração, ritual e componente consumido", () => {
    expect(findSpell("fire-bolt")?.level).toBe(0);
    expect(findSpell("detect-magic")).toMatchObject({ concentration: true, ritual: true });
    expect(findSpell("revivify")?.components.material).toMatchObject({ costCp: 30000, consumed: true });
    expect(findSpell("fireball")?.components.material?.consumed).toBe(false);
  });

  it("expõe acesso por classe sem guardar known/prepared na definição", () => {
    expect(hasClassAccess("wizard", "fireball")).toBe(true);
    expect(hasClassAccess("cleric", "fireball")).toBe(false);
    expect(getSpellsForClass("wizard").map((spell) => spell.id)).toEqual(expect.arrayContaining(["fireball", "fire-bolt", "detect-magic"]));
    expect("prepared" in (findSpell("fireball") as object)).toBe(false);
    expect(getClassSpellcastingAbility("bard")).toBe("cha");
    expect(getClassSpellcastingAbility("cleric")).toBe("wis");
    expect(getSpellAccess("wizard", "fireball")?.resource).toEqual({ kind: "spell-slot", minimumSlotLevel: 3 });
    expect(getSpellAccess("wizard", "fire-bolt")?.resource).toEqual({ kind: "none" });
  });

  it("rejeita entradas malformadas, fonte estrangeira e duplicidade", () => {
    expect(validateSpellDefinition({ id: "Bad Label", name: "x" }).map((issue) => issue.code)).toEqual(expect.arrayContaining(["invalid-id", "missing-source", "invalid-level"]));
    const duplicate = [spells[0], spells[0]];
    expect(validateSpellCatalog(duplicate).some((issue) => issue.code === "duplicate-id")).toBe(true);
    expect(validateSpellDefinition({ ...spells[0], sourceRefs: [{ ...spells[0].sourceRefs[0], sourceId: "other-pack" }] }).some((issue) => issue.code === "foreign-source")).toBe(true);
    expect(validateSpellCatalog(spells)).toEqual([]);
  });
});
