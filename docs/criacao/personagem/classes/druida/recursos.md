# Druida — características e recursos

## `druid.druidic` — Druídico (nível 1)

Idioma secreto; conhecedores veem mensagens automaticamente; demais Percepção CD15 percebe presença, sem decifrar.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 73, PDF 72 (numeração iniciada em 1).

## `druid.wild-shape` — Forma Selvagem (nível 2)

Ação, besta vista, ND/restrições por nível; duração piso(nível/2) horas; retorno bônus ou automático por inconsciência/0HP/morte. Estado da forma separado. Ver regras especiais.

Recuperação: 2 usos; curto/longo; nv20 ilimitado.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 73, PDF 72 (numeração iniciada em 1).

## `druid.timeless-body` — Corpo Atemporal (nível 18)

Envelhece1 ano a cada10 decorridos; sem recalcular arbitrariamente atributos.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 74, PDF 73 (numeração iniciada em 1).

## `druid.beast-spells` — Magias da Besta (nível 18)

Permite componentes V/S de magias druida na Forma Selvagem; materiais continuam indisponíveis.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 74, PDF 73 (numeração iniciada em 1).

## `druid.archdruid` — Arquidruida (nível 20)

Forma Selvagem ilimitada; ignora V/S e materiais sem custo não consumidos de magias druida, em forma normal ou selvagem. Materiais caros/consumidos continuam exigidos.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 75, PDF 74 (numeração iniciada em 1).

## Contrato operacional

Definições contêm elegibilidade, custos e política de recuperação; estado contém `spent`, duração, alvo e marco temporal; capacidade e disponibilidade são derivadas. A ação valida versão do personagem, disponibilidade, economia de ações e escolhas, produz `RuleResult` com `nextState`, `effects`, `explanations`, `sourceRefs`. Persistência pertence à aplicação, após sucesso. Cancelar seleção não consome; recálculo não recarrega. Recuperação curta/l longa é evento do jogo, nunca temporizador de navegador.
