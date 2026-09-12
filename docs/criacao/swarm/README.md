# Swarm — painel de implementação

**COMPLETUDE DE PRODUTO REABERTA.** A cobertura do Compêndio permanece aceita, mas foram confirmadas superfícies ainda desconectadas, comandos sem resolvedor, exclusão não atômica e falta de divisão por rota. `CORE-002` e `QA-004` estão `IN_PROGRESS`; `REL-001` aguarda o novo aceite.

## Leitura e coordenação

Todo agente começa por [00-START-HERE](../00-START-HERE.md) e [AGENT-PROTOCOL](AGENT-PROTOCOL.md). [TASKS](TASKS.md) é o registro canônico; [OWNERSHIP](OWNERSHIP.md) define limites; [DEPENDENCIES](DEPENDENCIES.md) mostra DAG e capacidade real; [CHECKPOINTS](CHECKPOINTS.md) define provas; [HANDOFF](HANDOFF.md) padroniza entrega; [DECISIONS](DECISIONS.md) controla contratos; [RISKS](RISKS.md) rastreia riscos e [QA](QA.md) define aceite.

Usuário → coordenador `gpt-5.6-sol`/`high` → até 3 subagentes Codex `gpt-5.6-luna` e Claude Code `claude-sonnet` via MCP. Coordenador só orquestra; produto é sempre delegado ao owner. Profundidade é 1: subagentes não delegam. Para descoberta estrutural, Codebase Memory é primeira fonte; busca textual é fallback. Sol/Astra nunca são modelos de subagente.

Claude Code via MCP está disponível na lane `claude-sonnet`; por orientação atual do usuário, as delegações nativas usam exclusivamente Luna. Ownership, DAG, handoff e limite de três agentes continuam obrigatórios.

Este painel responde o que existe/falta/pode começar. Somente o coordenador atualiza TASKS e este painel juntos após revisão, preservando IDs; suas edições limitam-se aos metadados de coordenação/integração, nunca ao produto do owner. Checkbox marcado significa implementação aceita. Espera normal por dependência aparece TODO; impedimento externo concreto vira BLOCKED com motivo/owner.

## Fundação, contratos e estado

- [x] **CORE-001** — Fundação e ferramentas planejadas · `DONE` · gates 3/3 · depende de: nenhuma.
- [x] **DATA-001** — Congelar contratos compartilhados · `DONE` · CAS e contexto transacional aceitos.
- [x] **DATA-002** — Loader e núcleo do rule pack · `DONE` · catálogos publicados e validados.
- [x] **DATA-003** — Repositories locais e transações base · `DONE` · IndexedDB, CAS e recovery aceitos.
- [x] **STATE-001** — Estado local e serviços de aplicação · `DONE` · stores e serviços aceitos.
- [ ] **CORE-002** — Integrar features e serviços reais · `IN_PROGRESS` · montar seleção, diário, backup/importação e dividir rotas.

## Interface e dados de mesa

- [x] **UI-001** — Tokens e componentes fundamentais · `DONE` · validação de UI, estilos e typecheck aceitos.
- [x] **UI-002** — Shell, navegação e header · `DONE` · router, shell e prova desktop/mobile aceitos.
- [x] **DICE-001** — Engine de dados pura · `DONE` · validação focalizada aceita.
- [x] **DICE-002** — Overlay e histórico de dados · `DONE` · rolagem e histórico validados no navegador.
- [x] **UI-003** — Página Ações e execução de capacidades · `DONE` · execução real aceita.
- [x] **UI-004** — Interface de inventário · `DONE` · comandos de inventário aceitos.

## Personagem e conteúdo

- [x] **DATA-004** — Raças e sub-raças do material · `DONE` · catálogo e validação aceitos.
- [x] **DATA-005** — Classes, subclasses, antecedentes e talentos · `DONE` · catálogo aceito; wiring em DATA-002.
- [x] **CHAR-001** — Domínio de criação e validação · `DONE` · domínio aceito.
- [x] **CHAR-002** — Ficha rápida e expandida · `DONE` · ficha aceita.
- [x] **CHAR-003** — Wizard de criação e seleção · `DONE` · criação conectada aceita.
- [x] **CHAR-004** — Progressão e escolhas de nível · `DONE` · progressão aceita.
- [x] **SPELL-001** — Catálogo de magias e acesso · `DONE` · catálogo aceito.
- [x] **ITEM-001** — Catálogo de equipamentos · `DONE` · catálogo aceito; wiring em DATA-002.

## Regras e magia

- [x] **RULE-001** — Rules Engine e valores derivados · `DONE` · typecheck e testes focais aceitos.
- [x] **RULE-002** — Combate, condições, descanso e morte · `DONE` · domínio aceito.
- [x] **SPELL-002** — Conjuração e recursos mágicos · `DONE` · domínio aceito.
- [x] **ITEM-002** — Domínio de inventário e equipamento · `DONE` · domínio aceito.

## Jornada e consulta

- [x] **MAP-001** — Mapas, anexos e marcadores · `DONE` · interface aceita.
- [x] **JOUR-001** — Campanha, diário, missões e NPCs · `DONE` · interface aceita.
- [x] **COMP-001** — Compêndio local e favoritos · `DONE` · nove categorias publicadas e revalidadas.

## Persistência, PWA e qualidade

- [x] **DATA-006** — Backup, migrações e recuperação completa · `DONE` · recuperação aceita.
- [x] **PWA-001** — Instalação, cache e atualização offline · `DONE` · prova offline aceita.
- [x] **UI-005** — Auditoria responsiva e orçamento visual · `DONE` · matriz aceita.
- [x] **A11Y-001** — Auditoria de acessibilidade · `DONE` · R3-03/R4-01 aceitos na rodada 5.
- [x] **QA-001** — Prova determinística de regras · `DONE` · cenários aceitos.
- [x] **QA-002** — Integração de sessão e persistência · `DONE` · integração aceita.
- [x] **QA-003** — Prova de offline e atualização · `DONE` · prova offline aceita.
- [ ] **QA-004** — Aceite final integrado · `IN_PROGRESS` · reaceite das superfícies, comandos, transação e divisão de bundle.
- [ ] **REL-001** — Polimento documental e entrega futura · `TODO` · depende do novo aceite integrado.

## Próximo movimento

Concluir as quatro frentes reabertas e repetir o aceite integrado. Conteúdo parcial da fonte, decisões de mesa pendentes e provas que requerem dispositivos físicos permanecem explicitamente rastreados; não serão simulados como concluídos.
