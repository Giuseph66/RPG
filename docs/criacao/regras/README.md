# Regras — índice normativo

Fonte: **Livro do Jogador fornecido**, capítulos7–9 e apêndiceA; pack `phb-ptbr-local-2017`. Páginas PDF contam desde1; impressa=PDF+1. Regras desta compilação podem divergir de outras publicações. Nenhuma regra2024, suplemento ou correção externa é importada automaticamente.

| Tema | Documento | Fonte impressa/PDF |
|---|---|---|
| Testes, vantagem, proficiência | [Testes](testes.md) | 175–181/174–180 |
| Velocidades, viagem, saltos | [Movimento](movimento.md) | 178,183–185,192–194/177,182–184,191–193 |
| Ambiente, luz, provisões, tempo livre | [Aventura](aventura.md) | 183–189/182–188 |
| Turnos, ataques, ações, cobertura | [Combate](combate.md) | 191–200/190–199 |
| Descansos e recuperação | [Descanso](descanso.md) | 188,292/187,291 |
| Dano, cura e PV temporários | [Dano e cura](dano-e-cura.md) | 198–200/197–199 |
| Zero PV, estabilidade, morte | [Morte](morte.md) | 199–200/198–199 |
| Condições e exaustão | [Condições](condicoes.md) | 291–293/290–292 |
| Combinação de classes | [Multiclasse](multiclasses.md) | 165–167/164–166 |

## Contrato e fronteira de decisão

Definições estáticas descrevem predicados, modificadores, custos, recuperação e `sourceRefs`. Estado contém PV, recursos, instâncias de condições e orçamento de turno. Entradas incluem decisões do Mestre, alvos, contexto e rolagens resolvidas. Mesmas entradas+mesmo estado+mesmo ruleset → mesmo resultado; nenhum RNG, relógio, storage, React ou chamada de rede dentro da regra.

`RuleResult` contém `nextState`, `effects`, `explanations`, `sourceRefs`. Orquestrador solicita dados ao Dice Engine e persiste atomicamente resultado válido. Na rejeição mantém estado e nenhum recurso consumido. Referências usam `DefinitionRef={rulesetId,entityId}`; efeitos explicam a origem de cada termo de cálculo.

## Aplicação e exceções

Regra específica prevalece sobre geral quando a fonte estabelece exceção. Empilhar somente o que a regra autoriza; vantagens/desvantagens, resistências e proficiência não acumulam por contagem de fontes. Preservar instâncias distintas mesmo quando efeitos derivados não somam. Arredondar divisões para baixo salvo instrução contrária (Livro, Introdução,p7/PDF6).

Companion permite registrar resoluções humanas e resultados externos; não precisa conduzir encontro completo nem controlar adversários. Contexto ausente pede dado objetivo necessário em formulário próprio. Não fabricar CD, posição, ação de NPC ou permissão de campanha.

[Rules Engine](../10-RULES-ENGINE.md), [Dice Engine](../11-DICE-ENGINE.md), [dados](../dados/README.md), [pendências](../decisoes/PENDENCIAS.md). Testes descritos são trabalho futuro; somente documentação nesta etapa.
