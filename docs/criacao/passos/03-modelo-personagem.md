# 03 — Modelo do personagem e estado

Estado: TODO — implementação não iniciada.

Prioridade: P0.

Complexidade: Alta.

Dependências: CORE-001, DATA-003; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: DATA-002, DATA-003, DICE-001, UI-002, CHAR-002, UI-003, MAP-001, JOUR-001.

Tasks: DATA-001, STATE-001; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Fixar tipos compartilhados e organizar estado local persistente/transitório sem acoplar UI ao banco.

## 2. Por que existe

Contratos são a fronteira que permite agentes trabalhar sem redefinir personagem, resultado de regra, dado ou repository. Esta etapa tem duas tarefas em momentos diferentes do DAG.

## 3. Escopo

DATA-001 primeiro: definições/agregados/IDs/comandos/results/ports. STATE-001 depois de DATA-003: serviços, stores por agregado, hidratação, autosave e tratamento de revisão.

## 4. Fora do escopo

Mega-store para tudo, Zustand obrigatório, server state inexistente, backend e regras codificadas dentro de store.

## 5. Pré-requisitos

CORE-001 destrava DATA-001; DATA-001 destrava DATA-003; DATA-003 destrava STATE-001. Não tratar este passo como bloco que só começa quando tudo termina.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/domain/contracts/**`
- `src/application/ports/**`
- `src/application/character/**`
- `src/application/campaign/**`
- `src/application/settings/**`
- `src/application/dice/**`
- `src/application/state/**`

## 7. Contratos envolvidos

Character, Campaign, RuleResult, DiceExpression/DiceRoll, definitions, sourceRef/ruleset, revision, schemaVersion; CharacterRepository/CampaignRepository/SettingsRepository e serviço de anexos conforme modelo canônico.

Fontes/documentos canônicos: [Modelo](../09-MODELO-DE-DADOS.md), [Schemas](../dados/schemas.md), [Persistência](../08-PERSISTENCIA-LOCAL.md).

## 8. Fluxo

Congelar contratos → revisar exemplos → entregar ports ao adapter → hidratar aggregate → validar intenção no domínio → publicar snapshot consistente → persistir por revisão → comunicar sucesso/falha.

## 9. Regras

Definições imutáveis guardam regras; Character guarda escolhas/usos/instâncias. schemaVersion da estrutura difere da versão do ruleset e revisão da entidade. Context serve injeção; useSyncExternalStore consome external store por agregado.

## 10. Mobile

Formulário mantém draft local e sobrevive à expansão/teclado; nenhum rerender global a cada tecla.

## 11. Desktop

Vários painéis observam seletores do mesmo snapshot; segunda aba pode gerar conflito e precisa de política explícita.

## 12. Estados especiais

Hidratação falha, quota, revisão desatualizada, troca de personagem em operação, referência desconhecida e versão futura.

## 13. Armadilhas

Definition com slots atuais; classe identificada por label traduzida; save otimista anunciado como confirmado; last-write-wins silencioso; adapter importado em componente.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **DATA-001**: Fixtures de fronteira válidas/inválidas e checagem de tipos dos consumidores; nenhuma dependência React, DOM, IndexedDB ou pacote de UI nos contratos.
- **STATE-001**: Alterações rápidas, troca de agregado durante gravação, erro com draft preservado, retry idempotente, fechamento e subscribers por seletor.

## 15. Critérios de aceite

- **DATA-001**: Character, Campaign, SpellDefinition, DiceExpression/DiceRoll, RuleResult, ConditionDefinition e ResourceDefinition têm origem única; revisão CAS, schemaVersion e rulesetVersion distinguíveis; contrato revisado pelo integrador.
- **STATE-001**: Hidratação não sobrescreve registros; seleção de ID e revisão impede resultado tardio em outro personagem; debounce não perde última alteração; conflito não é last-write-wins silencioso.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Congelar contratos antes dos consumidores.
- [ ] Separar rulesetVersion, schemaVersion e revision.
- [ ] Provar hidratação e save sem perda.

## 17. Handoff

DATA-001 publica assinaturas/erros/fixtures; STATE-001 publica comandos/seletores e política de concorrência ao shell/features; mudanças passam pelo owner do contrato.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

