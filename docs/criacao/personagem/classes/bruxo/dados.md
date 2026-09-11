# Bruxo — dados

Livro do Jogador fornecido, cap. 3 — Classes, pp. impressas 56–62, PDF 55–61. Pack `phb-ptbr-local-2017`; IDs independentes da tradução.

## Definição imutável

`ClassDefinition`: `id=warlock`, nome localizado, `hitDie=d8`, proficiências iniciais e de multiclasse distintas, pré-requisitos, tabela1–20, `subclassSelectionLevel`, opções de equipamento/perícias e referências de características. Cada referência usa `DefinitionRef={rulesetId,entityId}`; IDs de característica são os de recursos.md. Nomes, posição de arrays e traduções não identificam entidades.

`SubclassDefinition`: classe pai, nível escolha, concessões por nível, escolhas elegíveis, recursos adicionais, fontes. `ResourceDefinition`: ID, fórmula máximo, tipo de custo, gatilho e regra de recuperação. Slots, pontos, usos e reservas de HP mantêm tipos distintos.

## Estado mutável

`Character.revision`, `rulesetRef`, `classes[{classId,level,subclassId,choices}]`; cada escolha identifica grupo e opção, nível recebido, definição e proveniência. Guardar valores rolados de HP por nível e Dados de Vida gastos por tipo. `ResourceState` referencia definição e mantém `spent`; capacidade e disponibilidade são derivadas; efeitos ativos possuem origem, alvo, início, duração e término. Evitar duplicar classe em módulos de UI.

## Comandos e invariantes

Subir nível, escolher subclasse, adquirir/trocar escolha, usar recurso, encerrar efeito e concluir descanso passam pelo Rules Engine puro. RNG injetável fornece rolagens; sem relógio global ou IndexedDB no domínio. `RuleResult` é discriminado: sucesso inclui `nextState`, `effects`, `explanations` e `sourceRefs`; `needsInput` e `rejected` não fornecem estado aplicável. Repositório salva uma revisão validada. Falha não aplica gasto parcial. Importação valida pack, nível1–20, pré-requisitos, escolhas, recursos não negativos e referências existentes. Resolução de catálogo é explícita; conteúdo desconhecido preservado em recuperação sem ser executado.

## Dados específicos

Guardar escolhas e instâncias temporárias descritas em recursos e subclasses, vinculadas à origem. A capacidade de recurso é derivada da progressão; alterações de tradução não mudam vínculos.
