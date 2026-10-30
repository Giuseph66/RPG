# Teste manual do jogador — visão mobile

**Data:** 04/10/2026  
**Ambiente:** RPG local em Chrome, origem QA 127.0.0.1:4173; conta e campanha sintéticas desta rodada. Testes responsivos com viewport CSS 390×844 e 360×844, DPR reportado pelo navegador ≈0,9. Isso é emulação de viewport do Chrome, não aparelho físico nem teste de toque nativo.  
**Personagem usado:** Nara QA Jogadora, Humana Barda, nível 1, criada e mantida na conta QA. A ficha não foi vinculada a uma mesa real. A sessão real pré-existente foi preservada; nenhum identificador, credencial ou dado pessoal é registrado neste relatório.

## Resultado executivo

O percurso local de ficha cobre atributos, equipamento, PV, dados e inventário com boa densidade de informação e sem overflow horizontal nos dois tamanhos medidos. O ciclo de dano, PV temporários, cura e recuperação de estado de morte funcionou quase todo como esperado. A seleção de magias também persiste e permite rolar efeitos manualmente.

A participação na campanha compartilhada ficou incompleta: o convite foi aceito e o papel Jogador apareceu, mas a conta não oferece um caminho visível para vincular a ficha; o diário ficou apenas local, e o mestre confirmou que não recebeu o registro. O Elenco permite ver um NPC com os detalhes ocultos, porém editar um palpite derruba a tela inteira. Descanso longo, revisão de regras de ataque/magia e algumas gravações dependem de recarga ou ficam sem confirmação automática.

## Achados prioritários

### P1 — Editar palpite no Elenco deixa a página em branco

**Reprodução:** Jornada → Elenco → Guardião QA → escolher NPC em “Parece ser” → preencher “O que você acha”. Ao digitar, a tela fica completamente branca; recarregar restaura a lista. Reproduzido mais de uma vez em viewport de 390 CSS px. Nenhum palpite foi salvo.

O console registra TypeError: “Cannot read properties of null (reading 'value')” durante a atualização do palpite. Revisão de código feita pela raiz aponta o handler de nota em PlayerCreatureBoard.tsx:53, que lê currentTarget dentro do updater de estado. A captura anterior à falha está em evidencias/jogador-palpite-antes-360.jpg; o pós-falha não foi salvo porque a captura da página branca expirou. O log sanitizado está em evidencias/jogador-palpite-console.txt.

### P1 — Diário e dados da campanha não chegam ao mestre

**Reprodução:** na campanha QA, criar um registro em Meu diário com texto ficcional e confirmar. O jogador viu “Salvo localmente”, o registro permaneceu após recarga e a visão geral passou a mostrar Diário 1. O mestre continuou vendo zero registros e confirmou rejeição de escrita no Firestore. A conta também exibiu aviso de que o Firebase não confirmou alterações. O texto do registro foi exclusivamente sintético; não foi enviado conteúdo real.

O mapa permaneceu vazio com a mensagem “O mestre ainda não liberou nenhum mapa para você”. O mestre também relatou escrita de mapa recusada. Assim, diário e mapa não serviram como canal de comunicação compartilhado nesta sessão. A contagem local do diário pode dar a impressão de que o registro chegou à mesa, embora o mestre não o veja.

### P1 — Jogador não encontra ação para vincular a ficha à campanha

O convite foi aceito; a mesa QA aparece na conta, a jornada mostra “Jornada · sua visão” e o mestre confirmou o membro como Jogador ativo. A visão do jogador apresenta as guias Visão geral, Mapa, Meu diário e Elenco, sem Participantes ou Sessões. Conta → “Abrir colaboração” abre /journey/participants, mas nessa sessão continua renderizando a visão geral, sem painel de participantes ou botão “Vincular minha ficha”. O painel do mestre continuou indicando “Ficha não vinculada”.

Não foi possível testar combate ou atualização de turno entre mestre e jogador. A causa provável é que o painel de participantes fica restrito à visão do mestre; não afirmo que o vínculo seja impossível pelo lado do mestre, apenas que o fluxo disponível ao jogador não oferece essa ação.

### P2 — Entrada em 0 PV marca falha de salvamento imediatamente

**Reprodução:** com 7/10 PV, aplicar dano 7. A ficha chega a 0/10 e já mostra Falhas 1/3, “Morrendo — role um salvamento a cada turno”. Não cliquei em salvamento manual; a falha apareceu automaticamente ao cair a zero. Aplicar Cura 1 levou a 1/10, zerou falhas e voltou a “Consciente”.

A raiz comparou o comportamento com docs/criacao/regras/morte.md e encontrou divergência na regra local: entrar em 0 PV deve iniciar o estado morrendo; a falha deve ocorrer com dano recebido enquanto já está em 0. A cura e a limpeza dos contadores após cura foram observadas funcionando. Não testei rolagem real de salvamento por turno.

