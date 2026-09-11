# Dano, cura e pontos de vida temporários

Fonte: **Livro do Jogador fornecido**, capítulo9,p198–200/PDF197–199; modificador CON cap7,p179/PDF178. [Morte](morte.md) detalha transições em0 PV; [concentração](../magia/concentracao.md) recebe o evento de dano.

## Dados e resolução

Estado: PV atuais, máximo derivado, PV temporários e origem/duração, estabilidade/morte, efeitos ativos. Definição do ataque/magia especifica dados, tipo e modificadores. Entrada separa componentes de dano por tipo/origem, crítico, resultado da resistência e decisões opcionais; não usar string única “−12HP”.

Dano com arma usa mesmo modificador da jogada de ataque, salvo exceção; magia só soma atributo se texto autoriza. Rolagem simultânea contra múltiplos alvos é única, seguida de resolução das defesas de cada alvo. Não rerrolar bola de fogo por vítima.

Tipos estáveis:`acid`,`bludgeoning`,`slashing`,`lightning`,`force`,`fire`,`cold`,`necrotic`,`piercing`,`psychic`,`radiant`,`thunder`,`poison`; rótulos “energia”, “elétrico”, “trovejante” pertencem à localização, não ao ID.

## Crítico

Dobrar a quantidade de **todos os dados de dano do ataque**, depois somar modificadores fixos uma vez. Inclui dados adicionais integrantes do ataque, como Ataque Furtivo. Dano extra do meio-orc acrescenta um dado da arma após o cálculo apropriado. Não multiplicar por2 o resultado da soma nem dobrar dano de efeito separado que não integra ataque.

## Modificadores, resistência e vulnerabilidade

Aplicar modificadores de dano pertinentes antes de resistência/vulnerabilidade; resistência divide por2, arredonda para baixo; vulnerabilidade dobra. Duas resistências aplicáveis ao mesmo componente não dividem por4. Imunidade ao componente resulta0, sem converter em resistência. Não confundir resistência ao dano com proficiência em teste de resistência.

Cada redução exige filtro: tipo, ataque/magia/ambiente, mágico/não mágico e demais propriedades da fonte. Maestria Pesada não reduz todo dano cortante indiscriminadamente. Se componentes mistos tornam ambígua distribuição de uma redução fixa, solicitar adjudicação da mesa e registrar; não subtrair redução completa de cada componente sem fundamento.

## Aplicação aos PV

Dano final primeiro absorve PV temporários; restante reduz PV atuais até0. Conservar dano excedente para morte instantânea, sem salvar PV negativos. Evento de dano deve continuar existindo mesmo quando absorvido por PV temporários, para gatilhos como concentração; dano zero não gera teste por dano.

Passar de PV positivo a0 chama resolver queda, efeitos facultativos e morte; não aplicar inconsciente antes de perguntar recurso racial elegível. Dano sofrido já em0 usa regra de morte. Não confundir “perdeu PV” com “sofreu dano”.

## Cura e máximo

Cura válida: `novoAtual=min(máximo,atual+quantidade)`. Excesso perdido, não vira PV temporário. Morto não recebe cura normal antes de efeito que restaure vida. Proibições de cura, como asfixia, impedem operação. Recuperar PV encerra inconsciência causada por0 PV e zera contadores de morte.

Mudança no modificador CON recalcula máximo retroativamente em todos os níveis. Redução do máximo por efeito é camada separada do máximo permanente; nunca destruir valores de progressão para implementar exaustão. Política de reconciliação de PV atuais ao mudar máximo deve ser contrato explícito do modelo, sem curar silenciosamente por aumento de limite.

## PV temporários

Valores não somam: ao receber nova fonte, usuário escolhe conservar existente ou substituir. Cura comum não repõe PV temporários. Podem exceder máximo. Em0 PV não estabilizam nem recuperam consciência. Duram até consumo, duração específica ou fim de descanso longo quando não há duração. Remover efeito de origem segue texto próprio; não apagar fonte automaticamente sem regra.

## Testes e aceite futuro

Dano25,redução5,resistência →10. Dano13/resistência duplicada →6. PV10,temp5,dano7→PV8,temp0. PV14/20,cura8→20. Temp10+nova fonte12→escolha10 ou12, nunca22. Crítico adaga1d4+3→2d4+3. Mudança CON+1 em nível7→máximo+7. Estado e explicações de dano, concentração e queda precisam ser confirmados na mesma sequência determinística, sem IO no motor.
