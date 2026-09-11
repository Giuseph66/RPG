# Perfis de conjuração das classes

Fonte: Livro do Jogador fornecido, cap.3, tabelas PDF52/56/63/71/77/85/92/94/108/115; cap.6 PDF165–166. Índices de PDF começam1; página impressa=PDF+1 nestas páginas.

## Espaços por nível

Cada sequência enumera capacidades dos círculos1º em diante; círculos omitidos têm capacidade0. Integral=bardo/clérigo/druida/feiticeiro/mago. Meio=paladino/patrulheiro. Terço=somente Cavaleiro Arcano/Trapaceiro Arcano. Linhas usam nível da respectiva classe, não nível combinado. Pacto não usa esta tabela.

| Nível classe | Integral | Meio | Terço |
|---|---|---|---|
| 1 | 2 | — | — |
| 2 | 3 | 2 | — |
| 3 | 4/2 | 3 | 2 |
| 4 | 4/3 | 3 | 3 |
| 5 | 4/3/2 | 4/2 | 3 |
| 6 | 4/3/3 | 4/2 | 3 |
| 7 | 4/3/3/1 | 4/3 | 4/2 |
| 8 | 4/3/3/2 | 4/3 | 4/2 |
| 9 | 4/3/3/3/1 | 4/3/2 | 4/2 |
| 10 | 4/3/3/3/2 | 4/3/2 | 4/3 |
| 11 | 4/3/3/3/2/1 | 4/3/3 | 4/3 |
| 12 | 4/3/3/3/2/1 | 4/3/3 | 4/3 |
| 13 | 4/3/3/3/2/1/1 | 4/3/3/1 | 4/3/2 |
| 14 | 4/3/3/3/2/1/1 | 4/3/3/1 | 4/3/2 |
| 15 | 4/3/3/3/2/1/1/1 | 4/3/3/2 | 4/3/2 |
| 16 | 4/3/3/3/2/1/1/1 | 4/3/3/2 | 4/3/3 |
| 17 | 4/3/3/3/2/1/1/1/1 | 4/3/3/3/1 | 4/3/3 |
| 18 | 4/3/3/3/3/1/1/1/1 | 4/3/3/3/1 | 4/3/3 |
| 19 | 4/3/3/3/3/2/1/1/1 | 4/3/3/3/2 | 4/3/3/1 |
| 20 | 4/3/3/3/3/2/2/1/1 | 4/3/3/3/2 | 4/3/3/1 |

## Multiclasse

Com Conjuração de mais de uma classe, somar níveis integrais + piso(níveis paladino/2) + piso(níveis patrulheiro/2) + piso(níveis guerreiro/3) se Cavaleiro Arcano + piso(níveis ladino/3) se Trapaceiro Arcano; usar coluna Integral na linha resultante. Com apenas uma classe que concede Conjuração usar tabela própria, mesmo tendo outras classes. Magia de Pacto separada; slots podem pagar magias da outra característica, mantendo recuperação de origem. Conhecidas/preparadas e atributo de conjuração continuam separados. Truques escalam com nível total.

## Perfis

- [Bárbaro](barbaro.md)
- [Bardo](bardo.md)
- [Bruxo](bruxo.md)
- [Clérigo](clerigo.md)
- [Druida](druida.md)
- [Feiticeiro](feiticeiro.md)
- [Guerreiro](guerreiro.md)
- [Ladino](ladino.md)
- [Mago](mago.md)
- [Monge](monge.md)
- [Paladino](paladino.md)
- [Patrulheiro](patrulheiro.md)

## Contrato

`SpellcastingProfile` vincula classe/subclasse, habilidade, lista elegível, política known/prepared/spellbook/granted, limites por nível, restrições de escola, rituais e focos; `ResourceDefinition` define pool e recuperação. `SpellSlotState` guarda `spent`; espaços criados temporariamente usam uma definição de capacidade e expiração separada. Não inferir acesso a magia somente pela existência de slot. Traits que autorizam ritual/conjuração específica têm autorização própria e origem auditável.
