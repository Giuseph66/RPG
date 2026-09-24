/** Catálogo estático local do Compêndio. As habilidades/perícias são valores fechados
 * do contrato, por isso permanecem fora de RulePack e recebem uma referência discriminada. */
import { ABILITIES, findAbility } from "@data/abilities/abilities";
import { SKILLS } from "@data/skills/skills";
import { PHB_PTBR_LOCAL_2017_MANIFEST } from "@data/rulepacks/manifest";
import { PHB_ABILITIES_AND_SKILLS } from "@data/correto/abilities-and-skills";
import { PHB_ADVENTURING } from "@data/correto/adventuring";
import { PHB_BACKGROUNDS } from "@data/correto/backgrounds";
import { PHB_CHARACTER_CREATION } from "@data/correto/character-creation";
import { PHB_CLASSES } from "@data/correto/classes";
import { PHB_COMBAT } from "@data/correto/combat";
import { PHB_CONDITIONS } from "@data/correto/conditions";
import { PHB_CREATURES } from "@data/correto/creatures";
import { PHB_DEITIES } from "@data/correto/deities";
import { PHB_EQUIPMENT } from "@data/correto/equipment";
import { PHB_FEATS } from "@data/correto/feats";
import { PHB_MULTICLASS_AND_FEATS } from "@data/correto/multiclass-and-feats";
import { PHB_PERSONALITY_AND_BACKGROUNDS } from "@data/correto/personality-and-backgrounds";
import { PHB_PLANES } from "@data/correto/planes";
import { PHB_RACES } from "@data/correto/races";
import { PHB_SPELLCASTING_RULES } from "@data/correto/spellcasting-rules";
import { PHB_ARMOR_DESCRIPTIONS } from "@data/correto/descricoes/armor";
import { PHB_ATTRIBUTE_DESCRIPTIONS } from "@data/correto/descricoes/attributes";
import { PHB_MOVEMENT_DESCRIPTIONS } from "@data/correto/descricoes/movement";
import { PHB_PROGRESSION_DESCRIPTIONS } from "@data/correto/descricoes/progression";
import { CLASS_ID_BY_PT_NAME, classProgressionText } from "./class-progression";
import { PHB_REST_DESCRIPTIONS } from "@data/correto/descricoes/rest";
import { PHB_SKILL_DESCRIPTIONS } from "@data/correto/descricoes/skills";
import { PHB_WEAPON_DESCRIPTIONS } from "@data/correto/descricoes/weapons";
import { EXTRACTED_PHB_SPELLS } from "@data/spells/spells-book-catalog";
import { PHB_BACKED_TEXT_BY_ID, PHB_CANONICAL_DESCRIPTION_REGISTRY } from "@data/correto/integracao";
import type { CompendiumCatalogItem, StaticCompendiumCategory } from "@application/compendium";

const ruleset = {
  id: PHB_PTBR_LOCAL_2017_MANIFEST.id,
  version: PHB_PTBR_LOCAL_2017_MANIFEST.version,
} as const;

function sourceRef(chapter: string, printedPage: number, pdfPage: number, section: string) {
  return { sourceId: ruleset.id, chapter, printedPage, pdfPage, section } as const;
}

/**
 * Card curado do compêndio. Quando existe recorte literal do Livro do Jogador para o mesmo id
 * (`PHB_BACKED_TEXT_BY_ID`), o texto da fonte é anexado ao próprio card — id, resumo, tags e
 * referências curadas seguem iguais e nenhuma entrada nova é criada.
 */
function staticEntry(category: StaticCompendiumCategory, id: string, name: string, summary: string, tags: readonly string[], sourceRefs: readonly ReturnType<typeof sourceRef>[], aliases: readonly string[] = []): CompendiumCatalogItem {
  const backed = PHB_BACKED_TEXT_BY_ID.get(id);
  if (!backed) return { kind: "static", category, ruleset, aliases, summary, definition: { id, name, tags, sourceRefs } };
  return { kind: "static", category, ruleset, aliases: [...aliases, backed.sourceHeading], summary, definition: { kind: "book-rule", id, name, tags, sourceRefs, sourceHeading: backed.sourceHeading, text: normalizeBookText(stripLeadingHeading(backed.text, backed.sourceHeading)) } };
}

/** Entrada estática que preserva id/resumo curados e anexa o texto integral do livro. */
function bookBackedEntry(category: StaticCompendiumCategory, id: string, name: string, summary: string, tags: readonly string[], sourceRefs: readonly ReturnType<typeof sourceRef>[], book: { readonly sourceHeading: string; readonly text: string }, aliases: readonly string[] = []): CompendiumCatalogItem {
  return { kind: "static", category, ruleset, aliases, summary, definition: { kind: "book-rule", id, name, tags, sourceRefs, sourceHeading: book.sourceHeading, text: normalizeBookText(stripLeadingHeading(book.text, book.sourceHeading)) } };
}

