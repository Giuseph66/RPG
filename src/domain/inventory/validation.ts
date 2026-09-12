import { type InventoryItem } from "@domain/contracts/character";
import { appError, err, ok, type Result, type ValidationError } from "@domain/contracts/errors";
import { type Currency, type CoinDenomination } from "@domain/contracts/primitives";

const DENOMINATIONS: readonly CoinDenomination[] = ["cp", "sp", "ep", "gp", "pp"];

function finiteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

/** Quantidades de inventário são instâncias inteiras positivas; zero remove a instância. */
export function validateQuantity(quantity: unknown, field = "quantity"): Result<number, ValidationError> {
  if (!finiteInteger(quantity) || quantity < 1) {
    return err(appError.validation(field, "Quantidade deve ser um número inteiro maior que zero."));
  }
  return ok(quantity);
}

export function validateInventoryItem(item: InventoryItem): Result<InventoryItem, ValidationError> {
  const quantity = validateQuantity(item.quantity);
  if (!quantity.ok) return quantity;
  if (item.chargesSpent !== undefined && (!finiteInteger(item.chargesSpent) || item.chargesSpent < 0)) {
    return err(appError.validation("chargesSpent", "Cargas gastas devem ser um inteiro não negativo."));
  }
  return ok(item);
}

/** Contêineres referenciam instâncias existentes e não podem formar ciclos. */
export function validateContainerGraph(items: readonly InventoryItem[]): Result<readonly InventoryItem[], ValidationError> {
  const ids = new Set(items.map((item) => String(item.id)));
  for (const item of items) {
    if (!item.containerId) continue;
    if (String(item.containerId) === String(item.id)) return err(appError.validation("containerId", "Um item não pode conter a si próprio."));
    if (!ids.has(String(item.containerId))) return err(appError.validation("containerId", `Contêiner "${item.containerId}" não existe no inventário.`));
    const visited = new Set<string>([String(item.id)]);
    let current = String(item.containerId);
    while (current) {
      if (visited.has(current)) return err(appError.validation("containerId", "Contêineres não podem formar ciclos."));
      visited.add(current);
      const parent = items.find((entry) => String(entry.id) === current)?.containerId;
      if (!parent) break;
      current = String(parent);
    }
  }
  return ok(items);
}

export function validateCurrency(currency: Currency): Result<Currency, ValidationError> {
  for (const denomination of DENOMINATIONS) {
    const amount = currency[denomination];
    if (!finiteInteger(amount) || amount < 0) {
      return err(appError.validation(`currency.${denomination}`, "Moedas devem ser inteiros não negativos."));
    }
  }
  return ok(currency);
}

export function emptyCurrency(): Currency {
  return { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
}

export function normalizeCurrency(currency?: Partial<Currency>): Currency {
  return {
    cp: currency?.cp ?? 0,
    sp: currency?.sp ?? 0,
    ep: currency?.ep ?? 0,
    gp: currency?.gp ?? 0,
    pp: currency?.pp ?? 0,
  };
}
