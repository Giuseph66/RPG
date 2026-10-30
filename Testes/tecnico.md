# Validação técnica e produção — 04/10/2026

## Resultado

O projeto inicia com Node 24 e compila. A suíte completa não passa: **1.002 testes aprovados, 13 falhas e 1 ignorado**, em 150 arquivos. As mesmas 13 falhas reapareceram ao executar apenas os cinco arquivos afetados com um único worker. A rodada não alterou código de produto.

O navegador abriu produção, criou campanha real em IndexedDB, exportou backup, rejeitou envelope inválido, importou o backup em outra origem limpa e preservou uma campanha criada com o servidor local desligado. A interface de importação com conflito apresentou um bloqueio confirmado.

A prova entre contas confirmou convite, membro e revelação parcial de NPC, mas expôs recusas de sincronização de mapa/diário, crash ao escrever palpite e vínculo de ficha inacessível ao jogador. A prova de ficha encontrou falha de morte automática na queda inicial e prévia/estado desatualizados no descanso. Os detalhes e limites estão abaixo.

## Ambiente

Repositório `/home/jesus/Progetos/RPG`, revisão `948adc2cae6a2f42ae5ea3e069b72bcbd96fcb12`, árvore inicialmente limpa. O diretório original do chat contém modelos 3D; o aplicativo foi localizado entre os projetos cadastrados no Codex. Dependências existentes; nenhuma instalação.

