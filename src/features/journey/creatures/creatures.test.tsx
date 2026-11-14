import { describe, expect, it, vi } from "vitest";

import { fireEvent, mount } from "@components/ui/testUtils";
import { CREATURE_SCHEMA_VERSION, type CreatureProposal, type CreatureRecord, type CreatureSighting } from "@domain/campaign/creatures";
import { ok } from "@domain/contracts/errors";
import { asAccountId, asEntityId, asIsoTimestamp, asRulesetId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { asCentimeters } from "@domain/contracts/primitives";
import { suggestCreatureStatBlock, type CreatureStatBlock } from "@domain/creatures";

import { CreatureBoard, CreatureProposalBoard, PlayerCreatureBoard } from "./index";

const at = asIsoTimestamp("2026-09-28T12:00:00.000Z");
const tester = asAccountId("player-teste");
const ana = asAccountId("player-ana");
const players = [{ accountId: tester, name: "Teste" }, { accountId: ana, name: "Ana" }];
const creature: CreatureRecord = {
  id: asUuid("00000000-0000-4000-8000-00000000c001"),
  campaignId: asUuid("00000000-0000-4000-8000-00000000ca01"),
  schemaVersion: CREATURE_SCHEMA_VERSION,
  revision: asRevision(1),
  kind: "enemy",
  name: "Lobo atroz",
  appearance: "Um vulto enorme",
  race: "",
  description: "",
  hitPoints: "37",
  armorClass: "",
  abilities: "",
  notes: "Serve à bruxa",
  reveals: [],
  createdAt: at,
  updatedAt: at,
};

const click = (element: Element) => fireEvent(element, new MouseEvent("click", { bubbles: true }));
const byText = (root: ParentNode, selector: string, text: string) => [...root.querySelectorAll(selector)].find((item) => item.textContent?.includes(text))!;

describe("CreatureBoard (mestre)", () => {
  it("mostra criaturas em grade e revela um campo só para o jogador em foco", async () => {
    const onSave = vi.fn(async (next: CreatureRecord) => ok({ ...next, revision: asRevision(next.revision + 1) }));
    const { container, unmount } = await mount(<CreatureBoard creatures={[creature]} players={players} onSave={onSave} />);
    expect(container.querySelectorAll("ul > li > button[data-kind='enemy']")).toHaveLength(1);
    await click(byText(container, "button", "Lobo atroz"));
    await click(byText(document.body, "button[role='radio']", "Teste"));
    await click(document.body.querySelector("button[aria-label='Revelar aparência para Teste']")!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ reveals: [{ accountId: tester, fields: ["appearance"] }] }));
    // Campos vazios não podem ser revelados, e as notas do mestre não têm olho.
    expect(document.body.querySelector("button[aria-label='Revelar raça ou espécie para Teste']")?.hasAttribute("disabled")).toBe(true);
    expect(document.body.querySelector("button[aria-label*='notas']")).toBeNull();
    await unmount();
  });

  it("revela a presença para todos os jogadores de uma vez", async () => {
    const onSave = vi.fn(async (next: CreatureRecord) => ok(next));
    const { container, unmount } = await mount(<CreatureBoard creatures={[creature]} players={players} onSave={onSave} />);
    await click(byText(container, "button", "Lobo atroz"));
    await click(byText(document.body, "button", "Presença oculta"));
    expect(onSave.mock.calls[0]![0].reveals).toEqual([{ accountId: ana, fields: [] }, { accountId: tester, fields: [] }]);
    await unmount();
  });

  it("filtra por categoria, inclusive animais e não categorizados", async () => {
    const owl = { ...creature, id: asUuid("00000000-0000-4000-8000-00000000c002"), kind: "animal" as const, name: "Coruja" };
    const { container, unmount } = await mount(<CreatureBoard creatures={[creature, owl]} players={players} />);
    await click(byText(container, "button[aria-pressed]", "Animais"));
    expect(container.textContent).toContain("Coruja");
    expect(container.textContent).not.toContain("Lobo atroz");
    await unmount();
  });
});

