# Correção de carregamento inicial

## Implementação

O entry inicial deixou de importar o catálogo estático do compêndio, o SDK/adaptadores Firebase e o overlay completo de dados. `src/app/bootstrap.tsx` compõe o serviço sem itens e publica `registry.compendium.loadCatalog`; `src/app/lazy-compendium.ts` importa `STATIC_COMPENDIUM_ITEMS` na primeira abertura e usa a mesma Promise para chamadas concorrentes. `src/app/router.tsx` chama esse carregador ao entrar em `/compendium`, portanto a tela continua recebendo as 1.451 regras publicadas.

Firebase agora carrega a configuração primeiro e importa o módulo completo apenas quando há configuração disponível; a sessão local sem Firebase não baixa o SDK. O overlay de dados usa `LazyDiceOverlay`, preservando todos os exports públicos de `src/features/dice/index.ts`. O barrel de ícones mantém a API, mas os 20 ícones de jogo usados pelo produto foram copiados dos mesmos paths publicados para `src/assets/icons/known-game-icons.tsx`; o catálogo Gi completo ficou no chunk sob demanda `gi`.

O worker e a política PWA usam a versão `2026.10.05`, invalidando o shell/corpus após essa mudança. Durante a ativação, o worker lê as referências do entry e do manifesto publicado, resolve imports `./`/`../` relativos ao módulo e percorre módulos/CSS em `/assets/`, ícones em `/icons/` e a lista explícita dos dados publicados em `/dice/`, gravando o grafo no corpus; assim compêndio, dados, Gi, overlay, dados 3D e ícones permanecem disponíveis offline mesmo sem uma visita anterior. O prewarm é assíncrono em relação ao primeiro render (a instalação continua com o shell mínimo) e falhas de rede/quota são best effort; o caminho de `fetch` ainda guarda chunks novos requisitados depois.

## Medição

Com Node 24 (`/home/jesus/.nvm/versions/node/v24.12.0/bin` no `PATH`), o build da raiz produziu:

| Chunk | Tamanho | gzip | Estado |
| --- | ---: | ---: | --- |
| `index-OSjofsgb.js` | 2.812,19 kB | 784,42 kB | entrada inicial |
| `gi-ClBOv-GS.js` | 679,17 kB | 292,06 kB | ícones, preaquecido pelo worker |
| `static-DQz2a84V.js` | 858,65 kB | 281,51 kB | catálogo, preaquecido pelo worker |
| `firebase-IsO6xd00.js` | 131,44 kB | 39,34 kB | Firebase, sob demanda |

O baseline anterior do entry era 4.471,01 kB e 1.388,90 kB gzip (baseline histórico 4.467,16/1.388,01). A medição atual reduz 1.658,82 kB no arquivo e 604,48 kB gzip, aproximadamente 37,1% e 43,5%. O `PhysicalDiceStage` permanece separado em 718,65/185,75 kB. O HTML final só faz modulepreload de `index` e `react`; `gi`, `static` e `firebase` não entram no primeiro carregamento.

## Verificação

- `npm run typecheck` passou.
- Foco desta rodada: `router.test.tsx`, `SettingsPanel.test.tsx` e `pwa.test.ts`: **29 testes passaram**, incluindo prewarm de chunks de rotas ainda não visitadas. O foco adicional de ações passou **14 testes** no arquivo `Actions.test.tsx`; a regressão C07/PWA/DataManagement passou mais **17 testes**.
- Suíte focal de bootstrap/registry/lazy catalog, wizard, compêndio e transferência: **7 arquivos, 50 testes passaram**.
- A suíte focal passou **7 arquivos/50 testes**. A repetição completa com `--testTimeout=30000` terminou em **148 arquivos/1.044 testes passados, 2 falhos e 1 ignorado**; as falhas são `firestore-sync-adapter` e `remote-hydration-repository`, ambas em paths de sincronização fora deste ownership. `bootstrap.test.tsx` isolado passou **14/14** após a alteração.
- Build de produção passou sem erro, com o aviso esperado de chunks acima de 500 kB.
- QA browser iniciou uma sessão limpa em `127.0.0.1:4174`; a rota `/compendium` abriu o catálogo publicado depois do carregamento tardio. A correção de `getFirebaseConfigDiagnostic is not defined` está presente no bootstrap dinâmico e a sessão abriu sem esse erro.
- A prova automatizada de ativação confirmou cache para `compendium-route.js`, `data-management-route.js`, `gi-icons.js`, `DiceOverlay.js`, um import relativo de catálogo, CSS, ícones e um par `d20.json`/`d20.glb` sem visitar essas rotas. A sessão IAB final confirmou Regras (1.451 regras + reload), Ajustes com canvas 3D e `/data` na primeira abertura após parar o preview; evidências estão em [correcao-offline-final.md](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-offline-final.md), [correcao-offline-catalogo-completo.jpg](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-offline-catalogo-completo.jpg) e [correcao-offline-dados3d.jpg](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-offline-dados3d.jpg).
- Para o caminho cloud configurado, `createApplicationRuntime` aguarda o import do chunk Firebase antes de marcar o boot como pronto. Portanto o crítico mínimo medido é `index + firebase = 2.943,63 kB` brutos / `823,76 kB` gzip; somando os modulepreloads React, CSS do shell e HTML, a transferência crítica estimada é `3.010,29 kB` / `837,24 kB` gzip. Sem configuração cloud, o SDK Firebase não entra no boot.
- No `dist` deste build, o entry referencia 51 assets Vite e os 51 arquivos existem; o worker captura os caminhos absolutos `assets/...` do mapa de dependências e segue as referências recursivas entre chunks.

## Limites

O ensaio é uma instalação/cache aquecido online seguida de servidor local parado; endpoints externos do Firebase continuaram alcançáveis, portanto não representa primeiro carregamento sem rede nem telefone físico. A captura Chrome de importação ficou limitada pela extensão sem acesso a `file://`; a prova real de copy/replace foi registrada pela raiz no IAB.
