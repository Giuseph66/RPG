# Paladino — características e recursos

## `paladin.divine-sense` — Sentido Divino (nível 1)

Ação; até fim próximo turno detecta tipo/localização celestiais, corruptores, mortos-vivos18m sem cobertura total e locais/objetos consagrados; não identidade.

Recuperação: 1+modCHA usos/longo; fonte não explicita piso; impedir capacidade negativa e registrar.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 110, PDF 109 (numeração iniciada em 1).

## `paladin.lay-on-hands` — Cura pelas Mãos (nível 1)

Ação toque; distribuir até5×nível HP ou5pontos por doença/veneno; sem efeito constructos/mortos-vivos.

Recuperação: Pool5×nível, longo.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 110, PDF 109 (numeração iniciada em 1).

## `paladin.divine-smite` — Destruição Divina (nível 2)

Acerto corpo a corpo com arma; gastar slot qualquer classe: min(5,nívelSlot+1)d8 radiante, +1d8 corruptor/morto-vivo; decisão após acerto. Não conjuração nem bônus.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 111, PDF 110 (numeração iniciada em 1).

## `paladin.fighting-style` — Estilo de Luta (nível 2)

Escolher Armas Grandes, Defesa, Duelismo ou Proteção; não repetir.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 110, PDF 109 (numeração iniciada em 1).

## `paladin.divine-health` — Saúde Divina / Canalizar (nível 3)

Imune doenças; juramento dá opções de Canalizar compartilhando1 uso curto/longo.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 111, PDF 110 (numeração iniciada em 1).

## `paladin.extra-attack` — Ataque Extra (nível 5)

2 ataques na ação Atacar; não soma outras classes.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 111, PDF 110 (numeração iniciada em 1).

## `paladin.aura-of-protection` — Aura de Proteção (nível 6)

Consciente: você e aliados3m recebem max(1,modCHA) em resistências; nv18 alcance9m.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 111, PDF 110 (numeração iniciada em 1).

## `paladin.aura-of-courage` — Aura da Coragem (nível 10)

Consciente: você e aliados3m não podem ser amedrontados; nv18 9m.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 111, PDF 110 (numeração iniciada em 1).

## `paladin.improved-divine-smite` — Destruição Divina Aprimorada (nível 11)

+1d8 radiante nos ataques corpo a corpo conforme redação fonte; acumula Destruição Divina; não consome slot por si. Aplicabilidade a ataque sem arma deve ter adjudicação textual.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 111, PDF 110 (numeração iniciada em 1).

## `paladin.cleansing-touch` — Toque Purificador (nível 14)

Ação encerra1 magia em si ou criatura voluntária tocada.

Recuperação: max(1,modCHA) usos/longo.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 111, PDF 110 (numeração iniciada em 1).

## Contrato operacional

Definições contêm elegibilidade, custos e política de recuperação; estado contém `spent`, duração, alvo e marco temporal; capacidade e disponibilidade são derivadas. A ação valida versão do personagem, disponibilidade, economia de ações e escolhas, produz `RuleResult` com `nextState`, `effects`, `explanations`, `sourceRefs`. Persistência pertence à aplicação, após sucesso. Cancelar seleção não consome; recálculo não recarrega. Recuperação curta/l longa é evento do jogo, nunca temporizador de navegador.