const PAGE_NUMBER_LINE = /^\d{1,3}$/;
const PARAGRAPH_END = /[.!?:]$/;
/** Linhas "cheias" da coluna do PDF têm ~50+ caracteres; uma frase que termina antes disso fecha parágrafo. */
const SHORT_LINE = 48;

function isHeadingLine(line: string): boolean {
  return line.length <= 60 && /[A-ZÀ-Ú]{3}/.test(line) && line === line.toLocaleUpperCase("pt-BR") && !/^[\d•]/.test(line);
}

/**
 * Reflui o texto extraído do PDF: junta as quebras de linha da diagramação, remove os
 * números de página soltos e preserva parágrafos, subtítulos em caixa alta e itens de lista
 * (separados por linha em branco; o painel exibe com `white-space: pre-line`).
 */
function normalizeBookText(value: string): string {
  // U+F0B7 é o marcador de lista (Wingdings) que a extração do PDF preserva como glifo privado.
  const lines = value.replace(/\uF0B7/g, "•").split("\n").map((line) => line.replace(/\s+/g, " ").trim());
  const paragraphs: string[] = [];
  let current = "";
  let previous = "";
  const flush = () => { if (current) paragraphs.push(current); current = ""; };
  lines.forEach((line, index) => {
    if (!line) return;
    const isolated = !lines[index - 1] || !lines[index + 1] || index === lines.length - 1;
    if (PAGE_NUMBER_LINE.test(line) && isolated) return;
    if (isHeadingLine(line)) { flush(); paragraphs.push(line); previous = line; return; }
    if (line.startsWith("•") || (current && PARAGRAPH_END.test(previous) && previous.length < SHORT_LINE)) flush();
    current = !current ? line : current.endsWith("-") ? `${current}${line}` : `${current} ${line}`;
    previous = line;
  });
  flush();
  return paragraphs.join("\n\n").trim();
}

/** A extração repete o título da seção como primeira linha do texto; o painel já exibe o título. */
function stripLeadingHeading(raw: string, sourceHeading: string): string {
  const heading = sourceHeading.split(" · ").at(-1)?.trim() ?? sourceHeading;
  // Algumas extrações começaram na primeira menção em minúsculas ("…e um descanso longo ao fim do
  // dia."); quando o título da seção aparece depois como linha própria, a seção começa ali.
  const marker = `\n${heading.toLocaleUpperCase("pt-BR")}\n`;
  const text = /^[a-zà-ú]/.test(raw.trimStart()) && raw.includes(marker) ? raw.slice(raw.indexOf(marker) + 1) : raw;
  const trimmed = text.trimStart();
  // Só é título quando começa com maiúscula; "o bardo tece…" é frase, não o cabeçalho "O BARDO".
  const startsUpper = /^[A-ZÀ-Ú]/.test(trimmed);
  if (!heading || !startsUpper || !trimmed.toLocaleUpperCase("pt-BR").startsWith(heading.toLocaleUpperCase("pt-BR"))) return text;
  // Títulos em linha ("Acrobacia. Um teste…") deixam a pontuação para trás.
  return trimmed.slice(heading.length).replace(/^[\s.:—–-]+/, "");
}

const BOOK_SPELL_CLASS_NAMES: Readonly<Record<string, string>> = { bard: "Bardo", warlock: "Bruxo", cleric: "Clérigo", druid: "Druida", sorcerer: "Feiticeiro", wizard: "Mago", paladin: "Paladino", ranger: "Patrulheiro" };

const BOOK_SPELL_ITEMS: readonly CompendiumCatalogItem[] = EXTRACTED_PHB_SPELLS.map((spell) => ({
  kind: "static" as const,
  category: "spell" as const,
  ruleset,
  aliases: [spell.sourceName],
  summary: `Círculo ${spell.level} · ${spell.schoolPtBr} · ${spell.classes.map((classId) => BOOK_SPELL_CLASS_NAMES[classId] ?? classId).join(", ")}`,
  definition: {
    kind: "book-spell" as const,
    id: spell.id,
    name: spell.name,
    tags: ["magia", spell.schoolPtBr, ...spell.classes, ...(spell.ritual ? ["ritual"] : [])],
    sourceRefs: [sourceRef(spell.source.chapter, spell.source.printedPage, spell.source.pdfPage, spell.sourceName)],
    level: spell.level,
    school: spell.schoolPtBr,
    castingTime: normalizeBookText(spell.castingTime),
    range: normalizeBookText(spell.range),
    components: normalizeBookText(spell.components),
    duration: normalizeBookText(spell.duration),
    concentration: /concentra/i.test(spell.duration),
    ritual: spell.ritual,
    classes: spell.classes,
    description: normalizeBookText(spell.description),
    ...(spell.higherLevels ? { higherLevels: normalizeBookText(spell.higherLevels) } : {}),
  },
}));

