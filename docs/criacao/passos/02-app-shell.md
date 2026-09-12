# 02 — App shell

Estado: DONE — UI-002 concluída; aceite canônico registrado em TASKS/QA.

Prioridade: P0.

Complexidade: Média.

Dependências: UI-001, STATE-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: DICE-002, CHAR-002, UI-003, MAP-001, JOUR-001, COMP-001.

Tasks: UI-002; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Criar navegação estável, header de sessão e composição visual das quatro áreas com ação global de dados.

## 2. Por que existe

Jogador precisa consultar PV e abrir dados sem abandonar contexto; shell fixa essa interação para todas as features.

## 3. Escopo

Header, main, navegação mobile/rail/sidebar, host de overlays, rotas principais/subordinadas, utilitários e recuperação do boot.

## 4. Fora do escopo

Implementar fórmula de CA, rolar RNG no header, criar quinto destino Dados ou duplicar Compêndio como Regras.

## 5. Pré-requisitos

UI-001 e STATE-001 aceitos. Repositories base já existem por DATA-003; não esperar o fechamento do passo 14 para projetar hidratação.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/components/layout/**`
- `src/app/router.tsx`
- `src/app/routes.ts`
- `src/features/settings/**`

## 7. Contratos envolvidos

Seletores/read models do personagem ativo; callbacks de aplicação; contrato de abertura DiceOverlay; definição única de destinos e rotas.

Fontes/documentos canônicos: [App shell](../interface/app-shell.md), [Header](../interface/header.md), [Navegação](../interface/navegacao.md).

## 8. Fluxo

Hidratar estado → resolver personagem/campanha → montar regiões → navegar mantendo seleção → abrir overlay global → devolver foco ao acionador.

## 9. Regras

Quatro destinos invariáveis. Context injeta dependências/UI pequena; external stores por agregado notificam snapshots. UI não conhece IndexedDB. Nome/vida/recurso/CA prioritários no header.

## 10. Mobile

Header duas linhas com máximo recomendado 112 CSS px em texto padrão; bottom bar reserva FAB e safe area; zoom pode aumentar altura ou usar header em fluxo.

## 11. Desktop

Header até 96 CSS px recomendado, sidebar compacta e campos secundários se couberem; dados rápidos usam serviço único.

## 12. Estados especiais

Sem personagem, ID ativo removido, pack ausente, falha hidratação, rota inválida, save pendente e troca de personagem com draft.

## 13. Armadilhas

Padding fixo menor que header ampliado; montar duas árvores responsivas que disparam side effects; navegar apaga draft; FAB encobre último item.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **UI-002**: Rotas profundas, foco ao navegar, breakpoint sem duplicação, hidratação com erro, ausência de personagem e safe area.

## 15. Critérios de aceite

- **UI-002**: Personagem/Ações/Jornada/Compêndio únicos; Dados button global; header se adapta com zoom; sem imports IndexedDB; falta de personagem permite Compêndio e dados avulsos.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Preservar quatro destinos e Dados global.
- [ ] Restaurar foco e estado ao navegar.
- [ ] Provar header com zoom e safe area.

## 17. Handoff

DICE-002 e features recebem pontos de entrada/slots do shell e contrato de navegação; CORE-002 recebe exports reais para composição final.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
