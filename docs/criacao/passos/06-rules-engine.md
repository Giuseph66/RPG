# 06 — Rules Engine

Estado: DONE — RULE-001 concluída; aceite canônico registrado em TASKS/QA.

Prioridade: P0.

Complexidade: Alta.

Dependências: DATA-002, DICE-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: CHAR-001, CHAR-002, ITEM-002, RULE-002, SPELL-002.

Tasks: RULE-001; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Construir cálculo puro, rastreável à fonte, que transforma definições/estado/contexto em derivados e resultados tipados.

## 2. Por que existe

Regras espalhadas em React causam inconsistência entre ficha, ações e magia. Um pipeline explícito também permite testar exceções sem navegador.

## 3. Escopo

Atributos, proficiência, perícias, resistências, iniciativa, CA, percepção passiva, CD/ataque mágico, PV e composição de modificadores; mecanismos de validação/resultados.

## 4. Fora do escopo

Executar IndexedDB, renderizar UI, extrair regras de descrições livres em tempo real e inventar efeito ausente.

## 5. Pré-requisitos

DATA-002 e DICE-001; contratos compartilhados revisados. Casos e fonte de cada fórmula definidos no documento do engine.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/domain/rules/core/**`
- `src/domain/rules/derived/**`

## 7. Contratos envolvidos

RuleContext, RuleResult, definições/IDs, snapshot imutável, fontes modificadoras e RNG recebido somente quando necessário.

Fontes/documentos canônicos: [Rules Engine](../10-RULES-ENGINE.md), [Atributos](../personagem/atributos.md), [Perícias](../personagem/pericias.md).

## 8. Fluxo

Resolver fonte/versão → reunir entradas → validar → aplicar regra e precedência → produzir valor/efeitos/explicação → aplicação decide persistência.

## 9. Regras

Uma origem identificável por modificador; bônus do mesmo tipo não somados sem regra; opções concorrentes de CA não acumuladas arbitrariamente. Exceção específica é vinculada à fonte, sem if por nome traduzido.

## 10. Mobile

Engine não depende de viewport; resultados curtos e decomposição expandível alimentam UI de pouca área.

## 11. Desktop

Mesmo resultado para mesmo snapshot/contexto; painel lateral pode mostrar explicação completa sem refazer cálculo próprio.

## 12. Estados especiais

Referência órfã, opção conflitante, regra não suportada, pré-requisito ausente e contexto insuficiente para determinar resultado.

## 13. Armadilhas

Engine mutar entrada; consumir RNG em cálculo derivado sem teste; armazenar valores derivados conflitantes como fonte primária; usar texto de magia como programa.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **RULE-001**: Casos determinísticos das fórmulas e limites de nível, fontes concorrentes de CA, proficiência/expertise e condição afetando teste.

## 15. Critérios de aceite

- **RULE-001**: Entrada e snapshot não são mutados; modificadores têm fonte/escopo; bônus não duplicados; ausência de regra retorna resultado não suportado tipado.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Conferir todas fórmulas e exceções documentadas.
- [ ] Preservar entrada e proveniência.
- [ ] Rejeitar contexto insuficiente explicitamente.

## 17. Handoff

CHAR-001/002 recebem seletores/validação; RULE-002/ITEM-002/SPELL-002 recebem pipeline/precedência e contratos para ampliar domínio sem duplicação.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
