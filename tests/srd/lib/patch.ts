/**
 * Edição cirúrgica dos catálogos em `src/data/**`: localiza o objeto literal que contém
 * `id: "<id>"` (também `id: asEntityId("<id>")`/`spellId("<id>")`) e troca, insere ou remove
 * uma propriedade de primeiro nível. Não reformata o restante do arquivo.
 */
import { readFileSync, writeFileSync } from "node:fs";

/** Valor TypeScript cru (ex.: `asCentimeters(900)`), escrito sem aspas. */
export interface RawLiteral {
  readonly raw: string;
}

export type PatchValue = string | number | boolean | RawLiteral | readonly PatchValue[] | { readonly [key: string]: PatchValue } | undefined;

export interface SourcePatch {
  readonly file: string;
  readonly id: string;
  readonly key: string;
  /** `undefined` remove a propriedade. */
  readonly value: PatchValue;
  /** Linha em tupla `["<id>", …]`: posição do elemento a trocar (a `key` fica só como rótulo). */
  readonly position?: number;
}

export const raw = (text: string): RawLiteral => ({ raw: text });

function isRaw(value: unknown): value is RawLiteral {
  return typeof value === "object" && value !== null && "raw" in value && Object.keys(value).length === 1;
}

export function toTs(value: PatchValue): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (isRaw(value)) return value.raw;
  if (Array.isArray(value)) return `[${value.map(toTs).join(", ")}]`;
  const entries = Object.entries(value as Record<string, PatchValue>).filter(([, entry]) => entry !== undefined);
  return `{ ${entries.map(([key, entry]) => `${key}: ${toTs(entry)}`).join(", ")} }`;
}

/** Avança sobre string/comentário iniciado em `index`; devolve o índice do último caractere consumido. */
function skipNonCode(text: string, index: number): number {
  const char = text[index];
  if (char === "\"" || char === "'" || char === "`") {
    for (let cursor = index + 1; cursor < text.length; cursor += 1) {
      if (text[cursor] === "\\") cursor += 1;
      else if (text[cursor] === char) return cursor;
    }
    return text.length - 1;
  }
  if (char === "/" && text[index + 1] === "/") {
    const end = text.indexOf("\n", index);
    return end === -1 ? text.length - 1 : end - 1;
  }
  if (char === "/" && text[index + 1] === "*") {
    const end = text.indexOf("*/", index + 2);
    return end === -1 ? text.length - 1 : end + 1;
  }
  return index;
}

const OPEN = new Set(["{", "[", "("]);
const CLOSE = new Set(["}", "]", ")"]);

/** Posição do `{` que envolve `target`, percorrendo o arquivo com consciência de strings. */
function enclosingObjectStart(text: string, target: number): number {
  const stack: { readonly char: string; readonly index: number }[] = [];
  for (let index = 0; index < target; index += 1) {
    const skipped = skipNonCode(text, index);
    if (skipped !== index) { index = skipped; continue; }
    const char = text[index];
    if (OPEN.has(char)) stack.push({ char, index });
    else if (CLOSE.has(char)) stack.pop();
  }
  for (let cursor = stack.length - 1; cursor >= 0; cursor -= 1) if (stack[cursor].char === "{") return stack[cursor].index;
  throw new Error("Objeto envolvente não encontrado.");
}

interface PropertySpan { readonly keyStart: number; readonly valueStart: number; readonly valueEnd: number }

/** Propriedades de primeiro nível do objeto aberto em `start`, e o índice do `}` final. */
function scanObject(text: string, start: number): { readonly properties: Map<string, PropertySpan>; readonly end: number } {
  const properties = new Map<string, PropertySpan>();
  let depth = 0;
  let pending: { key: string; keyStart: number; valueStart: number } | undefined;
  let lastSignificant = "";
  for (let index = start; index < text.length; index += 1) {
    const skipped = skipNonCode(text, index);
    if (skipped !== index) { index = skipped; lastSignificant = "x"; continue; }
    const char = text[index];
    if (OPEN.has(char)) { depth += 1; if (depth > 1) lastSignificant = char; else lastSignificant = "{"; continue; }
    if (CLOSE.has(char)) {
      depth -= 1;
      if (depth === 0) {
        if (pending) properties.set(pending.key, { ...pending, valueEnd: trimEnd(text, index) });
        return { properties, end: index };
      }
      lastSignificant = char;
      continue;
    }
    if (depth !== 1) { if (!/\s/.test(char)) lastSignificant = char; continue; }
    if (char === ",") {
      if (pending) properties.set(pending.key, { ...pending, valueEnd: trimEnd(text, index) });
      pending = undefined;
      lastSignificant = ",";
      continue;
    }
    if (/[A-Za-z_$]/.test(char) && (lastSignificant === "{" || lastSignificant === ",")) {
      const match = /^([A-Za-z_$][\w$]*)\s*:/.exec(text.slice(index));
      if (match) {
        let valueStart = index + match[0].length;
        while (/\s/.test(text[valueStart])) valueStart += 1;
        pending = { key: match[1], keyStart: index, valueStart };
        index = valueStart - 1;
        lastSignificant = ":";
        continue;
      }
    }
    if (!/\s/.test(char)) lastSignificant = char;
  }
  throw new Error("Objeto sem fechamento.");
}

