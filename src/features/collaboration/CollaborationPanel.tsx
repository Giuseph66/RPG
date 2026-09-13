import { useEffect, useMemo, useState } from "react";
import { asAccountId, asUuid } from "@domain/contracts/ids";
import type { Membership } from "@domain/contracts/cloud-sync";
import { ArrowsClockwise, GiCrossedSwords, GiPerson, WifiSlash } from "@assets/icons";
import { Button, CampaignSigil, InlineStatus, Input, SectionCard } from "@components/ui";
import type { CollaborationCharacter, CollaborationPanelProps } from "./types";
import styles from "./collaboration.module.css";

function statusLabel(status: Membership["status"]): string {
  return status === "active" ? "Ativo" : status === "invited" ? "Convite pendente" : "Revogado";
}

function syncCopy(state: CollaborationPanelProps["syncState"]): { readonly label: string; readonly description: string; readonly tone: "info" | "warning" | "success" } {
  switch (state) {
    case "offline": return { label: "Offline", description: "Sem conexão. Alterações locais serão enviadas quando a rede voltar.", tone: "warning" };
    case "pending": return { label: "Sincronização pendente", description: "Há convites ou vínculos aguardando confirmação.", tone: "info" };
    case "synced": return { label: "Sincronizado", description: "Convites e vínculos confirmados pela conta.", tone: "success" };
    default: return { label: "Somente neste dispositivo", description: "Participação local; nenhuma sincronização é presumida.", tone: "info" };
  }
}

