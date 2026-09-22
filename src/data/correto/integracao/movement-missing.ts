/**
 * Subseções de movimentação do Capítulo 9 que ainda não estavam fundidas aos cards
 * do Compêndio. Todas as strings são recortadas da extração já existente.
 */
import { PHB_MOVEMENT_DESCRIPTIONS } from "@data/correto/descricoes/movement";

function sliceByHeadings(source: string, start: string, nextHeadings: readonly string[]): string {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return "";
  let endIndex = source.length;
  for (const heading of nextHeadings) {
    const candidate = source.indexOf(`\n${heading}\n`, startIndex + start.length);
    if (candidate >= 0 && candidate < endIndex) endIndex = candidate;
  }
  return source.slice(startIndex, endIndex).trim();
}

const combat = PHB_MOVEMENT_DESCRIPTIONS.combatMovement;

export const PHB_MOVEMENT_MISSING_DESCRIPTIONS = [
  {
    id: "movement-budget",
    category: "movement",
    name: "Movimento e posição",
    sourceHeading: "MOVIMENTO E POSIÇÃO",
    pdfPages: combat.pdfPages,
    printedPages: combat.printedPages,
    text: sliceByHeadings(combat.text, "MOVIMENTO E POSIÇÃO", ["QUEBRANDO SEU MOVIMENTO"]),
  },
  {
    id: "split-movement",
    category: "movement",
    name: "Quebrando seu movimento",
    sourceHeading: "QUEBRANDO SEU MOVIMENTO",
    pdfPages: combat.pdfPages,
    printedPages: combat.printedPages,
    text: sliceByHeadings(combat.text, "QUEBRANDO SEU MOVIMENTO", ["MOVENDO-SE ENTRE ATAQUES"]),
  },
  {
    id: "movement-between-attacks",
    category: "movement",
    name: "Movendo-se entre ataques",
    sourceHeading: "MOVENDO-SE ENTRE ATAQUES",
    pdfPages: combat.pdfPages,
    printedPages: combat.printedPages,
    text: sliceByHeadings(combat.text, "MOVENDO-SE ENTRE ATAQUES", ["USANDO DESLOCAMENTOS DIFERENTES"]),
  },
  {
    id: "different-speeds",
    category: "movement",
    name: "Usando deslocamentos diferentes",
    sourceHeading: "USANDO DESLOCAMENTOS DIFERENTES",
    pdfPages: combat.pdfPages,
    printedPages: combat.printedPages,
    text: sliceByHeadings(combat.text, "USANDO DESLOCAMENTOS DIFERENTES", ["TERRENO DIFÍCIL"]),
  },
  {
    id: "prone-movement",
    category: "movement",
    name: "Estar caído",
    sourceHeading: "ESTAR CAÍDO",
    pdfPages: combat.pdfPages,
    printedPages: combat.printedPages,
    text: sliceByHeadings(combat.text, "ESTAR CAÍDO", ["MOVENDO-SE PRÓXIMO DE OUTRAS", "MOVENDO-SE PRÓXIMO DE OUTRAS\nCRIATURAS"]),
  },
  {
    id: "moving-around-creatures",
    category: "movement",
    name: "Movendo-se próximo de outras criaturas",
    sourceHeading: "MOVENDO-SE PRÓXIMO DE OUTRAS CRIATURAS",
    pdfPages: combat.pdfPages,
    printedPages: combat.printedPages,
    text: sliceByHeadings(combat.text.replace("MOVENDO-SE PRÓXIMO DE OUTRAS\nCRIATURAS", "MOVENDO-SE PRÓXIMO DE OUTRAS CRIATURAS"), "MOVENDO-SE PRÓXIMO DE OUTRAS CRIATURAS", ["MOVIMENTO DE VOO"]),
  },
  {
    id: "flying-movement",
    category: "movement",
    name: "Movimento de voo",
    sourceHeading: "MOVIMENTO DE VOO",
    pdfPages: combat.pdfPages,
    printedPages: combat.printedPages,
    text: sliceByHeadings(combat.text, "MOVIMENTO DE VOO", ["TAMANHO DE CRIATURA"]),
  },
  {
    id: "creature-space",
    category: "movement",
    name: "Tamanho de criatura e espaço",
    sourceHeading: "TAMANHO DE CRIATURA",
    pdfPages: combat.pdfPages,
    printedPages: combat.printedPages,
    text: sliceByHeadings(combat.text, "TAMANHO DE CRIATURA", ["VARIAÇÃO: JOGANDO NA MATRIZ DE COMBATE"]),
  },
  {
    id: "squeezing",
    category: "movement",
    name: "Espremendo-se em espaços menores",
    sourceHeading: "ESPREMENDO-SE EM ESPAÇOS MENORES",
    pdfPages: combat.pdfPages,
    printedPages: combat.printedPages,
    text: sliceByHeadings(combat.text, "ESPREMENDO-SE EM ESPAÇOS MENORES", []),
  },
  {
    id: "mounted-combat-movement",
    category: "movement",
    name: PHB_MOVEMENT_DESCRIPTIONS.mountedCombatMovement.name,
    sourceHeading: PHB_MOVEMENT_DESCRIPTIONS.mountedCombatMovement.sourceHeading,
    pdfPages: PHB_MOVEMENT_DESCRIPTIONS.mountedCombatMovement.pdfPages,
    printedPages: PHB_MOVEMENT_DESCRIPTIONS.mountedCombatMovement.printedPages,
    text: PHB_MOVEMENT_DESCRIPTIONS.mountedCombatMovement.text,
  },
  {
    id: "underwater-combat-movement",
    category: "movement",
    name: PHB_MOVEMENT_DESCRIPTIONS.underwaterCombat.name,
    sourceHeading: PHB_MOVEMENT_DESCRIPTIONS.underwaterCombat.sourceHeading,
    pdfPages: PHB_MOVEMENT_DESCRIPTIONS.underwaterCombat.pdfPages,
    printedPages: PHB_MOVEMENT_DESCRIPTIONS.underwaterCombat.printedPages,
    text: PHB_MOVEMENT_DESCRIPTIONS.underwaterCombat.text,
  },
] as const;

export default PHB_MOVEMENT_MISSING_DESCRIPTIONS;
