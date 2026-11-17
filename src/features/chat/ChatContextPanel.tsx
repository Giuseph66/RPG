import { useEffect, useState } from "react";
import type { ChatService } from "@application/chat/service";
import type { ChatMemory, ChatScope } from "@application/ports/chat-agent";
import styles from "./ChatScreen.module.css";

export function ChatContextPanel({ service, uid, scope, options, locked, onScope, onPrompt, onError }: {
  readonly service?: ChatService; readonly uid?: string; readonly scope: ChatScope;
  readonly options?: Awaited<ReturnType<ChatService["agent"]["options"]>>;
  readonly locked: boolean; readonly onScope: (scope: ChatScope) => void;
  readonly onPrompt: (text: string) => void; readonly onError: (error: string) => void;
}) {
  const [memories, setMemories] = useState<readonly ChatMemory[]>([]);
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [removeId, setRemoveId] = useState<string>();
  useEffect(() => { setMemories([]); setRemoveId(undefined); }, [uid, scope.campaignId, scope.characterId]);
  const load = async () => {
    if (!service || !uid) return;
    setLoading(true);
    try { await service.agent.context(uid, scope); setMemories(await service.repository.listMemories(uid, scope)); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao ler memórias."); }
    finally { setLoading(false); }
  };
  return <details className={styles.contextPanel} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>Contexto e fontes compartilhadas{scope.characterId ? ` · ${options?.characters.find((item) => item.id === scope.characterId)?.name ?? "Personagem"}` : ""}{scope.campaignId ? ` · ${options?.campaigns.find((item) => item.id === scope.campaignId)?.name ?? "Campanha"}` : ""}</summary>
    {open ? <div className={styles.contextBody}>
      {locked ? <p>O contexto pertence a esta conversa. Para mudar personagem, campanha ou fontes, abra uma nova conversa.</p> : null}
      <div className={styles.contextSelectors}>
        <label>Personagem<select disabled={locked || !options} value={scope.characterId ?? ""} onChange={(event) => {
          const character = options?.characters.find((item) => item.id === event.currentTarget.value);
          const { characterId: _old, campaignId: _campaign, master: _master, ...rest } = scope;
          onScope({ ...rest, ...(character ? { characterId: character.id } : {}), ...(character?.campaignId ? { campaignId: character.campaignId } : scope.campaignId ? { campaignId: scope.campaignId } : {}) });
        }}><option value="">Sem ficha</option>{options?.characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Campanha<select disabled={locked || !options} value={scope.campaignId ?? ""} onChange={(event) => { const { campaignId: _id, master: _master, ...rest } = scope; onScope({ ...rest, ...(event.currentTarget.value ? { campaignId: event.currentTarget.value } : {}) }); }}><option value="">Sem campanha</option>{options?.campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <fieldset disabled={locked}><legend>Permitir consultar</legend><div className={styles.shareOptions}>{([['rules', 'Livro e regras'], ['sheet', 'Ficha e recursos'], ['campaign', 'Campanha e sessões'], ['memory', 'Memórias']] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={scope[key]} onChange={(event) => onScope({ ...scope, [key]: event.currentTarget.checked })} />{label}</label>)}</div></fieldset>
      <p>Os dados autorizados são enviados ao Groq para responder. Registros privados e conteúdo do mestre seguem as permissões da campanha.</p>
      <details><summary>Memórias pessoais e da campanha</summary>
        <button type="button" disabled={loading || !uid} onClick={() => void load()}>{loading ? "Consultando…" : "Consultar memórias"}</button>
        <button type="button" onClick={() => onPrompt("Quero registrar uma memória. Pergunte qual fato e qual visibilidade devo usar antes de preparar a proposta.")}>Nova memória</button>
        {!loading && !memories.length ? <p>Nenhuma memória carregada. Use Consultar memórias para atualizar.</p> : null}
        {memories.map((memory) => <article className={styles.memory} key={memory.visibility + memory.id}><strong>{memory.title}</strong><small>{memory.visibility === "private" ? "Pessoal" : memory.visibility === "party" ? "Grupo" : "Somente mestre"}</small><p>{memory.body}</p><button type="button" onClick={() => onPrompt(`Quero corrigir a memória ${memory.id}, visibilidade ${memory.visibility}, intitulada ${memory.title}. Pergunte a correção e prepare uma proposta.`)}>Corrigir</button><button type="button" onClick={() => setRemoveId(memory.id)}>Remover</button>{removeId === memory.id ? <div><p>Remover esta memória? A remoção não apaga os registros originais da campanha.</p><button type="button" disabled={loading} onClick={() => { if (!service || !uid) return; setLoading(true); void service.repository.deleteMemory(uid, memory).then(() => { setMemories((items) => items.filter((item) => item.id !== memory.id)); setRemoveId(undefined); }).catch((error) => onError(error instanceof Error ? error.message : "Falha ao remover.")).finally(() => setLoading(false)); }}>Confirmar remoção</button><button type="button" onClick={() => setRemoveId(undefined)}>Cancelar</button></div> : null}</article>)}
      </details>
    </div> : null}
  </details>;
}
