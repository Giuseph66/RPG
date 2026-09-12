# QA-003 — evidência offline em produção

Data da execução: 2026-09-11. Artefato gerado com `npm run build`. Ambiente de
prova: Chromium 147.0.7727.101 em Debian GNU/Linux, Playwright CLI 0.1.19 e
Vite Preview em `http://127.0.0.1:4174/`. A porta 5173 não foi usada nem
alterada.

## Comandos repetíveis

```text
npm run build
npx vitest run tests/offline/production-artifact.test.ts src/infrastructure/pwa/pwa.test.ts
npm run typecheck
git diff --check
```

Resultado: build, typecheck e diff check passaram; 9 testes focais passaram.
O teste `tests/offline/production-artifact.test.ts` lê os arquivos em `dist/`
gerados pelo build e confirma manifesto, ícones PNG, fallback, worker
versionado, cache names e rotas de navegação/corpus.

## Cenários demonstrados no navegador real

| Cenário | Resultado observado |
| --- | --- |
| Cold start em artefato de produção | `GET /compendium` retornou 200, título `RPG Companion`; o worker foi registrado e o shell abriu. |
| Warm start | Após reload, `navigator.serviceWorker.controller === true`; caches observados: `rpg-companion-pwa-shell-2026.09.11` e `rpg-companion-pwa-corpus-2026.09.11`. |
| Rede desligada após cache | Com `network-state-set offline`, reload de `/compendium` manteve o título, `Offline disponível` e a entrada local `Ábaco`. |
| Recarga de rota profunda offline | `/compendium/spells/fire-bolt` preservou a URL profunda e renderizou o shell/Compêndio usando o fallback para `index.html`. |
| Asset somente em cache antigo | Um asset colocado exclusivamente em `rpg-companion-pwa-corpus-2026.09.10` retornou 503 offline; o worker não consultou o cache antigo. |
| Manifesto e ativos | `GET /manifest.webmanifest` e `GET /pwa-worker.js` retornaram 200; os ícones locais são PNG 192x192 e 512x512. |

## Cenários cobertos por teste determinístico

`src/infrastructure/pwa/pwa.test.ts` prova a decisão de adiar atualização
quando `hasPendingWork()` retorna true, a mensagem `SKIP_WAITING` só depois de
liberar o trabalho, e os diagnósticos de ambiente sem Service Worker, falha de
registro e falha de `CacheStorage`. Essa prova usa a API injetável e não é
apresentada como prova de rede offline.

## Limitações concretas

- O shell atual não expõe uma operação de save/draft ao navegador de QA que
  permita produzir um update real enquanto há trabalho pendente. A política é
  exercitada pelo contrato injetável e pelo predicado dos stores; a aplicação
  não chama `applyUpdate` automaticamente.
- A sessão durante uma atualização não foi forçada neste runner: isso exigiria
  publicar uma segunda versão no mesmo origin e uma UI/dispatcher de decisão.
  O worker aceita apenas `SKIP_WAITING` com a versão correta e não força reload.
