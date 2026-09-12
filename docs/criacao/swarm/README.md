# Swarm — painel de implementação

**IMPLEMENTAÇÃO DO SOFTWARE INICIADA.** `CORE-001`, `CORE-002`, `DATA-001` a `DATA-006`, `DICE-001`, `DICE-002`, `ITEM-001`, `ITEM-002`, `RULE-001`, `RULE-002`, `SPELL-001`, `SPELL-002`, `UI-001` a `UI-005`, `CHAR-001` a `CHAR-004`, `COMP-001`, `MAP-001`, `JOUR-001`, `PWA-001`, `QA-001` a `QA-003`, `A11Y-001` e `STATE-001` estão `DONE`; `QA-004` está em execução com Luna.

## Leitura e coordenação

Todo agente começa por [00-START-HERE](../00-START-HERE.md) e [AGENT-PROTOCOL](AGENT-PROTOCOL.md). [TASKS](TASKS.md) é o registro canônico; [OWNERSHIP](OWNERSHIP.md) define limites; [DEPENDENCIES](DEPENDENCIES.md) mostra DAG e capacidade real; [CHECKPOINTS](CHECKPOINTS.md) define provas; [HANDOFF](HANDOFF.md) padroniza entrega; [DECISIONS](DECISIONS.md) controla contratos; [RISKS](RISKS.md) rastreia riscos e [QA](QA.md) define aceite.

Usuário → coordenador `gpt-5.6-sol`/`high` → até 3 subagentes Codex (`gpt-5.6-luna` ou `gpt-5.6-terra`) e, quando validado, Claude Code via MCP. Coordenador só orquestra; produto é sempre delegado ao owner. Profundidade é 1: subagentes não delegam. Para descoberta estrutural, Codebase Memory é primeira fonte; busca textual é fallback. Sol/Astra nunca são modelos de subagente.

Claude Code via MCP usa a cópia estável `mcp-agents` 0.30.0, mas está indisponível nesta retomada. Por orientação do usuário, toda nova delegação usa exclusivamente Luna até nova orientação. Ownership, DAG, handoff e limite de três agentes continuam obrigatórios.

Este painel responde o que existe/falta/pode começar. Somente o coordenador atualiza TASKS e este painel juntos após revisão, preservando IDs; suas edições limitam-se aos metadados de coordenação/integração, nunca ao produto do owner. Checkbox marcado significa implementação aceita. Espera normal por dependência aparece TODO; impedimento externo concreto vira BLOCKED com motivo/owner.

## Fundação, contratos e estado

- [x] **CORE-001** — Fundação e ferramentas planejadas · `DONE` · gates 3/3 · depende de: nenhuma.
- [x] **DATA-001** — Congelar contratos compartilhados · `DONE` · CAS e contexto transacional aceitos.
- [x] **DATA-002** — Loader e núcleo do rule pack · `DONE` · catálogos publicados e validados.
- [x] **DATA-003** — Repositories locais e transações base · `DONE` · IndexedDB, CAS e recovery aceitos.
- [x] **STATE-001** — Estado local e serviços de aplicação · `DONE` · stores e serviços aceitos.
- [ ] **CORE-002** — Integrar features e serviços reais · `TODO` · depende de: DICE-002, CHAR-003, CHAR-004, UI-003, UI-004, MAP-001, JOUR-001, COMP-001.

## Interface e dados de mesa

- [x] **UI-001** — Tokens e componentes fundamentais · `DONE` · validação de UI, estilos e typecheck aceitos.
- [x] **UI-002** — Shell, navegação e header · `DONE` · router, shell e prova desktop/mobile aceitos.
- [x] **DICE-001** — Engine de dados pura · `DONE` · validação focalizada aceita.
- [x] **DICE-002** — Overlay e histórico de dados · `DONE` · rolagem e histórico validados no navegador.
- [ ] **UI-003** — Página Ações e execução de capacidades · `TODO` · depende de: UI-002, RULE-002, SPELL-002, STATE-001.
- [ ] **UI-004** — Interface de inventário · `TODO` · depende de: ITEM-002, CHAR-002.

## Personagem e conteúdo

- [x] **DATA-004** — Raças e sub-raças do material · `DONE` · catálogo e validação aceitos.
- [x] **DATA-005** — Classes, subclasses, antecedentes e talentos · `DONE` · catálogo aceito; wiring em DATA-002.
- [ ] **CHAR-001** — Domínio de criação e validação · `TODO` · depende de: RULE-001, DATA-004, DATA-005, ITEM-001, SPELL-001.
- [ ] **CHAR-002** — Ficha rápida e expandida · `IN_PROGRESS` · Luna/high.
- [ ] **CHAR-003** — Wizard de criação e seleção · `TODO` · depende de: CHAR-001, CHAR-002.
- [ ] **CHAR-004** — Progressão e escolhas de nível · `TODO` · depende de: CHAR-001, DATA-005.
- [ ] **SPELL-001** — Catálogo de magias e acesso · `IN_PROGRESS` · nova tentativa Luna/high.
- [x] **ITEM-001** — Catálogo de equipamentos · `DONE` · catálogo aceito; wiring em DATA-002.

## Regras e magia

- [x] **RULE-001** — Rules Engine e valores derivados · `DONE` · typecheck e testes focais aceitos.
- [ ] **RULE-002** — Combate, condições, descanso e morte · `TODO` · depende de: RULE-001, ITEM-002, DATA-005.
- [ ] **SPELL-002** — Conjuração e recursos mágicos · `TODO` · depende de: RULE-001, RULE-002, SPELL-001, DATA-005.
- [ ] **ITEM-002** — Domínio de inventário e equipamento · `IN_PROGRESS` · Luna/high.

## Jornada e consulta

- [ ] **MAP-001** — Mapas, anexos e marcadores · `TODO` · depende de: UI-002, STATE-001.
- [ ] **JOUR-001** — Campanha, diário, missões e NPCs · `TODO` · depende de: UI-002, STATE-001.
- [ ] **COMP-001** — Compêndio local e favoritos · `TODO` · depende de: UI-002, RULE-002, DATA-004, DATA-005, SPELL-001, ITEM-001.

## Persistência, PWA e qualidade

- [ ] **DATA-006** — Backup, migrações e recuperação completa · `TODO` · depende de: DATA-003, CHAR-003, CHAR-004, JOUR-001, MAP-001.
- [ ] **PWA-001** — Instalação, cache e atualização offline · `TODO` · depende de: CORE-002, DATA-006, COMP-001.
- [ ] **UI-005** — Auditoria responsiva e orçamento visual · `TODO` · depende de: CORE-002, PWA-001.
- [ ] **A11Y-001** — Auditoria de acessibilidade · `TODO` · depende de: UI-005.
- [ ] **QA-001** — Prova determinística de regras · `TODO` · depende de: RULE-002, SPELL-002, ITEM-002, CHAR-004.
- [ ] **QA-002** — Integração de sessão e persistência · `TODO` · depende de: CORE-002, DATA-006.
- [ ] **QA-003** — Prova de offline e atualização · `TODO` · depende de: PWA-001, QA-002.
- [ ] **QA-004** — Aceite final integrado · `TODO` · depende de: QA-001, QA-003, A11Y-001.
- [ ] **REL-001** — Polimento documental e entrega futura · `TODO` · depende de: QA-004.

## Próximo movimento

Concluir DICE-001, DATA-003 e DATA-005. Após o aceite do Dice Engine, reservar RULE-001; depois o estado local e shell podem avançar rumo à primeira experiência utilizável.
