import { describe, expect, it } from "vitest";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { spellInfoFor } from "./character-route-data";

describe("spellInfoFor", () => {
  const loaded = loadPhbPtBrLocal2017();
  if (!loaded.ok) throw new Error(loaded.error.message);
  const info = spellInfoFor(loaded.value);

  it("reflui o texto do PDF e separa a evolução em níveis superiores", () => {
    const spell = info("bracos-de-hadar");
    expect(spell?.description[0]).toMatch(/^Você invoca o poder de Hadar, o Faminto Sombrio\. Tentáculos/);
    expect(spell?.description.join(" ")).not.toContain("\n");
    expect(spell?.higherLevels).toMatch(/^Quando você conjurar essa magia usando um espaço de magia de 2° nível/);
  });

  it("acha registros estruturados pelo nome e extrai a evolução de truques", () => {
    const fireBolt = info("fire-bolt");
    expect(fireBolt?.name).toBe("Raio de Fogo");
    expect(fireBolt?.level).toBe(0);
    expect(fireBolt?.higherLevels).toMatch(/5° nível/);
    expect(fireBolt?.description.join(" ")).not.toContain(fireBolt?.higherLevels);
  });

  it("junta palavras compostas quebradas no fim da linha", () => {
    expect(info("chicote-de-espinhos")?.description.join(" ")).toContain("corpo-a-corpo");
  });
});
