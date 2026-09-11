import { Button, IconButton, ProgressBar } from "@components/ui";
import type { Character } from "@domain/contracts/character";
import styles from "./layout.module.css";
import type { SessionCharacter } from "./layout.types";

interface HeaderProps {
  readonly session?: SessionCharacter;
  readonly navigate: (to: string) => void;
  readonly onOpenDice?: (source: "header" | "fab") => void;
  readonly onSelectCharacter?: () => void;
}

function diceTriggerSource(): "header" | "fab" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "header";
  return window.matchMedia("(max-width: 820px)").matches ? "fab" : "header";
}

function displayClass(character: Character): string {
  const first = character.classes[0];
  if (!first) return "Aventureiro";
  return first.classId.replaceAll("-", " ");
}

function DieMark() {
  return <span className={styles.dieMark} aria-hidden="true">⚄</span>;
}

export function Header({ session, navigate, onOpenDice, onSelectCharacter }: HeaderProps) {
  const character = session?.value ?? undefined;
  const hp = character?.hp;
  const isLowHp = Boolean(hp && hp.current > 0 && hp.current <= 5);
  const saveLabel = session?.status === "saving" ? "Salvando" : session?.status === "error" ? "Alterações pendentes" : "Salvo";

  return (
    <header className={styles.header} aria-label="Sessão de campanha">
      <div className={styles.headerInner}>
        <button
          type="button"
          className={styles.identityButton}
          onClick={onSelectCharacter ?? (() => navigate("/character"))}
          aria-label={character ? `Selecionar personagem ${character.name}` : "Selecionar personagem"}
        >
          <span className={styles.brandMark}><DieMark /></span>
          <span className={styles.identityCopy}>
            <span className={styles.identityName}>{character?.name ?? "Mesa de campanha"}</span>
            <span className={styles.identityMeta}>
              {character ? `${displayClass(character)} · nível ${character.classes[0]?.level ?? "—"}` : "Nenhum personagem ativo"}
            </span>
          </span>
        </button>

        {character && hp ? (
          <div className={styles.sessionStats} aria-label="Resumo da ficha">
            <button type="button" className={[styles.statBlock, isLowHp ? styles.statAlert : ""].filter(Boolean).join(" ")} onClick={() => navigate("/character#hp")}>
              {session?.derived?.maxHitPoints ? <ProgressBar value={hp.current} max={session.derived.maxHitPoints} tempValue={hp.temp} label="Pontos de vida" tone="hp" /> : <span className={styles.statLine}><span className={styles.statLabel}>PV</span><strong>{hp.current}{hp.temp > 0 ? ` +${hp.temp}` : ""}</strong></span>}
            </button>
            <button type="button" className={styles.statChip} onClick={() => navigate("/character#resource")}>
              <span className={styles.statLabel}>CA</span><strong>{session?.derived?.armorClass ?? "—"}</strong>
            </button>
            {session?.derived?.primaryResource ? <button type="button" className={styles.statChip} onClick={() => navigate("/character#resource")}><span className={styles.statLabel}>{session.derived.primaryResource.label}</span><strong>{session.derived.primaryResource.current}/{session.derived.primaryResource.max}</strong></button> : null}
            <span className={styles.saveState} role="status"><span className={styles.saveDot} aria-hidden="true" />{saveLabel}</span>
          </div>
        ) : (
          <span className={styles.headerHint}>Escolha uma ficha para começar</span>
        )}

        <div className={styles.headerActions}>
          <IconButton label="Abrir rolagem de dados" icon={<DieMark />} variant="secondary" className={styles.headerDiceButton} onClick={() => onOpenDice?.(diceTriggerSource())} />
          <Button variant="secondary" size="sm" onClick={() => navigate("/settings")}>Ajustes</Button>
        </div>
      </div>
      {session?.errorMessage ? <div className={styles.headerNotice} role="status">{session.errorMessage}</div> : null}
    </header>
  );
}
