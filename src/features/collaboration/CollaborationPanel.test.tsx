import { describe, expect, it, vi } from "vitest";
import { fireEvent, mount } from "@components/ui/testUtils";
import { asAccountId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { ok } from "@domain/contracts/errors";
import type { MembershipService } from "@application/membership";
import { CollaborationPanel } from "./CollaborationPanel";

const campaign = { id: asUuid("00000000-0000-4000-8000-000000000001"), name: "Tumba Rubra" };
const session = { uid: "master-1", email: "mestre@example.com" };

function fakeMembership() {
  const master = { campaignId: campaign.id, accountId: asAccountId(session.uid), role: "master" as const, status: "active" as const, revision: 0, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
  const memberships = [master];
  return {
    listMemberships: vi.fn(async () => ok(memberships)),
    issuePlayerInvite: vi.fn(async ({ playerAccountId }: { playerAccountId: ReturnType<typeof asAccountId> }) => ok({ ...master, accountId: playerAccountId, role: "player" as const, status: "invited" as const })),
    revokeMembership: vi.fn(async () => ok(master)),
    acceptInvite: vi.fn(async () => ok(master)),
  } as unknown as MembershipService;
}

describe("CollaborationPanel", () => {
  it("explica a necessidade de conta no modo local", async () => {
    const mounted = await mount(<CollaborationPanel />);
    expect(mounted.container.textContent).toContain("Entre em uma conta");
    await mounted.unmount();
  });

  it("lista o mestre e envia convite pelo identificador suportado", async () => {
    const membership = fakeMembership();
    const mounted = await mount(<CollaborationPanel membership={membership} session={session} campaigns={[campaign]} />);
    const participantsTab = [...mounted.container.querySelectorAll('[role="tab"]')].find((item) => item.textContent?.includes("Participantes"))!;
    await fireEvent(participantsTab, new MouseEvent("click", { bubbles: true }));
    expect(mounted.container.textContent).toContain("Você");
    const input = mounted.container.querySelector("input") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, "player-2");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const button = [...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Enviar convite"));
    await fireEvent(button!, new MouseEvent("click", { bubbles: true }));
    expect(membership.issuePlayerInvite).toHaveBeenCalledWith(expect.objectContaining({ playerAccountId: asAccountId("player-2") }));
    await mounted.unmount();
  });

  it("navega as abas do mestre pelo teclado e associa cada conteúdo à sua aba", async () => {
    const membership = fakeMembership();
    const mounted = await mount(<CollaborationPanel membership={membership} session={session} campaigns={[campaign]} />);
    const tab = (name: string) => [...mounted.container.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((item) => item.textContent?.includes(name))!;
    const overview = tab("Resumo");
    expect(overview.tabIndex).toBe(0);
    expect(mounted.container.querySelector(`#${overview.getAttribute("aria-controls")}`)?.getAttribute("role")).toBe("tabpanel");

    await fireEvent(overview, new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    const characters = tab("Personagens");
    expect(characters.getAttribute("aria-selected")).toBe("true");
    expect(mounted.container.ownerDocument.activeElement).toBe(characters);
    expect(mounted.container.querySelector(`#${characters.getAttribute("aria-controls")}`)?.getAttribute("aria-labelledby")).toBe(characters.id);

    await fireEvent(characters, new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    const sessions = tab("Sessões");
    expect(sessions.getAttribute("aria-selected")).toBe("true");
    expect(mounted.container.querySelector(`#${sessions.getAttribute("aria-controls")}`)?.getAttribute("role")).toBe("tabpanel");
    await mounted.unmount();
  });

  it("opera com identidade local persistente sem sessão Firebase", async () => {
    const localAccount = asAccountId("local-device-1");
    const membership = fakeMembership();
    Object.assign(membership, {
      localActor: () => ({ source: "local" as const, accountId: localAccount, email: null, displayName: "Jogador local" }),
      ensureAccount: vi.fn(async () => ok({})),
      ensureCampaignOwner: vi.fn(async () => ok({ campaignId: campaign.id, accountId: localAccount, role: "master" as const, status: "active" as const, revision: 0, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" })),
      listMemberships: vi.fn(async () => ok([{ campaignId: campaign.id, accountId: localAccount, role: "master" as const, status: "active" as const, revision: 0, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }])),
    });
    const mounted = await mount(<CollaborationPanel membership={membership} campaigns={[campaign]} />);
    expect(mounted.container.textContent).toContain("identidade local persistente");
    const participantsTab = [...mounted.container.querySelectorAll('[role="tab"]')].find((item) => item.textContent?.includes("Participantes"))!;
    await fireEvent(participantsTab, new MouseEvent("click", { bubbles: true }));
    expect(mounted.container.textContent).toContain("Jogadores e mestre");
    expect((membership as any).ensureCampaignOwner).toHaveBeenCalled();
    await mounted.unmount();
  });

  it("permite ao mestre vincular e desvincular ficha local", async () => {
    const membership = fakeMembership();
    const character = { id: asUuid("00000000-0000-4000-8000-000000000011"), name: "Artemis", revision: asRevision(2) };
    const onLinkCharacter = vi.fn(async () => ok(asRevision(3)));
    const onUnlinkCharacter = vi.fn(async () => ok(asRevision(4)));
    const mounted = await mount(<CollaborationPanel membership={membership} session={session} campaigns={[campaign]} characters={[character]} onLinkCharacter={onLinkCharacter} onUnlinkCharacter={onUnlinkCharacter} />);
    const charactersTab = [...mounted.container.querySelectorAll('[role="tab"]')].find((item) => item.textContent?.includes("Personagens"))!;
    await fireEvent(charactersTab, new MouseEvent("click", { bubbles: true }));
    const link = [...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Vincular"));
    await fireEvent(link!, new MouseEvent("click", { bubbles: true }));
    expect(onLinkCharacter).toHaveBeenCalledWith(character.id, campaign.id, character.revision);
    expect(mounted.container.textContent).toContain("Vinculado a esta campanha");
    const unlink = [...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Desvincular"));
    await fireEvent(unlink!, new MouseEvent("click", { bubbles: true }));
    expect(onUnlinkCharacter).toHaveBeenCalledWith(character.id, campaign.id, asRevision(3));
    expect(mounted.container.textContent).toContain("Sem campanha");
    await mounted.unmount();
  });

  it("protege fichas ligadas a outra campanha", async () => {
    const membership = fakeMembership();
    const otherCampaign = asUuid("00000000-0000-4000-8000-000000000012");
    const mounted = await mount(<CollaborationPanel membership={membership} session={session} campaigns={[campaign]} characters={[{ id: asUuid("00000000-0000-4000-8000-000000000013"), name: "Protegida", campaignId: otherCampaign, revision: asRevision(1) }]} onLinkCharacter={vi.fn()} />);
    const charactersTab = [...mounted.container.querySelectorAll('[role="tab"]')].find((item) => item.textContent?.includes("Personagens"))!;
    await fireEvent(charactersTab, new MouseEvent("click", { bubbles: true }));
    expect(mounted.container.textContent).toContain("ligadas a outra campanha");
    expect([...mounted.container.querySelectorAll("button")].some((item) => item.textContent?.includes("Vincular"))).toBe(false);
    await mounted.unmount();
  });

  it("mostra somente a campanha ativa e permite ao mestre ajustar PV", async () => {
    const membership = fakeMembership();
    const character = { id: asUuid("00000000-0000-4000-8000-000000000021"), name: "Artemis", campaignId: campaign.id, revision: asRevision(2), hitPoints: { current: 8, temporary: 0, maximum: 12 } };
    const other = { id: asUuid("00000000-0000-4000-8000-000000000022"), name: "Outro grupo", campaignId: asUuid("00000000-0000-4000-8000-000000000023"), revision: asRevision(1) };
    const onUpdateCharacter = vi.fn(async () => ok(asRevision(3)));
    const mounted = await mount(<CollaborationPanel view="characters" membership={membership} session={session} campaigns={[campaign]} activeCampaignId={campaign.id} characters={[character, other]} onUpdateCharacter={onUpdateCharacter} />);
    expect(mounted.container.textContent).toContain("Artemis");
    expect(mounted.container.textContent).not.toContain("Outro grupo");
    const edit = [...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Ajustar estado"))!;
    await fireEvent(edit, new MouseEvent("click", { bubbles: true }));
    const hp = mounted.container.querySelector('[role="dialog"] input[type="number"]') as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(hp, "6");
    await fireEvent(hp, new Event("input", { bubbles: true }));
    const save = [...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Salvar estado"))!;
    await fireEvent(save, new MouseEvent("click", { bubbles: true }));
    expect(onUpdateCharacter).toHaveBeenCalledWith(character.id, character.revision, { hp: 6, tempHp: 0, conditionIds: [], adjustments: [] });
    expect(mounted.container.textContent).toContain("6 / 12");
    await mounted.unmount();
  });

  it("aplica uma penalidade numérica com motivo à ficha da campanha", async () => {
    const membership = fakeMembership();
    const character = { id: asUuid("00000000-0000-4000-8000-000000000031"), name: "Iris", campaignId: campaign.id, revision: asRevision(1), hitPoints: { current: 10, temporary: 0, maximum: 10 }, armorClass: 15 };
    const onUpdateCharacter = vi.fn(async () => ok(asRevision(2)));
    const mounted = await mount(<CollaborationPanel view="characters" membership={membership} session={session} campaigns={[campaign]} activeCampaignId={campaign.id} characters={[character]} onUpdateCharacter={onUpdateCharacter} />);
    await fireEvent([...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Ajustar estado"))!, new MouseEvent("click", { bubbles: true }));
    const amount = mounted.container.querySelector('input[min="-20"]') as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(amount, "-2");
    await fireEvent(amount, new Event("input", { bubbles: true }));
    const reason = mounted.container.querySelector('input[placeholder^="Ex.:"]') as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(reason, "Maldição");
    await fireEvent(reason, new Event("input", { bubbles: true }));
    await fireEvent([...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Adicionar ajuste"))!, new MouseEvent("click", { bubbles: true }));
    await fireEvent([...mounted.container.querySelectorAll("button")].find((item) => item.textContent?.includes("Salvar estado"))!, new MouseEvent("click", { bubbles: true }));
    expect(onUpdateCharacter).toHaveBeenCalledWith(character.id, character.revision, expect.objectContaining({ adjustments: [expect.objectContaining({ target: "armor-class", amount: -2, reason: "Maldição" })] }));
    expect(mounted.container.textContent).toContain("CA 13");
    await mounted.unmount();
  });
});
