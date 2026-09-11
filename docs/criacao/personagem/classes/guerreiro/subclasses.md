# Guerreiro — 3 arquétipos

Fonte: Livro do Jogador fornecido, cap.3, pp.85–88/PDF84–87. Escolha nível3; marcos variam por arquétipo.

## `champion` — Campeão

- Nível3, Crítico Aprimorado: ataque com arma crítico em19–20 natural.
- Nível7, Atleta Extraordinário: metade PB, arredondada para cima, em testes FOR/DEX/CON sem PB; salto longo com corrida aumenta distância em metros por FOR conforme fonte. Não transforma resistência em teste de habilidade.
- Nível10, Estilo de Luta Adicional: escolha elegível ainda não possuída.
- Nível15, Crítico Superior: crítico em18–20, substitui intervalo anterior.
- Nível18, Sobrevivente: início do turno, se >0 e ≤metade máximo, recupera `5+CON`; não ultrapassa metade.

## `battle-master` — Mestre de Batalha

- Nível3: quatro dados de superioridade d8, recuperam curto/longo; três manobras; CD=`8+PB+FOR ou DES`; Estudioso da Guerra concede ferramenta de artesão.
- Níveis7/10/15: aprende duas manobras extras em cada marco; pode substituir uma conhecida ao aprender novas. Nível7, Conheça seu Inimigo:1min observando fora de combate revela comparação em duas características escolhidas, sem número exato obrigatório.
- Níveis10/18: dados viram d10/d12. Nível15, Implacável: iniciativa com0 dados recupera1.

Manobras são catálogo tipado com gatilho, alvo, dado, resistência e limite “uma manobra por ataque” quando aplicável. Rolagem de manobra e efeito do ataque persistem na mesma operação; superiority state guarda `spent`.

## `eldritch-knight` — Cavaleiro Místico

- Nível3, Conjuração: INT, tabela de terço, lista de mago com restrições de abjuração/evocação e exceções registradas em [magia](magia.md). Vínculo com Arma: ritual1h, até duas armas; bônus invoca arma ao mesmo plano e impede desarmar salvo incapacitado.
- Nível7, Magia de Guerra: após ação para truque, ataque com arma como bônus.
- Nível10, Ataque Místico: criatura atingida por arma tem desvantagem na próxima resistência contra magia do guerreiro antes do fim do próximo turno.
- Nível15, Investida Arcana: ao usar Surto de Ação, teleporte até9m antes/depois da ação adicional.
- Nível18, Magia de Guerra Aprimorada: após ação para magia, ataque como bônus; substitui/amplia nível7.

## Aceite

Crítico de Campeão não altera teste; Sobrevivente não revive0PV. Mestre recupera só pool correto e manobra não duplica gasto. Cavaleiro mantém slots/known separados e arma vinculada por ID de instância. Ataque Extra base continua único. UI expõe razões, custo e timing; escolha antes do nível3 rejeita.
