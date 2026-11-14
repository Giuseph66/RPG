# QA geral dos complementos

## Ambiente e preservação

O root liberou a reserva global; C confirmou que a fonte estava congelada durante sua rodada de navegador. Os gates foram executados em processos separados, sem encerrar a sessão de Vite de C. Antes de `npm test`, não havia variáveis de ambiente com `EMULATOR` ou `FIREBASE` no processo, e a porta TCP 8080 não estava ouvindo. O runner foi usado sem `--aplica`.

O workspace já continha alterações staged e unstaged de várias lanes. Nenhum gate foi executado com finalidade de stage, reset, commit ou deploy; nenhum arquivo foi staged/resetado/commitado/deployado nesta rodada. Os arquivos de fonte arquivística e CSV foram preservados em seus bytes originais.

## Gates globais — rodada 1

| Comando | Resultado | Log |
| --- | --- | --- |
| `npm test` | Falhou: 4 arquivos, 6 testes; 172 arquivos passaram, 4 skipped; 1276 testes passaram, 7 skipped. | `Testes/logs/complementos-npm-test-rodada1.log` |
| `npm run typecheck` | Falhou com 62 diagnósticos TypeScript em 13 arquivos. | `Testes/logs/complementos-typecheck-rodada1.log` |
| `npm run build` | Falhou no mesmo `tsc -b`; `vite build` não foi iniciado. | `Testes/logs/complementos-build-rodada1.log` |
| `git diff --check` | Passou, sem saída de diagnóstico. | `Testes/logs/complementos-diff-check.log` |
| `git diff --cached --check` | Exit 2 em dois arquivos arquivísticos staged. | `Testes/logs/complementos-diff-cached-check-rodada1.log` |

### Falhas da suíte

- `src/app/router.test.tsx`: 3 testes falharam com `expected undefined to be defined` (composição de busca/detalhe do compêndio, detalhe de atributo e recuperação após falha lazy). C corrigiu os 3 casos depois da rodada 1; ainda aguardam nova suíte global coordenada.
- `src/application/state/context.test.ts`: a composição de serviço falhou com `repository.get is not a function`, chamado por `src/application/character/service.ts:54`.
- `src/domain/character/evolution/evolve-classes.test.ts`: uma escolha de Especialização do Ladino falhou com `invalid-reference`: “Expertise exige proficiência já registrada em stealth.” B está investigando uma possível inconsistência de escolhas duplicadas.
- `src/data/rulepacks/phb-ptbr-local-2017/index.test.ts`: o teste esperava `LOBO` na chave `wolf`, mas recebeu `undefined`.

O runner também emitiu avisos do jsdom porque `HTMLCanvasElement.getContext()` não está implementado; esses avisos não foram contabilizados como testes falhos.

### Diagnósticos TypeScript da rodada 1

| Arquivo | Quantidade | Resumo |
| --- | ---: | --- |
| `src/app/bootstrap.test.tsx` | 4 | tipos de registros de criaturas não atribuíveis ao helper de persistência |
| `src/application/character/action-capabilities.test.ts` | 1 | `faces` de dados inferido como `number` em vez da união de faces válida |
| `src/application/character/action-capabilities.ts` | 1 | `durationMinutes` ampliado de literal `1` para `number` |
| `src/application/character/action-dispatcher.test.ts` | 4 | acesso a `rollId` em união de payloads e três alargamentos de `durationMinutes` |
| `src/application/transfer/backup.test.ts` | 1 | coleção opcional `records.creatures` acessada sem fallback |
| `src/application/transfer/backup.ts` | 26 | narrowing de `records` desconhecido perdeu os campos legados após normalizar as coleções opcionais |
| `src/data/creatures/catalog.ts` | 10 | união inferida dos 95 blocos não expunha campos opcionais do mapper |
| `src/domain/character/evolution/granted-spells.test.ts` | 3 | fixtures de comando de magia incompletos após novos contextos de alvo/material |
| `src/domain/rules/rest/rest.test.ts` | 2 | fixtures `SourceRef` sem `sourceId` e `chapter` |
| `src/domain/rules/wild-shape/index.test.ts` | 3 | fixtures não tratavam `creatures` opcional |
| `src/infrastructure/persistence/indexeddb/creature-proposal-persistence.test.ts` | 1 | narrowing de `campaignIndex` em união de fixtures de stores |
| `src/infrastructure/persistence/indexeddb/remote-hydration-repository.test.ts` | 2 | payload de hidratação continha `campaignId: undefined`, que não é `JsonValue` |
| `tests/integration/session-persistence.integration.test.ts` | 4 | opções de backup omitiram o repositório obrigatório `journey` |

