# SUP-03 · Interface de criaturas e complementos

## Handoff parcial

Status: em andamento; esta entrega não representa conclusão de SUP-03. O primeiro lote passou em **22 testes focais**. Após correções de ND ausente, tags opcionais, acentos, elegibilidade real de Forma Selvagem e interações de proposta, o conjunto anterior passou em **42 testes**, incluindo wizard e editor. O comando combinado anterior foi:

```sh
npm test -- src/features/compendium/Compendium.test.tsx src/features/compendium/CreatureCatalog.test.tsx src/components/creatures/StatBlock.test.tsx
npm test -- src/features/journey/creatures/creatures.test.tsx
npm test -- src/features/compendium/Compendium.test.tsx src/features/compendium/CreatureCatalog.test.tsx src/components/creatures/StatBlock.test.tsx src/components/creatures/StatBlockEditor.test.tsx src/features/journey/creatures/creatures.test.tsx src/features/character/creation/CharacterCreationWizard.test.tsx
```

O comando combinado anterior passou em 6 arquivos de teste, 42 testes no total. Depois da integração da ficha, este comando focal passou em **3 arquivos, 16 testes**:

```sh
npm test -- src/features/character/sheet/WildShapePanel.test.tsx src/features/actions/TurnPanel.test.ts src/features/character/sheet/CharacterSheet.test.tsx
```

Uma execução inicial do lote expandido encontrou duas falhas de fixture/expectativa no painel; foram corrigidas (duração antiga ausente não quebra a ficha e o callback aceita custo opcional). Uma execução focal expandida depois das alterações passou em **8 arquivos, 60 testes**:

```sh
npm test -- src/features/character/sheet/WildShapePanel.test.tsx src/features/actions/TurnPanel.test.ts src/features/character/sheet/CharacterSheet.test.tsx src/components/creatures/StatBlockEditor.test.tsx src/features/journey/creatures/creatures.test.tsx src/features/compendium/CreatureCatalog.test.tsx src/features/compendium/Compendium.test.tsx src/features/character/creation/CharacterCreationWizard.test.tsx
```

A verificação foi focal; build e validação global permanecem reservados ao worker Luna de QA coordenado pela raiz.

Após os últimos ajustes do editor e gerador, este comando focal passou em **2 arquivos, 17 testes**:

```sh
npm test -- src/components/creatures/StatBlockEditor.test.tsx src/features/journey/creatures/creatures.test.tsx
```

O teste cobre exclusão de chave avançada preservando CA, edição guiada de traços/ações/idiomas e chamada real do gerador determinístico do domínio para uma proposta limitada a besta.

Depois da correção dos IDs da lista de Tasha, o smoke de bootstrap passou em **15 testes**:

```sh
npm test -- src/app/bootstrap.test.tsx
```

Saída: 1 arquivo, 15 testes passados. O caso de busca por “Ábaco” também passou após o teste selecionar o campo de busca de Regras por placeholder explícito: a aba Criaturas adicionou um campo de busca anterior no DOM e o seletor antigo preenchia esse campo oculto. O smoke também revelou uma referência temporal à variável `Map` em Jornada; a integração passou a usar `MapWorkspace` e a construir o mapa dos blocos após inicializar o estado `data`.

Falhas históricas resolvidas, mantidas aqui para rastreabilidade: a primeira execução não importava `asRulesetId` de Tasha; a seguinte encontrou `EntityId inválido: "ranger.primal-awareness.3-use"`; depois disso, um smoke encontrou o seletor Ábaco e as duas referências temporais em Jornada descritas acima. O resultado 15/15 posterior confirma que esses problemas foram corrigidos.

Depois da opção Feérica explícita de conjuração assistida, o teste focal de Ações passou em **1 arquivo, 19 testes**. O teste combinado da capacidade, dispatcher e UI passou em **3 arquivos, 44 testes**:

```sh
npm test -- src/features/actions/Actions.test.tsx
npm test -- src/application/character/action-capabilities.test.ts src/application/character/action-dispatcher.test.ts src/features/actions/Actions.test.tsx
```

A checkbox da opção de 1 minuto começa desmarcada, só encaminha `featureCastingOption` quando marcada, cancelar não envia comando e a revisão de sucesso exibe a explicação do domínio.

Após integrar os contratos de alvo e componente, o teste focal de Ações passou em **1 arquivo, 26 testes**:

```sh
npx vitest run src/features/actions/Actions.test.tsx
```

