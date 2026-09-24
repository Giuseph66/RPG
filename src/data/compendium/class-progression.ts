/**
 * Tabelas "Progressão · Classe" do compêndio geradas a partir dos dados estruturados das
 * classes (capítulo 3). A extração do PDF lê as tabelas coluna a coluna e embaralha o
 * conteúdo, então o texto é montado aqui: nível, bônus de proficiência, características
 * (nomes impressos no livro), características de subclasse e espaços de magia.
 */
import { classes } from "@data/classes";

const FEATURE_NAMES: Readonly<Record<string, string>> = {
  "action-surge": "Surto de Ação", "arcane-recovery": "Recuperação Arcana", "arcane-tradition": "Tradição Arcana",
  archdruid: "Arquidruida", "aura-of-courage": "Aura de Coragem", "aura-of-protection": "Aura de Proteção",
  "aura-range-improvement": "Aprimoramento de Aura", "bard-college": "Colégio de Bardo", "bardic-inspiration": "Inspiração de Bardo (d6)",
  "beast-spells": "Magias da Besta", blindsense: "Sentido Cego", "brutal-critical": "Crítico Brutal",
  "channel-divinity": "Canalizar Divindade", "cleansing-touch": "Toque Purificador", countercharm: "Contraencanto",
  "cunning-action": "Ação Ardilosa", "danger-sense": "Sentido de Perigo", "deflect-missiles": "Defletir Projéteis",
  "destroy-undead": "Destruir Mortos-Vivos", "diamond-soul": "Alma de Diamante", "divine-domain": "Domínio Divino",
  "divine-health": "Saúde Divina", "divine-intervention": "Intervenção Divina", "divine-sense": "Sentido Divino",
  "divine-smite": "Destruição Divina", "druid-circle": "Círculo Druídico", druidic: "Druídico",
  "eldritch-invocations": "Invocações Místicas", "eldritch-master": "Mestre Místico", elusive: "Elusivo",
  "empty-body": "Corpo Vazio", evasion: "Evasão", expertise: "Especialização", "extra-attack": "Ataque Extra",
  "fast-movement": "Movimento Rápido", "favored-enemy": "Inimigo Favorito", "feral-instinct": "Instinto Selvagem",
  "feral-senses": "Sentidos Selvagens", "fighting-style": "Estilo de Luta", "foe-slayer": "Matador de Inimigos",
  "font-of-inspiration": "Fonte de Inspiração", "font-of-magic": "Fonte de Magia",
  "greater-divine-intervention": "Intervenção Divina Aprimorada", "hide-in-plain-sight": "Mimetismo",
  "improved-divine-smite": "Destruição Divina Aprimorada", indomitable: "Indomável", "indomitable-might": "Força Indomável",
  "jack-of-all-trades": "Versatilidade", ki: "Chi", "land-stride": "Pés Rápidos", "lay-on-hands": "Cura pelas Mãos",
  "magical-secrets": "Segredos Mágicos", "martial-archetype": "Arquétipo Marcial", "martial-arts": "Artes Marciais",
  metamagic: "Metamágica", "monastic-tradition": "Tradição Monástica", "mystic-arcanum": "Arcana Mística",
  "natural-explorer": "Explorador Natural", "otherworldly-patron": "Patrono Transcendental", "pact-boon": "Dádiva do Pacto",
  "pact-magic": "Magia de Pacto", "perfect-self": "Auto Aperfeiçoamento", "persistent-rage": "Fúria Persistente",
  "primal-champion": "Campeão Primitivo", "primal-path": "Caminho Primitivo", "primeval-awareness": "Consciência Primitiva",
  "purity-of-body": "Pureza Corporal", rage: "Fúria", "reckless-attack": "Ataque Descuidado", "relentless-rage": "Fúria Implacável",
  "reliable-talent": "Talento Confiável", "roguish-archetype": "Arquétipo de Ladino", "second-wind": "Retomar o Fôlego",
  "signature-spells": "Assinatura Mágica", "slippery-mind": "Mente Escorregadia", "sneak-attack": "Ataque Furtivo",
  "song-of-rest": "Canção do Descanso", "sorcerous-origin": "Origem de Feitiçaria", "sorcerous-restoration": "Restauração Mística",
  spellcasting: "Conjuração", "spell-mastery": "Maestria em Magia", "stillness-of-mind": "Mente Tranquila",
  "stroke-of-luck": "Golpe de Sorte", "stunning-strike": "Ataque Atordoante", "superior-inspiration": "Inspiração Superior",
  "thieves-cant": "Gíria de Ladrão", "timeless-body": "Corpo Atemporal", "tongue-of-sun-and-moon": "Idiomas do Sol e da Lua",
  "unarmored-defense": "Defesa sem Armadura", "unarmored-movement": "Movimento sem Armadura", "uncanny-dodge": "Esquiva Sobrenatural",
  vanish: "Desaparecer", "wild-shape": "Forma Selvagem", "wild-shape-improvement": "Forma Selvagem (aprimoramento)",
};

