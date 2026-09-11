/**
 * Versionamento. Autoridade: 09-MODELO-DE-DADOS.md ("Identidade e versionamento").
 *
 * Quatro versões distintas e independentes; incrementar uma NÃO incrementa as demais:
 * 1. `schemaVersion` do payload persistido (Character.schemaVersion, Campaign.schemaVersion, ...).
 * 2. Versão inteira do banco IndexedDB (gerenciada pela infraestrutura; fora destes contratos).
 * 3. `RulesetRef.version` / `RulePackManifest.version` (versão do rule pack).
 * 4. `AppVersion` — versão/build do aplicativo.
 */

import { type Brand } from "./ids";

/** Versão de schema de um payload persistido (inteiro >= 1). Não branded: é um contador simples
 * comparado por igualdade/ordem em múltiplos contextos (erros, migrações, backup). */
export type SchemaVersion = number;

/**
 * Token de concorrência otimista (CAS). Branded para não ser confundido com contadores comuns
 * (ex.: quantidade de itens); todo `save`/`delete` que recebe `expectedRevision` depende dessa
 * distinção para não aceitar um `number` qualquer por engano.
 */
export type Revision = Brand<number, "Revision">;

export function asRevision(value: number): Revision {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Revision deve ser um inteiro >= 0; recebido ${value}.`);
  }
  return value as Revision;
}

/** Versão/build do aplicativo (ex.: "0.3.1" ou hash de build); formato livre, não semver estrito. */
export type AppVersion = string;
