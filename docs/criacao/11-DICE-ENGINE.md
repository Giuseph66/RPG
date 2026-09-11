# 11 — Dice Engine

## Contrato independente de UI

`DiceExpression = {quantity, faces, modifier, mode}`. `quantity`: inteiro de 1 a 100; `faces`: 4, 6, 8, 10, 12, 20 ou 100; `modifier`: inteiro entre −1000 e 1000; `mode`: `normal | advantage | disadvantage`. Limites numéricos são proteção de produto, não regra de D&D.

Vantagem/desvantagem aceita somente expressão de um d20. `2d20` normal rola e soma dois dados; vantagem gera dois candidatos para um teste e seleciona um. Entrada incompatível retorna erro de campo; nunca reinterpretar silenciosamente. Fonte: Livro do Jogador, cap. 7, p. 175/PDF 174.

`DiceRoll = {id, expression, purpose, characterId?, commandId?, timestamp, rawDice, selectedIndexes, discardedIndexes, subtotal, modifier, total, rngVersion}`. Timestamp e ID são injetados pela aplicação. Dados brutos sempre permanecem disponíveis. `purpose` distingue rolagem livre, ataque, dano, resistência, perícia, iniciativa, morte e geração de atributos; não muda probabilidades.

## Aleatoriedade e avaliação

Injetar contrato `RandomSource.nextInt(minInclusive,maxInclusive)`. Produção usa gerador da plataforma com amostragem sem viés; testes injetam sequência fixa. Não usar módulo simples de inteiro aleatório quando o intervalo não divide o espaço de amostragem. O engine valida que o RNG devolveu inteiro dentro do intervalo.

Normal: gerar `quantity` resultados, somar e adicionar modificador. Vantagem: dois d20, maior selecionado. Desvantagem: menor. Empate: selecionar primeiro para consistência do histórico. Cancelamento entre causas ocorre no Rules Engine antes da expressão. d100 produz 1–100; apresentação opcional em dezenas/unidades não altera semântica de 100.

Texto livre, se oferecido, aceita gramática fechada `NdF`, `NdF + M`, `NdF - M`, com espaços opcionais, e passa pelo mesmo validador. Nunca `eval`, JavaScript, URLs ou funções. V1 não aceita expressões arbitrárias compostas no editor global.

## Operações compostas

Ataque/dano com vários tipos usa plano de rolagens: várias `DiceExpression` com chaves de parcelas, resolvidas pelo mesmo engine. Crítico altera quantidade de dados elegíveis no Rules Engine, não dobra modificador. Geração de atributos usa operação específica `rollAbilityScores`: seis grupos de 4d6, descarta um menor em cada grupo, preserva grupos e descartes; não fingir que `mode` implementa keep-highest. Fonte: cap. 1 p. 13/PDF 12.

Re-rolagem por regra é operação distinta de “rolar novamente” da UI. A primeira conserva vínculo com rolagem original e limita dados conforme característica (ex.: Sorte de halfling); a segunda cria novo ID e resultado independente. Fonte: cap. 2, traços halfling; cap. 7 p. 175/PDF 174.

## Histórico e UX

Header, FAB, cards e atalhos chamam o mesmo caso de uso. Resultado revela cada dado, selecionados/descartados, soma e modificador; texto acessível acompanha animação opcional. Abrir overlay não muda rota ou personagem. Rolagem persistida não rola novamente ao remount. Limpeza de histórico exige confirmação própria e não remove efeitos já aplicados na ficha.

Histórico local persistente por personagem, com rolagens livres globais separadas; política inicial de retenção de 1000 entradas por personagem, configurável depois. Exportação inclui histórico disponível e declara intervalo; nunca alegar histórico completo após descarte. Falha no log de rolagem livre mantém resultado visível e informa não salvo. Resultado vinculado a comando deve ser persistido com o efeito, na mesma transação.

## Casos determinísticos obrigatórios

| Entrada/RNG | Resultado |
| --- | --- |
| `3d6+2`, sequência 4,6,2 | individuais 4/6/2; subtotal 12; total 14 |
| `1d20+5`, vantagem, 3/17 | seleciona 17; total 22 |
| Mesma sequência, desvantagem | seleciona 3; total 8 |
| d100 com sequência 1 e 100 em operações separadas | ambos limites aceitos |
| Quantidade 0, faces 3, decimal, infinito, `2d20 advantage` | rejeição sem consumir RNG |
| 4d6, sequência 1,3,5,6 | valor 14, descarte 1 registrado |
| Ataque recebe natural 20 | engine só relata 20; Rules Engine decide crítico |

Aceite: sem dependências de UI/storage, limites validados, RNG controlável, resultados reprodutíveis, nenhuma animação necessária para acesso ao total. [Interface](interface/dice-overlay.md).
