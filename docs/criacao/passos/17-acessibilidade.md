# 17 — Acessibilidade

Estado: TODO — implementação não iniciada.

Prioridade: P1.

Complexidade: Alta.

Dependências: UI-005; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: QA-004.

Tasks: A11Y-001; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Validar critérios WCAG 2.2 AA aplicáveis e uso real por teclado/leitor de tela, com foco em sessão e recuperação.

## 2. Por que existe

Estado RPG denso, dados animados e mapa podem excluir usuários se informação depender de cor, gesto ou mouse.

## 3. Escopo

Auditoria automatizada onde útil e manual: semântica, foco, aria, contraste, zoom, toque, reduced motion, formulários e mapa alternativo.

## 4. Fora do escopo

Declarar conformidade só por scanner, editar módulos fora de ownership e exigir animação/gesto para concluir fluxo.

## 5. Pré-requisitos

UI-005 aceito; fluxos integrados estáveis e critérios definidos. Correções voltam a UI-001/UI-002 ou feature owner.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `tests/accessibility/**`
- `docs/implementacao/acessibilidade/**`

## 7. Contratos envolvidos

Componentes semânticos, contrato modal e anúncios live; resultados/derivados com rótulos; lista textual alternativa ao mapa.

Fontes/documentos canônicos: [Acessibilidade](../13-ACESSIBILIDADE.md), [Modais](../interface/modais.md), [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## 8. Fluxo

Executar roteiro sem mouse → conferir foco/ordem/retorno → ler por tecnologia assistiva → validar contraste/zoom/movimento → reportar/corrigir → repetir cenários.

## 9. Regras

Texto normal 4,5:1; grande 3:1; elementos essenciais 3:1 conforme critérios da norma. Meta toque produto 44 px; mínimo AA 24 px e exceções avaliados separadamente. Foco não encoberto.

## 10. Mobile

Touch targets e leitor de tela mobile; viewport com teclado; labels visíveis; zoom não bloqueado.

## 11. Desktop

Tab/Enter/Espaço/Escape; skip link; tabelas com cabeçalhos; resultado de dados anunciado uma vez; atalhos não interferem em texto.

## 12. Estados especiais

Erro de validação, ConfirmModal destrutivo, falha autosave, foco de acionador removido, resultado sem animação e marcador sem imagem.

## 13. Armadilhas

aria excessivo em vez de HTML semântico; prender foco em popover não modal; ícone sem nome; toast único com erro essencial; cor única para concentração.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **A11Y-001**: Percurso completo sem mouse, diálogos/retorno de foco, dados anunciados uma vez, mapa por lista, 200/400% e contrastes reais.

## 15. Critérios de aceite

- **A11Y-001**: Teclado/foco/leitor de tela/contraste/zoom/reduced motion provados nos fluxos críticos; limitações explicitadas; sem declaração baseada só em scanner.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Provar teclado, foco e leitura assistiva.
- [ ] Verificar contraste, zoom e reduced motion.
- [ ] Registrar ambientes e limitações reais.

## 17. Handoff

QA-004 recebe matriz de critérios/evidências e pendências; correções exigem confirmação do owner e reteste específico antes do gate.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

