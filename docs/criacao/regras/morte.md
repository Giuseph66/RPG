# Zero PV, estabilidade e morte

Fonte: **Livro do Jogador fornecido**, capítulo9,p199–200/PDF198–199; asfixia cap8,p185/PDF184; Resistência Implacável cap2,p41/PDF40.

## Estado e prioridades

Representar `alive`,`dying`,`stable`,`dead`, PV atuais, sucessos/falhas(0–3), origem da inconsciência e condições. Morte não é somente PV0: um personagem estável pode estar vivo com0. Manter causa da morte para histórico; cura comum não remove estado morto.

Aplicar dano final após absorção temporária. Se começa com PV positivo, `excedente=max(0,danoAosPV−PVantes)`; se chega0 e excedente≥máximo, morte instantânea. Se não é morte instantânea, avaliar substituições explícitas elegíveis (ex.: meio-orc1 PV) antes de impor queda. Sem substituição,0 PV → inconsciente/morrendo. Máximo considerado é o efetivo no evento.

Nocaute: atacante pode escolher ao reduzir a0 com ataque **corpo a corpo**; alvo fica inconsciente e estável. Não permitir automaticamente em ataque à distância. Interação de nocaute com morte maciça não é desenvolvida pela fonte atual: exigir decisão de mesa quando ambas parecem aplicáveis, em vez de ocultar conflito de prioridade.

## Teste contra morte

No começo do turno, se0 PV, vivo e não estável, rolar d20. Não usa habilidade nem PB por padrão. Bônus que expressamente afetam testes de resistência podem ser aplicáveis; usar contexto do efeito.

| Dado natural | Resultado |
|---|---|
|1|2 falhas|
|2–9|1 falha, salvo modificadores que alterem sucesso contra10|
|10–19|1 sucesso, salvo modificadores pertinentes|
|20|Recupera1 PV; encerra estado morrendo e zera contadores|

Sucesso comum exige total≥10. Terceiro sucesso estabiliza; terceira falha mata. Contagens não precisam ser consecutivas. Ao estabilizar ou recuperar quaisquer PV, zerar **ambos** contadores. Valores naturais especiais são avaliados pelo dado, não pelo total modificado.

## Dano em0 e estabilização

Dano recebido enquanto0 PV produz1 falha; crítico produz2. Dano≥máximo causa morte instantânea. Criatura estável atingida deixa de estar estável; contadores recomeçam a partir do dano. Não usar redução dos PV como único detector de dano, pois0 não pode baixar mais.

Ação primeiros socorros: SAB(Medicina) CD10 para estabilizar inconsciente. Kit de primeiros-socorros gasta1 dos10 usos e ação, dispensando teste. Curandeiro é exceção de cura do talento. Sem cura, estável recupera1 PV após1d4 horas; tempo avança na campanha, não em segundo plano. Asfixia impede cura/estabilização até respirar.

Criaturas do Mestre normalmente morrem em0; personagens especiais podem usar regras de PJ por decisão do Mestre. Não impor morte automática ao personagem do usuário por tipo genérico de entidade.

## Fluxo e interface

Em0 PV, destacar status textual e contadores; oferecer rolar teste, registrar resultado externo, aplicar cura, estabilizar e ver causa/efeitos. Morte instantânea deve explicar dano, PV anterior e máximo. Correção de erro usa comando explícito registrado, não clique que altera sozinho três caixas.

## Testes futuros

PV6/máx12,dano18→morte;dano17→morrendo.2 falhas+d20 natural1→morte.2 sucessos+sucesso→estável com0/0 contadores.20 natural→1 PV. Estável com0 recebe crítico→morrendo com2 falhas. PV0+temp5 não estabiliza. Meio-orc com recurso e queda não letal→1 PV; morte maciça não permite recurso. Repetir confirmação da mesma rolagem não duplica falha.
