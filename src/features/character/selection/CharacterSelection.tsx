import { Button, InlineStatus, SectionCard } from "@components/ui";
import { artworkForClass } from "../../../assets/art/fantasy";
import type { CharacterSelectionProps } from "./types";
import { DRAFT_STEP_LABELS } from "./types";
import styles from "./character-selection.module.css";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível carregar seus personagens.";
}


function classArtwork(classId?: string) {
  const aliases: Readonly<Record<string, string>> = { guerreiro: "fighter", paladino: "paladin", ladino: "rogue", mago: "wizard", feiticeiro: "sorcerer", clérigo: "cleric", clerigo: "cleric", bárbaro: "barbarian", barbaro: "barbarian", patrulheiro: "ranger", bardo: "bard", bruxo: "warlock", druida: "druid" };
  const key = String(classId ?? "").toLowerCase();
  return artworkForClass(aliases[key] ?? key);
}

export function CharacterSelection({ characters = [], drafts = [], status = "idle", error, onSelect, onCreate, onResumeDraft, onRetry, resolveClassName }: CharacterSelectionProps) {
  const className = (classId: string) => resolveClassName?.(classId) ?? classId;
  if (status === "loading") return <section className={styles.state} aria-live="polite"><span className={styles.stateMark} aria-hidden="true">◌</span><h1>Carregando personagens</h1><p>Buscando fichas e rascunhos salvos.</p></section>;
  if (status === "error") return <section className={styles.state} aria-labelledby="selection-error-title"><span className={styles.stateMark} aria-hidden="true">!</span><h1 id="selection-error-title">Não foi possível carregar</h1><p>{errorMessage(error)}</p>{onRetry ? <Button onClick={onRetry}>Tentar novamente</Button> : null}</section>;
  if (characters.length === 0 && drafts.length === 0) return <section className={styles.state} aria-labelledby="selection-empty-title"><span className={styles.stateMark} aria-hidden="true">✦</span><h1 id="selection-empty-title">Nenhum personagem ainda</h1><p>Nenhum personagem selecionado. Crie sua primeira ficha para começar uma jornada.</p><Button onClick={onCreate}>Criar personagem</Button></section>;
  return <section className={styles.selection} aria-labelledby="selection-title"><header className={styles.header}><div><p className={styles.eyebrow}>ELENCO</p><h1 id="selection-title">Escolha um personagem</h1></div><Button onClick={onCreate}>Criar personagem</Button></header>{drafts.length ? <SectionCard heading="Rascunhos" headingLevel={2}><div className={styles.cards}>{drafts.map((draft) => <article className={[styles.card, styles.draftCard].join(" ")} key={draft.id}><div className={styles.cardBody}><h3>{draft.name || "Criação em andamento"}</h3><p>Etapa: {DRAFT_STEP_LABELS[draft.currentStep] ?? draft.currentStep}</p><p className={styles.muted}>Atualizado em {new Date(draft.updatedAt).toLocaleDateString("pt-BR")}</p></div>{onResumeDraft ? <Button variant="secondary" onClick={() => onResumeDraft(draft.id)}>Retomar rascunho</Button> : null}</article>)}</div></SectionCard> : null}{characters.length ? <SectionCard heading="Personagens" headingLevel={2}><div className={styles.cards}>{characters.map((character) => { const artwork = classArtwork(character.classSummary[0]?.classId); return <article className={styles.card} key={character.id}><div className={styles.cardArt}><img src={artwork.src} alt={artwork.alt} /></div><div className={styles.cardBody}><h3>{character.name || "Personagem sem nome"}</h3><p>{character.classSummary.map((entry) => `${className(String(entry.classId))} ${entry.level}`).join(" · ") || "Classe pendente"} · nível {character.totalLevel}</p><p className={styles.muted}>Atualizado em {new Date(character.updatedAt).toLocaleDateString("pt-BR")}</p></div><Button variant="secondary" onClick={() => onSelect?.(character.id)}>Selecionar</Button></article>; })}</div></SectionCard> : null}{error ? <InlineStatus tone="warning">{errorMessage(error)}</InlineStatus> : null}</section>;
}
