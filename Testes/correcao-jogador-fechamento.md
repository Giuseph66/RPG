# Fechamento QA do jogador — 2026-10-05

Sessão executada pela UI no Chrome já autenticado, campanha `QA Remoto 2026-10-05` (`f77afb9b-4fe1-43c4-9406-f791c9706b73`), ficha sintética `Íria QA Pareamento final`. Nenhum arquivo do produto foi alterado; este relatório é a única escrita de texto desta rodada.

## PV compartilhado e origem do estado `10310/10`

- Após reload, a ficha própria exibiu `10310/10`.
- O controle de PV foi aberto pela UI, o valor `3` foi digitado no campo `Valor` e `Dano` foi aplicado. O resultado foi `10307/10`, portanto o dano estava sendo aplicado corretamente sobre um valor atual já corrompido/concatenado, e não sobre `10/10`.
- O histórico da mesa expôs a origem do estado: `PV 10 → 103 93 de cura`, `PV 103 → 10310 10207 de cura` e depois `PV 10310 → 10307 3 de dano`. Isso indica que interações manuais anteriores concatenaram `10`/`3`/`10` ou trataram a edição absoluta como delta de cura/dano.
- Pela UI, `Ajuste manual` restaurou o atual para `10`; em seguida `Dano 3` produziu `7/10`. Após reload, a ficha persistiu `PV 7/10`.
- Depois dos testes de cura/descanso abaixo, um último `Dano 3` deixou a ficha novamente em `7/10`; reload persistiu `7/10`. O cabeçalho do jogador voltou a `Jogador · erro de sincronização` após o período `sincronizando`, então a confirmação remota no mestre precisa ser lida neste ponto.

## C08 — queda a zero

Com `7/10`, abri o controle de PV, digitei `7` e usei `Dano`. A ficha exibiu `0/10`, `PV zerados: resolva o estado de morte antes da próxima ação.` e `Morrendo — role um salvamento a cada turno.`. Os contadores permaneceram `Sucessos 0/3` e `Falhas 0/3`: a queda de PV positivos a zero não gerou falha automática.

No estado `0 PV`, a revisão de `Curar Ferimentos (nível 1)` foi bloqueada pela UI com `A criatura com 0 PV está inconsciente/morrendo e não pode conjurar; nenhum espaço foi consumido.`.

## Cura e C09 — descanso, recursos e revisão

- Pela UI, o ajuste sintético levou `0→1` para permitir testar a ação de cura; a ficha voltou a `Consciente.`.
- `Ações → Magias → Curar Ferimentos` abriu a revisão para ficha própria. A revisão mostrou a fonte e o custo pendente; na primeira passagem exibiu também `Sem efeito automático na ficha` e exigiu seleção explícita de espaço/nível. A rolagem UI retornou `7` em `1d8−1` e o histórico confirmou `PV 1 → 7`, `6 de cura`. Nenhum dado pessoal foi usado.
- `Ações → Descanso longo` mostrou a prévia `Pontos de vida 7 → 10`, `Nenhum Dado de Vida gasto` e `Todos os espaços de magia gastos (1)`. A confirmação exibiu `Descanso longo concluído: +3 PV.`.
- Ao navegar para a ficha e recarregar, o estado persistiu em `10/10`, `Consciente.`, `Falhas 0/3` e `Sucessos 0/3`. O recurso `Inspiração de Bardo` permaneceu `1/1`. Depois, o dano final de 3 foi reaplicado para deixar a prova remota em `7/10`.

## Inventário em mobile

Usei overrides temporários calibrados para obter `window.innerWidth` CSS de `360` e `390`, sempre restaurando o viewport ao final. O backend aplica `devicePixelRatio ≈ 0,9`, então o override solicitado e a largura visual/client diferem.