function trimEnd(text: string, end: number): number {
  let cursor = end;
  while (cursor > 0 && /\s/.test(text[cursor - 1])) cursor -= 1;
  return cursor;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Troca o elemento `position` da tupla que começa com `["<id>",`. */
function patchTuple(text: string, id: string, position: number, value: PatchValue): string {
  const matches = [...text.matchAll(new RegExp(`\\[\\s*"${escapeRegExp(id)}"\\s*,`, "g"))];
  if (matches.length !== 1) throw new Error(`tupla "${id}" encontrada ${matches.length} vez(es).`);
  const start = matches[0].index ?? 0;
  const bounds: number[] = [start + 1];
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const skipped = skipNonCode(text, index);
    if (skipped !== index) { index = skipped; continue; }
    const char = text[index];
    if (OPEN.has(char)) depth += 1;
    else if (CLOSE.has(char)) {
      depth -= 1;
      if (depth === 0) { bounds.push(index); break; }
    } else if (char === "," && depth === 1) bounds.push(index, index + 1);
  }
  const from = bounds[position * 2];
  const to = bounds[position * 2 + 1];
  if (from === undefined || to === undefined) throw new Error(`tupla "${id}" não tem posição ${position}.`);
  const leading = /^\s*/.exec(text.slice(from, to))?.[0] ?? "";
  return `${text.slice(0, from)}${leading}${toTs(value)}${text.slice(trimEnd(text, to))}`;
}

/** Aplica o patch sobre o texto; lança erro quando o alvo é ambíguo ou inexistente. */
export function patchText(text: string, patch: Omit<SourcePatch, "file">): string {
  if (patch.position !== undefined) return patchTuple(text, patch.id, patch.position, patch.value);
  const pattern = new RegExp(`\\bid:\\s*(?:[A-Za-z_$][\\w$]*\\()?"${escapeRegExp(patch.id)}"`, "g");
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`id "${patch.id}" encontrado ${matches.length} vez(es).`);
  const start = enclosingObjectStart(text, matches[0].index ?? 0);
  const { properties, end } = scanObject(text, start);
  const property = properties.get(patch.key);
  if (patch.value === undefined) {
    if (!property) return text;
    let from = property.keyStart;
    let to = property.valueEnd;
    const after = /^\s*,\s*/.exec(text.slice(to));
    if (after && text[to + after[0].length] !== "}") to += after[0].length;
    else {
      const before = /,\s*$/.exec(text.slice(0, from));
      if (before) from -= before[0].length;
    }
    return text.slice(0, from) + text.slice(to);
  }
  const literal = toTs(patch.value);
  if (property) return text.slice(0, property.valueStart) + literal + text.slice(property.valueEnd);
  const insertAt = trimEnd(text, end);
  const needsComma = text[insertAt - 1] !== "," && text[insertAt - 1] !== "{";
  return `${text.slice(0, insertAt)}${needsComma ? "," : ""} ${patch.key}: ${literal} ${text.slice(end)}`;
}

/** Agrupa por arquivo e grava; devolve os patches aplicados e os que falharam. */
export function applyPatches(patches: readonly SourcePatch[]): { readonly applied: readonly SourcePatch[]; readonly failed: readonly { readonly patch: SourcePatch; readonly reason: string }[] } {
  const applied: SourcePatch[] = [];
  const failed: { patch: SourcePatch; reason: string }[] = [];
  const byFile = new Map<string, SourcePatch[]>();
  for (const patch of patches) byFile.set(patch.file, [...(byFile.get(patch.file) ?? []), patch]);
  for (const [file, filePatches] of byFile) {
    let text = readFileSync(file, "utf8");
    for (const patch of filePatches) {
      try {
        text = patchText(text, patch);
        applied.push(patch);
      } catch (error) {
        failed.push({ patch, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    writeFileSync(file, text);
  }
  return { applied, failed };
}
