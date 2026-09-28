import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { asAccountId, asUuid } from "@domain/contracts/ids";
import type { Membership } from "@domain/contracts/cloud-sync";
import { ArrowsClockwise, GiCrossedSwords, GiPerson, WifiSlash } from "@assets/icons";
import { AppModal, Button, CampaignSigil, InlineStatus, Input, SectionCard } from "@components/ui";
import { Plus } from "@phosphor-icons/react";
import { artworkForClass } from "@assets/art/fantasy";
import { GiBrain, GiBrokenHeart, GiDeathSkull, GiHazardSign, GiHearts, GiLinkedRings, GiPoisonBottle, GiQuillInk, GiRun, GiShield, GiSkullCrossedBones, GiSparkles, GiThreeFriends } from "react-icons/gi";
import heroArt from "../../assets/art/textures/character-vigil.webp";
import type { CampaignAdjustmentTarget, CampaignCharacterAdjustment, CollaborationCharacter, CollaborationPanelProps } from "./types";
import styles from "./collaboration.module.css";

const masterTabOptions = [
  ["overview", "Resumo"],
  ["characters", "Personagens"],
  ["participants", "Participantes"],
  ["sessions", "Sessões"],
] as const;
type MasterTab = (typeof masterTabOptions)[number][0];

function statusLabel(status: Membership["status"]): string {
  return status === "active" ? "Ativo" : status === "invited" ? "Convite pendente" : "Revogado";
}

function syncCopy(state: CollaborationPanelProps["syncState"]): { readonly label: string; readonly description: string; readonly tone: "info" | "warning" | "success" } {
  switch (state) {
    case "offline": return { label: "Offline", description: "Sem conexão. Alterações locais serão enviadas quando a rede voltar.", tone: "warning" };
    case "pending": return { label: "Sincronização pendente", description: "Há convites ou vínculos aguardando confirmação.", tone: "info" };
    case "synced": return { label: "Sincronizado", description: "Convites e vínculos confirmados pela conta.", tone: "success" };
    case "error": return { label: "Falha na sincronização", description: "O servidor ainda não confirmou os convites. Confira a conexão e atualize.", tone: "warning" };
    default: return { label: "Somente neste dispositivo", description: "Participação local; nenhuma sincronização é presumida.", tone: "info" };
  }
}

type Vitality = "critical" | "wounded" | "stable" | "unknown";
const adjustmentTargets: readonly { readonly id: CampaignAdjustmentTarget; readonly label: string }[] = [
  { id: "armor-class", label: "Classe de armadura" }, { id: "initiative", label: "Iniciativa" },
  { id: "attack-roll", label: "Ataques" }, { id: "ability-check", label: "Testes de atributo" },
];
const adjustmentLabel = (target: CampaignAdjustmentTarget) => adjustmentTargets.find((option) => option.id === target)?.label ?? target;

function vitality(character: CollaborationCharacter): Vitality {
  const hp = character.hitPoints;
  if (!hp || hp.maximum === undefined || hp.maximum <= 0) return "unknown";
  if (hp.current <= 0) return "critical";
  return hp.current / hp.maximum <= 0.3 ? "wounded" : "stable";
}

function vitalityLabel(value: Vitality): string {
  return value === "critical" ? "Caído" : value === "wounded" ? "Ferido" : value === "stable" ? "Estável" : "PV indisponível";
}

function characterInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function CharacterStatusRow({ character, onEdit }: { readonly character: CollaborationCharacter; readonly onEdit?: () => void }) {
  const hp = character.hitPoints;
  const status = vitality(character);
  const maximum = hp?.maximum;
  const current = hp?.current ?? 0;
  const progress = maximum ? Math.max(0, Math.min(current, maximum)) : 0;
  const initiative = character.initiative;
  return (
    <li className={styles.rosterEntry} data-vital={status}>
      <div className={styles.rosterIdentity}>
        <span className={styles.portrait} aria-hidden="true">{characterInitials(character.name)}</span>
        <span className={styles.rosterCopy}>
          <strong>{character.name || "Personagem sem nome"}</strong>
          <small>{character.playerName || "Jogador não informado"} · {character.className || "Classe não informada"}{character.totalLevel ? ` · Nv. ${character.totalLevel}` : ""}</small>
        </span>
      </div>
      <div className={styles.vitalGroup}>
        <div className={styles.vitalNumbers}><span>PV</span><strong>{hp ? `${Math.max(0, current)} / ${maximum ?? "—"}` : "—"}</strong></div>
        {maximum ? <progress aria-label={`Pontos de vida de ${character.name}`} max={maximum} value={progress} /> : null}
        {hp && hp.temporary > 0 ? <small>+{hp.temporary} temporários</small> : null}
      </div>
      <div className={styles.rosterStats}>
        <span>CA <strong>{character.armorClass ?? "—"}</strong></span>
        <span>Inic. <strong>{initiative === undefined ? "—" : initiative >= 0 ? `+${initiative}` : initiative}</strong></span>
        {character.resources ? <span>Recursos <strong>{character.resources.available}/{character.resources.total}</strong></span> : null}
      </div>
      <div className={styles.conditionGroup}>
        <span className={styles.columnLabel}>Condições</span>
        <div className={styles.conditionList}>
          {character.conditions?.length ? character.conditions.map((condition, index) => <span className={styles.conditionChip} key={`${condition}:${index}`}>{condition}</span>) : <span className={styles.noConditions}>Nenhuma</span>}
          {character.concentration ? <span className={styles.concentrationChip}>Concentração</span> : null}
          {character.inspiration ? <span className={styles.inspirationChip}>Inspiração</span> : null}
          {character.pendingResolutions ? <span className={styles.pendingChip}>{character.pendingResolutions} pendência{character.pendingResolutions === 1 ? "" : "s"}</span> : null}
          {character.adjustments?.map((adjustment) => <span className={styles.conditionChip} data-effect={adjustment.amount > 0 ? "buff" : "debuff"} key={String(adjustment.id)} title={adjustment.reason}>{adjustmentLabel(adjustment.target)} {adjustment.amount > 0 ? "+" : ""}{adjustment.amount}</span>)}
          {status === "critical" && character.deathSaves ? <span className={styles.deathSaves}>Salv. {character.deathSaves.successes} · Falh. {character.deathSaves.failures}</span> : null}
        </div>
      </div>
      <span className={styles.vitalityBadge} data-vital={status}>{vitalityLabel(status)}</span>
      {onEdit ? <Button className={styles.editVitals} size="sm" variant="secondary" onClick={onEdit}>Ajustar estado</Button> : null}
    </li>
  );
}

