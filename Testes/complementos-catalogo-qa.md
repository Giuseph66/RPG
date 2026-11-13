# QA do catálogo do Apêndice A

Conferência integral de `src/data/creatures/catalog.ts` contra `docs/fontes/complementos-2026-11/05-manual-dos-monstros-apendice-a-raw.txt`.

Foram conferidos os 95 blocos, em ordem: nome e quantidade; tipo e porte; CA; PV médio e dados de vida; FOR, DES, CON, INT, SAB e CAR; ND e XP; deslocamentos; e a presença e segmentação essencial de traços, ações e variantes. Os nomes e a ordem correspondem aos 95 registros da fonte. Os campos numéricos conferidos correspondem ao texto, exceto os cinco deslocamentos abaixo, corrigidos nesta rodada.

## Deslocamentos corrigidos

| Bloco e referência | Antes no catálogo | Fonte e valor atual |
| --- | --- | --- |
| Coruja — `catalog.ts:2812`; p. 325, linha 1138 | caminhada 500 cm; voo 1800 cm | caminhada 1,5 m = 150 cm; voo 18 m = 1800 cm |
| Coruja Gigante — `catalog.ts:2898`; p. 326, linha 1168 | caminhada 500 cm; voo 1800 cm | caminhada 1,5 m = 150 cm; voo 18 m = 1800 cm |
| Morcego — `catalog.ts:5496`; p. 333, linha 2177 | caminhada 500 cm; voo 900 cm | caminhada 1,5 m = 150 cm; voo 9 m = 900 cm |
| Polvo — `catalog.ts:5905`; p. 335, linha 2331 | caminhada 500 cm; natação 900 cm | caminhada 1,5 m = 150 cm; natação 9 m = 900 cm |
| Texugo — `catalog.ts:6824`; p. 337, linha 2686 | caminhada 500 cm; escavação ausente | caminhada 6 m = 600 cm; escavação 1,5 m = 150 cm |

## Traços, ações e variantes corrigidos

- Aranha Gigante (`catalog.ts:640`, `:704`, `:730`): p. 319, linhas 289–295. A Teia estava incorporada à Mordida, que também carregava um alcance remoto incorreto. Agora Mordida e Teia são ações distintas; Teia retém recarga 5–6, o alcance impresso 9 m/18 m e as regras de impedimento e destruição da teia.
- Cavalo de Guerra (`catalog.ts:2146`, `:2184`, `:2188`): p. 324, linhas 895–905. A tabela da variação de armadura estava no texto da ação Cascos. Cascos agora contém apenas seu ataque, e `sourceText.variation.armoredWarhorse` conserva a descrição e a tabela impressas.
- Enxames (`catalog.ts:3369`, `:3461`, `:3503`): p. 327, linhas 1356 e 1400–1421. A seção geral “A NATUREZA DOS ENXAMES” foi retirada da ação Bicadas. Os efeitos condicionais de aranhas, besouros, centopeias e vespas saíram da lista de ações e estão em traços identificados como variantes; Mordidas permanece a ação do bloco.
- Lagarto Gigante (`catalog.ts:4887`, `:4927`, `:4932`, `:4939`): p. 331, linhas 1941–1948. Prender a Respiração e Escalada Aracnídea agora são traços opcionais. Foi removida a pseudoação “Subterrâneo”; Mordida não contém mais a frase narrativa que terminava truncada.
- Lobo Invernal (`catalog.ts:5231`, `:5276`, `:5288`, `:5305`): p. 332, linhas 2077 e 2087–2091. Camuflagem de Neve estava dividida entre dois traços incompletos; agora é um só. Sopro Congelante está separado de Mordida, com recarga 5–6 e dano frio 4d8; Mordida conserva apenas dano perfurante.
- Polvo e Polvo Gigante (`catalog.ts:5905`, `:5948`, `:5978`, `:5994`, `:6037`, `:6071`): p. 335, linhas 2348, 2358, 2385 e 2396. Cada Camuflagem Submersa agora é um traço completo. Nuvem de Tinta está separada de Tentáculos e preserva os raios impressos de 1,5 m e 6 m, a condição submersa, duração e recarga.
- Rã Gigante e Sapo Gigante (`catalog.ts:6148`, `:6220`, `:6568`, `:6643`): p. 335, linhas 2454–2463, e p. 337, linhas 2619–2628. Cada Engolir agora reúne título, alvo, efeito e dano ácido recorrente em uma ação; foram removidas as pseudoações com o tamanho do alvo. A nota do dano indica que ocorre no começo de cada turno enquanto o alvo está engolido.
- Rato Gigante (`catalog.ts:6324`, `:6373`, `:6394`): p. 336, linhas 2519–2531. A mordida infectada agora é identificada como variante, com ID próprio `rato-gigante-infectado-mordida`; o ID duplicado foi removido. `sourceText.variation.infectedGiantRat` conserva o texto de variante e seu ND/XP.
- Urso Polar (`catalog.ts:7627`, `:7670`, `:7696`): p. 339, linhas 3002–3007. A variante Urso das Cavernas saiu do texto de Garras e foi preservada em `sourceText.variation.caveBear`.