A revisão agora recolhe alvo explícito da ficha atual ou ponto inteiro em centímetros, confirmação explícita de visibilidade quando exigida, e declaração de componente material/foco permitido pela fonte. Pendências e rejeições conhecidas só são liberadas quando a metadata correspondente existe e todos os inputs estão completos; pendências desconhecidas, objetos, contagem de alvos não selecionável e M que exige item rastreado sem seletor continuam bloqueados. Uso gratuito e espaço continuam capacidades distintas, sem fallback automático. Os testes de Fogo das Fadas partem de rejeições reais de `previewCast` por alvo ausente e, com alvo explícito, por componente M ausente; a UI só confirma após visibilidade e material explícitos. A alternativa Feérica também exercita `previewCast` real: com concentração ativa, o cast normal solicita substituição; a confirmação segue bloqueada até marcar a opção de 1 minuto. A execução de UI permanece focal; a verificação de tipo/build e o smoke browser com o dispatcher estável ainda estão pendentes.

No backup Fada1 inspecionado (`output/playwright/sup03-qa-2026-11-12/.playwright-cli/rpg-backup-character-bf22bd95-de51-4263-86b3-d6039a59fd51.json`), a ficha tinha `raceRef=fairy` e `fairy-supplement`, mas `choices=[]`; por isso não é uma fixture válida para provar conjuração racial. A UI agora apresenta `fairy.spellcasting-ability` como obrigatório e seleciona INT, SAB ou CAR em um controle explícito; o focal verifica que SAB é serializada como `ChoiceSelection` com `grantingRef=fairy`. `npx vitest run src/features/character/creation/CharacterCreationWizard.test.tsx --reporter=dot` passou em **1 arquivo, 17 testes**. A rodada combinada `npx vitest run src/features/character/creation/CharacterCreationWizard.test.tsx src/features/actions/Actions.test.tsx --reporter=dot` passou em **2 arquivos, 43 testes**. A validação de domínio contra escolha ausente está com B; criar/exportar nova Fada pela UI e evoluir essa ficha permanece pendente da janela estável dos produtores.

## Cenários já cobertos

- Navegação acessível por teclado entre Regras e Criaturas no destino existente Compêndio; os painéis preservam busca e seleção ao alternar.
- Consulta do catálogo sem avistamento automático; avistar exige ação explícita e só aceita formas classificadas pelo domínio.
- Bloco sem ND e sem `tags` renderiza; busca de “aguia” encontra “ÁGUIA”; filtro de Forma Selvagem exclui enxames.
- Exibição de atributos, deslocamentos, PV, CA, ações, reações, ações lendárias, covil, efeitos regionais, campos adicionais e fontes do bloco.
- Ficha do mestre aceita editar campos avançados e impede salvar JSON inválido.
- Editor do bloco oferece campos guiados para traços, ações/ataques, sentidos, idiomas e notas; JSON adicional fica recolhido e sua remoção de propriedades apaga os campos removidos sem perder os básicos.
- A sugestão automática usa `suggestCreatureStatBlock` do domínio: jogador tem tipo fixo Besta, mestre escolhe o tipo, as razões são exibidas e seguem junto da proposta; o bloco continua editável.
- Fluxo de criação existente e seleções de idioma preservados; teste focal voltou a passar depois de manter a numeração original das etapas.
- Lista e filtro do elenco existente de criaturas não regrediram.
- Jogador edita o bloco e motivo antes de enviar; a interface informa que envio não marca avistamento.
- Mestre revisa proposta e a UI mostra o status devolvido pela operação, sem inventar aprovação local.
- A ficha consome a projeção de bestas elegíveis do domínio, deriva atributos/CA/movimento/PV da forma ativa e usa comandos para dano, cura e PV temporários.
- A Forma Selvagem exibe PV da forma e snapshot de PV originais, mostra tempo de jogo restante e oferece avanço de +10 min, +1 h ou valor livre; não usa relógio real nem cria data/horário.
- O painel consulta o orçamento já salvo pelo TurnPanel por personagem. O custo ação/bônus vem do serviço de regras e o slot só é reservado após sucesso.
- A opção Feérica de conjuração sem concentração fica disponível somente quando a capability entrega a alternativa validada para aquela magia; o jogador precisa marcá-la, a ação normal continua padrão e a mensagem de sucesso mostra a explicação de encerramento manual em 1 minuto.
- A revisão de magia recebe alvos/pontos e componentes apenas por escolhas explícitas; foco só aparece quando autorizado pela fonte e sem componente consumido. Capabilities `feature` e `slot` permanecem independentes, e pendências não reconhecidas não podem ser confirmadas.
- O Compêndio mescla catálogo publicado com propostas aprovadas e blocos customizados revelados ao usuário pela projeção do serviço de campanha.
- Focais do painel da forma, ponte de orçamento, editor, Jornada, Compêndio e wizard passaram em conjunto (8 arquivos, 60 testes); focais menores posteriores passaram em 2 arquivos/17 testes e o bootstrap em 1 arquivo/15 testes.
- A revisão automática de domínio ao adicionar a condição Inconsciente na ficha encerra a forma sem custo de ação e preserva a condição e os PV originais. O browser confirmou o retorno e a UI agora exibe “Inconsciente.” sem marcar salvamentos contra a morte para PV positivos; foco da ficha passou em 9 testes.

