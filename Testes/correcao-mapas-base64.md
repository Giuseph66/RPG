# C03 — mapas em base64 no Firestore

Status: APROVADO — implementação, publicação, QA pareada e gates concluídos em 05/10/2026.

O usuário reafirmou a orientação de guardar mapas em base64. O bloqueio anterior por Storage foi uma premissa incorreta para esse requisito. Novas imagens usarão o Firestore já ativo; referências legadas permanecem recuperáveis, sem apagar mapas ou ativar faturamento.

## Contrato aprovado

Manifesto `campaigns/{campaignId}/maps/{mapId}/content/{sha256}`; fragmentos `.../chunks/{index}`. Manifesto só fica `complete` depois de todos os fragmentos. Chunk bruto de 655.360 bytes, base64 de até 873.816 caracteres; até 16 fragmentos para o limite remoto vigente de 10 MiB. O Firestore limita documento a 1 MiB e requisição a 10 MiB; fragmentos são enviados separadamente. [Limites oficiais](https://firebase.google.com/docs/firestore/quotas).

Mestre escreve. Jogador ativo lê somente mapa liberado ao seu UID ou todos, com manifesto completo apontado pela referência atual do mapa. Versões não apontadas, mapas ocultos, contas externas/inativas e escrita de jogador devem ser recusadas. Cliente valida tamanho, ordem, integridade de fragmentos e SHA total; cópia local continua offline.

## Aceite

| Requisito | Prova necessária | Estado |
| --- | --- | --- |
| Novo upload base64, sem Storage | Documentos remotos reconstruídos e hash correto | Aprovado: pequeno 4.447 bytes/1 chunk; grande 1.573.919 bytes/3 chunks; hashes individuais e total conferem. |
| Imagem pequena entregue | Mestre publica/libera correcao-mapa-fixture; jogador renderiza/reload | Aprovado: mestre confirmou e compartilhou; jogador renderizou imagem real e confirmou dimensões/reload. |
| Imagem maior que 1 MiB entregue | Fixture sintética de 1.573.919 bytes/3 fragmentos; jogador renderiza/reload | Aprovado: mestre confirmou e compartilhou; jogador renderizou imagem real e confirmou dimensões/reload. |
| Mapa privado protegido | Baseline ausente no jogador; regras get/chunks/list recusam leitura sem grant | Aprovado: baseline GUI privado ausente; ACL e escritas indevidas negadas no emulador autenticado. |
| Ocultar revoga exposição | Mestre oculta; novas leituras recusadas e jogador não vê mapa após sync/reload | Aprovado: emulador revoga leitura; GUI jogador ficou com 2 mapas, grande ausente e pequeno preservado, inclusive após reinício/reload sem limpar cache. |
| Retry/corrupção/completeness | Teste adapter com fragmento ausente/divergente e falha parcial | Aprovado: 39 testes focais, incluindo retry e integridade. |
| Compatibilidade/offline | Leitura local e referência legada preservadas; consumidores/backup validados | Aprovado em foco: cache IndexedDB preservado e fallback de referências Storage antigas. Prova offline geral consta do fechamento anterior. |
| Gates atuais | Focos, suíte integral, typecheck e build após integração | Aprovado: 1.090 testes passaram/3 ignorados; 152 arquivos passaram/2 ignorados; typecheck e build status 0. Os 2 testes Rules foram executados separadamente, ambos aprovados. |

Dados sintéticos apenas. Mestre: IAB desktop, campanha QA Remoto2026-10-05/f77. Jogador: Chrome em visão mobile, mesma campanha e conta já usada na QA. O inventário inicial do jogador contém somente o mapa público legado sem imagem; correcao-mapa-fixture privado não aparece. Relatório do jogador: correcao-mapas-base64-jogador.md.

## Provas atuais

- `evidencias/correcao-mapas-base64-deploy.log`: Rules e índice do campo `chunks.data` publicados no projeto existente, status 0.
- `evidencias/correcao-mapas-base64-remoto.json`: leitura autenticada pelo CLI reconstruiu os bytes persistidos e conferiu SHA de cada chunk e SHA total. Não contém base64 nem credenciais. Essa leitura administrativa prova persistência; a autorização do jogador é verificada separadamente no emulador e na GUI.
- `correcao-mapas-base64-regras.md`: 2 testes autenticados executados, incluindo adapter real com upload/download/delete e matriz de autorização.
- `correcao-mapa-base64-final.md`: contrato, compatibilidade e 39 testes focais.
- Grafo reindexado após o adapter: 8.562 nós e 22.421 arestas.

A fixture grande usa três chunks de 655.360, 655.360 e 263.199 bytes. SHA total: `f030ec309c602666666f6a38388fbc1942a7a338c095f12ca4559338fcd57532`.

## QA pareada: imagens e mobile

O jogador confirmou via DOM `complete=true`, dimensões naturais 640×480 e 1024×512, e carregamento real depois de reload. Pequeno e grande chegaram à conta do jogador. Em 360/390 px, não houve overflow horizontal; o relatório distingue `innerWidth`, largura efetiva e DPR. Viewport restaurado. A seleção atual retorna à primeira fixture depois de reload, mas ambos mapas/imagens permanecem disponíveis. Não havia marcador nesta fixture; não se afirma teste novo de marcador.

Mestre também verificou zoom 100→125% e ajuste, e acionou `verificar` depois do upload grande: confirmação remota novamente, sem erro. A imagem grande foi ocultada: jogador confirmou sua remoção do atlas e da imagem atual após reabertura/reload, sem limpar cache. Pequeno permaneceu público e renderizado.

## Fechamento

C03 aprovado. Novos mapas são guardados em base64 no Firestore; referências legadas preservadas. Pequeno e grande chegaram ao jogador; mapa privado inicial não apareceu, e grande deixou de aparecer ao ser ocultado. Sem alteração financeira ou novas dependências. Servidor de desenvolvimento ativo em `http://127.0.0.1:5173`.

Captura do mestre na retomada: `evidencias/correcao-mapas-base64-mestre-retomada.png`. Relatório do jogador: [correcao-mapas-base64-jogador.md](correcao-mapas-base64-jogador.md). Limites: viewport simulado não equivale a aparelho físico; fixture não tinha marcadores, e leitura administrativa não é prova de ACL. As provas de privacidade constam do emulador autenticado e da GUI pareada.
