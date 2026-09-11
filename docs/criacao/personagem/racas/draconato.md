# Draconato

## Visão geral e fonte

Definição racial `dragonborn` no pack `phb-ptbr-local-2017`. Fonte normativa desta ficha: **Livro do Jogador fornecido**, capítulo2, impressa(s)34 / PDF33; referências aplicam-se às seções abaixo. [Contrato e catálogo comum](README.md).

## Atributos, deslocamento, tamanho, idade, idiomas e sentidos

| Campo | Regra |
|---|---|
| Incrementos | FOR +2; CAR +1 |
| Tamanho | Médio |
| Deslocamento | 9 m |
| Idade | Adulto aos 15; até 80 anos; sem modificador mecânico de envelhecimento definido |
| Idiomas | Comum, Dracônico |
| Sentidos | Nenhum sentido especial concedido |
| Proficiências | Nenhuma proficiência racial |

## Traços e regras especiais

Arma de Sopro: **ação**, um uso; recupera após descanso curto ou longo. CD = 8 + modificador CON + proficiência. Dano por nível total: 1–5 → 2d6; 6–10 → 3d6; 11–15 → 4d6; 16–20 → 5d6. Falha recebe dano integral; sucesso recebe metade, arredondada para baixo. Resistência permanente ao mesmo tipo de dano.

| ancestryId | Ancestral | Dano | Área | Resistência |
|---|---|---|---|---|
| blue | Azul | Elétrico | Linha 1,5 × 9 m | DES |
| white | Branco | Frio | Cone 4,5 m | CON |
| bronze | Bronze | Elétrico | Linha 1,5 × 9 m | DES |
| copper | Cobre | Ácido | Linha 1,5 × 9 m | DES |
| brass | Latão | Fogo | Linha 1,5 × 9 m | DES |
| black | Negro | Ácido | Linha 1,5 × 9 m | DES |
| gold | Ouro | Fogo | Cone 4,5 m | DES |
| silver | Prata | Frio | Cone 4,5 m | CON |
| green | Verde | Veneno | Cone 4,5 m | CON |
| red | Vermelho | Fogo | Cone 4,5 m | DES |


## Sub-raças e variantes

Não há sub-raça jogável; ancestral é escolha de traço. Draconianos recebem menção narrativa sem definição mecânica completa.

## Dados necessários e impacto na criação

Ancestral obrigatório define área, dano, resistência e defesa juntos. Não permitir combinação independente de cone e ancestral de linha.

Persistir `raceRef`, `subraceRef` quando aplicável e escolhas por ID; resolver incrementos e concessões a partir das definições. Recursos usam instâncias com `sourceRef`, limite e disponibilidade derivados de `spent`. Não salvar o bônus racial como edição do valor-base nem copiar definições para cada personagem. Escolhas incompletas geram erro de validação vinculado ao campo; raça sem sub-raças não exige seleção vazia.

## Impacto na ficha e ações

Exibir raça/sub-raça, origem dos incrementos, sentidos, idiomas e proficiências. Traços passivos explicam os totais; traços ativos aparecem em Ações com custo, disponibilidade, recuperação e referência. Reavaliar traços escalonáveis pelo nível total ao subir nível. Preferências narrativas não impõem bloqueios mecânicos.

## Casos de teste e aceite futuro

CON 16 e nível 6 → CD14 com proficiência3, dano3d6. Resultado de dano13 e sucesso do alvo →6. Segundo sopro antes de descanso rejeitado sem alterar estado.

Verificar criação, aplicação uma única vez, troca de seleção e importação com referências válidas. Toda operação inválida preserva estado e recursos. Testes futuros determinísticos; nenhum software implementado nesta etapa. [Recursos](../recursos.md), [descanso](../../regras/descanso.md), [condições](../../regras/condicoes.md).