### P2 — Revisão de magia impede confirmar efeito automático

Na ficha QA, o gerenciador permitiu selecionar Prestidigitação, Zombaria Viciosa, Curar Ferimentos e Palavra Curativa. Em Ações → Magias → revisar Curar Ferimentos (nível 1), o painel diz “Sem custo”, “Sem efeito automático na ficha” e “Prévia da regra ainda não foi fornecida” (duas ocorrências); Confirmar execução fica desabilitado. Não consumi slot nem apliquei cura por esse painel. Rolar Cura 1d8+3 manualmente funcionou e gerou resultado 9, sem alterar a ficha.

A etapa Magias do criador, para a mesma combinação Humano/Bardo, dizia “Esta combinação não possui escolhas de magia publicadas no catálogo atual”, enquanto o gerenciador posterior ofereceu o catálogo acima. O contraste deixa ambíguo se o jogador deveria iniciar sem magias ou se a etapa de criação está incompleta. Captura da revisão bloqueada: evidencias/jogador-magia-bloqueada-360.jpg.

### P2 — Descanso longo tem preview incorreto e atualização visual atrasada

Com 1/10 PV após reload, o preview de Descanso longo mostrava “Pontos de vida já estão cheios”. A primeira confirmação retornou “Falha ao persistir o comando: Revisão esperada não confere com a revisão atual” e manteve 1/10. Após recarregar a ficha e repetir uma vez, o descanso foi concluído com “+9 PV”. Ao navegar imediatamente para Ficha, a tela ainda mostrava 1/10; recarregar a ficha então mostrou 10/10 e Falhas 0/3. Portanto, o erro CAS foi recuperável após recarga, mas preview e atualização entre rotas não refletiram o estado real em tempo real. Captura do erro inicial: evidencias/jogador-descanso-erro-360.jpg.

No descanso curto, o painel dizia que Dados de Vida estavam indisponíveis para a ficha nível 1. Descansar sem gastar dados concluiu com mensagem de sucesso; não testei gasto de dado. Não confirmei se a falta de dado é falha de modelagem ou limitação intencional.

## Cobertura dos fluxos

