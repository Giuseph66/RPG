/**
 * Complementos de Descanso que ainda aparecem como resumos estáticos no Compêndio.
 * O texto é recortado em runtime das extrações já existentes do Livro do Jogador,
 * para evitar duplicar/reformular a fonte.
 */
import { PHB_REST_DESCRIPTIONS } from "@data/correto/descricoes/rest";
import { PHB_ADVENTURING } from "@data/correto/adventuring";

function sliceExact(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return "";
  const endIndex = end ? source.indexOf(end, startIndex + start.length) : -1;
  return source.slice(startIndex, endIndex >= 0 ? endIndex : undefined).trim();
}

const restOverview = PHB_REST_DESCRIPTIONS.overview.text;
const environment = PHB_ADVENTURING.find((entry) => entry.sourceHeading === "O AMBIENTE");
const betweenAdventures = PHB_ADVENTURING.find((entry) => entry.sourceHeading === "ENTRE AVENTURAS");

export const PHB_REST_MISSING_DESCRIPTIONS = [
  {
    id: "rest-interruption",
    category: "rest",
    name: "Interrupção do descanso longo",
    sourceHeading: "DESCANSO LONGO",
    pdfPages: PHB_REST_DESCRIPTIONS.overview.pdfPages,
    printedPages: PHB_REST_DESCRIPTIONS.overview.printedPages,
    text: sliceExact(
      restOverview,
      "Se o\ndescanso for interrompido",
      "No final de um descanso longo",
    ),
  },
  {
    id: "hit-die-recovery",
    category: "rest",
    name: "Recuperação de Dados de Vida",
    sourceHeading: "DESCANSO LONGO",
    pdfPages: PHB_REST_DESCRIPTIONS.overview.pdfPages,
    printedPages: PHB_REST_DESCRIPTIONS.overview.printedPages,
    text: sliceExact(
      restOverview,
      "No final de um descanso longo",
      "Um personagem não pode se beneficiar",
    ),
  },
  {
    id: "food-and-water",
    category: "rest",
    name: "Comida e água",
    sourceHeading: "COMIDA E ÁGUA",
    pdfPages: environment?.pdfPages ?? [186, 186],
    printedPages: environment?.printedPages ?? [187, 187],
    text: environment ? sliceExact(environment.text, "COMIDA E ÁGUA", "INTERAÇÃO COM OBJETOS") : "",
  },
  {
    id: "downtime-recovery",
    category: "rest",
    name: "Recuperando-se",
    sourceHeading: "RECUPERANDO-SE",
    pdfPages: betweenAdventures?.pdfPages ?? [188, 189],
    printedPages: betweenAdventures?.printedPages ?? [189, 190],
    text: betweenAdventures ? sliceExact(betweenAdventures.text, "RECUPERANDO-SE", "PESQUISANDO") : "",
  },
] as const;

export default PHB_REST_MISSING_DESCRIPTIONS;
