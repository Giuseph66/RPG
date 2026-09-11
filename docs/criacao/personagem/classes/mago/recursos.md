# Mago — características e recursos

## `wizard.arcane-recovery` — Recuperação Arcana (nível 1)

Ao terminar curto: recuperar slots gastos de níveis≤5 com soma≤ceil(nível mago/2).

Recuperação: Uma vez por dia; dia de jogo, não relógio do dispositivo.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 97, PDF 96 (numeração iniciada em 1).

## `wizard.spellbook` — Grimório (nível 1)

6 magias1º iniciais; +2 por nível mago. Copiar magia elegível:2h e50po por nível; cópia própria/restaurar preparadas:1h e10po por nível. Truques fora grimório.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 96, PDF 95 (numeração iniciada em 1).

## `wizard.spell-mastery` — Dominar Magia (nível 18)

Selecionar1 magia1º e1 magia2º do grimório; preparadas, conjurar no nível básico sem slots; elevar nível exige slot. Fonte atual não define troca dessas escolhas.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 97, PDF 96 (numeração iniciada em 1).

## `wizard.signature-spells` — Assinatura Mágica (nível 20)

2 magias3º do grimório sempre preparadas fora limite; uso grátis individual3º; elevar exige slot.

Recuperação: Fonte contraditória: uma vez/dia e recuperação curto/longo; automatização bloqueada até decisão.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 97, PDF 96 (numeração iniciada em 1).

## Contrato operacional

Definições contêm elegibilidade, custos e política de recuperação; estado contém `spent`, duração, alvo e marco temporal; capacidade e disponibilidade são derivadas. A ação valida versão do personagem, disponibilidade, economia de ações e escolhas, produz `RuleResult` com `nextState`, `effects`, `explanations`, `sourceRefs`. Persistência pertence à aplicação, após sucesso. Cancelar seleção não consome; recálculo não recarrega. Recuperação curta/l longa é evento do jogo, nunca temporizador de navegador.
