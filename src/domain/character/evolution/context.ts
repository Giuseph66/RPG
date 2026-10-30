import type { Character, ClassLevel } from "@domain/contracts/character";
import type { ChoiceSelection } from "@domain/contracts/primitives";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { EntityId } from "@domain/contracts/ids";
import { CLASS_CASTING, SUBCLASS_CASTING, highestSlotLevel, ownSlots, slotAllotments, type CastingProfile, type SlotAllotment } from "./spell-tables";

/** Uma origem de conjuração ativa: uma classe, ou uma subclasse de terço (Cavaleiro Místico, Trapaceiro Arcano). */
export interface CastingSource {
  /** `classId`, ou o id da subclasse quando ela é quem concede a conjuração. */
  readonly key: string;
  readonly classId: string;
  readonly level: number;
  readonly profile: CastingProfile;
  /** Subclasse da classe, quando escolhida (ex.: patrono do bruxo, que amplia a lista de magias). */
  readonly subclassId?: string;
}

export function castingSourcesOf(classes: readonly Pick<ClassLevel, "classId" | "level" | "subclassId">[]): readonly CastingSource[] {
  const result: CastingSource[] = [];
  for (const entry of classes) {
    const classId = String(entry.classId);
    const own = CLASS_CASTING[classId];
    const subclassId = entry.subclassId ? String(entry.subclassId) : undefined;
    if (own && entry.level >= own.startLevel) result.push({ key: classId, classId, level: entry.level, profile: own, ...(subclassId ? { subclassId } : {}) });
    const third = subclassId ? SUBCLASS_CASTING[subclassId] : undefined;
    if (subclassId && third && third.classId === classId && entry.level >= third.startLevel) result.push({ key: subclassId, classId, level: entry.level, profile: third });
  }
  return result;
}

export function allotmentsOf(sources: readonly CastingSource[]): readonly SlotAllotment[] {
  return slotAllotments(sources.map((source) => ({ profile: source.profile.profile, level: source.level })));
}

/** Maior círculo que uma origem conjura sozinha (usado para limitar as magias que ela aprende). */
export function ownMaxSpellLevel(source: CastingSource): number {
  if (source.profile.profile === "pact") return highestSlotLevel(slotAllotments([{ profile: "pact", level: source.level }]));
  return ownSlots(source.profile.profile, source.level).length;
}

/** Classes do personagem depois de aplicar o nível (para validar escolhas contra o estado futuro). */
export function projectClasses(character: Pick<Character, "classes">, classId: string, targetLevel: number, subclassId?: string): readonly ClassLevel[] {
  const existing = character.classes.find((entry) => String(entry.classId) === classId);
  if (!existing) return [...character.classes, { classId: classId as EntityId, level: targetLevel, ...(subclassId ? { subclassId: subclassId as EntityId } : {}), choices: [] }];
  return character.classes.map((entry) => (String(entry.classId) === classId ? { ...entry, level: targetLevel, ...(subclassId ? { subclassId: subclassId as EntityId } : {}) } : entry));
}

/** Opções (ids de característica) escolhidas até agora, aplicando as trocas de invocação em ordem. */
export function chosenOptionIds(choices: readonly ChoiceSelection[]): ReadonlySet<string> {
  const chosen = new Set<string>();
  const ordered = [...choices].sort((a, b) => a.grantedAtLevel - b.grantedAtLevel);
  for (const selection of ordered) {
    const ids = selection.selectedIds.map((ref) => String(ref.entityId));
    if (/\.invocation-swap\.\d+$/.test(selection.choiceId)) {
      if (ids.length === 2) { chosen.delete(ids[0]); chosen.add(ids[1]); }
      continue;
    }
    for (const id of ids) chosen.add(id);
  }
  return chosen;
}

export function featureIdsOwned(character: Pick<Character, "choices" | "classes">, pack: RulePack): ReadonlySet<string> {
  const owned = new Set<string>(chosenOptionIds(character.choices));
  for (const entry of character.classes) {
    const definition = pack.classes.get(entry.classId);
    for (const progression of definition?.progression ?? []) {
      if (progression.level > entry.level) break;
      for (const ref of progression.featureRefs) owned.add(String(ref.entityId));
    }
    const subclass = entry.subclassId ? pack.subclasses.get(entry.subclassId) : undefined;
    for (const grant of subclass?.featureGrants ?? []) if (grant.level <= entry.level) owned.add(String(grant.featureRef.entityId));
  }
  return owned;
}
