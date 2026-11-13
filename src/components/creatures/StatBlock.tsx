import type { ReactNode } from "react";
import type { Ability, DamageType, Skill } from "@domain/contracts/primitives";
import type { CreatureAction, CreatureStatBlock, CreatureTrait } from "@domain/creatures";
import styles from "./stat-block.module.css";

const ABILITY_LABELS: Readonly<Record<Ability, string>> = { str: "FOR", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const ABILITIES: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
const SIZE_LABELS = { tiny: "Miúda", small: "Pequena", medium: "Média", large: "Grande", huge: "Enorme", gargantuan: "Imensa" } as const;
const DAMAGE_LABELS: Readonly<Record<DamageType, string>> = {
  acid: "ácido", bludgeoning: "concussão", cold: "frio", fire: "fogo", force: "força", lightning: "elétrico", necrotic: "necrótico",
  piercing: "perfurante", poison: "veneno", psychic: "psíquico", radiant: "radiante", slashing: "cortante", thunder: "trovejante",
};
const SKILL_LABELS: Readonly<Record<Skill, string>> = {
  acrobatics: "Acrobacia", "animal-handling": "Adestrar Animais", arcana: "Arcanismo", athletics: "Atletismo", deception: "Enganação",
  history: "História", insight: "Intuição", intimidation: "Intimidação", investigation: "Investigação", medicine: "Medicina", nature: "Natureza",
  perception: "Percepção", performance: "Atuação", persuasion: "Persuasão", religion: "Religião", "sleight-of-hand": "Prestidigitação", stealth: "Furtividade", survival: "Sobrevivência",
};
const TYPE_LABELS: Readonly<Record<string, string>> = { aberration: "Aberração", beast: "Besta", celestial: "Celestial", construct: "Constructo", dragon: "Dragão", elemental: "Elemental", fey: "Fada", fiend: "Ínfero", giant: "Gigante", humanoid: "Humanoide", monstrosity: "Monstruosidade", ooze: "Limo", plant: "Planta", undead: "Morto-vivo" };

function signed(value: number): string { return `${value >= 0 ? "+" : ""}${value}`; }
function fraction(challenge: CreatureStatBlock["challengeRating"]): string {
  if (!challenge) return "—";
  const { numerator, denominator } = challenge;
  if (denominator === 1) return String(numerator);
  const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
  const divisor = gcd(numerator, denominator) || 1;
  return `${numerator / divisor}/${denominator / divisor}`;
}
function meters(cm: number): string { return `${(cm / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m`; }
function dice(formula: { readonly quantity: number; readonly faces: number }): string { return `${formula.quantity}d${formula.faces}`; }
function speedText(block: CreatureStatBlock, hiddenSpeeds: readonly ("flyCm" | "swimCm")[]): string[] {
  const values = [
    ["walkCm", "Deslocamento"], ["climbCm", "Escalada"], ["swimCm", "Natação"], ["flyCm", "Voo"], ["burrowCm", "Escavação"],
  ] as const;
  return values.flatMap(([field, label]) => {
    const value = block.speeds[field];
    return value === undefined ? [] : [`${label}: ${meters(value)}${field === "flyCm" && block.speeds.hover ? " (paira)" : ""}`];
  }).concat(hiddenSpeeds.length === 0 && block.speeds.sourceText ? [block.speeds.sourceText] : []);
}
function scoreList(values: Partial<Readonly<Record<Ability, number>>> | Partial<Readonly<Record<Skill, number>>>, labels: Readonly<Record<string, string>>): string {
  return Object.entries(values).map(([key, value]) => `${labels[key] ?? key} ${signed(value!)}`).join(", ");
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section className={styles.section}><h3>{title}</h3>{children}</section>;
}

function TraitList({ items }: { readonly items: readonly CreatureTrait[] }) {
  return <ul className={styles.traits}>{items.map((item) => <li key={item.id}><strong>{item.name}.</strong> {item.description}</li>)}</ul>;
}

function ActionList({ title, items }: { readonly title: string; readonly items: readonly CreatureAction[] }) {
  if (items.length === 0) return null;
  return <Section title={title}><ul className={styles.traits}>{items.map((action) => {
    const reach = action.reachCm === undefined ? undefined : `alcance ${meters(action.reachCm)}`;
    const range = action.rangeCm === undefined ? undefined : `distância ${meters(action.rangeCm)}`;
    const damage = action.damage?.map((entry) => `${entry.formula ? dice(entry.formula) : ""}${entry.flatBonus === undefined ? "" : signed(entry.flatBonus)} ${DAMAGE_LABELS[entry.damageType]}${entry.note ? ` (${entry.note})` : ""}`.trim()).join(" + ");
    const meta = [action.attackBonus === undefined ? undefined : `ataque ${signed(action.attackBonus)}`, reach, range, damage, action.recharge, action.usage].filter(Boolean).join(" · ");
    return <li key={action.id}><strong>{action.name}.</strong> {action.description}{meta ? <small className={styles.actionMeta}>{meta}</small> : null}</li>;
  })}</ul></Section>;
}

function Spellcasting({ title, value }: { readonly title: string; readonly value: NonNullable<CreatureStatBlock["spellcasting"]> }) {
  return <Section title={title}><p>{value.description}</p>{value.spells?.length ? <ul className={styles.spells}>{value.spells.map((spell, index) => <li key={`${spell}-${index}`}>{spell}</li>)}</ul> : null}
    {value.saveDc !== undefined || value.attackBonus !== undefined || value.slots ? <p className={styles.meta}>{[
      value.saveDc === undefined ? undefined : `CD ${value.saveDc}`,
      value.attackBonus === undefined ? undefined : `ataque mágico ${signed(value.attackBonus)}`,
      value.ability ? `atributo ${ABILITY_LABELS[value.ability]}` : undefined,
      value.slots ? Object.entries(value.slots).map(([level, count]) => `${level}: ${count}`).join(", ") : undefined,
    ].filter(Boolean).join(" · ")}</p> : null}
  </Section>;
}

export interface StatBlockProps {
  readonly creature: CreatureStatBlock;
  readonly headingLevel?: 2 | 3;
  readonly className?: string;
  /** A ficha da Forma Selvagem pode passar valores de PV sem alterar o bloco publicado. */
  readonly hitPointsOverride?: { readonly current: number; readonly maximum: number };
  readonly hiddenSpeeds?: readonly ("flyCm" | "swimCm")[];
}

/** Apresenta o bloco publicado por inteiro; não recalcula nem descarta campos da fonte. */
export function StatBlock({ creature, headingLevel = 2, className, hitPointsOverride, hiddenSpeeds = [] }: StatBlockProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const shownSpeeds = speedText(creature, hiddenSpeeds).filter((line) =>
    !(hiddenSpeeds.includes("flyCm") && line.startsWith("Voo:")) &&
    !(hiddenSpeeds.includes("swimCm") && line.startsWith("Natação:"))
  );
  const vulnerabilities = creature.damageVulnerabilities?.map((value) => DAMAGE_LABELS[value]).join(", ");
  const resistances = creature.damageResistances?.map((value) => DAMAGE_LABELS[value]).join(", ");
  const immunities = creature.damageImmunities?.map((value) => DAMAGE_LABELS[value]).join(", ");
  const tags = (creature.tags ?? []).filter((tag) => tag !== "monster-manual-appendix-a" && !creature.sourceRefs.some((source) => source.sourceId === tag));
  const typeLine = [creature.alignment, SIZE_LABELS[creature.size], TYPE_LABELS[creature.creatureType], ...tags].filter(Boolean).join(" · ");

  return <article className={[styles.block, className ?? ""].filter(Boolean).join(" ")} aria-label={`Bloco estatístico: ${creature.name}`}>
    <header className={styles.header}><div><Heading className={styles.name}>{creature.name}</Heading><p className={styles.typeLine}>{typeLine}</p></div><div className={styles.badges}><span>ND {fraction(creature.challengeRating)}</span>{creature.proficiencyBonus !== undefined ? <span>PB {signed(creature.proficiencyBonus)}</span> : null}</div></header>
    <dl className={styles.summary}>
      <div><dt>CA</dt><dd>{creature.armorClass}{creature.armorClassNote ? ` (${creature.armorClassNote})` : ""}</dd></div>
      <div><dt>PV</dt><dd>{hitPointsOverride ? `${hitPointsOverride.current}/${hitPointsOverride.maximum}` : creature.hitPoints.average}{creature.hitPoints.hitDice ? ` (${creature.hitPoints.hitDice})` : ""}</dd></div>
      {creature.experiencePoints !== undefined ? <div><dt>XP</dt><dd>{creature.experiencePoints.toLocaleString("pt-BR")}</dd></div> : null}
    </dl>
    {shownSpeeds.length || hiddenSpeeds.length ? <p className={styles.speedLine}>{shownSpeeds.join(" · ")}{hiddenSpeeds.length ? <span className={styles.disabledSpeeds}>{shownSpeeds.length ? " · " : "Deslocamento: "}{hiddenSpeeds.map((speed) => speed === "flyCm" ? "voo" : "natação").join(" e ")} indisponíveis nesta forma</span> : null}</p> : null}
    <div className={styles.abilities} aria-label="Atributos"><table><thead><tr>{ABILITIES.map((ability) => <th key={ability} scope="col">{ABILITY_LABELS[ability]}</th>)}</tr></thead><tbody><tr>{ABILITIES.map((ability) => <td key={ability}>{creature.abilityScores[ability]}</td>)}</tr></tbody></table></div>
    <div className={styles.sections}>
      {creature.savingThrows && Object.keys(creature.savingThrows).length ? <p><strong>Testes de resistência</strong> {scoreList(creature.savingThrows, ABILITY_LABELS)}</p> : null}
      {creature.skills && Object.keys(creature.skills).length ? <p><strong>Perícias</strong> {scoreList(creature.skills, SKILL_LABELS)}</p> : null}
      {vulnerabilities ? <p><strong>Vulnerabilidades</strong> {vulnerabilities}</p> : null}
      {resistances ? <p><strong>Resistências</strong> {resistances}</p> : null}
      {immunities ? <p><strong>Imunidades a dano</strong> {immunities}</p> : null}
      {creature.conditionImmunities?.length ? <p><strong>Imunidades a condições</strong> {creature.conditionImmunities.join(", ")}</p> : null}
      {creature.senses?.length || creature.passivePerception !== undefined ? <p><strong>Sentidos</strong> {[...(creature.senses ?? []).map((sense) => `${sense.kind}${sense.rangeCm === undefined ? "" : ` ${meters(sense.rangeCm)}`}${sense.description ? ` (${sense.description})` : ""}`), creature.passivePerception === undefined ? undefined : `Percepção passiva ${creature.passivePerception}`].filter(Boolean).join(", ")}</p> : null}
      {creature.languages?.length ? <p><strong>Idiomas</strong> {creature.languages.join(", ")}</p> : null}
    </div>
    {creature.traits?.length ? <Section title="Características"><TraitList items={creature.traits} /></Section> : null}
    {creature.spellcasting ? <Spellcasting title="Conjuração" value={creature.spellcasting} /> : null}
    {creature.innateSpellcasting ? <Spellcasting title="Conjuração inata" value={creature.innateSpellcasting} /> : null}
    <ActionList title="Ações" items={creature.actions ?? []} />
    <ActionList title="Ações bônus" items={creature.bonusActions ?? []} />
    <ActionList title="Reações" items={creature.reactions ?? []} />
    {creature.legendaryActions ? <Section title={`Ações lendárias${creature.legendaryActions.actionsPerTurn ? ` (${creature.legendaryActions.actionsPerTurn} por turno)` : ""}`}>
      {creature.legendaryActions.description ? <p>{creature.legendaryActions.description}</p> : null}<TraitList items={creature.legendaryActions.actions} />
    </Section> : null}
    {creature.lairActions?.length ? <Section title="Ações de covil"><TraitList items={creature.lairActions} /></Section> : null}
    {creature.regionalEffects?.length ? <Section title="Efeitos regionais"><TraitList items={creature.regionalEffects} /></Section> : null}
    {creature.additionalInfo && Object.values(creature.additionalInfo).some(Boolean) ? <Section title="Informações adicionais"><dl className={styles.info}>{(["habitat", "organization", "treasure", "equipment", "notes"] as const).flatMap((key) => creature.additionalInfo?.[key] ? [<div key={key}><dt>{{ habitat: "Habitat", organization: "Organização", treasure: "Tesouro", equipment: "Equipamento", notes: "Notas" }[key]}</dt><dd>{creature.additionalInfo[key]}</dd></div>] : [])}</dl></Section> : null}
    {creature.sourceText && Object.keys(creature.sourceText).length ? <Section title="Texto da fonte"><dl className={styles.info}>{Object.entries(creature.sourceText).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></Section> : null}
    {creature.sourceRefs.length ? <footer className={styles.source}><strong>Fonte</strong> {creature.sourceRefs.map((source, index) => <span key={`${source.sourceId}-${source.chapter}-${index}`}>{[source.chapter, source.section, source.printedPage ? `p. ${source.printedPage}` : undefined].filter(Boolean).join(" · ")}</span>)}</footer> : null}
  </article>;
}