### Whitespace em arquivos staged

`git diff --cached --check` sinalizou uma linha em branco no fim de `docs/fontes/complementos-2026-11/03-tasha-ocr.txt` e 2.259 linhas CRLF em `docs/fontes/complementos-2026-11/media-index.csv`. São artefatos arquivísticos extraídos/staged; foram preservados sem normalização de linha ou trimming. O diff unstaged não apresentou erro de whitespace na rodada 1.

## Correções focais da lane P

Após preservar os logs da rodada 1 com o sufixo `-rodada1`, foram corrigidos os diagnósticos desta lane: o parser de backup agora estreita `rawRecords` e copia explicitamente as coleções legadas, normalizando as quatro coleções aditivas ausentes para arrays vazios; o teste usa fallback para coleção opcional; a integração usa `IndexedDbJourneyVisibilityRepository` real e não usa casts para contornar `BackupServiceOptions`; a fixture de hidratação omite `campaignId` quando não existe; o teste de migração v5 estreita `campaignIndex` pela presença da chave; e o mapper de criaturas usa um tipo de entrada contextual que mantém os campos opcionais sem reescrever os 95 blocos.

Focal posterior: `npx vitest run src/application/transfer/backup.test.ts src/infrastructure/persistence/indexeddb/remote-hydration-repository.test.ts src/infrastructure/persistence/indexeddb/creature-proposal-persistence.test.ts tests/integration/session-persistence.integration.test.ts src/data/creatures/catalog.test.ts` — 5 arquivos, 31 testes passaram. Log: `Testes/logs/complementos-persistence-focal.log`.

## Gates globais — rodada 2

O snapshot desta rodada estava no `HEAD` `7fb54db`; o root informou que esse commit e o índice vazio vieram de uma alteração externa durante a recuperação. Nenhuma alteração staged/resetada/commitada por esta lane. O conteúdo do worktree foi testado como estava.

| Comando | Resultado | Log |
| --- | --- | --- |
| `npm test` | Exit 1 sob contenção: 3 arquivos falharam, 173 passaram, 4 skipped; 7 falhas, 1275 passaram, 7 skipped. | `Testes/logs/complementos-npm-test-rodada2.log` |
| `npm run typecheck` | Rodada inicial exit 1 com um erro residual no mapper `senses[].rangeCm`; depois da correção estreita, passou. | `Testes/logs/complementos-typecheck-rodada2.log`, `Testes/logs/complementos-typecheck-rodada2-final.log` |
| `npm run build` | Rodada inicial parou no mesmo erro TypeScript; depois da correção, `tsc -b && vite build` passou. | `Testes/logs/complementos-build-rodada2.log`, `Testes/logs/complementos-build-rodada2-final.log` |
| `git diff --check` | Passou após atualizar este relatório. | `Testes/logs/complementos-diff-check-qa-final.log` |
| `git diff --cached --check` | Passou após atualizar este relatório; o índice já refletia o estado externo documentado acima. | `Testes/logs/complementos-diff-cached-check-qa-final.log` |
| `npm test -- --maxWorkers=2` | 180 arquivos: 176 passaram, 4 skipped; 1282 testes passaram, 7 skipped (1289). Exit 0; duração 438.26s. | `Testes/logs/complementos-npm-test-rodada2-maxworkers2.log` |

