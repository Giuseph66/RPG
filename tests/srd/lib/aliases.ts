/**
 * Correspondência entre IDs do nosso pack e `index` da SRD API quando não coincidem.
 * Magias: o catálogo do livro usa slug pt-BR; o casamento é feito pelo nome pt-BR da API
 * (`?lang=pt-BR`) e, para os nomes que a SRD tirou do epônimo (Melf, Bigby…), por esta tabela.
 */

/** nosso id de magia (catálogo do livro) → index da API. */
export const SPELL_ALIASES: Readonly<Record<string, string>> = {
  "flecha-acida-de-melf": "acid-arrow",
  "mao-de-bigby": "arcane-hand",
  "espada-de-mordenkainen": "arcane-sword",
  "aura-magica-de-nystul": "arcanists-magic-aura",
  "tentaculos-negros-de-evard": "black-tentacles",
  "cao-fiel-de-mordenkainen": "faithful-hound",
  "disco-flutuante-de-tenser": "floating-disk",
  "esfera-congelante-de-otiluke": "freezing-sphere",
  "riso-histerico-de-tasha": "hideous-laughter",
  "invocacao-instantanea-de-drawmij": "instant-summons",
  "danca-irresistivel-de-otto": "irresistible-dance",
  "mansao-magnifica-de-mordenkainen": "magnificent-mansion",
  "santuario-particular-de-mordenkainen": "private-sanctum",
  "esfera-resiliente-de-otiluke": "resilient-sphere",
  "arca-secreta-de-leomund": "secret-chest",
  "ligacao-telepatica-de-rary": "telepathic-bond",
  "pequena-cabana-de-leomund": "tiny-hut",
};

/** nosso id de equipamento → index da API, quando nenhuma regra automática resolve. */
export const EQUIPMENT_ALIASES: Readonly<Record<string, string>> = {
  "light-crossbow": "crossbow-light",
  "hand-crossbow": "crossbow-hand",
  "heavy-crossbow": "crossbow-heavy",
  "studded-leather": "studded-leather-armor",
  "half-plate": "half-plate-armor",
  // Mesma unidade de venda no livro e na SRD (frasco, saco de 1000, 15 m de corda…).
  // Munição fica de fora: o livro vende em lotes (20 flechas) e a API por unidade.
  acid: "acid-vial",
  "alchemists-fire": "alchemists-fire-flask",
  antitoxin: "antitoxin-vial",
  "ball-bearings": "ball-bearings-bag-of-1000",
  "basic-poison": "poison-basic-vial",
  bottle: "bottle-glass",
  "bolt-case": "case-crossbow-bolt",
  "map-case": "case-map-or-scroll",
  chain: "chain-10-feet",
  chalk: "chalk-1-piece",
  flask: "flask-or-tankard",
  "holy-water": "holy-water-flask",
  incense: "block-of-incense",
  ink: "ink-1-ounce-bottle",
  jug: "jug-or-pitcher",
  ladder: "ladder-10-foot",
  "bullseye-lantern": "lantern-bullseye",
  "hooded-lantern": "lantern-hooded",
  "sand-bag": "little-bag-of-sand",
  oil: "oil-flask",
  paper: "paper-one-sheet",
  parchment: "parchment-one-sheet",
  perfume: "perfume-vial",
  "miner-pick": "pick-miners",
  pole: "pole-10-foot",
  "iron-pot": "pot-iron",
  rations: "rations-1-day",
  "hempen-rope": "rope-hempen-50-feet",
  "silk-rope": "rope-silk-50-feet",
  "merchant-scale": "scale-merchants",
  sledgehammer: "hammer-sledge",
  "portable-ram": "ram-portable",
  string: "string-10-feet",
  tent: "tent-two-person",
  whistle: "signal-whistle",
  pulley: "block-and-tackle",
  "arcane-focus-crystal": "crystal",
  "arcane-focus-orb": "orb",
  "arcane-focus-rod": "rod",
  "arcane-focus-staff": "staff",
  "arcane-focus-wand": "wand",
  "druidic-focus-sprig": "sprig-of-mistletoe",
  "druidic-focus-staff": "wooden-staff",
  "druidic-focus-totem": "totem",
  "druidic-focus-wand": "yew-wand",
  "holy-symbol-amulet": "amulet",
  "holy-symbol-emblem": "emblem",
  "holy-symbol-reliquary": "reliquary",
};

/** nosso id de sub-raça → index da API. */
export const SUBRACE_ALIASES: Readonly<Record<string, string>> = {
  lightfoot: "lightfoot-halfling",
};

/** Escolas: a API usa o id em inglês; o catálogo do livro guarda o nome pt-BR. */
export const SCHOOL_PT: Readonly<Record<string, string>> = {
  abjuration: "abjuração",
  conjuration: "conjuração",
  divination: "adivinhação",
  enchantment: "encantamento",
  evocation: "evocação",
  illusion: "ilusão",
  necromancy: "necromancia",
  transmutation: "transmutação",
};

export function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
