# Reteste offline — IAB, 05/10/2026

Build congelado: `index-OSjofsgb.js`, origem limpa `http://127.0.0.1:4175`. A sessão abriu somente a raiz e Personagem durante a instalação. Regras, Ajustes, Backup e mesa de dados não foram visitados antes da parada do preview PID 3232797. O preview 4173 usado pelo jogador permaneceu ligado.

Após a parada do servidor local:

- Regras abriu pela primeira vez com 1.451 regras. A busca Ábaco retornou duas correspondências; o detalhe abriu texto e fonte/página. Captura `correcao-offline-catalogo-completo.jpg`.
- Reload completo de /compendium carregou novamente a interface e o catálogo.
- Ajustes abriu pela primeira vez e exibiu Mesa de dados 3D, sem o erro anterior de fetch. Captura `correcao-offline-dados3d.jpg`.
- Ajustes → Abrir backup abriu /data pela primeira vez. Importação da fixture sintética em Substituir funcionou; selecionar exatamente o mesmo arquivo novamente, sem sair da rota, mostrou uma colisão e Confirmar importação habilitado. Isso prova o reset do campo de arquivo.

A prova isola indisponibilidade do servidor local que fornece HTML, chunks e assets. Não foi usado modo avião do sistema; endpoints externos do Firebase permaneciam alcançáveis. Não equivale a um telefone físico. A observação prova cache instalado para telas nunca visitadas, não primeira instalação sem rede.

O primeiro ensaio em 4174 falhou no chunk relativo static-DgzRoamS.js; o owner corrigiu a resolução de referências relativas/backticks no worker e acrescentou os assets públicos de dados. A rodada acima usou uma versão congelada para impedir mistura de builds durante o ensaio.
