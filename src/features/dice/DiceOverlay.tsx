import { useEffect, useRef, useState } from "react";

import { AppModal, BottomSheet, Button, InlineStatus, Input, LiveRegion, Select } from "@components/ui";
import { DiceHistory } from "./DiceHistory";
import { DiceResult } from "./DiceResult";
import { DiceSelector } from "./DiceSelector";
import { useDiceOverlay, type DiceOverlayController } from "./controller";
import styles from "./dice.module.css";

export interface DiceOverlayProps { readonly controller: DiceOverlayController; }

export function DiceOverlay({ controller }: DiceOverlayProps) {
  const state = useDiceOverlay(controller);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 680px)");
    if (!query) return undefined;
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const content = (
    <div className={styles.content}>
      <p className={styles.context}>Fonte: {state.source ?? "mesa"}{state.characterId ? " · personagem ativo" : ""}</p>
      <Input ref={inputRef} label="Expressão dos dados" value={state.formula} onChange={(event) => controller.setFormula(event.target.value)} hint="Use NdF, NdF + M ou NdF - M." error={state.validationError} autoComplete="off" />
      {state.expression ? <DiceSelector expression={state.expression} onQuantityChange={controller.setQuantity} onFacesChange={controller.setFaces} onModifierChange={controller.setModifier} /> : null}
      <div className={styles.controls}>
        <Select label="Modo" value={state.mode} onChange={(event) => controller.setMode(event.target.value as "normal" | "advantage" | "disadvantage")} options={[{ value: "normal", label: "Normal" }, { value: "advantage", label: "Vantagem" }, { value: "disadvantage", label: "Desvantagem" }]} />
      </div>
      {state.persistenceError ? <InlineStatus tone="error" assertive>Resultado obtido, mas não foi possível salvar no histórico. Tente novamente.</InlineStatus> : null}
      <DiceResult roll={state.result} />
      <DiceHistory entries={state.history} onReroll={(roll) => void controller.reroll(roll)} />
      <LiveRegion message={state.announcement} />
    </div>
  );
  const footer = <Button variant="primary" busy={state.status === "rolling" || state.status === "saving"} onClick={() => void controller.roll()}>Rolar dados</Button>;
  return mobile ? <BottomSheet open={state.open} title="Dados" onClose={controller.close} initialFocusRef={inputRef} footer={footer}>{content}</BottomSheet> : <AppModal open={state.open} title="Dados" onClose={controller.close} initialFocusRef={inputRef} footer={footer}>{content}</AppModal>;
}
