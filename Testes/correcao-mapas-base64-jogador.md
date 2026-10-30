# Baseline QA de mapas Base64 — jogador — 2026-10-05

Sessão verificada exclusivamente pela UI no Chrome recém-reaberto para o jogador já autenticado, campanha `QA Remoto 2026-10-05`. A aba ficou em `/journey/map`; não houve upload, publicação, alteração de mapa, alteração de ficha ou operação de mestre.

## Baseline antes da liberação do root

- Cabeçalho da UI: `QA Remoto 2026-10-05` e `Jogador · ao vivo`.
- A seção `Mapa` está selecionada em `Jornada`.
- A lista `Mapas desta campanha` contém somente `QA mapa qa-map-public-20261005`, com `0 locais`.
- O mapa atual é `QA mapa qa-map-public-20261005`; a UI informa `Este mapa não tem imagem. Importe uma imagem local para visualizar os marcadores.`.
- A área do mapa está em `100%`, com os controles `Reduzir zoom`, `Aumentar zoom` e `Ajustar mapa`; não há locais/marcadores (`0`, `Nenhum local marcado ainda.`).
- `correcao-mapa-fixture` não aparece na lista do jogador. O resultado concreto é ausência da fixture privada esperada; somente o mapa público acima está exposto.
- `Escolher imagem do mapa` está visível, mas não foi acionado porque o upload e o teste de mapa novo aguardam liberação do root.

## Fixture pequena liberada

Após a liberação pelo mestre para `Todos os jogadores`, a lista passou a mostrar `correcao-mapa-fixture` e `mapa-base64-grande-qa`, além do mapa público anterior. Ao selecionar `correcao-mapa-fixture`, a UI exibiu a imagem real, `640 × 480 px · 4 KB`, `0` locais e `Nenhum local marcado ainda.`. A leitura DOM somente leitura confirmou `complete=true`, `naturalWidth=640` e `naturalHeight=480`.

Após recarregar a rota, a fixture pequena continuou disponível e com a imagem real `640 × 480 px`; o cabeçalho voltou a `Jogador · ao vivo` depois da sincronização da sessão.

## Mapa Base64 grande liberado

Ao selecionar `mapa-base64-grande-qa`, a UI exibiu a imagem real, `1024 × 512 px · 1.5 MB`, `0` locais e `Nenhum local marcado ainda.`. A leitura DOM somente leitura confirmou `complete=true`, `naturalWidth=1024` e `naturalHeight=512`.

Depois de um reload, a lista ainda continha os três mapas e a imagem grande continuava selecionável. A seleção ativa retornou para `correcao-mapa-fixture` após o reload; ao selecionar novamente o mapa grande, a imagem `1024 × 512 px` carregou. Isso caracteriza fallback da seleção ativa, não perda do mapa/imagem.

Não havia marcador/local criado para validar nesta rodada; portanto não há afirmação de persistência de marcador.

## Validação mobile

Foram usados overrides temporários apenas no viewport da aba, sem alterar zoom/configuração do usuário. Após cada leitura, o viewport foi restaurado ao padrão.

- CSS `360px`: `window.innerWidth=360`, `visualViewport.width≈343.33`, `devicePixelRatio≈0.9`, `clientWidth=343`, `scrollWidth=343`, `body.scrollWidth=343`, `overflow=false`; a fixture pequena permaneceu real `640 × 480`, completa, com renderização dentro da área.
- CSS `390px`: `window.innerWidth=390`, `visualViewport.width≈373.33`, `devicePixelRatio≈0.9`, `clientWidth=373`, `scrollWidth=373`, `body.scrollWidth=373`, `overflow=false`; a fixture pequena permaneceu real `640 × 480`, completa, com renderização dentro da área.

## Evidência

As telas baseline, da fixture pequena, do mapa grande e dos reloads foram capturadas inline durante a sessão CUA. O conector não forneceu caminho local para persistir os bytes; nenhum JPG foi inventado ou escrito. As dimensões naturais acima vieram de leitura DOM somente leitura dos elementos de imagem.

## Ocultação e remoção confirmadas

Após o mestre ocultar `mapa-base64-grande-qa` (toast na UI do mestre: `Mapa visível só para você`), a rota do jogador foi reaberta e recarregada. O atlas passou a exibir `2` mapas: `correcao-mapa-fixture` e `QA mapa qa-map-public-20261005`; `mapa-base64-grande-qa` não aparece mais na lista, nem como mapa atual. A fixture pequena continuou visível com imagem real `640 × 480 px`. A mesma ausência foi revalidada após o reinício do servidor e novo reload. Não houve limpeza de cache ou alteração de dados do jogador.

## Encerramento

A aba ficou na rota Mapa, com viewport padrão restaurado. A remoção do mapa grande foi confirmada após reabertura e reload da UI do jogador.
