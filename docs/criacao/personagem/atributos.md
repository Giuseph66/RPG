# Atributos

Fonte: **Livro do Jogador fornecido**, capítulo1,p12–15/PDF11–14; capítulo7,p175–181/PDF174–180. Valores são dados de personagem; fórmula e limites são regras estáticas.

## Campos e cálculo

| ID | Nome | Uso central |
|---|---|---|
| strength |Força|Ataque corpo a corpo, Atletismo, carga/salto|
| dexterity |Destreza|Iniciativa, armas à distância/acuidade, CA elegível|
| constitution |Constituição|PV e resistências, concentração e vigor|
| intelligence |Inteligência|Conhecimento e conjuração de mago|
| wisdom |Sabedoria|Percepção/intuição e conjuração de classes que a usam|
| charisma |Carisma|Interação e conjuração de classes que a usam|

`modifier=floor((score−10)/2)`:1→−5;8/9→−1;10/11→0;16/17→+3;20/21→+5;30→+10. Subtrair antes de dividir e arredondar para baixo, inclusive negativos.

## Origem e limites

Guardar valores-base e escolhas de criação, incrementos raciais, incrementos por classe/talento e efeitos como fontes separadas; total é derivado. Criação: método rolado4d6 descarta menor em cada conjunto, seis conjuntos; matriz15,14,13,12,10,8; compra opcional27 pontos com valores8–15. Custos8→0,9→1,10→2,11→3,12→4,13→5,14→7,15→9. Incrementos raciais aplicados após valores iniciais.

Limite usual de personagem20; exceção expressa, como característica que eleva limite, deve indicar fonte. Não bloquear toda importação com valor acima20: entidades podem ter valores até30 e exceções existem. Valor fora do domínio validado exige erro/efeito explícito, não truncamento silencioso.

## Constituição e derivados

Mudança de modificador CON altera máximo PV em `deltaMod×nível total`, retroativamente (cap7,p179). Manter ganho de PV por nível para refazer cálculo. Texto p15 sobre “modificador par” é inconsistente; tabela de modificadores e regra específica de CON controlam cálculo.

Carga máxima de criatura Pequena/Média=`7,5×FOR kg`; puxar/arrastar/erguer=`15×FOR kg`; mover arrastando acima da carga máxima reduz deslocamento a1,5 m. Grande dobra, Enorme quadruplica, Imenso octuplica; Miúdo metade. Variante sobrecarga em [inventário](../equipamento/inventario.md).

## Interface, validação e testes futuros

Ficha exibe valor e modificador, detalhe das origens e ações de teste/resistência. Criação mostra pontos restantes/método sem alterar regra. Ajuste durante campanha exige origem, prévia dos derivados afetados e confirmação atômica; não mutar PV atuais como efeito colateral não autorizado.

Testar9→−1;compra15,15,15,8,8,8→27 pontos;valor16 antes de raça inválido em compra. CON17→18 em nível5 muda+3→+4 e máximo+5. Raça trocada remove só seus incrementos. [Testes](../regras/testes.md), [progressão](progressao.md).
