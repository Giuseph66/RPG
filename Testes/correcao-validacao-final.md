# Validação final — correções C14/C17

Data da revisão: 2026-10-05. Artefato analisado: `dist/assets/index-DdSVXcYs.js` e o
worker `2026.10.05` no checkout compartilhado. A revisão ficou limitada ao
wizard/rota de criação, à política PWA e à composição de carga; o painel de
sessão foi conferido somente para validar a integração de leitura descrita pela
QA.

## Wizard, rota e rascunho

Não encontrei regressão concreta nas mudanças recentes.

- O autosave é serializado por `draftSaveQueue`; a confirmação aguarda a fila
  antes de materializar e gravar a ficha.
- `deleteDraft` só é chamado depois de `saveCharacter` retornar sucesso. Em
  conflito/erro o rascunho permanece disponível.
- Uma ficha já materializada é aceita apenas quando a conta pode reutilizá-la e
  a impressão digital da criação continua idêntica. Edição concorrente ou outra
  conta bloqueia a substituição.
- A opção de cópia cria novo UUID, preserva o rascunho original e navega para o
  novo draft. A ficha existente não é aberta nem alterada por esse caminho.

Evidência já executada: `correcao-raiz-draft-focal.log` (25/25),
`correcao-raiz-draft-queue.log` (12/12) e
`correcao-raiz-draft-sessao-focal.log` (32/32). O foco do wizard/router também
foi registrado como 12/12 em `Testes/correcao-jogabilidade.md` e 50 testes no
foco integrado da interface.

## Sessão em modo somente leitura

O `SessionPanel` recebe `canManage=false` para jogador. A UI mantém histórico,
notas como `readOnly`, presença textual, ordem do encontro, PV, rodada e o
marcador `Em turno`; oculta criação, edição de notas, presença editável,
remoção, próximo turno, nova rodada e encerramento. O teste focal cobre PV
`7/10`, `Rodada 2`, `Em turno` e a ausência dos comandos de mestre.

## PWA e atualização

O worker `2026.10.05` remove somente caches antigos de shell. Caches corpus
anteriores ficam preservados; ao pedir um asset em `/assets/`, o worker consulta
o corpus atual e depois os corpus anteriores, mantendo chunks hashados de uma aba
que ainda usa a versão antiga. A ativação também percorre as referências do
entry, CSS, ícones e a lista publicada em `/dice/` para preaquecer rotas não
visitadas.

Evidência automatizada: `correcao-raiz-pwa-upgrade.log` (13/13). A prova de
navegador em `correcao-offline-final.md` abriu pela primeira vez offline Regras
com 1.451 entradas, fez reload, abriu Ajustes com dados 3D e abriu Backup sem
visita anterior. Essa prova é de cache instalado online seguido de parada do
preview; não representa primeira instalação já sem rede, modo avião do sistema,
Safari/iOS, Android físico ou atualização real em dispositivo. A preservação de
chunks durante upgrade permanece coberta pelo teste/harness atual.

## C17 — carga inicial total

O entry isolado não é a métrica total. Os valores abaixo usam os tamanhos Vite
registrados em `correcao-performance.md` e os artefatos do `dist`.

| Cenário | Bruto | gzip |
| --- | ---: | ---: |
| Baseline informado (entry) | 4.471,01 kB | 1.388,90 kB |
| Baseline histórico alternativo (entry) | 4.467,16 kB | 1.388,01 kB |
| Latest entry (`index`) | 2.815,06 kB | 785,31 kB |
| Latest boot local — entry + React + CSS + config + HTML | 2.882,78 kB | 799,31 kB |
| Latest boot com Firebase configurado — boot local + Firebase | 3.014,64 kB | 838,76 kB |
| Latest entry + static catalog + Firebase, sem suporte HTML/React/CSS/config | 3.805,57 kB | 1.106,28 kB |
| Latest entry + static catalog + Firebase + HTML/React/CSS/config | 3.876,07 kB | 1.120,32 kB |

O `dist/index.html` faz modulepreload somente de React; CSS também é recurso
crítico. O chunk `config` é importado durante o boot e por isso foi incluído,
embora o relatório de performance anterior o tenha omitido. Firebase só entra
quando as chaves estão configuradas. `static` (858,65/281,51 kB) e `gi`
(679,17/292,06 kB) são chunks lazy: não aparecem no HTML inicial, mas o worker
os preaquece após ativação para o requisito offline. PhysicalDice permanece
lazy (718,65/185,75 kB).

Assim, a redução do entry é 37,0% bruto e 43,5% gzip. Para o boot crítico com
Firebase, a carga medida é 3.014,64 kB bruto e 838,76 kB gzip; somando o
catálogo estático preaquecido, o cenário chega a 3.876,07 kB e 1.120,32 kB
gzip. Esse cenário não é o total da instalação: o prewarm completo também
busca `gi`, chunks de rota, CSS, ícones, modelos e metadados de dados. Ele
descreve transferência do boot mais o catálogo, não o primeiro paint. Não há
base para anunciar apenas 2.815,06 kB como carga inicial total.

