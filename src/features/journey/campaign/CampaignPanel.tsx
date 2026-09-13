import { useState } from "react";

import { Button, ConfirmModal, InlineStatus, Input } from "@components/ui";
import { Compass, Plus, Trash } from "@phosphor-icons/react";

import type { CampaignIntent, CampaignPanelProps } from "./types";
import styles from "./campaign.module.css";

function send(onIntent: CampaignPanelProps["onIntent"], intent: CampaignIntent): void { onIntent?.(intent); }

export function CampaignPanel({ campaigns, activeCampaignId, activeCampaignName, draftPending = false, status = "idle", error, onIntent, className }: CampaignPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string>();
  const [deleteScope, setDeleteScope] = useState<"campaign-only" | "campaign-and-content">("campaign-and-content");
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [formError, setFormError] = useState("");
  const deleteTarget = campaigns.find((campaign) => campaign.id === deleteId);
  const requestCreate = () => {
    if (!name.trim()) { setFormError("Informe um nome para a campanha."); return; }
    setFormError("");
    send(onIntent, { kind: "create-campaign", name: name.trim(), description });
    setName(""); setDescription("");
  };
  const requestSelect = (campaignId: string) => send(onIntent, draftPending ? { kind: "switch-campaign", campaignId } : { kind: "select-campaign", campaignId });
  const confirmDelete = () => { if (!deleteId || !backupConfirmed) return; send(onIntent, { kind: "delete-campaign", campaignId: deleteId, scope: deleteScope, backupConfirmed: true }); setDeleteId(undefined); setBackupConfirmed(false); };

  return (
    <section className={[styles.panel, className ?? ""].filter(Boolean).join(" ")} aria-labelledby="campaign-panel-title">
      <div className={styles.heading}><div className={styles.titleBlock}><span className={styles.titleIcon} aria-hidden="true"><Compass size={22} weight="duotone" /></span><div><p className={styles.eyebrow}>Jornada · campanha</p><h1 id="campaign-panel-title">{activeCampaignName || "Campanhas"}</h1><p className={styles.campaignDescription}>{campaigns.find((campaign) => campaign.id === activeCampaignId)?.description || "Escolha uma campanha para acompanhar sua próxima aventura."}</p></div></div>{activeCampaignName ? <span className={styles.active}>Ativa</span> : null}</div>
      {status === "loading" ? <InlineStatus tone="info">Carregando campanhas locais…</InlineStatus> : null}
      {status === "error" ? <InlineStatus tone="error" assertive>{error ?? "Não foi possível carregar as campanhas."}</InlineStatus> : null}
      {draftPending ? <InlineStatus tone="warning">Há alterações pendentes. Trocar de campanha pedirá confirmação ao coordenador.</InlineStatus> : null}
      <div className={styles.campaignList}>
        {campaigns.length === 0 ? <div className={styles.emptyCampaign}><Compass size={28} weight="duotone" aria-hidden="true" /><p><strong>Nenhuma campanha local</strong><span>Crie uma campanha para registrar mapas, objetivos e memórias.</span></p></div> : campaigns.map((campaign) => <article className={activeCampaignId === campaign.id ? styles.activeCampaign : styles.campaignCard} key={campaign.id}><button type="button" aria-current={activeCampaignId === campaign.id ? "true" : undefined} onClick={() => requestSelect(campaign.id)}><span className={styles.campaignMark} aria-hidden="true"><Compass size={18} weight="duotone" /></span><span><strong>{campaign.name}</strong><small>{campaign.description || "Sem descrição"}</small></span></button><Button size="sm" variant="danger" aria-label={`Excluir ${campaign.name}`} disabled={!onIntent} disabledReason={onIntent ? undefined : "Operações de campanha indisponíveis."} onClick={() => setDeleteId(campaign.id)}><Trash size={17} aria-hidden="true" /><span>Excluir</span></Button></article>)}
      </div>
      <form className={styles.createForm} onSubmit={(event) => { event.preventDefault(); requestCreate(); }}>
        <div className={styles.formHeading}><span className={styles.titleIcon} aria-hidden="true"><Plus size={20} /></span><h2>Nova campanha</h2></div>
        <Input label="Nome" required value={name} error={formError || undefined} disabled={!onIntent || status === "saving"} onChange={(event) => { setName(event.currentTarget.value); if (formError) setFormError(""); }} />
        <label className={styles.field}><span>Descrição (opcional)</span><textarea value={description} disabled={!onIntent || status === "saving"} onChange={(event) => setDescription(event.currentTarget.value)} rows={3} /></label>
        <Button type="submit" disabled={!onIntent || status === "saving"}>Criar campanha</Button>
      </form>
      {deleteTarget ? <div className={styles.deletionOptions}><label><span>Alcance da exclusão</span><select value={deleteScope} onChange={(event) => setDeleteScope(event.currentTarget.value as typeof deleteScope)}><option value="campaign-and-content">Campanha e todo o conteúdo</option><option value="campaign-only">Somente registro da campanha</option></select></label><label className={styles.checkbox}><input type="checkbox" checked={backupConfirmed} onChange={(event) => setBackupConfirmed(event.currentTarget.checked)} /> <span>Confirmei o backup ou a decisão de excluir sem backup.</span></label></div> : null}
      <ConfirmModal open={deleteTarget !== undefined} title="Excluir campanha" targetName={deleteTarget?.name ?? "Campanha"} description={deleteTarget ? `A exclusão alcançará ${deleteScope === "campaign-and-content" ? "a campanha e todo o conteúdo local" : "somente o registro da campanha"}. Confirme o backup antes de continuar.` : ""} confirmLabel="Excluir campanha" destructive onClose={() => { setDeleteId(undefined); setBackupConfirmed(false); }} onConfirm={confirmDelete} />
    </section>
  );
}