A execução padrão da rodada 2 teve seis timeouts de 5s — dois em `bootstrap.test.tsx`, três em `router.test.tsx` e um em `matrix-level2.test.ts` — e uma asserção sem chamada a `removeEventListener("updatefound", ...)` em `bootstrap.test.tsx:299`. O diagnóstico mostrou workers Vitest concorrendo com compilação Rust de outro projeto e Playwright. B corrigiu a asserção para aguardar a limpeza assíncrona e seu focal passou 1/1. A suíte completa com dois workers foi autorizada pelo root após essa correção; não houve aumento de timeout nem alteração de configuração.

Os 4 arquivos e 7 testes skipped são a contagem final reportada pelo Vitest; o reporter não listou individualmente quais foram ignorados. A validação ACL no emulador Firestore é independente da suíte: a lane reportou 3/3 cenários aprovados antes desta rodada; não foi executada novamente aqui, e não localizei um log de ACL dentro de `Testes/`.

Depois do teste completo verde, o root reportou um defeito de evolução do Ranger nível 11: duas instâncias do recurso gratuito Reforço Feérico poderiam permitir duas conjurações. B corrigiu a reconciliação em `spell-state.ts`; o focal reportado por B passou 17/17. A correção entrou antes da suíte da rodada 3 abaixo.

## Correção do mapper

O focal de `src/data/creatures/catalog.test.ts` passou após a correção de tipagem do mapper. Os conversores agora removem `reachCm`/`rangeCm` numéricos antes do spread e recolocam os valores convertidos para `Centimeters`; a composição remove também campos crus antes do spread final, evitando que os tipos numéricos vazem para `CreatureStatBlock`. Nenhum dos 95 blocos do corpus foi alterado. Logs: `Testes/logs/complementos-catalog-typefix-focal2.log`, `Testes/logs/complementos-typecheck-rodada2-final.log` e `Testes/logs/complementos-build-rodada2-final.log`.

## Revalidação parcial — rodada 3

`npm test -- --maxWorkers=2` passou com 180 arquivos (176 passaram, 4 skipped) e 1291 testes (1284 passaram, 7 skipped), duração de 191.91s. Log: `Testes/logs/complementos-npm-test-rodada3.log`. A contagem de testes aumentou desde a rodada 2.

Este resultado não fecha a validação final. Durante a sequência, C identificou no runtime Fada com export válido, mas ambas as capabilities de Druidismo bloqueadas como pendentes; a triagem de B localizou que `bootstrap` não compõe o pack raw opt-in, afetando Fada/Tasha. O root pediu aguardar a correção e a prova de C antes de executar typecheck/build e uma nova suíte completa. Nenhum desses gates posteriores foi executado ainda; o log da rodada 3 documenta o snapshot anterior a essa correção.

## Gates finais — rodada 4

Snapshot de código: `HEAD 7fb54db`, conforme leitura antes e depois dos gates. A rodada executou sequencialmente, usando os timeouts/configuração padrão; não houve edição de produto, alteração de timeout, instalação de dependência, staging, reset, commit ou deploy nesta lane. Logs novos preservam a rodada: `Testes/logs/complementos-npm-test-rodada4-final.log`, `Testes/logs/complementos-typecheck-rodada4-final.log`, `Testes/logs/complementos-build-rodada4-final.log`, `Testes/logs/complementos-diff-check-rodada4-final.log` e `Testes/logs/complementos-diff-cached-check-rodada4-final.log`.

| Comando | Resultado | Log |
| --- | --- | --- |
| `npm test -- --maxWorkers=2` | Exit 1, 171.48s: 180 arquivos (174 passaram, 2 falharam, 4 skipped); 1309 testes (1300 passaram, 2 falharam, 7 skipped). | `Testes/logs/complementos-npm-test-rodada4-final.log` |
| `npm run typecheck` | Exit 1 em `src/application/character/service.test.ts:56`: stub de `listCharacters` retorna `Character[]`, mas o port requer `readonly CharacterSummary[]`; faltam `classSummary` e `totalLevel`. | `Testes/logs/complementos-typecheck-rodada4-final.log` |
| `npm run build` | Exit 1 no mesmo diagnóstico TypeScript; `vite build` não iniciou. | `Testes/logs/complementos-build-rodada4-final.log` |
| `git diff --check` | Exit 0, sem diagnósticos. | `Testes/logs/complementos-diff-check-rodada4-final.log` |
| `git diff --cached --check` | Exit 0, sem diagnósticos no índice deste snapshot. | `Testes/logs/complementos-diff-cached-check-rodada4-final.log` |

