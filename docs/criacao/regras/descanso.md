# Descanso e recuperação

Fonte: **Livro do Jogador fornecido**, capítulo8,p188/PDF187; exaustão apêndiceA,p292/PDF291; PV temporários cap9,p200/PDF199; Transe cap2,p23/PDF22. Toda recuperação de classe conserva sua própria referência.

## Contrato transacional

`RestRequest` informa tipo, início/fim no tempo da campanha, PV no início, atividades/interrupções, comida/água e escolhas de Dados de Vida. Validar elegibilidade → calcular prévia de PV/recursos → escolher recuperação permitida → confirmar um resultado atômico. Não modificar definições de recursos nem salvar parcialmente vida e slots.

Descanso planejado, em andamento, interrompido e concluído são estados distintos. O término não é inferido pelo relógio do dispositivo. Histórico impede concluir duas vezes a mesma sessão de descanso.

## Curto

≥1 h de atividade leve (comer, beber, ler, cuidar de ferimentos). No final pode gastar Dados de Vida disponíveis, um de cada vez. Cura por dado=`max(0,face+mod CON)`, limitada ao máximo de PV; decidir próximo dado **após** ver resultado do anterior. Não recuperar os próprios Dados de Vida por descanso curto.

Recuperar somente recursos cuja definição indica curto; recursos de longo permanecem gastos. Recuperação Arcana/Natural e outras características têm restrições próprias; curto não prepara toda magia automaticamente. Talento Resistente modifica mínimo da cura; aplicar sua regra específica.

## Longo

≥8 h de repouso; a fonte permite dormir/atividades leves e vigiar até2 h. Atividade extenuante descrita na fonte interrompe e exige reinício: a frase “pelo menos1 hora de caminhada, combate, conjurando...” possui ambiguidade de escopo; não decidir interrupções difíceis automaticamente. Expor duração/tipo para resolução da mesa, documentada como decisão de campanha.

Necessita≥1 PV no início e não pode produzir benefício mais de uma vez em24 h. Conclusão válida recupera todos PV perdidos e metade do total de Dados de Vida gastos recuperáveis, limitada aos efetivamente gastos. Regra geral de arredondamento produz `floor(totalDV/2)` como capacidade de recuperação. **A compilação não informa mínimo1**; não adicioná-lo de outro livro. Em multiclasse escolher quais tipos recuperar, respeitando capacidade total.

Recursos marcados longo restauram conforme definição; slots normais voltam conforme classe; não remover doenças/condições arbitrariamente. PV temporários sem duração própria expiram ao concluir longo. Exaustão reduz1 se também comeu/bebeu; privação exige necessidades completas antes de remover exaustão (cap8,p187).

Transe substitui sono por meditação4 h, mas o capítulo8 ainda define descanso longo≥8 h. Não reduzir automaticamente longo a4 h; registrar pendência e resolução explícita antes de habilitar atalho.

## Exemplos e testes futuros

Curto: PV8/20,CON+2,d8=5 →15; consumir mais d8=7 →20, segundo dado gasto integralmente. Mod CON−2,dado1 →cura0 e dado gasto. Curto não restaura Resistência Implacável de meio-orc.

Longo: nível5,3 DV gastos → recuperar no máximo2; usuário escolhe tipos se multiclasse. Nível1: literalidade desta fonte dá0 DV recuperado, pendência destacada. PV0 no início → não conceder benefício. Segunda conclusão na mesma janela24 h → rejeitar sem recuperar. Exaustão2→1 com alimentação adequada; origem de privação sem reposição completa mantém nível.

Aceite: prévia identifica todas as mudanças e motivos, escolha por dado preservada, nenhuma recuperação duplicada por reabrir tela/importar; campos desconhecidos de fonte aparecem como pendência, não correção silenciosa. [Recursos](../personagem/recursos.md), [multiclasse](multiclasses.md).
