# QA final do jogador — 2026-10-05

## Escopo efetivamente executado

- Chrome/CUA, origem `http://127.0.0.1:4173`.
- Conta QA já existente autenticada pela UI; UID confirmado na tela Conta: `WbqHlpoEg6QnVoDqLx9yY3NqUB53`.
- Hash do convite da campanha `QA Remoto 2026-10-05` aberto na origem pedida; o hash foi fechado antes das capturas finais.
- Nenhum produto, teste, build ou dependência foi alterado.

## Diagnóstico do convite e persistência

1. A sessão inicialmente aberta era uma conta sintética diferente. Saí pela UI, entrei com a conta QA autorizada e confirmei o UID acima.
2. Ao abrir `journey/participants` com o hash do convite, a tela continuou mostrando a campanha local `QA Colaboração 2026-10-05`; isso não exibiu um aceite explícito.
3. Em `/collaboration` sem hash, a tela mostrou `Minha participação` com `Você — Jogador · Ativo`, mas a seleção abriu `/session/bd1cddfa-d009-40bf-b9bb-bf7dafbcf23e`.
4. O convite do mestre é da campanha `QA Remoto 2026-10-05`, ID `f77afb9b-4fe1-43c4-9406-f791c9706b73`. Logo, o vínculo ativo observado é de outra campanha (`bd1c…`) e não prova o aceite de `f77…`.
5. A lista de mesas da conta confirmou `QA Colaboração 2026-10-05 — Jogador · 1 participantes`; `QA Remoto 2026-10-05`/`f77…` não apareceu.

Capturas sem token: `Testes/evidencias/correcao-jogador-final-aceite.jpg` e `Testes/evidencias/correcao-jogador-final-sync.jpg` mostram a mesa `bd1c…`; não são prova de aceite de `f77…`.

## Aceite real de f77 após correção de rota

Em uma nova aba Chrome na origem `127.0.0.1:4173`, o hash f77 abriu a campanha correta `QA Remoto 2026-10-05` e expôs `Convite recebido` com o botão `Aceitar convite`. O clique foi executado pela UI. O retorno exibiu `Convite aceito. Atualizando a campanha…`, removeu o hash da URL, mostrou `Você Jogador · Ativo` e abriu `Minha ficha na campanha`.

O mesmo estado também exibiu os textos remotos `Missing or insufficient permissions.`, `Falha na sincronização` e `O servidor ainda não confirmou os convites. Confira a conexão e atualize.`; portanto o aceite da membership foi confirmado, enquanto a sincronização complementar ainda está recusada pelo backend. Captura sem token: `Testes/evidencias/correcao-jogador-final-f77-aceite.jpg`.

Na colaboração, `QA Remoto 2026-10-05` ficou selecionada e `Abrir sessões` levou a `http://127.0.0.1:5173/session/f77afb9b-4fe1-43c4-9406-f791c9706b73`, confirmando o ID selecionado pela UI/rota, sem depender do hash.

Após recarregar `/journey/participants` sem hash, `Você Jogador · Ativo` permaneceu. Um novo clique em `Sincronizar agora` mostrou `Sincronização pendente` e terminou em `Jogador · erro de sincronização`, `Missing or insufficient permissions.`, `Falha na sincronização` e `O servidor ainda não confirmou os convites. Confira a conexão e atualize.`. Captura sem token: `Testes/evidencias/correcao-jogador-final-f77-sync.jpg`.

## Diário

Em `/journey/journal`, criei pela UI o registro sintético `QA jogador diário C18` com a nota `Pista registrada pelo jogador para validar a entrega ao mestre.`. O editor mostrou `Salvo localmente.` e, ao fechar, a lista confirmou `1 registro`. A entrega/visibilidade deste registro no mestre aguarda a leitura pareada da sessão mestre.

No mapa do jogador, a campanha ainda mostrou `Nenhum mapa nesta campanha` e `O mestre ainda não liberou nenhum mapa para você`.

## Falha concreta para o owner

Na sessão jogador antiga, `/journey/participants` não carregava `Participantes`; após o patch de rota em dev, a aba apareceu, o aceite f77 funcionou e `Minha ficha na campanha` apareceu. O botão de vínculo ainda não aparece porque a ficha não está selecionada em Configurações. O owner deve preservar essa correção e resolver a recusa remota antes do reteste da ficha.

Localização diagnóstica para o owner: `src/features/journey/campaign/JourneyCampaign.tsx` mantém `PLAYER_TABS` sem `participants` e remove a aba para `role === "player"`; a seção de vínculo do jogador existe em `src/features/collaboration/CollaborationPanel.tsx`, mas só é renderizada no ramo `view === "participants"`. O resultado observado é uma falha de acesso à UI, não uma recusa remota.

## Reteste pareado pendente

