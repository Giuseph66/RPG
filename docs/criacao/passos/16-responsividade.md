# 16 — Responsividade

Estado: DONE — UI-005 concluída; aceite canônico registrado em TASKS/QA.

Prioridade: P1.

Complexidade: Média.

Dependências: CORE-002, PWA-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: A11Y-001.

Tasks: UI-005; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Provar que os fluxos funcionam em mobile, tablet e desktop, com reflow e controles acessíveis em zoom/orientação/teclado.

## 2. Por que existe

Responsividade não é redução de desktop: navegação, header, tabela, mapa e overlays exigem comportamentos explícitos.

## 3. Escopo

Auditoria e cenários em tests/responsive, relatórios, achados com owner e reteste após correção.

## 4. Fora do escopo

Reescrever CSS/features globalmente, criar destinos por breakpoint e alterar mecânicas de jogo para caber na tela.

## 5. Pré-requisitos

Integração e PWA aceitas; documentos de UX definem comportamento. Problemas encontrados voltam ao dono de código, sem invadir ownership.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `tests/responsive/**`
- `docs/implementacao/responsividade/**`

## 7. Contratos envolvidos

Mesmos destinos/read models/commands em todas faixas; tokens de tamanho/espaçamento e altura real das regiões fixas.

Fontes/documentos canônicos: [Responsividade](../06-RESPONSIVIDADE.md), [Wireframes](../04-WIREFRAMES.md), [Ownership](../swarm/OWNERSHIP.md).

## 8. Fluxo

Escolher fluxo/estado → medir largura/zoom/orientação → exercitar toque/teclado → registrar falha com reprodução/owner → corrigir pelo owner → retestar cenário afetado.

## 9. Regras

Faixas conceituais abaixo de 48rem, 48–75rem, a partir de 75rem, ajustadas por conteúdo. Limites de altura do header não cortam texto ampliado. Hover sempre tem alternativa.

## 10. Mobile

320/360/390 CSS px, teclado virtual, safe area, paisagem e fonte ampliada; mapa com lista e dados com ação visível.

## 11. Desktop

768/1024/1440 como amostras; tabelas, painel lateral, foco e largura de texto; janela reduzida adota layout adequado.

## 12. Estados especiais

Labels longos, máximo de chips de condição, classe múltipla, modal com erros, imagem ausente e mudança de faixa durante edição.

## 13. Armadilhas

Screenshot bonito sem interação; rolagem horizontal da página; botões sob FAB; overflow cortado; perder seleção entre layouts.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **UI-005**: Cenários visuais e interativos: header/FAB/safe area, textos longos, teclado virtual, tabelas e alteração de breakpoint durante edição.

## 15. Critérios de aceite

- **UI-005**: 320–1440 CSS px, paisagem e zoom sem controle encoberto; quatro destinos invariáveis; dados/mapa funcionam sem hover; correções aceitas pelos owners.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Cobrir faixas, zoom e orientação.
- [ ] Registrar owner e correção dos achados.
- [ ] Retestar funções críticas após ajustes.

## 17. Handoff

A11Y-001 recebe superfícies estabilizadas e limitações de viewport; owners recebem relatórios reproduzíveis, não permissão de edição transversal.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
