import type { Character } from "@domain/contracts/character";
import type { StoreStatus } from "@application/state/external-store";
import type { ReactNode } from "react";
import type { SettingsStore } from "@application/settings";
import type { DiceOverlayController, DiceOverlaySource } from "@features/dice";

export type BootState = "booting" | "ready" | "error";

export interface SessionCharacter {
  readonly value?: Character | null;
  readonly status?: StoreStatus | "idle";
  readonly errorMessage?: string;
  readonly derived?: {
    readonly maxHitPoints?: number;
    readonly armorClass?: number;
    readonly primaryResource?: { readonly current: number; readonly max: number; readonly label: string };
  };
}

export interface AppShellProps {
  readonly character?: SessionCharacter;
  readonly bootState?: BootState;
  readonly bootErrorMessage?: string;
  readonly children?: ReactNode;
  readonly route: import("@app/routes").RouteMatch;
  readonly navigate: (to: string) => void;
  /** Legacy fallback for isolated compositions without the overlay controller. */
  readonly onOpenDice?: (source?: DiceOverlaySource) => void;
  /** Optional global overlay controller supplied by CORE-001. */
  readonly diceOverlayController?: DiceOverlayController;
  readonly onSelectCharacter?: () => void;
  readonly onCreateCharacter?: () => void;
  readonly onImportCharacter?: () => void;
  readonly onRetryBoot?: () => void;
  readonly settingsStore?: SettingsStore;
}