Para segmentar traços opcionais e texto de variantes, foram suficientes os campos existentes `traits` e `sourceText`. A proteção da automação foi coordenada com B por meio dos campos opcionais `CreatureDamageEntry.requiresManualResolution` e `CreatureAction.requiresManualResolution`.

## Verificação e limites

### Resolução manual de ataques

Foram marcados 11 componentes de dano de veneno que dependem de teste de resistência, preservando os componentes físicos das mordidas/ferrões: Aranha (p. 318, linha 246), Aranha Gigante (p. 319, linhas 282–283), Aranha Interplanar (p. 320, linhas 333–334), Aranha-Lobo Gigante (p. 320, linhas 378–379), Centopeia Gigante (p. 324, linhas 1000–1005), Enxame de Serpentes Venenosas (p. 328, linhas 1548–1555), Escorpião (p. 329, linhas 1580–1582), Escorpião Gigante (p. 329, linhas 1610–1614), Serpente Venenosa (p. 337, linhas 2633–2634), Serpente Venenosa Gigante (p. 337, linhas 2660–2661) e Vespa Gigante (p. 340, linhas 3034–3036). Cada componente contém nota com CD e consequência do teste.

Dez ações inteiras recebem `requiresManualResolution`: os seis ataques de enxame com dano alternativo conforme metade dos PV (p. 327, linhas 1342–1345 e 1386–1389; p. 327–328, linhas 1444–1447; p. 328, linhas 1482–1485, 1515–1518 e 1548–1555), Sopro Congelante do Lobo Invernal (p. 332, linhas 2072–2075), Engolir da Rã Gigante (p. 335, linhas 2438–2444), Engolir do Sapo Gigante (p. 337, linhas 2601–2605) e Mordida da variante Rato Gigante Infectado (p. 336, linhas 2500–2512). O dano periódico ácido e o dano do sopro também ficam marcados manualmente. O ataque de mordida do Sapo Gigante tem dano de veneno incondicional (p. 337, linhas 2596–2599); ele permanece sem marca, assim como o veneno incondicional da Cobra Voadora (p. 326, linha 1120). A variante do rato mantém o dano perfurante não marcado e a doença como efeito textual.

No catálogo, os 11 componentes de veneno estão nas linhas `617`, `725`, `830`, `936`, `2469`, `3954`, `4027`, `4133`, `6728`, `6808` e `7846`; os três componentes adicionais (frio do sopro e ácido dos dois Engolir) estão em `5318`, `6232` e `6655`. As ações inteiras estão nas linhas `3372`, `3506`, `3614`, `3729`, `3831`, `3929`, `5308`, `6223`, `6397` e `6646` de `src/data/creatures/catalog.ts`: 11 componentes condicionais de veneno, 3 componentes periódicos/de área e 10 ações manuais.

Comando focal: `npx vitest run src/data/creatures/catalog.test.ts` — 1 arquivo e 6 testes passaram. A suíte verifica os 95 blocos, unicidade de IDs de traços/ações, os cinco deslocamentos, a segmentação das ações e variantes, os 11 componentes de veneno, as 10 ações manuais e as exceções de veneno incondicional.

A conferência usou somente a extração textual local indicada acima, incluindo seus marcadores de página. Não houve comparação visual com imagens do manual nem consulta à web ou ao SRD. Inconsistências impressas foram mantidas, sem normalização.
