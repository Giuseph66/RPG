# QA-004 — Revalidação integrada (2026-09-12)

Esta evidência registra a execução atual sobre o worktree. A decisão é **BLOCKED**: os gates globais e o smoke estrutural passam, mas ainda há falhas de composição no Compêndio, na restauração de campanha e no foco inicial de teclado.

Ambiente: Node `v24.12.0`, npm `11.6.2`, Chromium via `playwright_cli.sh`, build servido com `npx vite preview --port 5183 --strictPort --host 127.0.0.1`. A porta 5173 não foi usada. O preview foi encerrado; `ss -ltnp | grep ':5183'` não encontrou processo escutando.

## Gates globais

```text
$ npm test
Test Files  86 passed (86)
Tests       520 passed (520)

$ npm run typecheck
tsc -b — exit 0, sem diagnósticos

$ npm run build
241 modules transformed.
dist/assets/index-jFSQ-VnM.js  595.26 kB (gzip 168.93 kB)
dist/assets/index-B9BIzTac.css 64.25 kB (gzip 10.47 kB)
exit 0; aviso de chunk acima de 500 kB

$ git diff --check
sem saída, exit 0
```

## Smoke de rotas e interação global

Comando:

```text
BASE_URL=http://127.0.0.1:5183 bash tests/acceptance/acceptance-matrix.sh
```

Resultado: `exit 0`. As dez combinações (`/`, `/character`, `/actions`, `/journey`, `/compendium` em 320 e 1280 px) reportaram `overflow: false`; todas passaram `main: 1` e `unnamedButtons: 0`. O diálogo global de dados abriu, recebeu foco, fechou e devolveu foco ao botão de abertura.

## Matriz factual

| Área | Observação atual | Resultado |
| --- | --- | --- |
| Sessão/navegação | `/`, `/character/create`, `/actions`, `/journey` e `/compendium` abriram no preview. A criação exibiu “Etapa 1 de 9: Identidade”; estados vazios de ações, jornada e mapa ficaram explícitos. | Passa parcialmente |
| Criação/draft | Preenchi `QA Session Character`, cliquei “Salvar rascunho” e a UI exibiu “Rascunho salvo”. Após reload, o campo voltou vazio e “Nome é obrigatório” reapareceu. | Bloqueado para round-trip de draft |
| Dado/persistência | O header rolou `1d20` com resultado real `1`, anunciou em `role=status`, e o histórico permaneceu após reload e reabertura do diálogo. IndexedDB confirmou stores `rolls`, `characters`, `campaigns`, `drafts`, `assets`, `maps`, `journalEntries` e `recovery`; o registro de rolagem tinha `faces:20`, `rawDice:[1]`, `total:1`. | Passa para dado/histórico |
| Campanha | Criei `QA Campaign`/`Sessão de aceite`; a UI mostrou “Ativa: QA Campaign”. Após reload mostrou “Nenhuma campanha local criada”, embora o store `campaigns` ainda contivesse o registro com revisão 1. | **Bloqueador** |
| Compêndio | Carregou `1319 encontrado(s)`, definições locais, fontes e categorias `Pendente`. Preencher `adaga` não alterou o input controlado nem a lista (permaneceu 1319); clicar `Adaga equipment` manteve “Selecione uma definição”. | **Bloqueador** |
| Jornada/mapa | Campanhas, objetivos, missões, NPCs e locais vazios têm mensagens claras; mapa sem imagem informa importação local. O aviso de read model/callbacks de mapa continua visível. | Parcial; diário/anexos não provados |
| PWA/offline | Antes do corte offline, `navigator.serviceWorker.controller === true`, havia registro e caches `rpg-companion-pwa-shell-2026.09.11` e `rpg-companion-pwa-corpus-2026.09.11`. Com a rede desligada, reload de `/compendium` manteve título, índice e badge. | Passa no cenário observado |
| Acessibilidade | Smoke passou landmarks, nomes de botão e foco do diálogo. Em reload frio de `/`, `document.activeElement` era `h1#route-title`; o primeiro `Tab` caiu em “Criar personagem”, pulando “Pular para o conteúdo”. | **Bloqueador** |
| Backup/recuperação | `DataManagementPanel` só aparece em seus próprios arquivos/testes e não é montado por rota. A rota de jornada monta campanha/mapa, sem `JournalWorkspace`. Export/import, JSON inválido, anexos e recuperação de personagem não foram exercitados na UI. | Não provado |
| Backend | Busca textual em `src` não encontrou `fetch`, `XMLHttpRequest` ou `WebSocket` fora de testes. O catálogo é local e embutido no bundle. | Passa |

## Achados reproduzíveis

### R3-01 — Busca/seleção do Compêndio não integrada

Reprodução: build, preview em 5183, abrir `/compendium`, preencher “Buscar por nome, categoria ou tag” com `adaga` e clicar “Adaga equipment”. O valor controlado retorna vazio, a lista permanece com 1319 itens e o detalhe não aparece. [router.tsx:126-128](/home/jesus/Progetos/RPG/src/app/router.tsx:126) passa filtros fixos e não fornece `onFiltersChange`, `onSelect`, favoritos ou carregamento de categoria. O serviço local existe, mas a composição não o liga à UI.

### R3-02 — Campanha gravada não é restaurada na sessão

Reprodução: criar campanha em `/journey`, confirmar “Ativa: QA Campaign”, recarregar. A UI volta a “Nenhuma campanha local criada”. Leitura direta do IndexedDB encontrou o registro `QA Campaign`, descrição `Sessão de aceite` e revisão `1`. [bootstrap.tsx:97-108](/home/jesus/Progetos/RPG/src/app/bootstrap.tsx:97) hidrata/seleciona apenas o personagem ativo; não há hidratação equivalente de campanha no boot.

### R3-03 — Primeiro Tab pula o skip link

Reprodução: abrir `/` em sessão fria, ler o foco e pressionar `Tab`. O foco inicial é `h1#route-title` e o primeiro Tab vai para “Criar personagem”, não para “Pular para o conteúdo”. O auto-foco é executado também no mount inicial em [AppShell.tsx:31-33](/home/jesus/Progetos/RPG/src/components/layout/AppShell.tsx:31).

### R3-04 — Badge offline é afirmado sem estado do worker

[router.tsx:128](/home/jesus/Progetos/RPG/src/app/router.tsx:128) sempre passa `offline: true`. Nesta sessão havia worker controlando a página e caches disponíveis, portanto não houve falha reproduzida. O caminho sem suporte/registro de Service Worker não foi simulado; fica como risco de honestidade e limitação, sem elevar a bloqueador nesta rodada.

## Limitações

Não foram executados dispositivo físico PWA, leitores de tela nativos, zoom real a 200/400%, segunda aba real com conflito de personagem, export/import com anexo ou JSON inválido, uso de consumível, diário montado por rota, nem atualização do Service Worker durante draft. Testes unitários, de componente e de repositório continuam provas de camadas inferiores, não substitutos dos fluxos de composição acima.

**Decisão final:** `BLOCKED`. Os gates e o smoke estrutural têm evidência atual; QA-004 não deve ser marcado `ACCEPT` enquanto R3-01, R3-02 e R3-03 forem reproduzíveis.
