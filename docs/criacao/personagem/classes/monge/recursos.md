# Monge — características e recursos

## `monk.unarmored-defense` — Defesa sem Armadura (nível 1)

CA10+modDEX+modSAB, sem armadura/escudo. Não soma Defesa sem Armadura bárbaro.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 104, PDF 103 (numeração iniciada em 1).

## `monk.martial-arts` — Artes Marciais (nível 1)

Desarmado ou arma monge, sem armadura/escudo: pode usar DEX ataque/dano; dado d4,nv5 d6,nv11 d8,nv17 d10; após Atacar com arma monge/desarmado,1 desarmado bônus. Armas monge: simples corpo a corpo sem pesada/duas mãos e espadas curtas.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 104, PDF 103 (numeração iniciada em 1).

## `monk.ki` — Chi (nível 2)

Pontos=nível.1 ponto: Rajada2 desarmados bônus imediatamente após Atacar; Defesa Paciente Esquivar bônus; Passo Vento Disparada/Desengajar bônus e salto dobrado. CD8+BP+SAB.

Recuperação: Todos curto/longo com≥30min meditação.

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 104, PDF 103 (numeração iniciada em 1).

## `monk.unarmored-movement` — Movimento sem Armadura (nível 2)

Bônus sem armadura/escudo:3m nv2;4,5 nv6;6 nv10;7,5 nv14;9 nv18. Nv9 paredes/líquidos durante movimento do turno.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 104, PDF 103 (numeração iniciada em 1).

## `monk.deflect-missiles` — Defletir Projéteis (nível 3)

Reação reduz ataque arma distância1d10+DEX+nível. Se dano0 e mão livre/capacidade segurar, captura;1chi permite devolver na mesma reação, proficiente, arma monge,6/18m.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 104, PDF 103 (numeração iniciada em 1).

## `monk.slow-fall` — Queda Lenta (nível 4)

Reação reduz dano queda5×nível.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 104, PDF 103 (numeração iniciada em 1).

## `monk.stunning-strike` — Ataque Extra / Atordoante (nível 5)

2 ataques na ação Atacar. Ao acertar ataque corpo a corpo com arma:1chi, CON vs CDchi; falha atordoado até fim próximo turno.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 105, PDF 104 (numeração iniciada em 1).

## `monk.ki-empowered-strikes` — Golpes de Chi (nível 6)

Desarmados mágicos para superar resistência/imunidade.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 105, PDF 104 (numeração iniciada em 1).

## `monk.evasion` — Evasão / Mente Tranquila (nível 7)

DEX para metade: sucesso0/falha metade. Ação pode encerrar efeito encanto/medo em si, se puder agir.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 105, PDF 104 (numeração iniciada em 1).

## `monk.purity-of-body` — Pureza Corporal (nível 10)

Imune doenças/venenos.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 105, PDF 104 (numeração iniciada em 1).

## `monk.tongue-of-sun-and-moon` — Idiomas do Sol e da Lua (nível 13)

Entende idiomas falados; criatura que entende um idioma entende sua fala; não concede leitura universal.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 105, PDF 104 (numeração iniciada em 1).

## `monk.diamond-soul` — Alma de Diamante (nível 14)

Proficiência todos testes resistência;1chi para repetir falha usando segundo resultado.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 105, PDF 104 (numeração iniciada em 1).

## `monk.timeless-body` — Corpo Atemporal (nível 15)

Sem efeitos velhice/envelhecimento mágico; ainda morre de velhice; sem necessidade comida/água.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 105, PDF 104 (numeração iniciada em 1).

## `monk.empty-body` — Corpo Vazio (nível 18)

Ação4chi: invisível1min e resistência todos danos exceto energia.8chi: projeção astral só si, sem materiais.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 105, PDF 104 (numeração iniciada em 1).

## `monk.perfect-self` — Auto Aperfeiçoamento (nível 20)

Iniciativa com0chi recupera4; com1 não muda.

Recuperação: Não consome recurso

Livro do Jogador fornecido, cap. 3 — Classes, p. impressa 105, PDF 104 (numeração iniciada em 1).

## Contrato operacional

Definições contêm elegibilidade, custos e política de recuperação; estado contém `spent`, duração, alvo e marco temporal; capacidade e disponibilidade são derivadas. A ação valida versão do personagem, disponibilidade, economia de ações e escolhas, produz `RuleResult` com `nextState`, `effects`, `explanations`, `sourceRefs`. Persistência pertence à aplicação, após sucesso. Cancelar seleção não consome; recálculo não recarrega. Recuperação curta/l longa é evento do jogo, nunca temporizador de navegador.
