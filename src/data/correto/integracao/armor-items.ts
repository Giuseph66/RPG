/**
 * Descrições individuais das armaduras. O RulePack já possui CA, preço, peso etc.;
 * este arquivo fornece apenas a prosa do Livro do Jogador para fundir no mesmo card.
 */
import { PHB_ARMOR_DESCRIPTIONS } from "@data/correto/descricoes/armor";

function extractNamedParagraph(source: string, heading: string, stopHeadings: readonly string[]): string {
  const marker = `${heading}.`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  let end = source.length;
  for (const stop of stopHeadings) {
    for (const candidateText of [`\n${stop}.`, `\n${stop}\n`]) {
      const candidate = source.indexOf(candidateText, start + marker.length);
      if (candidate >= 0 && candidate < end) end = candidate;
    }
  }
  return source.slice(start, end).trim();
}

const source = PHB_ARMOR_DESCRIPTIONS.section.text;

const specs = [
  ["padded-armor", "Acolchoada", ["Couro"]],
  ["leather-armor", "Couro", ["Couro Batido"]],
  ["studded-leather", "Couro Batido", ["ARMADURA MÉDIA"]],
  ["hide-armor", "Gibão de Peles", ["Camisão de Malha"]],
  ["chain-shirt", "Camisão de Malha", ["Brunea"]],
  ["scale-mail", "Brunea", ["Peitoral"]],
  ["breastplate", "Peitoral", ["Meia-Armadura"]],
  ["half-plate", "Meia-Armadura", ["ARMADURA PESADA"]],
  ["ring-mail", "Cota de Anéis", ["Cota de Malha"]],
  ["chain-mail", "Cota de Malha", ["Cota de Talas"]],
  ["splint-armor", "Cota de Talas", ["Placas"]],
  ["plate-armor", "Placas", ["ARMADURAS", "ENTRANDO E SAINDO DE UMA ARMADURA"]],
] as const;

export const PHB_ARMOR_ITEM_DESCRIPTIONS = [
  ...specs.map(([id, name, stopHeadings]) => ({
    id,
    category: "equipment" as const,
    equipmentKind: "armor" as const,
    name,
    sourceHeading: name.toLocaleUpperCase("pt-BR"),
    pdfPages: PHB_ARMOR_DESCRIPTIONS.section.pdfPages,
    printedPages: PHB_ARMOR_DESCRIPTIONS.section.printedPages,
    text: extractNamedParagraph(source, name, stopHeadings),
  })),
  {
    id: "shield",
    category: "equipment" as const,
    equipmentKind: "armor" as const,
    name: "Escudo",
    sourceHeading: "ESCUDO",
    pdfPages: PHB_ARMOR_DESCRIPTIONS.section.pdfPages,
    printedPages: PHB_ARMOR_DESCRIPTIONS.section.printedPages,
    text: extractNamedParagraph(source, "Escudo", ["ARMADURA LEVE"]),
  },
] as const;

export default PHB_ARMOR_ITEM_DESCRIPTIONS;
