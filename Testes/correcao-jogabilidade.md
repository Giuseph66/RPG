# Correção de jogabilidade e integração

## Escopo

Esta rodada corrigiu as falhas de morte, ações, estado da ficha, router e publicação inicial de magia que pertenciam ao owner de jogabilidade. A descoberta estrutural consultou Codebase Memory; como `rg` não está disponível, a confirmação textual usou `grep`/`sed` somente nos arquivos relacionados.

## Implementado

- `src/domain/rules/combat/index.ts` e `combat.test.ts`: dano que leva PV positivos a zero inicia a queda sem falha de morte; dano recebido já em zero registra uma falha (ou duas em crítico). A regressão cobre sucessos prévios e o dano seguinte.
- `src/app/router.tsx`: finalização do wizard navega para `/character/:id`; o painel de participantes também é entregue ao jogador, com confirmação de posse da ficha antes do vínculo; estados e callback de sync são repassados à rota. A rota de ações recebe descanso, carga, deslocamento e velocidade derivados.
- `src/application/character/action-dispatcher.ts` e teste focal: após commit, o personagem é reidratado pelo repositório, atualizando revisão, PV e recursos antes da próxima ação e preservando o CAS.
- `src/features/actions/Actions.tsx`: a falta de prévia é tolerada somente para ataque que aguarda CA; descanso usa os IDs reais `rest:short`/`rest:long`; cancelamento não envia intent e as outras capacidades mantêm seus bloqueios e pendências.
- `src/application/character/action-capabilities.ts`, `command-dispatcher.ts` e `src/domain/spells/index.ts`: ataque publica CA/dano e exige CA na execução; cura e magia têm prévia `RuleResult`, seleção explícita da própria ficha, custo de espaço visível e execução real. Cura bloqueia PV zero e condições incapacitantes sem gastar espaço. `Curar Ferimentos` usa o modificador final da habilidade da fonte de conjuração, portanto Bardo usa CAR e Clérigo usa SAB; upcast acrescenta dados por círculo sem duplicar o bônus.
- `src/data/spells/spells.ts`, `src/domain/contracts/definitions/spell.ts` e testes: o catálogo publica 16 magias, com seis definições estruturadas e dez opções locais do Livro para a criação inicial de Bardo marcadas `automationStatus: "blocked"` e com fonte/página. Há pelo menos dois truques, incluindo Prestidigitação e Zombaria Viciosa, e quatro magias de 1º círculo reais, incluindo Curar Ferimentos, Disfarçar-se, Enfeitiçar Pessoa e Fogo das Fadas. O manifesto registra `spell: 16` e checksum `8ea73514`.
- `src/data/classes/classes.ts`, `content.test.ts` e `src/domain/character/creation/validate.ts`: Bardo publica escolhas de 2 truques e 4 magias, progressão de conhecidos e dois espaços de 1º nível; validação rejeita magia fora da classe, truque que não seja nível 0 e círculo acima do nível disponível. A proficiência de rapieira permanece publicada.
- `src/domain/rules/derived/derive-character.ts` e teste: normalização reconhece proficiências por ID exato e categorias de armas; Bardo humano com DEX final 15, PB +2 e rapieira equipada produz ataque +4 e dano +2 usando o pack real.
- `src/domain/character/creation/creation.test.ts`: criação materializada de Bardo nível 1 usa o catálogo real, duas opções de truque e quatro magias de 1º círculo, preservando fonte CAR e o espaço publicado.
- `src/features/inventory/inventory.module.css`: campo de quantidade móvel passou de altura mínima 36px para 44px, mantendo largura e o contêiner com overflow horizontal controlado.

## Contratos e migrações

Não houve migração de armazenamento, limpeza de dados ou dependência nova. Os contratos alterados são o marcador neutro `bonusPerCastingSourceAbility` da cura e a publicação de escolhas/slots iniciais da classe. A disponibilidade automatizada continua explícita: as entradas bibliográficas sem efeitos estruturados não executam regras inventadas.

## Provas executadas

Com Node 24 em `/home/jesus/.nvm/versions/node/v24.12.0/bin`:

- `.../node node_modules/typescript/bin/tsc -b` — passou.
- Catálogo, criação real e manifesto: 6 arquivos, 41 testes aprovados na rodada focal.
- Foco de router e layout: `router.test.tsx` 12/12 e `AppShell.test.tsx` 6/6, incluindo lazy compendium, estados de sync e overlay assíncrono; os demais focos de combate, derivados, magia, ações, criação, catálogo e rulepack também estão incluídos no gate integral abaixo.

