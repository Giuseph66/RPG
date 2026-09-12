import { useState } from "react";

import { Badge, Button, InlineStatus } from "@components/ui";
import type { CoinDenomination } from "@domain/contracts/primitives";

import type { InventoryIntent, InventoryItemView, InventoryProps } from "./types";
import styles from "./inventory.module.css";

const COINS: readonly { readonly key: CoinDenomination; readonly label: string }[] = [
  { key: "cp", label: "Cobre" },
  { key: "sp", label: "Prata" },
  { key: "ep", label: "Electro" },
  { key: "gp", label: "Ouro" },
  { key: "pp", label: "Platina" },
];

const PROPERTY_LABELS: Readonly<Record<NonNullable<InventoryItemView["properties"]>[number], string>> = {
  light: "Leve",
  heavy: "Pesada",
  finesse: "Acuidade",
  reach: "Alcance",
  thrown: "Arremesso",
  "two-handed": "Duas mãos",
  versatile: "Versátil",
  ammunition: "Munição",
  loading: "Recarga",
  special: "Especial",
};

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
  return `${formatNumber(grams)} g`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível carregar o inventário.";
}

function isValidQuantity(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value) && value > 0;
}

function isValidCurrency(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value) && value >= 0;
}

function sendIntent(onIntent: InventoryProps["onIntent"], intent: InventoryIntent): void {
  onIntent?.(intent);
}

function QuantityField({ entry, onIntent, onInvalid }: { readonly entry: InventoryItemView; readonly onIntent: InventoryProps["onIntent"]; readonly onInvalid: (message: string) => void }) {
  return (
    <input
      className={styles.quantity}
      aria-label={`Quantidade de ${entry.name}`}
      type="number"
      min={1}
      step={1}
      inputMode="numeric"
      value={entry.item.quantity}
      disabled={!onIntent}
      onChange={(event) => {
        const quantity = Number(event.currentTarget.value);
        if (!isValidQuantity(quantity)) {
          onInvalid("A quantidade deve ser um inteiro maior que zero.");
          return;
        }
        onInvalid("");
        sendIntent(onIntent, { kind: "set-quantity", itemId: entry.item.id, quantity });
      }}
    />
  );
}

function ItemRow({ entry, onIntent, onInvalidQuantity, onRemove, onConsumed }: { readonly entry: InventoryItemView; readonly onIntent: InventoryProps["onIntent"]; readonly onInvalidQuantity: (message: string) => void; readonly onRemove: (entry: InventoryItemView) => void; readonly onConsumed: (entry: InventoryItemView) => void }) {
  const equipped = entry.item.equippedState === "equipped";
  const properties = entry.properties?.map((property) => PROPERTY_LABELS[property]) ?? [];

  return (
    <tr className={equipped ? styles.equippedRow : undefined} data-item-id={String(entry.item.id)}>
      <th scope="row" data-label="Item">
        <div className={styles.itemName}>
          <strong>{entry.item.customName || entry.name}</strong>
          {equipped ? <Badge tone="xp">Equipado</Badge> : null}
        </div>
        {entry.category ? <span className={styles.itemMeta}>{entry.category}</span> : null}
        {entry.description ? <p className={styles.description}>{entry.description}</p> : null}
      </th>
      <td data-label="Quantidade"><QuantityField entry={entry} onIntent={onIntent} onInvalid={onInvalidQuantity} /></td>
      <td data-label="Peso" className={styles.numeric}>{entry.unitWeightGrams === undefined ? "—" : formatWeight(Number(entry.unitWeightGrams) * entry.item.quantity)}</td>
      <td data-label="Valor" className={styles.numeric}>{entry.unitValueCp === undefined ? "—" : `${formatNumber(Number(entry.unitValueCp) * entry.item.quantity)} pc`}</td>
      <td data-label="Propriedades"><div className={styles.propertyList}>{properties.length === 0 ? <span className={styles.muted}>—</span> : properties.map((property) => <Badge key={property}>{property}</Badge>)}</div></td>
      <td data-label="Ações">
        <div className={styles.actions}>
          <Button size="sm" variant={equipped ? "secondary" : "primary"} aria-pressed={equipped} disabled={!onIntent} disabledReason={onIntent ? undefined : "Operações de inventário indisponíveis."} onClick={() => sendIntent(onIntent, equipped ? { kind: "unequip", itemId: entry.item.id } : { kind: "equip", itemId: entry.item.id })}>{equipped ? "Desequipar" : "Equipar"}</Button>
          {entry.consumable?.consumeOnUse ? <Button size="sm" variant="secondary" disabled={!onIntent} disabledReason={onIntent ? undefined : "Operações de inventário indisponíveis."} onClick={() => onConsumed(entry)}>Consumir</Button> : null}
          <Button size="sm" variant="danger" disabled={!onIntent} disabledReason={onIntent ? undefined : "Operações de inventário indisponíveis."} onClick={() => onRemove(entry)}>Remover</Button>
        </div>
      </td>
    </tr>
  );
}

