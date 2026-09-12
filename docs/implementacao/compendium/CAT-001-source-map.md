# CAT-001B — mapa de fontes do catálogo

Estado: levantamento de fontes, sem publicação de dados de produto.

## Escopo e convenções

Este mapa foi conferido contra `docs/Livro do Jogador.pdf` (315 páginas) e contra a documentação de fontes existente. A fonte é o pack local `phb-ptbr-local-2017@1.0.0`; o hash registrado para o PDF é `ed6028a48dc566e91720b68a24d38eb4f8c927b071cab151739a7f15f08a4a91`. As referências abaixo usam `página impressa/PDF`; a cópia conferida usa `impressa = PDF + 1`.

Cada entrada estruturável deve conservar, no mínimo:

- identidade técnica estável, nome exibido, aliases e tags;
- resumo mecânico próprio, sem transcrição extensa;
- `sourceRefs[]` com `sourceId`, capítulo, seção, página impressa e página PDF;
- parâmetros, pré-condições, custo, duração, gatilho, exceções e decisões externas que afetem o efeito;
- `pendingDecisionIds[]`/estado de automação quando a fonte não fornece valor suficiente.

O contrato atual já define `SourceRef` e `DefinitionBase`, mas `RulePack` só possui catálogos para `race`, `class`, `spell`, `equipment`, `condition` e demais entidades de personagem. `EntityType` não inclui uma entidade de regra estática, e o indexador do Compêndio só percorre os mapas desses tipos. Embora `CompendiumCategoryId` já contenha `rules`, `combat`, `rest`, `movement` e `adventure`, essas categorias permanecem pendentes e não têm uma fonte de definições no pack. Portanto, o conteúdo abaixo é um inventário de entradas candidatas; a publicação exige extensão/revisão do contrato DATA-001 e do carregamento do Compêndio. Não adicionar categorias silenciosamente ao contrato atual.

## Regras

### Cobertura verificada

| Referência | Seções conferidas | Conteúdo aproveitável |
| --- | --- | --- |
| 7/PDF 6 | Introdução, “O d20” | Resolução de incerteza por jogada de d20; contexto geral para testes e ataques |
| 13/PDF 12 | Capítulo 1, valores de habilidade | Geração/atribuição de valores e modificadores de habilidade |
| 175–181/PDF 174–180 | Capítulo 7, “Utilizando Habilidades”; “Valores e Modificadores de Habilidade”, “Vantagem e Desvantagem”, “Bônus de Proficiência”, “Testes de Habilidade”, “Classes de Dificuldade Típicas”, “Testes Resistidos”, “Perícias”, “Testes Passivos”, “Trabalho em Equipe”, “Testes em Grupo”, habilidades individuais e “Testes de Resistência” | Núcleo estruturado de testes, perícias, resistências, CDs e proficiência |
| 127/PDF 126 | Capítulo 4, “Inspiração” | Recurso booleano concedido e consumido conforme decisão do Mestre |

### Verbetes estruturáveis

IDs abaixo são propostas de catálogo, não IDs já aceitos pelo contrato:

| Verbetes | Conteúdo a modelar |
| --- | --- |
| `ability-score`, `ability-modifier` | As seis habilidades e a derivação do modificador; preservar valor de entrada e resultado derivado |
| `proficiency-bonus` | Faixa por nível total, aplicação única e multiplicação/divisão apenas quando autorizada |
| `ability-check` | Habilidade, perícia opcional, CD ou oposição, contexto e resultado |
| `saving-throw` | Habilidade indicada pelo efeito, proficiência concedida e CD; não confundir com perícia |
| `advantage-disadvantage` | Origens, cancelamento e seleção do maior/menor d20; preservar causas mesmo quando canceladas |
| `passive-check` | Base 10, modificadores normais e ajuste de vantagem/desvantagem |
| `contested-check`, `group-check`, `teamwork` | Participantes, testes opostos, empate, cooperação e limiar do teste de grupo |
| `skill` (18 entradas) | Acrobacia, Adestrar Animais, Arcanismo, Atletismo, Atuação, Enganação, Furtividade, História, Intimidação, Intuição, Investigação, Medicina, Natureza, Percepção, Persuasão, Prestidigitação, Religião e Sobrevivência; conservar habilidade associada e usos resumidos |
| `inspiration` | Concessão pelo Mestre, consumo e transferência conforme a regra; não transformar em pilha |

