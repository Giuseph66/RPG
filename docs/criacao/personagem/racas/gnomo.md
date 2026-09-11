# Gnomo

## Visão geral e fonte

Definição racial `gnome` no pack `phb-ptbr-local-2017`. Fonte normativa desta ficha: **Livro do Jogador fornecido**, capítulo2, impressa(s)36–37 / PDF35–36; referências aplicam-se às seções abaixo. [Contrato e catálogo comum](README.md).

## Atributos, deslocamento, tamanho, idade, idiomas e sentidos

| Campo | Regra |
|---|---|
| Incrementos | INT +2 |
| Tamanho | Pequeno; 0,90–1,20 m |
| Deslocamento | 7,5 m |
| Idade | Adulto por volta dos 40; 350–500 anos; sem modificador mecânico de envelhecimento definido |
| Idiomas | Comum, Gnômico |
| Sentidos | Visão no escuro 18 m |
| Proficiências | Rochas: ferramentas de engenhoqueiro; alias pendente com funileiro da tabela |

## Traços e regras especiais

Esperteza Gnômica: vantagem em resistências de INT, SAB e CAR **contra magia**. Não afeta testes de perícia nem resistências físicas. A aplicação exige contexto indicando a natureza mágica do efeito.

## Sub-raças e variantes

| ID | Nome | Acrescenta |
|---|---|---|
| forest-gnome | Gnomo da floresta | DES +1; ilusão menor usando INT; comunica ideias simples por sons/gestos a Bestas Pequenas ou menores. |
| rock-gnome | Gnomo das rochas | CON +1; História sobre itens mágicos, objetos alquímicos e mecanismos tecnológicos usa 2 × proficiência em lugar de bônus normal; proficiência de engenhoqueiro. |

Engenhoqueiro (rochas): 1 h +10 po em materiais cria mecanismo Miúdo CA5/PV1. Máximo três ativos. Dura24 h, renováveis por1 h de reparo; ação desmonta e permite recuperar materiais. Opções: brinquedo (anda1,5 m por turno em direção aleatória e faz sons), isqueiro (ação para acender), caixa de música (toca aberta até fim/fechamento). Direção aleatória vem do Dice Engine; tempo vem de comando, não relógio interno.

Svirfneblin: apenas menção narrativa; regras de sub-raça **não definidas pela fonte atual**.

## Dados necessários e impacto na criação

Uma sub-raça; floresta recebe truque fixo, rochas coleção de mecanismos instanciados. Registrar posição narrativa sem obrigar battle map.

Persistir `raceRef`, `subraceRef` quando aplicável e escolhas por ID; resolver incrementos e concessões a partir das definições. Recursos usam instâncias com `sourceRef`, limite e disponibilidade derivados de `spent`. Não salvar o bônus racial como edição do valor-base nem copiar definições para cada personagem. Escolhas incompletas geram erro de validação vinculado ao campo; raça sem sub-raças não exige seleção vazia.

## Impacto na ficha e ações

Exibir raça/sub-raça, origem dos incrementos, sentidos, idiomas e proficiências. Traços passivos explicam os totais; traços ativos aparecem em Ações com custo, disponibilidade, recuperação e referência. Reavaliar traços escalonáveis pelo nível total ao subir nível. Preferências narrativas não impõem bloqueios mecânicos.

## Casos de teste e aceite futuro

SAB contra magia → vantagem; SAB contra perigo não mágico → normal. Quarto mecanismo ativo rejeitado. Aos24 h, mecanismo sem reparo para; materiais recuperados só mediante operação explícita.

Verificar criação, aplicação uma única vez, troca de seleção e importação com referências válidas. Toda operação inválida preserva estado e recursos. Testes futuros determinísticos; nenhum software implementado nesta etapa. [Recursos](../recursos.md), [descanso](../../regras/descanso.md), [condições](../../regras/condicoes.md).
