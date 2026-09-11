/**
 * Carregamento do rule pack e resolução exata de `RulesetRef`. Autoridade:
 * docs/criacao/dados/ids.md ("Importação sem pack exato fica pendente; não escolher
 * automaticamente versão 'mais próxima'"), docs/criacao/dados/regras-estaticas.md.
 */

import { type RulesetRef } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type MissingRulesetError, type Result } from "@domain/contracts/errors";
import { CHARACTER_SCHEMA_VERSION } from "@domain/contracts/character";
import { type RulePack } from "@domain/contracts/definitions/rulepack";

import { validateRulePack, type RulePackInput, type RulePackValidationError } from "./validate";

/**
 * Códigos de validação tratados como registro corrompido (a forma dos dados está errada,
 * independente de a fonte referenciada existir). Os demais viram `unresolved-rule`: os dados têm
 * forma válida, mas uma referência ou regra declarada não se resolve dentro do próprio pack.
 */
const CORRUPT_RECORD_CODES: ReadonlySet<RulePackValidationError["code"]> = new Set([
  "invalid-id",
  "duplicate-id",
  "missing-source",
  "foreign-source",
  "manifest-mismatch",
  "invalid-version",
  "invalid-number",
]);

function aggregateMessage(errors: readonly RulePackValidationError[]): string {
  return errors
    .map((error) => `[${error.code}]${error.entityType ? ` ${error.entityType}` : ""}${error.entityId ? ` "${error.entityId}"` : ""}: ${error.message}`)
    .join(" | ");
}

/**
 * Envolve `validateRulePack`; carregamento parcial nunca vira pack. Erros de schema incompatível
 * reportam `unsupported-schema`; erros de registro/manifesto reportam `corrupt-record`; erros de
 * resolução de regra/referência (`dangling-reference`, `cycle`) reportam `unresolved-rule`.
 * Mensagem agregada lista todos os erros encontrados, não só o primeiro.
 */
export function loadRulePack(input: RulePackInput): Result<RulePack, AppError> {
  const result = validateRulePack(input);
  if (result.ok) {
    return ok(result.value);
  }

  const errors = result.error;
  const message = aggregateMessage(errors);
  const hasCorruptError = errors.some((error) => CORRUPT_RECORD_CODES.has(error.code));
  if (hasCorruptError) {
    return err(appError.corruptRecord(input.manifest.id, `Rule pack "${input.manifest.id}" com dados corrompidos: ${message}`));
  }

  const incompatibleSchema = errors.find((error) => error.code === "incompatible-schema");
  if (incompatibleSchema) {
    const { minSchemaVersion, maxSchemaVersion } = input.manifest.schemaCompatibility;
    return err(
      appError.unsupportedSchema(
        CHARACTER_SCHEMA_VERSION,
        { min: minSchemaVersion, max: maxSchemaVersion },
        `Rule pack "${input.manifest.id}" incompatível com o schema da aplicação: ${message}`,
      ),
    );
  }

  return err(appError.unresolvedRule(`Rule pack "${input.manifest.id}" com referência/regra não resolvida: ${message}`));
}

/**
 * Resolução EXATA de `{id, version}` dentro de uma lista de packs carregados. Nunca escolhe a
 * versão "mais próxima" (docs/criacao/dados/ids.md) — ausência de correspondência exata é
 * sempre `missing-ruleset`, mesmo que exista outra versão do mesmo `id`.
 */
export function resolveRulesetRef(available: readonly RulePack[], ref: RulesetRef): Result<RulePack, MissingRulesetError> {
  const found = available.find((pack) => pack.manifest.id === ref.id && pack.manifest.version === ref.version);
  if (!found) {
    return err(appError.missingRuleset(ref, `Rule pack "${ref.id}@${ref.version}" não encontrado (versão exata exigida).`));
  }
  return ok(found);
}
