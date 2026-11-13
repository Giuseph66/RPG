# Handoff — persistência de propostas e criaturas

Atualizado em 2026-11-12. Lane pronta para revisão; não houve deploy, publicação nem alteração de arquivos staged. O bootstrap e seus testes permaneceram sob ownership de `regras_retomada`.

## Entrega

- O banco IndexedDB está na versão 6. A migração cria `proposals` e o índice `campaignId`; as stores de criaturas, avistamentos, palpites e outbox existentes são preservadas.
- Propostas entram como pendentes e são validadas antes de persistir. A aprovação usa CAS e grava criatura/revelação e outbox dentro da mesma `IndexedDbUnitOfWork`. Uma proposta sem ND aplicável continua como rascunho; o mestre pode fornecer `reviewedStatBlock` e a aprovação exige ND válido.
- Hidratação reconhece propostas, limita snapshots às campanhas ativas, preserva operações locais pendentes e remove registros que deixaram de estar visíveis no escopo de campanha de jogador. Tombstones recentes impedem ressurreição após exclusões locais.
- A cascata local de campanha inclui propostas e preserva registros de outras campanhas. O reset de campanhas limpa as quatro stores de criaturas sem deixar órfãos.
- O backup adiciona arrays opcionais `creatures`, `sightings`, `guesses` e `proposals`; arrays ausentes em backups antigos viram `[]`. Cópias remapeiam IDs e referências, preservam `accountId`, `proposedBy` e `reviewedBy`, e recalculam IDs determinísticos de avistamento/palpite.
- ACL Firestore permite ao jogador criar e consultar somente as próprias propostas pendentes; apenas o mestre revisa com revisão incremental/CAS. A regra nega aprovação do rascunho com CR `null` sem override, aceita revisão com CR aplicável e limita `size` aos seis valores do domínio (`colossal` é recusado). Registros permanecem privados até reveal e a edição colaborativa de PV não permite alterar snapshot, classes ou inventário.

## Evidência de teste

Todos os testes IndexedDB abaixo usam o `fake-indexeddb` já instalado e carregado em `tests/setup.ts`; exercitam os repositórios e unidade de trabalho de produção sobre essa implementação em memória. Não são evidência de Chromium/IndexedDB do navegador.

- `src/infrastructure/persistence/indexeddb/creature-proposal-persistence.test.ts`: cria um banco v5 populado com personagem, campanha, outbox, criatura, avistamento e palpite; abre o banco pelo migrador de produção e verifica versão 6, store/índice novos e igualdade dos registros antigos. No mesmo arquivo, submissão e revisão exercitam CAS; uma colisão injetada no enqueue final faz a aprovação falhar e prova que a proposta continua pendente, nenhuma criatura/avistamento parcial aparece e o outbox anterior permanece.
- `src/application/transfer/backup.test.ts`: exporta, serializa e reimporta um envelope que preserva PV atual e original, forma ativa, snapshot original, `formHp`, avistamentos vistos, proposta, records e reveal. Também cobre backup legado sem os quatro arrays, rejeição de conteúdo inválido e cópia com IDs/referências remapeados. Esses testes isolam o serviço de transferência com repositórios e callback de commit simulados; não substituem o teste do writer abaixo.
- `src/app/bootstrap.test.tsx`, caso `importa as quatro coleções de criaturas atomicamente em replace/copy e reseta com campanhas`: usa runtime/bootstrap e IndexedDB de teste reais. Exporta/importa a campanha com personagem em forma ativa, PV originais `17/2`, PV da forma `4/5`, snapshot/ref da forma e `beastSightings`; confirma também reveal de statBlock e registros de criaturas, avistamentos, palpites e proposta. Registros de outra campanha permanecem intactos. O mesmo caso rejeita proposta inválida sem alterar snapshot das quatro stores, faz `copy` e reset de campanhas.
- `src/infrastructure/persistence/indexeddb/persistence.test.ts`: remove proposta da campanha apagada e mantém proposta da campanha restante; também prova rollback da cascata quando um delete intermediário falha.
- `src/infrastructure/persistence/indexeddb/remote-hydration-repository.test.ts`: hidrata proposta própria remota, remove proposta obsoleta de outra autoria e conserva uma proposta local que ainda tem operação pendente. Os demais casos focam campanha/visibilidade/tombstones.
- `src/application/campaign/creature-service.test.ts` e `src/infrastructure/cloud/firebase/firestore-sync-adapter.test.ts`: cobrem a revisão do rascunho com CR desconhecido e a preservação do autor no documento quando o mestre revisa.
- `tests/rules/creature-proposal-rules.test.ts` roda contra o emulador Firebase local. Cobre leitura/listagem própria e do mestre, nega autoaprovação, autoria forjada, coleção não filtrada, tamanho inválido (`colossal`) e aprovação sem CR; aceita arbitragem válida do mestre com CAS. Também cobre privacidade de criatura/reveal, avistamentos e palpites, além de alteração de PV da forma/saída sem mudança de PV original, snapshot, classes ou inventário.

Comando focal final:

```sh
npx vitest run src/application/campaign/creature-service.test.ts src/application/transfer/backup.test.ts src/infrastructure/persistence/indexeddb/creature-proposal-persistence.test.ts src/infrastructure/persistence/indexeddb/persistence.test.ts src/infrastructure/persistence/indexeddb/remote-hydration-repository.test.ts src/infrastructure/cloud/firebase/firestore-sync-adapter.test.ts src/app/bootstrap.test.tsx
```

Resultado: 7 arquivos e 88 testes passaram. O teste isolado de transferência também passou após as asserções de snapshot/reveal serem reforçadas: `npx vitest run src/application/transfer/backup.test.ts` (8/8).

Comando do emulador isolado (Auth em `9198`, Firestore em `8282`, projeto `demo-rpg-proposal-acl`):

```sh
DEBUG= FIREBASE_RULES_EMULATOR=1 FIRESTORE_RULES_HOST=127.0.0.1:8282 FIREBASE_AUTH_RULES_HOST=127.0.0.1:9198 firebase emulators:exec --config /tmp/rpg-proposal-rules-emulator.json --only auth,firestore --project demo-rpg-proposal-acl "npx vitest run tests/rules/creature-proposal-rules.test.ts"
```

Resultado: 1 arquivo, 3 testes passaram. O emulador usou um projeto `demo-*` e não acessou serviço hospedado. A porta 8080 já estava ocupada por processo alheio; foi preservada e o teste executado nas portas isoladas acima. Nenhuma conta real ou deploy foi usado.

## Limites

- A rodada final foi focal (88 testes mais 3 testes de regras no emulador); a suíte completa, typecheck global e build não foram executados nesta lane.
- O roundtrip completo conjunto está provado através do runtime/bootstrap usando fake-indexeddb; a transferência isolada também tem testes com repositórios simulados para validação, legado e remapeamento. Nenhum dos dois equivale a IndexedDB no Chromium.
- O emulador prova as regras Firestore, não latência, disponibilidade nem comportamento de uma conta/projeto Firebase hospedado. O teste do adapter é unitário com Firestore simulado.
- A regra de saída de forma valida a transição já normalizada: conserva `hp.current` original, valida `hp.temp` não negativo e restringe o diff aos campos colaborativos/transformation. Como o domínio remove o marker da forma antes de salvar, a regra não distingue se a saída veio de zero PV ou condição inconsciente; não foi adicionado marker causal.
- Os diffs staged anteriores e de outras lanes foram preservados; nada foi staged, resetado ou commitado por esta lane.