As provas cobrem morte inicial e dano posterior, CA obrigatória e cancelamento sem gasto, cura com consumo de espaço e bônus final de CAR/SAB, bloqueio por incapacidade, upcast, hidratação/revisão após commit, proteção de vínculo do jogador, navegação final, deslocamento, escolhas de magia por classe/círculo, criação real de Bardo e ataque de rapieira.

## Limites e handoff

A catalogação bibliográfica adicional é suficiente para as escolhas iniciais do Bardo, mas permanece bloqueada para execução até receber estrutura de efeitos; somente Curar Ferimentos e as magias canônicas já têm resolução automatizada. A seleção visual do wizard e a infraestrutura de compendium/performance seguem com os owners correspondentes. Não foi suprimido erro global de WebGL/canvas; os testes que precisam de Dice3D usam isolamento específico.

## Integração de router e runtime

- `src/app/router.tsx` agora chama o lazy loader do registro ao montar `CompendiumRoute`, mantém estado de carregamento/erro e só renderiza a consulta após o catálogo real chegar. A busca de `ábaco` foi verificada no navegador e abriu o detalhe com texto e fonte (`1.451 regras`, duas correspondências).
- `connectionFor` preserva `pending` e `error`; o cabeçalho exibe respectivamente `sincronizando` e `erro de sincronização`, sem promover estados intermediários a `ao vivo` ou `sem conexão`. A rota de jornada repassa o estado e callback de sincronização ao painel de colaboração.
- A publicação de `SPELL_DEFINITIONS` passou a ser usada pelo acesso por classe, mantendo as dez opções bibliográficas do Bardo visíveis para seleção e bloqueadas para execução até existir efeito estruturado.

## Validação integrada final

Com Node 24 em `/home/jesus/.nvm/versions/node/v24.12.0/bin`, a suíte integral terminou verde: 150 arquivos aprovados, 1 ignorado; 1.044 testes aprovados e 1 ignorado. Os logs duráveis estão em `Testes/evidencias/gate-npm-test.log`, `gate-typecheck.log` e `gate-build.log`. `npm run typecheck` e `npm run build` também passaram; o build deixou apenas o aviso de chunks grandes do Vite.

`src/app/router.test.tsx` acrescentou uma regressão de loader lazy que falha na primeira tentativa, conserva o erro sem liberar detalhe parcial e recupera por retry ao carregar uma categoria; o foco passou 12/12.

O teste focal de `AppShell` passou com 6 testes após trocar a espera fixa de 20×10 ms por `vi.waitFor`, evitando falha intermitente enquanto o overlay lazy resolve. Os avisos de `HTMLCanvasElement.getContext` continuam limitados ao jsdom; não foi suprimido erro global de WebGL/canvas.

## QA manual reproduzível

No Chrome em `http://localhost:5173`, a ficha sintética existente `Íria QA Mobile` (Bardo humano, DEX 15, CAR 16, PV 1/10, rapieira equipada) foi somente consultada e teve prévias canceladas:

- Ações mostrou movimento `Restam 9 m de 9 m` e rapieira com `Rolar Ataque +4`/`Rolar Dano 1d8+2`. A revisão de ataque exibiu CA obrigatória, `Ataque: 1d20 +4 contra CA informada`, `Dano: 1d8 +2` e confirmação desabilitada sem CA.
- A revisão de `Curar Ferimentos (nível 1)` exibiu `Conjura na própria ficha`, `Custo: Tempo action` e `Espaço 1º nível`; foi cancelada sem consumir slot. A prévia de descanso longo exibiu PV `1 → 10`, nenhum dado gasto e o botão `Descansar 8 horas`; também não foi confirmada.
- Regras carregou o catálogo real após a navegação lazy; busca e detalhe de `Ábaco` mostraram fonte `Capítulo 5 — Equipamento, p. 152`.

As capturas estão salvas em `Testes/evidencias/qa-attack-review.png`, `qa-heal-review.png` e `qa-compendium-abaco.png`; as observações textuais estão em `Testes/evidencias/qa-final-jogador.txt`. O badge do ambiente QA mostrou `Mestre da campanha · erro de sincronização`; isso confirma o estado de erro verdadeiro, mas impede alegar uma prova online de recebimento entre duas sessões. O vínculo do jogador e os fluxos de campanha compartilhada permanecem cobertos pelos testes e aguardam backend disponível para uma nova captura.

## Handoff

Não houve migração de armazenamento, limpeza de dados ou dependência nova. Os contratos alterados são o marcador neutro `bonusPerCastingSourceAbility`, a publicação de escolhas/slots iniciais do Bardo e o estado explícito de conexão/lazy loader. A execução real de cura/descanso/ataque foi provada pelos testes de domínio e dispatcher; a QA manual ficou em prévias/cancelamentos para preservar a ficha sintética.