| Fluxo | O que foi observado | Resultado |
|---|---|---|
| Login QA e convite | Conta QA entrou; convite de uso único aceito; campanha e papel Jogador ficaram visíveis. O mestre confirmou membro ativo. O cabeçalho do jogador mostrava “Jogador · sem conexão”. | Parcial: entrada funciona, presença/sincronização e ficha compartilhada não foram concluídas. |
| Visão de campanha | Visão geral, mapa, diário e Elenco são fáceis de localizar. A campanha mostra 1 encontro, 0 mapas, 1 diário local e 1 criatura. | Parcial: contadores locais não provam sincronização; master via zero registros no diário. |
| Elenco e segredo do mestre | Após reload, Guardião QA aparece pelo nome e uma pista genérica; detalhe informa categoria desconhecida e que nenhum detalhe foi revelado. A nota privada do mestre não apareceu. | Bom isolamento de detalhes. Palpite do jogador causa crash descrito acima. |
| Criação de ficha | Percurso de nove etapas chegou à revisão e criou Nara QA Jogadora; atributos, antecedente, itens e arma apareceram na ficha. Humano recebeu +1 nos seis atributos exibidos. | Funciona com fricções e strings internas não traduzidas. |
| Identidade no criador | Ao preencher Nome do personagem, o formulário avançou imediatamente para a etapa Raça antes de preencher o campo adjacente Nome do jogador. | Comportamento inesperado que impede concluir esse campo naquela passagem; nome do jogador era opcional. |
| Seleções múltiplas | Bard.Skills e Entertainer.Tools pedem 3 e 2 opções. Um clique normal substituiu seleção anterior; Continuar permitiu sair com uma só opção, mas a Revisão bloqueou com “exige entre 3 e 3 opções; recebeu 1”. Selecionando a quantidade correta, revisão passou. | Validação final protege a criação, mas o fluxo móvel é pouco claro. A interação automatizada usou o seletor múltiplo do navegador; não é prova de falha física em tela touch. |
| Localização do criador | Aparecem chaves como Human.Language, Bard.Skills, Bard.Equipment, Entertainer.Tools, Appearance, PersonalityTraits, Ideals, Bonds, Flaws e History; opções como Athletics e Proficiency.Disguise Kit estão em inglês. Há o texto “Escolha 3 opçãoões.” | Revisar tradução e gramática. |
| Equipamento | A etapa Bard.Equipment oferece um seletor enorme com armas, armaduras e muitos itens avulsos. Selecionei Rapieira; ela foi criada e equipou com um toque no botão Equipar. O inventário mostra itens, quantidade, peso e carga; itens sem peso têm indicação explicativa. | Equipar funcionou; a lista inicial é longa para celular. Não testei remover itens ou editar quantidade. |
| Criação final | Revisão permitiu confirmar. O botão virou “Personagem criado” e desabilitou, mas a rota continuou no wizard; precisei tocar Ficha para abrir a ficha. | Resultado criado; finalização não navega diretamente para a ficha. |
| PV e PV temporários | 10/10 → dano4 → 6/10; temp3 → base6/temp3; dano4 consumiu temp3 e levou base a5; cura2 → 7; dano7 → 0; cura1 → 1 e estado consciente. | Bom comportamento geral de dano, absorção e cura; exceção da falha automática em 0 PV. |
| Rolagem de ataque | Com Rapieira equipada, ação rápida mostrava Ataque +2 e dano 1d8+2. Uma rolagem foi registrada como d20+2, resultado 22, “Sucesso Crítico!”. | Rolagem e histórico funcionam. Bônus +2 merece conferência: a ficha mostra Destreza +2 e proficiência global +2, mas não validei a proficiência específica da arma, então não concluo erro mecânico. A rolagem não foi comparada com CA de alvo. |
| Revisão de ataque | Em ficha QA local isolada, o painel “Atacar com Rapieira” solicitou CA e exibiu aviso de prévia de regra ausente, com execução desabilitada. O texto visível incluía “Usa kind ‘damage’ porque ActionCapabilityKind não tem uma variante de cura.” | Execução automática não concluída; mensagem parece interna de implementação. |
| Dados e histórico | Rolagem da ação foi para Atividade recente e permaneceu após navegar/recarregar. Rolagem manual de cura também ficou registrada. | Bom retorno do dado; histórico local visível. |
| Descanso | Descanso curto sem dados concluiu. Descanso longo recuperou 9 PV após recarga e segunda tentativa. | Regressões de preview, revisão e tela desatualizada descritas acima. |
| Turno e ações rápidas | A página mostra Ação, Ação bônus e Reação disponíveis; rodada 1. Mostra “Deslocamento indisponível” mesmo com 9 m na ficha. | Visualizado, mas não testei gastar ação, avançar turno ou encontro compartilhado. |
| Persistência local | Nome, equipamento, magias e PV da ficha QA sobreviveram a reload. Depois do descanso longo, a recarga foi necessária para refletir 10/10. | Persistência local confirmada; sincronização de campanha não. |
| Responsividade e alvos | Em 390×844 e 360×844 CSS, a raiz teve largura de rolagem 17 px menor que innerWidth (largura da barra vertical), sem overflow horizontal. Em amostra de 45 controles em 360px, 25 tinham altura abaixo de 40px; “Gerenciar”, “Ver todos” e “Ver todas” mediam 29px, editar personagem 30px, caixas de salvamento 32px e alguns campos 34–36px. | Conteúdo cabe; vários alvos parecem pequenos para toque e poderiam ganhar área clicável. Testado em viewport Chrome, sem dispositivo físico/teclado móvel. |

## Evidências

- [Jornada em 390 CSS px](evidencias/jogador-jornada-390.jpg) — visão geral da campanha QA.
- [Ficha em 360 CSS px](evidencias/jogador-ficha-360.jpg) — ficha e inventário; limitação de captura descrita abaixo.
- [Erro de descanso](evidencias/jogador-descanso-erro-360.jpg) — mensagem de falha CAS no primeiro descanso longo.
- [Magia bloqueada](evidencias/jogador-magia-bloqueada-360.jpg) — revisão sem prévia e confirmação desabilitada.
- [Palpite antes da falha](evidencias/jogador-palpite-antes-360.jpg) — diálogo antes de preencher.
- [Console do palpite](evidencias/jogador-palpite-console.txt) — mensagem TypeError sanitizada após a tela branca.

A captura jogador-ficha-360.jpg contém trechos repetidos à direita e abaixo. Isso não foi observado como repetição no DOM nem na navegação interativa; considero artefato do mecanismo de captura, não defeito visual confirmado. A captura da tela branca do pós-crash também expirou, por isso o console textual documenta essa falha. As evidências não contêm dados de conta reais.

## Limites e não exercitado

- Não foi possível ligar a ficha ao membro da campanha pela UI do jogador, então combate, ações, presença ou atualização de ficha entre dois clientes não foram validados.
- Diário remoto e mapa ficaram bloqueados por falha de sincronização/permissão; registro local não foi confirmado no lado mestre.
- Não foi possível salvar palpite de criatura; confirmação automática de magia e ataque não foi permitida pela ausência de prévia de regra.
- Não testei chamada de voz, chat em tempo real, dados em dispositivo físico, leitor de tela real, conexão móvel, modos de economia de energia nem navegador mobile.
- A ficha Nara QA Jogadora permanece na conta sintética de teste. Na sessão original, apenas um novo personagem sintético de QA foi criado na avaliação inicial; registros reais preexistentes e campanhas reais foram preservados.