O Node padrão do terminal era 20.19.2. Os comandos do aplicativo usaram explicitamente `/home/jesus/.nvm/versions/node/v24.12.0/bin`, conforme `engines` do projeto. Horários dos logs são America/Cuiaba, UTC−4.

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort` | Iniciou, HTTP 200 | [dev.log](evidencias/dev.log) |
| `npm test` | Exit 1; 144 arquivos passaram, 5 falharam, 1 ignorado; 85,06 s | [Suíte completa](evidencias/testes-automatizados.log) |
| `npm test -- src/app/bootstrap.test.tsx src/app/router.test.tsx src/features/actions/Actions.test.tsx src/features/compendium/Compendium.test.tsx src/components/ui/feedback/AppModal/AppModal.test.tsx --maxWorkers=1` | Exit 1; 39 passaram, mesmas 13 falhas; 29,42 s | [Reteste](evidencias/reteste-falhas.log) |
| `npm run build` | Exit 0; inclui `tsc -b` | [build.log](evidencias/build.log) |
| Preview produção, portas 4173 e 4174 | Iniciaram | [Preview](evidencias/preview.log), [origem limpa](evidencias/preview-restauracao.log) |

Não foi usado `--aplica`: o comando de teste não gravou correções do catálogo. O teste ignorado é a atualização de checksums condicionada a `APLICA` em `tests/srd/manifesto.test.ts`; ignorá-lo nesta rodada sem alteração de catálogo é esperado.

## Falhas automatizadas reproduzidas

| Arquivo | Falhas | Sintoma observado |
| --- | --- | --- |
| `src/app/bootstrap.test.tsx` | 3 | Texto esperado ausente: `Ábaco`, `Carregando personagens`, `Ativa`. |
| `src/app/router.test.tsx` | 4 | Contexto WebGL indisponível; resultados `undefined`; texto `Poção de cura` ausente. |
| `src/features/actions/Actions.test.tsx` | 2 | `Cannot read properties of undefined (reading 'dispatchEvent')` nos cenários de descanso/prévia. |
| `src/features/compendium/Compendium.test.tsx` | 3 | Seletores retornam `null`; chamada de filtro difere da expectativa; diálogo esperado não localizado. |
| `src/components/ui/feedback/AppModal/AppModal.test.tsx` | 1 | Diálogo permanece após evento de backdrop no teste. |

Há avisos de React sobre `act()` e de jsdom sobre `HTMLCanvasElement.getContext()`. A falha WebGL é evidência de incompatibilidade da simulação DOM com esse cenário, não prova de que dados 3D falhem no navegador. As demais falhas precisam de triagem entre testes desatualizados, carregamento assíncrono e regressão de comportamento. Esta rodada não presume uma causa comum nem transforma os 13 erros em 13 bugs de produto confirmados.

Como contraprova manual focal, o diálogo de **Bola de Fogo** abriu em produção e fechou por clique no backdrop, por `Escape` e pelo botão **Fechar**; o foco voltou ao resultado após o fechamento pelo backdrop. Portanto, a falha automatizada de AppModal não reproduziu um bloqueio geral de fechamento nesse cenário real. Isso não encerra a triagem do teste nem cobre todos os modais.

**Prioridade P1:** restaurar uma suíte confiável; acertar seletores/contratos atuais, aguardar estados assíncronos corretamente e separar testes de renderização WebGL dos cenários DOM. Reteste serial confirma que reduzir concorrência sozinho não resolve.

## Build e carga inicial

O build emitiu aviso de chunks acima de 500 kB. `index-B7wHmQSG.js` ficou com **4.462,76 kB**, gzip **1.386,82 kB**; `PhysicalDiceStage-BWiGNdYe.js`, **718,61 kB**, gzip **185,74 kB**. Há divisão de telas em chunks, mas o principal ainda é grande.

**Melhoria P2:** investigar o conteúdo do bundle principal e adiar recursos não necessários para a primeira tela. Esses números justificam medir transferência, processamento e interação em celular de baixo desempenho. Não foram medidos FPS, memória, bateria ou uma conexão móvel real; o aviso não basta para afirmar lentidão em todo aparelho.

## Backup e recuperação no navegador

Foi criada a campanha sintética `QA Backup Produção 2026-10-04`, sem personagens/anexos. A exportação gerou arquivo JSON real em Downloads, preservado como [backup-campanha-qa.json](evidencias/backup-campanha-qa.json). O arquivo contém envelope, versão, referência do pack, campanha, contagens e hashes. O mecanismo de observação de download do computer use expirou, mas o arquivo efetivamente baixado foi localizado e lido; isso é limitação da ferramenta de observação, não falha de exportação.

O arquivo [backup-invalido.json](evidencias/backup-invalido.json), propositalmente incompatível, produziu `Envelope de backup desconhecido ou incompatível.` A campanha original continuou presente após reload.

Importar o backup exportado de volta à origem 4173 mostrou `1 conflito(s) encontrado(s).`. O botão **Confirmar importação** permaneceu desabilitado tanto com **Criar cópia** quanto com **Substituir**. A inspeção do símbolo `DataManagementPanel` pelo grafo confirmou que `preview.conflicts.length > 0` desabilita o botão independentemente da política.

**Bug P1 — políticas de conflito inacessíveis pela interface:** o usuário pode escolher como tratar o conflito, mas não consegue executar nenhuma opção. Reprodução: criar campanha → exportar → importar o mesmo arquivo → selecionar cada política → observar botão desabilitado. Esperado: permitir cópia com novos IDs ou substituição explicitamente validada, conforme contrato do serviço. Impacto: restauração/substituição no mesmo banco e duplicação de campanha bloqueadas. [Evidência visual](evidencias/backup-conflito.jpg). Nenhuma substituição foi executada.

Na origem limpa `http://localhost:4174/settings/data`, a mesma importação apresentou **Nenhum conflito encontrado** e confirmação habilitada. Após confirmar, a campanha apareceu no seletor de Jornada; foi selecionada e a persistência verificada por reload. Essa prova cobre campanha simples. Backup de personagem completo, relações, anexos, corrupção real e reset destrutivo não foram exercitados nesta prova manual complementar.

## PWA e indisponibilidade da origem

No preview 4173, páginas foram carregadas antes do teste. O processo desse preview foi encerrado; `curl` confirmou conexão recusada/HTTP `000`. Nenhum outro serviço foi desligado.

Com a origem indisponível, o navegador recarregou Jornada, recuperou `QA Backup Produção 2026-10-04`, criou `QA Escrita Offline 2026-10-04` e voltou a exibir essa segunda campanha depois de outro reload. O seletor mostrava as duas campanhas. O compêndio já visitado também abriu com o servidor desligado. [Campanha offline](evidencias/producao-escrita-offline.jpg).

