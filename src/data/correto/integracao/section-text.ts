/**
 * Recortes do texto extraído do Livro do Jogador.
 *
 * As seções de `src/data/correto/` guardam capítulos inteiros num único campo `text`.
 * Estas funções recortam subseções pelo cabeçalho impresso (linha inteira em caixa alta)
 * ou pelo nome do item (`Nome. Texto…`), sem reescrever nada: o conteúdo devolvido é
 * sempre uma fatia literal da fonte.
 */

/** Índice do cabeçalho `heading` ocupando uma linha inteira, a partir de `from`. */
function headingIndex(source: string, heading: string, from = 0): number {
  const pattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
  const slice = source.slice(from);
  const match = pattern.exec(slice);
  return match?.index === undefined ? -1 : from + match.index;
}

/**
 * Fatia entre o cabeçalho `heading` e o primeiro dos `stopHeadings` que venha depois dele.
 * Sem `stopHeadings`, vai até o fim da seção.
 */
export function sliceSection(source: string, heading: string, stopHeadings: readonly string[] = []): string {
  const start = headingIndex(source, heading);
  if (start < 0) return "";
  let end = source.length;
  for (const stop of stopHeadings) {
    const candidate = headingIndex(source, stop, start + heading.length);
    if (candidate >= 0 && candidate < end) end = candidate;
  }
  return source.slice(start, end).trim();
}

/**
 * Fatia de um item descrito como `Nome. Texto…` até o próximo nome de item.
 * `stopNames` aceita tanto outro item (`Nome.`) quanto um cabeçalho em caixa alta.
 */
export function sliceNamedItem(source: string, name: string, stopNames: readonly string[]): string {
  const marker = `${name}.`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  let end = source.length;
  for (const stop of stopNames) {
    for (const candidate of [source.indexOf(`\n${stop}.`, start + marker.length), headingIndex(source, stop, start + marker.length)]) {
      if (candidate >= 0 && candidate < end) end = candidate;
    }
  }
  return source.slice(start, end).trim();
}

/** Texto do bloco sem a linha de cabeçalho repetida pela extração. */
export function blockBody(text: string): string {
  const [, ...rest] = text.trimStart().split("\n");
  return rest.join("\n").trim();
}

/** Um bloco sem corpo é um cabeçalho órfão da extração e não deve virar card. */
export function hasBody(text: string): boolean {
  return blockBody(text).length > 0;
}