## Arquivos desta interface

- `src/components/creatures/StatBlock.tsx`, `StatBlockEditor.tsx` e estilos/testes: renderer compartilhado e editor estruturado com campos avançados.
- `src/features/compendium/Compendium.tsx`, `CreatureCatalog.tsx`, estilos, teste e exports: abas acessíveis e catálogo pessoal sem criar rota.
- `src/features/journey/creatures/CreatureBoard.tsx` e `PlayerCreatureBoard.tsx`: bloco completo privado ao mestre até reveal explícito e bloco projetado apenas quando compartilhado.
- `src/features/journey/creatures/CreatureProposalBoard.tsx`: envio editável pelo jogador e aprovação/recusa persistidas pela Jornada quando o serviço de campanha está disponível.
- `src/features/character/creation/CharacterCreationWizard.tsx` e estilos: escolha opt-in de Fada/Tasha e opções individuais de classe, preservando o diff prévio de idiomas.
- `src/features/character/sheet/WildShapePanel.tsx`, estilos/testes e `CharacterSheet.tsx`: seletor de elegíveis, snapshot PV, tempo restante/avanço e comandos de forma.
- `src/features/actions/TurnPanel.tsx`, export e teste: leitura/reserva do orçamento manual por personagem; comandos rejeitados, `needsInput` e falhas não gastam ação.
- `src/app/feature-registry.ts`, teste e `src/app/router.tsx`: catálogo de campanha, propostas persistidas, comandos da forma e integração com a ficha.

## Lacunas e próximos passos

- QA real do fluxo nuclear foi feito no perfil isolado Playwright `sup03-qa-2026-11-12`: criação/evolução Elfo Druida 2/Círculo da Lua, catálogo publicado com 95 blocos, avistamento explícito persistente, transformação em LOBO, snapshot de PV, reload durante a forma, retorno voluntário, dano/cura/PV temporários, overflow, condição Inconsciente e expiração por tempo manual. Resultados e capturas estão na seção seguinte e no log dedicado.
- Continua pendente o ciclo visual de ação rejeitada/CAS/`needsInput` versus sucesso e a proposta customizada ND ausente → revisão do mestre → aprovação → catálogo do autor → avistamento explícito → transformação. Também falta o smoke de Fada/Tasha com a capacidade real e dados opt-in finais.
- Confirmar a lista da campanha publica apenas propostas aprovadas e stat blocks explicitamente revelados à conta; dados pendentes de outros jogadores não devem aparecer no Compêndio.
- Validar em browser Fada/Tasha com os dados opt-in finais e confirmar que a escolha permanece explícita, incluindo opções Tasha independentes.
- O teste focal de Ações com os controles publicados passou em 26 testes; aguarda nova janela sem mudanças no dispatcher para provar no runtime os custos grátis/espaço, alvo e material de Fada/Tasha.
- A rodada global `npm test`, `npm run typecheck` e `npm run build` ainda aguarda o checkpoint de REVIEW de B/P e liberação da raiz. O smoke curto de produção também está pendente.

## QA real de navegador · 2026-11-12

Perfil e servidor isolados: `output/playwright/sup03-qa-2026-11-12` em `http://127.0.0.1:5173`, com Lina SUP03 QA-2026 (`8bc22bdd-4464-47e3-a07f-7fbd2ed8be9d`). A ficha foi criada pelo wizard e evoluída pela UI. O Compêndio exibiu `95 no catálogo · 0 vistas`; após marcar LOBO explicitamente, indicou `95 no catálogo · 1 vistas`, que permaneceu após reload do Compêndio.