const classArtworkAliases: Readonly<Record<string, string>> = {
  barbaro: "barbarian", "bárbaro": "barbarian", bardo: "bard", clerigo: "cleric", "clérigo": "cleric",
  druida: "druid", guerreiro: "fighter", ladino: "rogue", mago: "wizard", feiticeiro: "sorcerer",
  paladino: "paladin", patrulheiro: "ranger", bruxo: "warlock",
};

function Corners() {
  return <><span className={styles.cornerTl} aria-hidden="true" /><span className={styles.cornerTr} aria-hidden="true" /><span className={styles.cornerBl} aria-hidden="true" /><span className={styles.cornerBr} aria-hidden="true" /></>;
}

function formatModifier(value: number | undefined): string {
  return value === undefined ? "—" : value >= 0 ? `+${value}` : String(value);
}

function DeathSaveMarks({ label, count, tone }: { readonly label: string; readonly count: number; readonly tone: "success" | "failure" }) {
  return <span className={styles.deathMarks} data-tone={tone} aria-label={`${label}: ${count} de 3`}>
    <small>{label}</small>
    {[0, 1, 2].map((index) => <i key={index} data-filled={index < count} aria-hidden="true" />)}
  </span>;
}

function CharacterCard({ character, onEdit }: { readonly character: CollaborationCharacter; readonly onEdit?: () => void }) {
  const status = vitality(character);
  const hp = character.hitPoints;
  const maximum = hp?.maximum;
  const current = Math.max(0, hp?.current ?? 0);
  const temporary = Math.max(0, hp?.temporary ?? 0);
  const artwork = artworkForClass(classArtworkAliases[character.classId?.toLowerCase() ?? ""] ?? character.classId);
  const conditions = character.conditions ?? [];
  const adjustments = character.adjustments ?? [];
  // Barra na escala de (máximo + temporários): o trecho dourado mostra o PV extra por cima da vida.
  const scale = maximum ? maximum + temporary : 0;
  const hasEffects = conditions.length > 0 || adjustments.length > 0 || character.concentration || character.inspiration || Boolean(character.pendingResolutions);
  return <li className={styles.characterCard} data-vital={status}>
    <Corners />
    <div className={styles.cardHead}>
      <span className={styles.cardPortrait}>
        <img src={character.portraitUrl ?? artwork.src} alt="" />
        {character.totalLevel ? <span className={styles.cardLevel} aria-label={`Nível ${character.totalLevel}`}>{character.totalLevel}</span> : null}
      </span>
      <div className={styles.cardIdentity}>
        <strong>{character.name || "Personagem sem nome"}</strong>
        <span>{character.className || "Classe não informada"}{character.totalLevel ? ` · Nível ${character.totalLevel}` : ""}</span>
        <small><GiPerson aria-hidden="true" /> {character.playerName || "Jogador não informado"}</small>
      </div>
      <span className={styles.cardBadge} data-vital={status}>{status === "critical" ? <GiSkullCrossedBones aria-hidden="true" /> : status === "wounded" ? <GiBrokenHeart aria-hidden="true" /> : null}{vitalityLabel(status)}</span>
    </div>

    <div className={styles.cardHp}>
      <div className={styles.cardHpHead}>
        <span><GiHearts aria-hidden="true" /> Pontos de vida</span>
        <strong>{hp ? `${current} / ${maximum ?? "—"}` : "—"}</strong>
        {temporary > 0 ? <small>+{temporary} temp.</small> : null}
      </div>
      {maximum ? <div className={styles.cardHpBar} role="progressbar" aria-label={`Pontos de vida de ${character.name}`} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={Math.min(current, maximum)}>
        <span className={styles.cardHpFill} data-vital={status} style={{ width: `${(Math.min(current, maximum) / scale) * 100}%` }} />
        {temporary > 0 ? <span className={styles.cardHpTemp} style={{ width: `${(temporary / scale) * 100}%` }} /> : null}
      </div> : null}
    </div>

    <div className={styles.cardStats}>
      <span><GiShield aria-hidden="true" /><small>CA</small> <strong>{character.armorClass ?? "—"}</strong></span>
      <span><GiRun aria-hidden="true" /><small>Inic.</small> <strong>{formatModifier(character.initiative)}</strong></span>
      {character.resources ? <span><GiSparkles aria-hidden="true" /><small>Recursos</small> <strong>{character.resources.available}/{character.resources.total}</strong></span> : null}
    </div>

    {status === "critical" && character.deathSaves ? <div className={styles.cardDeath}>
      <GiDeathSkull aria-hidden="true" />
      <DeathSaveMarks label="Sucessos" count={character.deathSaves.successes} tone="success" />
      <DeathSaveMarks label="Falhas" count={character.deathSaves.failures} tone="failure" />
    </div> : null}

    <div className={styles.cardEffects} aria-label="Condições e efeitos">
      {hasEffects ? <>
        {conditions.map((condition, index) => <span className={styles.effectChip} data-kind="condition" key={`${condition}:${index}`}>{condition}</span>)}
        {character.concentration ? <span className={styles.effectChip} data-kind="concentration"><GiBrain aria-hidden="true" /> Concentração</span> : null}
        {character.inspiration ? <span className={styles.effectChip} data-kind="inspiration"><GiSparkles aria-hidden="true" /> Inspiração</span> : null}
        {character.pendingResolutions ? <span className={styles.effectChip} data-kind="pending">{character.pendingResolutions} pendência{character.pendingResolutions === 1 ? "" : "s"}</span> : null}
        {adjustments.map((adjustment) => <span className={styles.effectChip} data-kind={adjustment.amount > 0 ? "buff" : "debuff"} key={String(adjustment.id)} title={adjustment.reason}>{adjustmentLabel(adjustment.target)} {adjustment.amount > 0 ? "+" : ""}{adjustment.amount}</span>)}
      </> : <span className={styles.noEffects}>Sem condições ativas</span>}
    </div>

    {onEdit ? <button type="button" className={styles.cardAction} onClick={onEdit}><GiQuillInk aria-hidden="true" /> Ajustar estado</button> : null}
  </li>;
}

