# Humano

## Visão geral e fonte

Definição racial `human` no pack `phb-ptbr-local-2017`. Fonte normativa desta ficha: **Livro do Jogador fornecido**, capítulo2, impressa(s)31 / PDF30; referências aplicam-se às seções abaixo. [Contrato e catálogo comum](README.md).

## Atributos, deslocamento, tamanho, idade, idiomas e sentidos

| Campo | Regra |
|---|---|
| Incrementos | Padrão: +1 em cada uma das seis habilidades |
| Tamanho | Médio |
| Deslocamento | 9 m |
| Idade | Adulto no fim da adolescência; menos de um século; sem modificador mecânico de envelhecimento definido |
| Idiomas | Comum e um à escolha |
| Sentidos | Nenhum sentido especial concedido |
| Proficiências | Padrão não concede; variante: uma perícia à escolha |

## Traços e regras especiais

O humano padrão concede seis incrementos de +1. O humano variante substitui esse conjunto por dois +1 em habilidades diferentes, uma perícia e um talento elegível. Talentos e variante precisam estar disponíveis na campanha. Não aplicar os dois conjuntos de incrementos juntos.

ID da variante: `variant-human`; é variante de raça, não sub-raça. O texto introdutório da variante fala em substituir “Perícias”, embora esse campo não exista no bloco padrão: registrar conflito, mantendo os benefícios enumerados.

## Sub-raças e variantes

Não há sub-raças com regras próprias. Etnias humanas são opções narrativas, sem novos bônus.

## Dados necessários e impacto na criação

Escolher modo padrão ou variante. Variante exige duas habilidades distintas, uma perícia e talento com pré-requisitos satisfeitos após os incrementos elegíveis; idioma adicional em ambos.

Persistir `raceRef`, `subraceRef` quando aplicável e escolhas por ID; resolver incrementos e concessões a partir das definições. Recursos usam instâncias com `sourceRef`, limite e disponibilidade derivados de `spent`. Não salvar o bônus racial como edição do valor-base nem copiar definições para cada personagem. Escolhas incompletas geram erro de validação vinculado ao campo; raça sem sub-raças não exige seleção vazia.

## Impacto na ficha e ações

Exibir raça/sub-raça, origem dos incrementos, sentidos, idiomas e proficiências. Traços passivos explicam os totais; traços ativos aparecem em Ações com custo, disponibilidade, recuperação e referência. Reavaliar traços escalonáveis pelo nível total ao subir nível. Preferências narrativas não impõem bloqueios mecânicos.

## Casos de teste e aceite futuro

Valores todos 10 → humano padrão todos 11. Variante FOR/DES → somente esses dois aumentam; não conceder +1 aos demais. Talento indisponível → variante bloqueada na criação.

Verificar criação, aplicação uma única vez, troca de seleção e importação com referências válidas. Toda operação inválida preserva estado e recursos. Testes futuros determinísticos; nenhum software implementado nesta etapa. [Recursos](../recursos.md), [descanso](../../regras/descanso.md), [condições](../../regras/condicoes.md).