/** Níveis em que a tabela da classe lista uma característica da subclasse (além da escolha). */
const SUBCLASS_FEATURE_LEVELS: Readonly<Record<string, { readonly label: string; readonly levels: readonly number[] }>> = {
  barbarian: { label: "Caminho Primitivo", levels: [6, 10, 14] },
  bard: { label: "Colégio de Bardo", levels: [6, 14] },
  cleric: { label: "Domínio Divino", levels: [2, 6, 8, 17] },
  druid: { label: "Círculo Druídico", levels: [6, 10, 14] },
  fighter: { label: "Arquétipo Marcial", levels: [7, 10, 15, 18] },
  monk: { label: "Tradição Monástica", levels: [6, 11, 17] },
  paladin: { label: "Juramento Sagrado", levels: [7, 15, 20] },
  ranger: { label: "Conclave de Patrulheiro", levels: [7, 11, 15] },
  rogue: { label: "Arquétipo de Ladino", levels: [9, 13, 17] },
  sorcerer: { label: "Origem de Feitiçaria", levels: [6, 14, 18] },
  warlock: { label: "Patrono Transcendental", levels: [6, 10, 14] },
  wizard: { label: "Tradição Arcana", levels: [6, 10, 14] },
};

const ORDINAL = "º";

function proficiency(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

/** Texto da tabela de progressão da classe, um nível por item de lista. */
export function classProgressionText(classId: string): string | undefined {
  const definition = classes.find((entry) => String(entry.id) === classId);
  if (!definition) return undefined;
  const subclass = SUBCLASS_FEATURE_LEVELS[classId];
  const lines = definition.progression.map((entry) => {
    const names = entry.featureRefs.map((ref) => {
      const key = String(ref.entityId).split(".").slice(1).join(".");
      return FEATURE_NAMES[key] ?? key;
    });
    if (entry.choicesGranted.length > 0) names.push("Incremento no Valor de Habilidade");
    if (subclass && entry.level === definition.subclassSelectionLevel && !names.includes(subclass.label)) names.push(subclass.label);
    if (subclass?.levels.includes(entry.level)) names.push(`Característica de ${subclass.label}`);
    const slots = entry.spellSlotsGranted?.slotsByLevel.map((slot) => `${slot.slotLevel}${ORDINAL}×${slot.count}`).join(" ");
    return `• ${entry.level}${ORDINAL} nível — Proficiência +${proficiency(entry.level)} — ${names.length ? names.join(", ") : "—"}${slots ? ` — Espaços: ${slots}` : ""}`;
  });
  return ["TABELA DE PROGRESSÃO", ...lines].join("\n\n");
}

export const CLASS_ID_BY_PT_NAME: Readonly<Record<string, string>> = {
  Bárbaro: "barbarian", Bardo: "bard", Bruxo: "warlock", Clérigo: "cleric", Druida: "druid", Feiticeiro: "sorcerer",
  Guerreiro: "fighter", Ladino: "rogue", Mago: "wizard", Monge: "monk", Paladino: "paladin", Patrulheiro: "ranger",
};
