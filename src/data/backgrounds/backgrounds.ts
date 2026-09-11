import { type BackgroundDefinition, type BackgroundVariant } from "@domain/contracts/definitions/background";
import { asEntityId } from "@domain/contracts/ids";
import { choice, ref, RULESET_ID } from "@data/classes/common";
import { type Skill } from "@domain/contracts/primitives";

type BackgroundSpec = {
  id: string;
  name: string;
  skills: Skill[];
  toolCount: number;
  languageCount: number;
  equipment: string[];
  featureName: string;
  featureDescription: string;
  page: number;
  pdfPage: number;
  variants?: BackgroundVariant[];
};

const bgSource = (page: number, pdfPage: number) => ({ sourceId: RULESET_ID, chapter: "Capítulo 4 — Personalidade e Antecedente", printedPage: page, pdfPage });
const bg = (spec: BackgroundSpec): BackgroundDefinition => {
  const sourceRef = bgSource(spec.page, spec.pdfPage);
  return {
    id: asEntityId(spec.id),
    name: spec.name,
    tags: ["player-handbook", "background"],
    sourceRefs: [sourceRef],
    skillProficiencies: spec.skills,
    toolChoices: spec.toolCount ? [choice(`${spec.id}.tools`, "tool-proficiency", spec.toolCount, { kind: "any-tool-proficiency" }, sourceRef)] : [],
    languageChoices: spec.languageCount ? [choice(`${spec.id}.languages`, "language", spec.languageCount, { kind: "any-language" }, sourceRef)] : [],
    equipment: spec.equipment.map((equipmentId) => ({ equipmentRef: ref(equipmentId), quantity: 1 })),
    feature: { name: spec.featureName, description: spec.featureDescription },
    variants: spec.variants ?? [],
  };
};

const variant = (id: string, name: string, description: string, page: number, pdfPage: number): BackgroundVariant => ({
  id,
  name,
  description,
  feature: { name, description },
  ...(id === "guild-merchant" ? { skillProficiencies: ["insight", "persuasion"] as const } : {}),
});

