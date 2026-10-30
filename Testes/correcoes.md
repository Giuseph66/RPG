# Correções dos achados de QA — 04/10/2026

Status: fechamento reaberto — C19 em investigação após captura do usuário. C01–C18 têm provas nos cenários registrados; o cenário atual de sincronização recusada não está aprovado. C03 continua validado com mapas em base64 no Firestore. Pedido: corrigir todos os problemas encontrados. Os relatórios originais permanecem como registro da avaliação anterior; este documento acompanha implementação e reteste. Nenhum item abaixo é aprovado apenas por ter sido editado.

## Aceite por achado

| ID | Achado / comportamento esperado após correção | Responsável | Estado / prova |
| --- | --- | --- | --- |
| C01 | Digitar nome/nota do palpite não derruba a página; salvar e recarregar preservam palpite. | Colaboração | Regressão DOM e palpite real raça/nota sem crash; persistiu após reload do jogador e chegou ao mestre (correcao-mestre-palpite-recebido.jpg). |
| C02 | Jogador ativo vincula a própria ficha; mestre recebe vínculo; permissões de mestre continuam restritas. | Jogabilidade + colaboração | Aba Participantes liberada com guard de posse. Jogador criou/vinculou Íria QA Pareamento final na f77, reload preservou vínculo; mestre recebeu ficha em Presença/encontro. Reteste C18 complementa PV/turno. |
| C03 | Mapa do mestre publicado chega ao jogador; conteúdo privado permanece privado; recusa de escrita encerra loading e explica recuperação. | Colaboração | Aprovado em 05/10: base64 no Firestore em chunks, com compatibilidade de referências antigas. Pequeno e grande (1.573.919 bytes/3 chunks) renderizados no jogador e persistentes após reload. Ocultação removeu grande da UI; ACL, integridade e retry aprovados. Ver correcao-mapas-base64.md. |
| C04 | Diário do jogador chega ao mestre e persiste após reload; status reflete resultado remoto. | Colaboração | Diário f77 criado pelo jogador, recebido no mestre e preservado após reload (correcao-mestre-diario-recebido-reload.jpg). |
| C05 | Status de conta/presença/coleções não promete sincronização recusada; sessões compartilhadas e reconexão têm prova pertinente. | Colaboração | Retentativa real no Chrome passou de erro para Sincronizado/Jogador ao vivo. Dois retratos remotos no namespace do jogador têm HTTP200/owner correto; documentos raiz de outros donos preservados (evidencias/correcao-retratos-remoto-final.json). |
| C06 | Objetivos/missões têm caminho de criação acessível, edição e estado refletidos no resumo; conteúdo suportado pelo domínio é persistido. | Colaboração | UI real criou/editou objetivo e missão, concluiu missão e ajustou contador; reload preservou estado. Captura correcao-mestre-objetivo-missao-reload.jpg; testes de dispatcher aprovados. |
| C07 | Backup com conflito permite cópia e substituição conforme contrato, preservando relações/atomicidade; inválido não destrói dados. | Interface | IAB comprovou copy/replace com colisão, IDs distintos, reload e inválido recusado. Snapshot stale adicional corrigido; foco 14/build passaram e navegação SPA confirmou dados novos sem reload. Prévia inválida e recovery imediato também provados no IAB; seleção repetida do mesmo arquivo também corrigida e provada no build congelado 4175. |
| C08 | Cair de PV positivo a zero inicia morrendo sem falha automática; dano já em zero, crítico, cura e morte maciça seguem fonte local. | Jogabilidade | Regressões aprovadas; QA visual7→0 mostrou Morrendo, Sucessos0/3/Falhas0/3 sem falha automática, conjuração em0 bloqueada sem gasto. Ver correcao-jogador-fechamento.md. |
| C09 | Descanso mostra PV/recursos atuais, confirma sem revisão stale e atualiza ficha ao navegar; conflito externo é recuperável sem overwrite silencioso. | Jogabilidade | QA executou cura/descanso longo com prévia7→10, recurso gasto recuperado, confirmou e reload persistiu10/10 sem conflito stale. |
| C10 | Ataque e magia têm prévia e execução válidas, gastos/efeitos persistentes e cancelamento sem gasto; sem mensagens de implementação na UI. | Jogabilidade | Regressões de domínio cobrem bônus/slots/upcast. QA encontrou revisão desatualizada após Confirmar, texto sem efeito incorreto e exigência de slot sem controle. Revisão de fonte distingue roll informativo de commit: PV muda na confirmação. Cura real confirmou7→10 uma vez, gastou slot, persistiu após reload; Cancelar ferido preservouPV7/slot. Chip Cura rolou5 sem alterarPV7/slot; Cancelar e reload preservaram ambos. Chip de dano de arma coberto no componente, sem prova GUI por ausência de arma na ficha QA. Ver correcao-jogador-fechamento.md. |
| C11 | Deslocamento/recursos disponíveis na ficha são refletidos em Ações; bônus Rapieira conferido contra proficiência específica. | Jogabilidade | Rapieira com DEX +2/PB +2 deriva ataque +4 no pack real; propriedades de Ações integradas. |
| C12 | Wizard não avança inesperadamente na identidade, seleções múltiplas funcionam por toque e cada etapa valida quantidades/duplicidades. | Interface | QA real percorreu identidade, escolhas por toque e quantidades até revisão pronta; regressões aprovadas. Ver correcao-interface.md. |
| C13 | Wizard e escolhas têm nomes legíveis em português, gramática correta e equipamento relevante; criação de Bardo oferece escolhas de magia coerentes. | Interface | QA real criou Bardo com equipamento relevante, 2 truques e 4 magias de nível 1; catálogo e validação aprovados. |
| C14 | Confirmar criação leva à ficha criada; voltar/navegar mantém seleção e dados. | Jogabilidade + interface | Criação nova passou no QA. Retomada antiga agora oferece cópia com novo ID; ficha existente/owner preservados. Confirmação aguarda autosave e remove draft após sucesso. Focos router/wizard 25/25, wizard/queue 12/12; Cópia real criada no QA com escolhas preservadas (correcao-jogador-final.md, C14); reload/ausência de draft consumido em fechamento. |
| C15 | Alvos de ficha mobile são adequados para toque sem overflow em 360/390px. | Interface | QA real em 360/390 sem overflow; labels acionáveis de aproximadamente 44 px. Reteste final confirmou innerWidth360/390, scrollWidth igual a clientWidth e 17 controles do inventário com44px (correcao-jogador-fechamento.md). |
| C16 | As 13 falhas automatizadas são triadas/corrigidas com cobertura preservada; suíte completa, typecheck e build passam. | Todos; integração na segunda onda | Gate anterior Node24:151 arquivos aprovados/1083 testes passaram,1 arquivo/teste ignorado. npm test, typecheck e build com EXIT_STATUS=0. Assert do mock corrigido e suíte integral repetida após revisão; logs correcao-final-*.log. Gate atual após C03: 1.090 testes passaram/3 ignorados, 152 arquivos passaram/2 ignorados; typecheck/build status 0. Os 2 testes de regras foram executados separadamente e passaram. Logs correcao-mapas-base64-final-*.log. |
| C17 | Carga inicial reduzida a partir da composição real do bundle; medir antes/depois e validar comportamento offline após alteração. | Interface | Build final:entry2815,06kB/gzip785,31; boot com Firebase3014,64kB/gzip838,76, mais catálogo3876,07kB/gzip1120,32. Entry caiu37% bruto/43,5% gzip; total instalado inclui outros chunks e modelos. Primeira abertura offline catálogo/Ajustes3D/Backup provada com cache instalado; upgrade conserva corpus antigo (13 regressões). Ver correcao-validacao-final.md e evidencias/correcao-offline-final.md. |
| C18 | Reteste real entre mestre/jogador após correções: convite, ficha, mapa, diário, NPC, sessão/turno/PV. | Colaboração + jogabilidade | Aceite correto f77… confirmado no jogador e recebido no mestre, com Jogador ativo e Sincronizado (captura correcao-mestre-convite-recebido.jpg). Vínculo recebido pelo mestre; diário/reload, NPC oculto→revelado sem segredo, palpite recebido e presença/iniciativa15/Rodada1/Em turno/PV10/10 provados. PV após dano3 confirmado no mestre após reload7/10 (AX após reload e captura completa correcao-mestre-pv-rodada-final.jpg). Jogador recebeu Rodada2; C05 passou após retentativa e conferência remota dos retratos. Mapa remoto aprovado no fechamento base64: duas imagens recebidas pelo jogador; grande ocultado e removido da UI após sync/reload. Storage não é requisito das novas escritas. |

