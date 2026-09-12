# QA-004 — Revalidação rodada 5 (2026-09-12)

Validação executada sobre o build atual, sem alterações de produto nesta rodada. O preview real usou `127.0.0.1:5183`, sem tocar a porta 5173; foi encerrado ao final e `ss -ltnp` confirmou a porta 5183 livre.

**Decisão: ACCEPT.** Os três critérios de foco desta rodada passaram no navegador: o primeiro Tab no mount frio alcança o skip link, a navegação interna muda a rota e foca o novo título, e o diálogo de dados devolve foco ao botão que o abriu. Os gates globais, a matriz de rotas e o cenário offline também passaram.

## Ambiente e gates

```text
Node v24.12.0
npm 11.6.2

$ npm test
Test Files  87 passed (87)
Tests       526 passed (526)
exit 0

$ npm run typecheck
tsc -b — exit 0, sem diagnósticos

$ npm run build
vite v8.3.0
241 modules transformed.
dist/assets/index-B9BIzTac.css   64.25 kB (gzip 10.47 kB)
dist/assets/index-CcJ9GP_l.js   596.68 kB (gzip 169.33 kB)
exit 0; aviso de chunk acima de 500 kB

$ git diff --check
sem saída, exit 0
```

O script `npm run preview` não existe no `package.json`; o build foi servido com `npx vite preview --host 127.0.0.1 --port 5183 --strictPort`. O smoke real terminou com exit 0:

```text
$ BASE_URL=http://127.0.0.1:5183 bash tests/acceptance/acceptance-matrix.sh
/ 320 "overflow": false
/ 1280 "overflow": false
/character 320 "overflow": false
/character 1280 "overflow": false
/actions 320 "overflow": false
/actions 1280 "overflow": false
/journey 320 "overflow": false
/journey 1280 "overflow": false
/compendium 320 "overflow": false
/compendium 1280 "overflow": false
dice-close ```
exit 0
```

## Provas reais no build

### Foco de teclado

Em uma abertura fria de `/`, antes da interação o foco foi `BODY`. Após o primeiro `Tab`, `document.activeElement` foi:

```json
{"tag":"A","id":"","text":"Pular para o conteúdo","href":"#main-content"}
```

A partir de `/`, clicar o botão interno “Compêndio” mudou a URL para `/compendium`. A leitura posterior foi:

```json
{"path":"/compendium","heading":"Compêndio","focus":{"tag":"H1","id":"compendium-title","text":"Compêndio"}}
```

O foco retornou ao título novo, satisfazendo R4-01. O comportamento está implementado no shell em [AppShell.tsx:32-42](/home/jesus/Progetos/RPG/src/components/layout/AppShell.tsx:32), que torna o `h1` focável durante a troca de rota.

### Diálogo de dados

Ao clicar “Abrir rolagem de dados”, o diálogo apareceu e o campo de expressão recebeu foco dentro de `[role=dialog]`:

```json
{"dialog":true,"active":{"tag":"INPUT","aria":null}}
```

Ao clicar “Fechar”, o diálogo desapareceu e o foco voltou ao abridor:

```json
{"dialog":false,"active":{"tag":"BUTTON","aria":"Abrir rolagem de dados"}}
```

### PWA/offline

No build em `/compendium`, antes de desligar a rede, havia controller e registro de Service Worker, com os caches `rpg-companion-pwa-shell-2026.09.11` e `rpg-companion-pwa-corpus-2026.09.11`. Com a rede desligada, o reload preservou:

```json
{"path":"/compendium","heading":"Compêndio","offlineText":true,"hasResultsText":true,"controller":true}
```

A rede foi restaurada antes de encerrar o navegador.

## Matriz de aceite

| Área | Estado | Evidência/limite |
| --- | --- | --- |
| Gates globais | PASSA | 526 testes, typecheck, build e diff check limpos. |
| Rotas/responsividade | PASSA | Smoke em 320/1280 px nas cinco rotas, sem overflow e sem botões anônimos. |
| Foco no mount frio | PASSA | Primeiro Tab alcança o skip link. |
| Foco na navegação interna | PASSA | `/` → `/compendium` foca `h1#compendium-title`. |
| Diálogo de dados | PASSA | Foco entra no diálogo e retorna ao botão abridor. |
| PWA offline | PASSA no cenário observado | Controller/caches presentes e reload offline do Compêndio funcional. |
| Compêndio/campanha/dado | PASSA | Busca/detalhe, campanha após reload e histórico de dado já provados nas rodadas anteriores; a suíte atual permaneceu verde. |
| Backup/importação | NÃO PROVADO | `DataManagementPanel` não está montado por rota; JSON inválido, backup com anexo e recuperação não foram executados na UI. |
| Diário/anexos/mapa real | NÃO PROVADO | `JournalWorkspace` e read model de mapa não estão integrados nessa composição. |
| Ausência de backend | PASSA | A matriz usa o catálogo local; rede foi desligada com o shell já em cache. |

## Limitações conhecidas

Não foram executados instalação em Android/iOS, leitores de tela nativos, zoom real de navegador a 200/400%, conflito CAS em duas abas reais, export/import com JSON inválido ou anexos, uso de item consumível, diário por rota, nem atualização do Service Worker durante draft. O badge do Compêndio continua sendo passado como `offline: true` pelo router; nesta execução o controller e os caches existiam, portanto não houve reprodução de promessa incorreta, mas o caminho sem suporte/registro permanece fora da prova.

Somente este arquivo foi criado nesta rodada dentro do ownership de QA; nenhum produto, configuração ou documento de swarm foi alterado.

**Status final: ACCEPT.**
