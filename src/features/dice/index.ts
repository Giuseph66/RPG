// Keep the public symbol stable while keeping Game Icons/3D dependencies out
// of the application shell. Direct component tests can import ./DiceOverlay.
export { LazyDiceOverlay as DiceOverlay } from "./lazy";
export type { DiceOverlayProps } from "./DiceOverlay";
export { DiceHistory } from "./DiceHistory";
export type { DiceHistoryProps } from "./DiceHistory";
export { DiceResult } from "./DiceResult";
export type { DiceResultProps } from "./DiceResult";
export { DiceControls, DiceQuickPicker, formatarModificador } from "./DiceSelector";
export type { DiceControlsProps, DiceQuickPickerProps } from "./DiceSelector";
export { createDiceOverlayController, useDiceOverlay } from "./controller";
export type { DiceHistoryService, DiceOverlayController, DiceOverlayControllerOptions, DiceOverlayOpenOptions, DiceOverlaySource, DiceOverlayState } from "./controller";
