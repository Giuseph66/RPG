# Tiefling

## Visão geral e fonte

Definição racial `tiefling` no pack `phb-ptbr-local-2017`. Fonte normativa desta ficha: **Livro do Jogador fornecido**, capítulo2, impressa(s)43 / PDF42; referências aplicam-se às seções abaixo. [Contrato e catálogo comum](README.md).

## Atributos, deslocamento, tamanho, idade, idiomas e sentidos

| Campo | Regra |
|---|---|
| Incrementos | INT +1; CAR +2 |
| Tamanho | Médio |
| Deslocamento | 9 m |
| Idade | Amadurece como humano; vive alguns anos mais; sem modificador mecânico de envelhecimento definido |
| Idiomas | Comum, Infernal |
| Sentidos | Visão no escuro18 m |
| Proficiências | Nenhuma proficiência racial |

## Traços e regras especiais

Resistência Infernal: resistência ao dano de fogo.

Legado Infernal, usando CAR e nível total: taumaturgia desde1; repreensão infernal a partir3, conjurada como magia de2º nível; escuridão a partir5. Cada magia de nível tem um uso recuperado por descanso longo, separado dos slots de classe. Respeitar tempo, componentes e concentração das definições de magia. O truque não consome esses usos.

## Sub-raças e variantes

Nenhuma sub-raça mecânica nem variantes suplementares no material.

## Dados necessários e impacto na criação

Traços fixos; criar concessões de magias por nível e recursos individuais. Não conceder slots de2º só por conhecer repreensão infernal racial.

Persistir `raceRef`, `subraceRef` quando aplicável e escolhas por ID; resolver incrementos e concessões a partir das definições. Recursos usam instâncias com `sourceRef`, limite e disponibilidade derivados de `spent`. Não salvar o bônus racial como edição do valor-base nem copiar definições para cada personagem. Escolhas incompletas geram erro de validação vinculado ao campo; raça sem sub-raças não exige seleção vazia.

## Impacto na ficha e ações

Exibir raça/sub-raça, origem dos incrementos, sentidos, idiomas e proficiências. Traços passivos explicam os totais; traços ativos aparecem em Ações com custo, disponibilidade, recuperação e referência. Reavaliar traços escalonáveis pelo nível total ao subir nível. Preferências narrativas não impõem bloqueios mecânicos.

## Casos de teste e aceite futuro

Nível2: só taumaturgia; nível3: repreensão a2º; nível5: escuridão. Resistência reduz fogo13 para6. Reação racial respeita disponibilidade da reação.

Verificar criação, aplicação uma única vez, troca de seleção e importação com referências válidas. Toda operação inválida preserva estado e recursos. Testes futuros determinísticos; nenhum software implementado nesta etapa. [Recursos](../recursos.md), [descanso](../../regras/descanso.md), [condições](../../regras/condicoes.md).