describe("CreatureBoard: palpites em card separado", () => {
  const guess = { id: `${creature.id}__${tester}`, campaignId: creature.campaignId, creatureId: creature.id, accountId: tester, schemaVersion: CREATURE_SCHEMA_VERSION as 1, revision: asRevision(1), kind: "animal" as const, name: "Lobão", note: "Uivou", fields: { hitPoints: "uns 30" }, createdAt: at, updatedAt: at };

  it("no desktop os palpites vão para um segundo card ao lado da ficha", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as never;
    try {
      const { container, unmount } = await mount(<CreatureBoard creatures={[creature]} guesses={[guess]} players={players} />);
      await click(byText(container, "button", "Lobo atroz"));
      const dialog = document.body.querySelector("[role='dialog']")!;
      const aside = document.body.querySelector("aside")!;
      expect(aside.textContent).toContain("Palpites dos jogadores");
      expect(aside.textContent).toContain("uns 30");
      expect(dialog.contains(aside)).toBe(false);
      expect(dialog.textContent).not.toContain("uns 30");
      await unmount();
    } finally {
      window.matchMedia = original;
    }
  });

  it("no celular os palpites ficam dentro da ficha, e somem quando não há nenhum", async () => {
    const withGuess = await mount(<CreatureBoard creatures={[creature]} guesses={[guess]} players={players} />);
    await click(byText(withGuess.container, "button", "Lobo atroz"));
    expect(document.body.querySelector("[role='dialog']")!.textContent).toContain("uns 30");
    expect(document.body.querySelector("aside")).toBeNull();
    await withGuess.unmount();
    const without = await mount(<CreatureBoard creatures={[creature]} players={players} />);
    await click(byText(without.container, "button", "Lobo atroz"));
    expect(document.body.querySelector("[role='dialog']")!.textContent).not.toContain("Palpites dos jogadores");
    await without.unmount();
  });
});