Esta é prova de indisponibilidade do servidor da aplicação com cache previamente preenchido, leitura e escrita local. A conexão geral do computador permaneceu ativa. Não prova primeira visita sem rede, todo chunk nunca visitado, instalação Android/iOS, atualização do service worker, cache antigo contra novo build ou armazenamento sob pressão.

O preview foi religado após a prova. A versão do worker encontrada no código é `2026.09.12`; não foi alterada.

## Autenticação e comunicação

O subagente mestre encontrou `auth/network-request-failed` ao cadastrar uma conta sintética no navegador do Codex. Um login posterior recebeu erro normal de credenciais e um novo cadastro teve sucesso. O sintoma inicial foi recuperado no reteste; sua causa não foi determinada. A aprovação de convites/sessão depende da avaliação entre contas, não desse erro inicial isolado.

A raiz fez uma tentativa diagnóstica de login REST com endereço sintético inexistente e senha inválida, usando a configuração existente. O backend respondeu **HTTP 400 / INVALID_LOGIN_CREDENTIALS**, resultado registrado em [firebase-diagnostico.json](evidencias/firebase-diagnostico.json). Isso comprova alcançabilidade do endpoint pelo terminal e rejeição das credenciais diagnósticas; não comprova conectividade do navegador, cadastro válido ou regras Firestore corretas. Não foram gravados tokens, senhas ou chaves no relatório.

O Chrome do jogador já possuía sessão real. Dados pré-existentes foram preservados; somente dados QA novos foram autorizados durante a coordenação. A origem de produção 4173 apresentou perfil local limpo. A raiz criou uma conta sintética de jogador pelo endpoint de cadastro Firebase, com HTTP 200; o jogador recebeu credenciais já existentes para login na origem limpa. [Registro sem credenciais](evidencias/conta-qa-jogador-criacao.json). A avaliação de permissão real de jogador exige contexto efetivamente restrito a esse papel, conforme o relatório do jogador.

Na campanha autenticada QA, o mestre registrou **Firestore RPC Commit / permission-denied** para escrita na subcoleção de mapas, além do aviso `[sync] Coleções da campanha recusadas pelo Firebase (publique as regras do Firestore)`. A interface permaneceu em **Enviando ao Firebase…** e o header passou a **sem conexão**. Esse é um bloqueio remoto observado, mesmo com Auth funcionando. A mensagem sugere revisar publicação das regras, mas não comprova sozinha que essa seja a única causa: conferir regra implantada, identidade, ownership e forma do documento antes de qualquer correção. As regras/configurações remotas não foram modificadas nesta rodada.

## Pontos positivos

- Inicialização local e compilação funcionam com o runtime exigido.
- Grande parte da suíte passa, incluindo motores/persistência cobertos pelos testes existentes.
- Exportação de campanha produz envelope estruturado; importação inválida exibe erro claro.
- Importação simples funciona em banco limpo.
- Campanha permanece após reload e é possível criar/persistir outra com origem indisponível.
- Telas mostram carregamento e ferramentas de reset exigem confirmação explícita na interface.

## Falha de execução encontrada no papel de jogador

Após aceitar o convite QA e receber uma criatura revelada pelo mestre, o jogador abriu **Seu palpite**, selecionou categoria NPC e preencheu **O que você acha**. A página ficou vazia; console registrou `TypeError: Cannot read properties of null (reading 'value')` no chunk de criaturas. O relatório do jogador contém reprodução, recuperação e resultado do reteste.

**Bug P1:** uma entrada de texto derruba a interface da sessão. Inspeção localizada corroborou um provável mecanismo em `src/features/journey/creatures/PlayerCreatureBoard.tsx:53`: `event.currentTarget.value` é lido dentro do updater funcional de `setDraft`, que pode executar depois que `currentTarget` ficou nulo. O mesmo padrão existe no campo de nome, linha 46; esse campo não deve ser considerado reproduzido apenas por inspeção. Correção sugerida: capturar o valor durante o handler e passar o valor estável ao updater, depois reproduzir o fluxo no papel real de jogador. Nenhum código foi alterado nesta rodada.

## Vínculo da ficha no papel de jogador

