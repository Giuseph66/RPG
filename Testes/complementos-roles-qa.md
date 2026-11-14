# QA local de propostas por perfil

## Escopo e isolamento

Provar o fluxo de uma proposta de criatura customizada entre duas sessões Playwright locais e sintéticas: jogador envia pela UI, mestre importa o backup manual, revisa/aprova pela UI, exporta e o jogador importa o backup pela UI normal. A verificação final deve mostrar a criatura no catálogo do jogador sem acionar visto. Se nenhum personagem estiver selecionado, não inferir `Character.beastSightings`. O transporte entre sessões é explicitamente backup manual; esta prova não demonstra sincronização remota.

Perfis/sessões reservados: `sup03-roles-qa-2026-11-13-master` e `sup03-roles-qa-2026-11-13-player`. Artefatos ficam em `output/playwright/sup03-roles-qa-2026-11-13/`. Nenhum perfil de C será reutilizado.

## Execução — 2026-11-13

- A skill Playwright CLI foi lida em `/home/jesus/.codex/skills/playwright/SKILL.md`; `npx` está disponível e o pacote CLI está no cache npm. Nenhuma dependência foi instalada.
- `http://127.0.0.1:5173/` respondeu HTTP 200. O servidor existente foi preservado.
- Diretórios separados `master-artifacts/` e `player-artifacts/` foram criados. Foram abertas duas sessões Playwright isoladas, com os perfis reservados acima; o perfil e o servidor de C foram preservados.
- Mestre local sintético: `local-500cde9d-0e35-4a9f-b973-c8457e657380`. Jogador local sintético: `local-2e9a7418-1a36-4eeb-83c5-b8bd09c41de9`. Ambos exibem `Sessão encerrada`, `Somente neste dispositivo` e `Sem sessão remota`.
- A campanha `QA local propostas 2026-11-13` (ID `973071ff-c867-40ce-a523-25cebb343372`) foi criada pela UI do mestre. `master-artifacts/initial-campaign.json` foi exportado pela UI; o envelope contém campanhas e coleções de jogo, mas não memberships. A tela Participantes informa que convites locais não chegam a outro navegador.
- O backup inicial foi importado pelo fluxo normal da UI no perfil player com política `Substituir`. Sem membership, a jornada continuou rotulada `visão do mestre`. Por autorização do root, apenas o vínculo inicial foi então semeado no perfil player chamando `IndexedDbMembershipRepository` de produção carregado pelo Vite: membership ativo `player` para a campanha acima, com `invitedBy` apontando para o mestre. A conta local já existia. Nenhuma proposta, criatura, reveal, outbox ou marca de visto foi inserida por fixture. Após reload normal, a UI mostrou `Jogador` e `Jornada · sua visão`.
- Na UI player, foi submetido `Lince de Névoa QA`, com tipo besta e ND não informado. A confirmação exibiu `Sugestão enviada ao mestre. Ela ainda não foi aprovada nem registrada como avistamento.` O backup exportado pela UI, `player-artifacts/player-proposal-backup.json`, contém uma proposta `pending`, `proposedBy` igual ao account ID do jogador e `challengeRating: null`; contém zero criaturas. Transporte player→mestre foi esse backup manual.
- O mestre importou o backup pela UI com `Substituir`; a prévia indicou um conflito e a UI preservou a versão anterior na área de recuperação. O quadro de revisão mostrou a proposta pending e informou que o ND final precisa ser definido. Ao editar ND para 1/8, XP 25 e nota de revisão, a console registrou uma exceção de UI descrita abaixo. A proposta continua pendente; nenhuma aprovação foi feita.

### Exceção da primeira sessão (corrigida pelo owner C)

Na primeira sessão, a edição dos campos do bloco revisado do mestre lançou `TypeError: Cannot read properties of null (reading 'value')` em `CreatureProposalBoard.tsx:342:54`, após remover `ND não informado` e preencher campos numéricos/nota; aquela tentativa não aprovou a proposta. Evidência original preservada em `.playwright-cli/console-2026-11-14T00-43-26-590Z.log`. C corrigiu o handler para capturar o valor do evento antes do updater e seu focal passou 17 testes. A reexecução completa abaixo aprovou pela UI sem erros de console em nenhum perfil (`master-artifacts/master-console-errors-final.txt`, `player-artifacts/player-console-errors-final.txt`). Esta lane não alterou produto.