- Em `window.innerWidth = 360` (override `324×720`), `visualViewport.width = 343,33`, `clientWidth = scrollWidth = 343`, `devicePixelRatio = 0,9`, `overflow: false`; os 17 controles de inventário medidos ficaram todos com `44 px` de altura.
- Em `window.innerWidth = 390` (override `351×760`), `visualViewport.width = 373,33`, `clientWidth = scrollWidth = 373`, `devicePixelRatio = 0,9`, `overflow: false`; os mesmos controles ficaram todos com `44 px` de altura. A renderização móvel reorganizou as linhas em cartões com `Qtd.`, `Peso`, `Valor` e `Remover` sem corte horizontal.
- A tela móvel foi restaurada para a rota original `/character/e1aeacb0-61aa-44a3-a4b1-e0a8ed3ee4de` e o viewport padrão foi resetado.

## C14 — rascunho usado e cópia

Após reload de Configurações, o seletor mostrou:

- personagem ativo `Íria QA Pareamento final`;
- personagem `Íria QA Mobile Bardo 1` na lista de personagens, correspondente à cópia já criada pela UI (`c9cb344b-fd3d-4a01-8c27-572fe4f000fa`, conforme o relatório anterior);
- somente um item em `Em criação`: `Íria QA Mobile — Parou em: Detalhes — Continuar`.

O reload não criou um segundo rascunho órfão: a cópia permanece como personagem e o rascunho antigo permanece preservado e retomável.

## Revisão de cura após o pareamento

Em uma retentativa somente de revisão, `Curar Ferimentos (nível 1)` mostrou inicialmente `Custo: Tempo Ação; Espaço 1º nível`, `Efeito previsto` e o texto `Sem efeito automático na ficha.`, com `Confirmar execução` habilitado. Não havia seletor de nível ou espaço no DOM/UI.

Ao avançar por `Confirmar execução`, a revisão pronta passou a mostrar `Custo: Sem custo.`, repetiu `Sem efeito automático na ficha.` e exibiu duas vezes o alerta `Selecione explicitamente o espaço e o nível usados para a conjuração.`; o botão ficou desabilitado. Nenhum controle de seleção apareceu, portanto não foi possível selecionar nível/espaço. O texto falso de ausência de efeito permaneceu na revisão pronta.

Mesmo com a revisão pronta sem seleção, o histórico recebeu `PV 7 → 9 · 2 de cura`. Essa mutação foi observada depois de avançar por `Confirmar execução` no fluxo legado, e não após uma rolagem isolada do chip `Rolar Cura`; o complemento abaixo confirmou que a rolagem isolada só registra o dado. `Cancelar` fechou a revisão e restaurou o estado visual pendente, mas não desfez essa mutação de PV; não houve indicador de consumo de espaço disponível na UI. Pela UI, apliquei dano explícito de 2 e recarreguei para restaurar a ficha a `7/10`. Este é um bloqueio concreto: a revisão declara ausência de efeito, exige uma seleção que não existe e ainda permite uma cura efetiva antes do cancelamento.

## C10 — revisão, cancelamento, confirmação e ataque rápido

- Usei `Descanso longo` pela UI para repor o espaço de 1º nível antes da rodada C10; a prévia mostrou `Pontos de vida já estão cheios`, `Nenhum Dado de Vida gasto` e `Todos os espaços de magia gastos (1)`, e a conclusão exibiu `Descanso longo concluído.`. Em seguida apliquei dano sintético explícito de 3 para iniciar a confirmação em `PV 7/10`.
- Com o espaço disponível, `Curar Ferimentos (nível 1)` exibiu `Disponível · 2 custos` e selecionou automaticamente `Espaço de 1º nível`. A revisão mostrou `Custo: Tempo Ação; Espaço 1º nível`, efeito `Cura 1d8 + modificador de CAR ... limitada ao máximo de PV` e duas fontes `Capítulo 11 — Magias, p. 236 · Curar Ferimentos`.
- A confirmação única produziu `PV 7 → 10 · 3 de cura`; a rolagem visível foi `5` em `1d8−1`. O slot deixou de estar disponível. Após reload da ficha, o PV permaneceu `10/10`; em `Ações → Magias`, `Curar Ferimentos` ficou `Bloqueada` com `Nenhum espaço compatível está disponível`. Não houve segundo evento de cura.
- Para cobrir o cancelamento sem mascarar o resultado no máximo, usei outro `Descanso longo` legítimo para repor o slot, apliquei dano sintético de 3 (`PV 10→7`), abri a mesma revisão em `PV 7/10` e cliquei `Cancelar`. Depois do cancelamento, `Curar Ferimentos` continuou `Disponível · 2 custos`, sem evento de cura novo ou consumo de slot; a ficha terminou `PV 7/10` e `Jogador · ao vivo`.
- O ataque rápido mostrou `Nenhuma arma equipada` / `Ataque desarmado` e o resultado `Ataque desarmado: 7 (1d20+5 [2])`. Rolar o ataque não alterou o PV e não gerou evento de dano. O chip específico de dano de uma arma equipada não pôde ser exercitado nesta ficha sintética, pois não há arma equipada; os cartões exibidos eram os controles manuais `Aplicar 5 de dano (contundente)` e `Aplicar 5 de cura`.