function CurrencyPanel({ currency, onIntent, onInvalid }: { readonly currency: InventoryProps["currency"]; readonly onIntent: InventoryProps["onIntent"]; readonly onInvalid: (message: string) => void }) {
  return (
    <section className={styles.currencyPanel} aria-labelledby="inventory-currency-title">
      <div className={styles.panelHeading}><h2 id="inventory-currency-title">Moedas</h2><span className={styles.panelHint}>Valores mantidos por denominação</span></div>
      <div className={styles.currencyGrid}>
        {COINS.map(({ key, label }) => (
          <label className={styles.currencyField} key={key}>
            <span>{label} <abbr title={key}>{key.toUpperCase()}</abbr></span>
            <input aria-label={`Quantidade de moedas ${label}`} type="number" min={0} step={1} inputMode="numeric" value={currency[key]} disabled={!onIntent} onChange={(event) => { const amount = Number(event.currentTarget.value); if (!isValidCurrency(amount)) { onInvalid("Moedas devem ser um inteiro igual ou maior que zero."); return; } onInvalid(""); sendIntent(onIntent, { kind: "set-currency", denomination: key, amount }); }} />
          </label>
        ))}
      </div>
    </section>
  );
}

function ImpactPanel({ impact }: Pick<InventoryProps, "impact">) {
  if (!impact) return null;
  const encumbrance = impact.encumbrance;
  return (
    <section className={styles.impactPanel} aria-labelledby="inventory-impact-title">
      <div className={styles.panelHeading}><h2 id="inventory-impact-title">Impacto equipado</h2><span className={styles.panelHint}>Calculado pelo motor de regras</span></div>
      <div className={styles.impactGrid}>
        <div><span className={styles.impactLabel}>Classe de Armadura</span><strong className={styles.impactValue}>{formatNumber(impact.armorClass.value)}</strong><details><summary>Ver origem</summary><ul>{impact.armorClass.contributions.length === 0 ? <li>Fonte não registrada.</li> : impact.armorClass.contributions.map((contribution, index) => <li key={`${contribution.description}-${index}`}>{contribution.amount === undefined ? contribution.description : `${contribution.amount > 0 ? "+" : ""}${formatNumber(contribution.amount)} — ${contribution.description}`}</li>)}</ul></details></div>
        <div><span className={styles.impactLabel}>Peso total</span><strong className={styles.impactValue}>{formatWeight(Number(impact.weightGrams))}</strong>{encumbrance ? <span className={encumbrance.overCapacity ? styles.overLimit : styles.impactHint}>Capacidade {formatWeight(Number(encumbrance.capacityGrams))}</span> : <span className={styles.impactHint}>Regra de carga não habilitada</span>}</div>
        <div><span className={styles.impactLabel}>Propriedades ativas</span><div className={styles.propertyList}>{impact.properties.length === 0 ? <span className={styles.muted}>Nenhuma</span> : impact.properties.map((property) => <Badge key={property}>{PROPERTY_LABELS[property]}</Badge>)}</div></div>
        <div><span className={styles.impactLabel}>Proficiência</span>{impact.equipped.length === 0 ? <span className={styles.muted}>Nenhum equipamento ativo</span> : <ul className={styles.proficiencyList}>{impact.equipped.map((entry) => <li key={String(entry.item.id)}><Badge tone={entry.proficiency.proficient ? "xp" : "warning"}>{entry.proficiency.proficient ? "Proficiente" : "Sem proficiência"}</Badge><span>{entry.proficiency.description}</span></li>)}</ul>}</div>
      </div>
      <details className={styles.explanations}><summary>Ver explicações dos efeitos</summary><ul>{impact.explanations.length === 0 ? <li>Nenhuma explicação registrada.</li> : impact.explanations.map((explanation, index) => <li key={`${explanation.description}-${index}`}>{explanation.description}</li>)}</ul></details>
    </section>
  );
}