### Gates rápidos desta rodada

- `npm run typecheck` — exit 0; log `Testes/logs/complementos-roles-qa-typecheck.log`.
- `npm run build` — exit 0; log `Testes/logs/complementos-roles-qa-build.log`. O build emitiu apenas warnings de chunks grandes e imports dinâmicos inefetivos.
- Esses gates foram executados antes da exceção de UI e não provam a correção do fluxo. Nova rodada global aguarda os owners fecharem os hunks de C e os casts; não foi executada suíte global nesta tarefa.

## Roteiro da primeira sessão — histórico

1. Mestre criar campanha e exportá-la pela UI — concluído.
2. Player importar campanha por backup; preparar somente o membership player no repositório local de produção — concluído; o backup não transporta membership e convites locais não atravessam perfis.
3. Player enviar animal customizado pending pela UI e exportar campanha — concluído.
4. Mestre importar por replace e aprovar pela UI com ND revisado — bloqueado naquela tentativa pela exceção acima.
5. Exportar mestre e importar no player por replace — ainda pendente naquela sessão efêmera.

## Replay de fechamento — 2026-11-14

O handle efêmero da primeira sessão já não estava aberto quando a tarefa foi retomada (`playwright-cli list` mostrou apenas a sessão preexistente de C; não havia diretórios persistentes dos perfis QA). Isso não prova perda de dados do app. Para fechar com estado durável e sem reutilizar perfis de C, criei sessões Playwright persistentes com `--persistent` e `--profile` absolutos:

- Mestre: sessão `sup03-roles-qa-2026-11-13-master`, user-data-dir `output/playwright/sup03-roles-qa-2026-11-13/master-profile`, account `local-bba0b26f-a414-43fb-8872-02aeaa64d383`.
- Jogador: sessão `sup03-roles-qa-2026-11-13-player`, user-data-dir `output/playwright/sup03-roles-qa-2026-11-13/player-profile`, account `local-942d7c53-23e2-45be-996a-a3a44da2c0d5`.

No perfil novo do mestre, a campanha `QA local propostas replay 2026-11-14` foi criada pela UI (ID `fce5b72a-82a1-4204-a085-4f20c6a071ad`) e exportada como `master-artifacts/replay-initial-campaign.json`. O player importou esse arquivo pela UI com `Substituir`. Como o envelope não inclui memberships e convites locais não atravessam perfis, semeei somente o vínculo inicial `role=player`, `status=active`, usando `openDatabase` e `IndexedDbMembershipRepository` reais carregados do app via Vite. O reload normal mostrou o banner `Jogador` e a Jornada `sua visão`. Nenhuma proposta, criatura, reveal, sighting, outbox ou marca de visto foi semeada.

Na UI player, enviei `Lince de Névoa QA` como proposta `pending`, com `challengeRating: null`. A confirmação disse que ainda não foi aprovada nem registrada como avistamento. O backup manual `player-artifacts/replay-player-proposal.json` contém uma campanha, uma proposta de autoria do account player, zero criaturas e zero `sightings`.

O mestre importou esse backup pela UI com `Substituir`; a prévia mostrou um conflito para a campanha existente. No quadro de sugestões, a proposta estava pendente e a aprovação bloqueada enquanto o ND não estivesse informado. Pela UI, o mestre definiu ND 1/8, XP 25, nota `ND final arbitrado pelo mestre: 1/8 (25 XP).` e aprovou. A interface exibiu `Aprovada`, `0 pendente(s)` e a criatura no catálogo do mestre como `Oculto` até revelação.

O mestre exportou pela UI `master-artifacts/replay-master-approved-backup.json`. O envelope contém 1 campanha, 1 proposta aprovada na revisão 2, 1 criatura, 1 registro de `sightings` da campanha e 0 palpites; `reviewedBy` é o account mestre, `reviewedStatBlock.challengeRating` é 1/8, XP é 25, e `creatures[].reveals` concede ao account player os campos `name`, `kind` e `statBlock`. O registro de `sightings` é a revelação de campanha gerada no fluxo aprovado. Ele não é `Character.beastSightings`, que registra visto para Forma Selvagem.