- Transformação por besta vista: LOBO, ND 1/4, CA 13, PV 11, FOR 12/DES 15/CON 12, mordida +4 e 2d4+2. Voo/natação ficaram indisponíveis. O primeiro uso reduziu Forma Selvagem de 2/2 para 1/2 só após sucesso. Reload durante a transformação manteve LOBO 11/11 e o snapshot original 17/17; retorno voluntário restaurou a ficha original.
- PV durante outra transformação: cura de 2 após dano 3 levou a forma de 11 para 10 PV; +4 temporários ficou separado; dano 6 consumiu os 4 temporários primeiro e reduziu PV da forma de 10 para 8. O snapshot original permaneceu 17/17. Dano 13 zerou os 8 PV restantes da forma e aplicou 5 de excesso à ficha, que ficou em 12/17.
- Descanso curto fora da forma: com 0/2 usos, “Descansar sem gastar dados” concluiu o descanso e restaurou Forma Selvagem a 2/2, sem alterar os PV 12/17. Depois foram consumidos os dois usos seguintes, um por transformação.
- Inconsciente: adicionar a condição durante forma ativa encerrou a transformação automaticamente sem custo de ação, manteve a condição e preservou os PV originais 12/17. Depois do foco UI, o browser mostrou `Inconsciente.` e contadores de salvamentos 0/3, sem estado “Morrendo” com PV positivos.
- Tempo manual: com 1 hora restante, avançar 59 minutos manteve a forma ativa com 1 minuto; avançar mais 1 minuto encerrou-a e restaurou 12/17.
- Evidência visual: [catálogo após avistar](../output/playwright/sup03-qa-2026-11-12/.playwright-cli/page-2026-11-12T15-28-41-929Z.png), [forma ativa no desktop com PV da forma e snapshot original](../output/playwright/sup03-qa-2026-11-12/.playwright-cli/page-2026-11-12T15-37-44-118Z.png), [forma ativa no viewport móvel](../output/playwright/sup03-qa-2026-11-12/.playwright-cli/page-2026-11-12T15-37-20-965Z.png) e [retorno por overflow no desktop](../output/playwright/sup03-qa-2026-11-12/.playwright-cli/page-2026-11-12T15-38-17-826Z.png). O viewport móvel foi inspecionado no meio do bloco estatístico; o conteúdo permaneceu dentro da largura visível.
- O perfil permaneceu sintético e isolado. A edição/removação da condição durante a rodada causou uma tela transitória “A ficha não pôde ser carregada”; recarregar recuperou o perfil e revelou a transformação já persistida. O fluxo de reload validado não perdeu a forma nem os PV. Registrar essa ocorrência para revisão de estabilidade, sem contar o estado transitório como falha do domínio.
- Comando focal após a correção de rótulo da condição: `npm test -- src/features/character/sheet/CharacterSheet.test.tsx --reporter=dot` — 1 arquivo, 9 testes passaram. Não foi executada suíte global, typecheck ou build nesta rodada.

O registro dos passos e resultados de navegador está em `Testes/logs/complementos-interface-browser-qa-2026-11-12.log`.

## Retomada do QA de navegador · 2026-11-13

Esta atualização complementa e supersede os próximos passos pendentes acima conforme as provas abaixo; SUP-03 continua em andamento. O perfil persistente isolado é `output/playwright/sup03-qa-2026-11-12`, servido em `http://127.0.0.1:5173`. O perfil foi reaberto sem apagar ou recriar dados. A ficha de Druida 2 usada no fluxo de Forma Selvagem é uma cópia sintética ligada pelo fluxo normal de backup/reveal; a sessão não prova envio de proposta em duas contas reais.

