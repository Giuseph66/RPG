# QA-004 — aceite de completude — 2026-09-12

## Decisão

**ACCEPT.** Todos os gates locais desta rodada passaram. O entry principal
ficou abaixo do limite de 642,40 kB e a mesa física continua em um chunk lazy
separado. O relatório anterior estava `BLOCKED` porque media o build antes da
remoção de `three` e `cannon-es` do entry.

## Escopo e implementação verificada

- `CharacterSelectionRoute` monta a seleção em `/character` e permite seguir
  para a criação quando não há fichas.
- `/settings/data` monta `DataManagementPanel`, com backup manual,
  importação JSON, recuperação e reset seletivo.
- `/journey` monta o workspace do diário; a rota busca as entradas locais e
  sincroniza o dispatcher com o editor.
- `spend-resource` resolve saldo, capacidade, efeitos e rejeições no domínio.
- `consume-item` possui contrato, resolvedor, dispatcher, persistência do
  recibo e idempotência.
- `deleteCampaignAndContent` usa uma transação IndexedDB única para campanha,
  diário, mapas e assets, com rollback coberto por teste.
- A atualização PWA preserva draft pendente e comunica a existência de uma
  atualização entre instâncias.
- `hasPendingApplicationWork` mantém a atualização adiada nos estados de
  agregado `dirty`, `saving` e `conflict`; o estado de diário também bloqueia
  `dirty`, `saving`, `conflict` e `error`, liberando somente em `clean` ou
  `saved` (ou sem rascunho).
- `PhysicalDiceStage` é carregado com `import()` somente quando o overlay de
  dados abre. O fallback de `Suspense` é `aria-hidden` e a cena permanece
  decorativa, enquanto o resultado textual, rolagem, mobile e foco continuam
  sob responsabilidade do overlay.

## Gates automatizados

Executados na raiz do repositório:

```text
npx vitest run src/app/router.test.tsx src/app/bootstrap.test.tsx src/features/data-management/DataManagementPanel.test.tsx src/features/character/selection/CharacterSelection.test.tsx src/features/journey/journal/JournalEditor.test.tsx src/application/character/action-dispatcher.test.ts src/application/character/inventory-dispatcher.test.ts src/domain/rules/resources/resources.test.ts src/domain/inventory/inventory.test.ts src/application/campaign/campaign-dispatcher.test.ts src/infrastructure/persistence/indexeddb/persistence.test.ts src/infrastructure/pwa/pwa.test.ts tests/offline/pwa-draft-update.test.ts tests/offline/production-artifact.test.ts src/features/actions/Actions.test.tsx src/features/inventory/Inventory.test.tsx src/features/dice/DiceOverlay.test.tsx
```

Resultado: **17 arquivos e 110 testes passaram**.

```text
npx vitest run
```

Resultado: **92 arquivos e 588 testes passaram**. O jsdom registrou somente o
aviso esperado de `HTMLCanvasElement.getContext()` sem o pacote `canvas`.

```text
npm run typecheck
npm run build
git diff --check
```

Os quatro comandos passaram. O build transformou 264 módulos.

## Bundle e code splitting

O build produziu:

```text
dist/assets/index-K_v9lOVd.js               541.93 kB  (541932 bytes)
dist/assets/PhysicalDiceStage-CuRz9dss.js   705.21 kB  (705212 bytes)
```

O entry `541932` bytes está abaixo do máximo de `642400` bytes. A entrada
principal referencia `PhysicalDiceStage-CuRz9dss.js` por `import()`; o chunk
separado contém os fingerprints `WebGLRenderer` (three) e
`ConvexPolyhedron` (cannon-es). O build também gerou chunks lazy para
`selection`, `data-management`, `journal`, `compendium`, `campaign`, `map`,
`settings`, `actions`, `inventory`, `creation` e `sheet`.

O bundler ainda emite o aviso genérico para chunks acima de 500 kB, mas esse
aviso se aplica ao chunk 3D isolado e não viola o gate definido para o entry.

## Smoke em navegador

Foi iniciado `npm run dev -- --host 127.0.0.1 --port 5184` e, em seguida, o
artefato produzido foi servido com `npx vite preview --host 127.0.0.1 --port
5185`; ambos os processos foram encerrados ao final. A porta 5173 permaneceu
fora do escopo; após o encerramento somente `5173` continuava ouvindo.

No navegador real foram verificadas:

- `/character`: seleção vazia acessível, com “Nenhum personagem ainda” e
  “Criar personagem”.
- `/journey`: campanhas, mapa e editor/lista do diário montados.
- `/settings/data`: “Backup e recuperação”, importação JSON e reset seletivo
  visíveis.
- `/compendium`: catálogo com **1.382 resultados** e todas as categorias,
  sem rótulo “Pendente”.
- Overlay desktop: antes da abertura não havia canvas; depois havia diálogo,
  canvas e foco no campo de expressão; ao fechar, canvas e diálogo foram
  desmontados e o foco retornou ao acionador.
- Lazy limpo: em uma navegação nova, antes da abertura `canvas=0` e nenhum
  recurso `PhysicalDiceStage`; depois da abertura `canvas=1` e os módulos da
  mesa foram requisitados.
- Offline em produção: depois de uma navegação online, o Service Worker ficou
  ativo e o cache corpus continha `/assets/index-K_v9lOVd.js`, o chunk do
  compêndio e os chunks CSS/JS de `PhysicalDiceStage`. Com a rede desligada,
  `/compendium` renderizou, exibiu “Offline disponível” e abriu o overlay com
  diálogo e `canvas=1`, provando o reaproveitamento do chunk lazy cacheado.
- O worker foi exercitado com navegação e API fora do cache runtime pelo teste
  de política PWA: apenas GET de `/assets/` e `/corpus/` entram no corpus;
  navegação usa shell/fallback e métodos mutáveis/API não são armazenados.
- Overlay móvel em viewport `375×800`: a classe de `BottomSheet` foi montada,
  a mesa 3D apareceu, e o fechamento removeu canvas/diálogo e devolveu foco ao
  acionador.

O console do smoke registrou o `favicon.ico` 404 já conhecido e avisos do
Three.js sobre `THREE.Clock`, `PCFSoftShadowMap` e stalls do driver gráfico.
Não houve erro de execução da aplicação.

## Limites externos e conteúdo

Este aceite cobre os gates locais e o navegador Chromium usado no smoke. Ainda
não há prova em Android/iOS físicos, Safari, leitor de tela nativo, zoom físico
200/400%, CAS entre abas reais ou atualização do Service Worker durante uma
sessão real com draft. Essas verificações exigem os ambientes correspondentes.

O catálogo permanece parcial conforme `docs/criacao/14-CONTEUDO-E-FONTES.md`:
há 9 raças, subconjunto de subclasses, seis magias e catálogo parcial de
talentos. Aventura contém regras mecânicas resumidas, sem campanhas, PNJs,
mapas prontos ou procedimentos completos de mestre. Os 19 itens de
`docs/criacao/decisoes/PENDENCIAS.md` continuam bloqueados por decisão explícita
da mesa e não foram resolvidos por inferência.
