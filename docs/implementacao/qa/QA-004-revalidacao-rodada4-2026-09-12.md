# QA-004 — Revalidação rodada 4 (2026-09-12)

Validação executada sobre o build atual, sem alterações de produto nesta rodada. Preview real em `127.0.0.1:5183`, sem tocar a porta 5173; servidor encerrado ao final e `ss -ltnp` confirmou nenhuma escuta em 5183.

**Decisão: BLOCKED.** R3-01 (Compêndio) e R3-02 (campanha após reload) passaram. O mount frio passou no primeiro Tab, mas a navegação interna ainda não foca o título da rota, requisito explícito desta rodada. Permanecem limitações de backup/diário/anexos e de plataformas assistivas.

## Ambiente e gates

```text
Node v24.12.0
npm 11.6.2

$ npm test
Test Files  87 passed (87)
Tests       526 passed (526)

$ npm run typecheck
tsc -b — exit 0, sem diagnósticos

$ npm run build
241 modules transformed.
dist/assets/index-CMQrAK6H.js   596.66 kB (gzip 169.32 kB)
dist/assets/index-B9BIzTac.css   64.25 kB (gzip 10.47 kB)
exit 0; aviso de chunk acima de 500 kB

$ git diff --check
sem saída, exit 0
```

Smoke real contra o preview:

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
exit 0
```

O ciclo adicional do diálogo terminou com foco retornado ao botão de abertura (`dice-close`).

## Provas reais no build

### Compêndio: busca e detalhe

Em `/compendium`, o índice local carregou `1319 encontrado(s)`. Preencher o campo “Buscar por nome, categoria ou tag” com `adaga` resultou em `value: "adaga"`, uma linha e botão `Adaga equipment`. Clicar nele renderizou:

```text
detail: Adaga
source: Fonte: Capítulo 5 — Equipamento, p. 151
pack: Pack: phb-ptbr-local-2017@1.0.0
```

Isso confirma a integração real do router com o serviço local e a preservação de fonte/metadados. Categorias pendentes continuaram marcadas como `Pendente`, sem corpus inventado.

### Campanha: criação e reload

Em `/journey`, criei `QA4 Campaign`. Antes do reload a UI mostrou `Ativa: QA4 Campaign`; após reload mostrou novamente `Ativa: QA4 Campaign` e não exibiu “Nenhuma campanha local criada”. A implementação atual lista e hidrata uma campanha na inicialização em [bootstrap.tsx:118-124](/home/jesus/Progetos/RPG/src/app/bootstrap.tsx:118). O registro também permaneceu na store IndexedDB `campaigns`.

### Foco de mount e navegação interna

Em uma abertura fria de `/`, o foco inicial foi `BODY`; após um `Tab`, o foco foi o link `a[href="#main-content"]` com texto “Pular para o conteúdo”. R3-03 está corrigido para o mount inicial.

Na mesma sessão, cliquei o botão interno “Compêndio” a partir de `/`. A URL mudou para `/compendium`, mas após a atualização o foco permaneceu no botão “♜CompêndioRegras”; o `h1` “Compêndio” não recebeu foco. O efeito de foco em [AppShell.tsx:32-38](/home/jesus/Progetos/RPG/src/components/layout/AppShell.tsx:32) procura o `h1`, porém os títulos das features não têm `tabIndex` focável. Este é o bloqueador atual de acessibilidade da rodada.

### Dados e PWA offline

O diálogo global de dados rolou `1d20`, anunciou `Rolagem 1d20: dados 8; total 8.`, exibiu `8 → 8` no histórico, e o mesmo histórico reapareceu após reload e reabertura. O fluxo confirma persistência real do dado no IndexedDB.

Antes do corte offline em `/compendium`, `navigator.serviceWorker.controller` e o registro estavam presentes, com os caches `rpg-companion-pwa-shell-2026.09.11` e `rpg-companion-pwa-corpus-2026.09.11`. Com a rede desligada, o reload manteve `h1: Compêndio`, o índice e o badge `Offline disponível`; a rede foi restaurada antes de encerrar o navegador.

## Matriz de aceite atual

| Área | Estado | Evidência/limite |
| --- | --- | --- |
| Gates globais | PASSA | 526 testes, typecheck, build e diff check limpos. |
| Rotas/responsividade | PASSA | Smoke em 320/1280 px nas cinco rotas, sem overflow, um `<main>` e sem botões anônimos. |
| Compêndio | PASSA | Busca, seleção, detalhe, pack e fonte provados no build. |
| Campanha/reload | PASSA | Campanha criada reaparece ativa após reload e permanece na IndexedDB. |
| Dado/reload | PASSA | Resultado e histórico reaparecem após reload. |
| PWA offline | PASSA no cenário observado | Worker controlando, caches presentes e reload offline funcional. Atualização de versão durante draft não foi exercitada. |
| Teclado no mount frio | PASSA | Primeiro Tab alcança skip link. |
| Teclado na navegação interna | **BLOQUEADO** | Clique interno muda rota, mas foco fica no botão de navegação, não no título. |
| Backup/importação | NÃO PROVADO | `DataManagementPanel` não está montado por rota; JSON inválido, backup com anexo e recuperação não foram executados na UI. |
| Diário/anexos/mapa real | NÃO PROVADO | Jornada monta campanha/mapa; `JournalWorkspace` e read model de mapa não estão integrados nessa composição. |
| Ausência de backend | PASSA | Nenhum `fetch`, `XMLHttpRequest` ou `WebSocket` fora de testes; dados vêm do catálogo local. |

## Achado bloqueador atual

**R4-01 — Navegação interna não foca o título da rota.** Reprodução: abrir `/` no preview, clicar “Compêndio” na navegação principal e ler `document.activeElement`. Resultado: URL `/compendium`, título “Compêndio” presente, foco permanece no botão de navegação `♜CompêndioRegras`. O critério desta rodada exige foco no título após navegação interna. O achado é de produto/UI e não foi corrigido por QA.

## Limitações

Não foram executados instalação em Android/iOS, leitores de tela nativos, zoom real de navegador a 200/400%, conflito CAS em duas abas reais, export/import com JSON inválido ou anexos, uso de item consumível, diário por rota, nem atualização do Service Worker durante draft. O badge do Compêndio continua sendo passado como `offline: true` pelo router; nesta execução os caches e o controller existiam, então não houve reprodução de promessa incorreta, mas o caminho sem suporte/registro permanece fora da prova.

**Status final: BLOCKED até R4-01 ser corrigido e revalidado.**