- **Custom aprovada e Forma Selvagem:** a projeção mostrou 96 criaturas (95 do catálogo-base + 1 custom). Na cópia de campanha, LOBO já estava visto (1) e a custom Cervo aprovada ainda não estava vista; aprovação/reveal não criou sighting. Marcar Cervo explicitamente elevou a contagem de 1 para 2. A custom foi transformada, mantendo snapshot original 17 PV e 8 PV da forma através de reload e fechamento/reabertura do navegador. Capturas: [forma ativa desktop](../output/playwright/sup03-qa-2026-11-12/wildshape-active-desktop.png), [após reload](../output/playwright/sup03-qa-2026-11-12/wildshape-active-after-reload-desktop.png), [após reabertura](../output/playwright/sup03-qa-2026-11-12/wildshape-active-after-reopen-desktop.png) e [viewport móvel](../output/playwright/sup03-qa-2026-11-12/wildshape-active-mobile.png). A cópia de campanha/reveal e a proposta aprovada são fixtures sintéticas, não uma aprovação clicada nesta sessão; a seleção vista, transformação e persistência foram ações reais na UI. A prova histórica separada de LOBO 0→1 consta na seção QA de 2026-11-12.
- **Fada1 criada pela UI:** Mira SUP03 Fada (`cce7148c-5fab-4f23-a63a-824632494b43`) foi criada no wizard, com suplemento Fada opt-in e `fairy.spellcasting-ability` escolhida explicitamente como Sabedoria. O export normal da UI está em `output/playwright/sup03-qa-2026-11-12/fairy1-ui-export.json`; mantém a escolha `wis` e fontes de Druidismo distintas para classe e raça. Captura: [Fada1 após criação](../output/playwright/sup03-qa-2026-11-12/fairy1-created-desktop.png). O Druidismo racial foi tentado em runtime como capacidade separada, sem gasto, mas continua bloqueado por `PEND-SPELL-STRUCTURE`; o Druidismo de classe também aparece separado e permanece bloqueado como esperado. B está corrigindo a composição de conteúdo opt-in no cálculo de capabilities. Não se considera provado o uso racial até repetir após o freeze.
- **Chaves de magias por origem:** a ficha apresentava erro de chave React ao renderizar o mesmo Druidismo concedido por classe e raça. A lista agora usa o identificador da fonte de conjuração junto da magia. O browser deixou de mostrar o erro após reload; o teste `npx vitest run src/features/character/sheet/CharacterSheet.test.tsx -t "mantém chaves distintas para a mesma magia concedida por origens diferentes|separa truques e magias em colunas próprias" --reporter=dot` passou em 1 arquivo/2 testes. A consulta posterior do console registrou zero erros e um aviso WebGL.
- **Tasha:** a fixture sintética Ranger10 (`output/playwright/sup03-fixtures-regras-2026-11-13/ranger-level10-tasha-regras-import.json`), regenerada com builders atuais, foi importada pela UI em “Criar cópia”. A Ranger11 (`.../ranger-level11-tasha-regras-import.json`) chegou somente à prévia normal de importação, sem confirmação; foi deixada pendente quando B pediu pausa de browser durante correção do bootstrap. Os casts Fada3/5 e Ranger10/11, recursos grátis/espaço, material e variante de Reforço Feérico não foram validados visualmente/runtime nesta retomada.
- **Limites da sessão:** a aprovação e o reveal foram preparados por fixtures/importação normal, não por duas sessões autenticadas; a visibilidade da proposta alheia não foi exercitada com usuários reais. O envio pelo jogador continua coberto pelos componentes, serviço, repositórios e ACL, não por uma sessão dupla de navegador. Não houve novo smoke de produção após a rodada global; o build/typecheck verde anterior é registrado nos logs globais da raiz.

Passos e estado operacional em `Testes/logs/complementos-interface-browser-qa-2026-11-13.log`. Os fluxos de casts serão retomados após a confirmação de estabilidade da alteração do bootstrap; não declarar o QA de SUP-03 concluído antes deles.

## Retomada de ações e concentração · 2026-11-14

Esta atualização substitui o status anterior de bloqueio do Druidismo racial. No perfil persistente `output/playwright/sup03-qa-2026-11-12`, a UI confirmou Druidismo racial como resolução manual pela mesa, sem aplicar efeito/selecionar UUID; HP, concentração e slots permaneceram inalterados. Fogo das Fadas gratuito já havia sido usado e persistido separadamente. O uso de Fogo das Fadas por espaço foi apenas aberto para revisão; não foi confirmado enquanto a UI permitia falso-pronto com concentração ativa.

- A interface agora considera `spellRequiresEndingConcentration` diretamente no bloqueio booleano de Confirmar, mesmo depois que a pessoa seleciona o alvo e o preview deixa de exibir essa pendência. Apenas a variante validada de Reforço Feérico de 1 minuto excepciona a guarda; o caminho normal orienta encerrar a concentração pela capability existente.
- Para concessão racial assistida, `assistedRacialGrant` permite ocultar somente a restrição estrutural “a entrada permanece bloqueada”. As demais restrições ficam visíveis; a UI não infere autorização pela descrição ou pelo texto da regra. O teste de Ações valida que uma magia de classe sem metadata mantém o bloqueio.
- Focais direcionados de `src/features/actions/Actions.test.tsx`: variante Reforço 1 min, alvo selecionado com concentração que precisa ser encerrada, e copy assistida racial — **3 passaram, 33 ignorados**. Uma rodada anterior reproduziu o falso-pronto antes da correção; detalhes no log dedicado.
- Ainda pendentes no navegador: revalidar metadados/preview do produtor após handback, Fogo das Fadas por espaço depois de encerrar concentração, Aumentar/Reduzir, Reforço normal seguido da variante de 1 minuto, Ranger/Tasha restante e smoke de produção. O gate global e o build permanecem sob P/root.

