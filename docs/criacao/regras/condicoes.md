# Condições e exaustão

Fonte de todo catálogo: **Livro do Jogador fornecido**, apêndiceA,p291–293/PDF290–292. Incapacidade de agir também impede ação bônus (cap9,p191/PDF190) e encerra concentração conforme cap10. **14 condições ordinárias e exaustão especial**, total15 entradas.

## Contrato e duração

`ConditionDefinition` guarda ID, predicados/efeitos e fonte. `ConditionInstance` guarda ID de instância, `definitionRef`, origem/causador, início, duração, término e alvo. Duas fontes da mesma condição têm durações próprias: efeitos não se intensificam pela duplicidade; remover uma instância não remove a outra. Efeitos derivados (ex.: incapacitado por inconsciente) não viram cópias persistentes independentes sem origem.

Duração pode ser até evento, rodadas/minutos ou indefinida; a definição da condição sozinha não determina CD nem teste de remoção. Atualização temporal usa eventos da campanha. Imunidade impede aplicação do tipo coberto e explica rejeição, sem apagar efeito diferente.

## Catálogo ordinário

| ID | Condição | Mecânica completa resumida | Fonte impressa/PDF |
|---|---|---|---|
| grappled | Agarrado | Deslocamento0, não recebe bônus de deslocamento; termina se agarrador incapacitado ou alvo removido do alcance do agarrador/efeito. Não causa desvantagem de ataque por si só. |291/290|
| frightened | Amedrontado | Desvantagem testes de habilidade/ataques enquanto fonte do medo na linha de visão; não pode mover voluntariamente para posição que termine turno mais próxima da fonte do que a inicial (redação desta compilação). |291/290|
| stunned | Atordoado | Incapacitado; não move, fala hesitantemente; falha resistências FOR/DES; ataques recebidos com vantagem. |291/290|
| prone | Caído | Movimento apenas rastejando até levantar; ataques próprios com desvantagem; ataques recebidos com vantagem se atacante≤1,5 m, com desvantagem caso contrário. |291/290|
| blinded | Cego | Falha testes de habilidade que exijam visão; ataques recebidos com vantagem e próprios com desvantagem. |291/290|
| charmed | Enfeitiçado | Não ataca causador nem o escolhe como alvo de habilidade/efeito mágico nocivo; causador tem vantagem em testes sociais com alvo. Não controla decisões gerais do alvo. |292/291|
| poisoned | Envenenado | Desvantagem ataques e testes de habilidade. Não implica dano de veneno recorrente nem desvantagem em resistências. |292/291|
| restrained | Impedido | Deslocamento0 e sem bônus; ataques recebidos com vantagem, próprios com desvantagem; resistência DES com desvantagem. |292/291|
| incapacitated | Incapacitado | Não pode ações nem reações; por regra de ação bônus, também não pode bônus. A condição isolada não declara velocidade0. |292/291|
| unconscious | Inconsciente | Incapacitado, não move/fala nem percebe entorno; solta o que segura, fica caído; falha resistências FOR/DES; ataques recebidos com vantagem; acerto recebido de atacante≤1,5 m é crítico. |292/291|
| invisible | Invisível | Não pode ser visto sem magia/sentido especial; obscurecimento denso para esconder-se; ruídos/rastros ainda denunciam localização; ataques recebidos com desvantagem, próprios com vantagem. |293/292|
| paralyzed | Paralisado | Incapacitado, não move/fala; falha resistências FOR/DES; ataques recebidos com vantagem; acerto de atacante≤1,5 m é crítico. |293/292|
| petrified | Petrificado | Corpo e itens não mágicos vestindo/carregando viram substância sólida; peso×10, sem envelhecer; incapacitado, não move/fala/percebe; vantagem ataques recebidos; falha resistências FOR/DES; resistência a todo dano; imunidade veneno/doença, efeitos preexistentes suspensos e não curados. |293/292|
| deafened | Surdo | Falha testes de habilidade que exijam audição; não desvantagem genérica em todo teste. |293/292|

Invisibilidade+sentido que detecta alvo: a fonte enumera benefícios de ataque separadamente; não suprimir ou manter silenciosamente diante de ambiguidade de percepção. Contexto/efeito específico e decisão da campanha devem ficar registrados. Não inferir que invisível está automaticamente escondido.

## Exaustão (`exhaustion`)

P292/PDF291. Estado numérico0–6, efeitos **cumulativos**. Novas causas somam níveis especificados; nível6 produz morte, não apenas condição removível por descanso comum.

| Nível atingido | Efeito acrescentado |
|---:|---|
|0|Nenhum|
|1|Desvantagem testes de habilidade|
|2|Deslocamento pela metade|
|3|Desvantagem ataques e resistências|
|4|Máximo PV pela metade|
|5|Deslocamento0|
|6|Morte|

Remover níveis recalcula todos os efeitos restantes. Descanso longo remove1 nível se ingeriu água/comida; exaustão por privação exige quantidade completa (cap8,p187/PDF186). Não apagar contagem ao simplesmente curar PV. Arredondar máximo reduzido para baixo; manter máximo sem exaustão em derivação separada para reversão.

## Interface e testes futuros

Ficha mostra chips textuais com quantidade de fontes e duração; detalhe revela consequências e remoção permitida. Ações bloqueadas explicam condição responsável. Aplicação manual aceita origem/descritivo, sem inventar imunidade por raça.

Testes:duas instâncias envenenado→uma desvantagem, remover1 mantém efeito; agarrado não impõe desvantagem; incapacitado não zera velocidade sozinho; inconsciente+atacante3 m não gera crítico automático; exaustão3 mantém efeitos1/2/3; máximo35 em exaustão4→17; remover nível4 restaura máximo calculado, sem dar cura arbitrária; petrificação suspende doença e restauração retoma a instância.