describe("ficha do jogo", () => {
  const setValue = (element: Element, value: string, proto: object) => { Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value); return fireEvent(element, new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true })); };
  const sheetId = asUuid("00000000-0000-4000-8000-0000000000f1");
  const tools = { raceOptions: [{ id: "race.elf" as never, name: "Elfo" }], classOptions: [{ id: "class.warlock" as never, name: "Bruxo" }] };

  it("cria a ficha só com a raça (classe opcional), no mesmo botão e preenchendo a raça", async () => {
    const onGenerateSheet = vi.fn(async () => ok(sheetId));
    const onCreate = vi.fn(async (content: { name: string }) => ok({ ...creature, name: content.name }));
    const { container, unmount } = await mount(<CreatureBoard creatures={[]} players={players} onCreate={onCreate} onGenerateSheet={onGenerateSheet} {...tools} />);
    await click(byText(container, "button", "Nova criatura"));
    const dialog = document.body.querySelector("[role='dialog']")!;
    expect(dialog.textContent).toContain("Sem ficha");
    await click(byText(dialog, "button[role='radio']", "Criar pelas regras"));
    await setValue(dialog.querySelector("select[aria-label='Raça da criatura']")!, "race.elf", HTMLSelectElement.prototype);
    // Falta o nome: o botão principal fica desativado e o motivo aparece. A classe não é cobrada.
    expect(byText(dialog, "button[type='submit']", "Criar ficha e adicionar").getAttribute("aria-disabled")).toBe("true");
    expect(dialog.querySelector("[role='status']")?.textContent).toContain("nome da criatura");
    expect(dialog.querySelector("[role='status']")?.textContent).not.toContain("classe");
    await setValue(dialog.querySelector("input[maxlength='80']")!, "Aldeã", HTMLInputElement.prototype);
    expect(dialog.textContent).toContain("Sem classe, a ficha usa a base neutra");
    expect([...dialog.querySelectorAll("input")].some((input) => input.value === "Elfo")).toBe(true);
    await click(byText(dialog, "button[type='submit']", "Criar ficha e adicionar"));
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onGenerateSheet).toHaveBeenCalledWith({ name: "Aldeã", raceId: "race.elf" });
    expect(onCreate.mock.calls[0]![0]).toMatchObject({ name: "Aldeã", characterRef: sheetId, race: "Elfo" });
    await unmount();
  });

  it("com classe escolhida a ficha leva a classe", async () => {
    const onGenerateSheet = vi.fn(async () => ok(sheetId));
    const { container, unmount } = await mount(<CreatureBoard creatures={[]} players={players} onCreate={async () => ok(creature)} onGenerateSheet={onGenerateSheet} {...tools} />);
    await click(byText(container, "button", "Nova criatura"));
    const dialog = document.body.querySelector("[role='dialog']")!;
    await click(byText(dialog, "button[role='radio']", "Criar pelas regras"));
    await setValue(dialog.querySelector("input[maxlength='80']")!, "Bruxa", HTMLInputElement.prototype);
    await setValue(dialog.querySelector("select[aria-label='Raça da criatura']")!, "race.elf", HTMLSelectElement.prototype);
    await setValue(dialog.querySelector("select[aria-label='Classe da criatura']")!, "class.warlock", HTMLSelectElement.prototype);
    expect(dialog.textContent).toContain("Elfo Bruxo de nível 1");
    await click(byText(dialog, "button[type='submit']", "Criar ficha e adicionar"));
    await vi.waitFor(() => expect(onGenerateSheet).toHaveBeenCalledWith({ name: "Bruxa", raceId: "race.elf", classId: "class.warlock" }));
    await unmount();
  });

  it("gerencia a ficha da criatura: editar abre a ficha e excluir pede confirmação e remove o vínculo", async () => {
    const withSheet = { ...creature, characterRef: sheetId };
    const onOpenSheet = vi.fn();
    const onDeleteSheet = vi.fn(async (item: typeof creature) => { const { characterRef: _gone, ...rest } = item; return ok(rest as typeof creature); });
    const { container, unmount } = await mount(<CreatureBoard creatures={[withSheet]} players={players} onSave={async (item) => ok(item)} onOpenSheet={onOpenSheet} onDeleteSheet={onDeleteSheet} />);
    await click(byText(container, "button", "Lobo atroz"));
    const dialog = document.body.querySelector("[role='dialog']")!;
    await click(byText(dialog, "button", "Editar ficha"));
    expect(onOpenSheet).toHaveBeenCalledWith(sheetId);
    await click(byText(dialog, "button", "Excluir ficha"));
    expect(onDeleteSheet).not.toHaveBeenCalled();
    expect(dialog.textContent).toContain("A criatura continua no elenco, sem ficha");
    const confirmButton = [...dialog.querySelectorAll("button")].filter((button) => button.textContent === "Excluir ficha").at(-1)!;
    await click(confirmButton);
    await vi.waitFor(() => expect(onDeleteSheet).toHaveBeenCalled());
    await vi.waitFor(() => expect(dialog.textContent).not.toContain("Editar ficha"));
    await unmount();
  });

  it("lista fichas existentes com classe e nível e esconde as já ligadas a outra criatura", async () => {
    const taken = asUuid("00000000-0000-4000-8000-0000000000a1");
    const free = asUuid("00000000-0000-4000-8000-0000000000a2");
    const other = { ...creature, id: asUuid("00000000-0000-4000-8000-00000000c009"), name: "Outra", characterRef: taken };
    const { container, unmount } = await mount(<CreatureBoard creatures={[other]} players={players} onCreate={async () => ok(creature)} availableCharacters={[{ id: taken, name: "cah", detail: "Bruxo nível 1" }, { id: free, name: "cah", detail: "Guerreiro nível 3" }]} />);
    await click(byText(container, "button", "Nova criatura"));
    const dialog = document.body.querySelector("[role='dialog']")!;
    await click(byText(dialog, "button[role='radio']", "Ficha existente"));
    const options = [...dialog.querySelectorAll("select option")].map((option) => option.textContent);
    expect(options).toEqual(["Escolher uma ficha…", "cah · Guerreiro nível 3"]);
    await unmount();
  });
});

