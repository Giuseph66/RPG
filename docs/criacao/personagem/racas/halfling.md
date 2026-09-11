# Halfling

## Visão geral e fonte

Definição racial `halfling` no pack `phb-ptbr-local-2017`. Fonte normativa desta ficha: **Livro do Jogador fornecido**, capítulo2, impressa(s)28 / PDF27; referências aplicam-se às seções abaixo. [Contrato e catálogo comum](README.md).

## Atributos, deslocamento, tamanho, idade, idiomas e sentidos

| Campo | Regra |
|---|---|
| Incrementos | DES +2 |
| Tamanho | Pequeno; cerca de 0,90 m |
| Deslocamento | 7,5 m |
| Idade | Adulto aos 20; até 150 anos; sem modificador mecânico de envelhecimento definido |
| Idiomas | Comum, Halfling |
| Sentidos | Nenhum sentido especial concedido |
| Proficiências | Nenhuma proficiência racial |

## Traços e regras especiais

| ID do traço | Condição e efeito |
|---|---|
| lucky | Ao obter 1 natural em ataque, teste de habilidade ou resistência, pode rerrolar o dado; deve usar o novo resultado. Com vantagem/desvantagem, rerrola somente um dado. |
| brave | Vantagem em resistências contra amedrontamento. |
| halfling-nimbleness | Pode atravessar espaço de criatura de pelo menos uma categoria maior; continua sujeito ao custo de terreno e proibição de terminar voluntariamente no espaço dela. |


## Sub-raças e variantes

| ID | Nome | Acrescenta |
|---|---|---|
| lightfoot | Pés leves | CAR +1; pode tentar esconder-se usando cobertura de criatura de pelo menos uma categoria maior. |
| stout | Robusto | CON +1; vantagem nas resistências contra veneno; resistência ao dano de veneno. |

## Dados necessários e impacto na criação

Uma sub-raça. Sortudo racial é uma concessão própria, independente do talento Sortudo e seus três pontos.

Persistir `raceRef`, `subraceRef` quando aplicável e escolhas por ID; resolver incrementos e concessões a partir das definições. Recursos usam instâncias com `sourceRef`, limite e disponibilidade derivados de `spent`. Não salvar o bônus racial como edição do valor-base nem copiar definições para cada personagem. Escolhas incompletas geram erro de validação vinculado ao campo; raça sem sub-raças não exige seleção vazia.

## Impacto na ficha e ações

Exibir raça/sub-raça, origem dos incrementos, sentidos, idiomas e proficiências. Traços passivos explicam os totais; traços ativos aparecem em Ações com custo, disponibilidade, recuperação e referência. Reavaliar traços escalonáveis pelo nível total ao subir nível. Preferências narrativas não impõem bloqueios mecânicos.

## Casos de teste e aceite futuro

Rolagem com vantagem [1,13], rerrolagem do 1 produz 8 → usar 13. Robusto não ganha imunidade a veneno. Arma pesada continua impondo desvantagem ao halfling.

Verificar criação, aplicação uma única vez, troca de seleção e importação com referências válidas. Toda operação inválida preserva estado e recursos. Testes futuros determinísticos; nenhum software implementado nesta etapa. [Recursos](../recursos.md), [descanso](../../regras/descanso.md), [condições](../../regras/condicoes.md).
