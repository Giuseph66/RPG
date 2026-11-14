import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, MagnifyingGlass, PawPrint } from "@phosphor-icons/react";
import { AppModal, Button } from "@components/ui";
import { StatBlock } from "@components/creatures/StatBlock";
import { CREATURE_TYPES, type CreatureStatBlock, type CreatureType } from "@domain/creatures";
import { challengeText } from "./book-base";
import styles from "./book-creature-picker.module.css";

const TYPE_LABELS: Readonly<Record<CreatureType, string>> = { aberration: "Aberração", beast: "Besta", celestial: "Celestial", construct: "Constructo", dragon: "Dragão", elemental: "Elemental", fey: "Fada", fiend: "Ínfero", giant: "Gigante", humanoid: "Humanoide", monstrosity: "Monstruosidade", ooze: "Limo", plant: "Planta", undead: "Morto-vivo" };
const SIZE_LABELS = { tiny: "Miúda", small: "Pequena", medium: "Média", large: "Grande", huge: "Enorme", gargantuan: "Imensa" } as const;
type SizeFilter = "all" | keyof typeof SIZE_LABELS;
type TypeFilter = "all" | CreatureType;
type Sort = "name" | "challenge";

/** Rótulos dos tamanhos, do menor para o maior. */
const SIZES = Object.keys(SIZE_LABELS) as (keyof typeof SIZE_LABELS)[];
/** Evita montar centenas de linhas de uma vez; a busca e os filtros levam ao restante. */
const PAGE = 60;

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

function challengeValue(creature: CreatureStatBlock): number {
  // ND “—” vai para o fim da lista ao ordenar por dificuldade.
  return creature.challengeRating ? creature.challengeRating.numerator / creature.challengeRating.denominator : Number.POSITIVE_INFINITY;
}

export interface BookCreaturePickerProps {
  readonly creatures: readonly CreatureStatBlock[];
  /** O rascunho já tem um bloco estatístico que a escolha vai substituir. */
  readonly replacing?: boolean;
  readonly onClose: () => void;
  readonly onPick: (creature: CreatureStatBlock) => void;
}

/** Busca no catálogo publicado (livros e suplementos) uma criatura para servir de base ao animal. */
export function BookCreaturePicker({ creatures, replacing = false, onClose, onPick }: BookCreaturePickerProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("beast");
  const [size, setSize] = useState<SizeFilter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [selectedId, setSelectedId] = useState<string>();
  const [limit, setLimit] = useState(PAGE);
  const previewRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    return creatures
      .filter((creature) => (type === "all" || creature.creatureType === type) && (size === "all" || creature.size === size))
      .filter((creature) => !needle || normalize(`${creature.name} ${(creature.tags ?? []).join(" ")}`).includes(needle))
      .sort((left, right) => sort === "challenge"
        ? challengeValue(left) - challengeValue(right) || left.name.localeCompare(right.name, "pt-BR")
        : left.name.localeCompare(right.name, "pt-BR"));
  }, [creatures, query, size, sort, type]);
  const shown = matches.slice(0, limit);
  const selected = creatures.find((creature) => String(creature.id) === selectedId);

  // Nova busca ou filtro recomeça a lista do topo.
  useEffect(() => { setLimit(PAGE); }, [query, size, sort, type]);
  // No celular a prévia fica abaixo da lista; leva o olhar até ela quando a escolha muda.
  useEffect(() => { if (selectedId) previewRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }); }, [selectedId]);

  return <AppModal
    open
    title="Criaturas dos livros"
    onClose={onClose}
    className={styles.dialog}
    initialFocusRef={searchRef}
    footer={<div className={styles.footer}>
      <p className={styles.status} role="status">
        {selected ? <><strong>{selected.name}</strong> · ND {challengeText(selected.challengeRating)}{replacing ? " · substitui o bloco estatístico atual" : ""}</> : "Escolha uma criatura para ver o bloco completo."}
      </p>
      <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button type="button" disabled={!selected} onClick={() => selected && onPick(selected)}><PawPrint size={16} aria-hidden="true" /> Usar como base</Button>
    </div>}
  >
    <p className={styles.lead}><BookOpen size={18} weight="duotone" aria-hidden="true" /> Copia CA, PV, atributos e ações do livro para o seu animal. Nada é ligado ao original: você edita a cópia à vontade.</p>
    <div className={styles.controls}>
      <label className={[styles.control, styles.search].join(" ")}>
        <span>Buscar</span>
        <span className={styles.searchBox}><MagnifyingGlass size={16} aria-hidden="true" /><input ref={searchRef} type="search" placeholder="Nome ou marcador, ex.: lobo" value={query} onChange={(event) => setQuery(event.currentTarget.value)} /></span>
      </label>
      <label className={styles.control}><span>Tipo</span><select value={type} onChange={(event) => setType(event.currentTarget.value as TypeFilter)}><option value="all">Todos os tipos</option>{CREATURE_TYPES.map((item) => <option key={item} value={item}>{TYPE_LABELS[item]}</option>)}</select></label>
      <label className={styles.control}><span>Tamanho</span><select value={size} onChange={(event) => setSize(event.currentTarget.value as SizeFilter)}><option value="all">Todos</option>{SIZES.map((item) => <option key={item} value={item}>{SIZE_LABELS[item]}</option>)}</select></label>
      <label className={styles.control}><span>Ordem</span><select value={sort} onChange={(event) => setSort(event.currentTarget.value as Sort)}><option value="name">Nome</option><option value="challenge">ND, do menor ao maior</option></select></label>
    </div>
    <p className={styles.count} role="status">{matches.length === creatures.length ? `${matches.length} criaturas` : `${matches.length} de ${creatures.length} criaturas`}</p>
    <div className={styles.layout}>
      {creatures.length === 0 ? <p className={styles.empty}>O catálogo de criaturas não está disponível agora.</p>
        : matches.length === 0 ? <p className={styles.empty}><strong>Nenhuma correspondência</strong><span>Tente outro nome ou volte o tipo para “Todos os tipos”.</span></p>
        : <ul className={styles.list} aria-label="Criaturas encontradas">
          {shown.map((creature) => {
            const active = String(creature.id) === selectedId;
            return <li key={String(creature.id)}>
              <button type="button" className={styles.row} aria-pressed={active} onClick={() => setSelectedId(String(creature.id))}>
                <strong>{creature.name}</strong>
                <span>{TYPE_LABELS[creature.creatureType]} · {SIZE_LABELS[creature.size]} · ND {challengeText(creature.challengeRating)}</span>
                <small>CA {creature.armorClass} · PV {creature.hitPoints.average}</small>
              </button>
            </li>;
          })}
          {matches.length > shown.length ? <li><button type="button" className={styles.more} onClick={() => setLimit((current) => current + PAGE)}>Mostrar mais ({matches.length - shown.length} restantes)</button></li> : null}
        </ul>}
      <div className={styles.preview} ref={previewRef}>
        {selected ? <StatBlock creature={selected} headingLevel={3} /> : <div className={styles.previewEmpty}><BookOpen size={28} weight="duotone" aria-hidden="true" /><p>O bloco completo aparece aqui quando você escolhe uma criatura da lista.</p></div>}
      </div>
    </div>
  </AppModal>;
}
