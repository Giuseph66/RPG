import { describe, expect, it, vi } from "vitest";
import { act } from "react";

import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import type { CharacterDraft } from "@domain/contracts/character";
import { asRevision } from "@domain/contracts/versioning";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft, materializeCharacter, validateCharacterCreation, type CreationCatalog } from "@domain/character/creation";
import { err, ok } from "@domain/contracts/errors";
import { mount, click, fireEvent } from "@components/ui/testUtils";

import { CharacterCreationWizard } from "./CharacterCreationWizard";

const now = asIsoTimestamp("2024-01-01T00:00:00.000Z");
const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const ref = (entityId: string) => ({ rulesetId: rulesetRef.id, entityId: asEntityId(entityId) });

function draft() {
  const result = createCharacterDraft({ id: asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), rulesetRef, createdAt: now });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function completeDraft() {
  const result = createCharacterDraft({
    id: asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), rulesetRef, createdAt: now,
    partial: {
      name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      choices: [
        { choiceId: "human.language", selectedIds: [ref("elvish")], grantedAtLevel: 1, grantingRef: ref("human") },
        { choiceId: "fighter.skills", selectedIds: [ref("acrobatics"), ref("perception")], grantedAtLevel: 1, grantingRef: ref("fighter") },
        { choiceId: "fighter.equipment", selectedIds: [ref("dungeoneer-pack")], grantedAtLevel: 1, grantingRef: ref("fighter") },
        { choiceId: "soldier.tools", selectedIds: [ref("proficiency.gaming-set"), ref("proficiency.vehicle-land")], grantedAtLevel: 1, grantingRef: ref("soldier") },
      ],
      inventory: [], castingSources: [], appearance: "",
    },
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function catalog(): CreationCatalog {
  const loaded = loadPhbPtBrLocal2017();
  if (!loaded.ok) throw new Error(loaded.error.message);
  return { rulePack: loaded.value, equipmentBundles };
}

describe("CharacterCreationWizard", () => {
  it("expõe opções para uma escolha dinâmica de idioma", async () => {
    const result = createCharacterDraft({
      id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), rulesetRef, createdAt: now,
      partial: {
        name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"),
        classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
        abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "2. Raça") as HTMLElement);
      const language = [...mounted.container.querySelectorAll("select")].find((select) => [...select.options].some((option) => option.value === "elvish")) as HTMLSelectElement | undefined;
      expect(language).toBeDefined();
      expect([...language?.options ?? []].map((option) => option.value)).toContain("elvish");
    } finally {
      await mounted.unmount();
    }
  });

  it("recolhe explicitamente o atributo de conjuração da Fada e o marca como obrigatório", async () => {
    const result = createCharacterDraft({
      id: asUuid("12121212-1212-4212-8212-121212121212"), rulesetRef, createdAt: now,
      partial: { name: "Fada de teste" },
    });
    if (!result.ok) throw new Error(result.error.message);
    const onDraftChange = vi.fn((next: CharacterDraft) => { void next; });
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} onDraftChange={onDraftChange} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "2. Raça") as HTMLElement);
      const fairy = [...mounted.container.querySelectorAll('input[type="checkbox"]')].find((input) => input.parentElement?.textContent?.includes("Fada")) as HTMLInputElement;
      expect(fairy).toBeDefined();
      await click(fairy);

      const race = [...mounted.container.querySelectorAll("select")].find((select) => [...select.options].some((option) => option.value === "fairy")) as HTMLSelectElement;
      expect(race).toBeDefined();
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(race, "fairy");
      await fireEvent(race, new Event("change", { bubbles: true }));

      const spellcastingAbility = [...mounted.container.querySelectorAll("select")].find((select) => ["int", "wis", "cha"].every((id) => [...select.options].some((option) => option.value === id))) as HTMLSelectElement;
      expect(spellcastingAbility.required).toBe(true);
      expect(spellcastingAbility.labels?.[0]?.textContent).toContain("Atributo de conjuração · Fada");
      expect(spellcastingAbility.options[0]?.textContent).toBe("Selecione uma opção");
      expect(mounted.container.textContent).toContain("Obrigatório · escolha 1 opção");

      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(spellcastingAbility, "wis");
      await fireEvent(spellcastingAbility, new Event("change", { bubbles: true }));
      const capturedDraft = onDraftChange.mock.calls.map(([next]) => next).at(-1);
      expect(capturedDraft?.partial.choices).toContainEqual(expect.objectContaining({
        choiceId: "fairy.spellcasting-ability",
        selectedIds: [ref("wis")],
        grantedAtLevel: 1,
        grantingRef: ref("fairy"),
      }));
    } finally {
      await mounted.unmount();
    }
  });

  it("Humano variante: mostra as quatro escolhas em português, com a lista de talentos, e grava o talento", async () => {
    const result = createCharacterDraft({ id: asUuid("13131313-1313-4313-8313-131313131313"), rulesetRef, createdAt: now, partial: { name: "Monge de teste" } });
    if (!result.ok) throw new Error(result.error.message);
    const onDraftChange = vi.fn((next: CharacterDraft) => { void next; });
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} onDraftChange={onDraftChange} />);
    const setValue = async (select: HTMLSelectElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, value);
      await fireEvent(select, new Event("change", { bubbles: true }));
    };
    const selectWith = (value: string) => [...mounted.container.querySelectorAll("select")].find((select) => [...select.options].some((option) => option.value === value)) as HTMLSelectElement;
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "2. Raça") as HTMLElement);
      await click([...mounted.container.querySelectorAll('input[type="checkbox"]')].find((input) => input.parentElement?.textContent?.includes("Humano variante")) as HTMLInputElement);
      await setValue(selectWith("variant-human"), "variant-human");

      const text = mounted.container.textContent ?? "";
      expect(text).toContain("Humano variante · +1 em dois atributos diferentes");
      expect(text).toContain("Humano variante · proficiência em uma perícia");
      expect(text).toContain("Humano variante · talento");
      expect(text).toContain("Humano variante · idioma adicional");
      expect(text).not.toMatch(/Ability Increases|Feat ·|Skill ·/);

      const feat = selectWith("alert");
      expect(feat).toBeDefined();
      expect(feat.options.length).toBeGreaterThan(30);
      expect([...feat.options].find((option) => option.value === "alert")?.textContent).toBe("Alerta");
      await setValue(feat, "alert");
      const captured = onDraftChange.mock.calls.map(([next]) => next).at(-1);
      expect(captured?.partial.choices).toContainEqual(expect.objectContaining({ choiceId: "variant-human.feat", selectedIds: [ref("alert")], grantingRef: ref("variant-human") }));
      // O resumo lateral reconhece a raça de suplemento e mostra o talento escolhido.
      expect(mounted.container.textContent).toContain("Talento: Alerta");
    } finally {
      await mounted.unmount();
    }
  });

  it("Tasha no Patrulheiro: Inimigo Eleito dentro de Inimigo Favorito e opções como pacotes completos", async () => {
    const result = createCharacterDraft({
      id: asUuid("13131313-1313-4313-8313-131313131313"), rulesetRef, createdAt: now,
      partial: {
        name: "Guardião", raceRef: ref("human"), classes: [{ classId: asEntityId("ranger"), level: 1, choices: [] }],
        selectedSupplementIds: [asEntityId("tasha-ranger-options")], optionalRuleSelections: [],
        choices: [{ choiceId: "ranger.favored-enemy-language.1", selectedIds: [ref("elvish")], grantedAtLevel: 1, grantingRef: ref("ranger") }],
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const onDraftChange = vi.fn((next: CharacterDraft) => { void next; });
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} onDraftChange={onDraftChange} />);
    const latest = () => onDraftChange.mock.calls.map(([next]) => next).at(-1)!;
    const selects = () => [...mounted.container.querySelectorAll("select")];
    const toggle = (text: string) => [...mounted.container.querySelectorAll('input[type="checkbox"]')].find((input) => input.parentElement?.textContent?.includes(text)) as HTMLInputElement;
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "3. Classe") as HTMLElement);
      // Sem campo separado: Inimigo Eleito é uma opção do próprio Inimigo Favorito.
      expect(mounted.container.textContent).not.toContain("Manter a regra atual");
      const favored = selects().find((select) => [...select.options].some((option) => option.textContent === "Inimigo Eleito (Tasha)")) as HTMLSelectElement;
      expect(favored).toBeDefined();
      // O aviso de perda (tipo, idioma, Inimigo Favorito Maior) aparece antes de escolher, com a saída por Hábil.
      expect(mounted.container.textContent).toContain("não aprende o idioma do Inimigo Favorito");
      expect(mounted.container.textContent).toContain("Astuto concede dois idiomas");
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(favored, "optional:ranger.optional-favored-foe");
      await fireEvent(favored, new Event("change", { bubbles: true }));
      expect(latest().partial.optionalRuleSelections).toContainEqual(expect.objectContaining({ optionId: "ranger.optional-favored-foe", selectedFeatureRefs: [ref("ranger.favored-foe")] }));
      expect(latest().partial.choices?.some((choice) => choice.choiceId.startsWith("ranger.favored-enemy"))).toBe(false);
      expect(mounted.container.textContent).toContain("substitui Inimigo Favorito e Inimigo Favorito Maior");

      // Hábil é um conjunto: Astuto (1º), Peregrino (6º) e Incansável (10º) chegam juntos.
      expect(mounted.container.textContent).toContain("Astuto (1º) · Peregrino (6º) · Incansável (10º)");
      await click(toggle("Usar Hábil"));
      expect(latest().partial.optionalRuleSelections).toContainEqual(expect.objectContaining({
        optionId: "ranger.optional-canny", selectedFeatureRefs: [ref("ranger.canny"), ref("ranger.roving"), ref("ranger.tireless")],
      }));
      expect(mounted.container.textContent).toContain("Astuto (Tasha) · perícia com bônus de proficiência dobrado");
      expect(mounted.container.textContent).toContain("Astuto (Tasha) · idiomas adicionais");

      // Tasha p. 51: no 1º nível só aparecem opções de 1º nível (Hábil; Inimigo Eleito fica no Inimigo Favorito).
      // As demais chegam na subida de nível (coberto em LevelUpWizard.test.tsx).
      for (const label of ["Usar Consciência Primordial", "Usar Véu Natural", "Adicionar à lista de escolha (2º nível)", "Usar Versatilidade Marcial", "Usar Companheiro Primitivo", "Adicionar estas magias", "Usar Foco de Conjuração"]) {
        expect(toggle(label), label).toBeUndefined();
      }
      expect(mounted.container.textContent).toContain("As outras opções do suplemento aparecem ao subir de nível");
      const final = latest();
      expect(final.partial.optionalRuleSelections?.map((selection) => String(selection.optionId)).sort()).toEqual(["ranger.optional-canny", "ranger.optional-favored-foe"]);
      const report = validateCharacterCreation(catalog(), final);
      expect(report.issues.filter((issue) => /optionalRuleSelections|favored-enemy/.test(issue.field))).toEqual([]);

      // Desligar Hábil descarta a perícia de Astuto já escolhida (sem escolha órfã travando a revisão).
      const skill = selects().find((select) => select.labels?.[0]?.textContent?.includes("Astuto (Tasha) · perícia")) as HTMLSelectElement;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(skill, "survival");
      await fireEvent(skill, new Event("change", { bubbles: true }));
      expect(latest().partial.choices?.some((choice) => choice.choiceId === "ranger.canny.skill")).toBe(true);
      await click(toggle("Usar Hábil"));
      expect(latest().partial.choices?.some((choice) => choice.choiceId.startsWith("ranger.canny"))).toBe(false);
      expect(validateCharacterCreation(catalog(), latest()).issues.filter((issue) => issue.field.startsWith("choices.ranger.canny"))).toEqual([]);

      // Voltar a um tipo de Inimigo Favorito desfaz o Inimigo Eleito.
      const favoredAgain = selects().find((select) => [...select.options].some((option) => option.textContent === "Inimigo Eleito (Tasha)")) as HTMLSelectElement;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(favoredAgain, "favored-enemy.beasts");
      await fireEvent(favoredAgain, new Event("change", { bubbles: true }));
      expect(latest().partial.optionalRuleSelections?.some((selection) => selection.optionId === "ranger.optional-favored-foe")).toBe(false);
      expect(latest().partial.choices).toContainEqual(expect.objectContaining({ choiceId: "ranger.favored-enemy.1", selectedIds: [ref("favored-enemy.beasts")] }));
    } finally {
      await mounted.unmount();
    }
  });

  it("rascunho antigo com opção Tasha incompleta não traz de volta o idioma do Inimigo Favorito", async () => {
    // Rascunho salvo pela UI antiga: Hábil gravado só com Astuto (pacote incompleto) + Inimigo Eleito.
    const result = createCharacterDraft({
      id: asUuid("14141414-1414-4414-8414-141414141414"), rulesetRef, createdAt: now,
      partial: {
        name: "Guardião antigo", raceRef: ref("human"), classes: [{ classId: asEntityId("ranger"), level: 1, choices: [] }],
        selectedSupplementIds: [asEntityId("tasha-ranger-options")],
        optionalRuleSelections: [
          { supplementId: asEntityId("tasha-ranger-options"), optionId: asEntityId("ranger.optional-canny"), selectedFeatureRefs: [ref("ranger.canny")] },
          { supplementId: asEntityId("tasha-ranger-options"), optionId: asEntityId("ranger.optional-favored-foe"), selectedFeatureRefs: [ref("ranger.favored-foe")] },
        ],
        choices: [],
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const onDraftChange = vi.fn((next: CharacterDraft) => { void next; });
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} onDraftChange={onDraftChange} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "3. Classe") as HTMLElement);
      const labels = [...mounted.container.querySelectorAll("select")].map((select) => select.labels?.[0]?.textContent ?? "");
      expect(labels).toContain("Inimigo Favorito · Patrulheiro");
      expect(labels).not.toContain("Idioma do Inimigo Favorito · Patrulheiro");
      // A opção incompleta é avisada, não derruba o resto do Tasha em silêncio.
      expect(mounted.container.textContent).toContain("Hábil estava salvo de um jeito antigo");
    } finally {
      await mounted.unmount();
    }
  });

  it("torna a escolha múltipla de perícias tocável e limita a cardinalidade", async () => {
    const result = createCharacterDraft({
      id: asUuid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"), rulesetRef, createdAt: now,
      partial: { name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"), classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }] },
    });
    if (!result.ok) throw new Error(result.error.message);
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "3. Classe") as HTMLElement);
      const choices = [...mounted.container.querySelectorAll('fieldset[aria-label="Perícias · Guerreiro"] input[type="checkbox"]')] as HTMLInputElement[];
      expect(choices.length).toBeGreaterThan(2);
      expect(mounted.container.textContent).toContain("Atletismo");
      await click(choices[0]);
      await click(choices[1]);
      expect(mounted.container.textContent).toContain("2 de 2 selecionada(s)");
      expect(choices[2].disabled).toBe(true);
    } finally {
      await mounted.unmount();
    }
  });

  it("oferece ao bardo apenas truques de nível 0 e magias de nível 1 da lista da classe", async () => {
    const result = createCharacterDraft({
      id: asUuid("abababab-abab-4bab-8bab-abababababab"), rulesetRef, createdAt: now,
      partial: {
        name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"),
        classes: [{ classId: asEntityId("bard"), level: 1, choices: [] }],
        abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
        inventory: [], castingSources: [], appearance: "",
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const loaded = catalog();
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={loaded} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Magias")) as HTMLElement);
      const assertEligible = (label: string, level: number) => {
        const values = [...mounted.container.querySelectorAll(`fieldset[aria-label="${label}"] input[type="checkbox"]`)].map((input) => (input as HTMLInputElement).value);
        expect(values.length).toBeGreaterThan(0);
        for (const value of values) {
          const spell = loaded.rulePack.spells.get(asEntityId(value));
          expect(spell?.level).toBe(level);
          expect(spell?.classes.map(String)).toContain("bard");
        }
      };
      assertEligible("Truques · Bardo", 0);
      assertEligible("Magias · Bardo", 1);
    } finally {
      await mounted.unmount();
    }
  });

  it("oferece ao druida truques e magias de nível 1 da lista da classe", async () => {
    const result = createCharacterDraft({
      id: asUuid("cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd"), rulesetRef, createdAt: now,
      partial: {
        name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"),
        classes: [{ classId: asEntityId("druid"), level: 1, choices: [] }],
        abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
        inventory: [], castingSources: [], appearance: "",
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const loaded = catalog();
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={loaded} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Magias")) as HTMLElement);
      const assertEligible = (label: string, level: number) => {
        const values = [...mounted.container.querySelectorAll(`fieldset[aria-label="${label}"] input[type="checkbox"]`)].map((input) => (input as HTMLInputElement).value);
        expect(values.length).toBeGreaterThan(0);
        for (const value of values) {
          const spell = loaded.rulePack.spells.get(asEntityId(value));
          expect(spell?.level).toBe(level);
          expect(spell?.classes.map(String)).toContain("druid");
        }
      };
      assertEligible("Truques · Druida", 0);
      assertEligible("Magias · Druida", 1);
    } finally {
      await mounted.unmount();
    }
  });

  it("oferece ao alto elfo guerreiro truques de mago, fora da lista da classe", async () => {
    const result = createCharacterDraft({
      id: asUuid("abcdabcd-abcd-4bcd-8bcd-abcdabcdabcd"), rulesetRef, createdAt: now,
      partial: {
        name: "Artemis", raceRef: ref("elf"), subraceRef: ref("high-elf"), backgroundRef: ref("soldier"),
        classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
        abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
        inventory: [], castingSources: [], appearance: "",
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const loaded = catalog();
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={loaded} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Raça")) as HTMLElement);
      const assertEligible = (label: string, level: number) => {
        const values = [...mounted.container.querySelectorAll(`fieldset[aria-label="${label}"] input[type="checkbox"]`)].map((input) => (input as HTMLInputElement).value);
        expect(values.length).toBeGreaterThan(0);
        for (const value of values) {
          const spell = loaded.rulePack.spells.get(asEntityId(value));
          expect(spell?.level).toBe(level);
          expect(spell?.classes.map(String)).toContain("wizard");
        }
      };
      assertEligible("Truque · Alto elfo", 0);
    } finally {
      await mounted.unmount();
    }
  });

  it("mostra resumo da magia e abre a descrição completa no botão de info", async () => {
    const result = createCharacterDraft({
      id: asUuid("efefefef-efef-4fef-8fef-efefefefefef"), rulesetRef, createdAt: now,
      partial: {
        name: "Artemis", raceRef: ref("human"), backgroundRef: ref("soldier"),
        classes: [{ classId: asEntityId("druid"), level: 1, choices: [] }],
        abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
        inventory: [], castingSources: [], appearance: "",
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const loaded = catalog();
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={loaded} spellInfo={(id) => id === "bordao-mistico" ? { name: "Bordão Místico", level: 0, school: "transmutação", castingTime: "1 ação bônus", range: "Toque", components: "V, S, M", duration: "1 minuto", ritual: false, description: ["A madeira de uma clava ou bordão que você esteja segurando é imbuída com o poder da natureza.", "Segundo parágrafo."], source: "Livro do Jogador, p. 224" } : undefined} />);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Magias")) as HTMLElement);
      const option = mounted.container.querySelector('input[value="bordao-mistico"]')?.closest("div") as HTMLElement;
      expect(option.textContent).toContain("Truque de transmutação · 1 ação bônus · Toque");
      expect(option.textContent).toContain("A madeira de uma clava ou bordão que você esteja segurando é imbuída com o poder da natureza.");
      expect(option.textContent).not.toContain("Segundo parágrafo.");
      await click(option.querySelector('button[aria-label="Descrição de Bordão Místico"]') as HTMLElement);
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.textContent).toContain("Segundo parágrafo.");
      expect(dialog.textContent).toContain("Livro do Jogador, p. 224");
      expect((mounted.container.querySelector('input[value="bordao-mistico"]') as HTMLInputElement).checked).toBe(false);
      expect(mounted.container.textContent).toContain("até 1 opção (nível 1 + mod. de Sabedoria +0, mínimo 1)");
      expect(mounted.container.textContent).toContain("pode trocar a lista ao fim de cada descanso longo");
    } finally {
      await mounted.unmount();
    }
  });

  it("guia os atributos por método: matriz sem repetir valores, orçamento da compra e rolagem 4d6", async () => {
    const result = createCharacterDraft({
      id: asUuid("dededede-dede-4ede-8ede-dededededede"), rulesetRef, createdAt: now,
      partial: { name: "Artemis", raceRef: ref("human"), classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }], inventory: [], castingSources: [], appearance: "" },
    });
    if (!result.ok) throw new Error(result.error.message);
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} />);
    const query = <T extends Element>(selector: string) => mounted.container.querySelector(selector) as T;
    const button = (label: string) => query<HTMLButtonElement>(`button[aria-label="${label}"]`);
    try {
      await click([...mounted.container.querySelectorAll("button")].find((entry) => entry.textContent?.includes("Atributos")) as HTMLElement);
      expect(mounted.container.textContent).toContain("Sem método, cada atributo começa em 10");
      expect(mounted.container.textContent).toContain("Principal · Guerreiro");

      await click(query('input[type="radio"][value="standard-array"]'));
      const strength = query<HTMLSelectElement>('select[aria-label="Força (valor base)"]');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(strength, "15");
      await fireEvent(strength, new Event("change", { bubbles: true }));
      const dexOptions = [...query<HTMLSelectElement>('select[aria-label="Destreza (valor base)"]').options].map((option) => option.value);
      expect(dexOptions).toEqual(["", "14", "13", "12", "10", "8"]);
      expect(query('[aria-label^="Força final"]').getAttribute("aria-label")).toBe("Força final 16, modificador +3");

      await click(query('input[type="radio"][value="point-buy"]'));
      for (const ability of ["Força", "Destreza", "Constituição"]) for (let step = 0; step < 7; step += 1) await click(button(`Aumentar ${ability}`));
      expect(mounted.container.textContent).toContain("0 de 27 pontos restantes");
      expect(button("Aumentar Sabedoria").getAttribute("aria-disabled") ?? String(button("Aumentar Sabedoria").disabled)).toBe("true");

      const random = vi.spyOn(crypto, "getRandomValues").mockImplementation(((array: Uint32Array) => { array.set([5, 4, 3, 0]); return array; }) as never);
      await click(query('input[type="radio"][value="rolled"]'));
      await click([...mounted.container.querySelectorAll("button")].find((entry) => entry.textContent === "Rolar todos") as HTMLElement);
      random.mockRestore();
      // Dados 6, 5, 4 e 1: descarta o 1, total 15; humano +1.
      expect(query<HTMLInputElement>('input[aria-label="Força (valor base)"]').value).toBe("15");
      expect(query('[aria-label^="Dados: 6, 5, 4, 1"]')).not.toBeNull();
      expect(query('[aria-label^="Carisma final"]').getAttribute("aria-label")).toBe("Carisma final 16, modificador +3");
    } finally {
      await mounted.unmount();
    }
  });

  it("começa pela identidade, permite avançar sem campos opcionais e preserva escolhas ao voltar", async () => {
    const mounted = await mount(<CharacterCreationWizard draft={draft()} catalog={catalog()} />);
    expect(mounted.container.textContent).toContain("Identidade");
    const continueButton = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Continuar")) as HTMLButtonElement;
    expect(continueButton.getAttribute("aria-disabled")).toBeNull();
    const name = mounted.container.querySelector("input") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(name, "Artemis");
    await fireEvent(name, new Event("input", { bubbles: true }));
    expect(continueButton.getAttribute("aria-disabled")).toBeNull();
    await click(continueButton);
    expect(mounted.container.textContent).toContain("Escolha uma raça");
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Voltar") as HTMLElement);
    expect((mounted.container.querySelector("input") as HTMLInputElement).value).toBe("Artemis");
    await mounted.unmount();
  });

  it("mantém a identidade ao reabrir um rascunho salvo só com o nome", async () => {
    const result = createCharacterDraft({ id: asUuid("ffffffff-ffff-4fff-8fff-ffffffffffff"), rulesetRef, createdAt: now, partial: { name: "Artemis" } });
    if (!result.ok) throw new Error(result.error.message);
    const mounted = await mount(<CharacterCreationWizard draft={result.value} catalog={catalog()} />);
    expect(mounted.container.textContent).toContain("Identidade");
    expect(mounted.container.textContent).not.toContain("Escolha uma raça");
    const playerName = [...mounted.container.querySelectorAll("input")][1] as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(playerName, "Jogador");
    await fireEvent(playerName, new Event("input", { bubbles: true }));
    expect(mounted.container.textContent).toContain("Identidade");
    await mounted.unmount();
  });

  it("salva o draft apenas uma vez por intenção", async () => {
    const saveDraft = vi.fn(async () => ({ ok: true as const, value: draft() }));
    const service = { saveDraft, deleteDraft: vi.fn(), saveCharacter: vi.fn() } as never;
    const mounted = await mount(<CharacterCreationWizard draft={draft()} catalog={catalog()} service={service} />);
    const save = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Salvar rascunho") as HTMLElement;
    await click(save);
    await click(save);
    expect(saveDraft).toHaveBeenCalledOnce();
    await mounted.unmount();
  });

  it("permite salvar novamente após editar o rascunho", async () => {
    const saveDraft = vi.fn(async (value) => ({ ok: true as const, value }));
    const service = { saveDraft, deleteDraft: vi.fn(), saveCharacter: vi.fn() } as never;
    const mounted = await mount(<CharacterCreationWizard draft={draft()} catalog={catalog()} service={service} />);
    try {
      const save = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Salvar rascunho") as HTMLElement;
      await click(save);
      const name = mounted.container.querySelector("input") as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(name, "Artemis");
      await fireEvent(name, new Event("input", { bubbles: true }));
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Salvar rascunho") as HTMLElement);
      expect(saveDraft).toHaveBeenCalledTimes(3);
    } finally {
      await mounted.unmount();
    }
  });

  it("salva localmente cada decisão de criação", async () => {
    const saveDraft = vi.fn(async (value) => ({ ok: true as const, value }));
    const service = { saveDraft, deleteDraft: vi.fn(), saveCharacter: vi.fn() } as never;
    const mounted = await mount(<CharacterCreationWizard draft={draft()} catalog={catalog()} service={service} />);
    try {
      const name = mounted.container.querySelector("input") as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(name, "Artemis");
      await fireEvent(name, new Event("input", { bubbles: true }));
      await vi.waitFor(() => expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({ partial: expect.objectContaining({ name: "Artemis" }) })));
    } finally {
      await mounted.unmount();
    }
  });

  it("confirma uma única vez depois da revisão válida", async () => {
    const saveCharacter = vi.fn(async () => ({ ok: true as const, value: asRevision(1) }));
    const deleteDraft = vi.fn(async () => ok(undefined));
    const service = { saveDraft: vi.fn(), deleteDraft, saveCharacter } as never;
    const onCreated = vi.fn();
    const mounted = await mount(<CharacterCreationWizard draft={completeDraft()} catalog={catalog()} service={service} onCreated={onCreated} />);
    const confirm = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar")) as HTMLElement;
    await click(confirm);
    await click(confirm);
    expect(saveCharacter).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledOnce();
    expect(deleteDraft).toHaveBeenCalledWith(completeDraft().id);
    await mounted.unmount();
  });

  it("retoma confirmação idêntica sem gravar novamente e preserva uma ficha alterada", async () => {
    const input = completeDraft();
    const materialized = materializeCharacter(catalog(), input);
    if (!materialized.ok) throw new Error("Fixture inválida");
    const existing = { ...materialized.value.character, revision: asRevision(2) };
    const saveCharacter = vi.fn();
    const deleteDraft = vi.fn(async () => ok(undefined));
    const loadCharacter = vi.fn(async () => ok(existing));
    const service = { saveDraft: vi.fn(), deleteDraft, saveCharacter, loadCharacter, canReuseCharacter: () => true };
    const onCreated = vi.fn();
    const mounted = await mount(<CharacterCreationWizard draft={input} catalog={catalog()} service={service} onCreated={onCreated} />);
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar"))!);
    expect(saveCharacter).not.toHaveBeenCalled();
    expect(deleteDraft).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledWith(existing, asRevision(2));
    await mounted.unmount();

    loadCharacter.mockResolvedValue(ok({ ...existing, name: "Editado na ficha" }));
    deleteDraft.mockClear(); onCreated.mockClear();
    const changed = await mount(<CharacterCreationWizard draft={input} catalog={catalog()} service={service} onCreated={onCreated} />);
    await click([...changed.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar"))!);
    expect(changed.container.textContent).toContain("já foi alterado");
    expect(saveCharacter).not.toHaveBeenCalled();
    expect(deleteDraft).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    await changed.unmount();
  });

  it("mantém o rascunho quando a ficha não pôde ser salva", async () => {
    const deleteDraft = vi.fn(async () => ok(undefined));
    const service = { saveDraft: vi.fn(), deleteDraft, saveCharacter: vi.fn(async () => err({ code: "conflict" as const, message: "Conflito preservado", expectedRevision: asRevision(0), actualRevision: asRevision(1) })) };
    const mounted = await mount(<CharacterCreationWizard draft={completeDraft()} catalog={catalog()} service={service} />);
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar"))!);
    expect(mounted.container.textContent).toContain("Conflito preservado");
    expect(deleteDraft).not.toHaveBeenCalled();
    await mounted.unmount();
  });

  it("aguarda o autosave antes de criar e remover o rascunho", async () => {
    const input = completeDraft();
    let finishSave!: (value: ReturnType<typeof ok<typeof input>>) => void;
    const pending = new Promise<ReturnType<typeof ok<typeof input>>>((resolve) => { finishSave = resolve; });
    const saveCharacter = vi.fn(async () => ok(asRevision(1)));
    const deleteDraft = vi.fn(async () => ok(undefined));
    const service = { saveDraft: vi.fn(() => pending), saveCharacter, deleteDraft };
    const mounted = await mount(<CharacterCreationWizard draft={input} catalog={catalog()} service={service} />);
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "1. Identidade")!);
    const name = mounted.container.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(name, "Artemis nova");
    await fireEvent(name, new Event("input", { bubbles: true }));
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "9. Revisão")!);
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar"))!);
    expect(saveCharacter).not.toHaveBeenCalled();
    expect(deleteDraft).not.toHaveBeenCalled();
    await act(async () => { finishSave(ok(input)); await pending; });
    expect(saveCharacter).toHaveBeenCalledOnce();
    expect(deleteDraft).toHaveBeenCalledOnce();
    expect(saveCharacter.mock.invocationCallOrder[0]).toBeLessThan(deleteDraft.mock.invocationCallOrder[0]);
    await mounted.unmount();
  });
});
