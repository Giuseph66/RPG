/**
 * Criaturas da jornada: registro completo do mestre, revelações por jogador e palpites.
 *
 * O registro (`CreatureRecord`) nunca sai do mestre. Cada jogador enxerga apenas uma
 * projeção (`CreatureSighting`) com os campos que o mestre revelou para a conta dele,
 * e registra o que acha que a criatura é em um documento próprio (`CreatureGuess`).
 * Funções puras: sem relógio, IDs ou armazenamento.
 */

import { type AccountId, type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { type NpcRecord } from "@domain/contracts/campaign";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision, type Revision } from "@domain/contracts/versioning";

export const CREATURE_SCHEMA_VERSION = 1;

export type CreatureKind = "npc" | "enemy" | "animal" | "unknown";
export const CREATURE_KINDS: readonly CreatureKind[] = ["npc", "enemy", "animal", "unknown"];

/** Campos que o mestre pode revelar. As notas do mestre ficam fora de propósito. */
export type CreatureField = "name" | "kind" | "appearance" | "race" | "description" | "hitPoints" | "armorClass" | "abilities";
export const CREATURE_FIELDS: readonly CreatureField[] = ["name", "kind", "appearance", "race", "description", "hitPoints", "armorClass", "abilities"];

export type CreatureTextField = Exclude<CreatureField, "kind">;

export interface CreatureReveal {
  readonly accountId: AccountId;
  readonly fields: readonly CreatureField[];
}

