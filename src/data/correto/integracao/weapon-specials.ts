/**
 * O livro não traz uma descrição narrativa individual para cada arma da tabela.
 * As únicas armas com regras próprias na seção "Armas Especiais" são estas duas.
 */
import { PHB_WEAPON_DESCRIPTIONS } from "@data/correto/descricoes/weapons";

function extractSpecial(source: string, heading: string, nextHeading?: string): string {
  const start = source.indexOf(`${heading}.`);
  if (start < 0) return "";
  const end = nextHeading ? source.indexOf(`\n${nextHeading}.`, start + heading.length + 1) : -1;
  return source.slice(start, end >= 0 ? end : undefined).trim();
}

const source = PHB_WEAPON_DESCRIPTIONS.section.text;

export const PHB_SPECIAL_WEAPON_DESCRIPTIONS = [
  {
    id: "lance",
    category: "equipment",
    equipmentKind: "weapon",
    name: "Lança de Montaria",
    sourceHeading: "LANÇA DE MONTARIA",
    pdfPages: PHB_WEAPON_DESCRIPTIONS.section.pdfPages,
    printedPages: PHB_WEAPON_DESCRIPTIONS.section.printedPages,
    text: extractSpecial(source, "Lança de Montaria", "Rede"),
  },
  {
    id: "net",
    category: "equipment",
    equipmentKind: "weapon",
    name: "Rede",
    sourceHeading: "REDE",
    pdfPages: PHB_WEAPON_DESCRIPTIONS.section.pdfPages,
    printedPages: PHB_WEAPON_DESCRIPTIONS.section.printedPages,
    text: extractSpecial(source, "Rede"),
  },
] as const;

export default PHB_SPECIAL_WEAPON_DESCRIPTIONS;
