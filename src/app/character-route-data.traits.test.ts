import { describe, expect, it } from "vitest";
import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid, type Uuid } from "@domain/contracts/ids";
import type { Character } from "@domain/contracts/character";
import type { ChoiceSelection } from "@domain/contracts/primitives";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft, materializeCharacter } from "@domain/character/creation";

import { traitRowsFor } from "./character-route-data";

const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const ref = (entityId: string) => ({ rulesetId: rulesetRef.id, entityId: asEntityId(entityId) });
const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(loaded.error.message);
const pack = loaded.value;
let serial = 0;
const idGenerator = (): Uuid => asUuid(`00000000-0000-4000-8000-${(++serial).toString(16).padStart(12, "0")}`);
const pick = (choiceId: string, ids: readonly string[], owner: string): ChoiceSelection => ({ choiceId, selectedIds: ids.map(ref), grantedAtLevel: 1, grantingRef: ref(owner) });

function create(classId: string, raceId: string, choices: ChoiceSelection[] = [], subclassId?: string): Character {
  const draft = createCharacterDraft({
    id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), rulesetRef, createdAt: asIsoTimestamp("2024-01-01T00:00:00.000Z"),
    partial: { name: "Teste", raceRef: ref(raceId), ...(raceId === "variant-human" ? { selectedSupplementIds: [asEntityId("variant-human-option")] } : {}), classes: [{ classId: asEntityId(classId), level: 1, choices: [], ...(subclassId ? { subclassId: asEntityId(subclassId) } : {}) }], abilityGeneration: { method: "manual", baseScores: { str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 8 } }, choices },
  });
  if (!draft.ok) throw new Error(draft.error.message);
  const result = materializeCharacter({ rulePack: pack, equipmentBundles }, draft.value, { idGenerator });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.character;
}

describe("traitRowsFor", () => {
  it("a ficha lista a raça, as escolhas e o talento do humano variante", () => {
    const monk = create("monk", "variant-human", [
      pick("variant-human.ability-increases", ["dex", "wis"], "variant-human"),
      pick("variant-human.skill", ["perception"], "variant-human"),
      pick("variant-human.feat", ["alert"], "variant-human"),
      pick("variant-human.language", ["elvish"], "variant-human"),
    ]);
    expect(traitRowsFor(pack, monk)).toEqual([
      { label: "Raça", value: "Humano variante", rule: { category: "race", title: "Humano variante", entityId: "variant-human" } },
      { label: "Aumento de atributo", value: "Destreza +1, Sabedoria +1" },
      { label: "Perícia", value: "Percepção" },
      { label: "Idioma", value: "Élfico" },
      { label: "Talento", value: "Alerta", rule: { category: "feat", title: "Alerta", entityId: "alert" } },
    ]);
    // Humano comum sem escolhas registradas: só a raça, nenhum talento.
    expect(traitRowsFor(pack, create("monk", "human")).map((row) => row.label)).toEqual(["Raça"]);
  });
});
