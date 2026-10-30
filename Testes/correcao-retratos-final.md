# C05 — sincronização de retratos legados

Data: 2026-10-05  
Status: aprovado — correção local, regras publicadas e reteste remoto concluídos; ver fechamento ao final.

## Diagnóstico confirmado

O erro `permission-denied` não era ausência de regra. O log do navegador registra `portrait/upsert` para os documentos raiz `/portraits/b89e7e31-acb5-40a7-8703-fe84085c4232` e `/portraits/4bc8b5dc-5885-4c2f-8040-4be91982ccca` (`Testes/evidencias/dev.log`, linhas 83–86 e repetições posteriores). A consulta read-only da release confirmou que ambos existem com `revision: 1` e `schemaVersion: 1`, mas pertencem aos UIDs `8q5RwxbENyOYqGxGe4WIczdMM442` e `678NBOj5kOVmJTRnJkfy4rhsCZp1`; o jogador atual é `WbqHlpoEg6QnVoDqLx9yY3NqUB53`.

As regras publicadas na mesma release têm `match /portraits/{portraitId}` privado e exigem `ownerUid == request.auth.uid` para ler o documento existente. A recusa observada é, portanto, a proteção correta de um retrato de outra conta. O conflito foi agravado pelo contrato local: `enqueuePrivate` não registrava o dono no `scope`, e `publishExisting` aceitava um asset do IndexedDB sem prova de posse da ficha. Uma sessão podia tentar republicar um ID legado com o UID autenticado atual.

## Correção entregue

- `src/app/portrait-service.ts` agora grava `scope.ownerUid` nas novas operações privadas e exige `ownerUid` explícito, igual à sessão, em `publishExisting`. Sem essa prova, mantém o asset local e não publica bytes nem a cópia da campanha.
- `src/application/sync/worker.ts` continua filtrando `ownerUid` da sessão. Um retrato com `scope.ownerUid` divergente é preservado na fila, contado como pendência bloqueada e não chega ao adapter; a mensagem informa que a pendência é de retrato e não de convite. Uma operação antiga sem `scope`, mas com marcador `operation.ownerUid` da sessão atual, continua compatível e pode ser reaplicada.
- `src/infrastructure/cloud/firebase/firestore-sync-adapter.ts` exige posse autoritativa para retratos privados: scope explícito divergente é rejeitado antes da transação; retrato legado sem scope usa `operation.ownerUid` para o namespace da própria conta e só prossegue quando esse marcador coincide com o UID do adapter. A transação e o CAS continuam intactos.
- O caminho privado novo é `users/{uid}/portraits/{id}`. O cliente atual escreve somente nesse namespace; a leitura tenta primeiro esse caminho e, se não houver documento (ou se a rule scoped ainda não estiver disponível), consulta `/portraits/{id}` apenas com verificação do `ownerUid` autenticado. As regras raiz de clientes legados permanecem; cópias de campanha continuam em `campaigns/{campaignId}/portraits/{id}`.
- Nenhum documento legado foi sobrescrito, movido, confirmado artificialmente ou apagado. O registro raiz de outro dono permanece intacto e não é usado como fallback.

## Evidência

Com Node 24.12.0:

- `npm exec vitest -- run src/app/portrait-service.test.ts src/infrastructure/cloud/firebase/portrait-store.test.ts src/infrastructure/cloud/firebase/firestore-sync-adapter.test.ts src/application/sync/worker.test.ts`: **53 testes passaram** em 4 arquivos.
- `npm run typecheck`: **passou**.
- Emulador Firestore/Auth isolado (`127.0.0.1:8182`/`9199`, regras locais): criação/leitura pelo dono no namespace novo **200**; leitura por outro UID **403**; escrita com `ownerUid` divergente **403**; fallback legacy do próprio dono **200**; fallback legacy de outro UID **403**; listagem privada **403**.

Os testes cobrem escopo do dono em novas operações, roteamento de operação legada para `users/{ownerUid}/portraits/{id}`, preservação de registro raiz de outra conta, bloqueio de escopo de outra sessão sem chamada remota, preservação da fila sem `ack`/delete, publicação existente sem posse explícita e CAS do adapter.

Não houve deploy de rules, Storage ou hosting nesta correção. O reteste no navegador deve confirmar que o jogador deixa de tentar os dois IDs legados e que eventual erro residual identifica retrato, mantendo convite/membership confirmado separado.

## Fechamento remoto C05

Raiz publicou apenas firestore:rules; deploy confirmado em evidencias/correcao-final-firestore-deploy.log. No reteste real, Tentar sincronizar mudou Erro/permissão para Sincronizado e Jogador ao vivo, preservando Rodada2/PV7/presença/iniciativa15. Consulta remota confirmou os dois retratos em users/{uid}/portraits/{id} com dono do jogador e revisão1; os dois documentos raiz permanecem com os donos originais. Evidência sanitizada: evidencias/correcao-retratos-remoto-final.json. C05 aprovado.
