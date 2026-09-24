import { useState } from "react";
import { AppModal, Button, InlineStatus } from "@components/ui";
import { CheckCircle, Flag, PencilSimple, Plus, Scroll, Skull, Trash, UsersThree } from "@phosphor-icons/react";
import type { NpcRecord } from "@domain/contracts/campaign";
import type { Uuid } from "@domain/contracts/ids";

import type { CampaignRecordsProps } from "./types";
import styles from "./campaign.module.css";

function NpcManager({ npcs, onIntent, availableCharacters = [], onCreateSheet, onOpenSheet, raceOptions = [], classOptions = [], onGenerateSheet }: { readonly npcs: readonly NpcRecord[]; readonly onIntent?: CampaignRecordsProps["onIntent"]; readonly availableCharacters?: CampaignRecordsProps["availableCharacters"]; readonly onCreateSheet?: () => void; readonly onOpenSheet?: (id: Uuid) => void; readonly raceOptions?: CampaignRecordsProps["raceOptions"]; readonly classOptions?: CampaignRecordsProps["classOptions"]; readonly onGenerateSheet?: CampaignRecordsProps["onGenerateSheet"] }) {
  const [filter, setFilter] = useState<"all" | "npc" | "enemy">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NpcRecord>();
  const [confirmDelete, setConfirmDelete] = useState<string>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"npc" | "enemy">("npc");
  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedRace, setSelectedRace] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const visible = npcs.filter((npc) => filter === "all" || (npc.kind ?? "npc") === filter);
  const beginCreate = (nextKind: "npc" | "enemy") => { setEditing(undefined); setName(""); setDescription(""); setKind(nextKind); setSelectedSheet(""); setSelectedRace(""); setSelectedClass(""); setGenerationError(""); setFormOpen(true); };
  const beginEdit = (npc: NpcRecord) => { setEditing(npc); setName(npc.name); setDescription(npc.description); setKind(npc.kind ?? "npc"); setSelectedSheet(npc.characterRef ? String(npc.characterRef) : ""); setSelectedRace(""); setSelectedClass(""); setGenerationError(""); setFormOpen(true); };
  const save = (generatedRef?: Uuid) => {
    if (!name.trim()) return;
    const characterRef = generatedRef ?? availableCharacters.find((character) => String(character.id) === selectedSheet)?.id ?? (selectedSheet ? editing?.characterRef : undefined);
    if (editing) onIntent?.({ kind: "update-npc", npcId: String(editing.id), patch: { name: name.trim(), description: description.trim(), kind, characterRef } });
    else onIntent?.({ kind: "create-npc", name: name.trim(), description: description.trim(), recordKind: kind, ...(characterRef ? { characterRef } : {}) });
    setFormOpen(false); setEditing(undefined); setName(""); setDescription("");
  };
  const generate = async () => {
    const raceId = raceOptions.find((option) => String(option.id) === selectedRace)?.id;
    const classId = classOptions.find((option) => String(option.id) === selectedClass)?.id;
    if (!onGenerateSheet || !name.trim() || !raceId || !classId || generating) return;
    setGenerating(true); setGenerationError("");
    try {
      const result = await onGenerateSheet({ name: name.trim(), raceId, classId });
      if (result.ok) save(result.value);
      else setGenerationError(result.error.message);
    } catch { setGenerationError("Não foi possível salvar a ficha. Tente novamente."); }
    finally { setGenerating(false); }
  };

  return <>
    <div className={styles.npcToolbar}>
      <div className={styles.npcFilters} aria-label="Filtrar elenco">
        {(["all", "npc", "enemy"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "Todos · " + npcs.length : value === "npc" ? "NPCs · " + npcs.filter((npc) => !npc.kind || npc.kind === "npc").length : "Ameaças · " + npcs.filter((npc) => npc.kind === "enemy").length}</button>)}
      </div>
      {onIntent ? <div className={styles.npcActions}><Button size="sm" variant="secondary" onClick={() => beginCreate("npc")}><Plus size={16} aria-hidden="true" /> Novo NPC</Button><Button size="sm" onClick={() => beginCreate("enemy")}><Skull size={16} aria-hidden="true" /> Nova ameaça</Button></div> : null}
    </div>
    <AppModal open={formOpen} title={editing ? "Editar registro" : kind === "enemy" ? "Nova ameaça" : "Novo NPC"} onClose={() => { if (!generating) setFormOpen(false); }} className={styles.npcDialog}><section className={styles.npcForm} aria-label={editing ? "Editar registro" : "Novo registro"}>
      <div className={styles.npcFormFields}>
        <label className={styles.field}><span>Nome</span><input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.currentTarget.value)} /></label>
        <label className={styles.field}><span>Tipo</span><select value={kind} onChange={(event) => setKind(event.currentTarget.value as "npc" | "enemy")}><option value="npc">NPC</option><option value="enemy">Ameaça / inimigo</option></select></label>
        <label className={styles.field}><span>Descrição e notas do mestre</span><textarea rows={3} maxLength={1200} value={description} onChange={(event) => setDescription(event.currentTarget.value)} placeholder="Motivação, voz, aparência, comportamento…" /></label>
        <label className={styles.field}><span>Ficha completa (opcional)</span><select value={selectedSheet} onChange={(event) => setSelectedSheet(event.currentTarget.value)}><option value="">Somente registro narrativo</option>{availableCharacters.map((character) => <option key={String(character.id)} value={String(character.id)}>{character.name}</option>)}{editing?.characterRef && !availableCharacters.some((character) => character.id === editing.characterRef) ? <option value={String(editing.characterRef)}>Ficha vinculada</option> : null}</select></label>
      </div>
      {onGenerateSheet ? <div className={styles.npcGenerator}><div><strong>Ficha completa pelas regras</strong><p>Escolha raça e classe para gerar automaticamente atributos, perícias, PV e equipamento de nível 1.</p></div><div className={styles.npcFormFields}><label className={styles.field}><span>Raça</span><select aria-label="Raça do NPC" value={selectedRace} onChange={(event) => setSelectedRace(event.currentTarget.value)}><option value="">Selecionar raça</option>{raceOptions.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}</select></label><label className={styles.field}><span>Classe</span><select aria-label="Classe do NPC" value={selectedClass} onChange={(event) => setSelectedClass(event.currentTarget.value)}><option value="">Selecionar classe</option>{classOptions.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}</select></label></div><Button size="sm" variant="secondary" disabled={!name.trim() || !selectedRace || !selectedClass || generating} onClick={() => void generate()}>{generating ? "Gerando ficha…" : editing ? "Gerar ficha e vincular" : "Gerar ficha e adicionar"}</Button>{generationError ? <InlineStatus tone="error">{generationError}</InlineStatus> : null}</div> : null}
      <div className={styles.npcFormActions}><Button size="sm" disabled={!name.trim() || generating} onClick={() => save()}>{editing ? "Salvar alterações" : "Adicionar ao elenco"}</Button><Button size="sm" variant="ghost" disabled={generating} onClick={() => setFormOpen(false)}>Cancelar</Button></div>
      <p className={styles.npcHint}>Você pode manter apenas o registro narrativo ou vincular uma ficha. {onCreateSheet ? <button type="button" className={styles.textAction} onClick={onCreateSheet}>Abrir criação manual de ficha</button> : null}</p>
    </section></AppModal>
    {visible.length === 0 ? <div className={styles.npcEmpty}><span>{filter === "enemy" ? "Nenhuma ameaça cadastrada." : filter === "npc" ? "Nenhum NPC cadastrado." : "Seu elenco ainda está vazio."}</span>{onIntent ? <small>Adicione pessoas e ameaças importantes para a campanha.</small> : null}</div> : <ul className={styles.recordList}>{visible.map((npc) => {
      const recordKind = npc.kind ?? "npc";
      return <li key={String(npc.id)} className={styles.npcRow}>
        <span className={styles.npcIcon} aria-hidden="true">{recordKind === "enemy" ? <Skull size={18} weight="duotone" /> : <UsersThree size={18} weight="duotone" />}</span>
        <div><strong>{npc.name}</strong><p>{npc.description || "Sem descrição ainda."}</p><span className={styles.recordMeta}>{recordKind === "enemy" ? "Ameaça" : "NPC"}{npc.characterRef ? " · com ficha" : " · registro narrativo"}</span>{npc.characterRef && onOpenSheet ? <button type="button" className={styles.textAction} onClick={() => onOpenSheet(npc.characterRef!)}>Abrir ficha</button> : null}{confirmDelete === String(npc.id) ? <div className={styles.deleteConfirm}><span>Remover este registro?</span><Button size="sm" variant="danger" onClick={() => { onIntent?.({ kind: "delete-npc", npcId: String(npc.id) }); setConfirmDelete(undefined); }}>Remover</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(undefined)}>Manter</Button></div> : null}</div>
        {onIntent ? <div className={styles.npcRowActions}><Button size="sm" variant="ghost" aria-label={"Editar " + npc.name} onClick={() => beginEdit(npc)}><PencilSimple size={17} aria-hidden="true" /></Button><Button size="sm" variant="ghost" aria-label={"Remover " + npc.name} onClick={() => setConfirmDelete(String(npc.id))}><Trash size={17} aria-hidden="true" /></Button></div> : null}
      </li>;
    })}</ul>}
  </>;
}

