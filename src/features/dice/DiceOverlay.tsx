import { lazy, Suspense, useEffect, useState } from "react";

import { AppModal, BottomSheet, Button, IconButton, InlineStatus, LiveRegion } from "@components/ui";
import { dicePerformancePolicy } from "@domain/dice";
import { Eye, EyeSlash } from "../../assets/icons";
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
  // Some visual, não física: os dados continuam caindo por baixo, só o canvas
  // fica invisível. Trocar para `active={false}` reiniciaria a mesa e perderia
  // a rolagem em andamento.
  const [dadosVisiveis, setDadosVisiveis] = useState(true);
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

  // Reabrir o overlay não deve herdar "ocultar" da sessão anterior.
  useEffect(() => {
    if (state.open) setDadosVisiveis(true);
  }, [state.open]);

  const rolling = state.status === "rolling" || state.status === "saving";
  const expression = state.expression;

  // Não existe mais teto de dados na mesa: todos vão para a física. O
  // orçamento de `dicePerformancePolicy` virou recomendação, e passar dele só
  // rende este aviso — quem quer 50d100 na tela sabe o que está pedindo.
  const orcamento = expression && !reducedMotion
    ? dicePerformancePolicy({ faces: expression.faces, quantity: expression.quantity, mobile, reducedMotion }).maxPhysicalInstances
    : Infinity;
  const pesado = expression !== undefined && expression.quantity > orcamento;

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

      {/* Os dados caem na tela inteira, não aqui dentro: o canvas é montado
          fora do modal (ver o fim deste arquivo). O que sobra é o círculo
          arcano e a moeda, que seguram o palco enquanto nada rola. */}
      <div className={[styles.stage, rolling ? styles.stageRolling : ""].filter(Boolean).join(" ")}>
        <span className={styles.stageRune} aria-hidden="true" />
        {reducedMotion
          // Sem física, a moeda do d20 segura o palco o tempo todo.
          ? <img className={styles.stageFallback} src={diceMedallion} alt="" aria-hidden="true" />
          // Com física, ela sai assim que os dados entram em queda.
          : !state.result && !state.awaitingPhysics
            ? <img className={styles.stageIdle} src={diceMedallion} alt="" aria-hidden="true" />
            : null}
      </div>

      <DiceResult roll={state.result} />

      <DiceQuickPicker
        faces={expression?.faces ?? 20}
        onFacesChange={controller.setFaces}
        expanded={catalogoAberto}
        onToggleExpanded={() => setCatalogoAberto((aberto) => !aberto)}
      />

      {pesado ? <p className={styles.avisoPesado}>Muitos dados na mesa — pode travar.</p> : null}

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
      {state.result ? "Rolar novamente" : "Rolar dados"}
    </Button>
  );

  // Na barra de título do modal, não flutuando sobre a tela — um botão fixo
  // fora do painel disputava stacking context com o backdrop (`.overlayHost`
  // vs `.backdrop`, ambos fixed) e nunca recebia o clique: existia, mas não
  // era clicável. Do lado esquerdo (`leadingAction`, oposto ao X) e `ghost`
  // para não ter fundo — só o ícone.
  const toggleVisibilidade = !reducedMotion ? (
    <IconButton
      variant="ghost"
      label={dadosVisiveis ? "Ocultar dados" : "Mostrar dados"}
      icon={dadosVisiveis ? <Eye aria-hidden="true" /> : <EyeSlash aria-hidden="true" />}
      aria-pressed={!dadosVisiveis}
      onClick={() => setDadosVisiveis((v) => !v)}
    />
  ) : null;

  const painel = mobile
    ? <BottomSheet open={state.open} title="Dados" onClose={controller.close} footer={footer} leadingAction={toggleVisibilidade} hideFooterCloseButton className={`${styles.surface} ${styles.surfaceSheet}`}>{content}</BottomSheet>
    : <AppModal open={state.open} title="Dados" onClose={controller.close} footer={footer} leadingAction={toggleVisibilidade} className={`${styles.surface} ${styles.surfaceModal}`}>{content}</AppModal>;

  return (
    <>
      {painel}
      {/* Fora do painel de propósito: o `backdrop-filter` do modal cria bloco
          contentor para `position: fixed`, e o canvas passaria a se medir pelo
          backdrop em vez da tela. Aqui ele cobre a tela toda e, com z-index
          acima do modal, os dados caem por cima do painel.
          A ocultação (`dadosVisiveis`) é só visual — opacidade no wrapper, sem
          desmontar: a física continua rodando por baixo, e reabrir a visão
          mostra o dado onde ele estiver naquele instante, não reinicia a queda. */}
      {state.open && !reducedMotion ? (
        <div className={dadosVisiveis ? undefined : styles.dadosOcultos}>
          <Suspense fallback={null}>
            <PhysicalDiceStage
              active={state.open}
              variant="fullscreen"
              awaitingPhysics={state.awaitingPhysics}
              physicsExpression={state.pendingExpression}
              onResult={(values) => void controller.onPhysicsResult(values)}
              onPhysicsAvailable={controller.setPhysicsAvailable}
              onPhysicsDeclined={controller.declinePhysics}
            />
          </Suspense>
        </div>
      ) : null}
    </>
  );
}
