import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import type { DiceOverlayProps } from "./DiceOverlay";

/**
 * Keeps the global overlay out of the application shell until it is mounted.
 * The overlay owns the Game Icons picker and the optional 3D stage, so loading
 * it with the shell would make every route pay for a closed control.
 */
const DiceOverlay = lazy(async () => {
  const module = await import("./DiceOverlay");
  return { default: module.DiceOverlay } satisfies { default: ComponentType<DiceOverlayProps> };
});

export function LazyDiceOverlay(props: DiceOverlayProps) {
  return <Suspense fallback={null}><DiceOverlay {...props} /></Suspense>;
}