## Regras de verificação

Usar dados sintéticos, preservar registros reais e manter arquitetura offline-first. Tests/build autorizados pela sessão; Node 24.12.0 existente, sem dependências novas. Teste de componente não prova backend real. Teste de viewport não equivale a dispositivo físico. Falha de rede transitória recuperada no QA não será declarada corrigida sem identificar uma causa. Contas e segredos não entram nos artefatos.

## Handoffs

- [Colaboração](correcao-colaboracao.md)
- [Jogabilidade](correcao-jogabilidade.md)
- [Interface e backup](correcao-interface.md)
- [Carregamento e PWA](correcao-performance.md)
- [Reteste de backup pela raiz](evidencias/correcao-raiz-backup.md)
- [Jogador pareado final](correcao-jogador-final.md)
- [Mestre pareado final](correcao-mestre-final.md)
- [Primeiras rotas offline](evidencias/correcao-offline-final.md)
- [Dependência de Storage](evidencias/correcao-storage-bloqueio.md)

Os links serão preenchidos pelos respectivos executores; status final depende da revisão das provas.

Fechamento adicional: retratos privados passam a users/{uid}/portraits/{id}, inclusive fila antiga pelo marcador autoritativo. Regras self/owner validadas e publicadas (correcao-final-firestore-deploy.log); documentos raiz de outros donos preservados. C05 passou na retentativa real e na consulta remota dos documentos privados. C10 recebeu correção dos chips e da revisão de cura. Cura/slot/cancelamento e rolagem informativa passaram no reteste. Gate final passou.

