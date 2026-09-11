# Dependências e alocação

Fonte canônica: [TASKS](TASKS.md). Aresta A→B significa A deve estar DONE antes de B iniciar. Numeração dos 20 passos é leitura temática; não impõe ordem linear. DATA-001 estabelece contratos cedo; DATA-003 entrega persistência base antes do estado/shell/ficha; DATA-006 conclui a persistência. DICE-001 depende só do contrato e pode avançar cedo, sem UI ou banco.

## DAG completo

```mermaid
flowchart TD
  CORE_001["CORE-001: Fundação e ferramentas planejadas"]
  DATA_001["DATA-001: Congelar contratos compartilhados"]
  UI_001["UI-001: Tokens e componentes fundamentais"]
  DATA_002["DATA-002: Loader e núcleo do rule pack"]
  DATA_003["DATA-003: Repositories locais e transações base"]
  DICE_001["DICE-001: Engine de dados pura"]
  STATE_001["STATE-001: Estado local e serviços de aplicação"]
  UI_002["UI-002: Shell, navegação e header"]
  RULE_001["RULE-001: Rules Engine e valores derivados"]
  DICE_002["DICE-002: Overlay e histórico de dados"]
  DATA_004["DATA-004: Raças e sub-raças do material"]
  DATA_005["DATA-005: Classes, subclasses, antecedentes e talentos"]
  CHAR_001["CHAR-001: Domínio de criação e validação"]
  CHAR_002["CHAR-002: Ficha rápida e expandida"]
  CHAR_003["CHAR-003: Wizard de criação e seleção"]
  CHAR_004["CHAR-004: Progressão e escolhas de nível"]
  SPELL_001["SPELL-001: Catálogo de magias e acesso"]
  ITEM_001["ITEM-001: Catálogo de equipamentos"]
  ITEM_002["ITEM-002: Domínio de inventário e equipamento"]
  RULE_002["RULE-002: Combate, condições, descanso e morte"]
  SPELL_002["SPELL-002: Conjuração e recursos mágicos"]
  UI_003["UI-003: Página Ações e execução de capacidades"]
  UI_004["UI-004: Interface de inventário"]
  MAP_001["MAP-001: Mapas, anexos e marcadores"]
  JOUR_001["JOUR-001: Campanha, diário, missões e NPCs"]
  COMP_001["COMP-001: Compêndio local e favoritos"]
  CORE_002["CORE-002: Integrar features e serviços reais"]
  DATA_006["DATA-006: Backup, migrações e recuperação completa"]
  PWA_001["PWA-001: Instalação, cache e atualização offline"]
  UI_005["UI-005: Auditoria responsiva e orçamento visual"]
  A11Y_001["A11Y-001: Auditoria de acessibilidade"]
  QA_001["QA-001: Prova determinística de regras"]
  QA_002["QA-002: Integração de sessão e persistência"]
  QA_003["QA-003: Prova de offline e atualização"]
  QA_004["QA-004: Aceite final integrado"]
  REL_001["REL-001: Polimento documental e entrega futura"]
  CORE_001 --> DATA_001
  CORE_001 --> UI_001
  DATA_001 --> DATA_002
  DATA_001 --> DATA_003
  DATA_001 --> DICE_001
  DATA_001 --> STATE_001
  DATA_003 --> STATE_001
  UI_001 --> UI_002
  STATE_001 --> UI_002
  DATA_002 --> RULE_001
  DICE_001 --> RULE_001
  DICE_001 --> DICE_002
  UI_002 --> DICE_002
  DATA_002 --> DATA_004
  DATA_002 --> DATA_005
  RULE_001 --> CHAR_001
  DATA_004 --> CHAR_001
  DATA_005 --> CHAR_001
  ITEM_001 --> CHAR_001
  SPELL_001 --> CHAR_001
  UI_002 --> CHAR_002
  RULE_001 --> CHAR_002
  STATE_001 --> CHAR_002
  CHAR_001 --> CHAR_003
  CHAR_002 --> CHAR_003
  CHAR_001 --> CHAR_004
  DATA_005 --> CHAR_004
  DATA_002 --> SPELL_001
  DATA_002 --> ITEM_001
  RULE_001 --> ITEM_002
  ITEM_001 --> ITEM_002
  RULE_001 --> RULE_002
  ITEM_002 --> RULE_002
  DATA_005 --> RULE_002
  RULE_001 --> SPELL_002
  RULE_002 --> SPELL_002
  SPELL_001 --> SPELL_002
  DATA_005 --> SPELL_002
  UI_002 --> UI_003
  RULE_002 --> UI_003
  SPELL_002 --> UI_003
  STATE_001 --> UI_003
  ITEM_002 --> UI_004
  CHAR_002 --> UI_004
  UI_002 --> MAP_001
  STATE_001 --> MAP_001
  UI_002 --> JOUR_001
  STATE_001 --> JOUR_001
  UI_002 --> COMP_001
  RULE_002 --> COMP_001
  DATA_004 --> COMP_001
  DATA_005 --> COMP_001
  SPELL_001 --> COMP_001
  ITEM_001 --> COMP_001
  DICE_002 --> CORE_002
  CHAR_003 --> CORE_002
  CHAR_004 --> CORE_002
  UI_003 --> CORE_002
  UI_004 --> CORE_002
  MAP_001 --> CORE_002
  JOUR_001 --> CORE_002
  COMP_001 --> CORE_002
  DATA_003 --> DATA_006
  CHAR_003 --> DATA_006
  CHAR_004 --> DATA_006
  JOUR_001 --> DATA_006
  MAP_001 --> DATA_006
  CORE_002 --> PWA_001
  DATA_006 --> PWA_001
  COMP_001 --> PWA_001
  CORE_002 --> UI_005
  PWA_001 --> UI_005
  UI_005 --> A11Y_001
  RULE_002 --> QA_001
  SPELL_002 --> QA_001
  ITEM_002 --> QA_001
  CHAR_004 --> QA_001
  CORE_002 --> QA_002
  DATA_006 --> QA_002
  PWA_001 --> QA_003
  QA_002 --> QA_003
  QA_001 --> QA_004
  QA_003 --> QA_004
  A11Y_001 --> QA_004
  QA_004 --> REL_001
```

