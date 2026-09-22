/**
 * Linhas da tabela Equipamento do Livro do Jogador.
 *
 * Boa parte dos itens de aventura não tem prosa no livro: o que a fonte define deles é a linha
 * da tabela (custo e peso). Essa linha é recortada literalmente e anexada ao card, para que
 * nenhum item fique sem conteúdo. Itens concedidos por antecedente que não aparecem na tabela
 * impressa (lembranças, troféus, insígnias) continuam sem descrição — o livro não traz uma.
 */
import { PHB_EQUIPMENT } from "@data/correto/equipment";

const section = PHB_EQUIPMENT.find((entry) => entry.name === "Equipamento De Aventura");
if (!section) throw new Error('Seção "Equipamento De Aventura" ausente na extração do Livro do Jogador.');

const TABLE_HEADER = "Item Custo Peso";
const tableStart = section.text.indexOf(TABLE_HEADER);
if (tableStart < 0) throw new Error("Tabela Equipamento ausente na extração do Livro do Jogador.");
/** A tabela termina onde começam as descrições em prosa (após a virada de página impressa). */
const tableLines = section.text.slice(tableStart, section.text.indexOf("\nÁgua Benta.")).split("\n").map((line) => line.trim());

function findRow(tableName: string): string | undefined {
  return tableLines.find((line) => line.startsWith(`${tableName} `) && /\d/.test(line));
}

/** Pares `[id do RulePack, nome impresso na tabela]`. */
const TABLE_ITEMS: readonly (readonly [string, string])[] = [
  ["hourglass", "Ampulheta"],
  ["whistle", "Apito de advertência"],
  ["harpoon", "Arpéu"],
  ["ink-pen", "Caneta tinteiro"],
  ["blanket", "Cobertor de inverno"],
  ["ladder", "Escada"],
  ["mirror-steel", "Espelho de aço"],
  ["chalk", "Giz"],
  ["cloak", "Manto"],
  ["sledgehammer", "Marreta"],
  ["hammer", "Martelo"],
  ["shovel", "Pá"],
  ["paper", "Papel"],
  ["paraffin", "Parafina"],
  ["whetstone", "Pedra de amolar"],
  ["perfume", "Perfume"],
  ["parchment", "Pergaminho"],
  ["miner-pick", "Picareta de minerador"],
  ["piton", "Píton"],
  ["nails", "Pregos de ferro"],
  ["robes", "Robes"],
  ["clothes-common", "Roupas comuns"],
  ["clothes-costume", "Roupas de entretenimento"],
  ["clothes-fine", "Roupas finas"],
  ["clothes-travelers", "Roupas de viajante"],
  ["soap", "Sabão"],
  ["bedroll", "Saco de dormir"],
  ["signet-ring", "Sinete"],
  ["bell", "Sino"],
  ["ink", "Tinta"],
  ["pole", "Vara"],
  ["arrows", "Flechas"],
  ["crossbow-bolts", "Virotes"],
  ["blowgun-needles", "Zarabatana"],
  ["sling-bullets", "Balas de Funda"],
  ["common-clothes", "Roupas comuns"],
  ["travelers-clothes", "Roupas de viajante"],
  ["fine-clothes", "Roupas finas"],
  ["scroll-case", "Porta mapas ou pergaminhos"],
];

export const PHB_GEAR_TABLE_DESCRIPTIONS = TABLE_ITEMS.flatMap(([id, tableName]) => {
  const row = findRow(tableName);
  if (!row) return [];
  return [{
    id,
    category: "equipment" as const,
    equipmentKind: "gear" as const,
    name: tableName,
    sourceHeading: "EQUIPAMENTO",
    pdfPages: section.pdfPages,
    printedPages: section.printedPages,
    text: `EQUIPAMENTO\n${TABLE_HEADER}\n${row}`,
  }];
});

/** Itens listados acima que a extração não conseguiu casar com uma linha impressa. */
export const PHB_GEAR_TABLE_UNMATCHED: readonly string[] = TABLE_ITEMS.filter(([, tableName]) => !findRow(tableName)).map(([id]) => id);

export default PHB_GEAR_TABLE_DESCRIPTIONS;
