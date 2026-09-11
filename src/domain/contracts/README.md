# src/domain/contracts

Contratos compartilhados congelados por DATA-001. Autoridade normativa em
`docs/criacao/dados/schemas.md`, `09-MODELO-DE-DADOS.md`, `10-RULES-ENGINE.md`,
`11-DICE-ENGINE.md` e `magia/schema-magia.md` — divergência entre este código e os documentos
exige corrigir contrato e consumidores juntos, nunca só o código.

## Mapa de arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `ids.ts` | Brands (`EntityId`, `Uuid`, `RulesetId`, `PackVersion`, `CommandId`, `IsoTimestamp`), helpers `asX`/`isX`, `RulesetRef`, `DefinitionRef`, `TypedDefinitionRef`, `EntityType` |
| `primitives.ts` | `SourceRef`, `DefinitionBase`, `Choice*`, `RuleModifier` (target/operator/value/predicate fechados), `Duration`, `Ability`, `Skill`, `DamageType`, `Size`, `ArmorCategory`, `Currency`, `GameTime`, unidades (`Centimeters`, `Grams`, `CopperPieces`, `DiceFaces`, `DiceFormula`) |
| `versioning.ts` | `SchemaVersion`, `Revision` (branded, CAS), `AppVersion`; comentário das 4 versões distintas |
| `errors.ts` | `AppError` (união fechada), `Result`, `ok`/`err`/`isOk`/`isErr`, construtores `appError.*` |
| `character.ts` | `Character` (schemaVersion 1) e todos os subtipos de estado; `CharacterSummary`; `CharacterDraft` |
| `derived.ts` | `CharacterDerived`, `Explanation<T>`, `Contribution` |
| `campaign.ts` | `Campaign`, `JournalEntry`, `MapRecord`, `MapPin`, `Asset`, `Quest`, `NpcRecord` |
| `dice.ts` | `DiceExpression`, `DiceRoll`, `RandomSource`, `RollPlan`, `AbilityScoreRollResult`, `DiceHistoryEntry` |
| `rules.ts` | `Command` (união por `kind`), `CampaignCommand`, `RuleContext`, `RuleResult` (`success`/`needsInput`/`rejected`), `Effect`, `InputRequest`, `RuleError`, `CommandReceipt` |
| `backup.ts` | `BackupEnvelope`, `ExportedAsset`, `ImportPreview`, `ImportMode` |
| `definitions/*` | Definitions imutáveis do pack: raça, classe, antecedente, talento, feature, recurso, condição, equipamento, magia, progressão, template, rule pack |
| `fixtures.ts` | Fixtures de FRONTEIRA de tipo para os testes deste pacote (não são conteúdo canônico do PDF) |
| `index.ts` | Barrel raiz + `CONTRACTS_VERSION` |

## Regras de import

- Consumidores importam via `@domain/contracts/...` (barrel raiz ou arquivo específico); nunca
  redefinem `Character`, `RuleResult`, `DiceRoll` ou interfaces de repositório localmente
  (AGENT-PROTOCOL.md, "Fronteiras").
- Dentro deste pacote, dependência é sempre unidirecional: `ids` ← `primitives`/`versioning` ←
  `definitions/*` e `character.ts`/`campaign.ts`/`dice.ts` ← `derived.ts` ← `rules.ts`/`backup.ts`.
  `character.ts` só referencia definitions por `DefinitionRef`/`EntityId`, nunca pelo tipo
  completo — isso evita ciclo com `definitions/*` e preserva a separação
  imutável (pack) / mutável (jogador) de `09-MODELO-DE-DADOS.md`.
- `rules.ts` importa `definitions/spell.ts` (para `CastMode`/`CastPreview`/`SpellTargetContext`);
  `definitions/spell.ts` **não** importa `rules.ts` de volta — ver comentário no topo de
  `definitions/spell.ts` sobre por que `CastResolution` não é um alias exportado.

## O que consumidores NÃO podem fazer

- Importar React, DOM, IndexedDB ou qualquer API de plataforma a partir deste pacote (ele não
  importa nenhuma dessas coisas e não deve passar a importar).
- Guardar PV atual, slots gastos, CA calculada ou qualquer outro derivado dentro de uma
  `*Definition`; definitions são imutáveis e pertencem ao pack, não ao jogador.
- Inventar operador de `RuleModifier` fora da união fechada, ou tratar `needsInput`/`rejected`
  como se tivessem `nextState` aplicável.
- Gerar `EntityId` em runtime a partir de um nome traduzido; usar sempre o ID estável do pack.
- Tratar `Result` como coleção vazia em caso de erro — sempre checar `ok`/`isOk`.
