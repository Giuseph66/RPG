# Tarefas de implementação — registro canônico

IMPLEMENTAÇÃO DO SOFTWARE INICIADA. `CORE-001`, `DATA-001`, `DATA-002`, `DATA-003`, `DATA-004`, `DATA-005`, `DICE-001`, `ITEM-001`, `RULE-001`, `UI-001` e `STATE-001` estão `DONE`; `DICE-002` está em `REVIEW`, `UI-002` integra o overlay e `SPELL-001` está em execução com Luna.

36 tarefas, IDs estáveis. O campo “bloqueia” é o inverso exato de “dependências”; [DEPENDENCIES](DEPENDENCIES.md) deriva deste registro. Contratos comuns estão em 09/10/11 e dados/schemas; DATA-001 os materializa antes dos consumidores. Pendências semânticas de fonte continuam registradas em decisoes/PENDENCIAS, nunca resolvidas por default silencioso.

Arquivos abaixo são caminhos PROPOSTOS, não criados nesta etapa. `**` inclui apenas descendentes da área nomeada. Testes unitários locais `*.test.ts(x)` podem ser colocados pelo owner dentro da própria área; suítes transversais possuem owners QA exclusivos. Alterar configuração compartilhada exige handoff a CORE-001, inclusive durante PWA.

## CORE-001 — Fundação e ferramentas planejadas

- ID: `CORE-001`
- Título: Fundação e ferramentas planejadas.
- Status: `DONE` — aceite e gates concluídos.
- Responsável: `/root/core_foundation`.
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `high`.
- Workspace: branch `main`, workspace compartilhado; revisão-base `1674737`.
- Reserva: `2026-09-11T13:00:35-04:00`; aceite: `2026-09-11T13:17:46-04:00`.
- Prioridade: P0.
- Dependências: nenhuma.
- Bloqueia: DATA-001, UI-001.
- Escopo: Criar futuramente esqueleto React/TypeScript/Vite, scripts de validação e composição vazia; registrar dependências aprovadas. Nesta etapa documental nada é instalado.
- Arquivos próprios: `.gitignore`; `package.json`; `package-lock.json`; `tsconfig.json`; `tsconfig.app.json`; `tsconfig.node.json`; `vite.config.ts`; `index.html`; `src/main.tsx`; `src/app/bootstrap.tsx`; `src/app/bootstrap.test.tsx`; `tests/setup.ts`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/03-ARQUITETURA.md`; `docs/criacao/decisoes/ADR-0001-stack.md`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Estrutura mínima inicia sem feature fictícia; aliases e fronteiras documentados; scripts distinguem checagem de tipo, testes e build; ausência de backend/API obrigatória.
- Testes: Na implementação: smoke do bootstrap, checagem de tipos e bundle de produção após autorização aplicável; provar ausência de chamadas externas obrigatórias.
- Evidência de aceite: `npm run typecheck` exit 0; `npm test` exit 0 (1/1); `npm run build` exit 0 (Vite 8.3.0, 15 módulos). Mudança delimitada aceita em `2026-09-11T14:38-04:00` (pedidos UI-001/DATA-003): `import "@styles/index.css"` + `/// <reference types="vite/client" />` em `src/main.tsx`; `fake-indexeddb@6.2.5` devDependency + `import "fake-indexeddb/auto"` em `tests/setup.ts`; typecheck 0 erros, 236 testes, build emite CSS. Revisão Luna e Claude Sonnet; correção TS7 executada por Claude Sonnet MCP. Execução dos gates caiu para Terra porque o MCP one-shot exigiu aprovação interna não encaminhável.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: DATA-001, UI-001. Passo principal: 00.

## DATA-001 — Congelar contratos compartilhados