type ExtractedBookRule = {
  readonly name: string;
  readonly sourceHeading: string;
  /** Classe/raça dona da entrada, exibida no resumo da lista para distinguir homônimos. */
  readonly owner?: string;
  readonly pdfPages: readonly [number, number];
  readonly printedPages: readonly [number, number];
  readonly text: string;
};

type ExtractedBookRuleSource = {
  readonly category: StaticCompendiumCategory;
  readonly chapter: string;
  readonly tags: readonly string[];
  readonly entries: readonly ExtractedBookRule[];
};

type CanonicalDescription = (typeof PHB_CANONICAL_DESCRIPTION_REGISTRY)[number];

function canonicalChapter(category: string): string {
  if (category === "subrace") return "Capítulo 2";
  if (category === "rest" || category === "movement") return "Capítulo 8";
  if (category === "equipment") return "Capítulo 5";
  return "Capítulo 3";
}

function canonicalBookRuleEntry(entry: CanonicalDescription): CompendiumCatalogItem | undefined {
  if (entry.category === "equipment" || !entry.text.trim()) return undefined;
  const category = entry.category as StaticCompendiumCategory;
  const owner = "owner" in entry ? entry.owner : "className" in entry ? entry.className : undefined;
  return {
    kind: "static",
    category,
    ruleset,
    aliases: [entry.sourceHeading],
    summary: `${owner ? `${owner} · ` : ""}${entry.sourceHeading}`,
    definition: {
      kind: "book-rule",
      id: entry.id,
      name: entry.name,
      tags: [category, entry.sourceHeading.toLocaleLowerCase("pt-BR")],
      sourceRefs: [sourceRef(canonicalChapter(category), entry.printedPages[0], entry.pdfPages[0], entry.sourceHeading)],
      sourceHeading: entry.sourceHeading,
      text: normalizeBookText(stripLeadingHeading(entry.text, entry.sourceHeading)),
    },
  };
}

/** Subseções curtas demais são cabeçalhos órfãos da extração (ex.: "DESLOCAMENTO" sem corpo). */
const MIN_BOOK_SUBSECTION_TEXT = 40;

type BookPages = { readonly pdfPages: readonly [number, number]; readonly printedPages: readonly [number, number] };

