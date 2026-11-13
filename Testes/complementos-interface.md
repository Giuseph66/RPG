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
