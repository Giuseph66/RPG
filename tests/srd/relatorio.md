# Auditoria de regras — nosso pack × SRD 5.1 (dnd5eapi.co)

Base: https://www.dnd5eapi.co/api/2014 (snapshot de 2026-09-28T19:22:51.537Z). Unidades da API convertidas para as do livro: 1,5 m por 5 pés; 0,5 kg por libra.

A SRD é um subconjunto do Livro do Jogador: itens só nossos não são erro. Divergência não prova que o livro esteja errado — revise antes de aplicar.

**23 divergência(s)**: 0 corrigível(is) com `npm run test --aplica`, 0 de revisão manual, 23 exceção(ões) revisada(s) em que o livro prevalece.

| Domínio | Comparados | Divergências | Aplicáveis | Manuais | Exceções |
|---|---:|---:|---:|---:|---:|
| Classes | 12 | 0 | 0 | 0 | 0 |
| Progressão (bônus de proficiência) | 20 | 0 | 0 | 0 | 0 |
| Raças | 9 | 0 | 0 | 0 | 0 |
| Sub-raças | 4 | 0 | 0 | 0 | 0 |
| Perícias | 18 | 0 | 0 | 0 | 0 |
| Condições | 15 | 0 | 0 | 0 | 0 |
| Equipamento | 183 | 14 | 0 | 0 | 14 |
| Magias — catálogo do livro | 319 | 8 | 0 | 0 | 8 |
| Magias — definições automatizadas | 6 | 1 | 0 | 0 | 1 |

## Classes

Sem divergências.

- Só no nosso pack: nenhum
- Só na SRD: nenhum

## Progressão (bônus de proficiência)

Sem divergências.

- Só no nosso pack: nenhum
- Só na SRD: nenhum

## Raças

Sem divergências.

- Só no nosso pack: nenhum
- Só na SRD: nenhum

## Sub-raças

Sem divergências.

- Só no nosso pack: dark-elf, forest-gnome, mountain-dwarf, stout, wood-elf
- Só na SRD: nenhum

## Perícias

Sem divergências.

- Só no nosso pack: nenhum
- Só na SRD: nenhum

## Condições

Sem divergências.

- Só no nosso pack: nenhum
- Só na SRD: nenhum

## Equipamento

| ID | API | Campo | Nosso | SRD | Ação |
|---|---|---|---|---|---|
| greatclub | greatclub | Propriedades | ["heavy","two-handed"] | ["two-handed"] | exceção: Livro pt-BR imprime "Pesada, duas mãos" para Clava Grande; a SRD traz só duas mãos. |
| pike | pike | Peso (kg) | 4 | 9 | exceção: peso impresso no livro pt-BR: 4 kg |
| heavy-crossbow | crossbow-heavy | Peso (kg) | 4.5 | 9 | exceção: peso impresso no livro pt-BR: 4.5 kg |
| viol | viol | Peso (kg) | 3 | 0.5 | exceção: peso impresso no livro pt-BR: 3 kg |
| manacles | manacles | Peso (kg) | 2 | 3 | exceção: peso impresso no livro pt-BR: 2 kg |
| pouch | pouch | Preço (po) | 0.5 | 0.5 (livro: 5) | exceção: Livro pt-BR imprime 5 po; o original e a SRD trazem 5 pp (0,5 po), valor mantido. |
| whistle | signal-whistle | Preço (po) | 25 | 0.05 | exceção: preço impresso no livro pt-BR: 25 po |
| whistle | signal-whistle | Peso (kg) | 0.5 | 0 | exceção: peso impresso no livro pt-BR: 0.5 kg |
| caltrops | caltrops | Preço (po) | 1 | 0.05 | exceção: preço impresso no livro pt-BR: 1 po |
| flask | flask-or-tankard | Peso (kg) | 1 | 0.5 | exceção: peso impresso no livro pt-BR: 1 kg |
| bottle | bottle-glass | Preço (po) | 1 | 2 | exceção: preço impresso no livro pt-BR: 1 po |
| jug | jug-or-pitcher | Preço (po) | 0.04 | 0.02 | exceção: preço impresso no livro pt-BR: 0.04 po |
| whetstone | whetstone | Peso (kg) | 0 | 0.5 | exceção: peso impresso no livro pt-BR: 0 kg |
| piton | piton | Peso (kg) | 0 | 0.125 | exceção: peso impresso no livro pt-BR: 0 kg |

