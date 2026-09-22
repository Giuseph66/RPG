import { type SettingsRepository, type AppSettings, type DiceColorHex, type ThemePreference } from "@application/ports/settings-repository";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

export const DEFAULT_APP_SETTINGS: AppSettings = Object.freeze({
  theme: "system",
  reducedMotion: undefined,
  diceFaceColor: "#14100d",
  diceEdgeColor: "#D0AB72",
  diceShadowColor: "#090706",
  diceHistoryRetention: 1000,
  language: "pt-BR",
});

export const SETTINGS_STORAGE_KEY = "rpg-companion.settings";

function isTheme(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function isDiceColor(value: unknown): value is DiceColorHex {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isSettings(value: unknown): value is AppSettings {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.activeCharacterId === undefined || typeof record.activeCharacterId === "string") &&
    isTheme(record.theme) &&
    (record.reducedMotion === undefined || typeof record.reducedMotion === "boolean") &&
    (record.diceFaceColor === undefined || isDiceColor(record.diceFaceColor)) &&
    (record.diceEdgeColor === undefined || isDiceColor(record.diceEdgeColor)) &&
    (record.diceShadowColor === undefined || isDiceColor(record.diceShadowColor)) &&
    typeof record.diceHistoryRetention === "number" &&
    Number.isInteger(record.diceHistoryRetention) &&
    record.diceHistoryRetention >= 0 &&
    record.diceHistoryRetention <= 100000 &&
    record.language === "pt-BR"
  );
}

function settingsFromPatch(current: AppSettings, patch: Partial<AppSettings>): Result<AppSettings, AppError> {
  const next = { ...current, ...patch };
  return isSettings(next) ? ok(next) : err(appError.validation("settings", "Preferências inválidas."));
}

/** Preferências pequenas, serializadas no localStorage e com fallback seguro. */
export class LocalStorageSettingsRepository implements SettingsRepository {
  private readonly storage?: Storage;

  constructor(storage?: Storage) {
    if (storage) {
      this.storage = storage;
      return;
    }
    try {
      this.storage = typeof localStorage === "undefined" ? undefined : localStorage;
    } catch {
      this.storage = undefined;
    }
  }

  async get(): Promise<Result<AppSettings, AppError>> {
    const available = this.requireStorage();
    if (!available.ok) return available;
    try {
      const raw = available.value.getItem(SETTINGS_STORAGE_KEY);
      if (raw === null) return ok(DEFAULT_APP_SETTINGS);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return ok(DEFAULT_APP_SETTINGS);
      }
      return isSettings(parsed) ? ok(parsed) : ok(DEFAULT_APP_SETTINGS);
    } catch (cause) {
      return err(appError.storageUnavailable("Não foi possível ler as preferências.", String(cause)));
    }
  }

  async update(patch: Partial<AppSettings>): Promise<Result<AppSettings, AppError>> {
    const current = await this.get();
    if (!current.ok) return current;
    const next = settingsFromPatch(current.value, patch);
    if (!next.ok) return next;
    return this.write(next.value);
  }

  async reset(): Promise<Result<AppSettings, AppError>> {
    return this.write(DEFAULT_APP_SETTINGS);
  }

  private requireStorage(): Result<Storage, AppError> {
    return this.storage
      ? ok(this.storage)
      : err(appError.storageUnavailable("localStorage não está disponível neste ambiente."));
  }

  private async write(value: AppSettings): Promise<Result<AppSettings, AppError>> {
    const available = this.requireStorage();
    if (!available.ok) return available;
    try {
      available.value.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
      return ok(value);
    } catch (cause) {
      return err(appError.storageUnavailable("Não foi possível gravar as preferências.", String(cause)));
    }
  }
}

export { isSettings };
