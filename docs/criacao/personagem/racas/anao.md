# Anão

## Visão geral e fonte

Definição racial `dwarf` no pack `phb-ptbr-local-2017`. Fonte normativa desta ficha: **Livro do Jogador fornecido**, capítulo2, impressa(s)20 / PDF19; referências aplicam-se às seções abaixo. [Contrato e catálogo comum](README.md).

## Atributos, deslocamento, tamanho, idade, idiomas e sentidos

| Campo | Regra |
|---|---|
| Incrementos | CON +2 |
| Tamanho | Médio; 1,20–1,50 m |
| Deslocamento | 7,5 m; armadura pesada não reduz esse deslocamento |
| Idade | Adulto cultural aos 50; média 350 anos; sem modificador mecânico de envelhecimento definido |
| Idiomas | Comum, Anão |
| Sentidos | Visão no escuro 18 m |
| Proficiências | Machado de batalha, machadinha, martelo leve, martelo de guerra; escolher ferramentas de ferreiro, cervejeiro ou pedreiro |

## Traços e regras especiais

| ID do traço | Condição e efeito |
|---|---|
| dwarven-resilience | Vantagem nas resistências contra veneno; resistência ao dano de veneno. São modificadores distintos. |
| stonecunning | História sobre origem de trabalho em pedra: considerar proficiente e usar 2 × bônus de proficiência; não somar novamente Especialização. |
| dwarven-speed | Ignorar redução de velocidade por armadura pesada; não concede proficiência na armadura. |


## Sub-raças e variantes

| ID | Nome | Acrescenta à raça |
|---|---|---|
| hill-dwarf | Anão da colina | SAB +1; máximo de PV +1 por nível total, inclusive o primeiro. |
| mountain-dwarf | Anão da montanha | FOR +2; proficiência em armaduras leves e médias. |

Duergar é mencionado, mas não recebe bloco jogável: **não definido pela fonte atual**. Não cadastrar como terceira opção habilitada.

## Dados necessários e impacto na criação

Uma sub-raça obrigatória; uma ferramenta dentre três. Incrementos da sub-raça acumulam com a raça, não entre sub-raças.

Persistir `raceRef`, `subraceRef` quando aplicável e escolhas por ID; resolver incrementos e concessões a partir das definições. Recursos usam instâncias com `sourceRef`, limite e disponibilidade derivados de `spent`. Não salvar o bônus racial como edição do valor-base nem copiar definições para cada personagem. Escolhas incompletas geram erro de validação vinculado ao campo; raça sem sub-raças não exige seleção vazia.

## Impacto na ficha e ações

Exibir raça/sub-raça, origem dos incrementos, sentidos, idiomas e proficiências. Traços passivos explicam os totais; traços ativos aparecem em Ações com custo, disponibilidade, recuperação e referência. Reavaliar traços escalonáveis pelo nível total ao subir nível. Preferências narrativas não impõem bloqueios mecânicos.

## Casos de teste e aceite futuro

Anão colina nível 5 recebe +5 PV raciais; montanha recebe FOR +2 e CON +2; anão sem proficiência pesada ainda sofre penalidades de uso, mesmo mantendo 7,5 m.

Verificar criação, aplicação uma única vez, troca de seleção e importação com referências válidas. Toda operação inválida preserva estado e recursos. Testes futuros determinísticos; nenhum software implementado nesta etapa. [Recursos](../recursos.md), [descanso](../../regras/descanso.md), [condições](../../regras/condicoes.md).