### Campos e proveniência específicos

Além dos campos comuns, testes devem preservar `checkKind`, `ability`, `skill?`, `tool?`, `dc?`, `opposedBy?`, `proficiencyPolicy`, `advantageSources[]`, `disadvantageSources[]`, `contextRequirements[]` e resultado de dados separado do resultado mecânico. Uma entrada de perícia deve registrar sua habilidade padrão e marcar qualquer uso com outra habilidade como decisão de contexto. Cada fórmula derivada deve apontar para a seção própria, sem usar apenas a referência do capítulo.

### Bloqueios e ambiguidades

- A variação de perícia com outra habilidade depende do Mestre; pode ser documentada, mas não automatizada como atributo permanente.
- Inspiração depende da concessão do Mestre e de uma escolha do jogador; o catálogo pode explicar o recurso, mas a resolução precisa de entrada explícita.
- Um natural 1 ou 20 em teste comum não cria falha ou sucesso automático; os efeitos especiais de ataque e teste contra morte pertencem às fontes de Combate/Morte.
- O exemplo de cota de malha + escudo que chega a CA 17 em 15/PDF 14 conflita com parcelas da tabela de equipamento em 145–148/PDF 144–147 (`PEND-002`). Qualquer verbete que derive CA deve preservar a pendência e não usar o exemplo como fixture normativa.
- Habilidades e perícias são uniões fechadas no contrato atual, não definições indexáveis de `RulePack`. Uma categoria Regras publicável requer um tipo de definição estática ou um catálogo paralelo aprovado por DATA-001.

## Combate

### Cobertura verificada

| Referência | Seções conferidas | Conteúdo aproveitável |
| --- | --- | --- |
| 191/PDF 190 | Capítulo 9, “A Ordem de Combate”, “Surpresa”, “Passo-a-Passo do Combate”, “Iniciativa”, “Seu Turno” e “Ação Bônus” | Fluxo de encontro, rodada, turno, surpresa e iniciativa |
| 192–194/PDF 191–193 | “Outras Atividades no Seu Turno”, “Reações”, “Movimento e Posição”, movimento próximo de criaturas, voo, tamanho/espaço, matriz opcional e “Ações em Combate” | Economia do turno, posição e ações |
| 194–195/PDF 193–194 | “Ações em Combate”, “Improvisando uma Ação”, “Preparar”, “Procurar”, “Usar um Objeto” e “Realizando um Ataque” | Catálogo de ações e resolução inicial de ataque |
| 196–198/PDF 195–197 | Jogada/modificadores de ataque, 1/20, alvos ocultos, ataques à distância/corpo a corpo, oportunidade, duas armas, agarrão, encontrão e cobertura | Ataques, disputas, alcance e cobertura |
| 198–200/PDF 197–199 | “Dano e Cura”, PV, dano, crítico, tipos de dano, resistência/vulnerabilidade, cura, 0 PV, morte, inconsciência, testes contra morte, estabilização, PV temporários, montado e submerso | Transições de dano/PV e exceções de combate |

### Verbetes estruturáveis