- ID: `DATA-001`
- Título: Congelar contratos compartilhados.
- Status: `DONE` — correção Luna aceita após testes focalizados 28/28; checagem de tipos sem erros nos próprios paths, com adaptação downstream delegada a DATA-003.
- Responsável: `/root/fix_data_contracts`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; fallback autorizado porque Claude Code está indisponível.
- Workspace: branch `main`, workspace compartilhado; base CORE-001 aceita (working tree não commitado).
- Reserva/heartbeat: `2026-09-11T16:55:56-04:00`; aceite anterior preservado como histórico no campo de evidência.
- Prioridade: P0.
- Dependências: CORE-001.
- Bloqueia: DATA-002, DATA-003, DICE-001, STATE-001.
- Escopo: Converter especificações em tipos únicos para definições, agregados, comandos, resultados, IDs, RNG e ports de repositories; resolver pendências de contrato antes dos consumidores.
- Arquivos próprios: `src/domain/contracts/**`; `src/application/ports/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Character, Campaign, SpellDefinition, DiceExpression/DiceRoll, RuleResult, ConditionDefinition e ResourceDefinition têm origem única; revisão CAS, schemaVersion e rulesetVersion distinguíveis; contrato revisado pelo integrador.
- Testes: Fixtures de fronteira válidas/inválidas e checagem de tipos dos consumidores; nenhuma dependência React, DOM, IndexedDB ou pacote de UI nos contratos.
- Evidência de aceite: 36 arquivos em `src/domain/contracts/**` (+`definitions/`, `fixtures.ts`, `contracts.test.ts`, `README.md`) e `src/application/ports/**`; `CONTRACTS_VERSION = "1.0.0"`; `npx vitest run src/domain/contracts/contracts.test.ts` 21/21; `tsc -b` sem erro nos paths próprios (erros concorrentes apenas em UI-001 em andamento); grep react/DOM/indexedDB vazio. Decisões registradas no handoff: `RuleResult.status` discriminante; `Command.payload` vincula rolagens por `Uuid[]`; `CharacterDraft` com schema próprio sem `revision`; `RuleModifierTarget` ganhou `attack-roll`/`ability-check`; `ArmorCategory` em primitives (ciclo); sem alias `CastResolution` (usar `RuleResult`). Pendência aberta: ND fracionário não modelado (abrir contra DATA-001 se necessário); `UnitOfWork.run(fn)` sem contexto de transação — DATA-003 pode solicitar extensão.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: DATA-002, DATA-003, DICE-001, STATE-001. Passo principal: 03.

## UI-001 — Tokens e componentes fundamentais

- ID: `UI-001`
- Título: Tokens e componentes fundamentais.
- Status: `DONE` — correções Luna aceitas: typecheck, 152 testes UI/estilos e 324 testes globais passaram.
- Responsável: `/root/fix_ui_foundation`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Workspace: branch `main`, workspace compartilhado; base CORE-001 aceita (working tree não commitado).
- Reserva/heartbeat: `2026-09-11T13:41:00-04:00`.
- Prioridade: P0.
- Dependências: CORE-001.
- Bloqueia: UI-002.
- Escopo: Definir valores futuros de tokens por direção aprovada; primitives, foco, modais e feedback próprios, sem lógica RPG.
- Arquivos próprios: `src/styles/**`; `src/components/ui/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/05-DESIGN-SYSTEM.md`; `docs/criacao/interface/modais.md`; `docs/criacao/13-ACESSIBILIDADE.md`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Paleta validada por contraste; controles com estados; AppModal/ConfirmModal/BottomSheet não usam alert/confirm/prompt; teclado e reduced motion previstos.
- Testes: Componentes: foco, retorno, busy/disabled/erro, toque, nomes acessíveis; matriz de contraste dos tokens; revisão visual em largura pequena.
- Evidência de aceite: `src/styles/{tokens.css,tokens.ts,global.css,index.css,contrast.ts,css-modules.d.ts}` + testes; `src/components/ui/**` (Button, IconButton, Input, Select, Tabs, Badge, SectionCard, ProgressBar, VisuallyHidden, feedback/{AppModal,ConfirmModal,BottomSheet,Drawer,Popover,ContextMenu,InlineStatus,LiveRegion}, internal hooks). `tsc -b` 0 erros; `vitest run` 21 files/170 testes; `vite build` ok; grep alert/confirm/prompt/@domain vazio. Matriz de contraste executável (20 pares, texto ≥4.5:1, indicadores ≥3:1) em `contrast.test.ts`. Decisões: modal manual `role=dialog` (jsdom 29 sem `showModal`/`inert`), `aria-disabled` + `disabledReason`, spacing em rem, `color-mix()` para hover. Limitações: fonte tipográfica licenciada pendente; revisão visual 320px/leitor de tela não executada (UI-005/A11Y-001); `inert` real não provável em jsdom. Pedido aberto a CORE-001: `import "@styles/index.css"` em `src/main.tsx`.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: UI-002. Passo principal: 01.

## DATA-002 — Loader e núcleo do rule pack

- ID: `DATA-002`
- Título: Loader e núcleo do rule pack.
- Status: `DONE` — wiring Luna aceito: 77 testes DATA e typecheck passaram; magias/condições seguem pendências explícitas.
- Responsável: `/root/wire_rulepack_content`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Reserva/heartbeat: Luna reservada em `2026-09-11T18:00:00-04:00`.
- Workspace: branch `main`, workspace compartilhado; base DATA-001 aceita.
- Histórico: correção anterior de manifesto/schema por `/root/fix_rulepack`, aceita após testes focalizados 28/28 em `2026-09-11T16:55:56-04:00`.
- Prioridade: P0.
- Dependências: DATA-001.
- Bloqueia: RULE-001, DATA-004, DATA-005, SPELL-001, ITEM-001.
- Escopo: Implementar carregamento/versionamento e índice básico do pack phb-ptbr-local-2017; separar definições imutáveis de estado; preservar sourceRef e pendências.
- Arquivos próprios: `src/data/rulepacks/**`; `src/data/rules/**`; `src/data/abilities/**`; `src/data/skills/**`; `src/data/dice/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/dados/README.md`; `docs/criacao/dados/ids.md`; `docs/criacao/dados/regras-estaticas.md`; `src/domain/contracts/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: IDs estáveis e referências verificáveis; edição divergente não é substituída automaticamente; loader informa pack ausente/incompatível; índice não copia longos textos do livro.
- Testes: IDs duplicados, referência órfã, versão incompatível, alteração de label/tradução e arquivo de pack inválido.
- Evidência de aceite: `src/data/{abilities,skills,dice,rules}/` + `src/data/rulepacks/{manifest,checksum,validate,load,lookup,index}.ts` + `phb-ptbr-local-2017/index.ts`; `npx vitest run src/data` 60/60; `tsc -b` 0 erros; grep react/DOM/eval vazio. `validateRulePack` acumula erros (códigos fechados: invalid-id, duplicate-id, missing-source, foreign-source, dangling-reference, cycle, incompatible-schema, invalid-version, invalid-number); `resolveRulesetRef` exato; checksum FNV-1a canônico. Dívidas: `PLACEHOLDER_PROGRESSION` (1 nível) a substituir por DATA-005; pendência de citação de página "Introdução — Dados" em `src/data/dice/dice.ts`; `has-proficiency`/idiomas sem resolução cruzada. Integração: owners de catálogo NÃO editam `phb-ptbr-local-2017/index.ts`; exportam do próprio path e coordenador reabre DATA-002 para wiring ao fim da onda de conteúdo.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: RULE-001, DATA-004, DATA-005, SPELL-001, ITEM-001. Passo principal: 08.

## DATA-003 — Repositories locais e transações base

- ID: `DATA-003`
- Título: Repositories locais e transações base.
- Status: `DONE` — persistência Luna aceita: transação compartilhada, CAS, recovery, assets, histórico e preferências cobertos.
- Responsável: `/root/complete_persistence`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Workspace: branch `main`, workspace compartilhado; base DATA-001 aceita + CORE-001 mudança (`fake-indexeddb@6.2.5` em `tests/setup.ts`).
- Reserva/heartbeat: Luna reservada em `2026-09-11T17:09:00-04:00`; reserva Claude histórica encerrada em `2026-09-11T16:55:56-04:00`.
- Prioridade: P0.
- Dependências: DATA-001.
- Bloqueia: STATE-001, DATA-006.
- Escopo: Criar adapter IndexedDB, atomicidade por agregado/revisão CAS e persistência inicial recuperável; ports desacoplam UI. Esta base antecede fichas, apesar de acabamento estar no passo 14.
- Arquivos próprios: `src/infrastructure/persistence/indexeddb/**`; `src/infrastructure/preferences/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/08-PERSISTENCIA-LOCAL.md`; `docs/criacao/dados/persistencia.md`; `src/application/ports/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Criar/ler/gravar/listar agregados e anexos por ports; conflito de revisão é erro tipado; settings pequenos em localStorage; commit confirmado antes de status salvo.
- Testes: Round trip, atualização concorrente em duas conexões, falha de transação/quota, leitura inexistente e reabertura; harness isolado não representa prova offline final.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: STATE-001, DATA-006. Passo principal: 14.

## DICE-001 — Engine de dados pura

- ID: `DICE-001`
- Título: Engine de dados pura.
- Status: `DONE` — correção aceita; 7 testes próprios passaram. Typecheck global aguarda adaptação de DATA-003, fora deste ownership.
- Responsável: `/root/fix_dice`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; fallback autorizado porque Claude Code está indisponível.
- Workspace: branch `main`, workspace compartilhado; base DATA-001 aceita.
- Reserva/heartbeat: `2026-09-11T16:55:56-04:00`; aceite anterior preservado como histórico no campo de evidência.
- Prioridade: P0.
- Dependências: DATA-001.
- Bloqueia: RULE-001, DICE-002.
- Escopo: Validar DiceExpression, faces suportadas, modificadores e modos elegíveis; produzir parcelas e total com RNG injetado.
- Arquivos próprios: `src/domain/dice/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/regras/testes.md`; `src/domain/contracts/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: d4/d6/d8/d10/d12/d20/d100 e sinais suportados; vantagem/desvantagem conforme fonte; nenhuma dependência de UI/storage; resultado reproduzível com RNG fixo.
- Testes: Limites faces/quantidade, negativos inválidos para quantidade, modificador negativo, limites do RNG, escolha dos d20 e soma individual/total.
- Evidência de aceite: `src/domain/dice/{validate-expression,parse-formula,random-source,roll,roll-plan,ability-scores,reroll,index}.ts` + 7 suítes; `npx vitest run src/domain/dice` 66/66; `tsc -b` 0 erros; grep Math.random/react/DOM/indexedDB vazio. Tabela de casos determinísticos de 11-DICE-ENGINE coberta; rejeição não consome RNG (`calls===0`); rejection sampling sobre `crypto.getRandomValues`; empate advantage → índice 0; `RNG_VERSION = "platform-rejection-v1"`; id/timestamp injetados via `meta`. Sem pedido a DATA-001.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: RULE-001, DICE-002. Passo principal: 04.

## STATE-001 — Estado local e serviços de aplicação

- ID: `STATE-001`
- Título: Estado local e serviços de aplicação.
- Status: `DONE` — estado Luna aceito: typecheck e 10 testes de hidratação, autosave, conflitos, retry e subscriptions passaram.
- Responsável: `/root/build_application_state`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Reserva/heartbeat: Luna reservada em `2026-09-11T17:25:00-04:00`.
- Prioridade: P0.
- Dependências: DATA-001, DATA-003.
- Bloqueia: UI-002, CHAR-002, UI-003, MAP-001, JOUR-001.
- Escopo: Criar external stores por agregado com useSyncExternalStore consumido pela UI; comandos, seleção, autosave serializado e erros; Context apenas injeção/UI pequena.
- Arquivos próprios: `src/application/character/**`; `src/application/campaign/**`; `src/application/settings/**`; `src/application/dice/**`; `src/application/state/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/03-ARQUITETURA.md`; `docs/criacao/08-PERSISTENCIA-LOCAL.md`; `src/application/ports/**`; `src/domain/contracts/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Hidratação não sobrescreve registros; seleção de ID e revisão impede resultado tardio em outro personagem; debounce não perde última alteração; conflito não é last-write-wins silencioso.
- Testes: Alterações rápidas, troca de agregado durante gravação, erro com draft preservado, retry idempotente, fechamento e subscribers por seletor.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: UI-002, CHAR-002, UI-003, MAP-001, JOUR-001. Passo principal: 03.

## UI-002 — Shell, navegação e header

- ID: `UI-002`
- Título: Shell, navegação e header.
- Status: `IN_PROGRESS` — integração Luna do overlay de dados no shell; router/header permanecem nos próprios paths UI-002.
- Responsável: `/root/connect_dice_overlay`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Reserva/heartbeat: Luna reservada em `2026-09-11T17:36:00-04:00`.
- Prioridade: P0.
- Dependências: UI-001, STATE-001.
- Bloqueia: DICE-002, CHAR-002, UI-003, MAP-001, JOUR-001, COMP-001.
- Escopo: Implementar quatro destinos, rotas subordinadas, regiões fixas, estado de boot e host global de overlays; header apresenta seletores injetados.
- Arquivos próprios: `src/components/layout/**`; `src/app/router.tsx`; `src/app/routes.ts`; `src/features/settings/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/interface/app-shell.md`; `docs/criacao/interface/header.md`; `docs/criacao/interface/navegacao.md`; `src/application/state/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Personagem/Ações/Jornada/Compêndio únicos; Dados button global; header se adapta com zoom; sem imports IndexedDB; falta de personagem permite Compêndio e dados avulsos.
- Testes: Rotas profundas, foco ao navegar, breakpoint sem duplicação, hidratação com erro, ausência de personagem e safe area.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: DICE-002, CHAR-002, UI-003, MAP-001, JOUR-001, COMP-001. Passo principal: 02.

## RULE-001 — Rules Engine e valores derivados

- ID: `RULE-001`
- Título: Rules Engine e valores derivados.
- Status: `DONE` — engine Luna aceita; typecheck e 4 testes focais passaram.
- Responsável: `/root/build_rules_engine`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Workspace: branch `main`, workspace compartilhado; base DATA-001, DATA-002, DICE-001 aceitas.
- Reserva/heartbeat: Luna reservada em `2026-09-11T17:12:00-04:00`; reserva Claude histórica encerrada em `2026-09-11T16:55:56-04:00`.
- Prioridade: P0.
- Dependências: DATA-002, DICE-001.
- Bloqueia: CHAR-001, CHAR-002, ITEM-002, RULE-002, SPELL-002.
- Escopo: Implementar pipeline puro e proveniência de atributo/proficiência/perícia/resistência/iniciativa/CA/percepção/CD/ataque mágico/PV; exceções explícitas.
- Arquivos próprios: `src/domain/rules/core/**`; `src/domain/rules/derived/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/personagem/atributos.md`; `docs/criacao/personagem/pericias.md`; `src/domain/contracts/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Entrada e snapshot não são mutados; modificadores têm fonte/escopo; bônus não duplicados; ausência de regra retorna resultado não suportado tipado.
- Testes: Casos determinísticos das fórmulas e limites de nível, fontes concorrentes de CA, proficiência/expertise e condição afetando teste.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CHAR-001, CHAR-002, ITEM-002, RULE-002, SPELL-002. Passo principal: 06.

## DICE-002 — Overlay e histórico de dados

- ID: `DICE-002`
- Título: Overlay e histórico de dados.
- Status: `REVIEW` — overlay Luna entregue, 6 testes focais passaram; aguarda integração UI-002/CORE-001 e teste em navegador.
- Responsável: `/root/build_dice_overlay`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Reserva/heartbeat: Luna reservada em `2026-09-11T17:55:00-04:00`.
- Prioridade: P1.
- Dependências: DICE-001, UI-002.
- Bloqueia: CORE-002.
- Escopo: Construir conteúdo único de dados para FAB/header/contexto; resultados individuais, histórico local via aplicação e re-rolagem com novo ID.
- Arquivos próprios: `src/features/dice/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/interface/dice-overlay.md`; `src/domain/dice/**`; `src/application/dice/**`; `src/components/ui/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Abre nos quatro destinos, respeita modo elegível/reduced motion e devolve foco; header não duplica RNG; histórico não repete custo de ação.
- Testes: Expressão inválida, retorno de foco, chamadas únicas ao engine, re-rolagem, erro de gravação do histórico e anúncio acessível.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CORE-002. Passo principal: 04.

## DATA-004 — Raças e sub-raças do material

- ID: `DATA-004`
- Título: Raças e sub-raças do material.
- Status: `DONE` — catálogo Luna aceito: 3 testes focais e typecheck passaram.
- Responsável: `/root/build_race_content`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Reserva/heartbeat: aceite registrado após validação em `2026-09-11T17:41:00-04:00`.
- Prioridade: P1.
- Dependências: DATA-002.
- Bloqueia: CHAR-001, COMP-001.
- Escopo: Codificar catálogo racial exclusivamente da fonte atual, relações sub-raça, proficiências, idiomas, deslocamento e escolhas com origem.
- Arquivos próprios: `src/data/races/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/personagem/racas/**`; `docs/criacao/14-CONTEUDO-E-FONTES.md`; `src/data/rulepacks/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Todas entradas documentadas da fonte possuem ID/sourceRef; escolha incompleta permanece escolha, sem default inventado; sem mistura de suplementos.
- Testes: Referências pai/sub-raça, opções obrigatórias, efeitos raciais por nível e labels localizados independentes do ID.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CHAR-001, COMP-001. Passo principal: 08.

## DATA-005 — Classes, subclasses, antecedentes e talentos

- ID: `DATA-005`
- Título: Classes, subclasses, antecedentes e talentos.
- Status: `DONE` — conteúdo Luna aceito: 6 testes focais e typecheck verdes; wiring delegado ao owner DATA-002.
- Responsável: `/root/build_class_content`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Workspace: branch `main`, workspace compartilhado; base DATA-001, DATA-002, DICE-001 aceitas.
- Reserva/heartbeat: Luna reservada em `2026-09-11T17:09:00-04:00`; reserva Claude histórica encerrada em `2026-09-11T16:55:56-04:00`.
- Prioridade: P1.
- Dependências: DATA-002.
- Bloqueia: CHAR-001, CHAR-004, RULE-002, SPELL-002, COMP-001.
- Escopo: Codificar progressão e escolhas do material, com pendências isoladas por capacidade; multiclasse/talentos identificados como opções e fase posterior quando fora V1.
- Arquivos próprios: `src/data/classes/**`; `src/data/subclasses/**`; `src/data/backgrounds/**`; `src/data/feats/**`; `src/data/progression/**`; `src/data/character-templates/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/personagem/classes/**`; `docs/criacao/personagem/antecedentes/**`; `docs/criacao/personagem/talentos/**`; `docs/criacao/personagem/progressao.md`; `docs/criacao/decisoes/PENDENCIAS.md`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Classes/subclasses/antecedentes/talentos catalogados com fontes; tabelas não inferidas de outra edição; divergências do Patrulheiro bloqueiam só mecânicas envolvidas.
- Testes: Cobertura por nível, referência classe/subclasse, escolhas concedidas, recursos recuperáveis e rejeição de tabela ambígua.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CHAR-001, CHAR-004, RULE-002, SPELL-002, COMP-001. Passo principal: 08.

## CHAR-001 — Domínio de criação e validação

- ID: `CHAR-001`
- Título: Domínio de criação e validação.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: RULE-001, DATA-004, DATA-005, ITEM-001, SPELL-001.
- Bloqueia: CHAR-003, CHAR-004.
- Escopo: Construir criação como decisões validadas: origem, atributos, proficiências, equipamento inicial e capacidades; agregado final consistente.
- Arquivos próprios: `src/domain/character/creation/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/personagem/criacao-personagem.md`; `src/domain/contracts/**`; `src/domain/rules/derived/**`; `src/data/races/**`; `src/data/classes/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Criação exige escolhas obrigatórias; valores derivados vêm do engine; alteração de opção invalida escolhas incompatíveis com explicação; personagem válido tem ruleset/version e schemaVersion.
- Testes: Combinações válidas/invalidas, pontos/rolagem de atributos conforme método, escolhas repetidas, proficiência duplicada e fonte não resolvida.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CHAR-003, CHAR-004. Passo principal: 07.

## CHAR-002 — Ficha rápida e expandida

- ID: `CHAR-002`
- Título: Ficha rápida e expandida.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: UI-002, RULE-001, STATE-001.
- Bloqueia: CHAR-003, UI-004.
- Escopo: Expor campos das três páginas da ficha, listas acionáveis, proveniência, vida/recursos e estados; edição via aplicação.
- Arquivos próprios: `src/features/character/sheet/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/interface/pagina-personagem.md`; `docs/criacao/personagem/ficha.md`; `src/domain/contracts/**`; `src/components/ui/**`; `src/application/character/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Visões compartilham mesmo agregado; atributos/perícias/resistências e estados críticos legíveis; formulário preserva draft; narrativas/identidade não são omitidas.
- Testes: Mapeamento dos campos da ficha, rolagem contextual, PV temporários separados, 0 PV, condições, fonte de bônus e reload real.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CHAR-003, UI-004. Passo principal: 05.

## CHAR-003 — Wizard de criação e seleção

- ID: `CHAR-003`
- Título: Wizard de criação e seleção.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: CHAR-001, CHAR-002.
- Bloqueia: CORE-002, DATA-006.
- Escopo: Criar etapas navegáveis com escolhas, validação, resumo, confirmação e save inicial único; retomar draft explicitamente.
- Arquivos próprios: `src/features/character/creation/**`; `src/features/character/selection/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/personagem/criacao-personagem.md`; `src/domain/character/creation/**`; `src/application/character/**`; `src/components/ui/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Voltar preserva escolhas compatíveis; conclusão só após validação e commit; falha não cria múltiplas fichas; seletores usam IDs estáveis.
- Testes: Fluxo completo por classe representativa, erro em cada etapa, alterar raça/classe, repetir confirmar e falha de persistência.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CORE-002, DATA-006. Passo principal: 07.

## CHAR-004 — Progressão e escolhas de nível

- ID: `CHAR-004`
- Título: Progressão e escolhas de nível.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: CHAR-001, DATA-005.
- Bloqueia: CORE-002, DATA-006, QA-001.
- Escopo: Implementar progressão de nível/XP e resolução de escolhas, atualização de recursos/PV/capacidades; opções posteriores ficam delimitadas.
- Arquivos próprios: `src/domain/character/progression/**`; `src/features/character/progression/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/personagem/progressao.md`; `docs/criacao/regras/multiclasses.md`; `src/domain/contracts/**`; `src/data/progression/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Prévia lista ganhos e escolhas; commit único após resolução; valores não sobrescrevem recursos atuais sem política; opções não suportadas não aparecem como prontas.
- Testes: Limiares XP, níveis consecutivos, PV por método, troca/adição de escolhas, tentativa de salto sem decisões e rollback de falha.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CORE-002, DATA-006, QA-001. Passo principal: 08.

## SPELL-001 — Catálogo de magias e acesso

- ID: `SPELL-001`
- Título: Catálogo de magias e acesso.
- Status: `IN_PROGRESS` — execução Luna iniciada após DATA-002 aceitar o pack publicado.
- Responsável: `/root/build_spell_content`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Reserva/heartbeat: Luna reservada em `2026-09-11T18:05:00-04:00`.
- Prioridade: P1.
- Dependências: DATA-002.
- Bloqueia: CHAR-001, SPELL-002, COMP-001.
- Escopo: Codificar dados estruturados de magias/truques, listas por classe e referências conforme fonte; conteúdo narrativo integral fora do requisito.
- Arquivos próprios: `src/data/spells/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/magia/schema-magia.md`; `docs/criacao/magia/classes/**`; `docs/criacao/magia/truques.md`; `src/domain/contracts/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: IDs, nível/escola/componentes/tempo/alcance/duração/concentração/ritual e fonte completos ou explicitamente pendentes; conhecido/preparado não guardado na definição.
- Testes: Validação do schema, links de classe, componentes com custo/consumo, nível zero, concentração/ritual e fontes ausentes.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CHAR-001, SPELL-002, COMP-001. Passo principal: 10.

## ITEM-001 — Catálogo de equipamentos

- ID: `ITEM-001`
- Título: Catálogo de equipamentos.
- Status: `DONE` — catálogo Luna aceito: 4 testes focais e typecheck passaram; wiring delegado ao owner DATA-002.
- Responsável: `/root/build_equipment_content`.
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; Claude Code indisponível.
- Reserva/heartbeat: Luna reservada em `2026-09-11T17:41:00-04:00`.
- Prioridade: P1.
- Dependências: DATA-002.
- Bloqueia: CHAR-001, ITEM-002, COMP-001.
- Escopo: Codificar armas, armaduras, escudos, ferramentas e itens com propriedades, peso/valor e fontes; quantidades pertencem ao inventário.
- Arquivos próprios: `src/data/equipment/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/equipamento/README.md`; `docs/criacao/equipamento/armas.md`; `docs/criacao/equipamento/armaduras.md`; `docs/criacao/equipamento/ferramentas.md`; `src/domain/contracts/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Propriedades de armas e fórmulas de armadura são dados tipados; escudo separado; unidades/moedas explícitas; itens não existem como estados globais mutáveis.
- Testes: IDs/propriedades válidas, unidade de peso, valor monetário, referência de proficiência e fórmula de armadura.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CHAR-001, ITEM-002, COMP-001. Passo principal: 11.

## ITEM-002 — Domínio de inventário e equipamento

- ID: `ITEM-002`
- Título: Domínio de inventário e equipamento.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: RULE-001, ITEM-001.
- Bloqueia: RULE-002, UI-004, QA-001.
- Escopo: Implementar instâncias, quantidade, moedas, equipamento ativo e cálculo de impacto no personagem; regras opcionais explicitamente configuradas.
- Arquivos próprios: `src/domain/inventory/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/equipamento/inventario.md`; `src/data/equipment/**`; `src/domain/contracts/**`; `src/domain/rules/derived/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Equipar/desequipar não muta definição; evita quantidade negativa; CA/propriedades/proficiência recalculadas por regras; carga variante só quando habilitada.
- Testes: Transferência/remoção do item equipado, quantidades fracionárias inválidas, moedas, armadura/escudo e regra opcional desligada.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: RULE-002, UI-004, QA-001. Passo principal: 11.

## RULE-002 — Combate, condições, descanso e morte

- ID: `RULE-002`
- Título: Combate, condições, descanso e morte.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: RULE-001, ITEM-002, DATA-005.
- Bloqueia: SPELL-002, UI-003, COMP-001, QA-001.
- Escopo: Implementar transições puras para ataque/dano/cura, temporários, resistências, condições, concentração sob dano, morte e descansos; nenhuma resolução automática de alvo desconhecido.
- Arquivos próprios: `src/domain/rules/combat/**`; `src/domain/rules/conditions/**`; `src/domain/rules/rest/**`; `src/data/conditions/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/regras/**`; `docs/criacao/magia/concentracao.md`; `src/domain/contracts/**`; `src/domain/inventory/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: RuleResult descreve efeitos e fontes; dano/cura/0 PV e descanso são atômicos; concentração produz solicitação de teste/efeito conforme contrato; condições persistem por instância.
- Testes: Casos de dano/resistência/temporários, crítico, 0 PV, morte/estabilização, repetição de comando, descanso curto/longo e condições sobrepostas.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: SPELL-002, UI-003, COMP-001, QA-001. Passo principal: 09.

## SPELL-002 — Conjuração e recursos mágicos

- ID: `SPELL-002`
- Título: Conjuração e recursos mágicos.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: RULE-001, RULE-002, SPELL-001, DATA-005.
- Bloqueia: UI-003, QA-001.
- Escopo: Implementar acesso/preparação, slots, Pact Magic, ritual, componentes e concentração; escalar efeitos só conforme fonte suportada.
- Arquivos próprios: `src/domain/spells/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/magia/**`; `src/data/spells/**`; `src/domain/contracts/**`; `src/data/classes/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Origem de conjuração e pool de recursos explícitos; truque/ritual não consome slot indevido; cancelar/substituir concentração e falhar componente não perde recurso; regra pendente retorna indisponível.
- Testes: Preparado/conhecido, slot esgotado, nível superior, componentes consumidos, ritual por classe, Pact Magic e concentração substituída.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: UI-003, QA-001. Passo principal: 10.

## UI-003 — Página Ações e execução de capacidades

- ID: `UI-003`
- Título: Página Ações e execução de capacidades.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: UI-002, RULE-002, SPELL-002, STATE-001.
- Bloqueia: CORE-002.
- Escopo: Construir ataques, magia, recursos, itens utilizáveis, descanso e concentração como capacidades interativas; custo/efeito antes de confirmar.
- Arquivos próprios: `src/features/actions/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/interface/pagina-acoes.md`; `src/domain/contracts/**`; `src/application/character/**`; `src/components/ui/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Cada capacidade tem operações elegíveis, motivos de bloqueio e referência; clique duplo não duplica gasto; cancelamento preserva estado; origem mágica/slot explícitos.
- Testes: Ataque e dano separados, conjuração com substituição, recurso 0, descanso cancelado, falha commit, trocas de personagem e formas não suportadas.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CORE-002. Passo principal: 09.

## UI-004 — Interface de inventário

- ID: `UI-004`
- Título: Interface de inventário.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: ITEM-002, CHAR-002.
- Bloqueia: CORE-002.
- Escopo: Gerenciar lista/tabela, quantidade, moedas e equipamento por instância, com efeitos explicados.
- Arquivos próprios: `src/features/inventory/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/interface/pagina-personagem.md`; `docs/criacao/equipamento/inventario.md`; `src/domain/inventory/**`; `src/components/ui/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Operações equivalentes em mobile/desktop; item equipado sempre identificado; remover equipado mostra efeito; peso/valor exibem unidade e regra ativa.
- Testes: Quantidade inválida, equipar e CA recalculada, ordenação preservando IDs, teclado, estado vazio e erro de gravação.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CORE-002. Passo principal: 11.

## MAP-001 — Mapas, anexos e marcadores

- ID: `MAP-001`
- Título: Mapas, anexos e marcadores.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: UI-002, STATE-001.
- Bloqueia: CORE-002, DATA-006.
- Escopo: Criar mapa local por imagem, pan/zoom, lista alternativa, locais/pins e posição opcional; dados por ports de campanha/anexos.
- Arquivos próprios: `src/features/journey/map/**`; `src/domain/campaign/maps/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/interface/mapa.md`; `src/domain/contracts/**`; `src/application/campaign/**`; `src/components/ui/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Coordenadas normalizadas independem do zoom; anexos validam tamanho/tipo; marker não apaga nota implicitamente; sem VTT/multiplayer.
- Testes: Round trip de marcador, resize, teclado, anexo ausente/grande/quota e consistência metadado+imagem.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CORE-002, DATA-006. Passo principal: 12.

## JOUR-001 — Campanha, diário, missões e NPCs

- ID: `JOUR-001`
- Título: Campanha, diário, missões e NPCs.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: UI-002, STATE-001.
- Bloqueia: CORE-002, DATA-006.
- Escopo: Criar campanha local, registros de sessão, notas, objetivos/NPCs e vínculos a locais; editor com draft e autosave.
- Arquivos próprios: `src/features/journey/journal/**`; `src/features/journey/campaign/**`; `src/domain/campaign/journal/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/interface/pagina-jornada.md`; `src/domain/contracts/**`; `src/application/campaign/**`; `src/components/ui/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Notas e campanha restauram offline; texto não executa HTML; objetivo concluído não concede XP; apagar campanha explicita alcance e backup.
- Testes: Edição/reload, vínculos ausentes, troca de campanha com draft, exclusão cancelada, concorrência e conteúdo malformado.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CORE-002, DATA-006. Passo principal: 12.

## COMP-001 — Compêndio local e favoritos

- ID: `COMP-001`
- Título: Compêndio local e favoritos.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: UI-002, RULE-002, DATA-004, DATA-005, SPELL-001, ITEM-001.
- Bloqueia: CORE-002, PWA-001.
- Escopo: Construir índice/busca por nome/categoria/tags e detalhes referenciados, com carga por categoria e favoritos por IDs.
- Arquivos próprios: `src/features/compendium/**`; `src/application/compendium/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/interface/pagina-compendio.md`; `src/data/rulepacks/**`; `src/domain/contracts/**`; `src/components/ui/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Categorias planejadas navegáveis; alias Regras mesmo destino; busca local determinística; detalhe mostra fonte; favorito não altera definição nem concede habilidade.
- Testes: Acentos/caixa/tags, retorno preservando filtros, favorito órfão, categoria pendente, offline e carga inicial sem corpus integral.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: CORE-002, PWA-001. Passo principal: 13.

## CORE-002 — Integrar features e serviços reais

- ID: `CORE-002`
- Título: Integrar features e serviços reais.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: DICE-002, CHAR-003, CHAR-004, UI-003, UI-004, MAP-001, JOUR-001, COMP-001.
- Bloqueia: PWA-001, UI-005, QA-002.
- Escopo: Conectar factories/exports públicos das features aos serviços e rotas, sem editar interior de módulos alheios; remover substitutos de integração.
- Arquivos próprios: `src/app/feature-registry.ts`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `src/app/bootstrap.tsx`; `src/app/router.tsx`; `src/application/ports/**`; `src/domain/contracts/**`; `src/features/**`; `docs/criacao/swarm/HANDOFF.md`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Quatro destinos exercitam engines e repositories reais; fixtures/mocks não mascaram ausência de persistência ou custo; fronteiras de importação respeitadas.
- Testes: Smoke integrado criar→rolar→agir→nota→recarregar e checagem dos imports; regressões encaminhadas ao dono do módulo.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: PWA-001, UI-005, QA-002. Passo principal: 18.

## DATA-006 — Backup, migrações e recuperação completa

- ID: `DATA-006`
- Título: Backup, migrações e recuperação completa.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: DATA-003, CHAR-003, CHAR-004, JOUR-001, MAP-001.
- Bloqueia: PWA-001, QA-002.
- Escopo: Completar import/export versionados de personagem/campanha com anexos, validação, migrações, reset seletivo/completo e recuperação de corrupção.
- Arquivos próprios: `src/infrastructure/persistence/migrations/**`; `src/application/transfer/**`; `src/features/data-management/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/08-PERSISTENCIA-LOCAL.md`; `docs/criacao/dados/migracoes.md`; `src/application/ports/**`; `src/domain/contracts/**`; `src/infrastructure/persistence/indexeddb/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Exportação→importação preserva identidade/vínculos conforme política; versão futura rejeitada sem apagar dados; import preview define conflito antes do commit; reset próprio preserva outros agregados.
- Testes: Round trip real com anexos, migrações encadeadas, JSON inválido/malicioso, IDs colidentes, quota, corrupção, falha atômica e backup manual.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: PWA-001, QA-002. Passo principal: 14.

## PWA-001 — Instalação, cache e atualização offline

- ID: `PWA-001`
- Título: Instalação, cache e atualização offline.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: CORE-002, DATA-006, COMP-001.
- Bloqueia: UI-005, QA-003.
- Escopo: Adicionar manifest/ícones e service worker versionado, shell/corpus necessário offline, fallback e atualização segura sem reload forçado.
- Arquivos próprios: `src/infrastructure/pwa/**`; `public/manifest.webmanifest`; `public/icons/**`; `public/offline.html`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/07-PWA-OFFLINE.md`; `src/app/bootstrap.tsx`; `vite.config.ts`; `src/application/transfer/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Instalação orientada por plataforma; rotas profundas e sessão funcionam offline após preparo; atualização espera operação/salvamento; dados IndexedDB não são apagados por limpeza de cache.
- Testes: Primeira instalação, relaunch sem rede, asset antigo, atualização com draft, falta de storage, Safari/iOS e Android/desktop em matriz documentada.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: UI-005, QA-003. Passo principal: 15.

## UI-005 — Auditoria responsiva e orçamento visual

- ID: `UI-005`
- Título: Auditoria responsiva e orçamento visual.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: CORE-002, PWA-001.
- Bloqueia: A11Y-001.
- Escopo: Provar layouts mobile/tablet/desktop e documentar correções por proprietário; esta tarefa não edita CSS/feature alheia.
- Arquivos próprios: `tests/responsive/**`; `docs/implementacao/responsividade/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/06-RESPONSIVIDADE.md`; `docs/criacao/04-WIREFRAMES.md`; `src/components/layout/**`; `src/features/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: 320–1440 CSS px, paisagem e zoom sem controle encoberto; quatro destinos invariáveis; dados/mapa funcionam sem hover; correções aceitas pelos owners.
- Testes: Cenários visuais e interativos: header/FAB/safe area, textos longos, teclado virtual, tabelas e alteração de breakpoint durante edição.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: A11Y-001. Passo principal: 16.

## A11Y-001 — Auditoria de acessibilidade

- ID: `A11Y-001`
- Título: Auditoria de acessibilidade.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: UI-005.
- Bloqueia: QA-004.
- Escopo: Executar plano AA e acessibilidade manual, registrando correções por owner; relatórios/testes exclusivos.
- Arquivos próprios: `tests/accessibility/**`; `docs/implementacao/acessibilidade/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/13-ACESSIBILIDADE.md`; `src/components/ui/**`; `src/features/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Teclado/foco/leitor de tela/contraste/zoom/reduced motion provados nos fluxos críticos; limitações explicitadas; sem declaração baseada só em scanner.
- Testes: Percurso completo sem mouse, diálogos/retorno de foco, dados anunciados uma vez, mapa por lista, 200/400% e contrastes reais.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: QA-004. Passo principal: 17.

## QA-001 — Prova determinística de regras

- ID: `QA-001`
- Título: Prova determinística de regras.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: RULE-002, SPELL-002, ITEM-002, CHAR-004.
- Bloqueia: QA-004.
- Escopo: Construir suíte transversal de cenários rastreáveis à fonte para engine, dados, magia, progressão e equipamento.
- Arquivos próprios: `tests/rules/**`; `tests/fixtures/rules/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/12-TESTES.md`; `docs/criacao/regras/**`; `docs/criacao/magia/**`; `src/domain/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Casos de referência independentes da implementação com RNG controlado; pendências não viram expectativas inventadas; suite demonstra fórmulas, exceções e interações.
- Testes: Limites e combinações de proficiência/CA, dano/concentração/morte, descanso/Pact Magic, slots/ritual e nível/equipamento.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: QA-004. Passo principal: 18.

## QA-002 — Integração de sessão e persistência

- ID: `QA-002`
- Título: Integração de sessão e persistência.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: CORE-002, DATA-006.
- Bloqueia: QA-003.
- Escopo: Provar fluxos completos com banco real de teste e múltiplas abas; capturar evidência de atomicidade e recuperação.
- Arquivos próprios: `tests/integration/**`; `tests/fixtures/backups/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/12-TESTES.md`; `docs/criacao/08-PERSISTENCIA-LOCAL.md`; `src/app/**`; `src/application/**`; `src/infrastructure/persistence/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Sessão persiste após recarga; conflitos/quota não perdem original; export/import campanha inclui anexos; nenhum mock conta como prova ponta a ponta.
- Testes: Criar, dano/cura, rolar, conjurar, inventário, nota/mapa, reload, duas abas, migração falha e reset seletivo.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: QA-003. Passo principal: 18.

## QA-003 — Prova de offline e atualização

- ID: `QA-003`
- Título: Prova de offline e atualização.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: PWA-001, QA-002.
- Bloqueia: QA-004.
- Escopo: Validar PWA no artefato de produção, eventos de atualização e recuperação com rede desligada.
- Arquivos próprios: `tests/offline/**`; `docs/implementacao/offline/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/07-PWA-OFFLINE.md`; `src/infrastructure/pwa/**`; `tests/integration/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Shell e conteúdo necessário disponíveis offline; recarga profunda funciona; nova versão não apaga storage/draft; versões/plataformas da prova registradas.
- Testes: Cold/warm start, airplane mode, asset desatualizado, ativação adiada, falha cache e sessão durante atualização.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: QA-004. Passo principal: 18.

## QA-004 — Aceite final integrado

- ID: `QA-004`
- Título: Aceite final integrado.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P0.
- Dependências: QA-001, QA-003, A11Y-001.
- Bloqueia: REL-001.
- Escopo: Consolidar matriz de aceite, riscos, performance em dispositivo representativo e regressões remanescentes; sem editar funcionalidades.
- Arquivos próprios: `docs/implementacao/qa/**`; `tests/acceptance/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/swarm/QA.md`; `docs/criacao/swarm/CHECKPOINTS.md`; `tests/rules/**`; `tests/integration/**`; `tests/offline/**`; `tests/accessibility/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Todos gates obrigatórios têm prova e revisão; nenhuma pendência bloqueadora marcada resolvida por mock; features limitadas explicitamente expostas; ausência de backend confirmada.
- Testes: Roteiro de sessão real, orçamento de carga/compêndio/imagem, uso de memória e regressões dos achados corrigidos.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: REL-001. Passo principal: 18.

## REL-001 — Polimento documental e entrega futura

- ID: `REL-001`
- Título: Polimento documental e entrega futura.
- Status: `TODO` — implementação não iniciada.
- Prioridade: P1.
- Dependências: QA-004.
- Bloqueia: nenhuma; encerra entrega.
- Escopo: Consolidar instruções de uso/backup/instalação, release notes e pendências; ajustes de UI/código retornam ao owner e gate afetado.
- Arquivos próprios: `docs/implementacao/entrega/**`.
- Arquivos somente leitura: `docs/criacao/00-START-HERE.md`; `docs/criacao/09-MODELO-DE-DADOS.md`; `docs/criacao/10-RULES-ENGINE.md`; `docs/criacao/11-DICE-ENGINE.md`; `docs/criacao/dados/schemas.md`; `docs/criacao/swarm/AGENT-PROTOCOL.md`; `docs/criacao/02-ESCOPO.md`; `docs/implementacao/qa/**`; `docs/implementacao/offline/**`; `docs/implementacao/acessibilidade/**`.
- Arquivos proibidos: todo caminho fora dos arquivos próprios, inclusive documentos canônicos de contratos, outras features, catálogos e configurações; mudança cruzada via handoff. O agente não altera este registro diretamente: coordenador é o único escritor do status.
- Critério de aceite: Entrega descreve versão/pack, limites, backup manual e prova; nenhum item planejado é anunciado como implementado; correção tardia reabre validação afetada.
- Testes: Checklist editorial de comportamento demonstrado, caminhos de recuperação e correspondência entre release notes e evidências.
- Handoff: entregar exports públicos/contratos usados, arquivos tocados, casos provados com comandos/resultados, limitações e pendências ao coordenador; consumidores destravados somente após revisão e `DONE`: entrega final. Passo principal: 19.
