/**
 * Catálogo de faces de dado suportadas. `DiceFaces` é união fechada do contrato
 * (@domain/contracts/primitives); este módulo só anexa rótulo pt-BR e fonte.
 *
 * PENDÊNCIA DE CITAÇÃO: a introdução "Dados" do capítulo 1 (p.7–8 conforme instrução da tarefa)
 * não foi localizada com página impressa/PDF exata nos documentos operacionais consultados
 * (docs/criacao/11-DICE-ENGINE.md, docs/criacao/14-CONTEUDO-E-FONTES.md, regras-estaticas.md).
 * Por instrução explícita da tarefa, usa-se `section: "Introdução — Dados"` sem `printedPage`/
 * `pdfPage` até que um agente com acesso ao PDF confirme a página exata. Registrar resolução
 * junto de docs/criacao/decisoes/PENDENCIAS.md quando confirmado.
 */

import { asRulesetId, type RulesetId } from "@domain/contracts/ids";
import { type DiceFaces, type SourceRef } from "@domain/contracts/primitives";

const PACK_ID: RulesetId = asRulesetId("phb-ptbr-local-2017");

const DICE_SOURCE: SourceRef = {
  sourceId: PACK_ID,
  chapter: "Capítulo 1",
  section: "Introdução — Dados",
};

/** Faces de dado suportadas pelo Dice Engine (11-DICE-ENGINE.md). Fechado no contrato. */
export const DICE_FACES: readonly DiceFaces[] = [4, 6, 8, 10, 12, 20, 100];

export interface DiceCatalogEntry {
  readonly faces: DiceFaces;
  readonly label: string;
  readonly sourceRefs: readonly SourceRef[];
}

/** Um item por face, com rótulo padrão "d<faces>" (notação idêntica em pt-BR). */
export const DICE: readonly DiceCatalogEntry[] = DICE_FACES.map((faces) => ({
  faces,
  label: `d${faces}`,
  sourceRefs: [DICE_SOURCE],
}));

export function findDice(faces: DiceFaces): DiceCatalogEntry | undefined {
  return DICE.find((entry) => entry.faces === faces);
}