As duas falhas de teste foram:

- `src/app/bootstrap.test.tsx > Bootstrap > adopts the registry for all four destinations with truthful local states`: `waitForText` em `:384` não encontrou `Nenhum personagem ainda`; a exceção é lançada pelo helper em `:129`.
- `src/features/actions/Actions.test.tsx > Actions > traduz a ação indisponível na revisão`: a expectativa `Ação indisponível: Ação bônus.` não apareceu. O DOM continha um painel `Em revisão`, prévia de custo/efeito e `Confirmar execução` para a capacidade de magia bônus.

Os quatro arquivos e sete testes skipped foram identificados no código. Seis testes pertencem aos três arquivos de regras Firebase e são condicionais a `FIREBASE_RULES_EMULATOR=1`: três em `tests/rules/creature-proposal-rules.test.ts`, dois em `tests/rules/map-base64-rules.test.ts` e um em `tests/rules/membership-collection-group.test.ts`. A verificação Firestore da lane de ACL reportou 3/3 cenários aprovados separadamente; não a repeti nesta rodada. O sétimo skip é `tests/srd/manifesto.test.ts`, condicionado a `SRD_APLICA=1`; ele atualiza checksums do manifesto após aplicar correções SRD, por isso não habilitei esse modo mutável.

Como o erro TS impediu a etapa Vite, não há build verde para o smoke de produção da C. A sessão Vite dela foi preservada. Falhas de suite/typecheck/build foram encaminhadas aos owners; esta lane não corrigiu fixtures ou produto fora da ownership de QA.

## Gates finais — rodada 5

Após B corrigir a fixture e o isolamento do banco no teste de bootstrap e C corrigir a interseção de estado/contexto das ações, o root congelou as fontes e liberou nova rodada. Snapshot: `HEAD 7fb54db`. Os comandos rodaram sequencialmente sem override de timeout; os logs desta rodada são novos e preservam os resultados da rodada 4.

| Comando | Resultado | Log |
| --- | --- | --- |
| `npm test -- --maxWorkers=2` | Exit 0, 160.84s: 180 arquivos (176 passaram, 4 skipped); 1311 testes (1304 passaram, 7 skipped). | `Testes/logs/complementos-npm-test-rodada5-final.log` |
| `npm run typecheck` | Exit 0 (`tsc -b`). | `Testes/logs/complementos-typecheck-rodada5-final.log` |
| `npm run build` | Exit 0 (`tsc -b && vite build`); Vite concluiu em 2.45s. | `Testes/logs/complementos-build-rodada5-final.log` |
| `git diff --check` | Exit 0, sem diagnósticos. | `Testes/logs/complementos-diff-check-rodada5-final.log` |
| `git diff --cached --check` | Exit 0, sem diagnósticos. | `Testes/logs/complementos-diff-cached-check-rodada5-final.log` |

Os 4 arquivos e 7 testes skipped têm as pré-condições descritas na rodada 4: seis testes de regras precisam de `FIREBASE_RULES_EMULATOR=1`, e um atualizador de checksum precisa de `SRD_APLICA=1`; a validação ACL 3/3 continua sendo prova separada. O build emitiu avisos do bundler sobre imports dinâmicos inefetivos e chunks acima de 500 kB; a compilação terminou com sucesso. Comuniquei à C que o build está pronto para o smoke de produção e ofereci a troca temporária após coordenação; esta lane não encerrou o servidor nem os perfis de navegador.

## Gates finais — rodada 6

