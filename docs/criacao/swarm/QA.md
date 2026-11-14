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
# Aceite da rodada SUP — 11/11/2026

Usuário autorizou validação funcional e comandos de teste/build; execução delegada aos owners. Fixtures sintéticas devem preservar dados reais e diferenciar teste local de colaboração remota.

| Área | Prova necessária nesta rodada |
| --- | --- |
| Fontes | Cinco anexos extraídos integralmente, páginas/tabelas preservadas, hashes e mídia inventariados; regras rastreáveis |
| Complementos | Criação/progressão Fada e Patrulheiro Tasha explícitos, sem alterar personagens legados; escolhas e recursos persistem |
| Catálogo | Criaturas completas da fonte, filtro besta/tamanho/ND, detalhes conforme template e Ariel, sem tornar catálogo automaticamente avistado |
| Mestre/jogador | Criação manual, sugestão editável e aprovação; proposta do jogador chega ao mestre sem conceder privilégios nem avistamento |
| Forma Selvagem | Druida elegível transforma besta vista; não-besta/não-vista rejeitada; voar/nadar suprimidos sem bloquear escolha |
| Estado efetivo | STR/DEX/CON, CA, PV, tamanho, ações e derivados usam forma; atributos mentais e estado original preservados |
| Transições | Dano/cura/PV temporários, 0 PV e excedente, retorno voluntário, usos/descanso/duração; sem consumo duplicado em falha/CAS |
| Persistência | Forma ativa e PV originais sobrevivem à recarga; dados legados, import/export e validação de entradas continuam compatíveis |
| Integração | Typecheck/build, focos de domínio/componentes/persistência e smoke navegador desktop/mobile; limitações explícitas |

Estado inicial: provas pendentes. Gates históricos abaixo não substituem essas evidências.

Prova documental SUP-CP1 pela coordenação: Python stdlib (`hashlib`, `csv`, `zipfile`) confrontou manifesto com os cinco anexos originais e os 2.258 membros de mídia com o índice. Resultado: cinco hashes corretos; divisões nativas 162/1/24; duas tabelas DOCX preservadas; três arquivos ZIP sem falha CRC; zero divergências de tamanho/hash de mídia. Esta verificação documental não executou testes/build do produto nem prova integração de regras.

## Revisões SUP ainda abertas

- SUP-01: fidelidade de Tasha p.51–56 (lista expandida integral, opções independentes, troca da habilidade local, magias por nível, custos, PB global e referências corretas); conjurações solicitadas sem bloqueio artificial quando há fonte.
- SUP-01/02: Fada no pipeline real 1→3→5, escolha de atributo, voo vinculado à caminhada, armadura e uso gratuito versus espaço; persistência das opções sem mutar pack base.
- SUP-02: Forma Selvagem não perde equipamento/recursos ao retornar; bônus de equipamento mesclado/largado ficam inativos; perícias/salvaguardas usam maior bônus aplicável, sentidos/passiva e imunidades efetivos.
- SUP-02: dano excedente sem dupla resistência e sem restaurar PV temporários já gastos; cura/temporários, retorno voluntário/zero PV/duração/inconsciência; a condição adicionada via ficha também passa pela transição correta.
- SUP-02/03: customizar animal sugerido → enviar pending → mestre aprovar atomicamente → catálogo permitido → registrar visto explicitamente → transformar → recarregar. Proposta pendente de outro autor não vaza; jogador comum/offline não falha por consulta incompatível com ACL.
- SUP-02: migração aditiva v5→v6 preserva dados, snapshot ativo, import/export/backup, CAS, outbox/hidratação, limpeza de campanha e regras remotas cobrem proposal e statBlock.
- SUP-03: sugestão automática por referência publicada/porte/tipo/ND com razões e revisão; edição manual guiada de campos comuns do template; remoção de campos avançados realmente remove o dado.
- SUP-QA: worker Luna executa gates globais somente após contratos estáveis; QA real desktop/mobile com dados sintéticos e recarga. A raiz coordena/revisa e não executa build/testes de produto.

Mudanças de autoria anterior/externa em arquivos compartilhados não devem ser revertidas por inferência a partir de diff contra HEAD; cada owner limita as correções aos próprios hunks e registra os demais como preservados.

Diagnóstico de tipos foi antecipado durante integração para capturar erros de contratos/imports: `npm run typecheck` falhou; log integral atual em `Testes/logs/complementos-typecheck-diagnostico.log`. Isso não constitui gate final. Focais de UI 60/8 e bootstrap15/15 passaram em revisões intermediárias. Novo focal facade1/1 usa memória/mock, portanto não substitui migração/backup/transação reais. Tipagem final, build, casos específicos de PV/retorno/equipamento/magias, migração6, ACL e navegador continuam abertos.

Atualização intermediária12/11: 12 testes de serviço/Forma Selvagem,16 de bootstrap e41 de recursos/magias passaram nas respectivas execuções focais. Revisão exige saldo temporário distinto do inicial e cura que altere PV reais, além de CA `worn` e conjurações18/20 com fontes reais. Projeções e gravação de PV pelo mestre foram corrigidas; ACL e navegador devem provar esse caminho. Não somar execuções sobrepostas como uma suíte nem promover gates sem as evidências restantes.

Revisão adicional12/11: CA `worn` deve preservar a base natural e acrescentar escudo compatível uma vez, sem duplicar DES nem bônus gerais. Descanso em forma precisa manter pools separados: máximo da besta não pode capar/curar o original; expiração e recuperação usam o estado correto ao término, e descanso longo não pode restaurar temporários antigos por meio da saída. Ambos os casos retornaram ao owner de regras, com regressões novas exigidas.

