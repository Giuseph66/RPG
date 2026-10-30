# Reteste do mestre — IAB desktop

Mesa pareada: QA Remoto 2026-10-05, campanha f77afb9b-4fe1-43c4-9406-f791c9706b73. Conta sintética QA Mestre. O jogador utiliza Chrome com conta sintética distinta. Segredos e tokens de convite não entram no relatório.

## Passou no navegador

- Aceite correto do convite chegou ao mestre: Jogador ativo, inicialmente sem ficha, e Sincronizado após atualizar. `correcao-mestre-convite-recebido.jpg`.
- NPC Cartógrafo QA C18 criado pela UI com PV12 e nota secreta. Inicialmente tudo oculto; jogador confirmou ausência. Mestre revelou apenas presença, nome e aparência; jogador recebeu esses campos sem PV/nota secreta. `correcao-mestre-npc-oculto.jpg`, `correcao-mestre-npc-revelado.jpg`.
- Palpite remoto recebido: raça Cartógrafo errante e nota QA C18: acho que o mapa dourado guia a rota. Jogador confirmou persistência após reload. `correcao-mestre-palpite-recebido.jpg`.
- Diário QA diário f77 C18 recebido, nota Pista do jogador para o mestre. Após reload no mestre continua 1 registro. `correcao-mestre-diario-recebido-reload.jpg`.
- Criar/editar objetivo e missão pela UI; concluir missão reduziu resumo de duas para uma missão em andamento. Reload preservou 2 objetivos e 2 missões, uma concluída. `correcao-mestre-objetivo-missao-reload.jpg`.
- Criar e iniciar Sessão QA C18; jogador recebeu sessão Em andamento/Rodada1. Ficha Íria QA Pareamento final recebida; presença registrada e encontro criado com iniciativa15. Jogador provou após reload Presente/Rodada1/Em turno/PV10/10 sem comandos de mestre. Dano remoto confirmado: jogador deixou PV7/10 e mestre recebeu após reload, presente/iniciativa15/Em turno (correcao-mestre-pv7-recebido-reload.jpg).
- Imagem PNG sintética 640×480 importada e renderizada localmente. Retentativa de envio encerrou busy, preservou imagem e mostrou erro recuperável e enviar agora. `correcao-mestre-mapa-erro-recuperavel.jpg`. A entrega remota não passou: bucket inexistente e faturamento desabilitado, ver evidencias/correcao-storage-bloqueio.md.
- Backups e primeira abertura offline de catálogo/Ajustes3D/Backup foram provados em sessões IAB isoladas: evidencias/correcao-raiz-backup.md e evidencias/correcao-offline-final.md.

## Achados em fechamento

- Rascunho antigo: recuperação por cópia implementada; jogador criou cópia de novo ID com escolhas preservadas. Wizard espera autosave, conserva draft em falha e só remove após confirmação; focos 32/32 e queue12/12 passaram.
- Guard de jogador provado após vínculo: comandos de mestre ausentes. Leitura do encontro restaurada com regressão PV/turno.
- Retratos legados corrigidos sem overwrite de outros donos; retentativa remota aprovada, conforme fechamento C05 ao final.
- Gate integral final, upgrade de cache e medida de carga crítica permanecem pendentes dos owners. Os resultados históricos não são o aceite final do checkout atual.

Teste em navegador desktop e viewports móveis não substitui aparelho físico. Apenas dados sintéticos foram criados/mutados.

## Retomada de fechamento

- Servidor anterior estava encerrado (sem processo Vite). Reiniciado pela raiz com Node24, porta5173 strict; sessões existentes preservadas.
- Rules remotas comparadas pela API Firebase Rules: release2026-10-05T11:59:07.799481Z, source igual a firestore.rules e regra privada /portraits presente. Não se atribui a falha de retratos à ausência de regra sem nova evidência.
- PWA: teste de atualização preserva corpus anterior, remove somente shell antigo, mantém caches alheios e entrega chunk antigo offline. Foco13/13 passou; navegador offline já documentado em correcao-offline-final.md.
- Mestre observou PV10310/10 após retomada; jogador recebeu diagnóstico para distinguir concatenação no input de falha real do comando de dano antes do pareamento definitivo.
- git diff --check limpo; varredura delimitada de Testes sem JWT/valor de credencial/token de convite.

