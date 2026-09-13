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
    const mounted = await mount(<SessionPanel session={service} authSession={authSession} campaignId={campaignId} />);
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
    const mounted = await mount(<SessionPanel session={service} campaignId={campaignId} />);
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
    const mounted = await mount(<SessionPanel session={service} authSession={authSession} campaignId={campaignId} characters={[{ id: item.attendance[0].characterId, name: "Artemis", playerId: accountId }]} />);
    expect(mounted.container.textContent).toContain("Presença");
    const checkbox = mounted.container.querySelector<HTMLInputElement>(`input[type="checkbox"]`)!;
    expect(checkbox.checked).toBe(true);
    checkbox.click();
    await fireEvent([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Salvar presença"))!, new MouseEvent("click", { bubbles: true }));
    expect(setAttendance).toHaveBeenCalledWith(item.id, accountId, [{ characterId: item.attendance[0].characterId, playerId: accountId, present: false }]);
    await mounted.unmount();
  });
});
