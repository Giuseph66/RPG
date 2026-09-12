# 04 — Dice Engine e interface global

Estado: DONE — DICE-001 e DICE-002 concluídas; aceite canônico registrado em TASKS/QA.

Prioridade: P0.

Complexidade: Média.

Dependências: DATA-001, UI-002; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: RULE-001, CORE-002.

Tasks: DICE-001, DICE-002; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Entregar rolagem pura testável e experiência global consistente entre header, FAB e contexto de regra.

## 2. Por que existe

Dados são ferramenta independente de página; sua matemática/RNG precisa de prova determinística e não pode ser duplicada em controles.

## 3. Escopo

DICE-001 implementa validação/resultados cedo; DICE-002 adiciona overlay/seletor/resultado/histórico após shell disponível.

## 4. Fora do escopo

Animação 3D obrigatória, backend de dados, previsão de sorte e aplicação automática de dano/slot por rolagem avulsa.

## 5. Pré-requisitos

DATA-001 para engine; UI-002 e DICE-001 para overlay. Contrato fixa limites de quantidade/expressão e elegibilidade do modo antes da codificação.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/domain/dice/**`
- `src/features/dice/**`

## 7. Contratos envolvidos

DiceExpression, DiceRoll, RNG injetável, contexto opcional e serviço de histórico; fonte mecânica em regras/testes e 11-DICE-ENGINE.

Fontes/documentos canônicos: [Dice Engine](../11-DICE-ENGINE.md), [Dice Overlay](../interface/dice-overlay.md), [Testes](../regras/testes.md).

## 8. Fluxo

Escolher quantidade/faces/modificador → validar modo → sortear por RNG → produzir faces/seleção/subtotal/total → exibir e registrar → re-rolar com novo ID.

## 9. Regras

d4/d6/d8/d10/d12/d20/d100. Vantagem/desvantagem só em teste elegível, sem duplicar todos dados de dano. Dado natural não equivale a sucesso automático em toda verificação.

## 10. Mobile

BottomSheet com rolar/fechar acessíveis, resultado textual e histórico rolável; FAB elevado é ação global.

## 11. Desktop

DiceModal com histórico lateral opcional; seletor rápido abre/usa mesmo serviço sem segunda implementação.

## 12. Estados especiais

Quantidade inválida, expressão incompleta, RNG fora do contrato, histórico não salvo, contexto de personagem removido e reduced motion.

## 13. Armadilhas

Usar Math.random dentro do componente; reabrir resultado repetir custo; sobrescrever histórico ao re-rolar; modo vantagem habilitado indiscriminadamente.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **DICE-001**: Limites faces/quantidade, negativos inválidos para quantidade, modificador negativo, limites do RNG, escolha dos d20 e soma individual/total.
- **DICE-002**: Expressão inválida, retorno de foco, chamadas únicas ao engine, re-rolagem, erro de gravação do histórico e anúncio acessível.

## 15. Critérios de aceite

- **DICE-001**: d4/d6/d8/d10/d12/d20/d100 e sinais suportados; vantagem/desvantagem conforme fonte; nenhuma dependência de UI/storage; resultado reproduzível com RNG fixo.
- **DICE-002**: Abre nos quatro destinos, respeita modo elegível/reduced motion e devolve foco; header não duplica RNG; histórico não repete custo de ação.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Validar expressão antes de sortear.
- [ ] Mostrar faces, parcelas e total.
- [ ] Usar engine única nos três acionadores.

## 17. Handoff

RULE-001 recebe engine pura e RNG; UI-003 recebe abertura contextual e registro; store recebe resultado tipado sem side effect oculto.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
