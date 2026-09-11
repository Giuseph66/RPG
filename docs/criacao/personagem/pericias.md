# Perícias, resistências e proficiências

Fonte: **Livro do Jogador fornecido**, capítulo7,p175–181/PDF174–180; duplicidade de antecedentes cap4,p127/PDF126. **18 perícias**. Constituição não tem perícia padrão.

| ID | Nome | Habilidade padrão | Finalidade |
|---|---|---|---|
| athletics |Atletismo|FOR|Escalar/nadar/saltar em dificuldade|
| acrobatics |Acrobacia|DES|Equilíbrio e acrobacias|
| sleight-of-hand |Prestidigitação|DES|Manipulação sutil, furtar/ocultar objeto|
| stealth |Furtividade|DES|Ocultar-se e mover sem ser percebido|
| arcana |Arcanismo|INT|Magia e planos|
| history |História|INT|Eventos, pessoas e civilizações|
| investigation |Investigação|INT|Pistas e dedução|
| nature |Natureza|INT|Terreno, seres naturais e clima|
| religion |Religião|INT|Deuses, rituais e cultos|
| animal-handling |Adestrar Animais|SAB|Acalmar/entender animais e controlar montaria|
| insight |Intuição|SAB|Intenções e linguagem corporal|
| medicine |Medicina|SAB|Diagnóstico/estabilização|
| perception |Percepção|SAB|Detectar estímulos e ameaças|
| survival |Sobrevivência|SAB|Rastros, orientação e provisões|
| performance |Atuação|CAR|Entreter com artes|
| deception |Enganação|CAR|Ocultar verdade e ludibriar|
| intimidation |Intimidação|CAR|Influência por ameaça|
| persuasion |Persuasão|CAR|Influência com tato e boa-fé|

## Modelo e fórmula

`SkillDefinition` identifica habilidade padrão e fonte. `ProficiencyGrant` referencia perícia/ferramenta/arma/armadura/resistência e origem. Nível de contribuição (`none`,`proficient`,`expertise`,`half`) é derivado das concessões e condições; não checkbox que mistura origens.

Bônus de perícia=`mod habilidade+PB aplicável+outros`. Especialização dobra PB apenas quando concedida. Meia proficiência arredonda para baixo e respeita gatilhos da classe. Duas proficiências normais não somam. Substituição de duplicidade em criação conforme antecedente exige outra do mesmo tipo.

Seis resistências, uma por habilidade, possuem proficiências próprias; não herdam perícia. Proficiência em ferramenta não fixa atributo e não soma outro PB junto à perícia no mesmo teste. Variante de perícia com atributo diferente exige contexto da mesa, preserva padrão do catálogo.

## Passivos e informação

Passivo10+bônus normal,±5 para vantagem/desvantagem. Registrar origem do modificador; Percepção passiva é consulta central da ficha e Investigação passiva existe quando usada. Observador acrescenta5 a ambas. Furtividade não é invisibilidade; declarar onde procura importa mesmo com bônus alto.

## UX e testes futuros

Lista compacta mostra nome, bônus, treinamento e ação rolar; detalhe abre atributo alternativo/contexto permitido e fontes. Ícone sem cor única distingue proficiência/especialização. Resultados informam dados individuais e total.

DES16/PB3:Acrobacia não treinada+3;proficiente+6;Especialização+9. SAB15/PB2:Percepção passiva14. Guerreiro com Atletismo não ganha Acrobacia por padrão. CON(Atletismo) comCON+1/PB3→+4 quando autorizado. Corrigir escolha de classe recalcula concessão, não apaga a de raça. [Testes](../regras/testes.md).
