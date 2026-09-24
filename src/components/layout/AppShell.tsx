import { useEffect, useRef } from "react";
import { InlineStatus } from "@components/ui";
import { primaryRouteFor } from "@app/routes";
import { DiceOverlay } from "@features/dice";
import { Header } from "./Header";
import { OverlayHost } from "./OverlayHost";
import { PrimaryNavigation } from "./PrimaryNavigation";
import { RouteFallback } from "./RouteFallback";
import type { AppShellProps } from "./layout.types";
import styles from "./layout.module.css";

export type { AppShellProps, BootState, SessionCharacter, SessionCampaign } from "./layout.types";

function navigationDiceSource(): "header" | "fab" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "header";
  return window.matchMedia("(max-width: 767px)").matches ? "fab" : "header";
}

export function AppShell({
  character,
  campaign,
  isCampaignMaster,
  bootState = "ready",
  bootErrorMessage,
  children,
  route,
  navigate,
  onOpenDice,
  diceOverlayController,
  onSelectCharacter,
  onCreateCharacter,
  onImportCharacter,
  onRetryBoot,
  settingsStore,
}: AppShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const hasMountedRef = useRef(false);
  const routeKey = `${route.path}:${route.kind}`;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const heading = mainRef.current?.querySelector<HTMLElement>("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [routeKey]);

  const routeContent = children ?? <RouteFallback route={route} session={character} navigate={navigate} onCreateCharacter={onCreateCharacter} onImportCharacter={onImportCharacter} />;
  const isPrimary = primaryRouteFor(route.kind) !== undefined;
  const openDice = (source: "header" | "fab") => {
    if (diceOverlayController) {
      const characterId = character?.value?.id;
      diceOverlayController.open({ source, ...(characterId ? { characterId } : {}) });
      return;
    }
    onOpenDice?.(source);
  };

  return (
    <div className={styles.appShell}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Header session={character} campaign={campaign} route={route} navigate={navigate} onSelectCharacter={onSelectCharacter} />
      <div className={styles.shellBody}>
        <PrimaryNavigation route={route} navigate={navigate} isCampaignMaster={isCampaignMaster} onOpenDice={() => openDice(navigationDiceSource())} />
        <main ref={mainRef} id="main-content" className={[styles.main, isPrimary ? "" : styles.utilityMain].filter(Boolean).join(" ")} tabIndex={-1}>
          {bootState === "booting" ? (
            <section className={styles.stateContent} aria-labelledby="boot-title"><p className={styles.eyebrow}>ABRINDO A MESA</p><h1 id="boot-title" tabIndex={-1} className={styles.pageTitle}>Abrindo dados locais</h1><InlineStatus tone="info">Preparando preferências, personagem e campanha.</InlineStatus></section>
          ) : bootState === "error" ? (
            <section className={styles.stateContent} aria-labelledby="error-title"><p className={styles.eyebrow}>RECUPERAÇÃO</p><h1 id="error-title" tabIndex={-1} className={styles.pageTitle}>A mesa não abriu</h1><InlineStatus tone="error">{bootErrorMessage ?? "Não foi possível hidratar os dados locais."}</InlineStatus><button type="button" className={styles.retryButton} onClick={onRetryBoot}>Tentar novamente</button><p className={styles.mutedCopy}>Você pode continuar nas Regras e abrir dados avulsos enquanto a recuperação é resolvida.</p></section>
          ) : (
            <div key={routeKey} className={styles.routeMount}>
              {routeContent}
            </div>
          )}
        </main>
      </div>
      <OverlayHost>{diceOverlayController ? <DiceOverlay controller={diceOverlayController} settingsStore={settingsStore} /> : null}</OverlayHost>
    </div>
  );
}
