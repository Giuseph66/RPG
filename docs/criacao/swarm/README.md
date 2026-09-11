# Swarm — painel de implementação

**IMPLEMENTAÇÃO DO SOFTWARE NÃO INICIADA.** Existe documentação de arquitetura, fontes, contratos conceituais, UX e plano; não há features implementadas por este trabalho. 36 tarefas futuras, 20 passos. Nenhuma tarefa `IN_PROGRESS`, `REVIEW` ou `DONE`. Somente **CORE-001 está READY**; as outras 35 estão TODO por dependências ainda não concluídas.

## Leitura e coordenação

Todo agente começa por [00-START-HERE](../00-START-HERE.md) e [AGENT-PROTOCOL](AGENT-PROTOCOL.md). [TASKS](TASKS.md) é o registro canônico; [OWNERSHIP](OWNERSHIP.md) define limites; [DEPENDENCIES](DEPENDENCIES.md) mostra DAG e capacidade real; [CHECKPOINTS](CHECKPOINTS.md) define provas; [HANDOFF](HANDOFF.md) padroniza entrega; [DECISIONS](DECISIONS.md) controla contratos; [RISKS](RISKS.md) rastreia riscos e [QA](QA.md) define aceite.

Este painel responde o que existe/falta/pode começar. Quando a implementação começar, somente o coordenador atualiza TASKS e este painel juntos após revisão, preservando IDs. Os checkboxes abaixo significam implementação concluída, portanto todos permanecem vazios nesta entrega documental. Espera normal por dependência aparece TODO; impedimento externo concreto vira BLOCKED com motivo/owner.

## Fundação, contratos e estado

- [ ] **CORE-001** — Fundação e ferramentas planejadas · `READY` · depende de: nenhuma.
- [ ] **DATA-001** — Congelar contratos compartilhados · `TODO` · depende de: CORE-001.
- [ ] **DATA-002** — Loader e núcleo do rule pack · `TODO` · depende de: DATA-001.
- [ ] **DATA-003** — Repositories locais e transações base · `TODO` · depende de: DATA-001.
- [ ] **STATE-001** — Estado local e serviços de aplicação · `TODO` · depende de: DATA-001, DATA-003.
- [ ] **CORE-002** — Integrar features e serviços reais · `TODO` · depende de: DICE-002, CHAR-003, CHAR-004, UI-003, UI-004, MAP-001, JOUR-001, COMP-001.

## Interface e dados de mesa

- [ ] **UI-001** — Tokens e componentes fundamentais · `TODO` · depende de: CORE-001.
- [ ] **UI-002** — Shell, navegação e header · `TODO` · depende de: UI-001, STATE-001.
- [ ] **DICE-001** — Engine de dados pura · `TODO` · depende de: DATA-001.
- [ ] **DICE-002** — Overlay e histórico de dados · `TODO` · depende de: DICE-001, UI-002.
- [ ] **UI-003** — Página Ações e execução de capacidades · `TODO` · depende de: UI-002, RULE-002, SPELL-002, STATE-001.
- [ ] **UI-004** — Interface de inventário · `TODO` · depende de: ITEM-002, CHAR-002.

## Personagem e conteúdo

- [ ] **DATA-004** — Raças e sub-raças do material · `TODO` · depende de: DATA-002.
- [ ] **DATA-005** — Classes, subclasses, antecedentes e talentos · `TODO` · depende de: DATA-002.
- [ ] **CHAR-001** — Domínio de criação e validação · `TODO` · depende de: RULE-001, DATA-004, DATA-005, ITEM-001, SPELL-001.
- [ ] **CHAR-002** — Ficha rápida e expandida · `TODO` · depende de: UI-002, RULE-001, STATE-001.
- [ ] **CHAR-003** — Wizard de criação e seleção · `TODO` · depende de: CHAR-001, CHAR-002.
- [ ] **CHAR-004** — Progressão e escolhas de nível · `TODO` · depende de: CHAR-001, DATA-005.
- [ ] **SPELL-001** — Catálogo de magias e acesso · `TODO` · depende de: DATA-002.
- [ ] **ITEM-001** — Catálogo de equipamentos · `TODO` · depende de: DATA-002.

## Regras e magia

- [ ] **RULE-001** — Rules Engine e valores derivados · `TODO` · depende de: DATA-002, DICE-001.
- [ ] **RULE-002** — Combate, condições, descanso e morte · `TODO` · depende de: RULE-001, ITEM-002, DATA-005.
- [ ] **SPELL-002** — Conjuração e recursos mágicos · `TODO` · depende de: RULE-001, RULE-002, SPELL-001, DATA-005.
- [ ] **ITEM-002** — Domínio de inventário e equipamento · `TODO` · depende de: RULE-001, ITEM-001.

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

## Próximo movimento autorizado no futuro

A conclusão documental não autoriza iniciar software. Em uma fase futura explicitamente autorizada: reservar CORE-001, executar fundação e apresentar prova. A partir do seu aceite, contratos e design podem avançar em paralelo. IndexedDB base inicia após contratos, antes das fichas; passo 14 termina backup/migrações/recuperação. Não seguir numeração de passos como cronograma linear.
