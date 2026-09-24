import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from "react";

import { AppModal } from "@components/ui";
import type { CompendiumCategoryId, CompendiumDetail } from "@application/compendium";

import { CompendiumDetailPanel } from "./Compendium";
import styles from "./compendium.module.css";

/** O que procurar no compêndio: categoria + título impresso (ou id quando o título não bate). */
export interface RuleQuery {
  readonly category: CompendiumCategoryId;
  readonly title: string;
  readonly entityId?: string;
}

export type RuleLookup = (query: RuleQuery) => CompendiumDetail | undefined;

export interface RuleHintProps {
  readonly onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerMove?: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerUp?: () => void;
  readonly onPointerLeave?: () => void;
  readonly onPointerCancel?: () => void;
  readonly onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  readonly onClickCapture?: (event: MouseEvent<HTMLElement>) => void;
  readonly style?: CSSProperties;
  readonly "data-rule-hint"?: string;
}

type BindRule = (query: RuleQuery | undefined) => RuleHintProps;

const NO_RULE: BindRule = () => ({});
const RuleHintContext = createContext<BindRule>(NO_RULE);

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;
// Evita o menu nativo/seleção de texto do toque longo sem mudar o layout do elemento.
const HINT_STYLE: CSSProperties = { WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" };

/**
 * Segurar (toque longo) ou clicar com o botão direito em qualquer elemento ligado com
 * `useRuleHint()` abre a regra correspondente do compêndio — o mesmo painel da aba Regras.
 * O clique curto continua com o comportamento normal do elemento (rolar, abrir, etc.).
 */
export function RuleLookupProvider({ lookup, children }: { readonly lookup?: RuleLookup; readonly children: ReactNode }) {
  const [detail, setDetail] = useState<CompendiumDetail>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const origin = useRef<{ x: number; y: number }>(undefined);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    origin.current = undefined;
  }, []);

  const bind = useCallback<BindRule>((query) => {
    if (!lookup || !query) return {};
    const found = lookup(query);
    if (!found) return {};
    const open = () => {
      fired.current = true;
      setDetail(found);
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
    };
    return {
      "data-rule-hint": found.title,
      style: HINT_STYLE,
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        fired.current = false;
        origin.current = { x: event.clientX, y: event.clientY };
        if (timer.current !== undefined) clearTimeout(timer.current);
        timer.current = setTimeout(() => { timer.current = undefined; open(); }, LONG_PRESS_MS);
      },
      onPointerMove: (event) => {
        const start = origin.current;
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE_PX) cancel();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (event) => {
        event.preventDefault();
        cancel();
        open();
      },
      onClickCapture: (event) => {
        if (!fired.current) return;
        // O toque longo já abriu a regra: o clique que vem em seguida não deve rolar/abrir nada.
        fired.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    };
  }, [cancel, lookup]);

  const value = useMemo(() => bind, [bind]);

  return (
    <RuleHintContext.Provider value={value}>
      {children}
      {detail ? (
        <AppModal open title="Regra" titleClassName={styles.modalTitle} closeClassName={styles.detailClose} className={styles.detailModal} onClose={() => setDetail(undefined)}>
          <CompendiumDetailPanel detail={detail} />
        </AppModal>
      ) : null}
    </RuleHintContext.Provider>
  );
}

/** Retorna `rule(query)` → props para espalhar no elemento; sem provider, não faz nada. */
export function useRuleHint(): BindRule {
  return useContext(RuleHintContext);
}
