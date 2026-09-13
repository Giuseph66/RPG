import emptyAdventurer from "./empty-adventurer.webp";
import fighterPaladin from "./fighter-paladin.webp";
import rogue from "./rogue.webp";
import wizardSorcerer from "./wizard-sorcerer.webp";
import cleric from "./cleric.webp";
import druid from "./druid.webp";
import barbarian from "./barbarian.webp";
import ranger from "./ranger.webp";
import bard from "./bard.webp";
import warlock from "./warlock.webp";

/** Supported class identifiers. Domain code should pass a class key, never a file path. */
export type FantasyClass =
  | "barbarian"
  | "bard"
  | "cleric"
  | "druid"
  | "fighter"
  | "paladin"
  | "ranger"
  | "rogue"
  | "sorcerer"
  | "warlock"
  | "wizard";

export type FantasyArtwork = { readonly src: string; readonly alt: string };

export const defaultAdventurer: FantasyArtwork = {
  src: emptyAdventurer,
  alt: "Aventureiro diante de uma cidadela sob a lua",
};

const fighterArtwork: FantasyArtwork = {
  src: fighterPaladin,
  alt: "Guerreiro blindado diante de uma cidadela",
};
const rogueArtwork: FantasyArtwork = {
  src: rogue,
  alt: "Ladino encapuzado observando a cidade à noite",
};
const wizardArtwork: FantasyArtwork = {
  src: wizardSorcerer,
  alt: "Mago canalizando magia numa biblioteca arcana",
};

/** Canonical class-to-art map. Every unsupported class resolves to the fallback. */
export const classArtwork: Readonly<Record<FantasyClass, FantasyArtwork>> = {
  barbarian: { src: barbarian, alt: "Bárbaro no alto das montanhas" },
  bard: { src: bard, alt: "Bardo tocando alaúde numa taverna" },
  cleric: { src: cleric, alt: "Clérigo em ruínas banhadas por luz" },
  druid: { src: druid, alt: "Druida numa floresta antiga" },
  fighter: fighterArtwork,
  paladin: fighterArtwork,
  ranger: { src: ranger, alt: "Patrulheiro observando o vale" },
  rogue: rogueArtwork,
  sorcerer: wizardArtwork,
  warlock: { src: warlock, alt: "Bruxo invocando energia carmesim" },
  wizard: wizardArtwork,
};

export function artworkForClass(
  className: string | null | undefined,
): FantasyArtwork {
  if (!className) return defaultAdventurer;
  return classArtwork[className.toLowerCase() as FantasyClass] ?? defaultAdventurer;
}