Retomada23:54UTC: revisão de código confirma correções de histórico alvo/material e liberação assistida racial restrita a efeitos narrativos, sem dano/cura; ainda faltam provas de execução. A ponte deve demonstrar custo gratuito versus espaço separados, alvo/material explícitos, cancelamento/pendência/falha/CAS sem gasto, e duração alternativa de Reforço sem perder concentração anterior. Não aceitar simples presença de metadados como prova do fluxo. SUP-CP2/3/4 continuam abertos; execução global aguarda REVIEW dos produtores e liberação da coordenação.

### Matriz de aceite SUP vigente — 12/11/2026

| Pedido | Evidência atual | Aceite restante |
| --- | --- | --- |
| Extrair integralmente cinco anexos, separando fonte de instruções | Manifesto, extração nativa/OCR187 páginas, duas tabelas DOCX, mídias e hashes conferidos; SUP-CP1 aceito | Nenhum para extração; não implica automação integral de Tasha |
| Fada e opções do Patrulheiro Tasha na criação/evolução | Dados opt-in, referências e testes de criação/progressão; revisão mecânica documentada | Dispatcher/UI reais de conjuração gratuita/espaço, materiais, Incansável e smoke de complementos |
| Blocos de monstros/NPCs manuais ou sugeridos, padrão template/Ariel | Contrato genérico, catálogo95, renderer/editor e sugestão determinística por tipo/porte/ND | Concluir smoke de bloco personalizado revisado na campanha |
| Catálogo de bestas e avistamento explícito por personagem | Navegador mostrou95/0→95/1 após marcar LOBO e recarregar | Completar o mesmo percurso com animal personalizado aprovado; aprovação/reveal não contam como avistamento |
| Forma Selvagem Druida2, atributos/PV/retorno e regra sem voo/natação | Navegador e testes de pools separados, dano/cura/temp/excedente, atributos/CA, equipamentos, duração, descanso e inconsciência | Gates integrados e repetição estável da sequência que coincidiu com HMR |
| Sugestões editáveis de animais em seis portes, revisão mestre/jogador | Componentes/serviço/UoW/ACL; aprovação exige ND final e não altera beastSightings | Catálogo→marcar visto→transformar/recarregar com o registro aprovado; distinguir fixture de vínculo/reveal de ação real |
| Persistir sem perda, respeitando visibilidade/conflitos | SUP-02P REVIEW: focais7 arquivos/88 testes; emulador1 arquivo/3 testes; bootstrap16 com repositórios reais sobre fake-indexeddb | Gate global; testes em memória/emulador não são prova de duas contas no serviço hospedado |
| Validar entrega funcional | Focais e QA nuclear de navegador registrados nos handoffs | Suíte global, typecheck, build, smoke de produção, reindexação final e revisão SUP-CP2/3/4 |

Esta matriz preserva o escopo integral. Cada pendência deve receber evidência ou permanecer aberta; nenhum aceite global foi concedido nesta atualização.

Auditoria integral do catálogo revelou divergências apesar da contagem95 e dos valores básicos corretos. SUP-CAT retorna a IN_PROGRESS para corrigir5 deslocamentos e segmentações de ações/traços/variantes, com teste da integridade/IDs e comparação à fonte. A linha de catálogo da matriz continua pendente também dessa correção e revisão; não aceitar um corpus somente por contagem ou amostras. Relatório nominal e focais serão entregues por P.

13/11: SUP-CAT REVIEW após correções e auditoria95/95 documentadas em `Testes/complementos-catalogo-qa.md`; focal catálogo6/6. B REVIEW inclui testes com ações reais do catálogo: danos condicionais/recorrentes e ações sem bônus publicado permanecem manuais; nomes legíveis chegam ao histórico. Fonte congelada. SUP-QA geral liberado para P; C mantém QA navegador e smoke pós-build. Matriz acima continua aberta nos itens de runtime/gates, sem inferir aceite de resultado focal.

Rodada13/11 com2workers:1282/7ignorados,176 arquivos verdes/4ignorados, typecheck/build/diffs verdes. Capturas desktop/mobile e reabertura Chromium confirmam forma custom8PV/original17PV,1/2uso e dois avistamentos explícitos. Fada nova criada UI com escolhaSAB. Entretanto builder atual Ranger11 gerou duas instâncias do recurso gratuito de Reforço, e UI Fada com Druidismo racial+classe registrou keys duplicadas. B/C corrigem; P preserva resultado intermediário e revalida após handbacks. Sem aceite SUP-CP2/3/4 enquanto esses defeitos e runtime dos complementos estiverem pendentes.

## Fechamento vigente SUP — 14/11/2026

SUP-01, SUP-02, SUP-02P, SUP-03, SUP-CAT, SUP-QA-FORMA e SUP-QA: concluídos no escopo desta extensão, após revisão da coordenação. SUP-CP1/2/3/4 aceitos. Evidência consolidada e limites: [SUP-ENTREGA.md](SUP-ENTREGA.md). Rodada7:1.308 testes passaram/7 condicionais ignorados,176 arquivos passaram/4 condicionais ignorados; typecheck/build/diffs verdes. Dist7: saída por Inconsciente atualiza card8→17 sem reload; remover condição, nova transformação e reload preservam forma8/original17/uso2 de2, sem erros de console. Falhas históricas anteriores estão superadas por esta prova, sem apagar seus registros.

Não há deploy nem prova de sincronização hospedada; fluxo entre papéis usou perfis separados e transporte por backup, e ACL foi verificada em emulador. Checkpoints históricos CP0–CP9 não são promovidos por este aceite SUP.
