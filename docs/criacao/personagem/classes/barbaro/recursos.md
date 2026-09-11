# Bárbaro — características e recursos

## `barbarian.rage` — Fúria (nível 1)

Ação bônus; 1 minuto. Sem armadura pesada: vantagem testes/resistências Força; bônus dano apenas arma corpo a corpo usando Força; resistência concussão/cortante/perfurante. Proíbe conjuração e concentração. Termina por inconsciência, saída voluntária (bônus) ou ausência de ataque hostil e de dano recebido desde turno anterior; no nível15 remove última causa.

Recuperação: Usos: níveis1–2=2;3–5=3;6–11=4;12–16=5;17–19=6;20=ilimitados. Descanso longo.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 48, PDF 47 (numeração iniciada em 1).

## `barbarian.unarmored-defense` — Defesa sem Armadura (nível 1)

CA=10+modDEX+modCON; aceita escudo. Fórmula alternativa, não bônus somável.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 48, PDF 47 (numeração iniciada em 1).

## `barbarian.reckless-attack` — Ataque Descuidado (nível 2)

Decidir no primeiro ataque do turno; vantagem nos ataques corpo a corpo com armas usando Força no turno; atacantes recebem vantagem até início do próximo turno.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 48, PDF 47 (numeração iniciada em 1).

## `barbarian.danger-sense` — Sentido de Perigo (nível 2)

Vantagem resistência Destreza contra efeitos visíveis; não funciona cego, surdo ou incapacitado.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 48, PDF 47 (numeração iniciada em 1).

## `barbarian.extra-attack` — Ataque Extra / Movimento Rápido (nível 5)

2 ataques na ação Atacar; +3 m deslocamento sem armadura pesada.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 49, PDF 48 (numeração iniciada em 1).

## `barbarian.feral-instinct` — Instinto Selvagem (nível 7)

Vantagem iniciativa; surpreendido e não incapacitado pode agir primeiro turno se iniciar Fúria antes de qualquer outra ação.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 49, PDF 48 (numeração iniciada em 1).

## `barbarian.brutal-critical` — Crítico Brutal (nível 9)

Acrescenta 1/2/3 dados de dano da arma corpo a corpo nos níveis9/13/17; não duplica esse acréscimo novamente.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 49, PDF 48 (numeração iniciada em 1).

## `barbarian.relentless-rage` — Fúria Implacável (nível 11)

Em Fúria, cair a 0 sem morrer permite resistência CON CD10: sucesso fica1 HP; cada utilização subsequente CD+5.

Recuperação: CD volta10 em descanso curto/longo.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 49, PDF 48 (numeração iniciada em 1).

## `barbarian.indomitable-might` — Força Indomável (nível 18)

Se total de teste Força inferior ao valor Força, pode usar o valor. Não altera ataques/resistências.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 49, PDF 48 (numeração iniciada em 1).

## `barbarian.primal-champion` — Campeão Primitivo (nível 20)

Força e Constituição +4; máximos24. Recalcular HP de todos níveis pela alteração CON.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 49, PDF 48 (numeração iniciada em 1).

## Contrato operacional

Definições contêm elegibilidade, custos e política de recuperação; estado contém `spent`, duração, alvo e marco temporal; capacidade e disponibilidade são derivadas. A ação valida versão do personagem, disponibilidade, economia de ações e escolhas, produz `RuleResult` com `nextState`, `effects`, `explanations`, `sourceRefs`. Persistência pertence à aplicação, após sucesso. Cancelar seleção não consome; recálculo não recarrega. Recuperação curta/l longa é evento do jogo, nunca temporizador de navegador.