export function CollaborationPanel({ membership, session, campaigns = [], characters = [], activeCampaignId, syncState = "local", onOpenSession, onLinkCharacter, onUnlinkCharacter }: CollaborationPanelProps) {
  const localActor = membership?.localActor?.();
  const actorId = session ? asAccountId(session.uid) : localActor?.accountId;
  const localActorId = localActor?.accountId;
  const [selectedId, setSelectedId] = useState<string>(activeCampaignId ? String(activeCampaignId) : String(campaigns[0]?.id ?? ""));
  const [members, setMembers] = useState<readonly Membership[]>([]);
  const [allMembers, setAllMembers] = useState<readonly Membership[]>([]);
  const [characterLinks, setCharacterLinks] = useState<readonly CollaborationCharacter[]>(characters);
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const selectedCampaign = campaigns.find((campaign) => String(campaign.id) === selectedId);
  const sync = syncCopy(syncState);

  useEffect(() => {
    setSelectedId(activeCampaignId ? String(activeCampaignId) : String(campaigns[0]?.id ?? ""));
  }, [activeCampaignId, campaigns]);

  useEffect(() => setCharacterLinks((current) => {
    const unchanged = current.length === characters.length && current.every((item, index) => {
      const next = characters[index];
      return next !== undefined && item.id === next.id && item.campaignId === next.campaignId && item.revision === next.revision;
    });
    return unchanged ? current : characters;
  }), [characters]);

  async function loadMembers() {
    if (!membership || !actorId || !selectedCampaign) { setMembers([]); return; }
    if (!session && localActor) {
      await membership.ensureAccount({ actorId, email: null, displayName: localActor.displayName });
      await membership.ensureCampaignOwner({ actorId, campaignId: selectedCampaign.id });
    }
    const results = await Promise.all(campaigns.map((campaign) => membership.listMemberships({ actorId, campaignId: campaign.id })));
    const selectedResult = results[campaigns.findIndex((campaign) => campaign.id === selectedCampaign.id)];
    if (selectedResult?.ok) setMembers(selectedResult.value);
    else if (selectedResult && !selectedResult.ok) setMessage(selectedResult.error.message);
    setAllMembers(results.flatMap((result) => result.ok ? [...result.value] : []));
  }

  useEffect(() => { void loadMembers(); }, [membership, actorId, localActorId, selectedCampaign?.id, session]);

  const ownMembership = useMemo(() => members.find((item) => item.accountId === actorId), [actorId, members]);
  const isMaster = ownMembership?.role === "master" && ownMembership.status === "active";
  const invitations = allMembers.filter((item) => item.accountId === actorId && item.status === "invited");

  async function invite() {
    if (!membership || !actorId || !selectedCampaign || !identifier.trim()) return;
    setBusy(true); setMessage(undefined);
    const result = await membership.issuePlayerInvite({ actorId, campaignId: selectedCampaign.id, playerAccountId: asAccountId(identifier.trim()) });
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setIdentifier(""); setMessage("Convite salvo localmente e aguardando sincronização."); await loadMembers();
  }

  async function revoke(accountId: string) {
    if (!membership || !actorId || !selectedCampaign) return;
    setBusy(true); setMessage(undefined);
    const result = await membership.revokeMembership({ actorId, campaignId: selectedCampaign.id, playerAccountId: asAccountId(accountId) });
    setBusy(false);
    if (!result.ok) setMessage(result.error.message);
    else { setMessage("Acesso revogado."); await loadMembers(); }
  }

  async function accept(campaignId: string) {
    if (!membership || !actorId) return;
    setBusy(true); setMessage(undefined);
    const result = await membership.acceptInvite({ actorId, campaignId: asUuid(campaignId), playerAccountId: actorId });
    setBusy(false);
    if (!result.ok) setMessage(result.error.message);
    else { setMessage("Convite aceito."); await loadMembers(); }
  }

  async function linkCharacter(character: CollaborationCharacter) {
    if (!selectedCampaign || !onLinkCharacter) return;
    setBusy(true); setMessage(undefined);
    const result = await onLinkCharacter(character.id, selectedCampaign.id, character.revision);
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setCharacterLinks((current) => current.map((item) => item.id === character.id ? { ...item, campaignId: selectedCampaign.id, revision: result.value } : item));
    setMessage("Personagem vinculado à campanha.");
  }

  async function unlinkCharacter(character: CollaborationCharacter) {
    if (!selectedCampaign || !onUnlinkCharacter) return;
    setBusy(true); setMessage(undefined);
    const result = await onUnlinkCharacter(character.id, selectedCampaign.id, character.revision);
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setCharacterLinks((current) => current.map((item) => item.id === character.id ? { ...item, campaignId: undefined, revision: result.value } : item));
    setMessage("Personagem desvinculado da campanha.");
  }

  if (!membership || !actorId) return <section className={styles.panel} aria-labelledby="collaboration-title"><header className={styles.hero}><div><p className={styles.eyebrow}>MESA COMPARTILHADA</p><h1 id="collaboration-title" className={styles.title} tabIndex={-1}>Colaboração</h1><p className={styles.intro}>Convites, participantes e fichas ligadas à campanha.</p></div><CampaignSigil aria-hidden="true" /></header><InlineStatus tone="info">A identidade local ainda não está disponível. Entre em uma conta se quiser sincronizar; seus dados continuam neste dispositivo.</InlineStatus></section>;

  return <section className={styles.panel} aria-labelledby="collaboration-title">
    <header className={styles.hero}><div><p className={styles.eyebrow}>MESA COMPARTILHADA</p><h1 id="collaboration-title" className={styles.title} tabIndex={-1}>Colaboração</h1><p className={styles.intro}>{session ? "Convites e alterações ficam locais primeiro e podem sincronizar com sua conta." : "Você está usando uma identidade local persistente. Mestre, jogadores e convites ficam neste dispositivo até uma conta ser vinculada."}</p></div><CampaignSigil aria-hidden="true" /></header>
    <div className={styles.statusLine}><InlineStatus tone={sync.tone}>{sync.label}</InlineStatus><span>{sync.description}</span>{syncState === "offline" ? <WifiSlash size={18} aria-label="Sem conexão" /> : syncState === "pending" ? <ArrowsClockwise size={18} aria-label="Sincronização pendente" /> : null}</div>
    {campaigns.length === 0 ? <SectionCard heading="Campanhas" headingLevel={2}><p className={styles.empty}>Crie uma campanha para convidar jogadores.</p></SectionCard> : <>
      <SectionCard heading="Campanha" headingLevel={2}><label className={styles.label} htmlFor="collaboration-campaign">Escolha a campanha</label><select id="collaboration-campaign" className={styles.select} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{campaigns.map((campaign) => <option key={String(campaign.id)} value={String(campaign.id)}>{campaign.name}</option>)}</select>{onOpenSession && selectedCampaign ? <Button className={styles.sessionButton} variant="secondary" onClick={() => onOpenSession(selectedCampaign.id)}><GiCrossedSwords aria-hidden="true" /> Abrir sessões</Button> : null}</SectionCard>
      {message ? <InlineStatus tone={message.includes("salvo") || message.includes("aceito") || message.includes("vinculado") || message.includes("desvinculado") ? "success" : "error"}>{message}</InlineStatus> : null}
      {isMaster ? <SectionCard heading="Convidar jogador" headingLevel={2}><div className={styles.inviteForm}><Input label="UID ou identificador da conta" hint="O modelo atual aceita o AccountId; o email só funciona se for usado como identificador pela conta." value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="off" /><Button busy={busy} disabled={busy || !identifier.trim()} onClick={() => void invite()}>Enviar convite</Button></div></SectionCard> : null}
      <SectionCard heading={isMaster ? "Jogadores e mestre" : "Minha participação"} headingLevel={2}>
        {members.length === 0 ? <p className={styles.empty}>Nenhum vínculo encontrado neste dispositivo.</p> : <ul className={styles.memberList}>{members.map((item) => <li key={`${item.campaignId}:${item.accountId}`} className={styles.member}><div><strong>{item.accountId === actorId ? "Você" : item.accountId}</strong><span>{item.role === "master" ? "Mestre" : "Jogador"} · {statusLabel(item.status)}</span></div>{isMaster && item.role === "player" && item.status !== "revoked" ? <Button size="sm" variant="danger" disabled={busy} onClick={() => void revoke(item.accountId)}>Revogar</Button> : null}</li>)}</ul>}
      </SectionCard>
      {isMaster && selectedCampaign && (onLinkCharacter || onUnlinkCharacter) ? <SectionCard heading="Personagens da campanha" headingLevel={2}>
        <p className={styles.helper}>Escolha fichas locais para a presença das sessões. Fichas ligadas a outra campanha ficam protegidas.</p>
        {characterLinks.length === 0 ? <p className={styles.empty}>Nenhum personagem local disponível.</p> : <>
          <ul className={styles.characterList}>
            {characterLinks.filter((character) => character.campaignId === selectedCampaign.id).map((character) => <li key={String(character.id)} className={styles.character}>
              <div><strong>{character.name || "Personagem sem nome"}</strong><span>Vinculado a esta campanha</span></div>
              {onUnlinkCharacter ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => void unlinkCharacter(character)}>Desvincular</Button> : null}
            </li>)}
            {characterLinks.filter((character) => character.campaignId === undefined).map((character) => <li key={String(character.id)} className={styles.character}>
              <div><strong>{character.name || "Personagem sem nome"}</strong><span>Sem campanha</span></div>
              {onLinkCharacter ? <Button size="sm" disabled={busy} onClick={() => void linkCharacter(character)}>Vincular</Button> : null}
            </li>)}
          </ul>
          {characterLinks.some((character) => character.campaignId !== undefined && character.campaignId !== selectedCampaign.id) ? <p className={styles.protected}>Algumas fichas estão ligadas a outra campanha e não podem ser movidas por este atalho.</p> : null}
        </>}
      </SectionCard> : null}
    </>}
    {invitations.length > 0 ? <SectionCard heading="Convites recebidos" headingLevel={2}><ul className={styles.memberList}>{invitations.map((item) => <li key={`${item.campaignId}:${item.accountId}`} className={styles.member}><span><GiPerson aria-hidden="true" /> Convite para {selectedCampaign?.name ?? item.campaignId}</span><Button size="sm" disabled={busy} onClick={() => void accept(String(item.campaignId))}>Aceitar</Button></li>)}</ul></SectionCard> : null}
  </section>;
}
