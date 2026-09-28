#!/usr/bin/env node
/**
 * Baixa da D&D 5e SRD API (https://www.dnd5eapi.co, conjunto 2014) somente os campos
 * comparáveis com o nosso rule pack e grava um snapshot condensado em
 * `tests/srd/snapshot.json`.
 *
 * A suíte `tests/srd` lê apenas esse arquivo: `npm run test` continua offline e
 * determinístico. Rode `npm run srd:snapshot` para atualizar a base.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://www.dnd5eapi.co";
const ROOT = "/api/2014";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/srd/snapshot.json");
const CONCURRENCY = 8;

async function get(path, attempt = 1) {
  const response = await fetch(`${BASE}${path}`);
  if (response.ok) return response.json();
  if (attempt < 4 && (response.status === 429 || response.status >= 500)) {
    await new Promise((done) => setTimeout(done, 500 * attempt));
    return get(path, attempt + 1);
  }
  throw new Error(`${response.status} ao buscar ${path}`);
}

async function mapLimit(items, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }));
  return results;
}

const list = async (endpoint, lang) => (await get(`${ROOT}/${endpoint}${lang ? `?lang=${lang}` : ""}`)).results;
const namesPt = async (endpoint) => new Map((await list(endpoint, "pt-BR")).map((entry) => [entry.index, entry.name]));
const indexes = (entries) => (entries ?? []).map((entry) => entry.index);
const bonuses = (entries) => Object.fromEntries((entries ?? []).map((entry) => [entry.ability_score.index, entry.bonus]));

function prerequisites(multi) {
  if (multi.prerequisite_options) {
    return { any: multi.prerequisite_options.from.options.map((option) => ({ ability: option.ability_score.index, score: option.minimum_score })) };
  }
  return { all: (multi.prerequisites ?? []).map((entry) => ({ ability: entry.ability_score.index, score: entry.minimum_score })) };
}

function slots(spellcasting) {
  if (!spellcasting) return undefined;
  const values = Array.from({ length: 9 }, (_, index) => spellcasting[`spell_slots_level_${index + 1}`] ?? 0);
  return values.some((value) => value > 0) ? values : undefined;
}

async function classes() {
  const entries = await list("classes");
  return mapLimit(entries, async ({ index }) => {
    const [detail, levels, multi] = await Promise.all([
      get(`${ROOT}/classes/${index}`),
      get(`${ROOT}/classes/${index}/levels`),
      get(`${ROOT}/classes/${index}/multi-classing`),
    ]);
    const subclassLevels = await mapLimit(indexes(detail.subclasses), async (subclass) => {
      const rows = await get(`${ROOT}/subclasses/${subclass}/levels`);
      return Math.min(...rows.map((row) => row.level));
    });
    const classLevels = levels.filter((row) => !row.subclass).sort((a, b) => a.level - b.level);
    let asiSoFar = 0;
    return {
      index,
      name: detail.name,
      hitDie: detail.hit_die,
      savingThrows: indexes(detail.saving_throws),
      skillChoices: detail.proficiency_choices?.[0]?.choose ?? 0,
      subclassLevel: subclassLevels.length > 0 ? Math.min(...subclassLevels) : undefined,
      multiclassPrerequisites: prerequisites(multi),
      levels: classLevels.map((row) => {
        const asi = row.ability_score_bonuses > asiSoFar;
        asiSoFar = row.ability_score_bonuses;
        return { level: row.level, profBonus: row.prof_bonus, asi, slots: slots(row.spellcasting) };
      }),
    };
  });
}

async function races() {
  const entries = await list("races");
  return mapLimit(entries, async ({ index }) => {
    const detail = await get(`${ROOT}/races/${index}`);
    return { index, name: detail.name, speedFt: detail.speed, size: detail.size.toLowerCase(), abilityBonuses: bonuses(detail.ability_bonuses), subraces: indexes(detail.subraces) };
  });
}

async function subraces() {
  const entries = await list("subraces");
  return mapLimit(entries, async ({ index }) => {
    const detail = await get(`${ROOT}/subraces/${index}`);
    return { index, name: detail.name, race: detail.race.index, abilityBonuses: bonuses(detail.ability_bonuses) };
  });
}

async function equipment() {
  const [entries, pt] = await Promise.all([list("equipment"), namesPt("equipment")]);
  return mapLimit(entries, async ({ index }) => {
    const detail = await get(`${ROOT}/equipment/${index}`);
    const item = {
      index,
      name: detail.name,
      namePt: pt.get(index),
      category: detail.equipment_category?.index,
      costGp: detail.cost ? detail.cost.quantity * { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 }[detail.cost.unit] : undefined,
      weightLb: detail.weight,
    };
    if (detail.weapon_category) {
      Object.assign(item, {
        weaponCategory: detail.weapon_category.toLowerCase(),
        weaponRange: detail.weapon_range.toLowerCase(),
        damageDice: detail.damage?.damage_dice,
        damageType: detail.damage?.damage_type?.index,
        rangeFt: detail.weapon_range === "Ranged" ? detail.range : detail.throw_range,
        properties: indexes(detail.properties).filter((property) => property !== "monk"),
      });
    }
    if (detail.armor_category) {
      Object.assign(item, {
        armorCategory: detail.armor_category.toLowerCase(),
        baseArmorClass: detail.armor_class.base,
        dexBonus: detail.armor_class.dex_bonus,
        maxDexBonus: detail.armor_class.max_bonus ?? undefined,
        strMinimum: detail.str_minimum || undefined,
        stealthDisadvantage: detail.stealth_disadvantage,
      });
    }
    return item;
  });
}

async function spells() {
  const [entries, pt] = await Promise.all([list("spells"), namesPt("spells")]);
  return mapLimit(entries, async ({ index }) => {
    const detail = await get(`${ROOT}/spells/${index}`);
    return {
      index,
      name: detail.name,
      namePt: pt.get(index),
      level: detail.level,
      school: detail.school.index,
      ritual: detail.ritual,
      concentration: detail.concentration,
      components: detail.components,
      classes: indexes(detail.classes),
    };
  });
}

async function skills() {
  const entries = await list("skills");
  return mapLimit(entries, async ({ index }) => {
    const detail = await get(`${ROOT}/skills/${index}`);
    return { index, name: detail.name, ability: detail.ability_score.index };
  });
}

async function conditions() {
  const [entries, pt] = await Promise.all([list("conditions"), namesPt("conditions")]);
  return entries.map(({ index, name }) => ({ index, name, namePt: pt.get(index) }));
}

async function main() {
  const started = Date.now();
  const [classData, raceData, subraceData, equipmentData, spellData, skillData, conditionData, abilityScores, damageTypes, magicSchools] = await Promise.all([
    classes(), races(), subraces(), equipment(), spells(), skills(), conditions(),
    list("ability-scores"), list("damage-types"), list("magic-schools"),
  ]);
  const snapshot = {
    source: `${BASE}${ROOT}`,
    license: "SRD 5.1 (OGL 1.0a / CC-BY-4.0) via dnd5eapi.co",
    fetchedAt: new Date().toISOString(),
    abilityScores: indexes(abilityScores),
    damageTypes: indexes(damageTypes),
    magicSchools: indexes(magicSchools),
    conditions: conditionData,
    skills: skillData,
    classes: classData,
    races: raceData,
    subraces: subraceData,
    equipment: equipmentData,
    spells: spellData,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(snapshot, null, 1)}\n`);
  console.log(`Snapshot SRD gravado em ${OUT} (${((Date.now() - started) / 1000).toFixed(1)} s): ${classData.length} classes, ${raceData.length} raças, ${equipmentData.length} itens, ${spellData.length} magias.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
