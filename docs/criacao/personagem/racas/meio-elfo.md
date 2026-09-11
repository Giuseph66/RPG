# Meio-elfo

## Visão geral e fonte

Definição racial `half-elf` no pack `phb-ptbr-local-2017`. Fonte normativa desta ficha: **Livro do Jogador fornecido**, capítulo2, impressa(s)39 / PDF38; referências aplicam-se às seções abaixo. [Contrato e catálogo comum](README.md).

## Atributos, deslocamento, tamanho, idade, idiomas e sentidos

| Campo | Regra |
|---|---|
| Incrementos | CAR +2; +1 em outras duas habilidades distintas |
| Tamanho | Médio |
| Deslocamento | 9 m |
| Idade | Adulto aos20; raramente além180 anos; sem modificador mecânico de envelhecimento definido |
| Idiomas | Comum, Élfico e um à escolha |
| Sentidos | Visão no escuro18 m |
| Proficiências | Duas perícias à escolha |

## Traços e regras especiais

Ancestral Feérico concede vantagem em resistências contra encantamento e impede sono mágico. A expressão da tradução deve ser apresentada junto à fonte; o traço correspondente do elfo especifica ser enfeitiçado. Não generalizar para qualquer magia da escola Encantamento sem decisão de campanha.

Versatilidade em Perícia concede exatamente duas proficiências distintas. Não concede Especialização nem proficiência em armas élficas. Não concede Transe.

## Sub-raças e variantes

Nenhuma sub-raça mecânica no bloco fornecido.

## Dados necessários e impacto na criação

Duas habilidades diferentes de CAR; duas perícias distintas; um idioma adicional. Origem parental é narrativa.

Persistir `raceRef`, `subraceRef` quando aplicável e escolhas por ID; resolver incrementos e concessões a partir das definições. Recursos usam instâncias com `sourceRef`, limite e disponibilidade derivados de `spent`. Não salvar o bônus racial como edição do valor-base nem copiar definições para cada personagem. Escolhas incompletas geram erro de validação vinculado ao campo; raça sem sub-raças não exige seleção vazia.

## Impacto na ficha e ações

Exibir raça/sub-raça, origem dos incrementos, sentidos, idiomas e proficiências. Traços passivos explicam os totais; traços ativos aparecem em Ações com custo, disponibilidade, recuperação e referência. Reavaliar traços escalonáveis pelo nível total ao subir nível. Preferências narrativas não impõem bloqueios mecânicos.

## Casos de teste e aceite futuro

Escolher CAR entre os dois +1 rejeitado. SAB/CON válidos. Não herdar automaticamente truque ou armas do alto elfo parental.

Verificar criação, aplicação uma única vez, troca de seleção e importação com referências válidas. Toda operação inválida preserva estado e recursos. Testes futuros determinísticos; nenhum software implementado nesta etapa. [Recursos](../recursos.md), [descanso](../../regras/descanso.md), [condições](../../regras/condicoes.md).
