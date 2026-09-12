# 10 — Magia

Estado: DONE — SPELL-001 e SPELL-002 concluídas; aceite canônico registrado em TASKS/QA.

Prioridade: P0.

Complexidade: Alta.

Dependências: DATA-002, RULE-001, RULE-002, DATA-005; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: CHAR-001, COMP-001, UI-003, QA-001.

Tasks: SPELL-001, SPELL-002; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Estruturar magias/truques e resolver conjuração por classe, origem, slots, componentes e concentração.

## 2. Por que existe

Conjuração não é lista textual: conhecido/preparado, pools de recursos e efeitos diferem por classe e precisam de contrato único.

## 3. Escopo

Catálogo, listas por classe, slots/Pact Magic, preparação/conhecimento, rituais, componentes/custos e concentração; capacidades alimentam Ações.

## 4. Fora do escopo

Inventar escala/efeito ausente, adicionar magia externa, misturar pools silenciosamente e copiar integralmente texto narrativo.

## 5. Pré-requisitos

SPELL-001 precisa do loader; SPELL-002 precisa de derivados, combate/condições/descanso, catálogo mágico e classes. Componentes sem dados completos ficam pendentes conforme fonte.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/data/spells/**`
- `src/domain/spells/**`

## 7. Contratos envolvidos

SpellDefinition imutável; estado de acesso/preparação por origem; pool de slots separado; comando de conjurar e efeito de concentração tipados.

Fontes/documentos canônicos: [Magia](../magia/README.md), [Conjuração](../magia/conjuracao.md), [Slots](../magia/slots.md), [Componentes](../magia/componentes.md).

## 8. Fluxo

Escolher magia/origem → validar acesso e componentes → escolher nível/pool elegível → revisar custo/substituição → resolver comando → atualizar recurso/efeito atomicamente.

## 9. Regras

Truque não consome slot; ritual depende de acesso da classe; preparação e conhecimento não são sinônimos; componente com valor/consumo não é ignorado por foco sem regra. Detalhes mecânicos com fonte nos docs de magia.

## 10. Mobile

Filtros por truque/nível; sheet mostra espaço disponível e concentração existente; erro fica próximo da escolha.

## 11. Desktop

Lista/detalhe com comparação dos níveis elegíveis e fonte; mesma validação do mobile.

## 12. Estados especiais

Slot esgotado, magia não preparada, origem ambígua, componente ausente, ritual indisponível, concentração substituída e interrupção da gravação.

## 13. Armadilhas

Status preparado dentro da definição; todas classes usam mesma regra de ritual; gastar slot antes de validar; testes de concentração sorteados invisivelmente.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **SPELL-001**: Validação do schema, links de classe, componentes com custo/consumo, nível zero, concentração/ritual e fontes ausentes.
- **SPELL-002**: Preparado/conhecido, slot esgotado, nível superior, componentes consumidos, ritual por classe, Pact Magic e concentração substituída.

## 15. Critérios de aceite

- **SPELL-001**: IDs, nível/escola/componentes/tempo/alcance/duração/concentração/ritual e fonte completos ou explicitamente pendentes; conhecido/preparado não guardado na definição.
- **SPELL-002**: Origem de conjuração e pool de recursos explícitos; truque/ritual não consome slot indevido; cancelar/substituir concentração e falhar componente não perde recurso; regra pendente retorna indisponível.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Distinguir acesso, preparação e pool.
- [ ] Validar componentes e custo antes do gasto.
- [ ] Provar truques, rituais e concentração.

## 17. Handoff

UI-003 recebe capacidades/erros/custos; COMP-001 recebe definição consultável; QA-001 recebe fixtures por perfil conjurador.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
