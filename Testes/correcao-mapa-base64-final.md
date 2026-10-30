# C03 — conteúdo de mapas em base64 no Firestore

Data: 2026-10-05  
Status: APROVADO — integração revisada, regras/índice publicados; mestre→jogador, ocultação e gates finais aprovados. Consolidação: correcao-mapas-base64.md.

## Contrato entregue

Novos uploads usam o caminho canônico:

```text
campaigns/{campaignId}/maps/{mapId}/content/{sha256}
campaigns/{campaignId}/maps/{mapId}/content/{sha256}/chunks/{index}
```

O SHA-256 do caminho é o digest total. Cada chunk carrega seu próprio digest. O manifesto contém somente `kind: "map-image"`, `schemaVersion: 1`, campanha, mapa, dono, media type, tamanho cru, `chunkSize: 655360`, `chunkCount` e `complete`. O chunk contém somente schema, índice, contagem, tamanho, digest e `data` base64. A transição final escreve apenas `{ complete: true }`.

O limite remoto continua em 10 MiB. Cada fragmento tem no máximo 655.360 bytes crus e 873.816 caracteres base64; uma imagem de 10 MiB usa no máximo 16 documentos de chunk. Cada gravação é individual para permanecer abaixo do limite de documento/request.

## Comportamento

- O adapter valida autenticação, escopo, media type, tamanho, base64 e SHA-256 antes da publicação.
- O manifesto começa `complete: false` e só transita uma vez para `true` depois que todos os chunks foram validados/gravados.
- Retry é idempotente: manifesto completo é revalidado; chunks iguais são reutilizados; chunk ausente em manifesto incompleto é retomado; divergência retorna `corrupt-record` sem sobrescrever.
- Leitura exige manifesto completo, contagem/índice/tamanho/base64 válidos, hash de cada chunk e hash final do conteúdo. O resultado é compatível com o cache IndexedDB existente.
- Referências antigas de Storage continuam delegadas ao adapter Storage, criado somente no fallback. Novas escritas exigem `mapId` e nunca usam Storage.
- O path inclui o mapa pai, permitindo às rules aplicar proprietário/`visibleTo` do mapa. Bytes não entram no metadata genérico `assets`.

## Arquivos

- `src/application/ports/asset-transfer.ts`: contexto `mapId`, localização `firestore-map` e constantes de chunk.
- `src/infrastructure/cloud/firebase/firestore-map-asset-adapter.ts`: manifesto/chunks base64, retry, verificação e fallback legacy.
- `src/infrastructure/cloud/firebase/index.ts`: export do adapter.
- `src/application/campaign/map-publication.ts`: passa `mapId` em upload/download e usa mensagens Firestore.
- `src/app/bootstrap.tsx`: compõe o adapter Firestore; Storage fica lazy apenas para referências legadas.
- `src/domain/contracts/campaign.ts`: comentário atualizado para Storage legado ou chunks Firestore.

O único consumidor de produção de `assets.uploadRemote` encontrado é `map-publication`; portanto exigir `mapId` para novos uploads não quebra outro fluxo de bytes remoto.

## Validação

- Focais executados: **39 testes passaram** em 5 arquivos, incluindo imagem acima de 1 MiB em 3 chunks, retry idempotente, ausência/corrupção de chunk, hash final, remoção individual, referência legacy, passagem de `mapId` e composição do bootstrap.
- `npm run typecheck`: passou após a correção do teste de rules pelo owner de regras.
- Emulador Firestore/Auth isolado (`8182`/`9199`): `tests/rules/map-base64-rules.test.ts` passou com **2 testes**, cobrindo staged invisível ao jogador, ACL por `visibleTo`, owner, manifesto/chunk imutáveis e referências de versão não corrente.
- Não alterei nem publiquei rules, índices, Storage ou hosting nesta etapa; as rules locais foram apenas exercitadas no emulador isolado.