Mapas público/privado, diário jogador→mestre, presença/NPC, sessão/turno/PV e vínculo da ficha agora podem ser retestados na campanha f77; a membership persiste, mas a sincronização complementar ainda mostra `Missing or insufficient permissions.`. Configurações exibiu apenas `Íria QA Mobile` em criação e `Nenhum Personagem` ativo; `/character` confirmou somente o rascunho `Íria QA Mobile`, sem ficha concluída disponível. Não criei ficha sintética.

## NPC privado antes da revelação

Na campanha f77, `/journey/npcs` mostrou `Quem você encontrou`, todos os filtros em `0` e `Ninguém cruzou seu caminho ainda`; o NPC oculto `Cartógrafo QA C18` não apareceu. O guard de conteúdo privado passou.

## Sessão ativa como jogador

`/session/f77afb9b-4fe1-43c4-9406-f791c9706b73` mostrou `Sessão 1 · Sessão QA C18`, `Em andamento` e `Rodada 1`. `Próximo turno` e `Nova rodada` estavam desabilitados porque não havia participantes no encontro. A interface do jogador ofereceu indevidamente `Nova sessão` e `Encerrar` habilitados; não acionei esses controles para não alterar a sessão do mestre. PV/turno de ficha não ficaram disponíveis porque não há ficha vinculada. Captura sem token: `Testes/evidencias/correcao-jogador-final-f77-sessao.jpg`.

## Checkpoint C18 após aceite (NPC ainda oculto)

Em novo carregamento da rota `/journey/npcs` com a campanha f77 selecionada, a UI mostrou `QA Remoto 2026-10-05`, `Quem você encontrou`, filtros `Todos 0`, `NPCs 0`, `Ameaças 0`, `Animais 0`, `Não categorizados 0` e `Ninguém cruzou seu caminho ainda`. `Cartógrafo QA C18`, aparência, PV e `SEGREDO QA` não apareceram. Evidência sem token: `Testes/evidencias/correcao-jogador-final-f77-npc-oculto.jpg`.

Esse checkpoint foi feito antes do reveal solicitado ao mestre; palpite persistente, presença revelada e leitura de PV/turno continuam aguardando o pareamento. O erro remoto persistente permanece `Missing or insufficient permissions.` / `Falha na sincronização` / `O servidor ainda não confirmou os convites. Confira a conexão e atualize.`.

## Ficha própria: bloqueio reproduzido

Em Configurações, a conta ofereceu somente o rascunho pré-existente `Íria QA Mobile` (`Parou em: Magias`, etapa `7 / 9`); não criei nem completei outra ficha. Abrir esse rascunho pela UI levou a `/character/create/...`, mas não o tornou elegível para vínculo. Em seguida, na aba Participantes da f77, a UI continuou mostrando `Você Jogador · Ativo Ficha ainda não vinculada` e apenas `Selecione sua ficha em Configurações para vinculá-la à campanha.`, sem seletor ou botão de vínculo, junto aos mesmos erros remotos de permissão. Evidência sem token: `Testes/evidencias/correcao-jogador-final-f77-ficha-bloqueada.jpg`.

### Reteste após autorização para concluir a ficha sintética

Retomei `Íria QA Mobile` pela UI, selecionei os 2 truques obrigatórios (`Ilusão Menor`, `Mãos Mágicas`) e 4 magias (`Curar Ferimentos`, `Detectar Magia`, `Palavra Curativa`, `Disfarçar-se`), avancei por Detalhes e cheguei a Revisão com `Tudo pronto para criar o personagem.`. `Salvar rascunho` confirmou `Rascunho salvo. Você pode retomar esta criação depois.`. A confirmação falhou duas vezes com o texto exato `Revisão esperada não confere com a revisão atual.`. Recarreguei, reabri Magias→Detalhes→Revisão e repeti; o erro permaneceu. Portanto a ausência de vínculo inicialmente era pré-condição do rascunho incompleto, mas a conclusão agora tem um bloqueio concreto de revisão que impede prosseguir ao teste de vínculo. Evidência sem token: `Testes/evidencias/correcao-jogador-final-f77-ficha-revisao-erro.jpg`.

Para destravar o pareamento sem apagar o rascunho antigo, criei pela UI a ficha sintética autorizada `Íria QA Pareamento final` (ID local novo), usando Humano/Bardo/Artista, matriz padrão, equipamento Alaúde, 2 truques e 4 magias. A primeira revisão apontou a pendência concreta `Proficiência "acrobatics" foi concedida mais de uma vez. ( choices.bard.skills )`; substituí Acrobacia por Arcanismo, a revisão passou com `Tudo pronto para criar o personagem.` e `Confirmar personagem` abriu a ficha com PV `10 / 10`.

