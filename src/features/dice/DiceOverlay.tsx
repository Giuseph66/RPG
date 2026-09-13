import { lazy, Suspense, useEffect, useState } from "react";

import { AppModal, BottomSheet, Button, InlineStatus, LiveRegion } from "@components/ui";
import { GiDiceTwentyFacesTwenty } from "../../assets/icons";
import diceMedallion from "../../assets/art/icons/d20-medallion.webp";
import { DiceHistory } from "./DiceHistory";
import { DiceResult } from "./DiceResult";
import { DiceControls, DiceQuickPicker } from "./DiceSelector";
import { useDiceOverlay, type DiceOverlayController } from "./controller";
import styles from "./dice.module.css";

// Carregada sob demanda: traz three/cannon-es, que só devem entrar no bundle
// depois da primeira abertura do overlay (ver QA-004).
const PhysicalDiceStage = lazy(() =>
  import("@features/dice3d/PhysicalDiceStage").then((module) => ({ default: module.PhysicalDiceStage })),
);

export interface DiceOverlayProps { readonly controller: DiceOverlayController; }

export function DiceOverlay({ controller }: DiceOverlayProps) {
  const state = useDiceOverlay(controller);
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [catalogoAberto, setCatalogoAberto] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 680px)");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query && !reduced) return undefined;
    const update = () => {
      setMobile(query?.matches ?? window.innerWidth <= 680);
      setReducedMotion(reduced?.matches ?? false);
    };
    update();
    query?.addEventListener?.("change", update);
    reduced?.addEventListener?.("change", update);
    return () => {
      query?.removeEventListener?.("change", update);
      reduced?.removeEventListener?.("change", update);
    };
  }, []);

  const rolling = state.status === "rolling" || state.status === "saving";
  const expression = state.expression;

  const content = (
    <div className={styles.content}>
      <p className={styles.tagline}>Deixe o destino falar.</p>

      {expression ? (
        <DiceControls
          expression={expression}
          mode={state.mode}
          onQuantityChange={controller.setQuantity}
          onModifierChange={controller.setModifier}
          onModeChange={controller.setMode}
        />
      ) : null}

      <div className={[styles.stage, rolling ? styles.stageRolling : ""].filter(Boolean).join(" ")}>
        <span className={styles.stageRune} aria-hidden="true" />
        {state.open && !reducedMotion ? (
          <Suspense fallback={<div aria-hidden="true" />}>
            <PhysicalDiceStage roll={state.result} active={state.open} variant="inline" />
          </Suspense>
        ) : (
          // Sem física (movimento reduzido): a moeda do d20 segura o palco.
          <img className={styles.stageFallback} src={diceMedallion} alt="" aria-hidden="true" />
        )}
        {/* Antes da primeira rolagem a mesa física está vazia — a moeda ocupa
            o palco para o círculo não nascer oco, e sai quando os dados caem. */}
        {!state.result && !reducedMotion ? <img className={styles.stageIdle} src={diceMedallion} alt="" aria-hidden="true" /> : null}
      </div>

      <DiceResult roll={state.result} />

      <DiceQuickPicker
        faces={expression?.faces ?? 20}
        onFacesChange={controller.setFaces}
        expanded={catalogoAberto}
        onToggleExpanded={() => setCatalogoAberto((aberto) => !aberto)}
      />

      {state.validationError ? <InlineStatus tone="error">{state.validationError}</InlineStatus> : null}
      {state.persistenceError ? <InlineStatus tone="error" assertive>Resultado obtido, mas não foi possível salvar no histórico. Tente novamente.</InlineStatus> : null}

      <details className={styles.historyDisclosure}>
        <summary className={styles.historySummary}>Histórico de rolagens</summary>
        <DiceHistory entries={state.history} onReroll={(roll) => void controller.reroll(roll)} />
      </details>

      <LiveRegion message={state.announcement} />
    </div>
  );

  const footer = (
    <Button className={styles.rollButton} variant="secondary" busy={rolling} onClick={() => void controller.roll()}>
      <GiDiceTwentyFacesTwenty aria-hidden="true" />
      {state.result ? "Rolar novamente" : "Rolar dados"}
    </Button>
  );

  return mobile
    ? <BottomSheet open={state.open} title="Dados" onClose={controller.close} footer={footer} className={`${styles.surface} ${styles.surfaceSheet}`}>{content}</BottomSheet>
    : <AppModal open={state.open} title="Dados" onClose={controller.close} footer={footer} className={`${styles.surface} ${styles.surfaceModal}`}>{content}</AppModal>;
}
