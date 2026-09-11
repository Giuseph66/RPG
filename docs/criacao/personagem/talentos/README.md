# Talentos

Fonte: **Livro do Jogador fornecido**, capítulo6, impressas167–172/PDF166–171. [Catálogo completo](catalogo.md):42 talentos. Disponíveis somente quando campanha habilita opção; não pressupor ativação global.

## Contrato e aquisição

`FeatDefinition` contém `id`, rótulo, pré-requisitos estruturados, escolhas, efeitos, regra de repetição e `sourceRefs`. `FeatSelection` contém `definitionRef`, origem da aquisição (nível/classe ou variante humana), escolhas e instante lógico. Estado de recurso/limites por alvo fica separado.

Ao receber Incremento no Valor de Habilidade, pode trocá-lo por1 talento. Não conceder talento e incremento da classe juntos; incremento embutido no talento permanece. Pré-requisitos usam estado antes de aplicar os benefícios do próprio talento. Perder requisito suspende benefícios até recuperá-lo; não apaga seleção. Cada talento só pode ser escolhido1 vez, exceto Adepto Elemental para tipos diferentes. Aumentos especificados respeitam máximo20.

Escolhas de magia conservam lista e atributo: CAR para bardo/bruxo/feiticeiro; SAB para clérigo/druida; INT para mago. Referências usam `DefinitionRef={rulesetId,entityId}` e lookup tipado no pack `phb-ptbr-local-2017`. Talento `lucky` e traço halfling Sortudo têm proprietários distintos.

## Aplicação, UI e aceite

Prévia exibe substituição do incremento, requisitos, escolhas, recursos e mudanças nos valores. Ficha lista características passivas; Ações oferece reações/opções facultativas no momento correto. Declarar−5/+10 antes da rolagem; não aplicar retroativamente porque acertou. Engine conserva explicações e fonte de todo modificador.

Testes futuros: pré-requisito13 aceita/12 rejeita; perder requisito suspende e recuperar reativa; segundo Resiliente rejeitado; Adepto Elemental repetido com mesmo tipo rejeitado; Robusto nível5 dá+10 PV uma vez; Líder Inspirador não soma PV temporários; duas reações do mesmo personagem antes do início do próximo turno rejeitadas. IDs e catálogo integral precisam corresponder à fonte; texto descritivo não substitui regras.

[Combate](../../regras/combate.md), [recursos](../recursos.md), [pendências](../../decisoes/PENDENCIAS.md).