- Só no nosso pack: admirers-token, ammunition, animal-trophy, arrows, artisan-tools, blowgun-needles, bone-dice, city-map, cloak, common-clothes, con-tools, costume, crossbow-bolts, dark-common-clothes, dead-colleague-letter, dragonchess-set, fine-clothes, guild-letter, harpoon, healing-potion, holy-symbol, lineage-scroll, lucky-charm, mug, musical-instrument, nails, paraffin, parents-memento, pet-rat, prayer-book, rank-insignia, scroll-case, sling-bullets, three-dragon-ante-set, travelers-clothes, trophy, winter-blanket
- Só na SRD: arrow, blowgun-needle, burglars-pack, crossbow-bolt, diplomats-pack, dungeoneers-pack, entertainers-pack, explorers-pack, grappling-hook, priests-pack, scholars-pack, sling-bullet, spike-iron, vial

## Magias — catálogo do livro

| ID | API | Campo | Nosso | SRD | Ação |
|---|---|---|---|---|---|
| adivinhacao | divination | Classes | ["cleric"] | ["druid"] | exceção: Catálogo extraído do PDF lista só clérigo; a SRD lista druida. Não confirmado no texto do livro: conferir a página antes de mudar. |
| criar-alimentos | create-food-and-water | Classes | ["cleric","paladin"] | ["cleric","druid","paladin"] | exceção: Catálogo extraído do PDF lista clérigo e paladino; a SRD acrescenta druida. Não confirmado no texto do livro: conferir a página antes de mudar. |
| cura-completa-em-massa | mass-heal | Escola | evocação | conjuração | exceção: Catálogo extraído do PDF diz evocação; a SRD diz conjuração. Não confirmado no texto do livro: conferir a página antes de mudar. |
| curar-ferimentos-em-massa | mass-cure-wounds | Escola | evocação | conjuração | exceção: Catálogo extraído do PDF diz evocação (nas três listas de classe); a SRD diz conjuração. Não confirmado no texto do livro: conferir a página antes de mudar. |
| fogo-das-fadas | faerie-fire | Classes | ["bard","druid"] | ["druid"] | exceção: Catálogo extraído do PDF lista bardo e druida; a SRD lista só druida. Não confirmado no texto do livro: conferir a página antes de mudar. |
| mesclar-se-as-rochas | meld-into-stone | Classes | ["cleric","druid"] | ["cleric"] | exceção: Catálogo extraído do PDF lista clérigo e druida; a SRD lista só clérigo. Não confirmado no texto do livro: conferir a página antes de mudar. |
| olho-arcano | arcane-eye | Classes | ["wizard"] | ["cleric","wizard"] | exceção: Catálogo extraído do PDF lista só mago; a SRD acrescenta clérigo. Não confirmado no texto do livro: conferir a página antes de mudar. |
| revivify | revivify | Escola | necromancia | conjuração | exceção: Catálogo extraído do PDF diz necromancia (lista de classe e descrição); a SRD diz conjuração. Não confirmado no texto do livro: conferir a página antes de mudar. |

- Só no nosso pack: aljava-veloz, amizade, arma-elemental, armadura-de-agathys, aura-de-pureza, aura-de-vida, aura-de-vitalidade, bracos-de-hadar, bruxaria, chicote-de-espinhos, circulo-de-poder, conjurar-rajada, conjurar-saraivada, cordao-de-flechas, coroa-da-loucura, destruicao-banidora, destruicao-cegante, destruicao-colerica, destruicao-estonteante, destruicao-lancinante, destruicao-trovejante, duelo-compelido, flecha-relampejante, fome-de-hadar, forca-fantasmagorica, forjar-morte, golpe-constritor, manto-do-cruzado, nuvem-de-adagas, onda-destrutiva, orbe-cromatica, palavra-de-poder-curar, portal-arcano, protecao-contra-laminas, raio-adoecente, raio-de-bruxa, saraivada-de-espinhos, sentido-bestial, sussurros-dissonantes, telepatia, tsunami, vinha-esmagadora
- Só na SRD: nenhum

## Magias — definições automatizadas

| ID | API | Campo | Nosso | SRD | Ação |
|---|---|---|---|---|---|
| revivify | revivify | Escola | necromancy | conjuration | exceção: Definição automatizada e PDF dizem necromancia; a SRD diz conjuração. Não confirmado no texto do livro: conferir a página antes de mudar. |

- Só no nosso pack: nenhum
- Só na SRD: nenhum