O player importou esse backup pela UI com `Substituir`. A tela permaneceu no papel `Jogador` e mostrou `Lince de Névoa QA` no catálogo acessível, categoria `Animais 1`, `3 pistas` e `Bloco completo`; também mostrou a proposta como aprovada e a nota do mestre. Nenhum controle de marcar como visto foi acionado. O backup tem zero personagens e nenhum personagem estava selecionado no perfil player, portanto esta etapa prova o retorno da revelação ao catálogo sem ação explícita de visto, mas não infere um valor de `Character.beastSightings`. C já validou separadamente a marcação explícita e a transformação da criatura customizada.

Os artefatos novos desta rodada estão em `master-artifacts/` e `player-artifacts/`, incluindo os três backups citados, `master-approved-final-snapshot.txt` e `catalog-not-seen-final-snapshot.txt`; os logs finais de console reportam 0 erros nos dois perfis. As cópias históricas e o primeiro erro continuam preservados. O transporte entre os perfis foi backup manual em ambos os sentidos; este ensaio local não demonstra sincronização remota nem ACL Firestore.

## Complemento: catálogo de formas sem visto — 2026-11-14

Para ligar a aprovação do mestre ao catálogo de formas do jogador, importei pela UI normal uma cópia do personagem de preparação `Mira SUP03 Fada` usando `output/playwright/sup03-fixtures-regras-2026-11-13/fairy-level3-wizard-derived-import.json`. A prévia da importação identificou um backup de personagem; a política selecionada foi `Criar cópia`. O app criou a cópia com ID `ff167347-df93-405e-bed8-62b02023c32b` e a abriu na ficha. O personagem é Druida 3. No momento da importação, ainda não estava vinculado a uma campanha; a fixture não contém campanhas. Fiz o vínculo depois pela UI `Jornada > Participantes > Minha ficha na campanha`, conforme o complemento final abaixo. A preparação foi uma importação UI autorizada, não uma edição do backup aprovado nem um seed do estado de visto.

Mantive selecionada a campanha aprovada `QA local propostas replay 2026-11-14`. Após a cópia, a UI `Jornada > Elenco` ainda mostrou `Lince de Névoa QA` como um animal revelado ao jogador (`Animais 1`, `3 pistas`, `Bloco completo`), conforme `player-artifacts/catalog-after-druid-copy-snapshot.txt`. Na ficha da cópia, `Forma Selvagem` mostrou `Nenhuma besta registrada como vista`; o seletor `Besta vista` estava desabilitado e continha apenas `Escolha uma besta…`, e `Transformar` também estava desabilitado (`player-artifacts/wild-shape-unseen-final-snapshot.txt`). Não marquei o Lince como visto nem tentei transformar. A console do player após a cópia reportou zero erros (`player-artifacts/player-console-errors-after-character-copy.txt`).

Esta observação distingue os dois registros: `creatures[].reveals` e `sightings` da campanha tornam o bloco acessível no Elenco; eles não preenchem `Character.beastSightings`. A cópia Druida 3 serve somente para verificar que a forma customizada revelada ainda não é elegível sem a ação explícita de visto. A sequência termina com o personagem copiado selecionado, a campanha aprovada preservada e o estado de visto intocado. O transporte entre perfis continua sendo backup manual, não sincronização remota.

## Primeira busca no Compêndio — diagnóstico antes do vínculo — 2026-11-14

Com a cópia `Mira SUP03 Fada` (Druida 3) ainda selecionada, abri `Regras > Criaturas` no mesmo perfil player. Antes da busca, confirmei em `Jornada > Visão geral` que `QA local propostas replay 2026-11-14` continuava selecionada (`player-artifacts/campaign-selected-before-compendium-search.txt`). O Compêndio exibiu `95 no catálogo · 0 vistas`. Busquei exatamente `Lince de Névoa QA`; a interface respondeu `Nenhuma correspondência` (`player-artifacts/compendium-custom-creature-search-result.txt`). Como o registro não aparece na lista, não há painel do Lince nem ação `Marcar como vista` a verificar. Não cliquei em nenhum controle de visto nem tentei transformar.

Esta primeira busca ocorreu antes de vincular a ficha à campanha; por isso, o resultado `Nenhuma correspondência` não era conclusivo sobre a integração do Compêndio. O estado de visto permaneceu intocado. A tela Participantes ofereceu o vínculo normal e a busca foi repetida após o vínculo e reload, como registrado a seguir.

## Fechamento após vínculo normal da ficha — 2026-11-14

