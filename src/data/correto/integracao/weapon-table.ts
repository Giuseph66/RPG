/**
 * Linhas da tabela Armas do Livro do Jogador.
 *
 * O livro não traz prosa individual para a maioria das armas: o que ele define de cada uma
 * é a linha da tabela (preço, dano, peso, propriedades) mais a categoria em que ela aparece.
 * Aqui essa linha é recortada literalmente e anexada ao card da arma, para que nenhuma arma
 * fique sem conteúdo. `lance` e `net` também recebem a regra própria de "Armas Especiais".
 *
 * A extração do PDF colocou a tabela dentro da seção "Equipamento De Aventura" (o texto segue
 * a ordem das colunas impressas), por isso a busca acontece nessa seção e não em "Armas".
 */
import { PHB_EQUIPMENT } from "@data/correto/equipment";

import { PHB_SPECIAL_WEAPON_DESCRIPTIONS } from "./weapon-specials";

const section = PHB_EQUIPMENT.find((entry) => entry.name === "Equipamento De Aventura");
if (!section) throw new Error('Seção "Equipamento De Aventura" ausente na extração do Livro do Jogador.');

const TABLE_HEADER = "Nome Preço Dano Peso Propriedades";
const tableStart = section.text.indexOf(TABLE_HEADER);
if (tableStart < 0) throw new Error("Tabela Armas ausente na extração do Livro do Jogador.");
const tableLines = section.text.slice(tableStart).split("\n");

/** Cabeçalhos de grupo da tabela; delimitam o fim da lista e dão contexto a cada linha. */
const GROUP_HEADINGS = [
  "Armas Simples Corpo-a-Corpo",
  "Armas Simples à Distância",
  "Armas Marciais Corpo-a-Corpo",
  "Armas Marciais à Distância",
] as const;

/** Linha da arma mais o grupo em que ela está impressa. */
function tableRow(name: string): { readonly group: string; readonly row: string } {
  let group = "";
  for (const line of tableLines) {
    const trimmed = line.trim();
    if ((GROUP_HEADINGS as readonly string[]).includes(trimmed)) {
      group = trimmed;
      continue;
    }
    if (trimmed.startsWith(`${name} `)) return { group, row: trimmed };
  }
  throw new Error(`Arma "${name}" ausente na tabela do Livro do Jogador.`);
}

const specialById: ReadonlyMap<string, string> = new Map(PHB_SPECIAL_WEAPON_DESCRIPTIONS.map((entry) => [String(entry.id), entry.text]));

const WEAPONS: readonly (readonly [string, string])[] = [
  ["dagger", "Adaga"],
  ["javelin", "Azagaia"],
  ["quarterstaff", "Bordão"],
  ["greatclub", "Clava Grande"],
  ["sickle", "Foice Curta"],
  ["spear", "Lança"],
  ["mace", "Maça"],
  ["handaxe", "Machadinha"],
  ["light-hammer", "Martelo Leve"],
  ["club", "Porrete"],
  ["shortbow", "Arco Curto"],
  ["light-crossbow", "Beste Leve"],
  ["dart", "Dardo"],
  ["sling", "Funda"],
  ["halberd", "Alabarda"],
  ["glaive", "Glaive"],
  ["scimitar", "Cimitarra"],
  ["whip", "Chicote"],
  ["shortsword", "Espada Curta"],
  ["greatsword", "Espada Grande"],
  ["longsword", "Espada Longa"],
  ["lance", "Lança de Montaria"],
  ["pike", "Lança Longa"],
  ["morningstar", "Maça Estrela"],
  ["greataxe", "Machado Grande"],
  ["battleaxe", "Machado de Batalha"],
  ["maul", "Malho"],
  ["flail", "Mangual"],
  ["warhammer", "Martelo de Guerra"],
  ["war-pick", "Picareta de Guerra"],
  ["rapier", "Rapieira"],
  ["trident", "Tridente"],
  ["longbow", "Arco Longo"],
  ["hand-crossbow", "Besta de Mão"],
  ["heavy-crossbow", "Besta Pesada"],
  ["net", "Rede"],
  ["blowgun", "Zarabatana"],
];

export const PHB_WEAPON_TABLE_DESCRIPTIONS = WEAPONS.map(([id, name]) => {
  const { group, row } = tableRow(name);
  const special = specialById.get(id);
  return {
    id,
    category: "equipment" as const,
    equipmentKind: "weapon" as const,
    name,
    sourceHeading: "ARMAS",
    pdfPages: section.pdfPages,
    printedPages: section.printedPages,
    text: `ARMAS\n${TABLE_HEADER}\n${group}\n${row}${special ? `\n\n${special}` : ""}`,
  };
});

export default PHB_WEAPON_TABLE_DESCRIPTIONS;
