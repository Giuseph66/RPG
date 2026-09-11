# Raças — catálogo operacional

Estado: documentação; implementação futura. Fonte: **Livro do Jogador fornecido**, capítulo2, impressas17–43 / PDF16–42. PDF contado desde1; impressa = PDF+1. Rule pack `phb-ptbr-local-2017`; não presumir equivalência integral com outro PHB.

## Inventário confirmado

| Raça | entityId | Sub-raças jogáveis |
|---|---|---|
| [Anão](anao.md) | `dwarf` | 2 |
| [Elfo](elfo.md) | `elf` | 3 |
| [Halfling](halfling.md) | `halfling` | 2 |
| [Humano](humano.md) | `human` | 0 |
| [Draconato](draconato.md) | `dragonborn` | 0 |
| [Gnomo](gnomo.md) | `gnome` | 2 |
| [Meio-elfo](meio-elfo.md) | `half-elf` | 0 |
| [Meio-orc](meio-orc.md) | `half-orc` | 0 |
| [Tiefling](tiefling.md) | `tiefling` | 0 |

**9 raças,9 sub-raças completas,1 variante humana.** Dez ancestrais de draconato são escolhas de traço. Duergar, svirfneblin e draconianos são menções sem bloco jogável; não criar regras a partir de narrativa.

## Contrato comum e autoridade

`RaceDefinition` contém `id`, rótulo localizado, `sourceRefs`, incrementos, tamanho, deslocamentos, sentidos, idiomas, concessões de proficiência, traços e escolhas. `SubraceDefinition` referencia a raça pai e expressa apenas acréscimos/substituições explícitas. Regras específicas prevalecem sobre gerais; escolhas não alteram definição estática.

`Character.raceRef` e `subraceRef` usam `DefinitionRef={rulesetId,entityId}`. `raceChoices` armazena IDs das escolhas; usos, efeitos ativos e mecanismos são instâncias mutáveis separadas. Cada concessão conserva sua origem para explicar cálculo e desfazer escolhas sem apagar bônus de outra fonte. Lookup é tipado; IDs não dependem da tradução.

Visão no escuro converte penumbra em luz plena e escuridão em penumbra no alcance, sem cores na escuridão. Não significa enxergar toda escuridão mágica. Idade, altura, tendência e cultura são descrição; o capítulo2 não define penalidades de envelhecimento nem obriga alinhamento.

## Criação, ficha e aceite comum

Selecionar raça → restringir sub-raças → resolver escolhas → prévia de concessões → validar → confirmar. Trocar raça invalida escolhas incompatíveis e apresenta diferenças antes da gravação. A ficha mostra valores derivados e origem, enquanto Ações oferece recursos acionáveis. Nenhuma UI aplica bônus diretamente.

Aceite: cada opção publicada possui fonte, IDs resolvidos, escolhas completas e exemplos do respectivo documento. Conceder o mesmo traço duas vezes não dobra proficiência; restauração do personagem preserva usos gastos. `RuleResult` retorna `nextState`, `effects`, `explanations`, `sourceRefs`, sem IO. Ver [Rules Engine](../../10-RULES-ENGINE.md), [recursos](../recursos.md), [pendências](../../decisoes/PENDENCIAS.md).
