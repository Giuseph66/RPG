# Evidência — coleção de criaturas e hidratação cloud

Data: 2026-10-05

## Regra local validada

A regra fonte em `firestore.rules` separa `allow get` (com identidade do documento) de `allow list` (somente `campaignOwner`). No emulador Firestore `127.0.0.1:19000`, com uma campanha e vínculo de mestre:

- `campaigns/c1/creatures/cr1` create: HTTP 200.
- `campaigns/c1/creatures` list pelo mestre: HTTP 200.
- list/get por outra conta autenticada: HTTP 403.
- As regras de mapa e diário sem `schemaVersion` continuam 403; com `schemaVersion: 1`, 200.

As rules foram publicadas somente com `firebase deploy --only firestore:rules --project rpg-c8827`; a CLI reportou compilação e release concluídos.

## Estado remoto da campanha QA

Na campanha QA `f77afb9b-4fe1-43c4-9406-f791c9706b73`, a leitura REST autenticada do mestre confirmou:

- `campaigns/{campaignId}/creatures`: HTTP 200 após a propagação do release (antes do release: HTTP 403).
- `maps`, `journals` e `sessions`: HTTP 200.
- Com a conta de jogador temporária ainda sem vínculo ativo, `creatures` list/get: HTTP 403.
- O documento de metadados `assets/{assetId}` da importação real existe com `size=4447`, `contentType=image/png`, SHA-256 e `storagePath` da campanha.
- O mapa importado ainda não contém `image` e o objeto Storage no `storagePath` retornou HTTP 404.

Isso separa a causa da coleção `creature` (rules remotas antigas) da causa do mapa (bytes ainda não confirmados no Storage). O fluxo não é contado como upload concluído.

## Estado parcial e recuperação

O adaptador agora devolve `partial.deniedCollections` quando uma lista é recusada. A hidratação preserva os snapshots locais e exclui o tipo recusado da limpeza; depois o runtime expõe estado `error` com mensagem recuperável. Um perfil remoto do próprio UID recebido durante bootstrap, com operação local `baseRevision=0`, é hidratado e a operação é reconhecida sem sobrescrever o remoto.

Focos: 49/49 testes; `npm run typecheck`: passou. `npm run build` ficou bloqueado por três chamadas `fireEvent.change` ausentes no helper em `src/app/router.test.tsx`, path sob outro owner.

## Prova isolada do Storage

Foi criado um metadado temporário em `assets/{assetId}` para uma chave de teste, com hash, dono, campanha e caminho válidos; em seguida o SDK Firebase real executou `uploadBytes` em `campaigns/{campaignId}/assets/{assetId}`. O resultado foi `storage/unknown`; `getMetadata` depois retornou `storage/object-not-found`; o metadado temporário foi removido com HTTP 200. Nenhum objeto do mapa QA foi alterado. O backend Storage/configuração ainda precisa de investigação administrativa; não houve deploy de Storage.
