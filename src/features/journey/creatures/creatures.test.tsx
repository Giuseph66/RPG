import { describe, expect, it, vi } from "vitest";

import { fireEvent, mount } from "@components/ui/testUtils";
import { CREATURE_SCHEMA_VERSION, type CreatureRecord, type CreatureSighting } from "@domain/campaign/creatures";
import { ok } from "@domain/contracts/errors";
import { asAccountId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";

import { CreatureBoard, PlayerCreatureBoard } from "./index";

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
    const hp = [...dialog.querySelectorAll("label")].find((label) => label.textContent?.includes("Pontos de vida estimados"))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(hp, "uns 30");
    await fireEvent(hp, new Event("input", { bubbles: true }));
    await click(byText(dialog, "button[type='submit']", "Guardar palpite"));
    expect(onSaveGuess).toHaveBeenCalledWith(creature.id, { kind: "enemy", name: "", note: "", fields: { hitPoints: "uns 30" } });
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
