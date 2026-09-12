import { useState } from "react";

import { Button, ConfirmModal, InlineStatus, Input } from "@components/ui";

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
      <div className={styles.heading}><div><p className={styles.eyebrow}>Jornada</p><h1 id="campaign-panel-title">Campanhas</h1></div>{activeCampaignName ? <span className={styles.active}>Ativa: {activeCampaignName}</span> : null}</div>
      {status === "loading" ? <InlineStatus tone="info">Carregando campanhas locais…</InlineStatus> : null}
      {status === "error" ? <InlineStatus tone="error" assertive>{error ?? "Não foi possível carregar as campanhas."}</InlineStatus> : null}
      {draftPending ? <InlineStatus tone="warning">Há alterações pendentes. Trocar de campanha pedirá confirmação ao coordenador.</InlineStatus> : null}
      <div className={styles.campaignList}>
        {campaigns.length === 0 ? <p className={styles.muted}>Nenhuma campanha local criada.</p> : campaigns.map((campaign) => <article className={activeCampaignId === campaign.id ? styles.activeCampaign : styles.campaignCard} key={campaign.id}><button type="button" aria-current={activeCampaignId === campaign.id ? "true" : undefined} onClick={() => requestSelect(campaign.id)}><strong>{campaign.name}</strong><span>{campaign.description || "Sem descrição"}</span></button><Button size="sm" variant="danger" disabled={!onIntent} disabledReason={onIntent ? undefined : "Operações de campanha indisponíveis."} onClick={() => setDeleteId(campaign.id)}>Excluir</Button></article>)}
      </div>
      <form className={styles.createForm} onSubmit={(event) => { event.preventDefault(); requestCreate(); }}>
        <h2>Nova campanha</h2>
        <Input label="Nome" required value={name} error={formError || undefined} disabled={!onIntent || status === "saving"} onChange={(event) => { setName(event.currentTarget.value); if (formError) setFormError(""); }} />
        <label className={styles.field}><span>Descrição (opcional)</span><textarea value={description} disabled={!onIntent || status === "saving"} onChange={(event) => setDescription(event.currentTarget.value)} rows={3} /></label>
        <Button type="submit" disabled={!onIntent || status === "saving"}>Criar campanha</Button>
      </form>
      {deleteTarget ? <div className={styles.deletionOptions}><label><span>Alcance da exclusão</span><select value={deleteScope} onChange={(event) => setDeleteScope(event.currentTarget.value as typeof deleteScope)}><option value="campaign-and-content">Campanha e todo o conteúdo</option><option value="campaign-only">Somente registro da campanha</option></select></label><label className={styles.checkbox}><input type="checkbox" checked={backupConfirmed} onChange={(event) => setBackupConfirmed(event.currentTarget.checked)} /> <span>Confirmei o backup ou a decisão de excluir sem backup.</span></label></div> : null}
      <ConfirmModal open={deleteTarget !== undefined} title="Excluir campanha" targetName={deleteTarget?.name ?? "Campanha"} description={deleteTarget ? `A exclusão alcançará ${deleteScope === "campaign-and-content" ? "a campanha e todo o conteúdo local" : "somente o registro da campanha"}. Confirme o backup antes de continuar.` : ""} confirmLabel="Excluir campanha" destructive onClose={() => { setDeleteId(undefined); setBackupConfirmed(false); }} onConfirm={confirmDelete} />
    </section>
  );
}
