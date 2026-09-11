# Elfo

## Visão geral e fonte

Definição racial `elf` no pack `phb-ptbr-local-2017`. Fonte normativa desta ficha: **Livro do Jogador fornecido**, capítulo2, impressa(s)23–24 / PDF22–23; referências aplicam-se às seções abaixo. [Contrato e catálogo comum](README.md).

## Atributos, deslocamento, tamanho, idade, idiomas e sentidos

| Campo | Regra |
|---|---|
| Incrementos | DES +2 |
| Tamanho | Médio; 1,50–1,80 m |
| Deslocamento | 9 m; floresta substitui por 10,5 m |
| Idade | Adulto cultural aos 100; até 750 anos; sem modificador mecânico de envelhecimento definido |
| Idiomas | Comum, Élfico; alto elfo escolhe +1 |
| Sentidos | Visão no escuro 18 m; drow substitui por 36 m |
| Proficiências | Percepção; armas conforme sub-raça |

## Traços e regras especiais

| ID do traço | Condição e efeito |
|---|---|
| fey-ancestry | Vantagem para resistir a ser enfeitiçado; magia não pode causar sono. Não é imunidade a todos os encantamentos. |
| trance | Meditação semiconsciente de 4 h equivale ao sono humano de 8 h. Não converter automaticamente duração do descanso longo: ver pendência de Transe e descanso. |
| keen-senses | Proficiência em Percepção. |


## Sub-raças e variantes

| ID | Nome | Atributo e regras |
|---|---|---|
| high-elf | Alto elfo | INT +1; espadas longa/curta, arcos longo/curto; um truque da lista de mago, usando INT; idioma adicional. |
| wood-elf | Elfo da floresta | SAB +1; mesmas quatro armas do alto elfo; caminhada 10,5 m; pode tentar esconder-se com obscurecimento leve causado por fenômenos naturais. |
| dark-elf | Elfo negro (drow) | CAR +1; visão 36 m; rapieira, espada curta, besta de mão. Globos de luz no nível 1, fogo das fadas no 3, escuridão no 5; CAR; cada magia de nível tem uso por descanso longo. |

Drow: ataques e Percepção visual têm desvantagem quando personagem, alvo de ataque ou objeto observado estiver sob sol direto. Disponibilidade drow depende da campanha. Subdivisões culturais (sol/lua etc.) não adicionam mecânicas.

## Dados necessários e impacto na criação

Uma sub-raça; alto elfo exige truque elegível e idioma; drow exige disponibilidade na campanha. Magias raciais usam nível total para desbloqueio e recursos separados dos slots.

Persistir `raceRef`, `subraceRef` quando aplicável e escolhas por ID; resolver incrementos e concessões a partir das definições. Recursos usam instâncias com `sourceRef`, limite e disponibilidade derivados de `spent`. Não salvar o bônus racial como edição do valor-base nem copiar definições para cada personagem. Escolhas incompletas geram erro de validação vinculado ao campo; raça sem sub-raças não exige seleção vazia.

## Impacto na ficha e ações

Exibir raça/sub-raça, origem dos incrementos, sentidos, idiomas e proficiências. Traços passivos explicam os totais; traços ativos aparecem em Ações com custo, disponibilidade, recuperação e referência. Reavaliar traços escalonáveis pelo nível total ao subir nível. Preferências narrativas não impõem bloqueios mecânicos.

## Casos de teste e aceite futuro

Drow nível 4 não tem escuridão; nível 5 desbloqueia sem consumir slot de classe. Elfo floresta tem 10,5 m, não 19,5 m. Ancestral feérico não dá vantagem contra todo teste mágico.

Verificar criação, aplicação uma única vez, troca de seleção e importação com referências válidas. Toda operação inválida preserva estado e recursos. Testes futuros determinísticos; nenhum software implementado nesta etapa. [Recursos](../recursos.md), [descanso](../../regras/descanso.md), [condições](../../regras/condicoes.md).