Configurações tornou essa ficha ativa. Em Participantes f77, `Vincular minha ficha` confirmou `Personagem vinculado à campanha.`; após reload, a UI persistiu `Você Jogador · Ativo Ficha: Íria QA Pareamento final` e `Íria QA Pareamento final · Vinculado à campanha`. A sincronização remota terminou em `Missing or insufficient permissions.` / `Falha na sincronização` / `O servidor ainda não confirmou os convites. Confira a conexão e atualize.`. Evidência sem token: `Testes/evidencias/correcao-jogador-final-f77-ficha-vinculada.jpg`.

## C14: cópia segura do rascunho antigo

Retomar o ID antigo pela UI exibiu `Este rascunho já foi usado` e `Uma ficha com este identificador já existe. Você pode continuar a criação em uma cópia do rascunho.`. `Criar uma nova ficha deste rascunho` abriu ID novo `c9cb344b-fd3d-4a01-8c27-572fe4f000fa`; a cópia manteve as escolhas de 2 truques (`Ilusão Menor`, `Mãos Mágicas`) e 4 magias (`Curar Ferimentos`, `Detectar Magia`, `Palavra Curativa`, `Disfarçar-se`), avançou a revisão com `Tudo pronto para criar o personagem.` e confirmou a ficha. O rascunho antigo permaneceu intacto. Depois restaurei `Íria QA Pareamento final` como ficha ativa para preservar o vínculo f77.

## Sessão C18 após vínculo

Ao abrir a sessão ativa f77 com a ficha vinculada, a UI mudou para leitura de jogador: `Sessão 1 · Sessão QA C18`, `Em andamento`, `Presença: Íria QA Pareamento final · ausente`. `Nova sessão`, `Encerrar`, `Próximo turno` e `Nova rodada` não foram oferecidos; o jogador não recebeu controle de mestre. Como a presença ainda está ausente, não há ordem/rodada/turno nem PV legível nesta tela. O erro remoto continua `Missing or insufficient permissions.`. Evidência sem token: `Testes/evidencias/correcao-jogador-final-f77-sessao-ficha-vinculada.jpg`.

Após o mestre marcar presença e iniciar a ordem, reload da sessão exibiu `Presença: Íria QA Pareamento final · presente`, `Rodada 1` e a linha `01 Íria QA Pareamento final Personagem · PV 10/10 15 Em turno`. A UI permaneceu somente leitura para o jogador: não ofereceu `Nova sessão`, `Encerrar`, `Próximo turno` ou `Nova rodada`. Evidência sem token: `Testes/evidencias/correcao-jogador-final-f77-sessao-turno-pv10.jpg`.

## NPC revelado e palpite persistente

Após o reveal do mestre e reload/sincronização local, Elenco exibiu `Cartógrafo QA C18` e `APARÊNCIA Manto azul com um mapa dourado.`. PV `12` e `SEGREDO QA` não apareceram; o card permaneceu sem dados privados. No painel `Seu palpite`, preenchi `Raça ou espécie que parece` com `Cartógrafo errante` e `O que você acha` com `QA C18: acho que o mapa dourado guia a rota.`. A UI confirmou `Palpite guardado. O mestre vai ver.`; após reload o card mostrou `2 suposições` e os dois valores permaneceram. Evidência sem token: `Testes/evidencias/correcao-jogador-final-f77-npc-palpite.jpg`.

## Diário f77 salvo localmente

Na campanha f77, criei pela UI o registro `QA diário f77 C18` com a nota `Pista do jogador para o mestre.`. Salvar exibiu `Salvo localmente.`; fechei o editor e a lista confirmou `1 registro` com o título e nota. O reload final fica pendente da confirmação do mestre para o pareamento remoto.

Sem recarregar o diário, cliquei `Sincronizar agora` em Participantes. A UI passou por `Jogador · sincronizando`, `Sincronização pendente` e `Há convites ou vínculos aguardando confirmação.`, terminando novamente em `Jogador · erro de sincronização`, `Missing or insufficient permissions.`, `Falha na sincronização` e `O servidor ainda não confirmou os convites. Confira a conexão e atualize.`. Evidência sem token: `Testes/evidencias/correcao-jogador-final-f77-diario-sync.jpg`.

Após confirmação do mestre, recarreguei `/journey/journal`: a lista continuou com `1 registro`, `QA diário f77 C18` e `Pista do jogador para o mestre.`. O mestre confirmou a leitura após reload pela captura pareada `correcao-mestre-diario-recebido-reload.jpg`. Evidência do jogador sem token: `Testes/evidencias/correcao-jogador-final-f77-diario-reload.jpg`.

## Objetivos e missões C06 no jogador

Após o reload da Visão geral f77, a UI persistiu `Objetivos 2`, incluindo `QA objetivo C06 editado`, e `Missões 2`, incluindo `QA missão C06 editada ... Concluída`; o resumo mostrou `Missões em andamento 1`. Não apareceram comandos de editar, excluir ou concluir para o jogador. Evidência sem token: `Testes/evidencias/correcao-jogador-final-f77-objetivos-missoes.jpg`.
