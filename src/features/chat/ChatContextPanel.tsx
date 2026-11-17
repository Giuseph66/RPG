import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BookOpenTextIcon, BrainIcon, CaretDownIcon, CheckIcon, IdentificationCardIcon, LockSimpleIcon, MagnifyingGlassIcon, PlusIcon, ScrollIcon } from "@phosphor-icons/react";
import type { ChatService } from "@application/chat/service";
import type { ChatMemory, ChatScope } from "@application/ports/chat-agent";
import styles from "./ChatContextPanel.module.css";

type SourceKey = "rules" | "sheet" | "campaign" | "memory";
const SOURCES: readonly { readonly key: SourceKey; readonly label: string; readonly icon: ReactNode }[] = [
  { key: "rules", label: "Livro e regras", icon: <BookOpenTextIcon size={16} weight="duotone" /> },
  { key: "sheet", label: "Ficha e recursos", icon: <IdentificationCardIcon size={16} weight="duotone" /> },
  { key: "campaign", label: "Campanha e sessões", icon: <ScrollIcon size={16} weight="duotone" /> },
  { key: "memory", label: "Memórias", icon: <BrainIcon size={16} weight="duotone" /> },
];
const VISIBILITY_LABEL: Record<ChatMemory["visibility"], string> = { private: "Pessoal", party: "Grupo", master: "Somente mestre" };

export function ChatContextPanel({ service, uid, scope, options, locked, onScope, onPrompt, onError }: {
  readonly service?: ChatService; readonly uid?: string; readonly scope: ChatScope;
  readonly options?: Awaited<ReturnType<ChatService["agent"]["options"]>>;
  readonly locked: boolean; readonly onScope: (scope: ChatScope) => void;
  readonly onPrompt: (text: string) => void; readonly onError: (error: string) => void;
}) {
  const [memories, setMemories] = useState<readonly ChatMemory[]>([]);
  const [loading, setLoading] = useState(false), [removeId, setRemoveId] = useState<string>();
  useEffect(() => { setMemories([]); setRemoveId(undefined); }, [uid, scope.campaignId, scope.characterId]);

  const load = async () => {
    if (!service || !uid) return;
    setLoading(true);
    try { await service.agent.context(uid, scope); setMemories(await service.repository.listMemories(uid, scope)); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao ler memórias."); }
    finally { setLoading(false); }
  };

  const removeMemory = (memory: ChatMemory) => {
    if (!service || !uid) return;
    setLoading(true);
    void service.repository.deleteMemory(uid, memory)
      .then(() => { setMemories((items) => items.filter((item) => item.id !== memory.id)); setRemoveId(undefined); })
      .catch((error) => onError(error instanceof Error ? error.message : "Falha ao remover."))
      .finally(() => setLoading(false));
  };

  /** Rendered inside the chat info modal; nothing of this shows on the chat screen itself. */
  return <div className={styles.body}>
    {scope.master ? <p className={styles.note} data-tone="master">Contexto do mestre: esta conversa pode conter registros privados da campanha.</p> : null}
    {locked ? <p className={styles.note}>O contexto pertence a esta conversa. Para mudar personagem, campanha ou fontes, abra uma nova conversa.</p> : null}

    <section className={styles.section}>
      <h3>Conversando como</h3>
      <div className={styles.selectors}>
        <label><span>Personagem</span><select disabled={locked || !options} value={scope.characterId ?? ""} onChange={(event) => {
          const character = options?.characters.find((item) => item.id === event.currentTarget.value);
          const { characterId: _old, campaignId: _campaign, master: _master, ...rest } = scope;
          onScope({ ...rest, ...(character ? { characterId: character.id } : {}), ...(character?.campaignId ? { campaignId: character.campaignId } : scope.campaignId ? { campaignId: scope.campaignId } : {}) });
        }}><option value="">Sem ficha</option>{options?.characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Campanha</span><select disabled={locked || !options} value={scope.campaignId ?? ""} onChange={(event) => { const { campaignId: _id, master: _master, ...rest } = scope; onScope({ ...rest, ...(event.currentTarget.value ? { campaignId: event.currentTarget.value } : {}) }); }}><option value="">Sem campanha</option>{options?.campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
    </section>

    <fieldset className={styles.section} disabled={locked}>
      <legend>O Oráculo pode consultar</legend>
      <div className={styles.toggles}>
        {SOURCES.map((source) => (
          <label key={source.key} className={styles.toggle}>
            <input type="checkbox" role="switch" checked={scope[source.key]} onChange={(event) => onScope({ ...scope, [source.key]: event.currentTarget.checked })} />
            <span className={styles.toggleIcon} aria-hidden="true">{source.icon}</span>
            <span className={styles.toggleLabel}>{source.label}</span>
            <span className={styles.toggleState} aria-hidden="true">{scope[source.key] ? "Ligado" : "Desligado"}</span>
            <span className={styles.switch} aria-hidden="true"><span><CheckIcon size={12} weight="bold" /></span></span>
          </label>
        ))}
      </div>
      <p className={styles.privacy}><LockSimpleIcon size={14} weight="duotone" aria-hidden="true" />Só o que estiver marcado é enviado ao Groq. Registros privados e conteúdo do mestre seguem as permissões da campanha.</p>
    </fieldset>

    <details className={styles.memories}>
      <summary>Memórias pessoais e da campanha<CaretDownIcon className={styles.caret} size={12} weight="bold" aria-hidden="true" /></summary>
      <div className={styles.memoryActions}>
        <button type="button" className={styles.smallButton} disabled={loading || !uid} onClick={() => void load()}><MagnifyingGlassIcon size={15} aria-hidden="true" />{loading ? "Consultando…" : "Consultar memórias"}</button>
        <button type="button" className={styles.smallButton} onClick={() => onPrompt("Quero registrar uma memória. Pergunte qual fato e qual visibilidade devo usar antes de preparar a proposta.")}><PlusIcon size={15} aria-hidden="true" />Nova memória</button>
      </div>
      {!loading && !memories.length ? <p className={styles.muted}>Nenhuma memória carregada ainda.</p> : null}
      {memories.map((memory) => (
        <article className={styles.memory} key={memory.visibility + memory.id}>
          <header><strong>{memory.title}</strong><small data-visibility={memory.visibility}>{VISIBILITY_LABEL[memory.visibility]}</small></header>
          <p>{memory.body}</p>
          {removeId === memory.id ? (
            <div className={styles.confirm}>
              <p>Remover esta memória? A remoção não apaga os registros originais da campanha.</p>
              <div className={styles.memoryActions}>
                <button type="button" className={styles.smallButton} data-tone="danger" disabled={loading} onClick={() => removeMemory(memory)}>Confirmar remoção</button>
                <button type="button" className={styles.smallButton} onClick={() => setRemoveId(undefined)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className={styles.memoryActions}>
              <button type="button" className={styles.linkButton} onClick={() => onPrompt(`Quero corrigir a memória ${memory.id}, visibilidade ${memory.visibility}, intitulada ${memory.title}. Pergunte a correção e prepare uma proposta.`)}>Corrigir</button>
              <button type="button" className={styles.linkButton} data-tone="danger" onClick={() => setRemoveId(memory.id)}>Remover</button>
            </div>
          )}
        </article>
      ))}
    </details>
  </div>;
}