| Verbetes | Conteúdo a modelar |
| --- | --- |
| `combat-order`, `surprise`, `initiative`, `round`, `turn` | Participantes, ordem, duração lógica, estado de surpresa e desempate contextual |
| `action-economy`, `bonus-action`, `reaction`, `object-interaction` | Um custo por operação, disponibilidade, gatilho e janela de recuperação |
| `attack`, `cast-spell-action`, `dash`, `disengage`, `dodge`, `help`, `hide`, `ready`, `search`, `use-object` | Dez ações com custo, pré-condições, alvo, efeito e exceções; ação bônus só existe quando uma fonte a concede |
| `attack-roll`, `attack-modifiers`, `critical-hit`, `range`, `cover`, `hidden-target` | Fórmula, alcance normal/máximo, cobertura, visibilidade, natural 1/20 e parcelas do ataque |
| `opportunity-attack`, `two-weapon-fighting` | Gatilho, reação consumida, armas elegíveis e modificador de dano |
| `grapple`, `shove` | Substituição de ataque, tamanho/alcance, disputa, mão livre quando aplicável e resultado escolhido |
| `damage`, `damage-type`, `resistance`, `vulnerability`, `immunity`, `healing`, `temporary-hit-points` | Componentes por tipo/origem, ordem de aplicação, absorção por PV temporários e duração |
| `zero-hit-points`, `instant-death`, `unconscious`, `death-save`, `stabilize`, `knockout` | Estados, contadores, transições, dano em 0 PV, cura e nocaute corpo a corpo |
| `mounted-combat`, `underwater-combat` | Montar/desmontar, montaria controlada/independente, queda e exceções de ataques submersos |

### Campos e proveniência específicos

Ataques e ações devem conservar `activation`, `actionCost`, `reactionTrigger?`, `targetRequirements`, `range/reach?`, `attackAbility?`, `damageParts[]`, `damageTypes[]`, `criticalPolicy`, `coverPolicy`, `visibilityContext`, `savingThrow?`, `stateTransitions[]`, `resourceCosts[]` e `sourceRefs[]` por regra. O estado de dano precisa separar PV atuais, PV temporários, excedente, contadores de morte e origem do evento. Relações com uma magia, talento, condição ou recurso devem usar `TypedDefinitionRef`/`DefinitionRef`, nunca nome traduzido.

### Bloqueios e ambiguidades

- Preparar diz “uma reação por turno” em 195/PDF 194, enquanto a seção de Reações em 192/PDF 191 repõe a reação no início do próximo turno próprio (`PEND-015`). Registrar a preferência pela seção específica como proposta, mas não automatizar o caso antes da decisão.
- Combate montado pede resistência de Destreza para evitar queda em 200/PDF 199 sem fornecer CD (`PEND-013`); a entrada deve retornar `needsInput` da mesa.
- Esquivar usa a redação “testes de Destreza”, cuja distinção entre teste de habilidade e resistência precisa ficar preservada até decisão editorial.
- Ação improvisada, alvo oculto, cobertura aplicável e várias situações de posição dependem de contexto do Mestre. Podem ser verbetes explicativos, mas não devem prometer resolução automática sem esses campos.
- Dano, morte e condições têm documentação própria; duplicar definições em Combate criaria divergência. O catálogo deve manter links/referências cruzadas e uma única origem por definição.
- A categoria exige uma entidade de regra estática ausente de `RulePack`; o status atual é pendente mesmo havendo cobertura suficiente no PDF para um catálogo mecânico resumido.

## Descanso

### Cobertura verificada

| Referência | Seções conferidas | Conteúdo aproveitável |
| --- | --- | --- |
| 188/PDF 187 | Capítulo 8, “Descanso”, “Descanso Curto” e “Descanso Longo” | Duração, atividade permitida, Dados de Vida, recuperação e interrupção |
| 187/PDF 186 | Capítulo 8, “Comida e Água” | Necessidades e relação com exaustão/recuperação |
| 189/PDF 188 | “Entre Aventuras”, estilo de vida e atividades em tempo livre | Recuperar-se, fabricar, profissão, pesquisa e treinamento |
| 23/PDF 22 | Capítulo 2, “Transe” | Meditação élfica e relação ainda não resolvida com descanso longo |
| 200/PDF 199 | Capítulo 9, “Pontos de Vida Temporários” | Expiração de PV temporários ao fim do descanso longo sem duração própria |
| 292/PDF 291 | Apêndice A, “Exaustão” | Níveis e efeitos cumulativos; remoção depende de comida/água e descanso |

### Verbetes estruturáveis