O jogador criou `Nara QA Jogadora` em sua conta QA e permaneceu membro ativo da campanha do mestre. Pelo caminho visível **Conta → Abrir colaboração**, a aplicação navegou para `/journey/participants`, mas continuou mostrando **Visão geral**; não apareceu **Vincular minha ficha**. O mestre também não encontrou vínculo no card desse membro e continuou vendo **Ficha ainda não vinculada**.

**Bug P1 — fluxo de vínculo inacessível ao jogador:** impede concluir o ingresso com personagem e verificar combate/PV compartilhados. A inspeção localizada encontrou **Vincular minha ficha** em `src/features/collaboration/CollaborationPanel.tsx:544`, dentro da visão `participants`. Porém `src/app/router.tsx:805` só fornece esse painel quando `master` é verdadeiro; o atalho de Conta para a mesma rota está na linha 447. Esse encadeamento corrobora a reprodução por UI. Correção sugerida: oferecer a seção de vínculo a jogador ativo, preservando restrições de operações de mestre, e retestar o vínculo da própria ficha até aparecer no segundo cliente. Não chamar a falta de vínculo apenas de falta de dados de teste: houve ficha QA, convite aceito e tentativa pelo atalho da aplicação.

## PV e falha de morte

O jogador observou a sequência em ficha QA: PV 10 → dano 4 → PV 6; adicionar 3 temporários manteve PV base 6; dano 4 consumiu os temporários e deixou PV base 5; cura 2 levou a 7; dano 7 levou a zero. Ao chegar a zero, a UI marcou **Falhas 1/3** automaticamente. O jogador confirmou que não rolou nem marcou salvamento de morte. Cura 1 recuperou consciência e zerou contadores.

**Bug P2 — falha de morte na queda inicial:** o contrato local [Zero PV, estabilidade e morte](../docs/criacao/regras/morte.md) distingue queda de PV positivos para zero de dano recebido quando já está em zero; esse último gera falha. Em `src/domain/rules/combat/index.ts:131`, `applyDamage` incrementa falhas também quando `enteredZero` é verdadeiro. O ramo posterior para queda inicial, linha 134, não é alcançado nesse evento de dano positivo. A observação manual e a inspeção do motor coincidem. Rever essa condição contra a fonte do pack e acrescentar prova da transição de PV positivo a zero sem falha automática, mantendo os casos de dano já em zero, crítico e morte maciça.

A absorção por PV temporários e a recuperação por cura tiveram resultados coerentes no cenário testado. Não foram exercitadas todas as combinações de resistência, vulnerabilidade, concentração, nocaute e talentos em UI; parte dessas regras possui testes existentes, que não substituem a prova manual de todas as combinações.

## Descanso e atualização da ficha

Em PV **1/10**, a prévia de descanso longo afirmou **Pontos de vida já estão cheios**. A primeira confirmação retornou **Revisão esperada não confere com a revisão atual** e manteve 1/10. Depois de recarregar e tentar uma única vez, a operação retornou **Descanso longo concluído: +9 PV**. Navegar imediatamente à ficha ainda exibiu **1/10**; recarregar a ficha revelou **10/10** e contadores zerados.

**P2 — prévia e ficha desatualizadas:** a confirmação pode persistir, mas a interface apresenta informação antiga até reload. O erro de revisão foi recuperável no cenário e não se repetiu após recarregar; sua causa não foi isolada. A mensagem técnica também deveria orientar recuperação/revisão sem depender de o jogador descobrir esse caminho. Verificar assinatura dos stores, refresh das rotas e revisão usada no comando antes de concluir causa. Não afirmar perda de dados: o resultado persistido foi comprovado depois do reload.

## Próximos testes necessários

As duas contas QA já foram usadas na prova de convite e NPC. Após corrigir o vínculo de ficha e resolver as recusas de escrita remota, repetir associação de personagem, sincronização de notas/mapas, iniciativa e PV compartilhados, desconexão/reconexão e permissões. Retestar crash de palpite, regra de morte, refresh/descanso e conflito de backup; fechar as 13 falhas automatizadas. Completar prova PWA de atualização/instalação e desempenho em celular físico. A lista de cobertura manual de mestre e jogador está nos relatórios respectivos.
