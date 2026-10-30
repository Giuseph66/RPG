# Correção de interface e recuperação

## Implementado

- `CharacterCreationWizard` usa cartões/checkboxes tocáveis para escolhas múltiplas, valida cada etapa antes de avançar, mantém Identidade ao salvar o draft e apresenta labels em português.
- As escolhas de magia filtram classe e nível: truques no nível 0 e magias iniciais no nível 1. A etapa de Bardo agora recebe a lista publicada pelo rule pack e não aceita opções de outra classe ou nível.
- O escopo de equipamento considera proficiências reais da classe. Ferramentas só aparecem quando a classe tem a categoria correspondente; Bardo não recebe a lista inteira de ferramentas de artesão, jogos e kits. Pacotes publicados e uma seleção já persistida continuam disponíveis.
- A ficha mantém o layout e amplia alvos de toque dos controles, ações, magias, condições, PV e salvamentos. O painel de backup permite colisão de ID em `copy`/`replace`; conflitos de ruleset/referência continuam bloqueados e a escrita segue delegada ao serviço atômico.
- AppModal continua com ativação por clique, backdrop, foco e Escape; o teste usa `click` e não muda a semântica mobile.
- A revisão de ações traduz `action`, `bonus-action`, `reaction`, `free` e unidades de tempo para português; razões de ação indisponível não exibem IDs do contrato.
- `DataManagementRoute` limpa a prévia e o envelope pendente antes de cada novo parse; um JSON inválido não deixa uma prévia antiga confirmável. A lista de recuperação é recarregada no mount e após importar, restaurar ou descartar.
- O seletor de arquivo de backup é limpo imediatamente após capturar o `File`, permitindo escolher o mesmo JSON novamente sem sair da tela.
- `/settings` agora oferece um acesso visível “Abrir backup” que navega para `/data` pela composição existente do router.
- Falhas de rede da prévia 3D não exibem a mensagem inglesa do navegador: o aviso orienta que os dados estão offline e que a rolagem segue pela mesa 2D.

## Provas automatizadas

Com Node 24 (`/home/jesus/.nvm/versions/node/v24.12.0/bin` no `PATH`):

- `npm run typecheck` passou.
- Foco final: **7 arquivos, 50 testes passaram** (wizard, bootstrap/registry/lazy catalog, compêndio e transferência).
- Foco desta rodada: **3 arquivos, 29 testes passaram** (`router`, `SettingsPanel` e infraestrutura PWA), incluindo regressões de prévia inválida, recuperação atualizada e prewarm de chunks não visitados.
- Foco adicional de ações: **4 arquivos, 43 testes passaram**, incluindo custo de conjuração e razão de ação indisponível traduzidos.
- Foco C07/PWA desta rodada: **2 arquivos, 17 testes passaram**, incluindo seleção repetida do mesmo backup, imports relativos de chunks e cache explícito dos dados 3D.
- A suíte focal passou **7 arquivos/50 testes** e `bootstrap.test.tsx` isolado passou **14/14**. A repetição completa com `--testTimeout=30000` terminou em **148 arquivos/1.044 testes passados, 2 falhos e 1 ignorado**; as falhas são `firestore-sync-adapter` e `remote-hydration-repository`, ambas em paths de sincronização fora deste ownership.

## QA browser real

Na sessão limpa `http://127.0.0.1:4174`, preencher `QA Bardo` e `QA Jogador` manteve a URL no mesmo draft e a etapa em Identidade sem clicar Continuar. O fluxo então percorreu Humano/Élfico, Bardo, Artista, três perícias sem duplicidade, matriz padrão, Rapieira, dois truques e quatro magias de nível 1; a revisão mostrou “Tudo pronto para criar o personagem” e confirmou a ficha em `/character/<id>`. A ficha exibiu os quatro feitiços escolhidos, dois truques e Rapieira.

Em viewport mobile, a ficha foi verificada em 390 e 360 CSS px: `scrollWidth` acompanhou a largura renderizada sem overflow horizontal e os labels dos controles mediram 43,99 px de altura. A medição também encontrou checkboxes nativos de 13 px dentro de labels de 44 px; o alvo acionável é o label.

O painel `/data` abriu e preservou a sessão sintética. A prova IAB da raiz importou a mesma fixture com conflito, escolheu `Substituir`, recarregou o snapshot e confirmou as duas campanhas persistidas em [correcao-raiz-backup-snapshot-restaurado.jpg](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-raiz-backup-snapshot-restaurado.jpg); o relato está em [correcao-raiz-backup.md](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-raiz-backup.md). A sessão Chrome desta tarefa continuou sem permissão para `file://`, portanto não repetiu essa operação.

As capturas desta rodada estão em [correcao-ui-bardo-magias.jpg](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-ui-bardo-magias.jpg), [correcao-ui-bardo-ficha.jpg](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-ui-bardo-ficha.jpg), [correcao-ui-ficha-390.jpg](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-ui-ficha-390.jpg) e [correcao-ui-ficha-360.jpg](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-ui-ficha-360.jpg).

## Limites e coordenação

- O router já mantém a instância do wizard ao trocar para `/character/create/:draftId` no auto-save e navega para `/character/:id` após confirmação. A fonte de Bardo e o checksum do manifesto foram publicados pelo owner de jogabilidade; o wizard apenas filtra/apresenta esses dados.
- O teste do worker e a sessão IAB cobrem o cache instalado e a abertura offline de telas/chunks nunca visitados; o cenário de primeira instalação já sem rede permanece fora desta prova.
- A sessão IAB final provou o cache instalado: Regras abriu pela primeira vez offline com 1.451 regras e reload, Ajustes abriu pela primeira vez com a mesa 3D, `/data` abriu sem visita anterior e a mesma fixture pôde ser selecionada novamente após conflito. Evidências: [correcao-offline-catalogo-completo.jpg](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-offline-catalogo-completo.jpg), [correcao-offline-dados3d.jpg](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-offline-dados3d.jpg) e [correcao-offline-final.md](/home/jesus/Progetos/RPG/Testes/evidencias/correcao-offline-final.md).
- A confirmação real de copy/replace foi feita pela raiz no IAB; a sessão Chrome desta tarefa não alterou permissões nem registros reais.