## Gate anterior conferido pela raiz (histórico)

Node24.12.0; suíte completa repetida após corrigir o tipo do mock sem mascarar o assert:1083 passaram/1 ignorado,151 arquivos aprovados. Typecheck e build status0. Logs em evidencias/correcao-final-test.log, correcao-final-typecheck-retry.log, correcao-final-build.log; o primeiro erro de tipo foi preservado no log original. Dist index-DdSVXcYs.js; métricas completas/hashes em correcao-validacao-final.md e evidencias/correcao-final-artifacts.log.

Conferência externa final:billing HTTP200 false e bucket oficial HTTP404 ausente (evidencias/correcao-storage-final.json). C03 continua bloqueado. C10 passou no complemento real: rolar Cura não modificaPV7/slot, cancelar/reload preservam ambos. Aprovação global permanece pendente apenas da entrega remota de mapa C03.

## Resultado anterior de fechamento (superado pela migração base64)

C01/C02/C04–C18 têm correção e prova pertinente registradas, com os limites de cobertura descritos em cada relatório. C03 preserva o mapa local e explica a falha, mas a entrega real exige bucket Firebase provisionado e faturamento configurado pelo proprietário. Não houve alteração financeira. A meta integral não está concluída enquanto esse requisito externo permanecer ausente.

Relatórios finais: [Mestre](correcao-mestre-final.md), [Jogador](correcao-jogador-fechamento.md), [Validação](correcao-validacao-final.md). Prova visual pareada: evidencias/correcao-mestre-sincronizado-final.jpg.

## Reabertura por orientação do usuário

A solução obrigatória é armazenar mapas em base64. A conclusão anterior de que o proprietário precisava provisionar Storage foi uma premissa inadequada para esse requisito. O diagnóstico de bucket/billing descreve o caminho legado; C03 foi reaberto com migração para o Firestore já usado no projeto. A entrega só será aceita após publicação/leitura reais nas duas contas e validação de visibilidade.

## Fechamento vigente — mapas base64

A premissa de Storage obrigatório foi corrigida. C03 concluído no Firestore existente, com regras e índice publicados; conteúdo real reconstruído e digests conferidos. Mestre publicou/liberou duas imagens; jogador recebeu/renderizou/recarregou ambas, mobile 360/390 sem overflow. Mestre ocultou grande, e jogador confirmou ausência no atlas/UI após reload sem limpar cache. C01–C18 têm prova pertinente registrada.

Gate vigente: 1.090 passaram/3 ignorados; typecheck/build status 0. Emulador de regras: 2 casos executados e aprovados separadamente. Sem dependências, billing ou limpeza de dados. Limites de cobertura permanecem explícitos nos relatórios; não se afirma certificação em aparelhos físicos.

Relatório C03: [Mapas base64](correcao-mapas-base64.md); QA específica: [Jogador](correcao-mapas-base64-jogador.md).

## C19 — permissão recusada e conflito de revelação na campanha atual

Usuário mostrou `Missing or insufficient permissions` em Sessões, e console de `worker.ts` identificou operação `sighting`, `upsert`, `baseRevision: 0`, com mensagem `Conflito remoto`. Campanha da captura: `QA Colaboração 2026-10-05`, papel mestre. Na inspeção da aba atual, o erro global permanece no header; outras operações tiveram confirmação Firebase e o mapa atual está confirmado. Portanto não se atribui a falha à criação de sessões nem ao upload base64 sem prova.

Status: investigação read-only. Rastrear producer→fila→mapping→Rules e distinguir permissão de conflito de revisão. Nenhum retry, limpeza de cache/outbox, troca de conta, exclusão ou alteração de produto realizada pela raiz. Declaração anterior de conclusão global retirada para este cenário.

Precisão após leitura do código: `sighting` é a revelação do mestre; `guess` é o palpite do jogador. O worker registra `Conflito remoto` somente para resultado CAS, e `Firebase recusou a operação` para erro de permissão. A mensagem global de permissão e o conflito sighting da captura podem ser de operações distintas. Sem payload completo e estado remoto não há prova da causa exata da recusa. Nenhuma correção de produto foi feita nesta investigação.