export function CampaignRecords({ quests = [], npcs = [], objectives = [], onIntent, availableCharacters, onCreateSheet, onOpenSheet, raceOptions, classOptions, onGenerateSheet, sections = ["objectives", "quests", "npcs"] }: CampaignRecordsProps) {
  const showObjectives = sections.includes("objectives");
  const showQuests = sections.includes("quests");
  const showNpcs = sections.includes("npcs");
  const layout = sections.length === 1 ? "single" : sections.length === 2 ? "summary" : "full";

  return <div className={styles.records} data-layout={layout}>
    {showObjectives ? <section aria-labelledby="campaign-objectives-title"><div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true"><Flag size={20} weight="duotone" /></span><h2 id="campaign-objectives-title">Objetivos</h2><span>{objectives.length}</span></div>{objectives.length === 0 ? <p className={styles.muted}>Nenhum objetivo registrado.</p> : <ul className={styles.objectiveList}>{objectives.map((objective, index) => <li key={String(objective) + "-" + index}>{objective}</li>)}</ul>}</section> : null}
    {showQuests ? <section aria-labelledby="campaign-quests-title"><div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true"><Scroll size={20} weight="duotone" /></span><h2 id="campaign-quests-title">Missões</h2><span>{quests.length}</span></div>{quests.length === 0 ? <p className={styles.muted}>Nenhuma missão registrada.</p> : <ul className={styles.recordList}>{quests.map((quest) => <li key={String(quest.id)}><div><strong>{quest.title}</strong><p>{quest.description}</p><span className={styles.recordMeta}>{quest.status === "completed" ? "Concluída" : quest.status === "failed" ? "Falhou" : quest.status === "abandoned" ? "Abandonada" : "Ativa"}</span></div>{quest.status === "active" ? <Button size="sm" variant="secondary" onClick={() => onIntent?.({ kind: "complete-quest", questId: String(quest.id) })}><CheckCircle size={17} aria-hidden="true" /> Concluir</Button> : null}</li>)}</ul>}</section> : null}
    {showNpcs ? <section aria-labelledby="campaign-npcs-title"><div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true"><UsersThree size={20} weight="duotone" /></span><h2 id="campaign-npcs-title">Elenco e ameaças</h2><span>{npcs.length}</span></div><NpcManager npcs={npcs} onIntent={onIntent} availableCharacters={availableCharacters} onCreateSheet={onCreateSheet} onOpenSheet={onOpenSheet} raceOptions={raceOptions} classOptions={classOptions} onGenerateSheet={onGenerateSheet} /></section> : null}
  </div>;
}