### Complemento — rolagem antes de cancelar

Com a ficha em `PV 7/10` e `Curar Ferimentos` em `Disponível · 2 custos`, usei o chip visível `Rolar Cura 1d8−1` antes de abrir a revisão. A atividade mostrou `d8−1 · Cura (Curar Ferimentos): 5` e o histórico registrou `Rolagem · Cura (Curar Ferimentos): 5 1d8-1 [6]`; o PV continuou `7/10` e o espaço continuou disponível. Em seguida abri a revisão, que manteve custo `Tempo Ação` + `Espaço 1º nível` e o efeito de cura, e cliquei `Cancelar`. A UI retornou a `Disponível · 2 custos`, sem evento de PV ou consumo de slot. Após reload, a ficha permaneceu `7/10` e o slot continuou disponível.

Para o caminho de arma, a ficha QA não oferece arma pertencente nem controle de equipar: os itens visíveis são `Instrumento musical (à escolha)`/`Alaúde` como `Ferramenta`, `Favor de um admirador` como equipamento, e itens de vestuário. Portanto não criei item nem alterei inventário; o chip específico de dano de arma permanece um limite não exercitável nesta ficha. O ataque desarmado já rolado permaneceu sem mutação própria, conforme acima.

## Sessão após avanço do mestre

Sem acionar controles de mestre, recarreguei `/session/f77afb9b-4fe1-43c4-9406-f791c9706b73`. O jogador recebeu `Rodada 2`, `Presença: Íria QA Pareamento final · presente` e `01 Íria QA Pareamento final Personagem · PV 7/10 15 Em turno`; nenhum comando de mestre apareceu. Após a espera de sincronização, a tela mostrou `Erro de sincronização`, `Missing or insufficient permissions.` e `Tentar sincronizar`.

## C05 — reteste após publicação das rules

Após a publicação das rules Firestore, recarreguei a sessão preservada e acionei somente `Tentar sincronizar`. O estado transitório foi `Jogador · sincronizando` / `Sincronização pendente`; após a conclusão, a UI mostrou literalmente `Jogador · ao vivo` e `Sincronizado`. A sessão permaneceu em `Rodada 2`, com `Presença: Íria QA Pareamento final · presente` e `01 Íria QA Pareamento final Personagem · PV 7/10 15 Em turno`. Não reapareceu `Missing or insufficient permissions.` nem falha global.

## Evidências

As telas de dano `7/10`, queda `0/10` com `Falhas 0/3`, cura/descanso, revisão C10 e inventário 360/390 foram capturadas durante a sessão CUA. O conector entregou essas capturas inline, incluindo a ficha final `PV 7/10`; não expôs um caminho local para persistir os bytes, por isso nenhum JPG adicional foi inventado ou escrito fora do relatório.

## Limites observados

O mestre confirmou por reload pareado `PV 7/10`, presença, iniciativa `15`, `Em turno` e depois avançou a mesa para a Rodada 2. Durante C10 o mestre refletiu temporariamente `PV 10/10` após a confirmação única de cura; o dano sintético posterior usado no cancelamento deixou a ficha novamente em `PV 7/10`, com o jogador `Jogador · ao vivo`. O bloqueio C05 foi revalidado após a publicação: o jogador terminou `Sincronizado` / `Jogador · ao vivo`, sem a mensagem de permissões. O histórico local continua contendo os eventos legados de concatenação (`10→103→10310`), que devem ser preservados como diagnóstico.
