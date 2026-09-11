# 10 — Rules Engine

## Responsabilidade

Transformar estado e contexto explícitos em resultado determinístico, explicável e testável. Não persistir, renderizar, buscar dados ou determinar decisões do mestre. Regra específica pode substituir regra geral apenas com referência identificada; duas fórmulas alternativas de CA não se somam. Livro do Jogador, Introdução, p. 7/PDF 6; cap. 1, p. 14/PDF 13.

## Contratos

`deriveCharacter(character, rulePack, context) → CharacterDerived` calcula visão atual sem mutação. `resolve(command, character, rulePack, context, diceResults) → RuleResult` resolve operação; consumo de aleatoriedade ocorre no Dice Engine antes da resolução, com resultados vinculados ao comando.

`RuleResult` tem união discriminada: `success {nextState, effects, explanations, sourceRefs}`, `needsInput {requests, preview, sourceRefs}` ou `rejected {errors, sourceRefs}`. `needsInput` e `rejected` não contêm estado aplicável. Pedidos de entrada têm ID, motivo, opções válidas e pendência quando houver. [Schemas](dados/schemas.md).

`Command` inclui `commandId`, `characterId`, `expectedRevision`, `kind` e payload validado. Tipos iniciais: aplicar dano/cura/PV temporário, consumir recurso, resolver ataque, conjurar, encerrar concentração, resolver resistência/morte, descansar, equipar, atualizar escolhas e subir nível. ID repetido recupera resultado persistido, sem repetir efeito.

## Ordem de avaliação

1. Verificar schema, pack e integridade das referências.
2. Resolver atributos e nível total; obter modificadores e proficiência.
3. Reunir concessões de raça, classe, subclasse, antecedente e opções habilitadas.
4. Aplicar equipamentos ativos e restrições; resolver fórmulas alternativas.
5. Aplicar condições/efeitos com origem, duração e regra de combinação.
6. Derivar recursos, defesas, ataques e fontes de conjuração.
7. Validar comando e contexto; solicitar dados ausentes.
8. Calcular consequências sobre cópia, verificar invariantes e produzir explicação.

Não criar um “somador universal”: aumento de atributo, fórmula base, bônus, mínimo, resistência e vantagem têm operadores distintos. Cada operador carrega `sourceRef`, alvo, condição e política de combinação. Ciclo de dependência em definição invalida pack.

## Fórmulas essenciais

| Saída | Entradas e cálculo | Exceções / fonte |
| --- | --- | --- |
| AbilityModifier | `floor((score-10)/2)` | Cap. 1 p. 13/PDF 12; cap. 7 p. 175/PDF 174 |
| ProficiencyBonus | Tabela nível total 1–20; equivalente `2+floor((level-1)/4)` | Multiclasse usa total; cap. 1 p. 15/PDF 14; cap. 6 p. 165/PDF 164 |
| SkillModifier | Modificador da habilidade selecionada + aplicação de proficiência + bônus elegíveis | Proficiência não duplica; expertise aplica multiplicador; habilidade alternativa exige contexto do mestre. Cap. 7 pp. 175–178/PDF 174–177 |
| SavingThrowModifier | Modificador + proficiência se concedida + efeitos | Não conceder novas resistências só por multiclasse; cap. 7 p. 181/PDF 180 e cap. 6 |
| Initiative | Teste de Destreza com modificadores próprios | Desempate e surpresa explícitos; cap. 9 p. 191/PDF 190 |
| ArmorClass | Escolher fórmula elegível: sem armadura `10+DEX`, armadura conforme tabela, defesa alternativa de classe | Escudo e bônus só quando compatíveis; cap. 1 p. 14/PDF 13; cap. 5 pp. 146–148/PDF 145–147 |
| PassivePerception | `10 + modificador de Percepção`; +5 vantagem, −5 desvantagem após cancelamento | Cap. 7 p. 177/PDF 176 |
| SpellSaveDC | `8+proficiência+modificador da fonte de conjuração+bônus específico` | Não assumir um atributo para todas as fontes; cap. 10 p. 207/PDF 206 |
| SpellAttackModifier | `proficiência+modificador da fonte+bônus específico` | Cap. 10 p. 207/PDF 206 |
| MaxHP | Dado máximo do primeiro nível + ganhos registrados dos seguintes + contribuição de CON por nível + traços | Primeiro nível de nova classe não ganha dado máximo; ganhos mínimos/exceções conforme classe. Cap. 1 pp. 12,15/PDF 11,14; cap. 6 p. 165/PDF 164 |

Detalhes e testes das fórmulas: [atributos](personagem/atributos.md), [perícias](personagem/pericias.md), [progressão](personagem/progressao.md), [armaduras](equipamento/armaduras.md), [combate](regras/combate.md).

## Contexto e exceções

Vantagem e desvantagem são conjuntos de causas; presença de ambas resulta normal, sem contar predominância. Natural 20/1 não gera sucesso/falha universal em perícias. Resultado de dados é separado de acerto/crítico. Resistência e vulnerabilidade aplicam-se ao tipo de dano; preservar cada parcela e a sequência de aplicação. [Testes](regras/testes.md), [dano](regras/dano-e-cura.md).

Transformação mantém estado original, estado da forma e recursos associados; nunca sobrescrever irreversivelmente atributos de base. Concentração e HP da forma têm identidade independente. Recursos recuperam segundo trigger de definição; “descanso” não é botão que zera todos os gastos indiscriminadamente.

## Aceite do motor

Mesmo estado, pack, contexto e dados → mesmo resultado. Rejeição não altera nada. Toda parcela derivada possui origem consultável. Uma condição removida deixa de contribuir sem apagar outras aplicações. Pack incompatível não resulta em valores padrão silenciosos. Casos ambíguos retornam pendência, não uma regra inventada.