## Ondas de prontidão

A tabela assume que a onda anterior inteira terminou, apenas para planejamento. Na execução, liberar cada tarefa assim que seus próprios predecessores tiverem aceite, sem esperar barreira artificial. O cenário ativo é coordenador + até três subagentes Codex; coordenador não implementa produto. Colunas 4/6/8/12 são históricas/inativas até reavaliação e não autorizam reservas. A lane Claude é separada, sempre subordinada a ownership/DAG; este documento não lhe atribui limite de simultaneidade.

| Onda | Tarefas elegíveis quando predecessores forem DONE | Total | Ativo: 3 Codex | Histórico/inativo: 4 | Histórico/inativo: 6 | Histórico/inativo: 8 | Histórico/inativo: 12 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | CORE-001 | 1 | 1 | 1 | 1 | 1 | 1 |
| 1 | DATA-001, UI-001 | 2 | 2 | 2 | 2 | 2 | 2 |
| 2 | DATA-002, DATA-003, DICE-001 | 3 | 3 | 3 | 3 | 3 | 3 |
| 3 | DATA-004, DATA-005, ITEM-001, RULE-001, SPELL-001, STATE-001 | 6 | 3 | 4 | 6 | 6 | 6 |
| 4 | CHAR-001, ITEM-002, UI-002 | 3 | 3 | 3 | 3 | 3 | 3 |
| 5 | CHAR-002, CHAR-004, DICE-002, JOUR-001, MAP-001, RULE-002 | 6 | 3 | 4 | 6 | 6 | 6 |
| 6 | CHAR-003, COMP-001, SPELL-002, UI-004 | 4 | 3 | 4 | 4 | 4 | 4 |
| 7 | DATA-006, QA-001, UI-003 | 3 | 3 | 3 | 3 | 3 | 3 |
| 8 | CORE-002 | 1 | 1 | 1 | 1 | 1 | 1 |
| 9 | PWA-001, QA-002 | 2 | 2 | 2 | 2 | 2 | 2 |
| 10 | QA-003, UI-005 | 2 | 2 | 2 | 2 | 2 | 2 |
| 11 | A11Y-001 | 1 | 1 | 1 | 1 | 1 | 1 |
| 12 | QA-004 | 1 | 1 | 1 | 1 | 1 | 1 |
| 13 | REL-001 | 1 | 1 | 1 | 1 | 1 | 1 |

## Escalonamento de lanes

Capacidade operacional é de até três subagentes Codex simultâneos. Para tarefa simples/média, coordenador pode escalar para MCP `claude-sonnet` (Sonnet/medium; fallback de modelo Opus na própria lane); para complexa/crítica, MCP `claude-opus` (Opus/xhigh; fallback de modelo Sonnet na própria lane). Fallback não troca servidor/MCP. Ambos são leaves sob o mesmo ownership/handoff. Antes da execução, comprovar identidade/modelo efetivo; sem prova, lane Claude fica BLOCKED. Esta política não muda IDs, arestas, status ou prontidão do DAG.

- Cenário ativo: coordenador não implementa; reservar no máximo três tarefas Codex READY, disjuntas e compatíveis com ownership/DAG.
- Cenários 4/6/8/12: históricos/inativos até reavaliação; não orientam reserva, execução ou capacidade atual.

No estado atual, CORE-001, DATA-001, DATA-002, DATA-003, DATA-004, DATA-005, DICE-001, ITEM-001, RULE-001, UI-001 e STATE-001 estão DONE. UI-002 está em integração, DICE-002 em REVIEW e SPELL-001 em execução com Luna. Cada ID existe uma vez; dependências citam IDs existentes; “bloqueia” é inverso exato; nenhuma autorreferência/ciclo. Tasks consumidoras não redefinem contratos. Uma correção solicitada ao produtor é reabertura controlada, não aresta retroativa geradora de ciclo. Mocks não satisfazem predecessores nem checkpoints.