describe("fechar ao clicar fora", () => {
  const outside = (dialog: Element) => dialog.closest("[role='dialog']")?.parentElement ?? dialog.parentElement!;

  it("fecha o modal da criatura (com e sem card lateral) ao clicar no fundo", async () => {
    for (const wide of [false, true]) {
      const original = window.matchMedia;
      window.matchMedia = ((query: string) => ({ matches: wide, media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as never;
      const { container, unmount } = await mount(<CreatureBoard creatures={[creature]} players={players} />);
      await click(byText(container, "button", "Lobo atroz"));
      const dialog = document.body.querySelector("[role='dialog']")!;
      await click(outside(dialog));
      expect(document.body.querySelector("[role='dialog']")).toBeNull();
      await unmount();
      window.matchMedia = original;
    }
  });
});

describe("PlayerCreatureBoard (jogador)", () => {
  const sighting: CreatureSighting = { id: `${creature.id}__${tester}`, campaignId: creature.campaignId, creatureId: creature.id, accountId: tester, schemaVersion: CREATURE_SCHEMA_VERSION, revision: asRevision(1), revealed: { appearance: "Um vulto enorme" }, createdAt: at, updatedAt: at };

  it("mostra só o que foi revelado e envia o palpite do jogador", async () => {
    const onSaveGuess = vi.fn(async () => ok({} as never));
    const { container, unmount } = await mount(<PlayerCreatureBoard sightings={[sighting]} onSaveGuess={onSaveGuess} />);
    expect(container.textContent).toContain("Presença desconhecida");
    expect(container.textContent).toContain("Não categorizado");
    expect(container.textContent).not.toContain("37");
    await click(byText(container, "button", "Presença desconhecida"));
    const dialog = document.body.querySelector("[role='dialog']")!;
    await click(byText(dialog, "button[aria-pressed]", "Ameaça"));
    // A aparência já foi revelada: vira fato, não pergunta. PV ainda pode ser suposto.
    expect(dialog.textContent).not.toContain("Aparência que você imagina");
    const name = dialog.querySelector('input[maxlength="80"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(name, "Lobo do pântano");
    await fireEvent(name, new Event("input", { bubbles: true }));
    const hp = [...dialog.querySelectorAll("label")].find((label) => label.textContent?.includes("Pontos de vida estimados"))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(hp, "uns 30");
    await fireEvent(hp, new Event("input", { bubbles: true }));
    const note = dialog.querySelector("textarea[maxlength='800']")!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(note, "Ronda a ponte");
    await fireEvent(note, new Event("input", { bubbles: true }));
    await click(byText(dialog, "button[type='submit']", "Guardar palpite"));
    expect(onSaveGuess).toHaveBeenCalledWith(creature.id, { kind: "enemy", name: "Lobo do pântano", note: "Ronda a ponte", fields: { hitPoints: "uns 30" } });
    await unmount();
  });

  it("compara o palpite com o que o mestre revelou", async () => {
    const revealed: CreatureSighting = { ...sighting, kind: "enemy", revealed: { appearance: "Um vulto enorme", hitPoints: "37" } };
    const guess = { id: sighting.id, campaignId: creature.campaignId, creatureId: creature.id, accountId: tester, schemaVersion: CREATURE_SCHEMA_VERSION as 1, revision: asRevision(1), kind: "animal" as const, name: "", note: "", fields: { hitPoints: "uns 35", abilities: "mordida" }, createdAt: at, updatedAt: at };
    const { container, unmount } = await mount(<PlayerCreatureBoard sightings={[revealed]} guesses={[guess]} />);
    await click(byText(container, "button", "Presença desconhecida").closest("button")!);
    const dialog = document.body.querySelector("[role='dialog']")!;
    const compare = dialog.querySelector("[aria-labelledby='creature-compare-title']")!;
    expect(compare.textContent).toContain("0 de 2 certos");
    expect(compare.querySelector("[data-verdict='differs']")?.textContent).toContain("Era diferente");
    expect(compare.querySelector("[data-verdict='close']")?.textContent).toContain("Você achou: uns 35");
    // Habilidades continuam mistério: o palpite existe, mas não há revelação para comparar.
    expect(compare.textContent).not.toContain("mordida");
    await unmount();
  });
});

describe("CreatureProposalBoard", () => {
  const block: CreatureStatBlock = {
    id: asEntityId("lobo-da-lua"), name: "Lobo da lua", creatureType: "beast", size: "medium", armorClass: 13,
    hitPoints: { average: 18, hitDice: "4d8" }, speeds: { walkCm: asCentimeters(400) },
    abilityScores: { str: 14, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, challengeRating: { numerator: 1, denominator: 4 },
    sourceRefs: [{ sourceId: asRulesetId("manual-campaign"), chapter: "Sugestão de jogador" }],
  };
  const proposal: CreatureProposal = {
    id: "proposal-lobo-da-lua", campaignId: creature.campaignId, schemaVersion: CREATURE_SCHEMA_VERSION, revision: asRevision(1),
    proposedBy: tester, status: "pending", statBlock: block, suggestionReasons: ["Avistado na trilha"], createdAt: at, updatedAt: at,
  };

  it("envia um bloco editável e mostra somente o status confirmado pelo serviço", async () => {
    const onSubmit = vi.fn(async (submitted: CreatureStatBlock) => ok({ ...proposal, statBlock: submitted }));
    const { container, unmount } = await mount(<CreatureProposalBoard mode="player" proposals={[]} onSubmit={onSubmit} />);
    await click(byText(container, "button", "Adicionar bloco estatístico"));
    const name = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Nome no bloco"))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(name, "Lobo da lua");
    await fireEvent(name, new Event("input", { bubbles: true }));
    const reason = container.querySelector("textarea[maxlength='600']")!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(reason, "Avistado na trilha");
    await fireEvent(reason, new Event("input", { bubbles: true }));
    await click(byText(container, "button[type='submit']", "Enviar para revisão"));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Lobo da lua" }), ["Avistado na trilha"]);
    expect(container.textContent).toContain("Aguardando o mestre");
    expect(container.textContent).toContain("não foi aprovada nem registrada como avistamento");
    await unmount();
  });

  it("apresenta o resultado persistido da revisão do mestre", async () => {
    const approved = { ...proposal, status: "approved" as const, revision: asRevision(2) };
    const onReview = vi.fn(async () => ok({ proposal: approved }));
    const { container, unmount } = await mount(<CreatureBoard creatures={[]} proposals={[proposal]} onReviewProposal={onReview} />);
    expect(container.textContent).toContain("Sugestões dos jogadores");
    await click(byText(container, "button", "Aprovar no catálogo"));
    expect(onReview).toHaveBeenCalledWith(proposal.id, "approve", undefined, block);
    expect(container.textContent).toContain("Aprovada");
    await unmount();
  });

  it("gera sugestão de besta para o jogador, permite editar e inclui as razões no envio", async () => {
    const onSuggest = vi.fn((input: Omit<Parameters<typeof suggestCreatureStatBlock>[0], "catalog">) => suggestCreatureStatBlock({ ...input, catalog: [block] }));
    const onSubmit = vi.fn(async (submitted: CreatureStatBlock, reasons: readonly string[]) => ok({ ...proposal, statBlock: submitted, suggestionReasons: reasons }));
    const { container, unmount } = await mount(<CreatureProposalBoard mode="player" proposals={[]} onSubmit={onSubmit} onSuggestStatBlock={onSuggest} />);
    await click(byText(container, "button", "Adicionar bloco estatístico"));
    const name = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Nome sugerido"))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "Lobo da lua");
    await fireEvent(name, new Event("input", { bubbles: true }));
    await click(byText(container, "button", "Gerar sugestão pelo catálogo"));
    expect(onSuggest).toHaveBeenCalledWith(expect.objectContaining({ role: "player-beast", creatureType: "beast" }));
    const reason = container.querySelector("textarea[maxlength='600']")!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(reason, "Visto na trilha");
    await fireEvent(reason, new Event("input", { bubbles: true }));
    await click(byText(container, "button[type='submit']", "Enviar para revisão"));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Lobo da lua", creatureType: "beast" }), expect.arrayContaining(["Visto na trilha", expect.stringContaining("Template de mesmo tipo")]));
    await unmount();
  });

  it("permite enviar uma sugestão sem ND conhecido quando não há modelo no catálogo", async () => {
    const onSuggest = vi.fn((input: Omit<Parameters<typeof suggestCreatureStatBlock>[0], "catalog">) => suggestCreatureStatBlock({ ...input, catalog: [] }));
    const onSubmit = vi.fn(async (submitted: CreatureStatBlock) => ok({ ...proposal, statBlock: submitted }));
    const { container, unmount } = await mount(<CreatureProposalBoard mode="player" proposals={[]} onSubmit={onSubmit} onSuggestStatBlock={onSuggest} />);
    await click(byText(container, "button", "Adicionar bloco estatístico"));
    const name = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Nome sugerido"))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "Animal sem modelo");
    await fireEvent(name, new Event("input", { bubbles: true }));
    await click(byText(container, "button", "Gerar sugestão pelo catálogo"));
    const reason = container.querySelector("textarea[maxlength='600']")!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(reason, "Criatura encontrada fora dos manuais");
    await fireEvent(reason, new Event("input", { bubbles: true }));
    await click(byText(container, "button[type='submit']", "Enviar para revisão"));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Animal sem modelo", creatureType: "beast", challengeRating: null }), expect.arrayContaining(["Criatura encontrada fora dos manuais"]));
    await unmount();
  });

  it("exige que o mestre defina o ND no bloco revisado antes de aprovar", async () => {
    const unknownNd = { ...proposal, statBlock: { ...block, challengeRating: null } };
    const approved = { ...unknownNd, status: "approved" as const, revision: asRevision(2) };
    const onReview = vi.fn(async () => ok({ proposal: approved }));
    const { container, unmount } = await mount(<CreatureProposalBoard mode="master" proposals={[unknownNd]} onReview={onReview} />);
    const approve = byText(container, "button", "Aprovar no catálogo") as HTMLButtonElement;
    expect(approve.getAttribute("aria-disabled")).toBe("true");
    const ndUnknown = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("ND não informado"))!.querySelector("input")!;
    await click(ndUnknown);
    expect((ndUnknown as HTMLInputElement).checked).toBe(false);
    expect(byText(container, "button", "Aprovar no catálogo").getAttribute("aria-disabled")).toBeNull();
    const setNumber = async (labelText: string, value: string) => {
      const input = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes(labelText))!.querySelector("input")!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      await fireEvent(input, new Event("input", { bubbles: true }));
    };
    await setNumber("ND — numerador", "2");
    await setNumber("ND — denominador", "3");
    await setNumber("XP", "100");
    const note = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Nota de revisão (opcional)"))!.querySelector("textarea")!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(note, "ND definido após conferência");
    await fireEvent(note, new Event("input", { bubbles: true }));
    expect(onReview).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Aguardando o mestre");
    await click(byText(container, "button", "Aprovar no catálogo"));
    expect(onReview).toHaveBeenCalledWith(proposal.id, "approve", "ND definido após conferência", expect.objectContaining({ challengeRating: { numerator: 2, denominator: 3 }, experiencePoints: 100 }));
    await unmount();
  });
});

describe("criatura do livro como base de um animal", () => {
  const setValue = (element: Element, value: string, proto: object) => { Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value); return fireEvent(element, new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true })); };
  const source = [{ sourceId: asRulesetId("phb-ptbr-local-2017"), chapter: "Apêndice A" }];
  const wolf: CreatureStatBlock = {
    id: asEntityId("lobo-livro"), name: "Lobo", creatureType: "beast", size: "medium", armorClass: 13,
    hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: asCentimeters(1200) },
    abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, challengeRating: { numerator: 1, denominator: 4 },
    traits: [{ id: "faro", name: "Faro apurado", description: "Vantagem em Percepção." }],
    actions: [{ id: "mordida", name: "Mordida", description: "Ataque corpo a corpo." }], sourceRefs: source,
  };
  const bear: CreatureStatBlock = { ...wolf, id: asEntityId("urso-livro"), name: "Urso-pardo", size: "large", armorClass: 11, hitPoints: { average: 34, hitDice: "4d10+12" }, challengeRating: { numerator: 1, denominator: 1 } };
  const dragon: CreatureStatBlock = { ...wolf, id: asEntityId("dragao-livro"), name: "Dragão-vermelho", creatureType: "dragon", size: "huge", challengeRating: { numerator: 10, denominator: 1 } };
  const labelled = (root: ParentNode, text: string, selector = "input") => [...root.querySelectorAll("label")].find((label) => label.textContent?.includes(text))!.querySelector(selector) as HTMLInputElement;
  const openForm = async (onCreate = vi.fn(async (content: { name: string }) => ok({ ...creature, name: content.name }))) => {
    const mounted = await mount(<CreatureBoard creatures={[]} players={players} onCreate={onCreate} bookCreatures={[wolf, bear, dragon]} />);
    await click(byText(mounted.container, "button", "Nova criatura"));
    return { ...mounted, onCreate, dialog: document.body.querySelector("[role='dialog']")! };
  };

  it("oferece o botão de criatura do livro em qualquer categoria, e sem catálogo não oferece", async () => {
    const { dialog, unmount } = await openForm();
    expect(dialog.textContent).toContain("Criatura do livro");
    await click(byText(dialog, "button[aria-pressed]", "NPC"));
    expect(dialog.textContent).toContain("Criatura do livro");
    await unmount();
    const bare = await mount(<CreatureBoard creatures={[]} onCreate={vi.fn()} />);
    await click(byText(bare.container, "button", "Nova criatura"));
    expect(document.body.textContent).not.toContain("Criatura do livro");
    await bare.unmount();
  });

  it("busca no catálogo, mostra o bloco completo e copia como base do animal", async () => {
    const { dialog, onCreate, unmount } = await openForm();
    await click(byText(dialog, "button[aria-pressed]", "Animal"));
    await click(byText(dialog, "button", "Criatura do livro"));
    const picker = [...document.body.querySelectorAll("[role='dialog']")].find((item) => item.textContent?.includes("Criaturas dos livros"))!;
    // Abre filtrando bestas: o dragão fica de fora até o tipo mudar.
    expect(picker.textContent).toContain("Lobo");
    expect(picker.textContent).not.toContain("Dragão-vermelho");
    expect(byText(picker, "button", "Usar como base").getAttribute("aria-disabled")).toBe("true");
    await setValue(picker.querySelector("input[type='search']")!, "urs", HTMLInputElement.prototype);
    expect(picker.textContent).toContain("Urso-pardo");
    expect(picker.querySelector("ul")!.textContent).not.toContain("Lobo");
    await setValue(picker.querySelector("input[type='search']")!, "", HTMLInputElement.prototype);
    await click(byText(picker.querySelector("ul")!, "button", "Lobo"));
    expect(picker.textContent).toContain("Faro apurado");
    await click(byText(picker, "button", "Usar como base"));

    expect(document.body.textContent).not.toContain("Criaturas dos livros");
    expect(document.body.textContent).toContain("Copiado de Lobo.");
    expect(dialog.querySelector<HTMLInputElement>("input[maxlength='80']")!.value).toBe("Lobo");
    expect(labelled(dialog, "Pontos de vida").value).toBe("11 (2d8+2)");
    expect(labelled(dialog, "Classe de armadura").value).toBe("13");
    expect(labelled(dialog, "Habilidades e magias", "textarea").value).toContain("Mordida");
    expect(labelled(dialog, "Nome no bloco").value).toBe("Lobo");
    await click(byText(dialog, "button[type='submit']", "Adicionar ao elenco"));
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalled());
    const saved = (onCreate.mock.calls[0]![0] as unknown as { statBlock: CreatureStatBlock }).statBlock;
    expect(saved).toMatchObject({ name: "Lobo", armorClass: 13, hitPoints: { average: 11 } });
    // Cópia independente: id novo, fonte original e nota de origem.
    expect(String(saved.id)).not.toBe("lobo-livro");
    expect(saved.sourceRefs).toEqual(source);
    expect(saved.additionalInfo?.notes).toContain("Copiado de “Lobo”");
    await unmount();
  });

  it("não sobrescreve o que o mestre já escreveu", async () => {
    const { dialog, unmount } = await openForm();
    await click(byText(dialog, "button[aria-pressed]", "Animal"));
    await setValue(dialog.querySelector("input[maxlength='80']")!, "Fenrir", HTMLInputElement.prototype);
    await setValue(labelled(dialog, "Pontos de vida"), "999", HTMLInputElement.prototype);
    await click(byText(dialog, "button", "Criatura do livro"));
    const picker = [...document.body.querySelectorAll("[role='dialog']")].find((item) => item.textContent?.includes("Criaturas dos livros"))!;
    await click(byText(picker.querySelector("ul")!, "button", "Lobo"));
    await click(byText(picker, "button", "Usar como base"));
    expect(dialog.querySelector<HTMLInputElement>("input[maxlength='80']")!.value).toBe("Fenrir");
    expect(labelled(dialog, "Pontos de vida").value).toBe("999");
    expect(labelled(dialog, "Classe de armadura").value).toBe("13");
    // O bloco ganha o nome que o mestre escolheu; só a espécie herda o nome do livro.
    expect(labelled(dialog, "Nome no bloco").value).toBe("Fenrir");
    expect(labelled(dialog, "Raça ou espécie").value).toBe("Lobo");
    await unmount();
  });

  it("converte nomes do livro em caixa-alta para o estilo de frase ao copiar", async () => {
    const shout: CreatureStatBlock = { ...wolf, id: asEntityId("lobo-atroz-livro"), name: "LOBO ATROZ" };
    const { container, dialog, onCreate, unmount } = await (async () => {
      const onCreate = vi.fn(async (content: { name: string }) => ok({ ...creature, name: content.name }));
      const mounted = await mount(<CreatureBoard creatures={[]} onCreate={onCreate} bookCreatures={[shout]} />);
      await click(byText(mounted.container, "button", "Nova criatura"));
      return { ...mounted, onCreate, dialog: document.body.querySelector("[role='dialog']")! };
    })();
    await click(byText(dialog, "button[aria-pressed]", "Animal"));
    await click(byText(dialog, "button", "Criatura do livro"));
    const picker = [...document.body.querySelectorAll("[role='dialog']")].find((item) => item.textContent?.includes("Criaturas dos livros"))!;
    await click(byText(picker.querySelector("ul")!, "button", "LOBO ATROZ"));
    await click(byText(picker, "button", "Usar como base"));
    expect(dialog.querySelector<HTMLInputElement>("input[maxlength='80']")!.value).toBe("Lobo atroz");
    expect(labelled(dialog, "Nome no bloco").value).toBe("Lobo atroz");
    expect(container).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();
    await unmount();
  });

  it("avisa que a escolha substitui um bloco estatístico existente e cancela sem alterar nada", async () => {
    const { dialog, unmount } = await openForm();
    await click(byText(dialog, "button[aria-pressed]", "Animal"));
    await click(byText(dialog, "button", "Adicionar bloco estatístico"));
    const before = labelled(dialog, "Nome no bloco").value;
    await click(byText(dialog, "button", "Criatura do livro"));
    const picker = [...document.body.querySelectorAll("[role='dialog']")].find((item) => item.textContent?.includes("Criaturas dos livros"))!;
    await click(byText(picker.querySelector("ul")!, "button", "Urso-pardo"));
    expect(picker.textContent).toContain("substitui o bloco estatístico atual");
    await click(byText(picker, "button", "Cancelar"));
    expect(document.body.textContent).not.toContain("Criaturas dos livros");
    expect(labelled(dialog, "Nome no bloco").value).toBe(before);
    await unmount();
  });
});
