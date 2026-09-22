/**
 * SettingsRepository. Autoridade: 08-PERSISTENCIA-LOCAL.md ("localStorage guarda preferências
 * pequenas"), 11-DICE-ENGINE.md ("política inicial de retenção de 1000 entradas").
 */

import { type Uuid } from "@domain/contracts/ids";
import { type AppError, type Result } from "@domain/contracts/errors";

export type ThemePreference = "system" | "light" | "dark";
/** Hexadecimal RGB color in #RRGGBB form. */
export type DiceColorHex = `#${string}`;

export interface AppSettings {
  readonly activeCharacterId?: Uuid;
  readonly theme: ThemePreference;
  /** undefined = seguir preferência do sistema operacional; definido = override explícito. */
  readonly reducedMotion?: boolean;
  readonly diceFaceColor?: DiceColorHex;
  readonly diceEdgeColor?: DiceColorHex;
  readonly diceShadowColor?: DiceColorHex;
  readonly diceHistoryRetention: number;
  readonly language: "pt-BR";
}

export interface SettingsRepository {
  get(): Promise<Result<AppSettings, AppError>>;
  update(patch: Partial<AppSettings>): Promise<Result<AppSettings, AppError>>;
  reset(): Promise<Result<AppSettings, AppError>>;
}