| Verbetes | Conteúdo a modelar |
| --- | --- |
| `short-rest` | Uma hora, atividade leve, escolha de Dados de Vida e recuperação permitida |
| `long-rest` | Oito horas, atividades leves/vigília permitida, PV, metade dos Dados de Vida e limite de uma vez em 24 h |
| `rest-interruption` | Atividades, intervalo e reinício quando a condição da fonte for atendida |
| `hit-die-recovery` | Total gasto, capacidade recuperável, escolha por tipo/classe e arredondamento |
| `resource-rest-recovery` | Recursos cuja definição declara recuperação em descanso curto/longo; não zerar todos os recursos |
| `rest-food-water`, `exhaustion-rest-removal` | Pré-condições de alimentação/hidratação e remoção de exaustão |
| `trance` | Duração da meditação e relação explicitamente pendente com o descanso longo |
| `downtime-recovery`, `downtime-crafting`, `downtime-profession`, `downtime-research`, `downtime-training` | Atividades em tempo livre com duração, custo, proficiência e resultado condicionado |

### Campos e proveniência específicos

Preservar `restType`, `minimumDuration`, `allowedActivities`, `interruptionRules`, `minimumStartingHp?`, `oncePer24Hours?`, `hitDicePolicy`, `resourceRecoveryRefs[]`, `foodWaterRequirements`, `temporaryHpExpiry`, `gameTimeStart/end`, `choices[]` e `sourceRefs[]`. `RestRequest`/estado de sessão deve registrar a prévia e o resultado atômico; não salvar recuperação parcial. Recuperações de classe precisam apontar para a própria característica, além do verbete geral.

### Bloqueios e ambiguidades

- Transe permite quatro horas de meditação, enquanto descanso longo exige pelo menos oito horas (`PEND-014`). Não publicar um atalho de quatro horas como conclusão automática de descanso longo.
- A fonte não explicita mínimo de um Dado de Vida recuperado pela metade do total; no nível 1 a literalidade pode resultar em zero. Não importar mínimo externo nem escolher arredondamento diferente sem decisão.
- A frase de interrupção por pelo menos uma hora de caminhada, combate ou conjuração tem escopo ambíguo; expor a escolha ao Mestre.
- Recuperações específicas de classes e recursos devem permanecer em suas definições. Um botão geral de descanso não pode concedê-las por nome ou por convenção.
- O tipo de entidade está ausente do `RulePack`; a cobertura da fonte é suficiente para entradas resumidas, mas a publicação exige contrato/catalog loader para regras estáticas.

## Movimentação

### Cobertura verificada

| Referência | Seções conferidas | Conteúdo aproveitável |
| --- | --- | --- |
| 183–185/PDF 182–184 | Capítulo 8, “Movimento”, “Deslocamento”, “Ritmo de Viagem”, “Terreno Difícil”, “Tipos Especiais de Movimento”, “Escalada, Natação e Rastejamento”, “Saltando”, “Atividades Durante Viagem”, “Ordem de Marcha” e “Percebendo Ameaças” | Movimento tático relacionado à viagem, custos, saltos, ritmos e tarefas |
| 192–194/PDF 191–193 | Capítulo 9, “Movimento e Posição”, “Quebrando seu Movimento”, “Movendo-se entre Ataques”, “Usando Deslocamentos Diferentes”, “Terreno Difícil”, “Estar Caído”, criaturas, voo, tamanho, espaço e “Espremendo-se em Espaços Menores” | Orçamento do turno, modos, espaço, voo e restrições de posição |

### Verbetes estruturáveis

| Verbetes | Conteúdo a modelar |
| --- | --- |
| `speed`, `movement-budget`, `movement-mode` | Deslocamento por modalidade, saldo, troca de modalidade e divisão antes/depois de ações/ataques |
| `difficult-terrain`, `crawl`, `climb`, `swim`, `stand-up` | Multiplicadores/custos, deslocamento restante e pré-condições |
| `fly`, `fall-from-flight` | Condições que fazem criatura voadora cair e exceções de sustentação/planar |
| `creature-size`, `space`, `squeeze` | Categorias de tamanho, espaço ocupado, passagem, custo e modificadores |
| `jump` | Corrida, distância/altura derivadas, gasto de deslocamento e testes de obstáculo/pouso |
| `travel-pace` | Ritmo rápido/normal/lento, colunas por minuto/hora/dia e efeitos de percepção/furtividade |
| `march-beyond-eight-hours` | Hora excedente, resistência de Constituição e exaustão por falha |
| `travel-activity`, `march-order`, `travel-visibility` | Tarefa em viagem, ordem de marcha e contribuição para perceber ameaças |

