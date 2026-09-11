# 09 — Combate e página Ações

Estado: TODO — implementação não iniciada.

Prioridade: P0.

Complexidade: Alta.

Dependências: RULE-001, ITEM-002, DATA-005, UI-002, SPELL-002, STATE-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: SPELL-002, COMP-001, QA-001, CORE-002.

Tasks: RULE-002, UI-003; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Entregar transições de combate/recuperação e ações utilizáveis com custo, contexto e resultado claros.

## 2. Por que existe

Dano, PV temporários, concentração e morte interagem; dividir efeitos em callbacks de UI pode deixar estado parcial.

## 3. Escopo

Engine de combate/condições/descanso, ataque e dano separados, cura, 0 PV/morte/estabilização; página Ações integra capacidades e magia após SPELL-002.

## 4. Fora do escopo

VTT, controle multiplayer de turno, alvo remoto, garantia automática de acerto sem CA/contexto e bestiário inexistente na fonte.

## 5. Pré-requisitos

RULE-002 aguarda derivados/inventário/classes; UI-003 aguarda engine de combate, magia, shell e estado. Escolhas/efeitos compartilhados já contratados.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/domain/rules/combat/**`
- `src/domain/rules/conditions/**`
- `src/domain/rules/rest/**`
- `src/data/conditions/**`
- `src/features/actions/**`

## 7. Contratos envolvidos

Comandos de ataque/dano/cura/condição/descanso; RuleResult com alterações e solicitações de teste; revisão de agregado e identidade do comando.

Fontes/documentos canônicos: [Combate](../regras/combate.md), [Dano e cura](../regras/dano-e-cura.md), [Morte](../regras/morte.md), [Ações](../interface/pagina-acoes.md).

## 8. Fluxo

Selecionar capacidade → mostrar custo/contexto → validar → obter rolagem quando necessária → resolver efeitos → confirmar transação → atualizar ficha/header/histórico.

## 9. Regras

Condições, dano, cura, descanso e morte seguem fontes nos documentos de regras. PV baixo é limiar de UX, não condição oficial. Sem modo de combate completo não impor contador fictício de ação por turno.

## 10. Mobile

Lista de capacidades e sheet curto; recurso esgotado explica recuperação; atalho a morte/concentração preserva contexto.

## 11. Desktop

Lista e painel de detalhes com ações explícitas; sem esconder reação ou dano em hover.

## 12. Estados especiais

Duplo clique, recurso 0, condição repetida, concentração após dano, PV zero, personagem estabilizado, alvo indefinido e falha save.

## 13. Armadilhas

Aplicar dano ao rolar avulso; restaurar tudo no descanso sem regra; condição armazenada só por boolean; remover concentração fora do comando.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **RULE-002**: Casos de dano/resistência/temporários, crítico, 0 PV, morte/estabilização, repetição de comando, descanso curto/longo e condições sobrepostas.
- **UI-003**: Ataque e dano separados, conjuração com substituição, recurso 0, descanso cancelado, falha commit, trocas de personagem e formas não suportadas.

## 15. Critérios de aceite

- **RULE-002**: RuleResult descreve efeitos e fontes; dano/cura/0 PV e descanso são atômicos; concentração produz solicitação de teste/efeito conforme contrato; condições persistem por instância.
- **UI-003**: Cada capacidade tem operações elegíveis, motivos de bloqueio e referência; clique duplo não duplica gasto; cancelamento preserva estado; origem mágica/slot explícitos.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Validar transições críticas da fonte.
- [ ] Mostrar custos e bloqueios antes de usar.
- [ ] Provar atomicidade e cancelamento.

## 17. Handoff

UI-003 consome RuleResult sem recalcular; QA-001 recebe cenários de interação; CORE-002 integra serviço real e verifica que fixtures não ocultam transação ausente.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