export interface CreatureRecord {
  readonly id: Uuid;
  readonly campaignId: Uuid;
  readonly schemaVersion: typeof CREATURE_SCHEMA_VERSION;
  readonly revision: Revision;
  readonly kind: CreatureKind;
  readonly name: string;
  readonly appearance: string;
  readonly race: string;
  readonly description: string;
  readonly hitPoints: string;
  readonly armorClass: string;
  readonly abilities: string;
  /** Somente do mestre; nunca entra em uma projeção. */
  readonly notes: string;
  readonly characterRef?: Uuid;
  readonly reveals: readonly CreatureReveal[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Projeção que um jogador recebe. Campos ausentes continuam desconhecidos. */
export interface CreatureSighting {
  readonly id: string;
  readonly campaignId: Uuid;
  readonly creatureId: Uuid;
  readonly accountId: AccountId;
  readonly schemaVersion: typeof CREATURE_SCHEMA_VERSION;
  readonly revision: Revision;
  readonly kind?: CreatureKind;
  readonly revealed: Readonly<Partial<Record<CreatureTextField, string>>>;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Campos que o jogador pode supor além de nome, categoria e anotação livre. */
export type CreatureGuessField = "appearance" | "race" | "hitPoints" | "armorClass" | "abilities";
export const CREATURE_GUESS_FIELDS: readonly CreatureGuessField[] = ["appearance", "race", "hitPoints", "armorClass", "abilities"];

/** Palpite do jogador sobre uma criatura que ele avistou. */
export interface CreatureGuess {
  readonly id: string;
  readonly campaignId: Uuid;
  readonly creatureId: Uuid;
  readonly accountId: AccountId;
  readonly schemaVersion: typeof CREATURE_SCHEMA_VERSION;
  readonly revision: Revision;
  readonly kind?: CreatureKind;
  readonly name: string;
  /** Suposição sobre "O que se sabe": história, intenção, o que ele parece querer. */
  readonly note: string;
  /** Suposições dos demais campos; ausente em palpites antigos. */
  readonly fields?: Readonly<Partial<Record<CreatureGuessField, string>>>;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export const CREATURE_KIND_LABELS: Readonly<Record<CreatureKind, string>> = {
  npc: "NPC",
  enemy: "Ameaça",
  animal: "Animal",
  unknown: "Não categorizado",
};

export const CREATURE_FIELD_LABELS: Readonly<Record<CreatureField, string>> = {
  name: "Nome",
  kind: "Categoria",
  appearance: "Aparência",
  race: "Raça ou espécie",
  description: "O que se sabe",
  hitPoints: "Pontos de vida",
  armorClass: "Classe de armadura",
  abilities: "Habilidades e magias",
};

const TEXT_LIMITS: Readonly<Record<CreatureTextField | "notes", number>> = {
  name: 80,
  appearance: 600,
  race: 80,
  description: 1200,
  hitPoints: 40,
  armorClass: 40,
  abilities: 1200,
  notes: 2000,
};

/** O ID é determinístico para o Firestore endereçar o documento sem consulta. */
export function sightingId(creatureId: string, accountId: string): string {
  return `${creatureId}__${accountId}`;
}

export function isCreatureKind(value: unknown): value is CreatureKind {
  return typeof value === "string" && (CREATURE_KINDS as readonly string[]).includes(value);
}

export function isCreatureField(value: unknown): value is CreatureField {
  return typeof value === "string" && (CREATURE_FIELDS as readonly string[]).includes(value);
}

export type CreatureContent = Pick<CreatureRecord, "kind" | "name" | "appearance" | "race" | "description" | "hitPoints" | "armorClass" | "abilities" | "notes" | "characterRef">;

export function validateCreatureContent(content: CreatureContent): Result<CreatureContent, AppError> {
  if (!isCreatureKind(content.kind)) return err(appError.validation("kind", "Categoria de criatura inválida."));
  const name = content.name.trim();
  if (!name) return err(appError.validation("name", "Informe um nome para a criatura."));
  for (const [field, limit] of Object.entries(TEXT_LIMITS) as [keyof typeof TEXT_LIMITS, number][]) {
    if (content[field].length > limit) return err(appError.validation(field, `${field === "notes" ? "Notas do mestre" : CREATURE_FIELD_LABELS[field]} aceita até ${limit} caracteres.`));
  }
  return ok({ ...content, name });
}

/** Normaliza revelações: uma entrada por conta, campos únicos e na ordem canônica. */
export function normalizeReveals(reveals: readonly CreatureReveal[]): readonly CreatureReveal[] {
  const byAccount = new Map<string, Set<CreatureField>>();
  for (const reveal of reveals) {
    const fields = byAccount.get(reveal.accountId) ?? new Set<CreatureField>();
    for (const field of reveal.fields) if (isCreatureField(field)) fields.add(field);
    byAccount.set(reveal.accountId, fields);
  }
  return [...byAccount.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([accountId, fields]) => ({ accountId: accountId as AccountId, fields: CREATURE_FIELDS.filter((field) => fields.has(field)) }));
}

export function revealFor(creature: Pick<CreatureRecord, "reveals">, accountId: string): CreatureReveal | undefined {
  return creature.reveals.find((reveal) => reveal.accountId === accountId);
}

/** Mostra (ou esconde) a presença da criatura para as contas. Esconder remove todos os campos. */
export function setRevealPresence(creature: CreatureRecord, accountIds: readonly AccountId[], visible: boolean): CreatureRecord {
  const targets = new Set<string>(accountIds);
  const kept = creature.reveals.filter((reveal) => !targets.has(reveal.accountId));
  const added = visible ? accountIds.map((accountId) => revealFor(creature, accountId) ?? { accountId, fields: [] }) : [];
  return { ...creature, reveals: normalizeReveals([...kept, ...added]) };
}

/** Liga/desliga um campo para as contas. Revelar um campo também revela a presença. */
export function setRevealField(creature: CreatureRecord, accountIds: readonly AccountId[], field: CreatureField, visible: boolean): CreatureRecord {
  const targets = new Set<string>(accountIds);
  const updated = creature.reveals.map((reveal) => targets.has(reveal.accountId)
    ? { ...reveal, fields: visible ? [...reveal.fields, field] : reveal.fields.filter((item) => item !== field) }
    : reveal);
  const missing = visible ? accountIds.filter((accountId) => !revealFor(creature, accountId)).map((accountId) => ({ accountId, fields: [field] })) : [];
  return { ...creature, reveals: normalizeReveals([...updated, ...missing]) };
}

/** Projeção pura de um registro para um jogador. Campos vazios não são enviados. */
export function projectSighting(creature: CreatureRecord, reveal: CreatureReveal, times: { readonly createdAt: IsoTimestamp; readonly updatedAt: IsoTimestamp }, revision: Revision): CreatureSighting {
  const revealed: Partial<Record<CreatureTextField, string>> = {};
  for (const field of reveal.fields) {
    if (field === "kind") continue;
    const value = creature[field].trim();
    if (value) revealed[field] = value;
  }
  return {
    id: sightingId(creature.id, reveal.accountId),
    campaignId: creature.campaignId,
    creatureId: creature.id,
    accountId: reveal.accountId,
    schemaVersion: CREATURE_SCHEMA_VERSION,
    revision,
    ...(reveal.fields.includes("kind") ? { kind: creature.kind } : {}),
    revealed,
    createdAt: times.createdAt,
    updatedAt: times.updatedAt,
  };
}

/** Duas projeções mostram a mesma coisa ao jogador? Evita reescrever documentos sem mudança. */
export function sameSightingContent(left: Pick<CreatureSighting, "kind" | "revealed">, right: Pick<CreatureSighting, "kind" | "revealed">): boolean {
  if (left.kind !== right.kind) return false;
  const keys = new Set([...Object.keys(left.revealed), ...Object.keys(right.revealed)]) as Set<CreatureTextField>;
  for (const key of keys) if (left.revealed[key] !== right.revealed[key]) return false;
  return true;
}

type GuessContent = Pick<CreatureGuess, "kind" | "name" | "note" | "fields">;

export function validateGuessContent(input: GuessContent): Result<GuessContent, AppError> {
  if (input.kind !== undefined && !isCreatureKind(input.kind)) return err(appError.validation("kind", "Categoria do palpite inválida."));
  if (input.name.length > 80) return err(appError.validation("name", "O nome do palpite aceita até 80 caracteres."));
  if (input.note.length > 800) return err(appError.validation("note", "O palpite aceita até 800 caracteres."));
  const fields: Partial<Record<CreatureGuessField, string>> = {};
  for (const field of CREATURE_GUESS_FIELDS) {
    const value = input.fields?.[field]?.trim();
    if (!value) continue;
    if (value.length > TEXT_LIMITS[field]) return err(appError.validation(field, `${CREATURE_FIELD_LABELS[field]} aceita até ${TEXT_LIMITS[field]} caracteres.`));
    fields[field] = value;
  }
  return ok({ ...(input.kind ? { kind: input.kind } : {}), name: input.name.trim(), note: input.note.trim(), ...(Object.keys(fields).length ? { fields } : {}) });
}

/** Quantas suposições o jogador registrou (categoria, nome, anotação e campos). */
export function guessCount(guess: Pick<CreatureGuess, "kind" | "name" | "note" | "fields"> | undefined): number {
  if (!guess) return 0;
  return (guess.kind ? 1 : 0) + (guess.name ? 1 : 0) + (guess.note ? 1 : 0) + Object.values(guess.fields ?? {}).filter(Boolean).length;
}

/** Converte registros narrativos antigos (Campaign.npcs) preservando o ID usado em encontros. */
export function creatureFromLegacyNpc(npc: NpcRecord, campaignId: Uuid): CreatureRecord {
  const kind: CreatureKind = isCreatureKind(npc.kind) ? npc.kind : "npc";
  return {
    id: npc.id,
    campaignId,
    schemaVersion: CREATURE_SCHEMA_VERSION,
    revision: asRevision(0),
    kind,
    name: npc.name,
    appearance: "",
    race: "",
    description: npc.description,
    hitPoints: "",
    armorClass: "",
    abilities: "",
    notes: "",
    ...(npc.characterRef ? { characterRef: npc.characterRef } : {}),
    reveals: [],
    createdAt: npc.createdAt,
    updatedAt: npc.updatedAt,
  };
}

/** Visão que o jogador enxerga, combinando o que foi revelado com o próprio palpite. */
export interface CreaturePlayerView {
  readonly title: string;
  readonly titleIsGuess: boolean;
  readonly kind: CreatureKind;
  readonly kindIsGuess: boolean;
}

export function playerView(sighting: Pick<CreatureSighting, "kind" | "revealed">, guess?: Pick<CreatureGuess, "kind" | "name">): CreaturePlayerView {
  const revealedName = sighting.revealed.name;
  const guessedName = guess?.name.trim();
  return {
    title: revealedName ?? (guessedName || "Presença desconhecida"),
    titleIsGuess: !revealedName && Boolean(guessedName),
    kind: sighting.kind ?? guess?.kind ?? "unknown",
    kindIsGuess: sighting.kind === undefined && guess?.kind !== undefined,
  };
}

export function isCreatureRecord(value: unknown): value is CreatureRecord {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  const texts = ["name", "appearance", "race", "description", "hitPoints", "armorClass", "abilities", "notes"];
  return typeof item.id === "string" && typeof item.campaignId === "string" && item.schemaVersion === CREATURE_SCHEMA_VERSION &&
    Number.isInteger(item.revision) && Number(item.revision) >= 0 && isCreatureKind(item.kind) &&
    texts.every((key) => typeof item[key] === "string") && Array.isArray(item.reveals) &&
    item.reveals.every((reveal) => typeof reveal === "object" && reveal !== null && typeof (reveal as CreatureReveal).accountId === "string" && Array.isArray((reveal as CreatureReveal).fields)) &&
    typeof item.createdAt === "string" && typeof item.updatedAt === "string";
}

export function isCreatureSighting(value: unknown): value is CreatureSighting {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.campaignId === "string" && typeof item.creatureId === "string" && typeof item.accountId === "string" &&
    item.schemaVersion === CREATURE_SCHEMA_VERSION && Number.isInteger(item.revision) && Number(item.revision) >= 0 &&
    (item.kind === undefined || isCreatureKind(item.kind)) && typeof item.revealed === "object" && item.revealed !== null && !Array.isArray(item.revealed) &&
    typeof item.createdAt === "string" && typeof item.updatedAt === "string";
}

export function isCreatureGuess(value: unknown): value is CreatureGuess {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.campaignId === "string" && typeof item.creatureId === "string" && typeof item.accountId === "string" &&
    item.schemaVersion === CREATURE_SCHEMA_VERSION && Number.isInteger(item.revision) && Number(item.revision) >= 0 &&
    (item.kind === undefined || isCreatureKind(item.kind)) && typeof item.name === "string" && typeof item.note === "string" &&
    (item.fields === undefined || (typeof item.fields === "object" && item.fields !== null && !Array.isArray(item.fields))) &&
    typeof item.createdAt === "string" && typeof item.updatedAt === "string";
}
