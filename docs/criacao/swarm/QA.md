# QA — aceite com evidência

Esta é a estratégia futura de verificação. Nenhum teste, lint ou build de aplicativo foi executado nesta etapa de documentação.

## Pirâmide e responsabilidade

| Camada | Dono | O que prova | O que não prova |
| --- | --- | --- | --- |
| Unitários locais | Owner do módulo | Funções/validações/estado com dependências controladas. | Integração real ou offline. |
| Regras determinísticas | QA-001 | Fórmulas/interações contra exemplos rastreados à fonte e RNG fixo. | Interface e persistência. |
| Componentes | UI/feature owner | Foco, estados, interações e capacidades apresentadas. | Repository real quando usa fixture. |
| Persistência/integrados | DATA-003/DATA-006/QA-002 | Transações, CAS, migração, import/export, sessão real. | Instalação por plataforma. |
| Responsivos | UI-005 | Reflow, alvos e comportamento por largura/zoom. | Leitura assistiva completa. |
| Acessibilidade | A11Y-001 | Scanner + teclado/leitor de tela/contraste/movimento. | Conformidade presumida sem revisão manual. |
| PWA/offline | QA-003 | Artefato de produção, SW/cache/atualização sem rede. | Garantia de storage permanente. |
| Aceite/performance | QA-004 | Fluxo de sessão e limites em ambiente documentado. | Todos aparelhos possíveis. |

## Roteiro integrado mínimo

1. Criar/importar personagem válido do pack local; conferir identidade, atributos, proficiência e escolhas.
2. Rolar perícia/dado avulso pelo header e FAB; conferir origem, faces, total e histórico único.
3. Aplicar dano/cura/temporários; tratar 0 PV/condição/concentração pelos comandos de domínio.
4. Conjurar magia elegível, escolher slot quando necessário, cancelar outra e provar que cancelamento não gasta.
5. Equipar/remover item e observar derivados; registrar nota, missão e marcador de mapa.
6. Recarregar e verificar snapshot real salvo; abrir segunda aba e provocar conflito conhecido.
7. Exportar personagem/campanha, incluindo anexo; importar em banco limpo e conferir vínculos; JSON inválido preserva original.
8. Instalar/preparar PWA, desligar rede e repetir ações críticas; atualizar versão com draft e preservar dados.
9. Repetir caminhos por teclado, mobile/desktop, zoom e reduced motion; registrar limitações e retestar correções.

## Gate de conclusão

DONE exige critérios individuais, revisão do diff, provas adequadas, ausência de violação de ownership e handoff legível. Falha de fonte não autoriza expectativa inventada; recurso é documentado como pendente ou fase posterior. Não marcar testes planejados como passados. Incidentes encontrados voltam ao owner original; QA não altera implementação fora da própria área. Se correção altera contrato, reabrir consumidores e testes afetados; repetir apenas gates pertinentes, sem expansão arbitrária.

## Auditoria documental CP0

Conferir árvore mínima, 20 passos de 17 seções, 36 tarefas com campos, links relativos, IDs e DAG, ownership disjunto, fontes/páginas e pendências explícitas. Comparar declarações UI/arquitetura sobre quatro destinos, dados global, external store, IndexedDB por ports e ausência de implementação. Essa revisão de documentos não constitui execução de testes do aplicativo.
