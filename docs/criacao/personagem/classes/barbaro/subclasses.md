# Bárbaro — 2 caminhos primitivos

Fonte: Livro do Jogador fornecido, cap.3, pp.49–50/PDF48–49. Escolha no nível3; ganhos adicionais nos níveis6,10 e14. IDs e opções são imutáveis; escolhas internas guardam origem/nível.

## `path-of-the-berserker` — Caminho do Furioso

- Nível3, Frenesi: ao entrar em Fúria, optar por frenesi. Durante ela, ataque corpo a corpo com arma como ação bônus em cada turno após o primeiro; ao terminar, ganha1 nível de exaustão. Estado distingue `rageId`, frenesi escolhido e exaustão resultante.
- Nível6, Fúria Inconsciente: durante Fúria não pode ficar enfeitiçado/amedrontado; efeito prévio fica suspenso, não removido, e retorna se ainda válido.
- Nível10, Presença Intimidante: ação, criatura visível a9m que vê/ouve; resistência SAB contra `8+PB+CAR`. Falha amedronta até fim do próximo turno; ação em turnos seguintes estende. Termina por distância>18m/linha de visão; sucesso bloqueia novo uso no alvo por24h.
- Nível14, Retaliação: reação ao sofrer dano de criatura a1,5m para ataque corpo a corpo com arma contra ela.

UI: Frenesi aparece na prévia da Fúria com consequência explícita; encerrar voluntariamente também gera exaustão. Presença mantém duração e cooldown por alvo em tempo de jogo. Testes: Fúria comum não exaure; frenesi sim; medo prévio suspende/retorna; sucesso no teste cria bloqueio24h.

## `path-of-the-totem-warrior` — Caminho do Guerreiro Totêmico

- Nível3, Conselheiro Espiritual: `sentido bestial` e `falar com animais` somente como rituais. Totem Espiritual escolhe águia/lobo/urso ou reskin aprovado: águia dificulta oportunidades e permite Disparada bônus em Fúria sem pesada; lobo dá vantagem a aliados corpo a corpo contra hostis a1,5m; urso resiste todo dano exceto psíquico.
- Nível6, Aspecto da Besta: escolha independente. Águia vê detalhes a30m/longa distância e ignora desvantagem de penumbra em Percepção. Lobo rastreia em passo rápido e anda furtivo em passo normal. Urso dobra capacidade de carga/erguer e dá vantagem nos testes físicos indicados.
- Nível10, Andarilho Espiritual: `comunhão com a natureza` somente ritual; aparição é narrativa.
- Nível14, Sintonia Totêmica: escolha independente. Águia ganha voo igual caminhada durante Fúria, mas cai ao terminar turno sem apoio; lobo usa bônus para derrubar Grande ou menor após acerto corpo a corpo; urso impõe desvantagem a hostis a1,5m que atacam outros, salvo imunidade a medo ou falta de visão/audição.

Cada marco aceita mesmo/diferente animal. Não salvar um único `totem` global. UI mostra três escolhas e requisitos; reskin muda label, não regra. Testes: urso3 não resiste psíquico; águia14 cai; lobo14 exige acerto e bônus; escolha nível6 não sobrescreve nível3.

## Contrato comum

`SubclassDefinition.classId=barbarian`, `selectionLevel=3`, grants por nível e ChoiceSelection por marco. Efeitos ativos pertencem ao Character; capacidade/recuperação à definição. Opção antes do nível rejeita sem mutação.