O build final Node 24 (`npm run build`, status 0) registrou os artefatos e
SHA-256 em `Testes/evidencias/correcao-final-artifacts.log`: entry
`index-DdSVXcYs.js` 2.815.068 bytes, Firebase `firebase-NrGU-g1y.js`
131.863 bytes, catálogo `static-DKcCFh8R.js` 858.657 bytes, ícones
`gi-BxAkQDrD.js` 679.172 bytes, PhysicalDice
`PhysicalDiceStage-BWsdOR8T.js` 718.653 bytes, CSS crítico
`index-DEl5PPcy.css` 57.435 bytes e HTML 710 bytes. Os hashes completos ficam
no log para evitar duplicar a lista no relatório.

## C10 — revisão, rolagem e confirmação de cura

O diagnóstico separou a rolagem informativa dos chips de dano/cura da execução
de uma capacidade. Os chips agora enviam a rolagem como `free`, preservando o
rótulo e o histórico sem permitir que um host interprete `damage`/`healing` como
alteração automática de PV. Eles não chamam `onIntent`; cancelar a revisão
depois da rolagem mantém PV, slot e custo inalterados.

`Curar Ferimentos` usa o primeiro slot compatível ainda disponível, com o menor
nível, e a revisão informa explicitamente o nível escolhido, a fonte do
modificador e a cura limitada ao máximo de PV. Após confirmação bem-sucedida a
revisão é fechada, evitando que a nova revisão recalculada sem slot pareça uma
segunda aplicação ou uma pendência de seleção. Falha de commit mantém a revisão
repetível e não bloqueia uma nova tentativa.

Validação Node 24: focos `Actions`, `action-capabilities` e
`action-dispatcher`: 39/39; regressão integrada de `bootstrap` + `router`:
28/28. Esses 28 testes cobrem o dispatcher/overlay e o bootstrap, mas não
montam a UI real do chip dentro do bootstrap; portanto não há uma prova E2E
específica de chip→handler. A inspeção do caminho atual mostra que o quick
roll registra `DiceRoll`/histórico e não aplica PV; a aplicação de cura fica
restrita à confirmação da capacidade. A alteração histórica de PV observada
pela QA anterior não é reivindicada como reproduzida por este gate.

## Gates e limites

O gate final Node 24 foi executado com status real preservado: `npm test`
registrou 1.083 testes aprovados e 1 ignorado em 152 arquivos; `npm run
typecheck` passou no retry; `npm run build` passou. Logs: `correcao-final-test.log`,
`correcao-final-typecheck-retry.log`, `correcao-final-build.log` e
`correcao-final-artifacts.log`. O primeiro typecheck falhou apenas pela
inferência de `mock.calls` no teste novo e foi preservado em
`correcao-final-typecheck.log`; a anotação foi corrigida antes do retry verde.

Não houve dependência nova, alteração de schema, limpeza de IndexedDB ou deploy
externo. A ativação/publicação real do Firebase e a matriz de dispositivos
físicos continuam fora da prova local.

## Gate C03 base64 — checkpoint vigente em 05/10/2026

Este checkpoint sucede os números e bundles históricos acima. Novos mapas usam conteúdo base64 fragmentado no Firestore; não dependem de bucket Storage. Referências antigas continuam com leitor compatível.

- `npm test`: 152 arquivos passaram, 2 ignorados; 1.090 testes passaram, 3 ignorados. Status 0.
- `npm run typecheck`: status 0.
- `npm run build`: status 0. Aviso de chunks maiores que 500 kB permanece registrado; não representa falha do build. Entry atual `index-BdnNFltm.js`: 2.815,36 kB, gzip 785,39 kB.
- Foco do transporte/publicação/bootstrap: 39 testes aprovados.
- Emulador Auth/Firestore isolado: 2 testes executados e aprovados, incluindo adapter real e ACL. Na suíte comum, esses 2 casos ficam ignorados por ausência da variável de emulador; o terceiro ignorado é o caso intencional preexistente.

Logs atuais: `evidencias/correcao-mapas-base64-final-test.log`, `evidencias/correcao-mapas-base64-final-typecheck.log`, `evidencias/correcao-mapas-base64-final-build.log`, `evidencias/correcao-mapas-base64-regras.log`. Todos preservam status real.

Regras e índice `chunks.data` publicados no projeto existente, status 0 (`correcao-mapas-base64-deploy.log`). Reconstrução remota administrativa confirmou bytes e hashes de 1 e 3 chunks; autorização de jogador foi exercitada separadamente no emulador e na UI. Pequeno e grande renderizados no jogador depois de reload; mobile 360/390 sem overflow. Retomada reiniciou apenas servidor Vite interrompido e conferiu persistência no mestre; nenhuma dependência, cobrança ou limpeza de dados. Ocultação pareada aprovada: grande ausente do atlas/UI após sync/reload, pequeno preservado, sem limpeza de cache; ver `correcao-mapas-base64-jogador.md`.