function LoadingState() {
  return <section className={styles.state} role="status" aria-live="polite"><span className={styles.stateMark} aria-hidden="true">◌</span><h1>Carregando inventário</h1><p>Buscando o último estado salvo.</p></section>;
}

function ErrorState({ error }: Pick<InventoryProps, "error">) {
  return <section className={styles.state} role="alert" aria-labelledby="inventory-error-title"><span className={styles.stateMark} aria-hidden="true">!</span><h1 id="inventory-error-title">O inventário não pôde ser carregado</h1><p>{formatError(error)}</p></section>;
}

function EmptyState() {
  return <section className={styles.state} aria-labelledby="inventory-empty-title"><span className={styles.stateMark} aria-hidden="true">✦</span><h1 id="inventory-empty-title">Inventário vazio</h1><p>Adicione uma instância para acompanhar quantidade, peso, valor e equipamento.</p></section>;
}

export function Inventory({ items, currency, impact, status = "idle", error, onIntent, title = "Inventário" }: InventoryProps) {
  const [message, setMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  if (status === "loading") return <LoadingState />;
  if (status === "error" || error) return <ErrorState error={error} />;

  const handleRemove = (entry: InventoryItemView) => {
    if (entry.item.equippedState === "equipped") setMessage(`Remover ${entry.item.customName || entry.name} fará seus efeitos deixarem de contribuir.`);
    else setMessage(`${entry.item.customName || entry.name} removido do inventário.`);
    sendIntent(onIntent, { kind: "remove", itemId: entry.item.id, equipped: entry.item.equippedState === "equipped" });
  };

  const handleConsumed = (entry: InventoryItemView) => {
    setMessage(`${entry.item.customName || entry.name} consumido. ${entry.consumable?.effectDescription ?? "Efeito pendente de resolução."}`);
    sendIntent(onIntent, { kind: "consume", itemId: entry.item.id, equipmentRef: entry.item.equipmentRef });
  };

  return (
    <section className={styles.inventory} aria-labelledby="inventory-title">
      <header className={styles.hero}><div><p className={styles.eyebrow}>POSSES DA FICHA</p><h1 id="inventory-title">{title}</h1><p className={styles.subtitle}>Cada linha representa uma instância preservada do inventário.</p></div><div className={styles.heroStats}><span><strong>{items.length}</strong> instâncias</span>{impact ? <span><strong>{formatWeight(Number(impact.weightGrams))}</strong> carregado</span> : null}</div></header>
      {message ? <InlineStatus tone="warning" assertive>{message}</InlineStatus> : null}
      {validationMessage ? <InlineStatus tone="error" assertive>{validationMessage}</InlineStatus> : null}
      <CurrencyPanel currency={currency} onIntent={onIntent} onInvalid={setValidationMessage} />
      <ImpactPanel impact={impact} />
      {items.length === 0 ? <EmptyState /> : <section className={styles.itemsPanel} aria-labelledby="inventory-items-title"><div className={styles.panelHeading}><h2 id="inventory-items-title">Itens</h2><span className={styles.panelHint}>Ordem das instâncias preservada</span></div><div className={styles.tableWrap}><table><thead><tr><th scope="col">Item</th><th scope="col">Quantidade</th><th scope="col">Peso</th><th scope="col">Valor</th><th scope="col">Propriedades</th><th scope="col">Ações</th></tr></thead><tbody>{items.map((entry) => <ItemRow key={String(entry.item.id)} entry={entry} onIntent={onIntent} onInvalidQuantity={setValidationMessage} onRemove={handleRemove} onConsumed={handleConsumed} />)}</tbody></table></div></section>}
    </section>
  );
}
