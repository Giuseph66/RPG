# C03 — regras Firestore para conteúdo base64 de mapas

Data: 2026-10-05. Escopo: somente `firestore.rules`, o override de índice do
campo base64 e o teste autenticado `tests/rules/map-base64-rules.test.ts`.
Nenhum deploy foi executado.

## Contrato aplicado

A versão content-addressed usa:

`campaigns/{campaignId}/maps/{mapId}/content/{sha256}/chunks/{index}`

O manifesto fica em `content/{sha256}` e tem exatamente `schemaVersion`,
`kind`, `campaignId`, `mapId`, `ownerUid`, `sha256`, `mediaType`, `size`,
`chunkSize`, `chunkCount` e `complete`. O chunk tem exatamente
`schemaVersion`, `index`, `chunkCount`, `size`, `sha256` e `data`.

As regras exigem digest hexadecimal de 64 caracteres no caminho e no manifesto,
`kind: map-image`, MIME PNG/JPEG/WebP, tamanho total entre 1 byte e 10 MiB,
`chunkSize: 655360`, de 1 a 16 chunks e tamanhos coerentes com o último chunk.
O campo base64 aceita até 873816 caracteres e o índice do chunk precisa ser
canônico (`0` a `15`), consistente com o campo inteiro `index`.

O manifesto nasce `complete: false` e só pode alterar `complete` uma vez para
`true`; depois os campos ficam imutáveis. Chunks novos só entram enquanto o
manifesto está staged. Reenvio idêntico é aceito, mas mudança de dados, hash,
índice ou contagem é recusada. O mestre pode excluir chunks e manifesto
completos para harmonizar a limpeza do `AssetTransferPort`; jogadores nunca
podem escrever ou excluir.

## ACL

- O mestre da campanha pode consultar manifesto ausente para retry, listar,
  criar staged, completar e ler versões não referenciadas.
- Jogador só lê manifesto/chunk quando é membro ativo, o manifesto está
  completo, o mapa atual aponta para o caminho integral e o mesmo SHA, e
  `visibleTo` contém seu UID ou `*`.
- Listagem por jogador, path de outra campanha/mapa/hash/versão, membro
  revogado, outsider e escrita de jogador são negados.
- Esconder o mapa revoga novas leituras dos bytes imediatamente.
- `/assets/{assetId}` e retratos legados permanecem com suas regras existentes;
  o namespace base64 novo é isolado no mapa.
- `firestore.indexes.json` só desindexa `chunks.data` no collection group
  `chunks`; nenhum índice remoto foi removido.

As regras não conseguem calcular SHA-256 do campo `data`. Elas validam formato,
limites, digest declarado, vínculo de caminho e imutabilidade. O adapter calcula
o digest real de cada chunk e do conteúdo reconstruído antes de retornar bytes.

## Prova no emulador

Com Firestore em `127.0.0.1:8182` e Auth em `127.0.0.1:9199`, o foco terminou:

- **2 testes aprovados / 2 testes executados**, status 0.
- Fixture autenticado cria mestre, dois membros ativos, membro revogado e
  outsider pelo fluxo de convite real.
- Cobertos: manifesto ausente para mestre; staged invisível; leitura por UID;
  leitura por `*`; revogação após ocultar; chunk e manifesto não referenciados;
  path de mapa/SHA/índice inválido; query/lista de jogador; escrita de jogador;
  MIME/tamanho/contagem/campos/index/base64 inválidos; retry idempotente e
  mutação divergente de chunk; membro inativo e outsider.
- O segundo teste usa `createFirestoreMapAssetTransferAdapter` real para
  publicar bytes, confirmar que o payload não adiciona timestamps, baixar e
  verificar o round-trip, e excluir manifesto/chunk completos como mestre.

Evidências duráveis:

- `Testes/evidencias/correcao-mapas-base64-regras.log`
- `Testes/evidencias/correcao-mapas-base64-typecheck.log`

`npm run typecheck` Node24 terminou com `EXIT_STATUS=0`. As mensagens
`PERMISSION_DENIED` esperadas das tentativas negativas aparecem no log do
emulador; o foco Vitest e o comando completo terminaram status 0.
