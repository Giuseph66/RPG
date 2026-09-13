import { Input, Select } from "@components/ui";
import type { DiceExpression } from "@domain/contracts/dice";
import { DICE_FACES, type DiceFaces } from "@domain/contracts/primitives";
import styles from "./dice.module.css";

export interface DiceSelectorProps {
  readonly expression: DiceExpression;
  readonly onQuantityChange: (quantity: number) => void;
  readonly onFacesChange: (faces: DiceFaces) => void;
  readonly onModifierChange: (modifier: number) => void;
}

export function DiceQuantitySelector({ value, onChange }: { readonly value: number; readonly onChange: (value: number) => void }) {
  return <Input label="Quantidade" type="number" min={1} max={100} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}

export function DiceModifierSelector({ value, onChange }: { readonly value: number; readonly onChange: (value: number) => void }) {
  return <Input label="Modificador" type="number" min={-1000} max={1000} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}

export function DiceSelector({ expression, onQuantityChange, onFacesChange, onModifierChange }: DiceSelectorProps) {
  return (
    <div className={styles.selectorGrid}>
      <DiceQuantitySelector value={expression.quantity} onChange={onQuantityChange} />
      <Select label="Faces" value={String(expression.faces)} onChange={(event) => onFacesChange(Number(event.target.value) as DiceFaces)} options={DICE_FACES.map((faces) => ({ value: String(faces), label: `d${faces}` }))} />
      <DiceModifierSelector value={expression.modifier} onChange={onModifierChange} />
    </div>
  );
}
