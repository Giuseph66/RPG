import { useState } from "react";

import { AppModal, Button, InlineStatus, Input } from "@components/ui";
import { Compass, Plus, Trash } from "@phosphor-icons/react";

import type { CampaignIntent, CampaignPanelProps, JourneySectionId } from "./types";
import styles from "./campaign.module.css";

function send(onIntent: CampaignPanelProps["onIntent"], intent: CampaignIntent): void { onIntent?.(intent); }

const SECTION_LINKS: Readonly<Record<JourneySectionId, { readonly label: string; readonly action: string; readonly stat: keyof NonNullable<CampaignPanelProps["activityStats"]> }>> = {
  map: { label: "Mapas", action: "Abrir atlas →", stat: "maps" },
  journal: { label: "Diário", action: "Ler registros →", stat: "journalEntries" },
  sessions: { label: "Sessões", action: "Acompanhar mesa →", stat: "sessions" },
  npcs: { label: "Elenco", action: "Ver criaturas →", stat: "creatures" },
};

export function CampaignPanel({ campaigns, activeCampaignId, activeCampaignName, overviewStats, activityStats, onOpenSection, metrics, sectionLinks = ["map", "journal", "sessions"], canDelete = true, eyebrow = "Jornada · visão geral", draftPending = false, status = "idle", error, onIntent, className }: CampaignPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string>();
  const [deleteScope, setDeleteScope] = useState<"campaign-only" | "campaign-and-content">("campaign-and-content");
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [formError, setFormError] = useState("");
  const deleteTarget = campaigns.find((campaign) => campaign.id === deleteId);
  const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId);
  const requestCreate = () => {
    if (!name.trim()) { setFormError("Informe um nome para a campanha."); return; }
    setFormError("");
    send(onIntent, { kind: "create-campaign", name: name.trim(), description });
    setName(""); setDescription("");
    setCreateOpen(false);
  };
  const requestSelect = (campaignId: string) => send(onIntent, draftPending ? { kind: "switch-campaign", campaignId } : { kind: "select-campaign", campaignId });
  const confirmDelete = () => { if (!deleteId || !backupConfirmed) return; send(onIntent, { kind: "delete-campaign", campaignId: deleteId, scope: deleteScope, backupConfirmed: true }); setDeleteId(undefined); setBackupConfirmed(false); };

  return (
    <section className={[styles.panel, className ?? ""].filter(Boolean).join(" ")} aria-labelledby="campaign-panel-title">
      <div className={styles.heading}>
        <div className={styles.titleBlock}><span className={styles.titleIcon} aria-hidden="true"><Compass size={22} weight="duotone" /></span><div><p className={styles.eyebrow}>{eyebrow}</p><h1 id="campaign-panel-title">{activeCampaignName || activeCampaign?.name || "Sua campanha começa aqui"}</h1><p className={styles.campaignDescription}>{activeCampaign?.description || (activeCampaignId ? "Acompanhe o que está acontecendo nesta campanha." : "Escolha uma campanha ou crie a próxima história da mesa.")}</p></div></div>
        <div className={styles.campaignControls}>
          {campaigns.length > 0 ? <label className={styles.campaignSelector}><span>Campanha ativa</span><select aria-label="Campanha ativa" value={activeCampaignId ?? ""} onChange={(event) => requestSelect(event.currentTarget.value)}><option value="" disabled>Escolha uma campanha</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label> : null}
          <Button onClick={() => setCreateOpen(true)} disabled={!onIntent}><Plus size={18} aria-hidden="true" /> Nova campanha</Button>
        </div>
      </div>
      {status === "loading" ? <InlineStatus tone="info">Carregando campanhas locais…</InlineStatus> : null}
      {status === "error" ? <InlineStatus tone="error" assertive>{error ?? "Não foi possível carregar as campanhas."}</InlineStatus> : null}
      {draftPending ? <InlineStatus tone="warning">Há alterações pendentes. Trocar de campanha pedirá confirmação ao coordenador.</InlineStatus> : null}
      {activeCampaignId ? <>
        <div className={styles.overviewMetrics} aria-label="Resumo da campanha">
          {(metrics ?? [
            { label: "Objetivos", value: overviewStats?.objectives ?? 0 },
            { label: "Missões em andamento", value: overviewStats?.activeQuests ?? 0 },
            { label: "NPCs", value: overviewStats?.npcs ?? 0 },
            { label: "Ameaças", value: overviewStats?.enemies ?? 0 },
          ]).map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}
        </div>
        <div className={styles.activityLinks} aria-label="Conteúdo da campanha">{sectionLinks.map((id) => { const link = SECTION_LINKS[id]; return <button key={id} type="button" onClick={() => onOpenSection?.(id)}><span>{link.label}</span><strong>{activityStats?.[link.stat] ?? "—"}</strong><small>{link.action}</small></button>; })}</div>
        <div className={styles.campaignFooter}><span>Campanha selecionada · {campaigns.length} {campaigns.length === 1 ? "campanha na mesa" : "campanhas na mesa"}</span>{activeCampaign && canDelete ? <Button size="sm" variant="ghost" onClick={() => setDeleteId(activeCampaign.id)}><Trash size={16} aria-hidden="true" /> Excluir campanha</Button> : null}</div>
      </> : <div className={styles.emptyCampaign}><Compass size={28} weight="duotone" aria-hidden="true" /><p><strong>Nenhuma campanha selecionada</strong><span>Crie uma campanha para reunir mapas, pessoas, sessões e memórias.</span></p></div>}
      <AppModal open={createOpen} title="Nova campanha" onClose={() => setCreateOpen(false)}>
        <form className={styles.modalForm} onSubmit={(event) => { event.preventDefault(); requestCreate(); }}>
          <p>Dê um nome à mesa. Você poderá organizar os detalhes durante a jornada.</p>
          <Input label="Nome da campanha" required autoFocus value={name} error={formError || undefined} disabled={!onIntent || status === "saving"} onChange={(event) => { setName(event.currentTarget.value); if (formError) setFormError(""); }} />
          <label className={styles.field}><span>Descrição (opcional)</span><textarea value={description} disabled={!onIntent || status === "saving"} onChange={(event) => setDescription(event.currentTarget.value)} rows={3} /></label>
          <div className={styles.modalActions}><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button type="submit" disabled={!onIntent || status === "saving"}>Criar campanha</Button></div>
        </form>
      </AppModal>
      <AppModal open={deleteTarget !== undefined} title={`Excluir ${deleteTarget?.name ?? "campanha"}`} onClose={() => { setDeleteId(undefined); setBackupConfirmed(false); }}>
        <div className={styles.modalForm}><p>Defina o alcance da exclusão antes de confirmar.</p><div className={styles.deletionOptions}><label><span>Alcance da exclusão</span><select value={deleteScope} onChange={(event) => setDeleteScope(event.currentTarget.value as typeof deleteScope)}><option value="campaign-and-content">Campanha e todo o conteúdo</option><option value="campaign-only">Somente registro da campanha</option></select></label><label className={styles.checkbox}><input type="checkbox" checked={backupConfirmed} onChange={(event) => setBackupConfirmed(event.currentTarget.checked)} /> <span>Confirmei o backup ou a decisão de excluir sem backup.</span></label></div><div className={styles.modalActions}><Button variant="ghost" onClick={() => { setDeleteId(undefined); setBackupConfirmed(false); }}>Cancelar</Button><Button variant="danger" disabled={!backupConfirmed} onClick={confirmDelete}>Excluir campanha</Button></div></div>
      </AppModal>
    </section>
  );
}
