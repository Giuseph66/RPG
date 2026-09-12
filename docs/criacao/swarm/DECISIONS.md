# Decisões de coordenação

ADRs arquiteturais vivem em [decisoes](../decisoes/README.md); lacunas de fonte em [PENDENCIAS](../decisoes/PENDENCIAS.md). Este documento governa mudança, não cria segunda fonte arquitetural.

## Baseline

| Decisão | Contrato | Consequência |
| --- | --- | --- |
| Software em implementação | Fundação e primeiras ondas existem no workspace; o registro canônico é TASKS. | Preservar o trabalho não commitado e avançar somente pelo DAG, ownership e aceite. |
| Stack planejada | React + TypeScript + Vite; React Router. | Dependências somente na fase autorizada. |
| Estado local | External store por agregado + useSyncExternalStore; Context para injeção/UI pequena. | Sem Zustand obrigatório, sem mega-store, formulários locais. |
| Local-first | Ports e IndexedDB; localStorage só preferências pequenas. | UI independente de adapter/backend futuro. |
| Regras e dados | Engine pura; catálogo imutável; ID estável/sourceRef/versionamento. | Não derivar regras em componentes nem alterar definição por personagem. |
| Fonte | Pack `phb-ptbr-local-2017`, sem substituição por 2024/suplementos. | Divergências do arquivo fornecido viram pendências por capacidade. |
| Navegação | Quatro destinos + Dados global. | Nenhum quinto destino Dados ou duplicação Regras/Compêndio. |
| Contratos primeiro | DATA-001 em 09/10/11/dados-schemas como baseline. | Consumers importam; alterações revisadas antes da implementação dependente. |
| Ordem real | DAG de tasks, não números dos passos. | DATA-003 cedo; DATA-006 hardening do passo 14. |
| Coordenação | Usuário fala só com coordenador `gpt-5.6-sol`/`high`; coordenador só orquestra. | Produto sempre delegado; coordenador altera somente metadados de coordenação/integração. |
| Lanes Codex | Máximo 3 subagentes simultâneos, profundidade 1; somente Luna ou Terra. | Sol/Astra proibidos como subagentes; coordenador escolhe modelo/esforço por risco e complexidade. |
| Descoberta estrutural | Codebase Memory primeiro. | Grafo para arquitetura/símbolos/chamadas; texto só para literais/configuração ou fallback. |
| Lane Claude | Claude MCP é prioritário para codificação: `claude-sonnet`: Sonnet/medium para simples/médio; `claude-opus`: Opus/xhigh para muito complexo/crítico. | Luna/Terra só em fallback por crédito/limite ausente ou incapacidade técnica, com motivo/evidência no handoff; fallback de modelo permanece na mesma lane; somente essas famílias Claude. |
| Transição de coordenação (2026-09-11 13:40) | Limite do coordenador Codex `gpt-5.6-sol` expirou após CORE-001 `DONE`; usuário autorizou Claude Code como coordenador temporário: Claude Opus 5 / `high` orquestra, subagentes Claude Sonnet 5 via Agent tool (máx. 3 simultâneos, profundidade 1). | Mesmo DAG, ownership, handoff e QA; lanes Codex/MCP inativas nesta janela. Reservas DATA-001/UI-001 de `13:19` expiradas sem diff foram re-reservadas. Ao retorno do coordenador Codex, reavaliar com o usuário; registro de status continua exclusivo do coordenador ativo. |
| Seleção Claude | Cópia estável `mcp-agents` 0.30.0 seleciona lanes por ambiente e é tentada primeiro para codificação. | Comprovar identidade/modelo efetivo antes do uso; sem prova, lane Claude não inicia; registrar fallback Codex quando aplicável. |
| Retomada após interrupção (2026-09-11 16:55) | Codebase Memory reindexou 410 arquivos/3.093 nós/5.517 relações; Claude Code está indisponível; o usuário restringiu novas delegações a Luna. | Preservar todo diff; encerrar reservas Claude órfãs; reabrir produtores com regressões antes dos consumidores; usar somente Luna até nova orientação. |
| Handoff UI-002 → CORE-001 (2026-09-11 17:45) | UI-002 entregou router e shell, mas `bootstrap.tsx` pertence a CORE-001. | Um worker Luna do owner CORE-001 integra somente provider/adapters/router no bootstrap; UI-002 fica em REVIEW até testes de rota renderizada e verificação visual. |
| Handoff DICE-002 → UI-002 → CORE-001 (2026-09-11 18:03) | O overlay pertence a DICE-002, o host/header a UI-002 e a composição de serviços a CORE-001. | Três handoffs mínimos: UI-002 recebe controller/host; CORE-001 cria controller com serviços/RNG/clock/IDs; teste visual prova o botão global sem duplicar RNG. |
| Limite da lane Luna (2026-09-11 18:17) | O worker de SPELL-001 atingiu limite antes de escrever arquivos; inspeção confirmou ausência de diff em `src/data/spells/**`. | Reserva encerrada e tarefa devolvida a TODO. A entrega navegável/dados continua válida; não substituir por outro modelo enquanto o override do usuário exigir Luna. |
| Cobertura inicial de magias (2026-09-11 18:39) | `SPELL-001` registrou seis magias/truques com fonte e metadados estruturados. A fonte disponível não sustenta com segurança a transcrição completa nesta onda. | Publicar cobertura marcada como `partial`; consumidores devem exibir somente registros disponíveis e nunca inferir os faltantes. Reabrir DATA-002 apenas para indexar esse catálogo no rule pack. |

## Alteração de contrato

Abrir decisão com problema verificável, alternativas, opção recomendada, compatibilidade, owners afetados, critério de aceite e rollback. DATA-001 decide assinatura com coordenador; mudanças que alteram produto/fonte não são inferidas por agente. Versionar contrato/fixtures e notificar consumidores pelo registro. Aprovação de uma assinatura não significa software implementado. Uma pendência de fonte pode impedir um único talento/classe/efeito sem bloquear compêndio genérico ou dados avulsos.

## Arbitragem

Conflito de ownership: matriz vence até transferência explícita. Conflito livro/ficha: fonte mecânica prevalece e diferença fica documentada. Conflito entre docs: 00-START-HERE aponta o canônico, ADR registra resolução e links afetados são corrigidos. Decisão que ampliar escopo/dependências deve atualizar TASKS, DAG e passos na mesma revisão. Não usar comunicação privada como contrato permanente.

## Escolha de lane

Coordenador pondera impacto reversível, complexidade, criticidade de regra, quantidade de paths, dependências e necessidade de investigação. Para codificação, tenta primeiro `claude-sonnet` em Sonnet/medium ou `claude-opus` em Opus/xhigh. Luna/Terra só atendem fallback por crédito/limite ausente ou incapacidade técnica, com justificativa e evidência. Escolha, esforço, identidade efetiva e justificativa mínima entram na reserva e no handoff. Nenhuma lane ultrapassa o DAG, limite de três subagentes Codex, profundidade 1 ou ownership.