## PV remoto confirmado

O jogador corrigiu o estado sintético legado por Ajuste manual10, aplicou dano3 e comprovou PV7/10 após reload. Mestre recarregou a mesma sessão e recebeu PV7/10, presente, iniciativa15 e Em turno; captura correcao-mestre-pv7-recebido-reload.jpg. O fluxo de ficha/PV funciona mesmo enquanto a pendência complementar de retratos mantém erro global. Mestre avançou um turno com único participante para testar Rodada2 no jogador.

QA jogador também executou queda7→0 sem falha automática, cura e descanso longo confirmados sem revisão stale, com persistência10/10. Ver correcao-jogador-fechamento.md.

Correção da referência visual: correcao-mestre-pv7-recebido-reload.jpg registra o topo da sessão, sem a linha PV abaixo da dobra. PV7/10 foi confirmado no AX após reload; a captura completa correcao-mestre-pv-rodada-final.jpg mostra Presente, Rodada2, PV7/10, iniciativa15 e Em turno. A referência visual final usa a captura completa.

## Regras privadas de retrato publicadas

Após testes de dono/terceiro/CAS e reparo do mapper legado, raiz publicou somente firestore:rules no projeto rpg-c8827. Compilação remota e release passaram (evidencias/correcao-final-firestore-deploy.log). Reteste do jogador ainda necessário; Storage/hosting/faturamento não foram alterados.

## Fechamento remoto C05

Raiz publicou apenas firestore:rules; deploy confirmado em evidencias/correcao-final-firestore-deploy.log. No reteste real, Tentar sincronizar mudou Erro/permissão para Sincronizado e Jogador ao vivo, preservando Rodada2/PV7/presença/iniciativa15. Consulta remota confirmou os dois retratos em users/{uid}/portraits/{id} com dono do jogador e revisão1; os dois documentos raiz permanecem com os donos originais. Evidência sanitizada: evidencias/correcao-retratos-remoto-final.json. C05 aprovado.

## Encerramento técnico e pareado

Após C10, mestre recarregou e recebeu Sincronizado, Rodada2, Presente, iniciativa15 e PV7/10 restaurado pelo jogador. Captura completa final: evidencias/correcao-mestre-sincronizado-final.jpg. Houve PV10/10 temporário durante a confirmação legítima da cura; o jogador restaurou7 por dano sintético.

Gate final Node24:1083 aprovados/1 ignorado; typecheck/build status0. Logs correcao-final-*.log. Grafo atualizado na fonte estável:8484 nós/22208 arestas. Varredura textual de Testes sem valores de credenciais/JWT e git diff --check limpo. Mapas remotos continuam bloqueados por bucket inexistente/billing desabilitado; consulta final em evidencias/correcao-storage-final.json.

Complemento C10 pelo jogador: chip de Cura rolou5 sem alterarPV7 nem consumir slot; revisão cancelada e reload preservaram ambos. Confirmação anterior aplicou cura e consumiu slot exatamente uma vez. Fonte só registra histórico no roll; mutação depende de confirmação. Dano de arma não teve prova GUI por ausência de arma/equipar nesta ficha QA; limite explicitado.

## C03 base64 — fechamento em 05/10/2026

Pendência anterior de Storage superada: novos uploads usam base64 fragmentado no Firestore. IAB mestre publicou `correcao-mapa-fixture` (640×480, 4.447 bytes) e `mapa-base64-grande-qa` (1024×512, 1.573.919 bytes, 3 chunks); ambos confirmados na UI e compartilhados para o jogador. Pequeno/grande renderizados e persistentes após reload na conta do jogador. Mestre verificou zoom/ajuste e `verificar` após envio; confirmou novamente sem erro.

Mestre ocultou grande; jogador confirmou que saiu do atlas e da imagem atual após sync/reload sem limpar cache. Mestre após reinício permanece `ao vivo`, pequeno público e grande `Só o mestre`. Captura salva: `evidencias/correcao-mapas-base64-mestre-retomada.png`. Relatório completo: [Mapas base64](correcao-mapas-base64.md). Não foram apagados mapas reais nem ativado faturamento.