Após B corrigir `saveSheetState` para publicar no store somente depois do save confirmado e somente se a ficha continua selecionada, o root congelou as fontes e liberou a rodada. O teste focal de B reportou 7/7, incluindo CAS/falha, seleção concorrente e saída de forma preservando PV original. Snapshot: `HEAD 7fb54db`. A suíte completa e os demais gates rodaram sequencialmente, sem alteração de timeout. Logs novos: `Testes/logs/complementos-npm-test-rodada6-final.log`, `Testes/logs/complementos-typecheck-rodada6-final.log`, `Testes/logs/complementos-build-rodada6-final.log`, `Testes/logs/complementos-diff-check-rodada6-final.log` e `Testes/logs/complementos-diff-cached-check-rodada6-final.log`.

| Comando | Resultado | Log |
| --- | --- | --- |
| `npm test -- --maxWorkers=2` | Exit 0, 154.13s: 180 arquivos (176 passaram, 4 skipped); 1313 testes (1306 passaram, 7 skipped). | `Testes/logs/complementos-npm-test-rodada6-final.log` |
| `npm run typecheck` | Exit 0 (`tsc -b`). | `Testes/logs/complementos-typecheck-rodada6-final.log` |
| `npm run build` | Exit 0 (`tsc -b && vite build`); Vite concluiu em 2.27s e atualizou `dist`. | `Testes/logs/complementos-build-rodada6-final.log` |
| `git diff --check` | Exit 0, sem diagnósticos. | `Testes/logs/complementos-diff-check-rodada6-final.log` |
| `git diff --cached --check` | Exit 0, sem diagnósticos. | `Testes/logs/complementos-diff-cached-check-rodada6-final.log` |

Os quatro arquivos e sete skips têm as mesmas pré-condições já identificadas: seis testes Firestore condicionados a `FIREBASE_RULES_EMULATOR=1` e um updater de checksum condicionado a `SRD_APLICA=1`. A validação ACL 3/3 permanece separada e não foi repetida. O build emitiu avisos sobre imports dinâmicos inefetivos e chunks acima de 500 kB, mas concluiu. Comuniquei a C que o `dist` da rodada está pronto para smoke de produção; não encerrei servidor ou perfis de navegador.

## Gates finais — rodada 7

Após o smoke de `dist` da rodada 6 revelar que a tela de colaboração continuava mostrando PV 8 depois da saída da forma por inconsciência, C corrigiu a projeção/atualização de estado: persistência salva→refetch/projeção no router e mesclagem do estado canônico somente no card alvo do `CollaborationPanel`. O focal reportado por C passou 13/13, cobrindo forma 8→save de inconsciente com PV original 17 e casos de falha/outro card. O root congelou a produção para esta rodada. Snapshot: `HEAD 7fb54db`.

| Comando | Resultado | Log |
| --- | --- | --- |
| `npm test -- --maxWorkers=2` | Exit 0, 169.56s: 180 arquivos (176 passaram, 4 skipped); 1315 testes (1308 passaram, 7 skipped). | `Testes/logs/complementos-npm-test-rodada7-final.log` |
| `npm run typecheck` | Exit 0 (`tsc -b`). | `Testes/logs/complementos-typecheck-rodada7-final.log` |
| `npm run build` | Exit 0 (`tsc -b && vite build`); Vite concluiu em 2.14s. | `Testes/logs/complementos-build-rodada7-final.log` |
| `git diff --check` | Exit 0, sem diagnósticos. | `Testes/logs/complementos-diff-check-rodada7-final.log` |
| `git diff --cached --check` | Exit 0, sem diagnósticos. | `Testes/logs/complementos-diff-cached-check-rodada7-final.log` |

Durante a suíte, C acrescentou uma anotação de tipo explícita ao mock em `CollaborationPanel.test` para evitar parâmetro `implicit any`; o root pediu preservar a execução em andamento, e a suíte terminou verde sem reinício. Typecheck e build foram executados após essa anotação. A suíte manteve os 4 arquivos e 7 testes skipped já identificados: seis testes Firestore requerem `FIREBASE_RULES_EMULATOR=1`, um updater de checksum requer `SRD_APLICA=1`; ACL 3/3 é prova separada e não foi repetida. O build emitiu avisos de imports dinâmicos inefetivos e chunks acima de 500 kB, sem falha. O novo `dist` foi comunicado à C para o smoke; esta lane não encerrou servidor ou perfis de navegador.
