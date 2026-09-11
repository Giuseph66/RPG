# Ladino — características e recursos

## `rogue.expertise` — Especialização (nível 1)

Escolher2 perícias proficientes OU1 e ferramentas ladrão; nv6 mais2 proficiências elegíveis. Dobrar BP, nunca cumulativamente.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.sneak-attack` — Ataque Furtivo (nível 1)

Uma vez por turno: arma acuidade/distância; vantagem OU outro inimigo do alvo não incapacitado a1,5m e sem desvantagem. Dano ceil(nível/2)d6. Turnos alheios podem gerar novo uso; rodada não equivale turno.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.thieves-cant` — Gíria de Ladrão (nível 1)

Mensagens veladas demoram4× fala comum; sinais secretos. Proficiência narrativa separada de idioma comum.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.cunning-action` — Ação Ardilosa (nível 2)

Bônus somente Disparada, Desengajar, Esconder; expansões pela subclasse.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.uncanny-dodge` — Esquiva Sobrenatural (nível 5)

Reação ao acerto de atacante visível; metade dano daquele ataque. Não toda fonte de dano.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.evasion` — Evasão (nível 7)

Efeito resistência DEX para metade dano: sucesso0; falha metade.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.reliable-talent` — Talento Confiável (nível 11)

Teste habilidade que adiciona BP: d20≤9 tratado10; não transforma ataque/resistência.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.blindsense` — Sentido Cego (nível 14)

Ouvindo, localiza escondidos/invisíveis a3m; não equivale automaticamente enxergar.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.slippery-mind` — Mente Escorregadia (nível 15)

Adquire proficiência resistência SAB.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.elusive` — Elusivo (nível 18)

Sem vantagem em ataques contra si enquanto não incapacitado.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 91, PDF 90 (numeração iniciada em 1).

## `rogue.stroke-of-luck` — Golpe de Sorte (nível 20)

Ataque falho dentro alcance vira acerto; alternativa trata dado de teste falho como20 natural. Fonte diz teste qualquer: ambiguidade sobre resistência registrada.

Recuperação: 1/curto ou longo.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 92, PDF 91 (numeração iniciada em 1).

## Contrato operacional

Definições contêm elegibilidade, custos e política de recuperação; estado contém `spent`, duração, alvo e marco temporal; capacidade e disponibilidade são derivadas. A ação valida versão do personagem, disponibilidade, economia de ações e escolhas, produz `RuleResult` com `nextState`, `effects`, `explanations`, `sourceRefs`. Persistência pertence à aplicação, após sucesso. Cancelar seleção não consome; recálculo não recarrega. Recuperação curta/l longa é evento do jogo, nunca temporizador de navegador.
