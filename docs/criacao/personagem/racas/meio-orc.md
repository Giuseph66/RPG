# Meio-orc

## Visão geral e fonte

Definição racial `half-orc` no pack `phb-ptbr-local-2017`. Fonte normativa desta ficha: **Livro do Jogador fornecido**, capítulo2, impressa(s)41 / PDF40; referências aplicam-se às seções abaixo. [Contrato e catálogo comum](README.md).

## Atributos, deslocamento, tamanho, idade, idiomas e sentidos

| Campo | Regra |
|---|---|
| Incrementos | FOR +2; CON +1 |
| Tamanho | Médio;1,80–2,10 m |
| Deslocamento | 9 m |
| Idade | Adulto aos14; raramente além75 anos; sem modificador mecânico de envelhecimento definido |
| Idiomas | Comum, Orc |
| Sentidos | Visão no escuro18 m |
| Proficiências | Intimidação |

## Traços e regras especiais

| ID | Gatilho e efeito |
|---|---|
| relentless-endurance | Ao cair a0 PV sem morte instantânea, pode ficar com1 PV; um uso por descanso longo. Decisão antes da transição final de queda. |
| savage-attacks | Crítico com arma corpo a corpo: adicionar **um dado da arma** ao dano extra do crítico. Não duplica modificador nem todos os dados da arma. |
| menacing | Proficiência em Intimidação. |

## Sub-raças e variantes

Nenhuma sub-raça mecânica.

## Dados necessários e impacto na criação

Nenhuma escolha racial obrigatória além de identidade. Criar recurso de Resistência Implacável com máximo1, disponível inicialmente.

Persistir `raceRef`, `subraceRef` quando aplicável e escolhas por ID; resolver incrementos e concessões a partir das definições. Recursos usam instâncias com `sourceRef`, limite e disponibilidade derivados de `spent`. Não salvar o bônus racial como edição do valor-base nem copiar definições para cada personagem. Escolhas incompletas geram erro de validação vinculado ao campo; raça sem sub-raças não exige seleção vazia.

## Impacto na ficha e ações

Exibir raça/sub-raça, origem dos incrementos, sentidos, idiomas e proficiências. Traços passivos explicam os totais; traços ativos aparecem em Ações com custo, disponibilidade, recuperação e referência. Reavaliar traços escalonáveis pelo nível total ao subir nível. Preferências narrativas não impõem bloqueios mecânicos.

## Casos de teste e aceite futuro

Crítico espada grande2d6 →5d6 + modificador (4d6 crítico +1d6 racial). Morte instantânea não pode ser evitada por Resistência Implacável; segundo uso sem descanso rejeitado.

Verificar criação, aplicação uma única vez, troca de seleção e importação com referências válidas. Toda operação inválida preserva estado e recursos. Testes futuros determinísticos; nenhum software implementado nesta etapa. [Recursos](../recursos.md), [descanso](../../regras/descanso.md), [condições](../../regras/condicoes.md).
