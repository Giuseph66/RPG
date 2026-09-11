/**
 * Hash determinístico e puro (sem `crypto` do Node, compatível com navegador/PWA) usado em
 * `RulePackManifest.checksums[entityType]`. Detecta alteração acidental de um catálogo entre
 * duas montagens do mesmo pack; NÃO autentica origem nem substitui assinatura criptográfica.
 *
 * Determinismo: `canonicalStringify` ordena todas as chaves de objeto recursivamente antes de
 * serializar, então o hash de um catálogo é o mesmo independentemente da ordem de inserção das
 * chaves de cada item (arrays preservam ordem — reordenar o catálogo em si MUDA o hash, o que é
 * intencional: cardinalidade/ordem de entrada também é conteúdo do catálogo bruto informado).
 */

/** Ordena chaves de objetos recursivamente; arrays mantêm ordem; primitivos passam direto. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

/** JSON com chaves de objeto ordenadas alfabeticamente em cada nível, recursivamente. */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/**
 * FNV-1a 32-bit sobre uma string UTF-16 (suficiente para detecção de alteração acidental, não
 * para segurança). Retorna 8 caracteres hexadecimais em minúsculas, sempre com zero à esquerda.
 */
export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Checksum de um catálogo (array de definitions ou qualquer valor serializável). */
export function computeChecksum(catalog: unknown): string {
  return fnv1a32(canonicalStringify(catalog));
}

/**
 * Computa um checksum por entrada de `catalogsByKey` (tipicamente uma chave por `EntityType` do
 * pack, incluindo "progression" para a definição singular). Chave não reflete ordem de entrada
 * do objeto de entrada — apenas identifica qual catálogo cada checksum descreve.
 */
export function computeChecksums(
  catalogsByKey: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string>> {
  const checksums: Record<string, string> = {};
  for (const [key, catalog] of Object.entries(catalogsByKey)) {
    checksums[key] = computeChecksum(catalog);
  }
  return checksums;
}