export const backgrounds: readonly BackgroundDefinition[] = [
  bg({ id: "acolyte", name: "Acólito", skills: ["insight", "religion"], toolCount: 0, languageCount: 2, equipment: ["holy-symbol", "prayer-book", "incense", "common-clothes"], featureName: "Abrigo dos Fiéis", featureDescription: "Pode receber apoio modesto em instalações da mesma fé, conforme o contexto do Mestre.", page: 129, pdfPage: 128 }),
  bg({ id: "guild-artisan", name: "Artesão de Guilda", skills: ["insight", "persuasion"], toolCount: 1, languageCount: 1, equipment: ["artisan-tools", "guild-letter", "travelers-clothes"], featureName: "Associados da Guilda", featureDescription: "A guilda pode oferecer hospedagem, comida e assistência contextual a seus associados.", page: 130, pdfPage: 129, variants: [variant("guild-merchant", "Mercador de Guilda", "Substitui ferramenta de artesão por ferramentas de navegador ou idioma adicional; equipamento alternativo é uma escolha.", 131, 130)] }),
  bg({ id: "entertainer", name: "Artista", skills: ["acrobatics", "performance"], toolCount: 2, languageCount: 0, equipment: ["musical-instrument", "admirers-token", "costume", "common-clothes"], featureName: "Pela Demanda Popular", featureDescription: "Apresentações aceitas podem garantir hospedagem e comida modestas, conforme o estabelecimento.", page: 131, pdfPage: 130, variants: [variant("gladiator", "Gladiador", "Aplica a característica a arenas e pode trocar instrumento por arma incomum barata sem conceder nova proficiência.", 132, 131)] }),
  bg({ id: "charlatan", name: "Charlatão", skills: ["deception", "sleight-of-hand"], toolCount: 2, languageCount: 0, equipment: ["fine-clothes", "disguise-kit", "con-tools"], featureName: "Identidade Falsa", featureDescription: "Mantém uma identidade secundária com documentos e contatos; testes continuam contextuais.", page: 133, pdfPage: 132 }),
  bg({ id: "criminal", name: "Criminoso", skills: ["deception", "stealth"], toolCount: 2, languageCount: 0, equipment: ["crowbar", "dark-common-clothes"], featureName: "Contato Criminal", featureDescription: "Mantém uma rede de informantes e meios para transmitir mensagens, sem garantir informação verdadeira.", page: 134, pdfPage: 133, variants: [variant("spy", "Espião", "Conserva as concessões e altera o contexto para espionagem.", 135, 134)] }),
  bg({ id: "hermit", name: "Eremita", skills: ["medicine", "religion"], toolCount: 1, languageCount: 1, equipment: ["scroll-case", "winter-blanket", "common-clothes", "herbalism-kit"], featureName: "Descoberta", featureDescription: "Uma descoberta é registrada com o Mestre e recebe consequência definida para a campanha.", page: 135, pdfPage: 134 }),
  bg({ id: "outlander", name: "Forasteiro", skills: ["athletics", "survival"], toolCount: 1, languageCount: 1, equipment: ["quarterstaff", "hunting-trap", "animal-trophy", "travelers-clothes"], featureName: "Andarilho", featureDescription: "Pode encontrar comida e água para si e até cinco outros quando o terreno oferecer recursos.", page: 136, pdfPage: 135 }),
  bg({ id: "folk-hero", name: "Herói do Povo", skills: ["animal-handling", "survival"], toolCount: 2, languageCount: 0, equipment: ["artisan-tools", "shovel", "iron-pot", "common-clothes"], featureName: "Hospitalidade Rústica", featureDescription: "Gente comum pode oferecer abrigo e ajuda, desde que isso não a exponha a perigo direto.", page: 137, pdfPage: 136 }),
  bg({ id: "sailor", name: "Marinheiro", skills: ["athletics", "perception"], toolCount: 2, languageCount: 0, equipment: ["club", "silk-rope", "lucky-charm", "common-clothes"], featureName: "Passagem de Navio", featureDescription: "Pode obter passagem em embarcação vinculada, conforme rota e disponibilidade definidas pelo Mestre.", page: 138, pdfPage: 137, variants: [variant("pirate", "Pirata", "Pode substituir Passagem de Navio por Má Reputação; pequenos delitos podem ser ignorados por medo, sem impunidade garantida.", 139, 138)] }),
  bg({ id: "noble", name: "Nobre", skills: ["history", "persuasion"], toolCount: 1, languageCount: 1, equipment: ["fine-clothes", "signet-ring", "lineage-scroll"], featureName: "Posição Privilegiada", featureDescription: "Pode obter audiência e reconhecimento social entre nobres locais, sem garantir obediência.", page: 139, pdfPage: 138, variants: [variant("knight", "Cavaleiro", "Usa Retentores: um escudeiro nobre e dois serviçais para tarefas comuns, sem combate ou perigo claro.", 140, 139)] }),
  bg({ id: "urchin", name: "Órfão", skills: ["sleight-of-hand", "stealth"], toolCount: 2, languageCount: 0, equipment: ["small-knife", "city-map", "pet-rat", "parents-memento", "common-clothes"], featureName: "Segredos da Cidade", featureDescription: "Fora de combate, pode guiar companheiros pela cidade ao dobro da velocidade normal quando o contexto permite.", page: 140, pdfPage: 139 }),
  bg({ id: "sage", name: "Sábio", skills: ["arcana", "history"], toolCount: 0, languageCount: 2, equipment: ["ink", "pen", "small-knife", "dead-colleague-letter", "common-clothes"], featureName: "Pesquisador", featureDescription: "Identifica onde ou com quem buscar informação que não conhece; o acesso pode ser difícil.", page: 141, pdfPage: 140 }),
  bg({ id: "soldier", name: "Soldado", skills: ["athletics", "intimidation"], toolCount: 2, languageCount: 0, equipment: ["rank-insignia", "trophy", "bone-dice", "common-clothes"], featureName: "Patente Militar", featureDescription: "Pode obter autoridade contextual e requisitar temporariamente recursos simples onde sua patente é reconhecida.", page: 142, pdfPage: 141 }),
];

export const BACKGROUND_DEFINITIONS = backgrounds;
export const backgroundsById: ReadonlyMap<string, BackgroundDefinition> = new Map(backgrounds.map((entry) => [entry.id, entry]));
export function findBackground(backgroundId: string): BackgroundDefinition | undefined { return backgroundsById.get(backgroundId); }