function headingToName(heading: string): string {
  return heading.toLocaleLowerCase("pt-BR").replace(/(^|[\s(\-])(\p{L})/gu, (match) => match.toLocaleUpperCase("pt-BR"));
}

/** Subseções de viagem já cobertas por entradas curadas de movimento: fundem texto em vez de duplicar. */
const MOVEMENT_BOOK_SUBSECTION_BY_ID: Readonly<Record<string, string>> = {
  "travel-pace": "ritmo-de-viagem",
  "difficult-terrain": "terreno-dificil",
  "special-movement": "escalada-natacao-e-rastejamento",
  jump: "saltando",
  "travel-activity": "atividades-durante-viagem",
};
const FUSED_MOVEMENT_SUBSECTIONS = new Set(Object.values(MOVEMENT_BOOK_SUBSECTION_BY_ID));

function movementBook(id: string): { readonly sourceHeading: string; readonly text: string } | undefined {
  const subsectionId = MOVEMENT_BOOK_SUBSECTION_BY_ID[id];
  return PHB_MOVEMENT_DESCRIPTIONS.travelSubsections.find((subsection) => subsection.id === subsectionId);
}

function subsectionEntries(parent: BookPages, subsections: readonly { readonly sourceHeading: string; readonly text: string }[]): readonly ExtractedBookRule[] {
  return subsections
    .filter((subsection) => subsection.text.trim().length >= MIN_BOOK_SUBSECTION_TEXT)
    .map((subsection) => ({ name: headingToName(subsection.sourceHeading), sourceHeading: subsection.sourceHeading, pdfPages: parent.pdfPages, printedPages: parent.printedPages, text: subsection.text }));
}

/**
 * Descrições textuais extraídas do Livro do Jogador (src/data/correto/descricoes) que ainda não
 * tinham entrada própria no compêndio. Categorias que já existiam no rulepack mecânico
 * (sub-raça, subclasse, característica, recurso, progressão) passam a ser servidas por estas
 * entradas, e o bootstrap exclui os tipos equivalentes do pack para não duplicar resultados.
 */
const BOOK_DESCRIPTION_SOURCES: readonly ExtractedBookRuleSource[] = [
  { category: "progression", chapter: "Capítulo 3", tags: ["classe", "progressão", "tabela"], entries: PHB_PROGRESSION_DESCRIPTIONS.classProgressionTables.map((table) => ({ name: `Progressão · ${table.className}`, sourceHeading: table.sourceHeading, pdfPages: table.pdfPages, printedPages: table.printedPages, text: classProgressionText(CLASS_ID_BY_PT_NAME[table.className] ?? "") ?? table.text })) },
  { category: "progression", chapter: "Capítulo 6", tags: ["multiclasse", "progressão", "espaço de magia", "tabela"], entries: [{ name: "Multiclasse Para Conjurador: Espaço De Magia Por Nível", sourceHeading: PHB_PROGRESSION_DESCRIPTIONS.multiclassSpellSlotProgression.sourceHeading, pdfPages: [164, 164], printedPages: [165, 165], text: PHB_PROGRESSION_DESCRIPTIONS.multiclassSpellSlotProgression.text }] },
  { category: "rest", chapter: "Capítulo 8", tags: ["descanso", "regra"], entries: [PHB_REST_DESCRIPTIONS.overview] },
  { category: "movement", chapter: "Capítulo 8", tags: ["movimento", "viagem", "regra"], entries: subsectionEntries(PHB_MOVEMENT_DESCRIPTIONS.travelMovement, PHB_MOVEMENT_DESCRIPTIONS.travelSubsections.filter((subsection) => !FUSED_MOVEMENT_SUBSECTIONS.has(subsection.id))) },
  { category: "equipment", chapter: "Capítulo 5", tags: ["equipamento", "weapon", "arma", "regra"], entries: subsectionEntries(PHB_WEAPON_DESCRIPTIONS.section, PHB_WEAPON_DESCRIPTIONS.subsections) },
  { category: "equipment", chapter: "Capítulo 5", tags: ["equipamento", "armor", "armadura", "regra"], entries: subsectionEntries(PHB_ARMOR_DESCRIPTIONS.section, PHB_ARMOR_DESCRIPTIONS.subsections) },
];

const BOOK_RULE_SOURCES: readonly ExtractedBookRuleSource[] = [
  { category: "rules", chapter: "Capítulo 7", tags: ["habilidade", "perícia", "regra"], entries: PHB_ABILITIES_AND_SKILLS },
  { category: "adventure", chapter: "Capítulo 8", tags: ["aventura", "viagem"], entries: PHB_ADVENTURING },
  { category: "background", chapter: "Capítulo 4", tags: ["antecedente", "personalidade"], entries: PHB_BACKGROUNDS },
  { category: "rules", chapter: "Capítulo 1", tags: ["personagem", "criação"], entries: PHB_CHARACTER_CREATION },
  { category: "class", chapter: "Capítulo 3", tags: ["classe", "nível"], entries: PHB_CLASSES },
  { category: "combat", chapter: "Capítulo 9", tags: ["combate"], entries: PHB_COMBAT },
  { category: "condition", chapter: "Apêndice A", tags: ["condição"], entries: PHB_CONDITIONS },
  { category: "adventure", chapter: "Apêndice D", tags: ["criatura", "monstro"], entries: PHB_CREATURES },
  { category: "adventure", chapter: "Apêndice B", tags: ["divindade", "panteão"], entries: PHB_DEITIES },
  { category: "equipment", chapter: "Capítulo 5", tags: ["equipamento"], entries: PHB_EQUIPMENT },
  { category: "feat", chapter: "Capítulo 6", tags: ["talento"], entries: PHB_FEATS },
  { category: "feat", chapter: "Capítulo 6", tags: ["talento", "multiclasse"], entries: PHB_MULTICLASS_AND_FEATS },
  { category: "background", chapter: "Capítulo 4", tags: ["antecedente", "personalidade"], entries: PHB_PERSONALITY_AND_BACKGROUNDS },
  { category: "adventure", chapter: "Apêndice C", tags: ["plano", "cosmologia"], entries: PHB_PLANES },
  { category: "race", chapter: "Capítulo 2", tags: ["raça"], entries: PHB_RACES },
  { category: "rules", chapter: "Capítulo 10", tags: ["magia", "conjuração", "regra"], entries: PHB_SPELLCASTING_RULES },
  ...BOOK_DESCRIPTION_SOURCES,
];

function bookRuleId(chapter: string, sourceIndex: number, name: string, index: number): string {
  return `book-${chapter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${sourceIndex}-${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${index}`;
}

/**
 * A extração do PDF devolveu duas tabelas de progressão vazias ("O MONGE", "O PATRULHEIRO").
 * Cards sem texto não são publicados; a lacuna depende da fonte e não é preenchida por suposição.
 */
const BOOK_RULE_ITEMS: readonly CompendiumCatalogItem[] = BOOK_RULE_SOURCES.flatMap(({ category, chapter, tags, entries }, sourceIndex) => entries.map((entry, index) => ({
  kind: "static" as const,
  category,
  ruleset,
  aliases: [entry.sourceHeading],
  summary: `${entry.owner ? `${entry.owner} · ` : ""}${chapter} · p. ${entry.printedPages[0]}`,
  definition: {
    kind: "book-rule" as const,
    id: bookRuleId(chapter, sourceIndex, entry.name, index),
    name: entry.name,
    tags: [...tags, entry.sourceHeading.toLocaleLowerCase("pt-BR")],
    sourceRefs: [sourceRef(chapter, entry.printedPages[0], entry.pdfPages[0], entry.sourceHeading)],
    sourceHeading: entry.sourceHeading,
    text: normalizeBookText(stripLeadingHeading(entry.text, entry.sourceHeading)),
  },
})).filter((item) => item.definition.text.trim().length > 0));

const CANONICAL_BOOK_RULE_ITEMS: readonly CompendiumCatalogItem[] = PHB_CANONICAL_DESCRIPTION_REGISTRY
  .map(canonicalBookRuleEntry)
  .filter((entry): entry is CompendiumCatalogItem => entry !== undefined);

const RULES_D20 = sourceRef("Introdução", 7, 6, "O d20");
const RULES_ABILITY = sourceRef("Capítulo 7", 175, 174, "Valores e Modificadores de Habilidade");
const RULES_ADVANTAGE = sourceRef("Capítulo 7", 175, 174, "Vantagem e Desvantagem");
const RULES_PROFICIENCY = sourceRef("Capítulo 7", 175, 174, "Bônus de Proficiência");
const RULES_CHECK = sourceRef("Capítulo 7", 176, 175, "Testes de Habilidade");
const RULES_CONTESTED = sourceRef("Capítulo 7", 176, 175, "Testes Resistidos");
const RULES_PASSIVE = sourceRef("Capítulo 7", 177, 176, "Testes Passivos");
const RULES_GROUP = sourceRef("Capítulo 7", 177, 176, "Testes em Grupo");
const RULES_SAVING_THROW = sourceRef("Capítulo 7", 181, 180, "Testes de Resistência");

const REST_RULES = sourceRef("Capítulo 8", 188, 187, "Descanso");

const COMBAT_ORDER = sourceRef("Capítulo 9", 191, 190, "A Ordem de Combate");
const COMBAT_TURN = sourceRef("Capítulo 9", 191, 190, "Seu Turno");
const COMBAT_ACTIONS = sourceRef("Capítulo 9", 194, 193, "Ações em Combate");
const COMBAT_ATTACK = sourceRef("Capítulo 9", 195, 194, "Realizando um Ataque");
const COMBAT_ATTACK_ROLL = sourceRef("Capítulo 9", 196, 195, "Jogada de Ataque");
const COMBAT_OPPORTUNITY = sourceRef("Capítulo 9", 197, 196, "Ataques de Oportunidade");
const COMBAT_DAMAGE = sourceRef("Capítulo 9", 198, 197, "Dano e Cura");
const COMBAT_DEATH = sourceRef("Capítulo 9", 199, 198, "Testes contra a Morte");
const COMBAT_TEMP_HP = sourceRef("Capítulo 9", 200, 199, "Pontos de Vida Temporários");

const MOVEMENT_PACE = sourceRef("Capítulo 8", 183, 182, "Ritmo de Viagem");
const MOVEMENT_TERRAIN = sourceRef("Capítulo 8", 184, 183, "Terreno Difícil");
const MOVEMENT_SPECIAL = sourceRef("Capítulo 8", 184, 183, "Escalada, Natação e Rastejamento");
const MOVEMENT_JUMP = sourceRef("Capítulo 8", 185, 184, "Saltando");
const MOVEMENT_ACTIVITY = sourceRef("Capítulo 8", 185, 184, "Atividades Durante Viagem");

const ADVENTURE_TIME = sourceRef("Capítulo 8", 183, 182, "Tempo");
const ADVENTURE_ENVIRONMENT = sourceRef("Capítulo 8", 183, 182, "O Ambiente");
const ADVENTURE_OBJECTS = sourceRef("Capítulo 8", 185, 184, "Interação com Objetos");
const ADVENTURE_SOCIAL = sourceRef("Capítulo 8", 186, 185, "Interação Social");
const ADVENTURE_DOWNTIME = sourceRef("Capítulo 8", 189, 188, "Entre Aventuras");

export const STATIC_COMPENDIUM_ITEMS: readonly CompendiumCatalogItem[] = [
  ...BOOK_SPELL_ITEMS,
  ...BOOK_RULE_ITEMS,
  ...CANONICAL_BOOK_RULE_ITEMS,
  ...ABILITIES.map((ability) => {
    const book = PHB_ATTRIBUTE_DESCRIPTIONS.abilities.find((entry) => entry.id === ability.id);
    return {
      kind: "static" as const,
      category: "attributes" as const,
      ruleset,
      summary: `Abreviação: ${ability.abbreviation}`,
      definition: book
        ? { kind: "book-rule" as const, id: ability.id, name: ability.name, tags: [ability.id, ability.abbreviation], sourceRefs: ability.sourceRefs, sourceHeading: book.sourceHeading, text: normalizeBookText(stripLeadingHeading(book.text, book.sourceHeading)) }
        : { id: ability.id, name: ability.name, tags: [ability.id, ability.abbreviation], sourceRefs: ability.sourceRefs },
    };
  }),
  ...SKILLS.map((skill) => {
    const book = PHB_SKILL_DESCRIPTIONS.find((entry) => entry.id === skill.id);
    const summary = `Habilidade padrão: ${findAbility(skill.defaultAbility)?.name ?? skill.defaultAbility}`;
    return {
      kind: "static" as const,
      category: "skills" as const,
      ruleset,
      summary,
      definition: book
        ? { kind: "book-rule" as const, id: skill.id, name: skill.name, tags: [skill.id, skill.defaultAbility], sourceRefs: skill.sourceRefs, sourceHeading: book.sourceHeading, text: normalizeBookText(stripLeadingHeading(book.text, book.sourceHeading)) }
        : { id: skill.id, name: skill.name, tags: [skill.id, skill.defaultAbility], sourceRefs: skill.sourceRefs },
    };
  }),
  staticEntry("rules", "d20-resolution", "Resolução com d20", "Quando o resultado de uma ação for incerto, role 1d20, aplique os modificadores relevantes e compare o total ao número alvo definido pela regra ou pelo Mestre.", ["d20", "jogada", "resolução"], [RULES_D20], ["rolagem de d20"]),
  staticEntry("rules", "ability-modifier", "Modificador de habilidade", "Derive o modificador subtraindo 10 do valor de habilidade, dividindo o resultado por 2 e arredondando para baixo.", ["habilidade", "modificador", "fórmula"], [RULES_ABILITY]),
  staticEntry("rules", "advantage-disadvantage", "Vantagem e desvantagem", "Com vantagem ou desvantagem, role um d20 adicional e use o maior ou o menor resultado, respectivamente; uma de cada cancela ambas.", ["vantagem", "desvantagem", "d20"], [RULES_ADVANTAGE]),
  staticEntry("rules", "proficiency-bonus", "Bônus de proficiência", "O bônus de proficiência depende do nível e pode ser aplicado uma vez à jogada quando a regra conceder essa proficiência; duplicar uma fonte não o soma novamente.", ["proficiência", "nível", "bônus"], [RULES_PROFICIENCY]),
  staticEntry("rules", "ability-check", "Teste de habilidade", "Role 1d20, some o modificador da habilidade relevante e outros modificadores aplicáveis e compare o total à Classe de Dificuldade definida para a tarefa.", ["teste", "habilidade", "classe de dificuldade", "cd"], [RULES_CHECK]),
  staticEntry("rules", "contested-check", "Teste resistido", "Quando esforços se opõem diretamente, cada participante faz o teste apropriado e o maior resultado vence; um empate mantém a situação ou segue a decisão específica da tarefa.", ["teste", "resistido", "oposição"], [RULES_CONTESTED]),
  staticEntry("rules", "passive-check", "Teste passivo", "Um teste passivo usa 10 mais os modificadores normalmente aplicáveis; vantagem acrescenta 5 e desvantagem subtrai 5.", ["teste", "passivo", "percepção"], [RULES_PASSIVE]),
  staticEntry("rules", "group-check", "Teste em grupo", "Cada participante realiza o teste; o grupo obtém sucesso quando pelo menos metade dos participantes for bem-sucedida.", ["teste", "grupo", "cooperação"], [RULES_GROUP]),
  staticEntry("rules", "saving-throw", "Teste de resistência", "Uma resistência é exigida por um efeito ou perigo: role 1d20, adicione o modificador da habilidade indicada e compare à CD do efeito, aplicando proficiência quando concedida.", ["resistência", "teste", "cd", "efeito"], [RULES_SAVING_THROW]),
  bookBackedEntry("rest", "short-rest", "Descanso curto", "Período de inatividade de pelo menos 1 hora, limitado a atividades leves; ao final, o personagem pode gastar Dados de Vida para recuperar pontos de vida.", ["descanso", "curto", "dados de vida", "recuperação"], [REST_RULES], PHB_REST_DESCRIPTIONS.entries.find((entry) => entry.id === "short-rest") ?? { sourceHeading: "Descanso curto", text: "Período de inatividade de pelo menos 1 hora, limitado a atividades leves; ao final, o personagem pode gastar Dados de Vida para recuperar pontos de vida." }),
  bookBackedEntry("rest", "long-rest", "Descanso longo", "Período de inatividade de pelo menos 8 horas, com sono ou atividades leves; ao final, recupera pontos de vida perdidos e parte dos Dados de Vida gastos, se cumprir as condições da regra.", ["descanso", "longo", "dados de vida", "pontos de vida"], [REST_RULES], PHB_REST_DESCRIPTIONS.entries.find((entry) => entry.id === "long-rest") ?? { sourceHeading: "Descanso longo", text: "Período de inatividade de pelo menos 8 horas, com sono ou atividades leves; ao final, recupera pontos de vida perdidos e parte dos Dados de Vida gastos, se cumprir as condições da regra." }),
  staticEntry("combat", "combat-order", "Ordem de combate", "O combate organiza os participantes em uma ordem de iniciativa e se repete em rodadas; cada participante atua no próprio turno nessa ordem.", ["combate", "iniciativa", "rodada", "turno"], [COMBAT_ORDER]),
  staticEntry("combat", "combat-turn-economy", "Economia do turno", "No turno, uma criatura pode mover-se até seu deslocamento e realizar uma ação; algumas características permitem uma ação bônus, e uma reação fica disponível quando seu gatilho ocorrer.", ["combate", "turno", "ação", "ação bônus", "reação"], [COMBAT_TURN]),
  staticEntry("combat", "combat-actions", "Ações em combate", "As ações descritas para combate incluem Atacar, Conjurar uma Magia, Disparada, Desengajar, Esquivar, Ajudar, Esconder-se, Preparar, Procurar e Usar um Objeto; a disponibilidade depende do personagem e da situação.", ["combate", "ação", "atacar", "esquivar", "preparar"], [COMBAT_ACTIONS]),
  staticEntry("combat", "attack-roll", "Jogada de ataque", "Uma jogada de ataque compara o resultado do d20 mais os modificadores aplicáveis à Classe de Armadura do alvo; um 1 natural erra e um 20 natural acerta criticamente.", ["combate", "ataque", "d20", "classe de armadura", "crítico"], [COMBAT_ATTACK, COMBAT_ATTACK_ROLL]),
  staticEntry("combat", "opportunity-attack", "Ataque de oportunidade", "Quando uma criatura que você pode ver sai do seu alcance, você pode usar sua reação para realizar um ataque corpo a corpo contra ela, conforme as exceções da regra.", ["combate", "reação", "alcance", "ataque"], [COMBAT_OPPORTUNITY]),
  staticEntry("combat", "cover", "Cobertura", "Uma obstrução entre atacante e alvo pode conceder cobertura; a aplicação e o grau dependem da geometria descrita pela mesa.", ["combate", "cobertura", "alvo", "ataque"], [COMBAT_ATTACK_ROLL]),
  staticEntry("combat", "damage-and-healing", "Dano e cura", "O dano reduz os pontos de vida; resistência e vulnerabilidade alteram o dano aplicável, enquanto a cura restaura pontos de vida sem ultrapassar o máximo.", ["combate", "dano", "cura", "pontos de vida", "resistência"], [COMBAT_DAMAGE]),
  staticEntry("combat", "death-saving-throw", "Teste contra a morte", "Uma criatura inconsciente com 0 pontos de vida faz testes contra a morte no início de seus turnos até estabilizar, ser curada ou atingir uma condição de morte definida pela regra.", ["combate", "morte", "inconsciência", "teste de resistência", "pontos de vida"], [COMBAT_DEATH]),
  staticEntry("combat", "temporary-hit-points", "Pontos de vida temporários", "Pontos de vida temporários absorvem dano antes dos pontos de vida normais; não se somam entre si e os restantes expiram ao terminar um descanso longo quando a regra não indicar duração própria.", ["combate", "pontos de vida", "temporários", "dano", "descanso"], [COMBAT_TEMP_HP]),
  bookBackedEntry("movement", "travel-pace", "Ritmo de viagem", "Uma viagem usa ritmo rápido, normal ou lento, com valores distintos por minuto, hora e dia e efeitos correspondentes sobre percepção e discrição.", ["movimentação", "viagem", "ritmo", "percepção", "furtividade"], [MOVEMENT_PACE], movementBook("travel-pace") ?? { sourceHeading: "Ritmo de viagem", text: "Uma viagem usa ritmo rápido, normal ou lento, com valores distintos por minuto, hora e dia e efeitos correspondentes sobre percepção e discrição." }),
  bookBackedEntry("movement", "difficult-terrain", "Terreno difícil", "Cada pé de movimento em terreno difícil custa movimento adicional; a mesa deve identificar o terreno antes de calcular o deslocamento restante.", ["movimentação", "terreno", "terreno difícil", "deslocamento"], [MOVEMENT_TERRAIN], movementBook("difficult-terrain") ?? { sourceHeading: "Terreno difícil", text: "Cada pé de movimento em terreno difícil custa movimento adicional; a mesa deve identificar o terreno antes de calcular o deslocamento restante." }),
  bookBackedEntry("movement", "special-movement", "Escalada, natação e rastejamento", "Escalar, nadar ou rastejar normalmente custa movimento adicional, salvo quando a criatura possui deslocamento apropriado ou outra exceção aplicável.", ["movimentação", "escalada", "natação", "rastejamento"], [MOVEMENT_SPECIAL], movementBook("special-movement") ?? { sourceHeading: "Escalada, natação e rastejamento", text: "Escalar, nadar ou rastejar normalmente custa movimento adicional, salvo quando a criatura possui deslocamento apropriado ou outra exceção aplicável." }),
  bookBackedEntry("movement", "jump", "Salto", "O salto usa o deslocamento disponível e depende dos valores de Força e das condições de corrida e obstáculo descritas na regra; os dados ausentes ficam para a situação da mesa.", ["movimentação", "salto", "força", "deslocamento"], [MOVEMENT_JUMP], movementBook("jump") ?? { sourceHeading: "Salto", text: "O salto usa o deslocamento disponível e depende dos valores de Força e das condições de corrida e obstáculo descritas na regra; os dados ausentes ficam para a situação da mesa." }),
  bookBackedEntry("movement", "travel-activity", "Atividade durante viagem", "Durante a viagem, a criatura pode desempenhar tarefas como vigiar ameaças, procurar, rastrear ou forragear; a tarefa escolhida altera o que pode ser percebido ou realizado.", ["movimentação", "viagem", "ordem de marcha", "percepção", "sobrevivência"], [MOVEMENT_ACTIVITY], movementBook("travel-activity") ?? { sourceHeading: "Atividade durante viagem", text: "Durante a viagem, a criatura pode desempenhar tarefas como vigiar ameaças, procurar, rastrear ou forragear; a tarefa escolhida altera o que pode ser percebido ou realizado." }),
  staticEntry("adventure", "game-time", "Tempo de jogo", "O tempo de jogo organiza a duração de ações, viagens, descansos e outras atividades; a unidade adequada depende da escala da situação.", ["aventura", "tempo", "duração", "jogo"], [ADVENTURE_TIME]),
  staticEntry("adventure", "adventure-scope", "Escopo de Aventura", "Cobertura mecânica parcial do Livro do Jogador: tempo, viagem, ambiente, interações, descanso e tempo livre. Campanhas, personagens não jogadores, mapas e procedimentos do Mestre não fazem parte desta fonte.", ["aventura", "escopo", "cobertura parcial"], [ADVENTURE_TIME, ADVENTURE_ENVIRONMENT]),
  staticEntry("adventure", "environment-visibility", "Ambiente e visibilidade", "Luz, escuridão e sentidos especiais determinam o que pode ser visto; a aplicação de visão no ambiente depende das condições declaradas da cena.", ["aventura", "ambiente", "luz", "escuridão", "visão"], [ADVENTURE_ENVIRONMENT]),
  staticEntry("adventure", "fall", "Queda", "Uma queda é resolvida com base na distância e nas condições da situação; o catálogo registra a regra e deixa altura, superfície e consequências dependentes do contexto informado.", ["aventura", "ambiente", "queda", "dano"], [ADVENTURE_ENVIRONMENT]),
  staticEntry("adventure", "suffocation", "Asfixia", "A regra de asfixia depende da capacidade da criatura de respirar e do tempo sem ar; o estado e a duração precisam ser informados pelo contexto da mesa.", ["aventura", "ambiente", "asfixia", "respiração"], [ADVENTURE_ENVIRONMENT]),
  staticEntry("adventure", "object-interaction", "Interação com objetos", "Interagir com um objeto durante a ação exige a atividade apropriada e considera se o objeto pode ser manipulado na situação descrita.", ["aventura", "objeto", "interação", "ação"], [ADVENTURE_OBJECTS]),
  staticEntry("adventure", "social-interaction", "Interação social", "A interação social organiza a atitude de uma criatura e a abordagem usada; a decisão e o resultado permanecem dependentes do contexto narrado e do Mestre.", ["aventura", "social", "interação", "atitude"], [ADVENTURE_SOCIAL]),
  staticEntry("adventure", "downtime", "Tempo livre entre aventuras", "Entre aventuras, o personagem pode escolher atividades de tempo livre, como recuperação, trabalho, pesquisa, treinamento ou fabricação, conforme duração, custo e condições da atividade.", ["aventura", "tempo livre", "descanso", "pesquisa", "treinamento"], [ADVENTURE_DOWNTIME]),
];

export const STATIC_COMPENDIUM_COUNTS = {
  spell: BOOK_SPELL_ITEMS.length,
  attributes: ABILITIES.length,
  skills: SKILLS.length,
  rules: STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === "rules").length,
  rest: STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === "rest").length,
  combat: STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === "combat").length,
  movement: STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === "movement").length,
  adventure: STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === "adventure").length,
} as const;
