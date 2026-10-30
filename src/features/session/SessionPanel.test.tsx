import { describe, expect, it, vi } from "vitest";
import { fireEvent, mount } from "@components/ui/testUtils";
import { asAccountId, asUuid } from "@domain/contracts/ids";
import { ok } from "@domain/contracts/errors";
import type { SessionService } from "@application/session";
import { SessionPanel } from "./SessionPanel";

const campaignId = asUuid("00000000-0000-4000-8000-000000000001");
const accountId = asAccountId("master-1");
const authSession = { uid: String(accountId), email: "mestre@example.com" };

function fakeSession() {
  const list = vi.fn(async () => ok([] as const));
  const create = vi.fn(async (input: { number: number; campaignId: typeof campaignId; accountId: typeof accountId }) => ok({ id: asUuid("00000000-0000-4000-8000-000000000002"), campaignId: input.campaignId, schemaVersion: 1 as const, revision: 0, number: input.number, title: "Sessão teste", notes: "", summary: "", status: "planned" as const, attendance: [], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }));
  return { list, create, start: vi.fn(), end: vi.fn(), updateNotes: vi.fn(), setAttendance: vi.fn(), get: vi.fn(), delete: vi.fn() } as unknown as SessionService;
}

function plannedSession() {
  return { id: asUuid("00000000-0000-4000-8000-000000000002"), campaignId, schemaVersion: 1 as const, revision: 0, number: 1, title: "Sessão teste", notes: "", summary: "", status: "planned" as const, attendance: [{ characterId: asUuid("00000000-0000-4000-8000-000000000003"), playerId: accountId, present: true }], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
}

describe("SessionPanel", () => {
  it("mostra fallback quando a mesa não está composta", async () => {
    const mounted = await mount(<SessionPanel />);
    expect(mounted.container.textContent).toContain("Entre em uma conta");
    await mounted.unmount();
  });

  it("cria uma sessão com número e título", async () => {
    const service = fakeSession();
    const mounted = await mount(<SessionPanel session={service} authSession={authSession} campaignId={campaignId} canManage />);
    await fireEvent([...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Nova sessão"))!, new MouseEvent("click", { bubbles: true }));
    const inputs = [...mounted.container.querySelectorAll("input")];
    const setValue = (element: HTMLInputElement, value: string) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; setter?.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true })); };
    setValue(inputs[0], "4"); setValue(inputs[1], "A ponte");
    await fireEvent([...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Criar sessão"))!, new MouseEvent("click", { bubbles: true }));
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ campaignId, accountId, number: 4, title: "A ponte" }));
    await mounted.unmount();
  });

  it("cria sessão offline com identidade local, sem authSession", async () => {
    const service = fakeSession();
    Object.assign(service, { localActor: () => ({ source: "local" as const, accountId, email: null, displayName: "Jogador local" }) });
    const mounted = await mount(<SessionPanel session={service} campaignId={campaignId} canManage />);
    await fireEvent([...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Nova sessão"))!, new MouseEvent("click", { bubbles: true }));
    const inputs = [...mounted.container.querySelectorAll("input")];
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(inputs[0], "5"); inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    await fireEvent([...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Criar sessão"))!, new MouseEvent("click", { bubbles: true }));
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ campaignId, accountId, number: 5 }));
    expect(mounted.container.textContent).toContain("identidade local neste dispositivo");
    await mounted.unmount();
  });

  it("mostra presença, preserva estado salvo e envia alterações", async () => {
    const service = fakeSession();
    const item = plannedSession();
    const setAttendance = vi.fn(async () => ok(item));
    Object.assign(service, { list: vi.fn(async () => ok([item] as const)), setAttendance });
    const mounted = await mount(<SessionPanel session={service} authSession={authSession} campaignId={campaignId} canManage characters={[{ id: item.attendance[0].characterId, name: "Artemis", playerId: accountId }]} />);
    expect(mounted.container.textContent).toContain("Presença");
    const checkbox = mounted.container.querySelector<HTMLInputElement>(`input[type="checkbox"]`)!;
    expect(checkbox.checked).toBe(true);
    checkbox.click();
    await fireEvent([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Salvar presença"))!, new MouseEvent("click", { bubbles: true }));
    expect(setAttendance).toHaveBeenCalledWith(item.id, accountId, [{ characterId: item.attendance[0].characterId, playerId: accountId, present: false }]);
    await mounted.unmount();
  });

  it("mostra erro remoto da sessão e permite tentar novamente", async () => {
    const service = fakeSession();
    const onRefreshSync = vi.fn(async () => undefined);
    const mounted = await mount(<SessionPanel session={service} authSession={authSession} campaignId={campaignId} syncState="error" syncMessage="A sessão continua neste aparelho." onRefreshSync={onRefreshSync} />);

    expect(mounted.container.textContent).toContain("Erro de sincronização");
    expect(mounted.container.textContent).toContain("A sessão continua neste aparelho.");
    const retry = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Tentar sincronizar"));
    expect(retry).toBeDefined();
    await fireEvent(retry!, new MouseEvent("click", { bubbles: true }));
    expect(onRefreshSync).toHaveBeenCalledOnce();
    await mounted.unmount();
  });

  it("recarrega sessões quando chega um snapshot remoto", async () => {
    const service = fakeSession();
    const item = plannedSession();
    const list = vi.fn()
      .mockResolvedValueOnce(ok([] as const))
      .mockResolvedValueOnce(ok([item] as const));
    Object.assign(service, { list });
    const mounted = await mount(<SessionPanel session={service} authSession={authSession} campaignId={campaignId} syncHydration={{ revision: 1 }} />);
    expect(mounted.container.textContent).toContain("Nenhuma sessão registrada ainda.");

    await mounted.rerender(<SessionPanel session={service} authSession={authSession} campaignId={campaignId} syncHydration={{ revision: 2 }} />);
    expect(list).toHaveBeenCalledTimes(2);
    expect(mounted.container.textContent).toContain("Sessão 1 · Sessão teste");
    await mounted.unmount();
  });

  it("mantém a leitura para jogador e esconde comandos do mestre", async () => {
    const service = fakeSession();
    const item = { ...plannedSession(), status: "active" as const, notes: "Resumo compartilhado", encounter: { round: 2, activeCombatantKey: "character:" + plannedSession().attendance[0].characterId, combatants: [{ entityType: "character" as const, entityId: plannedSession().attendance[0].characterId, initiative: 15 }] } };
    Object.assign(service, { list: vi.fn(async () => ok([item] as const)) });
    const mounted = await mount(<SessionPanel session={service} authSession={{ uid: "player-1", email: "jogador@example.com" }} campaignId={campaignId} canManage={false} characters={[{ id: item.attendance[0].characterId, name: "Artemis", playerId: accountId, hitPoints: { current: 7, maximum: 10 } }]} />);

    expect(mounted.container.textContent).toContain("Sessão 1 · Sessão teste");
    expect(mounted.container.textContent).toContain("Resumo compartilhado");
    expect(mounted.container.textContent).not.toContain("Nova sessão");
    expect(mounted.container.textContent).not.toContain("Encerrar");
    expect(mounted.container.textContent).not.toContain("Salvar notas");
    expect(mounted.container.textContent).toContain("Ordem do encontro");
    expect(mounted.container.textContent).toContain("PV 7/10");
    expect(mounted.container.textContent).toContain("Em turno");
    expect(mounted.container.textContent).toContain("Rodada 2");
    expect(mounted.container.textContent).not.toContain("Próximo turno");
    expect(mounted.container.textContent).not.toContain("Nova rodada");
    expect(mounted.container.querySelector("select")).toBeNull();
    expect(mounted.container.querySelector("textarea")?.readOnly).toBe(true);
    await mounted.unmount();
  });
});
