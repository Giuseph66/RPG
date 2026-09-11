# Criação de personagem

Fonte central: Livro do Jogador, cap.1 pp.11–15/PDF10–14; raça cap.2, classe cap.3, antecedente cap.4, equipamento cap.5, opcionais cap.6. Wizard reorganiza etapas para UX, sem alterar dependências da regra.

## Antes de começar

Selecionar ruleset exato e campanha opcional. Mostrar nível inicial1 e políticas de atributos/opcionais. Criação em nível superior reutiliza avanços após ficha válida de nível1. `CharacterDraft` tem id/schemaVersion/rulesetRef/currentStep/answers/validationIssues/updatedAt; campos incompletos permitidos, mas nunca expostos como Character válido.

## Etapas e contratos

| # / etapa | Entrada e dependências | Regra / cálculo | Saída, erros e vazio |
| --- | --- | --- | --- |
| 1 Identidade | Nome, jogador opcional, conceito; pack válido | Nome obrigatório ao concluir; strings texto simples | Draft com identidade. Vazio oferece campo, sem nome fictício salvo |
| 2 Raça | Catálogo do pack | Selecionar uma raça; ganhos raciais são concessões, não editar baseScores | raceRef + ChoiceDefinitions; pack ausente bloqueia, catálogo vazio mostra erro de dados |
| 3 Sub-raça | Raça escolhida | Obrigatória quando definição exige; subraça pertence à raça | subraceRef ou ausência legítima. Mudança de raça invalida seleção antiga com prévia |
| 4 Classe | Catálogo; nível1 | Uma classe inicial, DV/proficiências/resistências, escolhas do nível1 | classId/level/choices. Subclasse no nível1 se exigida; opções futuras não concedidas cedo |
| 5 Atributos | Método da campanha e concessões raciais | Array15/14/13/12/10/8; ou seis grupos4d6 descartando menor; compra27 opcional, valores8–15 antes raça | baseScores + evidência/rolagens; aplicar bônus uma vez; faltas/duplicatas e orçamento inválido impedem avanço |
| 6 Antecedente | Catálogo e personalidade | Benefícios e perícias da definição; customização conforme cap.4, não homebrew silencioso | backgroundRef/variant/choices; detalhes de personalidade podem ficar para etapa11 |
| 7 Proficiências | Raça+classe+antecedente | Reunir armas/armaduras/ferramentas/idiomas; resolver escolhas e substituições permitidas | Proveniência por concessão; duplicata só substitui quando a fonte permite; nenhuma proficiência em dobro |
| 8 Perícias | Choices de classe/raça/antecedente e atributos | Escolher quantidade e lista permitidas; calcular modificador e aplicação de proficiência | Conjunto + fontes; seleção fora da lista ou escolha pendente bloqueia; sem escolhas extras mostra resumo |
| 9 Equipamentos | Classe/antecedente e método | Escolher conjuntos ou riqueza inicial conforme fonte, sem receber ambos; gerar instâncias e moedas | Inventário/itens ativos; calcular CA/carga; validar opções exclusivas, quantidade e saldo |
| 10 Magias | Fonte de conjuração da raça/classe/subclasse | Conhecidas/preparadas/grimório separados; limites e atributo da fonte; slots pela tabela | CastingSourceState e pools. Sem conjuração: etapa concluída com explicação. Magia ilegível/pendência não auto-selecionada |
| 11 Detalhes | Identidade, antecedente; fichaPDF2 | Aparência, idade, altura/peso narrativo, tendência, traços, ideais, vínculos, defeitos, história, aliados e retrato opcional | Texto simples e asset validado; ausência de retrato usa iniciais, não erro |
| 12 Revisão | Todas etapas | Recalcular atributos, PV máximo, proficiência, CA, ataques e magia; todas escolhas obrigatórias válidas | Preview com fontes/avisos. Confirmar grava único Character; falha mantém draft; sucesso seleciona personagem |

## Atributos, valores e fórmulas

Livro p.13/PDF12: array padrão 15,14,13,12,10,8; aleatório4d6 mantém três maiores, repetido seis vezes; compra opcional27 pontos. Custos 8→0,9→1,10→2,11→3,12→4,13→5,14→7,15→9. UI mostra custo antes dos bônus raciais. Modificador=`floor((valor−10)/2)`; 16→+3,9→−1. A rolagem de atributos não usa vantagem e não permite re-rolagem ilimitada escondida; novo conjunto exige intenção registrada.

Nível1 usa DV máximo da classe + CON e traços aplicáveis; registrar origem. Armadura/escudo usam cap.5, nunca copiar CA do exemplo Bruenor que conflita com tabela. [PEND-002](../decisoes/PENDENCIAS.md). Proficiência inicial+2 pela tabela p.15/PDF14. Campos derivados mostram decomposição, não input numérico livre.

## Dependências e retorno

Ao voltar e alterar escolha estrutural, mostrar quais respostas dependentes perderão validade; preservar respostas ainda elegíveis. Não apagar notas, retrato ou nome por mudar classe. Item de equipamento inicial só é criado na finalização, evitando duplicação por navegar para trás. Reabrir draft retoma etapa e valida contra pack fixado.

Escolhas não disponíveis por fase (talento/humano variante/multiclasse) aparecem como planejadas ou indisponíveis, sem produzir personagem inválido. Ambiguidade de fonte bloqueia somente opção afetada e referencia PEND; usuário pode escolher opção resolvida.

## Mobile, desktop e acessibilidade

Mobile uma etapa por vez, resumo expansível, ações anterior/continuar no fluxo sem cobrir teclado. Desktop lista de etapas e preview lateral; mesmo estado/validador. Foco no título após trocar etapa; erros associados aos campos e resumo navegável. Não impedir salvar draft porque campos obrigatórios estão vazios.

## Critérios de aceite

Criar uma ficha válida para cada classe e raça com escolhas legítimas; recarregar draft sem perder respostas; trocar raça remove apenas concessões incompatíveis após revisão; equipamento não duplica; iniciar sem magia não bloqueia; duplo clique na conclusão cria um único personagem. Casos completos por classe, especialmente [Druida](classes/druida/README.md).
