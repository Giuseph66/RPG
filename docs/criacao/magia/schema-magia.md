# SpellDefinition e contratos de conjuração

DefinitionBase em [schemas](../dados/schemas.md). Campos abaixo são estruturais; não embutir código executável em efeitos.

| Campo | Tipo conceitual e uso |
| --- | --- |
| id/name/sourceRefs | Identidade estável, label e fonte precisa |
| level/school | Inteiro 0–9 e enum das oito escolas |
| castingTime | kind, amount?, unit?, reactionTrigger?; distinguir ação bônus de ação |
| range | kind:self/touch/distance/special, distanceCm?, origin? |
| components | verbal:boolean, somatic:boolean, material? |
| material | descriptionSummary, costCp?, consumed:boolean, requiredItemKind? |
| duration | kind, amount?, unit?, endTriggers[]; instantânea não é duração zero com concentração |
| concentration/ritual | Booleanos independentes |
| classes | IDs das listas base; concessões adicionais ficam na origem |
| targetType | creature/object/point/self/mixed; count, restrictions, visibilityRequired |
| area | shape:cone/cube/cylinder/sphere/line, dimensionsCm, originPolicy? |
| savingThrow | ability, successOutcome, repeatTiming?, conditionToRepeat? |
| attackType | meleeSpell/rangedSpell/none; algumas magias têm efeitos mistos |
| damage/healing | Parcelas com DiceExpression ou fórmula tipada, tipo, condição, timing e alvo |
| higherLevels | Operador declarativo e diferença de nível; ausente significa sem escalonamento declarado |
| effects | Condições, escolhas, invocações, interrupções, duração especial e efeitos narrativos |
| tags | Busca por função, classe, escola, situação; não regra implícita |
| automationStatus/pendingDecisionIds | automated/assisted/blocked por efeito e vínculo com pendência |

Material sem custo e material sem descrição não são sinônimos. Não deduzir ritual do tempo de conjuração. Magia com teste de resistência pode também exigir ataque ou efeito automático; não limitar schema a um único resultado binário.

`CastRequest={commandId,characterId,expectedRevision,spellRef,castingSourceId,mode:normal/ritual/feature,resourcePoolId?,slotLevel?,targetContext,componentContext,choices}`. SourceId determina atributo, elegibilidade e capacidade. `CastPreview` informa gasto, ação, componentes consumidos, concentração substituída, resultados que exigem intervenção e referências.

`CastResolution` usa RuleResult canônico. `PendingCast` persistido para tempos longos contém request, progresso de tempo de jogo, concentração em curso e interrupção; não descontar espaço antes de conclusão quando a fonte diz que falha não o gasta.

Aceite: representar Cura, Bola de Fogo, Detectar Magia, Raio de Fogo e Revivificar sem campos ad hoc por componente de UI; não prometer resolver automaticamente efeitos narrativos. Fonte estrutural: Livro do Jogador, cap.10 pp.203–207/PDF202–206.
