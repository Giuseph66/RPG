# Clérigo — 7 domínios divinos

Fonte: Livro do Jogador fornecido, cap.3, pp.65–70/PDF64–69. Escolha nível1; magias de domínio sempre preparadas, fora limite, e consideradas de clérigo. Todos recebem Canalizar Divindade no nível2, marco6, efeito ofensivo8 e ápice17.

## `knowledge-domain` — Conhecimento

- Nível1: magias de domínio; dois idiomas; escolha duas entre Arcanismo, História, Natureza, Religião, com proficiência dobrada.
- Nível2, Conhecimento das Eras: Canalizar, ação; por10min proficiência numa perícia ou ferramenta escolhida.
- Nível6, Ler Pensamentos: ação e SAB em criatura a18m; leitura superficial até1min com concentração; durante efeito pode encerrar para conjurar `sugestão` sem slot, alvo falha automaticamente.1 uso de Canalizar.
- Nível8, Conjuração Poderosa: soma SAB ao dano de qualquer truque de clérigo.
- Nível17, Visões do Passado: meditação com objeto/local; uso1/curto ou longo; resultado narrativo do Mestre conforme duração da leitura.

## `life-domain` — Vida

- Nível1: armadura pesada; Discípulo da Vida soma `2+nível da magia` à cura de magia nível1+.
- Nível2, Preservar a Vida: Canalizar, ação, pool `5×nívelclérigo` dividido a criaturas a9m, sem elevar acima de metade do máximo; não afeta mortos-vivos/constructos.
- Nível6, Curandeiro Abençoado: magia nível1+ que cure outro também cura clérigo em `2+nível da magia`.
- Nível8/14, Golpe Divino:1×turno, +1d8 radiante em acerto de arma; +2d8 no14.
- Nível17, Cura Suprema: dados de cura de magias usam valor máximo; não maximiza outros dados.

## `light-domain` — Luz

- Nível1: truque `luz`; Labareda Protetora usa reação contra ataque de criatura visível a9m, impondo desvantagem antes do acerto; usos=max(1,SAB), longo.
- Nível2, Radiação do Amanhecer: Canalizar, ação; dissipa escuridão mágica e causa `2d10+nívelclérigo` radiante a hostis escolhidos a9m, CON metade; exige não estar em cobertura total.
- Nível6, Labareda Aprimorada: proteger criatura visível a9m, usando mesmo pool/reação.
- Nível8, Conjuração Poderosa: SAB no dano de truque de clérigo.
- Nível17, Coroa de Luz: ação, luz solar18m por1min; hostis na luz têm desvantagem em resistências contra magias de fogo/radiante; encerrar como ação.

## `nature-domain` — Natureza

- Nível1: truque de druida que usa SAB e conta como clérigo; proficiência em Adestrar Animais, Natureza ou Sobrevivência; armadura pesada.
- Nível2, Enfeitiçar Animais e Plantas: Canalizar, ação; cada besta/planta a9m faz SAB; falha fica enfeitiçada1min ou até dano.
- Nível6, Amortecer Elementos: reação quando criatura a9m sofre ácido/frio/fogo/elétrico/trovejante → resistência naquela ocorrência.
- Nível8/14, Golpe Divino:1×turno +1d8 (+2d8 no14) ácido/frio/fogo/elétrico, escolha por acerto.
- Nível17, Mestre da Natureza: bônus para comandar cada criatura enfeitiçada por Canalizar quanto à ação no próximo turno.

## `tempest-domain` — Tempestade

- Nível1: armas marciais e armadura pesada. Cólera da Tormenta: reação quando criatura a1,5m visível acerta → DES, `2d8` elétrico/trovejante, metade no sucesso; usos=max(1,SAB), longo.
- Nível2, Ira Destruidora: Canalizar ao rolar dano elétrico/trovejante → máximo em vez de rolar.
- Nível6, Ataque Trovejante: dano elétrico em Grande ou menor permite empurrar3m.
- Nível8/14, Golpe Divino:1×turno arma +1d8 (+2d8) trovejante.
- Nível17, Filho da Tormenta: voo igual caminhada enquanto não subterrâneo/interior.

## `trickery-domain` — Enganação

- Nível1, Bênção do Trapaceiro: ação toca outra criatura; vantagem em Furtividade por1h ou até reutilizar. Não usa em si.
- Nível2, Invocar Duplicidade: Canalizar, ação, concentração1min; ilusão a9m, mover9m como bônus até36m. Conjurar como se estivesse na posição; vantagem corpo a corpo quando ambos a1,5m do alvo.
- Nível6, Manto de Sombras: Canalizar, ação; invisível até fim próximo turno, termina ao atacar/conjurar.
- Nível8/14, Golpe Divino: veneno +1d8/+2d8,1×turno.
- Nível17, Duplicidade Aprimorada: cria quatro duplicatas, movidas juntas pelo mesmo bônus.

## `war-domain` — Guerra

- Nível1: armas marciais, armadura pesada; Sacerdote da Guerra: após ação Atacar, um ataque como bônus; usos=max(1,SAB), longo.
- Nível2, Ataque Dirigido: após rolagem, antes resultado, Canalizar para +10 no próprio ataque.
- Nível6, Bênção do Deus da Guerra: reação para +10 no ataque de criatura a9m; Canalizar.
- Nível8/14, Golpe Divino: dano do mesmo tipo da arma +1d8/+2d8,1×turno.
- Nível17, Avatar da Batalha: resistência a concussão/cortante/perfurante de armas não mágicas.

## Dados, UI e testes

Domínio é `subclassId` nível1. Magias concedidas preservam círculo/nível; Canalizar usa pool da classe compartilhado entre todas opções. Distância/alvo/concentração e cooldown pertencem ao efeito. Testar proficiências, lista sempre preparada, uma única aplicação de SAB/dano, divisão do pool Vida, gasto único de Canalizar e ápices. [PEND-004](../../../decisoes/PENDENCIAS.md) afeta ritual/preparação geral, não remove magias de domínio.