### Campos e proveniência específicos

Usar as unidades do contrato (distância interna em centímetros) somente como representação técnica; conservar também o valor da fonte e sua unidade exibida em metros. Preservar `speedByMode`, `availableMovement`, `movementSpent`, `terrainCost`, `size`, `space`, `jumpInputs`, `paceByMinute/hour/day`, `paceEffects`, `travelHours`, `savingThrow?`, `exhaustionEffect?`, `travelTask?`, `marchOrder?`, exceções e `sourceRefs[]`. A coluna diária do ritmo deve ser armazenada como dado da tabela, sem ser recalculada por multiplicação da coluna horária.

### Bloqueios e ambiguidades

- Navegação, rastreamento e forrageio remetem a regras detalhadas do Guia do Mestre, que não está entre as fontes locais. O Livro do Jogador cobre os nomes das tarefas e o uso contextual de Sobrevivência, mas não fornece uma definição completa de CD/resultado; publicar somente como operação assistida/pendente.
- Queda não deve inferir altura, escala ou custo a partir de posição narrativa/mapa sem contexto explícito.
- Montaria deslocada à força e cavaleiro derrubado exigem resistência de Destreza sem CD em 200/PDF 199 (`PEND-013`); o vínculo pode ser cruzado com Combate, mas a lacuna permanece.
- Voo, terreno, tamanho e espaço dependem da geometria/contexto da mesa. O catálogo pode expor predicados e pedir os dados ausentes.
- `movement` também está fora dos tipos de definição do `RulePack`; sua categoria só pode sair de pendente após a decisão de contrato e um carregador de regras estáticas.

## Aventura — decisão de cobertura/publicação

**Decisão do levantamento: o Livro do Jogador cobre a categoria Aventura apenas como referência mecânica parcial.** O capítulo 8, pp. 183–189/PDF 182–188, contém regras estruturáveis de tempo, viagem, ambiente, percepção, queda, asfixia, comida/água, objetos, interação social, descanso e tempo livre. Isso sustenta uma categoria `adventure` resumida, com verbetes próprios e links para Movimentação e Descanso.

O PDF não fornece um catálogo completo de aventuras, campanhas, encontros, mapas, NPCs ou adjudicações do Mestre. Em especial, navegação, rastreamento e forrageio apontam para o Guia do Mestre, ausente da fonte atual. Assim:

- publicável como categoria mecânica parcial, com fonte, resumo próprio e estados `pending`/`needsInput` onde faltarem CD, escala ou decisão do Mestre;
- não publicável como “aventuras” completas nem como conteúdo narrativo do livro;
- não importar texto, aventuras, tabelas ou regras do Guia do Mestre, suplementos ou outra edição para preencher lacunas;
- manter a categoria pendente no contrato atual até existir um tipo/catálogo de regra estática, apesar de já haver cobertura suficiente para planejar o conteúdo.

Verbetes candidatos: `game-time`, `travel`, `environment-light`, `darkvision`, `blindsight`, `truesight`, `fall`, `suffocation`, `food`, `water`, `object-interaction`, `social-interaction`, `downtime` e `lifestyle`. Cada um deve guardar seção/página própria, contexto exigido e a distinção entre regra fornecida e decisão da mesa.

## Limitações do levantamento

As referências foram verificadas por leitura do PDF local e comparação com `14-CONTEUDO-E-FONTES.md`, `ADR-0005`, `PENDENCIAS.md`, `pagina-compendio.md`, `dados/schemas.md`, `10-RULES-ENGINE.md` e os documentos normativos de Regras. Este arquivo não resolve pendências semânticas, não escolhe CDs ausentes, não licencia o conteúdo do PDF e não altera `RulePack`, `EntityType`, catálogos, testes ou UI. A autorização de distribuição continua sendo o gate `PEND-016`.
