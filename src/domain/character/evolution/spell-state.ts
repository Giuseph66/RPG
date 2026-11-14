import type { CastingSourceState, Character, ResourceState, SpellSlotState, SpellbookEntry, PreparedSelection } from "@domain/contracts/character";
import type { ChoiceSelection } from "@domain/contracts/primitives";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import { asEntityId, asUuid, type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { allotmentsOf, castingSourcesOf, type CastingSource } from "./context";
import { parseEvolutionChoiceId, SUBCLASS_BONUS_CANTRIPS } from "./spell-rules";
import { CIRCLE_TERRAIN_SPELLS } from "./terrain-spells";
import { chosenOptionIds } from "./context";
import { RACIAL_SPELLS, racialSpellKeys } from "./racial-spells";
import { composeCharacterRuleContent } from "@domain/character/creation/optional-rules";
import type { RaceSpellcastingSource } from "@domain/contracts/definitions/race";
import type { Ability } from "@domain/contracts/primitives";

export interface SpellSyncOptions {
  readonly idGenerator?: (purpose: string, index: number) => Uuid;
  /** Na criação, as magias preparadas começam com tudo o que foi escolhido (comportamento original). */
  readonly autoPrepare?: boolean;
}

function fallbackId(character: Pick<Character, "id">, purpose: string, index: number): Uuid {
  let hash = 0;
  for (const value of `${character.id}:${purpose}:${index}`) hash = (hash * 31 + value.charCodeAt(0)) >>> 0;
  return asUuid(`00000000-0000-4000-8000-${hash.toString(16).padStart(12, "0")}`);
}

type NewId = (purpose: string) => Uuid;

/** Gera ids novos que não colidem com os que a ficha já usa (fontes, espaços, grimório). */
function idFactory(character: Character, options: SpellSyncOptions): NewId {
  const used = new Set<string>([...character.castingSources.map((entry) => entry.id), ...character.spellSlots.map((entry) => entry.poolId), ...character.spellbookEntries.map((entry) => entry.id), ...character.resources.map((entry) => entry.id)]);
  const counters = new Map<string, number>();
  return (purpose) => {
    for (;;) {
      const index = counters.get(purpose) ?? 0;
      counters.set(purpose, index + 1);
      const id = options.idGenerator?.(purpose, index) ?? fallbackId(character, purpose, index);
      if (!used.has(id)) { used.add(id); return id; }
    }
  };
}

const sameRef = (left: DefinitionRef, right: DefinitionRef): boolean => left.rulesetId === right.rulesetId && left.entityId === right.entityId;
const hasRef = (list: readonly DefinitionRef[], target: DefinitionRef): boolean => list.some((entry) => sameRef(entry, target));
const withRef = (list: readonly DefinitionRef[], target: DefinitionRef): readonly DefinitionRef[] => (hasRef(list, target) ? list : [...list, target]);
const withoutRef = (list: readonly DefinitionRef[], target: DefinitionRef): readonly DefinitionRef[] => list.filter((entry) => !sameRef(entry, target));

interface Mutable {
  sources: CastingSourceState[];
  slots: SpellSlotState[];
  spellbook: SpellbookEntry[];
  prepared: PreparedSelection[];
  resources: ResourceState[];
}

function ensureSources(pack: RulePack, active: readonly CastingSource[], next: Mutable, newId: NewId): void {
  for (const source of active) {
    const existing = next.sources.find((entry) => String(entry.grantingRef.entityId) === source.key);
    if (existing) continue;
    next.sources.push({
      id: newId("casting-source"),
      grantingRef: { rulesetId: pack.manifest.id, entityId: asEntityId(source.key) },
      ability: source.profile.ability,
      knownSpellRefs: [], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [],
    });
  }
}

function addSpell(next: Mutable, sourceIndex: number, kind: "known" | "prepared" | "spellbook", spellRef: DefinitionRef, autoPrepare: boolean, newId: NewId): void {
  const source = next.sources[sourceIndex];
  if (kind === "known") { next.sources[sourceIndex] = { ...source, knownSpellRefs: withRef(source.knownSpellRefs, spellRef) }; return; }
  if (kind === "prepared") {
    next.sources[sourceIndex] = { ...source, preparedSpellRefs: withRef(source.preparedSpellRefs, spellRef) };
    if (!next.prepared.some((entry) => entry.castingSourceId === source.id && sameRef(entry.spellRef, spellRef))) next.prepared.push({ castingSourceId: source.id, spellRef, alwaysPrepared: false });
    return;
  }
  next.sources[sourceIndex] = { ...source, spellbookRefs: withRef(source.spellbookRefs, spellRef), ...(autoPrepare ? { preparedSpellRefs: withRef(source.preparedSpellRefs, spellRef) } : {}) };
  if (!next.spellbook.some((entry) => entry.castingSourceId === source.id && sameRef(entry.spellRef, spellRef))) next.spellbook.push({ id: newId("spellbook"), spellRef, castingSourceId: source.id });
  if (autoPrepare && !next.prepared.some((entry) => entry.castingSourceId === source.id && sameRef(entry.spellRef, spellRef))) next.prepared.push({ castingSourceId: source.id, spellRef, alwaysPrepared: false });
}

function swapSpell(next: Mutable, sourceIndex: number, out: DefinitionRef, incoming: DefinitionRef): void {
  const source = next.sources[sourceIndex];
  next.sources[sourceIndex] = {
    ...source,
    knownSpellRefs: hasRef(source.knownSpellRefs, out) ? withRef(withoutRef(source.knownSpellRefs, out), incoming) : source.knownSpellRefs,
    preparedSpellRefs: hasRef(source.preparedSpellRefs, out) ? withRef(withoutRef(source.preparedSpellRefs, out), incoming) : source.preparedSpellRefs,
  };
  next.prepared = next.prepared.filter((entry) => !(entry.castingSourceId === source.id && sameRef(entry.spellRef, out)));
  if (hasRef(next.sources[sourceIndex].preparedSpellRefs, incoming) && !next.prepared.some((entry) => entry.castingSourceId === source.id && sameRef(entry.spellRef, incoming))) next.prepared.push({ castingSourceId: source.id, spellRef: incoming, alwaysPrepared: false });
}

function applySelections(pack: RulePack, active: readonly CastingSource[], selections: readonly ChoiceSelection[], next: Mutable, options: SpellSyncOptions, newId: NewId): void {
  for (const selection of selections) {
    const parsed = parseEvolutionChoiceId(selection.choiceId);
    if (!parsed || selection.selectedIds.length === 0) continue;
    const sourceKey = SUBCLASS_BONUS_CANTRIPS[parsed.key]?.classId ?? parsed.key;
    const sourceIndex = next.sources.findIndex((entry) => String(entry.grantingRef.entityId) === sourceKey);
    const profile = active.find((entry) => entry.key === sourceKey)?.profile;
    if (sourceIndex < 0 || !profile) continue;
    const listKind: "known" | "prepared" | "spellbook" = profile.kind === "spellbook" ? "spellbook" : profile.kind === "prepared" ? "prepared" : "known";
    if (parsed.kind === "spell-swap") {
      if (selection.selectedIds.length === 2) swapSpell(next, sourceIndex, selection.selectedIds[0], selection.selectedIds[1]);
      continue;
    }
    if (parsed.kind === "spell-mastery" || parsed.kind === "signature-spells") continue;
    for (const spellRef of selection.selectedIds) {
      if (!pack.spells.has(spellRef.entityId)) continue;
      const isCantrip = (pack.spells.get(spellRef.entityId)?.level ?? 1) === 0;
      const kind = parsed.kind === "spells" && !isCantrip ? listKind : "known";
      addSpell(next, sourceIndex, kind, spellRef, options.autoPrepare === true, newId);
    }
  }
}

/** Magias que características concedem de graça (não contam nos limites): Mãos Mágicas, Luz, Ilusão Menor, Convocar Familiar. */
function applyAutomaticSpells(character: Character, pack: RulePack, active: readonly CastingSource[], next: Mutable, options: SpellSyncOptions, newId: NewId): void {
  const ref = (id: string): DefinitionRef => ({ rulesetId: pack.manifest.id, entityId: asEntityId(id) });
  const grant = (key: string, spellId: string): void => {
    const index = next.sources.findIndex((entry) => String(entry.grantingRef.entityId) === key);
    if (index >= 0 && pack.spells.has(asEntityId(spellId))) addSpell(next, index, "known", ref(spellId), options.autoPrepare === true, newId);
  };
  const subclassOf = (classId: string): string | undefined => character.classes.find((entry) => String(entry.classId) === classId)?.subclassId as string | undefined;
  if (active.some((entry) => entry.key === "arcane-trickster")) grant("arcane-trickster", "maos-magicas");
  if (active.some((entry) => entry.key === "cleric") && subclassOf("cleric") === "light-domain") grant("cleric", "luz");
  if (active.some((entry) => entry.key === "wizard") && subclassOf("wizard") === "school-of-illusion") grant("wizard", "ilusao-menor");
  if (active.some((entry) => entry.key === "warlock") && chosenOptionIds(character.choices).has("pact-boon.chain")) grant("warlock", "convocar-familiar");
}

/** Magias da raça: fonte própria, com a habilidade da raça, liberadas pelo nível total do personagem. */
function applyRacialSpells(character: Character, pack: RulePack, selections: readonly ChoiceSelection[], next: Mutable, options: SpellSyncOptions, newId: NewId): void {
  const totalLevel = character.classes.reduce((sum, entry) => sum + entry.level, 0);
  const picked = [...character.choices, ...selections];
  for (const key of racialSpellKeys(character)) {
    const rule = RACIAL_SPELLS[key];
    if (!rule) continue;
    if (!next.sources.some((entry) => String(entry.grantingRef.entityId) === key)) {
      next.sources.push({ id: newId("casting-source"), grantingRef: { rulesetId: pack.manifest.id, entityId: asEntityId(key) }, sourceKind: "race", ability: rule.ability, knownSpellRefs: [], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [] });
    }
    const index = next.sources.findIndex((entry) => String(entry.grantingRef.entityId) === key);
    next.sources[index] = { ...next.sources[index], sourceKind: "race" };
    for (const grant of rule.spells) {
      if (grant.level <= totalLevel && pack.spells.has(asEntityId(grant.spellId))) addSpell(next, index, "known", { rulesetId: pack.manifest.id, entityId: asEntityId(grant.spellId) }, false, newId);
    }
    for (const selection of picked.filter((entry) => entry.choiceId === rule.cantripChoice)) {
      for (const spellRef of selection.selectedIds) if (pack.spells.has(spellRef.entityId)) addSpell(next, index, "known", spellRef, false, newId);
    }
  }
}

function chosenAbility(source: RaceSpellcastingSource, character: Character, selections: readonly ChoiceSelection[]): Ability | undefined {
  if (source.ability) return source.ability;
  const choices = [...character.choices, ...selections];
  const selected = choices.find((entry) => entry.choiceId === source.abilityChoiceId)?.selectedIds[0]?.entityId;
  const ability = selected === undefined ? undefined : String(selected) as Ability;
  return ability && source.abilityOptions?.includes(ability) ? ability : undefined;
}

/** Sources are rebuilt from the raw pack and persisted opt-in, never from a previously composed map. */
function applyRaceDefinitionSpells(character: Character, pack: RulePack, selections: readonly ChoiceSelection[], next: Mutable, newId: NewId): void {
  const totalLevel = character.classes.reduce((sum, entry) => sum + entry.level, 0);
  const race = pack.races.get(character.raceRef.entityId);
  const sources = race?.spellcastingSources ?? [];
  for (const definition of sources) {
    if ((definition.minTotalLevel ?? 1) > totalLevel) continue;
    const ability = chosenAbility(definition, character, selections);
    if (!ability) continue;
    const sourceRef = { rulesetId: pack.manifest.id, entityId: definition.id };
    let index = next.sources.findIndex((entry) => sameRef(entry.grantingRef, sourceRef));
    if (index < 0) {
      next.sources.push({
        id: newId("casting-source"),
        grantingRef: sourceRef,
        sourceKind: "race",
        ability,
        knownSpellRefs: [], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [],
      });
      index = next.sources.length - 1;
    }
    const id = next.sources[index].id;
    for (const spellRef of [...definition.spellRefs, ...(definition.cantripRefs ?? [])]) {
      if (spellRef.rulesetId !== pack.manifest.id || !pack.spells.has(spellRef.entityId)) continue;
      const current = next.sources[index];
      next.sources[index] = { ...current, ability, knownSpellRefs: withRef(current.knownSpellRefs, spellRef) };
    }
    const resource = definition.resourceRef;
    let featureResourceId = next.sources[index].featureResourceId;
    if (resource && definition.usesPerLongRest !== undefined) {
      if (resource.rulesetId !== pack.manifest.id || !pack.resources.has(resource.entityId)) {
        featureResourceId = undefined;
      } else {
        let state = next.resources.find((entry) => sameRef(entry.definitionRef, resource) && entry.ownerInstanceId === id);
        if (!state) {
          state = { id: newId("racial-spell-resource"), definitionRef: resource, ownerInstanceId: id, spent: 0 };
          next.resources.push(state);
        }
        featureResourceId = state.id;
      }
    }
    const current = next.sources[index];
    next.sources[index] = {
      ...current,
      sourceKind: "race",
      ability,
      ...(definition.usesPerLongRest === undefined ? {} : { requiresFeatureResource: true }),
      ...(featureResourceId === undefined ? {} : { featureResourceId }),
      ...(definition.spellListClassId === undefined ? {} : { spellListClassId: definition.spellListClassId }),
      ...(definition.canUseSpellSlots === undefined ? {} : { usesSpellSlots: definition.canUseSpellSlots }),
    };
  }
}

/** Choices de uma feature opt-in que concede uma pequena lista explícita de magias. */
function applyFeatureSpellChoices(character: Character, pack: RulePack, selections: readonly ChoiceSelection[], next: Mutable, newId: NewId): void {
  const picked = new Map<string, ChoiceSelection>();
  for (const selection of [...character.choices, ...selections]) picked.set(selection.choiceId, selection);
  const selectedFeatureIds = activeFeatureIds(character, pack);
  for (const featureId of [...picked.values()].flatMap((selection) => selection.selectedIds.map((ref) => String(ref.entityId)))) {
    if (pack.features.has(asEntityId(featureId))) selectedFeatureIds.add(asEntityId(featureId));
  }
  const activeFeatureSources = new Set([...selectedFeatureIds].filter((featureId) => pack.features.get(featureId)?.spellcastingSource).map(String));
  const staleSources = next.sources.filter((source) => source.sourceKind === "feature" && !activeFeatureSources.has(String(source.grantingRef.entityId)));
  if (staleSources.length > 0) {
    const staleIds = new Set(staleSources.map((source) => source.id));
    next.sources = next.sources.filter((source) => !staleIds.has(source.id));
    next.prepared = next.prepared.filter((selection) => !staleIds.has(selection.castingSourceId));
    next.spellbook = next.spellbook.filter((entry) => !staleIds.has(entry.castingSourceId));
    next.resources = next.resources.filter((resource) => !staleIds.has(resource.ownerInstanceId));
  }
  for (const featureId of selectedFeatureIds) {
    const feature = pack.features.get(asEntityId(featureId));
    const sourceDefinition = feature?.spellcastingSource;
    if (!feature || !sourceDefinition) continue;
    const spellGrants = feature.effects.filter((effect) => effect.kind === "grants-spell");
    const sourceRef = { rulesetId: pack.manifest.id, entityId: feature.id };
    let sourceIndex = next.sources.findIndex((entry) => sameRef(entry.grantingRef, sourceRef));
    if (sourceIndex < 0) {
      next.sources.push({
        id: newId("feature-casting-source"),
        grantingRef: sourceRef,
        sourceKind: "feature",
        ability: sourceDefinition.ability,
        knownSpellRefs: [], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [],
        ...(sourceDefinition.spellListClassId ? { spellListClassId: sourceDefinition.spellListClassId } : {}),
        ...(sourceDefinition.usesSpellSlots ? { usesSpellSlots: true } : {}),
      });
      sourceIndex = next.sources.length - 1;
    }
    const sourceId = next.sources[sourceIndex].id;
    let desiredKnown: readonly DefinitionRef[] = [];
    let desiredPrepared: readonly DefinitionRef[] = [];
    const desiredAlwaysPrepared: DefinitionRef[] = [];
    const desiredResources: { spellRef: DefinitionRef; resourceId: Uuid }[] = [];
    const desiredOverrides: { spellRef: DefinitionRef; ignoreMaterialComponents?: true; concentrationAlternativeMinutes?: number }[] = [];
    let unresolvedFeatureResource = false;

    for (const effect of spellGrants) {
      if (effect.kind !== "grants-spell" || effect.spellRef.rulesetId !== pack.manifest.id || !pack.spells.has(effect.spellRef.entityId)) continue;
      if (effect.alwaysPrepared) {
        desiredPrepared = withRef(desiredPrepared, effect.spellRef);
        if (!desiredAlwaysPrepared.some((entry) => sameRef(entry, effect.spellRef))) desiredAlwaysPrepared.push(effect.spellRef);
      } else desiredKnown = withRef(desiredKnown, effect.spellRef);
      if ((effect.ignoreMaterialComponents || effect.concentrationAlternativeMinutes !== undefined) && !desiredOverrides.some((entry) => sameRef(entry.spellRef, effect.spellRef))) {
        desiredOverrides.push({
          spellRef: effect.spellRef,
          ...(effect.ignoreMaterialComponents ? { ignoreMaterialComponents: true as const } : {}),
          ...(effect.concentrationAlternativeMinutes === undefined ? {} : { concentrationAlternativeMinutes: effect.concentrationAlternativeMinutes }),
        });
      }
      if (effect.resourceRef) {
        const resource = effect.resourceRef.rulesetId === pack.manifest.id ? pack.resources.get(effect.resourceRef.entityId) : undefined;
        if (!resource) {
          unresolvedFeatureResource = true;
          continue;
        }
        // Level-up also records a generic grants-resource state owned by the character. Reuse
        // that exact pool for the feature spell instead of creating a second use. If an older
        // JSON already contains both copies, collapse only the character-owned and this source's
        // matching states; the greatest spent value preserves use already recorded in either.
        const matchingStates = next.resources.filter((entry) =>
          sameRef(entry.definitionRef, effect.resourceRef!) &&
          (entry.ownerInstanceId === sourceId || entry.ownerInstanceId === character.id),
        );
        const linkedResourceId = next.sources[sourceIndex].featureSpellResources?.find((entry) => sameRef(entry.spellRef, effect.spellRef))?.resourceId;
        const reusableState = matchingStates.find((entry) => entry.id === linkedResourceId)
          ?? matchingStates.find((entry) => entry.ownerInstanceId === sourceId)
          ?? matchingStates.find((entry) => entry.ownerInstanceId === character.id);
        let state: ResourceState;
        if (reusableState) {
          const matchingIds = new Set(matchingStates.map((entry) => entry.id));
          state = {
            ...reusableState,
            ownerInstanceId: sourceId,
            spent: Math.max(...matchingStates.map((entry) => entry.spent)),
          };
          next.resources = next.resources.filter((entry) => !matchingIds.has(entry.id));
          next.resources.push(state);
        } else {
          state = { id: newId("feature-spell-resource"), definitionRef: effect.resourceRef, ownerInstanceId: sourceId, spent: 0 };
          next.resources.push(state);
        }
        if (!desiredResources.some((entry) => sameRef(entry.spellRef, effect.spellRef))) desiredResources.push({ spellRef: effect.spellRef, resourceId: state.id });
      }
    }

    for (const choice of feature.choices) {
      const selection = picked.get(choice.id);
      if (!selection || (choice.kind !== "cantrip" && choice.kind !== "spell")) continue;
      for (const spellRef of selection.selectedIds) {
        const spell = spellRef.rulesetId === pack.manifest.id ? pack.spells.get(spellRef.entityId) : undefined;
        if (!spell || spell.level !== 0 || (sourceDefinition.spellListClassId && !spell.classes.includes(sourceDefinition.spellListClassId))) continue;
        desiredKnown = withRef(desiredKnown, spellRef);
      }
    }

    const priorResourceIds = new Set((next.sources[sourceIndex].featureSpellResources ?? []).map((entry) => entry.resourceId));
    const desiredResourceIds = new Set(desiredResources.map((entry) => entry.resourceId));
    if (priorResourceIds.size > 0) next.resources = next.resources.filter((resource) => resource.ownerInstanceId !== sourceId || !priorResourceIds.has(resource.id) || desiredResourceIds.has(resource.id));
    next.prepared = next.prepared.filter((entry) => entry.castingSourceId !== sourceId);
    next.spellbook = next.spellbook.filter((entry) => entry.castingSourceId !== sourceId);
    for (const spellRef of desiredPrepared) next.prepared.push({ castingSourceId: sourceId, spellRef, alwaysPrepared: desiredAlwaysPrepared.some((entry) => sameRef(entry, spellRef)) });
    const source = next.sources[sourceIndex];
    next.sources[sourceIndex] = {
      ...source,
      knownSpellRefs: desiredKnown,
      preparedSpellRefs: desiredPrepared,
      spellbookRefs: [],
      ...(desiredResources.length > 0 ? { featureSpellResources: desiredResources } : { featureSpellResources: undefined }),
      ...(desiredOverrides.length > 0 ? { featureSpellOverrides: desiredOverrides } : { featureSpellOverrides: undefined }),
      ...(unresolvedFeatureResource ? { requiresFeatureResource: true } : { requiresFeatureResource: undefined }),
      ...(sourceDefinition.spellListClassId ? { spellListClassId: sourceDefinition.spellListClassId } : {}),
      ...(sourceDefinition.usesSpellSlots ? { usesSpellSlots: true } : {}),
    };
  }
}

function activeFeatureIds(character: Character, pack: RulePack): Set<import("@domain/contracts/ids").EntityId> {
  const result = new Set<import("@domain/contracts/ids").EntityId>();
  const add = (ref: DefinitionRef): void => {
    if (ref.rulesetId === pack.manifest.id && pack.features.has(ref.entityId)) result.add(ref.entityId);
  };
  for (const classLevel of character.classes) {
    const classDefinition = pack.classes.get(classLevel.classId);
    for (const level of classDefinition?.progression ?? []) if (level.level <= classLevel.level) for (const featureRef of level.featureRefs) add(featureRef);
    const subclass = classLevel.subclassId ? pack.subclasses.get(classLevel.subclassId) : undefined;
    for (const grant of subclass?.featureGrants ?? []) if (grant.level <= classLevel.level) add(grant.featureRef);
  }
  return result;
}

function attachRaceSpellSlots(pack: RulePack, next: Mutable): void {
  next.sources = next.sources.map((source) => {
    if (source.usesSpellSlots !== true || !source.spellListClassId) return source;
    const minimumLevel = Math.min(...source.knownSpellRefs.map((ref) => pack.spells.get(ref.entityId)?.level ?? 0).filter((level) => level > 0), Number.POSITIVE_INFINITY);
    const eligibleSlots = next.slots.filter((slot) => slot.slotLevel >= (Number.isFinite(minimumLevel) ? minimumLevel : 1));
    return { ...source, resourcePoolIds: [...new Set([...source.resourcePoolIds, ...eligibleSlots.map((slot) => slot.poolId)])] };
  });
}

function attachFeatureSpellSlots(pack: RulePack, next: Mutable): void {
  next.sources = next.sources.map((source) => {
    if (source.sourceKind !== "feature" || source.usesSpellSlots !== true || !source.spellListClassId) return source;
    const minimumLevel = Math.min(...source.knownSpellRefs.map((ref) => pack.spells.get(ref.entityId)?.level ?? 0).filter((level) => level > 0), Number.POSITIVE_INFINITY);
    const eligibleSlots = next.slots.filter((slot) => slot.slotLevel >= (Number.isFinite(minimumLevel) ? minimumLevel : 1));
    return { ...source, resourcePoolIds: [...new Set([...source.resourcePoolIds, ...eligibleSlots.map((slot) => slot.poolId)])] };
  });
}

/** Espaços de magia: um registro por espaço, preservando os gastos ao crescer ou trocar de círculo. */
function syncSlots(active: readonly CastingSource[], next: Mutable, newId: NewId): void {
  const wanted = allotmentsOf(active);
  const rebuilt: SpellSlotState[] = [];
  for (const kind of ["spellcasting", "pact"] as const) {
    const existing = next.slots.filter((slot) => slot.kind === kind);
    const wantedOfKind = wanted.filter((entry) => entry.kind === kind);
    if (kind === "pact") {
      const spentTotal = existing.reduce((sum, slot) => sum + slot.spent, 0);
      for (const entry of wantedOfKind) for (let index = 0; index < entry.count; index += 1) {
        const reused = existing[index];
        rebuilt.push({ poolId: reused?.poolId ?? newId("spell-slot"), kind, slotLevel: entry.slotLevel, spent: index < spentTotal ? 1 : 0 });
      }
      continue;
    }
    for (const entry of wantedOfKind) {
      const sameLevel = existing.filter((slot) => slot.slotLevel === entry.slotLevel);
      for (let index = 0; index < entry.count; index += 1) {
        const reused = sameLevel[index];
        rebuilt.push(reused ?? { poolId: newId("spell-slot"), kind, slotLevel: entry.slotLevel, spent: 0 });
      }
    }
  }
  next.slots = rebuilt;
  next.sources = next.sources.map((source) => {
    const key = String(source.grantingRef.entityId);
    const active_ = active.find((entry) => entry.key === key);
    if (!active_) return source;
    const kind = active_.profile.profile === "pact" ? "pact" : "spellcasting";
    return { ...source, resourcePoolIds: rebuilt.filter((slot) => slot.kind === kind).map((slot) => slot.poolId) };
  });
}

/** Magias do Círculo da Terra: dependem do terreno escolhido e ficam sempre preparadas. */
function applyTerrainSpells(character: Character, pack: RulePack, active: readonly CastingSource[], next: Mutable): void {
  const druid = character.classes.find((entry) => String(entry.classId) === "druid");
  const terrain = [...chosenOptionIds(character.choices)].find((id) => id.startsWith("druid-terrain."))?.replace("druid-terrain.", "");
  const sourceIndex = next.sources.findIndex((source) => String(source.grantingRef.entityId) === "druid");
  if (!druid || String(druid.subclassId) !== "circle-of-the-land" || !terrain || sourceIndex < 0 || !active.some((source) => source.key === "druid")) return;
  for (const [level, spellIds] of CIRCLE_TERRAIN_SPELLS[terrain] ?? []) {
    if (level > druid.level) continue;
    for (const spellId of spellIds) {
      if (!pack.spells.has(asEntityId(spellId))) continue;
      const spellRef: DefinitionRef = { rulesetId: pack.manifest.id, entityId: asEntityId(spellId) };
      const source = next.sources[sourceIndex];
      next.sources[sourceIndex] = { ...source, preparedSpellRefs: withRef(source.preparedSpellRefs, spellRef) };
      const existing = next.prepared.findIndex((selection) => selection.castingSourceId === source.id && sameRef(selection.spellRef, spellRef));
      if (existing >= 0) next.prepared[existing] = { ...next.prepared[existing], alwaysPrepared: true };
      else next.prepared.push({ castingSourceId: source.id, spellRef, alwaysPrepared: true });
    }
  }
}

/** Concessões de subclasse: magias preparadas ou conhecidas sem contar no limite, conforme o grant. */
function applySubclassGrants(character: Character, pack: RulePack, active: readonly CastingSource[], next: Mutable): void {
  for (const entry of character.classes) {
    const subclass = entry.subclassId ? pack.subclasses.get(entry.subclassId) : undefined;
    if (!subclass) continue;
    const sourceIndex = next.sources.findIndex((source) => String(source.grantingRef.entityId) === String(entry.classId));
    const caster = active.find((source) => source.key === String(entry.classId));
    if (sourceIndex < 0 || !caster) continue;
    for (const grant of subclass.spellGrants) {
      if (grant.level > entry.level || !pack.spells.has(grant.spellRef.entityId)) continue;
      const source = next.sources[sourceIndex];
      // Um grant marcado como conhecido extra (Guardião/Tasha) pertence à fonte Ranger,
      // mas não vira escolha nem consome a quantidade da tabela. Bruxo sem esse marcador
      // continua apenas com sua lista expandida de seleção.
      if (!grant.alwaysPrepared && grant.knownWithoutCount && caster.profile.kind === "known") {
        next.sources[sourceIndex] = { ...source, knownSpellRefs: withRef(source.knownSpellRefs, grant.spellRef) };
        continue;
      }
      if (!grant.alwaysPrepared) continue;
      next.sources[sourceIndex] = { ...source, preparedSpellRefs: withRef(source.preparedSpellRefs, grant.spellRef) };
      const existing = next.prepared.findIndex((selection) => selection.castingSourceId === source.id && sameRef(selection.spellRef, grant.spellRef));
      if (existing >= 0) next.prepared[existing] = { ...next.prepared[existing], alwaysPrepared: grant.alwaysPrepared };
      else next.prepared.push({ castingSourceId: source.id, spellRef: grant.spellRef, alwaysPrepared: grant.alwaysPrepared });
    }
  }
}

/**
 * Reconcilia a ficha com as classes atuais: cria fontes de conjuração que faltam, ajusta os
 * espaços de magia, aplica as magias das escolhas informadas (novas, trocas) e dá um dado de
 * vida para cada classe. Não remove magias que o jogador já tem.
 */
export function syncSpellcasting(character: Character, pack: RulePack, selections: readonly ChoiceSelection[], options: SpellSyncOptions = {}): Character {
  const composed = composeCharacterRuleContent(pack, character);
  if (!composed.ok) return character;
  pack = composed.value;
  const active = castingSourcesOf(character.classes);
  const next: Mutable = { sources: [...character.castingSources], slots: [...character.spellSlots], spellbook: [...character.spellbookEntries], prepared: [...character.preparedSelections], resources: [...character.resources] };
  const newId = idFactory(character, options);
  ensureSources(pack, active, next, newId);
  applySelections(pack, active, selections, next, options, newId);
  applyAutomaticSpells(character, pack, active, next, options, newId);
  applySubclassGrants(character, pack, active, next);
  applyTerrainSpells(character, pack, active, next);
  applyRacialSpells(character, pack, selections, next, options, newId);
  applyRaceDefinitionSpells(character, pack, selections, next, newId);
  applyFeatureSpellChoices(character, pack, selections, next, newId);
  syncSlots(active, next, newId);
  attachRaceSpellSlots(pack, next);
  attachFeatureSpellSlots(pack, next);
  const hitDiceSpent = character.classes.map((entry) => {
    const existing = character.hitDiceSpent.find((dice) => dice.classId === entry.classId);
    return existing ?? { classId: entry.classId, hitDie: pack.classes.get(entry.classId)?.hitDie ?? (8 as const), spent: 0 };
  });
  return { ...character, castingSources: next.sources, spellSlots: next.slots, spellbookEntries: next.spellbook, preparedSelections: next.prepared, resources: next.resources, hitDiceSpent };
}