Evidências e estado de navegador em `Testes/logs/complementos-interface-browser-qa-2026-11-13.log`; a captura do caso bloqueador anterior é `output/playwright/sup03-qa-2026-11-12/fairy-slot-concentration-unresolved.png`.

## Fechamento do smoke de casts em desenvolvimento · 2026-11-14

Esta atualização substitui as pendências de casts do parágrafo anterior. No perfil persistente isolado `output/playwright/sup03-qa-2026-11-12`, foram comprovados no runtime Druidismo racial assistido, Fogo das Fadas gratuito e por slot, Aumentar/Reduzir com alvo e componente material declarados, Reforço Feérico normal e variante de 1 minuto preservando a concentração anterior, e Incansável com PV temporários. A preparação de Fada3/5 e Ranger10/11 veio dos builders atuais e foi importada como cópia pela UI; Fada1 e a escolha racial de Sabedoria vieram do wizard.

- O finding de consumo do turno foi corrigido em `Actions.tsx` e `TurnPanel.tsx`: o caminho ligado ao handler só abre o fluxo de conjuração; o ledger é atualizado depois de `RuleResult.status === "success"`. A sincronização local por `characterId` atualiza o painel. Rejected, `needsInput`, `void` e cancelamento não consomem ação; quando não há handler, permanece o lançamento manual.
- A regressão do gate para uma magia de ação bônus revelou que o evento `FRESH` inicial do TurnPanel podia ampliar `availableActions` explícitas do caller. `Actions.tsx` agora intersecta a lista explícita com o ledger, sem conceder ação/bonus/reação negados; a lista vazia continua vazia e `free` explicitamente permitido permanece disponível. O focal completo `Actions.test.tsx` passou 40/40 após acrescentar esses casos; triagem detalhada em `Testes/logs/complementos-interface-browser-qa-2026-11-13.log`.
- **Reforço Feérico e concentração:** na ficha Ranger11 `60f296f1-7a62-49af-bd85-46edd9efdb7d`, a conjuração normal grátis de Invocar Feérico gerou o uso `fey-wanderer.fey-reinforcements-use` (`spent=1`), HP 92/temp 0 e concentração de 1 hora `effectId=c203e260-3fb5-40ef-a0d8-df5d361612c9`. Na rodada 2, selecionei pela UI a variante assistida de 1 minuto e o espaço de 3º nível. O commit moveu o IndexedDB da revisão 1 para 2, gastou exatamente o pool `00000000-0000-4000-8000-000000000027` (`spent=0→1`), manteve Reforço grátis em `spent=1` e HP 92/temp 0. A concentração permaneceu byte-a-byte igual: mesmo `effectId`, fonte Invocar Feérico, duração 1 hora, `expiryTrigger=concentration-ends` e lista `pendingSaveIds` vazia. [Revisão da variante de 1 minuto](../.playwright-cli/page-2026-11-14T05-16-13-988Z.png).
- **Glamour Sobrenatural:** prova anterior no Ranger10 com CAR 11 (mod. +0) e SAB 17 (mod. +3): teste de Carisma pela UI foi `d20+3`, resultado 9; salvaguarda de Carisma permaneceu +0. [Captura do teste de Carisma](../output/playwright/sup03-qa-2026-11-12/glamour-charisma-check-desktop.png) mostra a rolagem +3; o resumo de runtime em `complementos-dominio.md` registra que o bônus não se aplica à salvaguarda.
- Focais direcionados em `Actions.test.tsx` e `TurnPanel.test.ts`: 2 arquivos, 3 testes passaram e 40 foram ignorados. Incluem sucesso, abertura/cancelamento, rejected, `needsInput`, retorno void e modo manual sem handler.
- Smoke real: Ranger11 `60f296f1-7a62-49af-bd85-46edd9efdb7d`, iniciado na rodada 3 com ação disponível. Abrir “Conjurar magia” no TurnPanel deixou `used.action=false`; confirmar Curar Ferimentos por slot de 1º nível mostrou “Aplicado na ficha.” e mudou o ledger para `used.action=true`; o painel exibiu “Ação — Usada”. IndexedDB revision 3 preservou HP 92/temp 0 e a concentração anterior de Invocar Feérico (`c203e260-3fb5-40ef-a0d8-df5d361612c9`), e registrou o slot de 1º nível gasto. Captura: [TurnPanel após sucesso](../output/playwright/sup03-qa-2026-11-12/turn-panel-after-spell-success.png).
- Evidência detalhada de IDs, pools e comando focal em `Testes/logs/complementos-interface-browser-qa-2026-11-13.log`. Console no smoke: zero erros/avisos. Naquele momento, o código UI estava congelado para os gates de P e o smoke de produção aguardava build/liberação; o smoke foi concluído na seção abaixo.

