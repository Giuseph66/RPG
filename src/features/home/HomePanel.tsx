import type { ReactNode } from "react";
import { Button, ProgressBar } from "@components/ui";
import { GiCrossedSwords, GiPerson, GiScrollUnfurled, GiSpellBook, GiShield } from "@assets/icons";
import { artworkForClass, defaultAdventurer } from "../../assets/art/fantasy";
import type { HomePanelProps } from "./types";
import styles from "./home.module.css";

const CLASS_ALIASES: Readonly<Record<string, string>> = { guerreiro: "fighter", paladino: "paladin", ladino: "rogue", mago: "wizard", feiticeiro: "sorcerer", clérigo: "cleric", clerigo: "cleric", bárbaro: "barbarian", barbaro: "barbarian", patrulheiro: "ranger", bardo: "bard", bruxo: "warlock", druida: "druid" };

function artworkFor(classId?: string) {
  if (!classId) return defaultAdventurer;
  const key = classId.toLowerCase();
  return artworkForClass(CLASS_ALIASES[key] ?? key);
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

interface Shortcut {
  readonly path: string;
  readonly title: string;
  readonly hint: string;
  readonly icon: ReactNode;
}

/** Atalhos fixos: levam aos destinos da navegação principal sem repetir o menu. */
const SHORTCUTS: readonly Shortcut[] = [
  { path: "/actions", title: "Ações", hint: "Ataques, magias e descansos", icon: <GiCrossedSwords aria-hidden="true" /> },
  { path: "/journey", title: "Jornada", hint: "Mapa, diário e criaturas", icon: <GiScrollUnfurled aria-hidden="true" /> },
  { path: "/compendium", title: "Regras", hint: "Consulte o pack local", icon: <GiSpellBook aria-hidden="true" /> },
  { path: "/account", title: "Conta", hint: "Mesa, convites e sincronia", icon: <GiPerson aria-hidden="true" /> },
  { path: "/data", title: "Backup", hint: "Exportar e recuperar dados", icon: <GiShield aria-hidden="true" /> },
];

/**
 * Tela inicial (`/`): retoma a ficha ativa, mostra a campanha em andamento e dá atalhos.
 * Sem ficha, vira o convite para criar a primeira — as Regras e os dados seguem à mão.
 */
export function HomePanel({ status = "idle", character, campaign, draft, characterCount = 0, signedIn = false, onOpenCharacter, onCreateCharacter, onResumeDraft, onNavigate }: HomePanelProps) {
  if (status === "loading") {
    return <section className={styles.state} aria-live="polite" aria-busy="true"><h1>Abrindo a mesa</h1><p>Buscando a ficha ativa deste aparelho.</p></section>;
  }

  const art = artworkFor(character?.classId);
  const hp = character?.hp;
  const hasMaximum = hp?.maximum !== undefined && hp.maximum > 0;
  const go = (to: string) => () => onNavigate?.(to);

  return (
    <section className={styles.home} aria-labelledby="home-title">
      <header className={styles.hero}>
        <img className={styles.heroArt} src={art.src} alt="" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{character ? "SEU PERSONAGEM" : "PRIMEIRA RODADA"}</p>
          <h1 id="home-title" tabIndex={-1} className={styles.title}>{character ? character.name || "Personagem sem nome" : "Abra sua mesa"}</h1>
          {character ? (
            <>
              {character.detail ? <p className={styles.subtitle}>{character.detail}</p> : null}
              {hp && hasMaximum ? (
                <div className={styles.vitals}>
                  <ProgressBar label="Pontos de vida" tone="hp" value={hp.current} max={hp.maximum!} {...(hp.temporary ? { tempValue: hp.temporary } : {})} />
                </div>
              ) : null}
              {character.conditions ? <p className={styles.note}>{plural(character.conditions, "condição ativa", "condições ativas")}</p> : null}
              <div className={styles.actionRow}>
                <Button onClick={onOpenCharacter}>Abrir ficha</Button>
                <Button variant="secondary" onClick={go("/actions")}>Ir para as ações</Button>
                {characterCount > 1 ? <Button variant="ghost" onClick={go("/settings")}>Trocar personagem</Button> : null}
              </div>
            </>
          ) : (
            <>
              <p className={styles.subtitle}>Crie uma ficha para começar. As Regras e as rolagens avulsas continuam disponíveis.</p>
              <div className={styles.actionRow}>
                <Button onClick={onCreateCharacter}>Criar personagem</Button>
              </div>
            </>
          )}
        </div>
      </header>

      {draft ? (
        <aside className={styles.draft} aria-label="Criação em andamento">
          <div>
            <strong>{draft.name?.trim() || "Criação em andamento"}</strong>
            <span>{draft.step ? `Parou na etapa ${draft.step}` : "Rascunho salvo neste aparelho"}</span>
          </div>
          <Button variant="secondary" onClick={() => onResumeDraft?.(draft.id)}>Retomar rascunho</Button>
        </aside>
      ) : null}

      <div className={styles.grid}>
        <article className={styles.card} aria-labelledby="home-campaign-title">
          <h2 id="home-campaign-title" className={styles.cardTitle}>Campanha</h2>
          {campaign ? (
            <>
              <p className={styles.cardLead}>{campaign.name}</p>
              {campaign.description ? <p className={styles.cardCopy}>{campaign.description}</p> : null}
              <ul className={styles.stats}>
                <li><strong>{campaign.activeQuests}</strong><span>{campaign.activeQuests === 1 ? "missão em andamento" : "missões em andamento"}</span></li>
                <li><strong>{campaign.objectives}</strong><span>{campaign.objectives === 1 ? "objetivo" : "objetivos"}</span></li>
              </ul>
              <Button variant="secondary" onClick={go("/journey")}>Abrir jornada</Button>
            </>
          ) : (
            <>
              <p className={styles.cardCopy}>{signedIn ? "Nenhuma campanha ativa nesta conta. Entre por um convite ou crie uma na Jornada." : "Nenhuma campanha ativa. Crie uma na Jornada para registrar mapa, diário e criaturas."}</p>
              <Button variant="secondary" onClick={go("/journey")}>Ir para a Jornada</Button>
            </>
          )}
        </article>

      </div>

      <nav className={styles.shortcuts} aria-label="Atalhos">
        <h2 className={styles.shortcutsTitle}>Atalhos</h2>
        <ul>
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.path}>
              <button type="button" className={styles.shortcut} onClick={go(shortcut.path)}>
                <span className={styles.shortcutIcon}>{shortcut.icon}</span>
                <span className={styles.shortcutCopy}><strong>{shortcut.title}</strong><small>{shortcut.hint}</small></span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
