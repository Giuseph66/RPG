import { describe, expect, it } from "vitest";

import { canonicalStringify, computeChecksum, fnv1a32 } from "./checksum";

describe("canonicalStringify", () => {
  it("é independente da ordem de inserção de chaves", () => {
    const a = { b: 1, a: 2, c: { z: 1, y: 2 } };
    const b = { a: 2, c: { y: 2, z: 1 }, b: 1 };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it("preserva ordem de arrays (reordenar array muda o resultado)", () => {
    const a = [{ id: "x" }, { id: "y" }];
    const b = [{ id: "y" }, { id: "x" }];
    expect(canonicalStringify(a)).not.toBe(canonicalStringify(b));
  });
});

describe("fnv1a32 / computeChecksum", () => {
  it("é determinístico para a mesma entrada", () => {
    const catalog = [{ id: "a", name: "Alfa" }, { id: "b", name: "Beta" }];
    expect(computeChecksum(catalog)).toBe(computeChecksum(catalog));
    expect(computeChecksum(catalog)).toBe(computeChecksum(JSON.parse(JSON.stringify(catalog))));
  });

  it("é independente da ordem de chaves de cada item (não da ordem dos itens)", () => {
    const catalogA = [{ id: "a", name: "Alfa" }];
    const catalogB = [{ name: "Alfa", id: "a" }];
    expect(computeChecksum(catalogA)).toBe(computeChecksum(catalogB));
  });

  it("muda quando um campo do catálogo muda", () => {
    const before = [{ id: "a", name: "Alfa" }];
    const after = [{ id: "a", name: "Alfa modificada" }];
    expect(computeChecksum(before)).not.toBe(computeChecksum(after));
  });

  it("renomear 'name' (tradução) muda o checksum, mas NÃO muda os IDs", () => {
    const original = [{ id: "cure-wounds", name: "Curar Ferimentos" }];
    const translated = [{ id: "cure-wounds", name: "Cure Wounds" }];

    expect(computeChecksum(original)).not.toBe(computeChecksum(translated));
    // O ID em si (chave estável) é o mesmo antes e depois — só o checksum do catálogo mudou.
    expect(original[0]?.id).toBe(translated[0]?.id);
  });

  it("fnv1a32 sempre retorna 8 hex chars em minúsculas", () => {
    expect(fnv1a32("")).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1a32("qualquer string")).toMatch(/^[0-9a-f]{8}$/);
  });
});