## Smoke curto do artefato de produção · 2026-11-14

**SUP-CP4 ainda não aceito.** O preview de produção concluiu a saída da Forma Selvagem e persistiu corretamente, mas o card do roster manteve os PV da forma até um reload. B está corrigindo a publicação do store; repetir esse trecho após o próximo build e exigir PV originais no card imediatamente, antes do reload.

P concluiu a rodada global 5 com suíte 1304 aprovada/7 ignorados, typecheck e build verdes (`tsc -b && vite build`; logs `complementos-typecheck-rodada5-final.log` e `complementos-build-rodada5-final.log`). O smoke usou o perfil persistente absoluto `output/playwright/sup03-qa-2026-11-12` e a mesma origem `http://127.0.0.1:5173`. Parei somente o Vite dev PID 378541 e servi o `dist` com `npm run preview -- --host 127.0.0.1 --port 5173 --strictPort` (PID 619752). O HTML carregou `/assets/index-DmP7rfhP.js` e CSS/assets com hash; `document.scripts` e Performance não mostraram `/src/` ou HMR. A resposta de `/src/main.tsx` foi o fallback SPA `text/html`, não um módulo-fonte. Console final: 0 erros e 0 avisos.

- Após reload real, os dados existentes carregaram. Pelo roster do mestre, “Editar ficha” abriu Lina SUP03 QA-2026, ID `a705d979-3294-4496-8bff-e0ab1e9eec9e`. IndexedDB revisão 20: transformação ativa no Cervo custom visto (`beast:homebrew-stag`), forma 8/8, snapshot original 17/17, sem condição, Forma Selvagem `spent=1/2`; os avistamentos de LOBO e Cervo estavam preservados.
- Pela UI “Ajustar estado”, marquei Inconsciente e salvei. Revisão 21: transformação encerrada; PV originais `{current:17,temp:0}` preservados; condição Inconsciente persistida; Forma Selvagem permaneceu `spent=1`. O card do roster ainda exibiu 8/8 até reload, embora a condição já aparecesse. Reload atualizou o card para 17/17 e manteve Inconsciente sem erro de tela. Reportei esse atraso de atualização visual à raiz como finding de UI em produção; os dados persistidos estavam corretos.
- Removi Inconsciente pelo mesmo diálogo e salvei pela UI: revisão 22, condição/transformação ausentes, PV 17/0 e recurso ainda `spent=1`. Na ficha, selecionei “Cervo cinzento” e “Fica guardado no lugar” e transformei de novo. Revisão 23: transformação `486eeca7-d980-4db9-928a-949cc8b4955c`, forma Cervo 8/8, snapshot original 17/17, zero condições, sightings LOBO+Cervo e Forma Selvagem `spent=2/2`.
- Reload real da ficha no mesmo perfil preservou a forma Cervo, HP efetivo 8/8, snapshot 17/17, recurso 0/2 e revisão 23. Captura do estado após reload do artefato: [Forma Selvagem em produção](../output/playwright/sup03-qa-2026-11-12/production-wildshape-after-reload.png). O registro de processos e leituras somente do IndexedDB está no log browser de 2026-11-13.
- Depois do smoke, parei o preview PID 619752 e restaurei Vite dev na mesma origem com `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` (PID 638474). HTTP 200; reload final preservou a forma Cervo. Nenhum listener IPv6 nem perfil de P foi encerrado ou substituído.

## Correção do card de campanha após normalização da ficha · 2026-11-14