Na UI `Jornada > Participantes`, a seção `Minha ficha na campanha` listou `Mira SUP03 Fada` e ofereceu `Vincular minha ficha`. Acionei esse botão; a UI confirmou `Personagem vinculado à campanha.` (`player-artifacts/participants-character-linked-after-click.txt`). A leitura somente leitura do IndexedDB no perfil confirmou a personagem ativa `ff167347-df93-405e-bed8-62b02023c32b`, `campaignId=fce5b72a-82a1-4204-a085-4f20c6a071ad`, revisão 2 e `beastSightings=null`; o `activeCharacterId` em localStorage coincide (`player-artifacts/active-character-record-after-reload.txt`, `player-artifacts/active-character-local-storage-after-reload.txt`). A campanha continua `QA local propostas replay 2026-11-14`.

Após o vínculo, navegar de Participantes para o Compêndio ainda mostrou resultado antigo de 95 itens e nenhuma correspondência. Recarreguei a rota do Compêndio; a aba voltou para Regras, então abri `Criaturas` e refiz a busca exata. Agora a tela mostrou `96 no catálogo · 0 vistas`, encontrou `Lince de Névoa QA` com ND 1/8 e estado `Ainda não registrada como vista`, e o detalhe exibiu o bloco aprovado (XP 25) junto ao botão `Marcar como vista` (`player-artifacts/compendium-lince-approved-mark-available-after-link.txt`). Não acionei esse botão nem tentei transformar. A leitura pós-reload continua mostrando `beastSightings=null`.

Assim, a sequência real prova aprovação/reveal → importação normal → ficha vinculada pela UI → criatura no Compêndio → ação explícita de visto disponível, sem marcar como vista. A navegação sem reload manteve o catálogo antigo; o reload atualizou a lista depois do vínculo. O fluxo é local e usa backups manuais entre perfis; não demonstra sincronização remota ou ACL Firestore.

## Reteste do vínculo sem reload após hidratação da ficha — 2026-11-14

Após B corrigir `linkToCampaign` para publicar a ficha selecionada na store somente depois de salvar com sucesso, repeti o trecho com uma nova cópia importada pela UI. Usei a sessão player `sup03-roles-qa-2026-11-13-player`, perfil persistente `/home/jesus/Progetos/RPG/output/playwright/sup03-roles-qa-2026-11-13/player-profile`, conta local sintética `local-942d7c53-23e2-45be-996a-a3a44da2c0d5` e a campanha aprovada `fce5b72a-82a1-4204-a085-4f20c6a071ad`.

Importei novamente pela UI, como `Criar cópia`, a fixture válida `output/playwright/sup03-fixtures-regras-2026-11-13/fairy-level3-wizard-derived-import.json`. A cópia Druida 3 `Mira SUP03 Fada` recebeu ID `c5602e11-cfe7-49d5-84c7-1b609e77ff54`; antes do vínculo, a leitura somente leitura do IndexedDB confirmou `campaignId=null`, revisão 1 e `beastSightings=null` (`player-artifacts/active-character-second-copy-before-link.txt`). Não encontrei ação de desvincular na UI, então usei essa nova cópia sem alterar a ficha anterior nem a proposta aprovada.

Na UI, usei `Jornada > Participantes > Minha ficha na campanha > Vincular minha ficha`, que confirmou `Personagem vinculado à campanha`. Sem reload, naveguei pela SPA a `http://127.0.0.1:5173/compendium`, abri `Criaturas` e busquei `Lince de Névoa QA`. O snapshot `player-artifacts/compendium-lince-after-link-without-reload.txt` mostra `96 no catálogo · 0 vistas`, Lince de Névoa QA em ND 1/8, estado `Ainda não registrada como vista`, bloco aprovado com XP 25 e o botão `Marcar como vista`. Não acionei o botão nem tentei transformar.

Depois dessa navegação, uma leitura somente leitura do IndexedDB confirmou que a mesma cópia está ativa na ficha de dados, agora com `campaignId=fce5b72a-82a1-4204-a085-4f20c6a071ad`, revisão 2 e `beastSightings=null` (`player-artifacts/active-character-second-copy-after-link.txt`). Assim, o reteste confirma que o vínculo normal atualiza o Compêndio no mesmo runtime, sem reload, enquanto a revelação de campanha continua distinta do visto para Forma Selvagem. Esta prova continua sendo local e baseada no transporte anterior por backups manuais; não verifica sincronização remota nem ACL Firestore.
