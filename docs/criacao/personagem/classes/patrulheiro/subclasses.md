# Patrulheiro — 3 conclaves desta compilação

Fonte: Livro do Jogador fornecido, cap.3, pp.118–121/PDF117–120. Escolha nível3. Esta versão difere de compilações conhecidas: não substituir regras ou remover terceiro conclave; [ADR-0005](../../../decisoes/ADR-0005-fonte-local.md).

## `beast-conclave` — Conclave da Besta

- Nível3, Companheiro Animal:8h+50po; uma besta da lista/decisão do Mestre; um companheiro. Vínculo remove Ataques Múltiplos, usa PB do patrulheiro, adiciona PB também em CA/dano, escolhe duas perícias e ganha todas resistências. Rola iniciativa/age próprio; ganha1 DV/HP por nível do patrulheiro após3 e ASI junto do dono. Ressurreição:8h+25po, substitui companheiro atual.
- Nível5, Ataque Coordenado: quando patrulheiro usa ação Atacar e companheiro vê, companheiro usa reação para ataque corpo a corpo. Classe base desta compilação não concede Ataque Extra aqui.
- Nível7, Defesa da Besta: companheiro vendo patrulheiro tem vantagem em todas resistências.
- Nível11, Tempestade de Garras e Presas: ação do companheiro ataca separadamente cada criatura escolhida a1,5m.
- Nível15, Defesa Superior: reação do companheiro ao ser atingido por atacante visível → metade do dano daquele ataque.

`CompanionState` é entidade simultânea, não transformação. Bloco ausente fica indisponível; regra de expansão por Mestre é assistida. Testar PB sem duplicação, iniciativa/reação própria, HP por nível, troca/ressurreição e ausência do dono.

## `hunter-conclave` — Conclave do Caçador

- Nível3, Presa: escolher Assassino de Colossos (1d8 uma vez/turno em alvo abaixo máximo), Matador de Gigantes (reação após ataque de Grande+ a1,5m) ou Destruidor de Hordas (outro ataque contra alvo diferente adjacente ao original,1×turno).
- Nível5, Ataque Extra: dois ataques na ação Atacar.
- Nível7, Tática Defensiva: Escapar da Horda; Defesa contra Múltiplos Ataques (+4CA contra ataques subsequentes do mesmo agressor no turno após acerto); ou Vontade de Aço.
- Nível11, Ataque Múltiplo: Saraivada contra criaturas num raio3m de ponto, munição/rolagem individual; ou Ataque Giratório contra criaturas a1,5m.
- Nível15, Defesa Superior: Evasão; Manter-se contra a Maré redireciona ataque corpo a corpo que errou via reação; ou Esquiva Sobrenatural.

Cada grupo é ChoiceSelection independente. Não dar as três opções. Ataque em área não replica recursos1×turno sem respeitar limite.

## `deep-stalker-conclave` — Conclave do Rastreador Subterrâneo

- Nível3, Batedor: primeiro turno +3m e, se usa ação Atacar, um ataque adicional; visão no escuro de criaturas não ajuda a detectá-lo em escuridão/penumbra conforme texto. Magia: visão no escuro27m e magias extras conhecidas nos níveis3/5/9/13/17: Disfarçar-se, Truque de Corda, Glifo de Vigilância, Invisibilidade Maior, Similaridade.
- Nível5, Ataque Extra: dois ataques na ação Atacar; ataque adicional do Batedor continua condicionado ao primeiro turno.
- Nível7, Mente de Aço: proficiência resistência SAB.
- Nível11, Rajada do Rastreador:1×turno ao errar ataque, faz outro ataque.
- Nível15, Esquiva do Rastreador: reação quando atacado sem vantagem, impõe desvantagem antes do resultado; pode decidir depois da rolagem.

## Contrato e aceite

Subclasse nível3; Besta tem CreatureState, Caçador escolhas por marcos, Rastreador concessões de magia fora limite. Testar exatamente progressão local, ataques condicionados, reação única, magias extras e visibilidade assistida. Fonte completa vai até p.121/PDF120; não marcar capítulo encerrado no PDF120 como se p.121 inexistisse.