- No smoke de produção da rodada 6, salvar Inconsciente persistiu a saída da forma e PV originais (`revision=24`, `transformation` ausente, `hp=17/0`, condição `unconscious`, recurso Forma Selvagem `spent=2`), mas o card continuou em 8/8. A leitura React read-only confirmou que `CharacterStatusRow` recebia a revisão antiga 23. Não houve reload nem nova mutação depois da reprodução.
- Causa no caminho `CollaborationRoute` → `CollaborationPanel`: o callback retornava somente a revisão, e `saveCharacterState` copiava `hpValue/tempHpValue` e as condições do formulário para `characterLinks`. Como o formulário abriu com os 8 PV da forma, a normalização correta de `saveSheetState` para 17 PV originais não chegava à lista local.
- O callback agora relê o agregado após o save bem-sucedido e retorna a projeção canônica persistida; o painel substitui apenas esse estado do card correspondente. Em erro, o card não muda e o diálogo mantém a mensagem. `CollaborationPanel.test.tsx` passou 13/13, incluindo forma 8/8 → Inconsciente → 17/17 imediato, card vizinho intacto e falha sem atualização. `git diff --check` passou.
- **No checkpoint desta correção**, SUP-CP4 ainda aguardava gates e repetição no artefato compilado; o resultado final está registrado na seção “Smoke de produção após correção do card” abaixo.

## Smoke de produção após correção do card · 2026-11-14

SUP-CP4 foi aceito no artefato de produção da rodada 7. P reportou suíte 1308 aprovada/7 ignorados, typecheck e build verdes (`Testes/logs/complementos-build-rodada7-final.log`). O smoke usou o mesmo perfil persistente absoluto `output/playwright/sup03-qa-2026-11-12`, origem `http://127.0.0.1:5173` e a cópia vinculada Lina `a705d979-3294-4496-8bff-e0ab1e9eec9e`. Preview PID 692215 serviu o `dist`; reload inicial preservou a sessão e os dados existentes.

- **Reprodução imediata pelo fluxo do mestre:** o card do roster mostrava Cervo em forma com 8/8 antes da edição. Em “Ajustar estado”, marquei Inconsciente e salvei. Sem reload, o card passou a 17/17, manteve Inconsciente e reportou “Estado do personagem atualizado.”. IndexedDB `rpg-companion/characters`, rev 28: HP original 17/0, `transformation` ausente, condição `unconscious` aplicada pelo mestre e `druid.wild-shape spent=1`. [Card atualizado imediatamente](../output/playwright/sup03-qa-2026-11-12/production-cp4-round7-immediate-card.png).
- **Limpeza e transformação novamente pela UI:** removi Inconsciente no mesmo diálogo, rev 29: 17/0, sem condição ou forma, recurso ainda spent=1. Na ficha, selecionei Cervo cinzento e “Fica guardado no lugar”, e transformei usando o segundo uso normal. Rev 30: HP original 17/0, forma `beast:homebrew-stag` 8/0, condição vazia e Forma Selvagem spent=2/2. [Forma antes do reload](../output/playwright/sup03-qa-2026-11-12/production-cp4-round7-retransformed-before-reload.png).
- **Persistência após reload real:** a ficha reabriu transformada, 8/8 efetivos, snapshot original 17/17. IndexedDB permaneceu na rev 30, transformação `cd55bf56-2e4e-45e6-a0c0-019a839e0f53`, HP original 17/0, HP da forma 8/0, sem condições, recurso spent=2. Após navegar de volta ao roster, o card carregou 8/8 e sem condição. [Ficha após reload](../output/playwright/sup03-qa-2026-11-12/production-cp4-round7-reload-transformed.png) e [card após reload](../output/playwright/sup03-qa-2026-11-12/production-cp4-round7-reload-card.png).
- Console Playwright: zero erros e zero avisos. A inspeção read-only dos recursos carregados não encontrou `/src/` nem `.tsx`; o smoke rodou o bundle compilado, sem HMR. Não houve importação, seed ou mutação manual do IndexedDB.
- Restaurei apenas meu preview PID 692215 e o Vite dev em `127.0.0.1:5173`; o listener atual é PID 711677 (`/home/jesus/Progetos/RPG/node_modules/.bin/vite --host 127.0.0.1 --port 5173 --strictPort`), HTTP 200. Nenhum listener IPv6 ou perfil da lane P foi encerrado/tocado. Passos e leituras detalhadas estão em `Testes/logs/complementos-interface-browser-qa-2026-11-13.log`.