export function CollaborationPanel({ membership, session, campaigns = [], characters = [], activeCampaignId, activeCharacterId, syncState = "local", syncMessage, syncHydration, onRefreshSync, onOpenSession, onOpenJourney, onOpenParticipants, onCreateCharacter, onLinkCharacter, onUnlinkCharacter, conditionOptions = [], onUpdateCharacter, view }: CollaborationPanelProps) {
  const localActor = membership?.localActor?.();
  const actorId = session ? asAccountId(session.uid) : localActor?.accountId;
  const localActorId = localActor?.accountId;
  const [selectedId, setSelectedId] = useState<string>(activeCampaignId ? String(activeCampaignId) : String(campaigns[0]?.id ?? ""));
  const [members, setMembers] = useState<readonly Membership[]>([]);
  const [invitations, setInvitations] = useState<readonly Membership[]>([]);
  const [characterLinks, setCharacterLinks] = useState<readonly CollaborationCharacter[]>(characters);
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CollaborationCharacter>();
  const [editingError, setEditingError] = useState<string>();
  const [hpValue, setHpValue] = useState(0);
  const [tempHpValue, setTempHpValue] = useState(0);
  const [conditionIds, setConditionIds] = useState<readonly string[]>([]);
  const [adjustments, setAdjustments] = useState<readonly CampaignCharacterAdjustment[]>([]);
  const [adjustmentTarget, setAdjustmentTarget] = useState<CampaignAdjustmentTarget>("armor-class");
  const [adjustmentAmount, setAdjustmentAmount] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [masterTab, setMasterTab] = useState<MasterTab>("overview");
  const masterTabRefs = useRef<Partial<Record<MasterTab, HTMLButtonElement | null>>>({});
  const selectedCampaign = campaigns.find((campaign) => String(campaign.id) === selectedId);
  const sync = syncCopy(syncState);

  useEffect(() => {
    setSelectedId(activeCampaignId ? String(activeCampaignId) : String(campaigns[0]?.id ?? ""));
  }, [activeCampaignId, campaigns]);

  useEffect(() => setCharacterLinks((current) => {
    const unchanged = current.length === characters.length && current.every((item, index) => {
      const next = characters[index];
      return next !== undefined && item.id === next.id && item.campaignId === next.campaignId && item.revision === next.revision && item.ownerUid === next.ownerUid && item.portraitUrl === next.portraitUrl;
    });
    return unchanged ? current : characters;
  }), [characters]);

  async function loadMembers() {
    if (!membership || !actorId) { setMembers([]); setInvitations([]); return; }
    const received = await membership.listReceivedInvitations(actorId);
    if (received.ok) setInvitations(received.value);
    else setMessage(received.error.message);
    if (!selectedCampaign) { setMembers([]); return; }
    if (!session && localActor) {
      await membership.ensureAccount({ actorId, email: null, displayName: localActor.displayName });
      await membership.ensureCampaignOwner({ actorId, campaignId: selectedCampaign.id });
    }
    const selectedResult = await membership.listMemberships({ actorId, campaignId: selectedCampaign.id });
    if (selectedResult?.ok) setMembers(selectedResult.value);
    else if (!selectedResult.ok) setMessage(selectedResult.error.message);
  }

  useEffect(() => { void loadMembers(); }, [membership, actorId, localActorId, selectedCampaign?.id, session, syncHydration]);

  const ownMembership = useMemo(() => members.find((item) => item.accountId === actorId), [actorId, members]);
  const isMaster = ownMembership?.role === "master" && ownMembership.status === "active";
  const partyCharacters = characterLinks.filter((character) => character.campaignId === selectedCampaign?.id);
  const linkablePlayerCharacters = characterLinks.filter((character) => !character.campaignId && (character.ownerUid === actorId || (!character.ownerUid && character.id === activeCharacterId)));
  const attentionCharacters = partyCharacters.filter((character) => vitality(character) === "critical" || vitality(character) === "wounded" || Boolean(character.conditions?.length) || Boolean(character.pendingResolutions) || Boolean(character.adjustments?.some((adjustment) => adjustment.amount < 0)));
  const activeConditions = partyCharacters.reduce((total, character) => total + (character.conditions?.length ?? 0), 0);
  const concentratingCharacters = partyCharacters.filter((character) => character.concentration).length;

  function handleMasterTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, current: MasterTab) {
    const currentIndex = masterTabOptions.findIndex(([id]) => id === current);
    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % masterTabOptions.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + masterTabOptions.length) % masterTabOptions.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = masterTabOptions.length - 1;
    else return;
    event.preventDefault();
    const nextTab = masterTabOptions[nextIndex]?.[0];
    if (!nextTab) return;
    setMasterTab(nextTab);
    masterTabRefs.current[nextTab]?.focus();
  }

  async function invite() {
    if (!membership || !actorId || !selectedCampaign || !identifier.trim()) return;
    setBusy(true); setMessage(undefined);
    const result = await membership.issuePlayerInvite({ actorId, campaignId: selectedCampaign.id, playerAccountId: asAccountId(identifier.trim()) });
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setIdentifier(""); setInviteOpen(false); setMessage(session ? "Convite salvo. Confira a sincronização antes de pedir ao jogador que aceite." : "Convite salvo apenas neste dispositivo. Entre na conta do mestre para convidar alguém em outro navegador."); await loadMembers();
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
    else { setMessage("Convite aceito. Atualizando os dados da campanha…"); await onRefreshSync?.(); await loadMembers(); }
  }

  async function refreshInvitations() {
    setBusy(true);
    try { await onRefreshSync?.(); await loadMembers(); }
    finally { setBusy(false); }
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

  function openCharacterEdit(character: CollaborationCharacter) {
    setEditingCharacter(character);
    setEditingError(undefined);
    setHpValue(character.hitPoints?.current ?? 0);
    setTempHpValue(character.hitPoints?.temporary ?? 0);
    setConditionIds(character.conditionIds ?? []);
    setAdjustments(character.adjustments ?? []);
    setAdjustmentTarget("armor-class"); setAdjustmentAmount(1); setAdjustmentReason("");
  }

  function addAdjustment() {
    if (!Number.isInteger(adjustmentAmount) || adjustmentAmount === 0 || Math.abs(adjustmentAmount) > 20 || !adjustmentReason.trim()) return;
    setAdjustments((current) => [...current, { id: asUuid(crypto.randomUUID()), target: adjustmentTarget, amount: adjustmentAmount, reason: adjustmentReason.trim() }]);
    setAdjustmentAmount(1); setAdjustmentReason("");
  }

  async function saveCharacterState() {
    if (!editingCharacter || !onUpdateCharacter || !Number.isInteger(hpValue) || !Number.isInteger(tempHpValue) || hpValue < 0 || tempHpValue < 0 || (editingCharacter.hitPoints?.maximum !== undefined && hpValue > editingCharacter.hitPoints.maximum)) return;
    setBusy(true); setMessage(undefined);
    const result = await onUpdateCharacter(editingCharacter.id, editingCharacter.revision, { hp: hpValue, tempHp: tempHpValue, conditionIds, adjustments });
    setBusy(false);
    if (!result.ok) { setEditingError(result.error.message); return; }
    const adjustmentDelta = (target: CampaignAdjustmentTarget) => adjustments.filter((item) => item.target === target).reduce((sum, item) => sum + item.amount, 0) - (editingCharacter.adjustments ?? []).filter((item) => item.target === target).reduce((sum, item) => sum + item.amount, 0);
    setCharacterLinks((current) => current.map((character) => character.id === editingCharacter.id ? { ...character, revision: result.value, hitPoints: { ...character.hitPoints, current: hpValue, temporary: tempHpValue }, conditionIds, conditions: conditionIds.map((id) => conditionOptions.find((option) => String(option.ref.entityId) === id)?.name ?? id), adjustments, ...(character.armorClass !== undefined ? { armorClass: character.armorClass + adjustmentDelta("armor-class") } : {}), ...(character.initiative !== undefined ? { initiative: character.initiative + adjustmentDelta("initiative") } : {}) } : character));
    setEditingCharacter(undefined); setMessage("Estado do personagem atualizado.");
  }

  if (!membership || !actorId) return <section className={styles.panel} aria-labelledby="collaboration-title"><header className={styles.hero}><div><p className={styles.eyebrow}>MESA COMPARTILHADA</p><h1 id="collaboration-title" className={styles.title} tabIndex={-1}>Colaboração</h1><p className={styles.intro}>Convites, participantes e fichas ligadas à campanha.</p></div><CampaignSigil aria-hidden="true" /></header><InlineStatus tone="info">A identidade local ainda não está disponível. Entre em uma conta se quiser sincronizar; seus dados continuam neste dispositivo.</InlineStatus></section>;

  if (view === "characters") {
    const unlinkedCharacters = characterLinks.filter((character) => !character.campaignId);
    const maxHp = editingCharacter?.hitPoints?.maximum;
    const stepHp = (delta: number) => setHpValue((value) => Math.max(0, Math.min(maxHp ?? Number.MAX_SAFE_INTEGER, (Number.isFinite(value) ? value : 0) + delta)));
    const metrics = [
      { label: "Personagens", value: partyCharacters.length, icon: <GiThreeFriends aria-hidden="true" /> },
      { label: "Precisam de atenção", value: attentionCharacters.length, icon: <GiHazardSign aria-hidden="true" />, alert: attentionCharacters.length > 0 },
      { label: "Condições ativas", value: activeConditions, icon: <GiPoisonBottle aria-hidden="true" /> },
      { label: "Concentração", value: concentratingCharacters, icon: <GiBrain aria-hidden="true" /> },
    ];
    return <section className={styles.masterPage} aria-labelledby="campaign-characters-title">
      <header className={styles.masterHero}>
        <img className={styles.masterHeroArt} src={heroArt} alt="" aria-hidden="true" />
        <span className={styles.masterHeroFade} aria-hidden="true" />
        <div className={styles.masterHeroCopy}>
          <p className={styles.masterEyebrow}>Mesa do mestre</p>
          <h1 id="campaign-characters-title">Personagens</h1>
          <p className={styles.masterHeroSubtitle}>{selectedCampaign ? <>Os heróis de <strong>{selectedCampaign.name}</strong></> : "Nenhuma campanha selecionada"}</p>
          <span className={styles.masterHeroDivider} aria-hidden="true"><span /><GiCrossedSwords /><span /></span>
        </div>
        {onOpenParticipants || onCreateCharacter ? <div className={styles.masterHeroActions}>
          {onOpenParticipants ? <Button variant="secondary" onClick={onOpenParticipants}>Convidar jogadores</Button> : null}
          {onCreateCharacter ? <Button onClick={onCreateCharacter}><Plus size={17} aria-hidden="true" /> Criar ficha</Button> : null}
        </div> : null}
      </header>
      {message ? <InlineStatus tone={message.includes("vinculado") || message.includes("atualizado") ? "success" : "error"}>{message}</InlineStatus> : null}
      {!selectedCampaign ? <div className={styles.masterEmpty}><GiCrossedSwords aria-hidden="true" /><p>Selecione ou crie uma campanha na Jornada para reunir os personagens.</p></div> : <>
        <ul className={styles.masterStats} aria-label="Resumo do grupo">
          {metrics.map((metric) => <li key={metric.label} data-alert={metric.alert ?? false}><Corners />{metric.icon}<span>{metric.label}</span><strong>{metric.value}</strong></li>)}
        </ul>

        <section className={styles.masterPanel} aria-labelledby="campaign-party-title">
          <Corners />
          <div className={styles.masterPanelHeader}>
            <h2 id="campaign-party-title" className={styles.masterPanelTitle}>O grupo</h2>
            <span className={styles.masterPanelTagline}>{partyCharacters.length} {partyCharacters.length === 1 ? "aventureiro" : "aventureiros"} na jornada</span>
          </div>
          <span className={styles.masterPanelRule} aria-hidden="true" />
          {partyCharacters.length ? <ul className={styles.characterGrid}>{partyCharacters.map((character) => <CharacterCard key={String(character.id)} character={character} onEdit={onUpdateCharacter ? () => openCharacterEdit(character) : undefined} />)}</ul> : <div className={styles.masterEmpty}><GiThreeFriends aria-hidden="true" /><p>Nenhuma ficha vinculada a {selectedCampaign.name}. Vincule um personagem local abaixo para acompanhar o grupo.</p></div>}
        </section>

        {onLinkCharacter || onUnlinkCharacter ? <section className={styles.masterPanel} aria-labelledby="campaign-link-title">
          <Corners />
          <div className={styles.masterPanelHeader}>
            <h2 id="campaign-link-title" className={styles.masterPanelTitle}>Fichas da campanha</h2>
            <span className={styles.masterPanelTagline}>{unlinkedCharacters.length} sem campanha</span>
          </div>
          <span className={styles.masterPanelRule} aria-hidden="true" />
          <p className={styles.masterMuted}>Associe uma ficha local à campanha para exibir seus pontos de vida e condições aqui.</p>
          {unlinkedCharacters.length ? <ul className={styles.linkList}>{unlinkedCharacters.map((character) => <li key={String(character.id)}>
            <span className={styles.linkInitials} aria-hidden="true">{character.portraitUrl ? <img src={character.portraitUrl} alt="" /> : characterInitials(character.name)}</span>
            <span className={styles.linkCopy}><strong>{character.name || "Personagem sem nome"}</strong><small>{character.className || "Classe não informada"}{character.totalLevel ? ` · Nível ${character.totalLevel}` : ""}</small></span>
            {onLinkCharacter ? <button type="button" className={styles.linkButton} disabled={busy} onClick={() => void linkCharacter(character)}><GiLinkedRings aria-hidden="true" /> Vincular</button> : null}
          </li>)}</ul> : <p className={styles.masterMuted}>Não há fichas locais sem campanha.</p>}
        </section> : null}
      </>}

      <AppModal open={Boolean(editingCharacter)} title={`Estado de ${editingCharacter?.name ?? "personagem"}`} onClose={() => setEditingCharacter(undefined)}>
        <div className={styles.vitalsForm}>
          {editingError ? <InlineStatus tone="error" assertive>{editingError}</InlineStatus> : null}
          <section className={styles.vitalsBlock} aria-label="Pontos de vida">
            <div className={styles.vitalsSummary}>
              <span><GiHearts aria-hidden="true" /> Pontos de vida</span>
              <strong>{hpValue + Math.max(0, tempHpValue)}{maxHp !== undefined ? ` / ${maxHp}` : ""}</strong>
            </div>
            {maxHp ? <div className={styles.cardHpBar} aria-hidden="true">
              <span className={styles.cardHpFill} style={{ width: `${(Math.max(0, Math.min(hpValue, maxHp)) / (maxHp + Math.max(0, tempHpValue))) * 100}%` }} />
              {tempHpValue > 0 ? <span className={styles.cardHpTemp} style={{ width: `${(tempHpValue / (maxHp + tempHpValue)) * 100}%` }} /> : null}
            </div> : null}
            <div className={styles.vitalsFields}>
              <Input label="Pontos de vida" type="number" min={0} max={maxHp} value={hpValue} onChange={(event) => setHpValue(Number(event.target.value))} />
              <Input label="PV temporários" type="number" min={0} value={tempHpValue} onChange={(event) => setTempHpValue(Number(event.target.value))} />
            </div>
            <div className={styles.hpSteps} role="group" aria-label="Ajuste rápido de PV">
              {[-5, -1, 1, 5].map((delta) => <button type="button" key={delta} data-tone={delta < 0 ? "damage" : "heal"} onClick={() => stepHp(delta)}>{delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}</button>)}
              {maxHp !== undefined ? <button type="button" data-tone="heal" onClick={() => setHpValue(maxHp)}>Cheio</button> : null}
            </div>
          </section>
          <fieldset className={styles.conditionsField}>
            <legend>Condições e efeitos</legend>
            {conditionOptions.length ? <div>{conditionOptions.map((option) => { const id = String(option.ref.entityId); return <label key={id}><input type="checkbox" checked={conditionIds.includes(id)} onChange={(event) => setConditionIds((current) => event.target.checked ? [...current, id] : current.filter((entry) => entry !== id))} /><span>{option.name}</span></label>; })}</div> : <p>As condições ficam disponíveis quando o catálogo de regras estiver carregado.</p>}
          </fieldset>
          <section className={styles.adjustmentsField} aria-label="Bônus e penalidades">
            <h3>Bônus e penalidades</h3>
            <p>Valores positivos dão bônus; valores negativos aplicam penalidades às rolagens e defesas.</p>
            {adjustments.length ? <ul>{adjustments.map((adjustment) => <li key={String(adjustment.id)} data-kind={adjustment.amount > 0 ? "buff" : "debuff"}><span><strong>{adjustmentLabel(adjustment.target)} {adjustment.amount > 0 ? "+" : ""}{adjustment.amount}</strong><small>{adjustment.reason}</small></span><Button size="sm" variant="ghost" aria-label={`Remover ajuste ${adjustment.reason}`} onClick={() => setAdjustments((current) => current.filter((item) => item.id !== adjustment.id))}>Remover</Button></li>)}</ul> : null}
            <div className={styles.adjustmentInputs}>
              <label>Aplicar em<select value={adjustmentTarget} onChange={(event) => setAdjustmentTarget(event.currentTarget.value as CampaignAdjustmentTarget)}>{adjustmentTargets.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
              <Input label="Valor (+ ou −)" type="number" min={-20} max={20} value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(Number(event.target.value))} />
              <Input label="Motivo" maxLength={80} value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} placeholder="Ex.: bênção, maldição, cobertura" />
              <Button size="sm" variant="secondary" disabled={!Number.isInteger(adjustmentAmount) || adjustmentAmount === 0 || Math.abs(adjustmentAmount) > 20 || !adjustmentReason.trim()} onClick={addAdjustment}>Adicionar ajuste</Button>
            </div>
          </section>
          <div className={styles.vitalsActions}>
            <Button variant="ghost" onClick={() => setEditingCharacter(undefined)}>Cancelar</Button>
            <Button busy={busy} disabled={busy || hpValue < 0 || tempHpValue < 0 || (maxHp !== undefined && hpValue > maxHp) || !Number.isInteger(hpValue) || !Number.isInteger(tempHpValue)} onClick={() => void saveCharacterState()}>Salvar estado</Button>
          </div>
        </div>
      </AppModal>
    </section>;
  }

  if (view === "participants") return <section className={styles.focusedPage} aria-labelledby="campaign-participants-title">
    <header className={styles.focusedHeader}><div><p className={styles.eyebrow}>JORNADA · MESA COMPARTILHADA</p><h1 id="campaign-participants-title">Participantes</h1><p>{selectedCampaign ? `Pessoas convidadas para ${selectedCampaign.name}.` : "Convites recebidos e participação nas campanhas."}</p></div><div className={styles.focusedActions}>{session && onRefreshSync ? <Button variant="secondary" disabled={busy} onClick={() => void refreshInvitations()}>Sincronizar agora</Button> : null}{isMaster && selectedCampaign ? <Button onClick={() => setInviteOpen(true)}><Plus size={17} aria-hidden="true" /> Convidar jogador</Button> : null}</div></header>
    {syncState === "error" && syncMessage ? <InlineStatus tone="warning">{syncMessage}</InlineStatus> : null}
    {message ? <InlineStatus tone={message.includes("salvo") || message.includes("aceito") || message.includes("vinculado") ? "success" : "error"}>{message}</InlineStatus> : null}
    {isMaster && !session ? <InlineStatus tone="warning">Esta mesa está em modo local. Convites feitos aqui não chegam a outro navegador. Entre na conta do mestre para usar a sincronização.</InlineStatus> : null}
    {invitations.length ? <SectionCard heading="Convites recebidos" headingLevel={2}><ul className={styles.memberList}>{invitations.map((item) => <li key={`${item.campaignId}:${item.accountId}`} className={styles.member}><span>Convite para {campaigns.find((entry) => entry.id === item.campaignId)?.name ?? `campanha ${String(item.campaignId).slice(0, 8)}`}</span><Button size="sm" disabled={busy} onClick={() => void accept(String(item.campaignId))}>Aceitar convite</Button></li>)}</ul></SectionCard> : null}
    {selectedCampaign ? <div className={styles.participantPanel}><div className={styles.statusLine}><InlineStatus tone={sync.tone}>{sync.label}</InlineStatus><span>{sync.description}</span></div>{members.length ? <ul className={styles.memberList}>{members.map((item) => <li key={`${item.campaignId}:${item.accountId}`} className={styles.member}><div><strong>{item.accountId === actorId ? "Você" : localActorId && item.accountId === localActorId ? "Identidade local deste dispositivo" : item.accountId}</strong><span>{item.role === "master" ? "Mestre" : "Jogador"} · {statusLabel(item.status)}</span>{item.role === "player" ? partyCharacters.filter((character) => character.ownerUid === item.accountId).length ? partyCharacters.filter((character) => character.ownerUid === item.accountId).map((character) => <span key={String(character.id)}>Ficha: {character.name || "Personagem sem nome"}</span>) : <span>Ficha ainda não vinculada</span> : null}</div>{isMaster && item.role === "player" && item.status !== "revoked" ? <Button size="sm" variant="danger" disabled={busy} onClick={() => void revoke(item.accountId)}>Revogar</Button> : null}</li>)}</ul> : <p className={styles.empty}>Nenhum participante registrado nesta campanha.</p>}</div> : <p className={styles.emptyRoster}>Crie ou selecione uma campanha na Visão geral.</p>}
    {selectedCampaign && ownMembership?.role === "player" && ownMembership.status === "active" && onLinkCharacter ? <section className={styles.linkSection} aria-labelledby="player-character-link-title"><div><h2 id="player-character-link-title">Minha ficha na campanha</h2><p>Escolha sua ficha neste dispositivo. O convite não vincula automaticamente um personagem à sua conta.</p></div>{partyCharacters.filter((character) => character.ownerUid === actorId || (!character.ownerUid && character.id === activeCharacterId)).map((character) => <p key={String(character.id)} className={styles.helper}>{character.name || "Personagem sem nome"} · Vinculado à campanha</p>)}{linkablePlayerCharacters.length ? <ul className={styles.characterList}>{linkablePlayerCharacters.map((character) => <li key={String(character.id)} className={styles.character}><span>{character.name || "Personagem sem nome"}</span><Button size="sm" disabled={busy} onClick={() => void linkCharacter(character)}>Vincular minha ficha</Button></li>)}</ul> : null}{!linkablePlayerCharacters.length && !partyCharacters.some((character) => character.ownerUid === actorId || (!character.ownerUid && character.id === activeCharacterId)) ? <p className={styles.empty}>Selecione sua ficha em Configurações para vinculá-la à campanha.</p> : null}</section> : null}
    <AppModal open={inviteOpen} title="Convidar jogador" onClose={() => setInviteOpen(false)}><form className={styles.inviteModal} onSubmit={(event) => { event.preventDefault(); void invite(); }}><p>Informe o identificador da conta do jogador para convidá-lo à campanha.</p><Input label="UID ou identificador da conta" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="off" /><div><Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancelar</Button><Button type="submit" busy={busy} disabled={busy || !identifier.trim()}>Enviar convite</Button></div></form></AppModal>
  </section>;

  return <section className={styles.panel} aria-labelledby="collaboration-title">
    <header className={styles.hero}><div><p className={styles.eyebrow}>{isMaster ? "CENTRAL DE CAMPANHA" : "MESA COMPARTILHADA"}</p><h1 id="collaboration-title" className={styles.title} tabIndex={-1}>{isMaster ? "Mesa do mestre" : "Colaboração"}</h1><p className={styles.intro}>{session ? "Convites e alterações ficam locais primeiro e podem sincronizar com sua conta." : "Você está usando uma identidade local persistente. Mestre, jogadores e convites ficam neste dispositivo até uma conta ser vinculada."}</p></div><CampaignSigil aria-hidden="true" /></header>
    <div className={styles.statusLine}><InlineStatus tone={sync.tone}>{sync.label}</InlineStatus><span>{sync.description}</span>{syncState === "offline" ? <WifiSlash size={18} aria-label="Sem conexão" /> : syncState === "pending" ? <ArrowsClockwise size={18} aria-label="Sincronização pendente" /> : null}{session && onRefreshSync ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => void refreshInvitations()}>Sincronizar agora</Button> : null}</div>
    {syncState === "error" && syncMessage ? <InlineStatus tone="warning">{syncMessage}</InlineStatus> : null}
    {isMaster && selectedCampaign ? <section className={styles.masterOverview} aria-labelledby="master-overview-title">
      <header className={styles.masterHeading}>
        <div><p className={styles.eyebrow}>ESTADO DA COMPANHIA</p><h2 id="master-overview-title">{selectedCampaign.name}</h2><p>{partyCharacters.length} {partyCharacters.length === 1 ? "personagem vinculado" : "personagens vinculados"} à campanha.</p></div>
        <div className={styles.masterActions}><span className={styles.masterBadge}>Mestre ativo</span>{onOpenSession ? <Button variant="secondary" onClick={() => onOpenSession(selectedCampaign.id)}><GiCrossedSwords aria-hidden="true" /> Abrir sessões</Button> : null}</div>
      </header>
      <nav className={styles.masterTabs} role="tablist" aria-label="Espaços do mestre">
        {masterTabOptions.map(([id, label]) => <button key={id} ref={(element) => { masterTabRefs.current[id] = element; }} id={`master-tab-${id}`} type="button" role="tab" aria-controls={`master-panel-${id}`} aria-selected={masterTab === id} tabIndex={masterTab === id ? 0 : -1} onClick={() => setMasterTab(id)} onKeyDown={(event) => handleMasterTabKeyDown(event, id)}>{label}{id === "characters" ? <span>{partyCharacters.length}</span> : id === "participants" ? <span>{members.filter((member) => member.role === "player" && member.status === "active").length}</span> : null}</button>)}
      </nav>
      {masterTab === "overview" ? <div className={styles.masterMetrics} aria-label="Resumo do grupo">
        <div><span>Personagens</span><strong>{partyCharacters.length}</strong></div>
        <div data-alert={attentionCharacters.length > 0}><span>Precisam de atenção</span><strong>{attentionCharacters.length}</strong></div>
        <div><span>Condições ativas</span><strong>{activeConditions}</strong></div>
        <div><span>Concentração</span><strong>{concentratingCharacters}</strong></div>
      </div> : null}
      <div className={styles.masterWorkspace} id={masterTab === "participants" ? undefined : `master-panel-${masterTab}`} role={masterTab === "participants" ? undefined : "tabpanel"} aria-labelledby={masterTab === "participants" ? undefined : `master-tab-${masterTab}`} tabIndex={masterTab === "participants" ? undefined : 0}>
        {masterTab === "characters" ? <section className={styles.partySection}>
          <div className={styles.partyHeading}><div><h3>Elenco da campanha</h3><p>Vida, defesa e efeitos ativos de cada ficha.</p></div><span>{partyCharacters.length} fichas</span></div>
          {partyCharacters.length ? <ul className={styles.rosterList}>{partyCharacters.map((character) => <CharacterStatusRow key={String(character.id)} character={character} />)}</ul> : <p className={styles.emptyRoster}>Nenhuma ficha vinculada. Vincule personagens abaixo para acompanhar o estado do grupo.</p>}
        </section> : null}
        {masterTab === "overview" ? <aside className={styles.attentionPanel} aria-labelledby="attention-title">
          <p className={styles.eyebrow}>VIGILÂNCIA</p><h3 id="attention-title">Pontos de atenção</h3>
          {attentionCharacters.length ? <ul className={styles.attentionList}>{attentionCharacters.map((character) => <li key={String(character.id)}><strong>{character.name}</strong><span>{vitalityLabel(vitality(character))}{character.conditions?.length ? ` · ${character.conditions.length} condição${character.conditions.length === 1 ? "" : "ões"}` : ""}{character.pendingResolutions ? ` · ${character.pendingResolutions} decisão pendente` : ""}</span></li>)}</ul> : <p className={styles.allClear}>Nenhum alerta de vida ou condição no grupo.</p>}
          {onOpenSession ? <Button variant="secondary" onClick={() => onOpenSession(selectedCampaign.id)}>Ver sessões e presença</Button> : null}
        </aside> : null}
        {masterTab === "sessions" ? <section className={styles.sessionsIntro}><div><p className={styles.eyebrow}>CONTROLE DA MESA</p><h3>Presença, iniciativa e andamento</h3><p>Abra o registro da campanha para iniciar uma sessão, acompanhar quem está presente e organizar os turnos do encontro.</p></div>{onOpenSession ? <Button onClick={() => onOpenSession(selectedCampaign.id)}><GiCrossedSwords aria-hidden="true" /> Abrir mesa e sessões</Button> : null}</section> : null}
      </div>
    </section> : null}
    {campaigns.length === 0 ? <SectionCard heading="Campanhas" headingLevel={2}><p className={styles.empty}>Crie uma campanha para convidar jogadores.</p>{onOpenJourney ? <Button className={styles.sessionButton} onClick={onOpenJourney}>Criar campanha</Button> : null}</SectionCard> : <>
      <SectionCard heading="Campanha" headingLevel={2}><label className={styles.label} htmlFor="collaboration-campaign">Escolha a campanha</label><select id="collaboration-campaign" className={styles.select} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{campaigns.map((campaign) => <option key={String(campaign.id)} value={String(campaign.id)}>{campaign.name}</option>)}</select>{onOpenSession && selectedCampaign ? <Button className={styles.sessionButton} variant="secondary" onClick={() => onOpenSession(selectedCampaign.id)}><GiCrossedSwords aria-hidden="true" /> Abrir sessões</Button> : null}</SectionCard>
      {message ? <InlineStatus tone={message.includes("salvo") || message.includes("aceito") || message.includes("vinculado") || message.includes("desvinculado") ? "success" : "error"}>{message}</InlineStatus> : null}
      {isMaster && masterTab === "participants" ? <div id="master-panel-participants" role="tabpanel" aria-labelledby="master-tab-participants" tabIndex={0}>
        <SectionCard heading="Convidar jogador" headingLevel={2}><div className={styles.inviteForm}><Input label="UID ou identificador da conta" hint="O modelo atual aceita o AccountId; o email só funciona se for usado como identificador pela conta." value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="off" /><Button busy={busy} disabled={busy || !identifier.trim()} onClick={() => void invite()}>Enviar convite</Button></div></SectionCard>
        <SectionCard heading="Jogadores e mestre" headingLevel={2}>
          {members.length === 0 ? <p className={styles.empty}>Nenhum vínculo encontrado neste dispositivo.</p> : <ul className={styles.memberList}>{members.map((item) => <li key={`${item.campaignId}:${item.accountId}`} className={styles.member}><div><strong>{item.accountId === actorId ? "Você" : item.accountId}</strong><span>{item.role === "master" ? "Mestre" : "Jogador"} · {statusLabel(item.status)}</span></div>{item.role === "player" && item.status !== "revoked" ? <Button size="sm" variant="danger" disabled={busy} onClick={() => void revoke(item.accountId)}>Revogar</Button> : null}</li>)}</ul>}
        </SectionCard>
      </div> : !isMaster ? <SectionCard heading="Minha participação" headingLevel={2}>
        {members.length === 0 ? <p className={styles.empty}>Nenhum vínculo encontrado neste dispositivo.</p> : <ul className={styles.memberList}>{members.map((item) => <li key={`${item.campaignId}:${item.accountId}`} className={styles.member}><div><strong>{item.accountId === actorId ? "Você" : item.accountId}</strong><span>{item.role === "master" ? "Mestre" : "Jogador"} · {statusLabel(item.status)}</span></div></li>)}</ul>}
      </SectionCard> : null}
      {isMaster && masterTab === "characters" && selectedCampaign && (onLinkCharacter || onUnlinkCharacter) ? <SectionCard heading="Vincular personagens" headingLevel={2}>
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
