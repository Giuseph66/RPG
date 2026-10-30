# Reteste de backup no IAB — 05/10/2026

Origem isolada `http://127.0.0.1:4173`, sem conta conectada. Somente o fixture sintético `backup-campanha-qa.json` e sua cópia foram usados.

1. Importação inicial em modo substituir materializou a campanha original `60c0ca01-f6ed-4c60-9ced-b62662ddab2b`.
2. Importar o mesmo arquivo mostrou um conflito e permitiu confirmar em modo cópia. A Jornada mostrou original e cópia (`63590c7f-7425-4b43-b0c0-826c4eadc3b6`) com nomes iguais e IDs diferentes; ambas persistiram após reload.
3. Foi adicionado o objetivo sintético “QA marcador antes de substituir” na original. Reimportar o fixture com um conflito e modo substituir restaurou o banco sem remover a cópia. Após reload, o objetivo havia desaparecido e o resumo mantinha duas campanhas. O valor anterior ficou disponível em recovery.
4. `backup-invalido.json` foi recusado com “Envelope de backup desconhecido ou incompatível”. O painel não permitiu confirmar esse envelope e preservou o registro de recuperação. A verificação da Jornada manteve as duas campanhas.

## Defeito adicional e correção

Após substituir, a Jornada ainda exibiu o objetivo anterior antes do reload: banco atualizado, snapshot de campanha stale. A composição de `commitImport` em `src/app/bootstrap.tsx` agora conclui edições locais pendentes antes de gravar e reidrata as fichas/campanhas selecionadas que aparecem no envelope. A regressão DATA-007 cobre valor pendente preservado em recovery e snapshot limpo/restaurado após import; os 14 testes de bootstrap passaram. Build/typecheck passaram em `correcao-raiz-build.log`. Reteste no build `index-DgTQsvIQ.js`: objetivo sintético adicionado → substituir com colisão → aguardar prévia sumir → navegar por SPA à Jornada, sem reload. O objetivo voltou a zero e as duas campanhas permaneceram; captura `correcao-raiz-backup-snapshot-restaurado.jpg`. O fechamento do preview/recovery pelo owner de interface segue pendente.

## Capturas

- `correcao-raiz-backup-copia-habilitada.jpg`: conflito com cópia confirmável.
- `correcao-raiz-backup-substituir-habilitada.jpg`: conflito com substituir confirmável.
- `correcao-raiz-backup-invalido.jpg`: envelope inválido recusado e recovery preservado.

## Reteste final de prévia e recuperação

Na sessão IAB sintética `127.0.0.1:4174`, com o preview desligado, Ajustes → Abrir backup abriu o painel. Uma prévia válida foi substituída por JSON inválido; a mensagem de incompatibilidade apareceu, a prévia sumiu e a contagem DOM de botões Confirmar importação ficou zero. Captura: `correcao-backup-invalido-limpa-previa.jpg`.

Após importar a fixture em Substituir, uma segunda fixture de conteúdo idêntico e nome diferente mostrou uma colisão. Confirmar Substituir atualizou imediatamente a lista de recuperação com o ID anterior e botões Restaurar/Descartar, sem reload ou saída da rota. Captura: `correcao-backup-recovery-imediato.jpg`. Selecionar duas vezes o mesmo arquivo não disparou nova prévia, mas a cópia de outro nome disparou; falha encaminhada ao owner para limpar o input após leitura.

Reteste posterior em 4175, build index-OSjofsgb, com preview desligado: importar a fixture em Substituir e selecionar o mesmo arquivo novamente sem navegar voltou a mostrar prévia com 1 conflito e Confirmar habilitado. Correção do reset do input aprovada visualmente.
