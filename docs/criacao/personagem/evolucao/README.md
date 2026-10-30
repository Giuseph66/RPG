# Evolução de personagem: estudo completo e índice

Estudo para a construção da evolução do personagem (classe, subclasse, características, recursos, magias, atributos, talentos, multiclasse e XP). Documento de referência; não altera código. Gerado a partir do pack `phb-ptbr-local-2017` carregado pelo código, do Livro do Jogador fornecido e do texto bruto em `src/data/correto/descricoes/features.ts`.

Estado de referência: pack e código do commit `40287f4`, com alterações locais não commitadas no wizard de criação.

## Como ler

- ✓ = confere com o livro (texto ou tabela do livro).
- ❌ = ausente ou divergente no pack.
- "conferir" = o valor não foi relido no texto do livro nesta rodada.
- ID do pack = `entityId` usado pelo código (ex.: `monk.ki`). Nome em português vem do livro.
- As tabelas abaixo são geradas a partir do pack exportado. As faltas e divergências listadas foram conferidas no texto do livro; o que não foi relido está marcado "conferir". Níveis de subclasse conferidos; nomes de subclasse vêm de extração automática e os "(não extraído)" ainda precisam de leitura.

Fontes, por ordem de confiança:
1. `docs/Livro do Jogador.txt` (texto extraído do PDF; tabelas com colunas embaralhadas, por isso valores de tabela foram cruzados com o texto corrido).
2. `src/data/correto/descricoes/features.ts` (texto bruto por característica, com páginas).
3. Pack carregado: `src/data/classes/classes.ts`, `features.ts`, `src/data/subclasses/subclasses.ts`, `src/data/rulepacks/`.
4. `docs/criacao/personagem/classes/*/progressao.md` e `docs/criacao/magia/classes/README.md` (especificações).

## Atualização: o que foi implementado depois deste estudo

As tabelas e a lista de divergências abaixo descrevem o estado **antes** da implementação da evolução. Resolvidos:

| Divergência | Situação |
|---|---|
| D-01 | Resolvido: rota `/character/:id/evolve`, botão "Subir de nível" na ficha e histórico "Evolução" na ficha. Liberação sem trava: o jogador sobe quando quiser. |
| D-02 | Resolvido: `evolveCharacter` reconcilia fontes de conjuração, espaços, grimório, magias novas e dado de vida; soma o PV ganho ao PV atual. |
| D-03 | Corrigido: talentos já eram aplicados; faltava casar o id `classe.asi.N` (agora +2 em um atributo ou +1 em dois). Aumento e talento são alternativos. |
| D-04 | Resolvido: estilos de luta, metamagia, 32 invocações, dádiva do pacto, manobras, presa do caçador e demais opções viram escolhas do pack, com pré-requisitos. |
| D-05, D-06, D-07, D-08, D-18 parcial | Resolvido: Paladino e Patrulheiro ganham fonte no nível 2; Patrulheiro é de magias conhecidas; truques e conhecidas por nível vêm das tabelas; Mago ganha +2 no grimório. Magias de domínio, círculo e patrono expandido seguem sem dados. |
| D-09, D-10 | Resolvido: Queda Lenta, Golpes de Chi, Inimigo Favorito Maior, Especialização no nível 6, Arcana Mística 13/15/17 e os recursos de Surto de Ação, Indomável, Forma Selvagem e Sentido Divino. |
| D-11 | **Era erro deste estudo.** O recurso (1 uso, recupera no descanso longo) está certo. Falta só o efeito: espaços recuperados somam até metade do nível, arredondada para cima, sem 6º círculo ou superior. |
| D-14, D-15 | Resolvido: combinação de espaços na multiclasse e conjuração de terço (Cavaleiro Místico e Trapaceiro Arcano). |
| Criação | Corrigido: o Mago de nível 1 nascia com 1 espaço de 1º círculo em vez de 2. A criação oferece subclasse e escolhas de classe do 1º nível. |

**Ainda em aberto:** D-12 (características narrativas, sem efeito mecânico), D-13 (limite de preparadas só informativo), D-16 parcial, D-17 parcial, D-19 (escalas), magias concedidas por subclasse, e a Recuperação Arcana como efeito. O texto do livro difere do PHB de 2014 em pontos como Inimigo Favorito (5 tipos e sem terreno no Explorador Natural); sempre confirmar no texto fornecido.

## 1. Resumo

**Funciona hoje**
- 12 classes e 41 subclasses. Níveis de subclasse conferidos com o livro (seção 7); níveis das características base conferidos na maior parte, com as falhas marcadas (seção 5).
- Recursos principais: Fúria, Inspiração de Bardo, Canalizar Divindade, Chi, Pontos de Feitiçaria, Cura pelas Mãos, Recuperação Arcana (com erro, seção 8), Retomar o Fôlego, Golpe de Sorte.
- Espaços de magia por nível das classes conjuradoras (tabelas integral, meia e pacto), conferidos.
- Escolha de subclasse no nível de escolha de cada classe.
- Pré-requisitos de multiclasse (atributos).
- Criação de nível 1, incluindo truques e magias de 1º nível (ajustado nas rodadas anteriores).
- XP, bônus de proficiência e limiares (pack e `docs/criacao/personagem/progressao.md`).

**Não funciona hoje**
- Subir de nível não está ligado: `CharacterProgression` não tem rota e `applyLevelUp` não tem chamador fora dos testes (D-01). Você já disse que isso fica para depois.
- Quando a lógica de subida for ligada, ela já não atualiza espaços de magia, fontes de conjuração, grimório nem dados de vida de nova classe (D-02).
- Incremento de Habilidade e talentos são registrados como escolha, mas não mudam atributo nenhum (D-03).
- Quase nenhuma escolha de característica existe no pack: estilo de luta, metamagia, invocações, manobras, especialização, dádiva do pacto, ancestral dracônico etc. (D-04).
- Paladino e Patrulheiro nunca conjuram: não há fonte de conjuração ao chegar no nível 2 (D-05).
- Patrulheiro está marcado como preparado; o livro diz que ele conhece as magias (D-06).
- Truques conhecidos e magias conhecidas só existem no nível 1 para bruxo, feiticeiro, clérigo, druida, mago e patrulheiro (D-07). Mago não ganha as 2 magias de grimório por nível (D-08).
- Faltam 5 características base e 3 Arcanos Místicos do bruxo (D-09). Faltam os recursos de Surto de Ação, Indomável, Forma Selvagem e Sentido Divino (D-10).
- Características são narrativas: nenhuma tem efeito mecânico no motor, nem Defesa sem Armadura, nem Ataque Extra (D-12).

## 2. Mapa do sistema e relacionamentos

```
Personagem (Character)
├─ classes[]  → { classId, level, subclassId, choices }
│    ├─ ClassDefinition.progression[1..20]
│    │    ├─ featureRefs        → Feature (choices: sempre [], effects: narrativos)
│    │    ├─ resourceChanges    → Resource (capacityRule, recoveryTriggers)
│    │    ├─ choicesGranted     → só ASI e magias de 1º nível
│    │    └─ spellSlotsGranted  → espaços, truques e conhecidas (só bardo tem contagens completas)
│    └─ SubclassDefinition (subclassSelectionLevel na classe)
│         ├─ featureGrants[level] → Feature (`<subclasse>-feature-level-N`)
│         └─ choices: []
├─ xp  + pack.progression.table → PB e limiar de XP por nível total
├─ progressionHistory            → PV ganho por nível (dado ou valor fixo + CON)
├─ castingSources / spellSlots / spellbookEntries / preparedSelections
│                                 → criados só no nível 1 (materialize.ts)
├─ resources[] (spent)           → usos gastos; recuperação em rest/index.ts
└─ choices[]                     → escolhas feitas (ASI, magias, perícias, idiomas)
```

**Fluxo de subida de nível (código atual)**

1. `buildLevelUpPreview` (`src/domain/character/progression/progression.ts`) valida XP ou marco, classe, multiclasse, subclasse, PV e escolhas.
2. As escolhas esperadas vêm de `progression.choicesGranted`, `feature.choices` e `subclass.choices`. Hoje, só ASI e magias de 1º nível estão em `choicesGranted`; `feature.choices` e `subclass.choices` estão sempre vazios.
3. `applyLevelUp` grava nível da classe, subclasse, escolhas, histórico de PV e recursos novos.
4. **Não grava**: espaços de magia (`spellSlots`), fontes de conjuração (`castingSources`), grimório, preparadas, `hitDiceSpent` de classe nova.
5. Chamador: só `CharacterProgression.tsx`, que não está montada em nenhuma rota (`src/app/router.tsx`). `bindProgressionProps` existe em `feature-registry.ts` mas não é usado.

**Relações entre características (exemplos para a construção)**

- Druida nível 2 → escolhe círculo (subclasse, ✓) → ganha Forma Selvagem (recurso ❌) → tabela de formas por nível do druida (❌, `druid.wild-shape` tem CR escalonado no livro).
- Feiticeiro nível 2 → Fonte de Magia → recurso Pontos de Feitiçaria (✓, = nível) → converte em espaços e vice-versa (❌ conversão não modelada) → Metamagia (escolha ❌, 2/3/4 opções).
- Mago nível 2 → Tradição Arcana (subclasse ✓) → +2 magias de grimório (❌) → magias preparadas = Inteligência + nível (só na criação) → Recuperação Arcana (❌ errado).
- Bruxo nível 2 → 2 invocações (escolha ❌) → Dádiva do Pacto no nível 3 (escolha ❌, depende de `pact-magic` ✓) → Arcana Mística nos níveis 11, 13, 15, 17 (pack só tem 11).
- Paladino nível 2 → Conjuração (❌: sem fonte de conjuração no nível 2) → Estilo de Luta (escolha ❌) → Juramento no nível 3 (subclasse ✓).
- Patrulheiro nível 2 → Conjuração como magias conhecidas (❌ marcado como preparado; sem fonte no nível 2) → Estilo de Luta (❌) → Conclave no nível 3 (subclasse ✓).
- Guerreiro nível 1 → Estilo de Luta (❌ escolha) → Retomar o Fôlego (✓) → Surto de Ação no nível 2 (❌ recurso) → Arquétipo no nível 3 (subclasse ✓) → Indomável no nível 9 (❌ recurso).
- Ladino nível 1 → Especialização (❌ escolha) → Ataque Furtivo (✓ nome; dado escalonado ❌) → Especialização de novo no nível 6 (❌) → Arquétipo no nível 3 (subclasse ✓).
- Monge nível 4 → Queda Lenta (❌) → nível 6 → Golpes de Chi (❌), usa Chi (✓).
- Multiclasse → pré-requisitos de atributo (✓) → espaços combinados (❌ motor) → fontes de conjuração por classe (❌ na subida).
- Talento (42 no pack) → alternativa ao Incremento de Habilidade nos níveis de ASI → (❌ talento não aplicado).
- Raça → traços de magia por nível (ex.: Drow: Globos de Luz no nível 1, Fogo das Fadas no nível 3, Escuridão no nível 5; Tiefling: Taumaturgia no nível 1) → ✓ conferido no código `levelledSpellTrait`.

## 3. Regras de evolução (o que o livro manda)

- **XP e bônus de proficiência**: tabela de limiares; PB = `2 + floor((nível − 1) / 4)` ✓. XP acumulado não zera ao subir.
- **Nível de classe vs nível total**: cada nível de subida é de uma classe; o limite de nível total é 20 ✓.
- **Multiclasse**: exige atributos mínimos da nova classe (Guerreiro: Força 13 **ou** Destreza 13; demais: um ou dois atributos) ✓ pack; motor valida só atributos ✓.
- **Dado de Vida**: primeiro nível recebe o máximo do dado + CON; os seguintes recebem valor fixo ou rolagem, mais CON ✓ (`progressionHistory`).
- **Incremento de Habilidade (ASI)**: Guerreiro nos níveis 4, 6, 8, 12, 14, 16 e 19; Ladino 4, 8, 10, 12, 16 e 19; demais classes 4, 8, 12, 16 e 19 ✓ pack. Motor não aplica (D-03).
- **Escolha de subclasse**: nível 1 (Bruxo, Clérigo, Feiticeiro), nível 2 (Druida, Mago), nível 3 (Bárbaro, Bardo, Guerreiro, Ladino, Monge, Paladino, Patrulheiro) ✓ pack.
- **Conjuração**:
  - Conhecidas (ganha novas magias em tabela): Bardo, Bruxo, Feiticeiro, Patrulheiro ✓ texto. Ao subir, pode trocar uma magia conhecida por outra da lista (Bardo, Feiticeiro ✓ texto).
  - Preparadas (escolhe a lista a cada descanso longo): Clérigo e Druida = nível de classe + mod. de Sabedoria, mínimo 1 ✓ texto. Paladino = metade do nível, arredondada para baixo, + mod. de Carisma, mínimo 1 (conferir). Mago prepara da grimório (Inteligência + nível, mínimo 1; conferir a fórmula do texto).
  - Grimório: 6 magias de 1º nível no nível 1; **+2 a cada nível de mago** ✓ texto ("A cada nível de mago adquirido, você pode adicionar duas magias").
  - Truques: quantidade cresce nos níveis 4 e 10 para as classes integrais ✓ (texto do Mago e Bardo; demais conferir na tabela).
  - Espaços: tabela integral (2 no 1º nível, 4 círculos no 5º…), meia (Paladino e Patrulheiro, a partir do nível 2), terço (Cavaleiro Místico e Trapaceiro Arcano, a partir do nível 3) e pacto (Bruxo, poucos espaços que recuperam em descanso curto) ✓ `docs/criacao/magia/classes/README.md`.
  - Multiclasse de espaços: soma de níveis integrais + metade de Paladino e Patrulheiro + um terço de Guerreiro (Cavaleiro Místico) e de Ladino (Trapaceiro Arcano), arredondados para baixo ✓ doc; motor não implementa (D-14).
- **Recursos**: capacidade e recuperação conforme a tabela de cada classe (seção 5); lista completa na seção 8.
- **Escolhas de características**: seção 6.
- **Subclasses**: características por nível conforme seção 7.


## 4. Espaços e magias por classe conjuradora

Espaços vêm do pack; truques e conhecidas vêm do pack quando existem, senão do livro (ver nota da seção 3). Coluna "Observação" aponta metamagia, invocações e arcanos.

### Bardo

| Nível | Truques | Magias conhecidas / preparadas | Espaços (pack) | Observação |
|---|---|---|---|---|
| 1 | 2 | conhecidas: 4 | 1º×2 | — |
| 2 | 2 | conhecidas: 5 | 1º×3 | — |
| 3 | 2 | conhecidas: 6 | 1º×4 2º×2 | — |
| 4 | 3 | conhecidas: 7 | 1º×4 2º×3 | — |
| 5 | 3 | conhecidas: 8 | 1º×4 2º×3 3º×2 | — |
| 6 | 3 | conhecidas: 9 | 1º×4 2º×3 3º×3 | — |
| 7 | 3 | conhecidas: 10 | 1º×4 2º×3 3º×3 4º×1 | — |
| 8 | 3 | conhecidas: 11 | 1º×4 2º×3 3º×3 4º×2 | — |
| 9 | 3 | conhecidas: 12 | 1º×4 2º×3 3º×3 4º×3 5º×1 | — |
| 10 | 4 | conhecidas: 14 | 1º×4 2º×3 3º×3 4º×3 5º×2 | — |
| 11 | 4 | conhecidas: 15 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 12 | 4 | conhecidas: 15 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 13 | 4 | conhecidas: 16 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 14 | 4 | conhecidas: 18 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 15 | 4 | conhecidas: 19 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 16 | 4 | conhecidas: 19 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 17 | 4 | conhecidas: 20 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 9º×1 | — |
| 18 | 4 | conhecidas: 22 | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×1 7º×1 8º×1 9º×1 | — |
| 19 | 4 | conhecidas: 22 | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×1 8º×1 9º×1 | — |
| 20 | 4 | conhecidas: 22 | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×2 8º×1 9º×1 | — |

### Bruxo

| Nível | Truques | Magias conhecidas / preparadas | Espaços (pack) | Observação |
|---|---|---|---|---|
| 1 | 2 | conhecidas: 2 | 1º×1 | invocações: 0; espaços de pacto |
| 2 | 2 | conhecidas: 3 | 1º×2 | invocações: 2; espaços de pacto |
| 3 | 2 | conhecidas: 4 | 2º×2 | invocações: 2; espaços de pacto |
| 4 | 3 | conhecidas: 5 | 2º×2 | invocações: 2; espaços de pacto |
| 5 | 3 | conhecidas: 6 | 3º×2 | invocações: 3; espaços de pacto |
| 6 | 3 | conhecidas: 7 | 3º×2 | invocações: 3; espaços de pacto |
| 7 | 3 | conhecidas: 8 | 4º×2 | invocações: 4; espaços de pacto |
| 8 | 3 | conhecidas: 9 | 4º×2 | invocações: 4; espaços de pacto |
| 9 | 3 | conhecidas: 10 | 5º×2 | invocações: 5; espaços de pacto |
| 10 | 4 | conhecidas: 10 | 5º×2 | invocações: 5; espaços de pacto |
| 11 | 4 | conhecidas: 11 | 5º×3 | invocações: 5; arcana 6º; espaços de pacto |
| 12 | 4 | conhecidas: 11 | 5º×3 | invocações: 6; espaços de pacto |
| 13 | 4 | conhecidas: 12 | 5º×3 | invocações: 6; arcana 7º; espaços de pacto |
| 14 | 4 | conhecidas: 12 | 5º×3 | invocações: 6; espaços de pacto |
| 15 | 4 | conhecidas: 13 | 5º×3 | invocações: 7; arcana 8º; espaços de pacto |
| 16 | 4 | conhecidas: 13 | 5º×3 | invocações: 7; espaços de pacto |
| 17 | 4 | conhecidas: 14 | 5º×4 | invocações: 7; arcana 9º; espaços de pacto |
| 18 | 4 | conhecidas: 14 | 5º×4 | invocações: 8; espaços de pacto |
| 19 | 4 | conhecidas: 15 | 5º×4 | invocações: 8; espaços de pacto |
| 20 | 4 | conhecidas: 15 | 5º×4 | invocações: 8; espaços de pacto |

### Clérigo

| Nível | Truques | Magias conhecidas / preparadas | Espaços (pack) | Observação |
|---|---|---|---|---|
| 1 | 3 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×2 | — |
| 2 | 3 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×3 | — |
| 3 | 3 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×2 | — |
| 4 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 | — |
| 5 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×2 | — |
| 6 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 | — |
| 7 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×1 | — |
| 8 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×2 | — |
| 9 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×1 | — |
| 10 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 | — |
| 11 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 12 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 13 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 14 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 15 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 16 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 17 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 9º×1 | — |
| 18 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×1 7º×1 8º×1 9º×1 | — |
| 19 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×1 8º×1 9º×1 | — |
| 20 | 5 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×2 8º×1 9º×1 | — |

### Druida

| Nível | Truques | Magias conhecidas / preparadas | Espaços (pack) | Observação |
|---|---|---|---|---|
| 1 | 2 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×2 | — |
| 2 | 2 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×3 | — |
| 3 | 2 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×2 | — |
| 4 | 3 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 | — |
| 5 | 3 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×2 | — |
| 6 | 3 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 | — |
| 7 | 3 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×1 | — |
| 8 | 3 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×2 | — |
| 9 | 3 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×1 | — |
| 10 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 | — |
| 11 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 12 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 13 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 14 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 15 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 16 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 17 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 9º×1 | — |
| 18 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×1 7º×1 8º×1 9º×1 | — |
| 19 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×1 8º×1 9º×1 | — |
| 20 | 4 | preparadas: nível de classe + mod. de atributo (mín. 1) | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×2 8º×1 9º×1 | — |

### Feiticeiro

| Nível | Truques | Magias conhecidas / preparadas | Espaços (pack) | Observação |
|---|---|---|---|---|
| 1 | 4 | conhecidas: 2 | 1º×2 | — |
| 2 | 4 | conhecidas: 3 | 1º×3 | — |
| 3 | 4 | conhecidas: 4 | 1º×4 2º×2 | metamagia +2 |
| 4 | 5 | conhecidas: 5 | 1º×4 2º×3 | — |
| 5 | 5 | conhecidas: 6 | 1º×4 2º×3 3º×2 | — |
| 6 | 5 | conhecidas: 7 | 1º×4 2º×3 3º×3 | — |
| 7 | 5 | conhecidas: 8 | 1º×4 2º×3 3º×3 4º×1 | — |
| 8 | 5 | conhecidas: 9 | 1º×4 2º×3 3º×3 4º×2 | — |
| 9 | 5 | conhecidas: 10 | 1º×4 2º×3 3º×3 4º×3 5º×1 | — |
| 10 | 6 | conhecidas: 11 | 1º×4 2º×3 3º×3 4º×3 5º×2 | metamagia +1 |
| 11 | 6 | conhecidas: 12 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 12 | 6 | conhecidas: 12 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 13 | 6 | conhecidas: 13 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 14 | 6 | conhecidas: 13 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 15 | 6 | conhecidas: 14 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 16 | 6 | conhecidas: 14 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 17 | 6 | conhecidas: 15 | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 9º×1 | metamagia +1 |
| 18 | 6 | conhecidas: 15 | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×1 7º×1 8º×1 9º×1 | — |
| 19 | 6 | conhecidas: 15 | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×1 8º×1 9º×1 | — |
| 20 | 6 | conhecidas: 15 | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×2 8º×1 9º×1 | — |

### Mago

| Nível | Truques | Magias conhecidas / preparadas | Espaços (pack) | Observação |
|---|---|---|---|---|
| 1 | 3 | grimório: 6 magias (+2 por nível) | 1º×2 | — |
| 2 | 3 | grimório: 8 magias (+2 por nível) | 1º×3 | — |
| 3 | 3 | grimório: 10 magias (+2 por nível) | 1º×4 2º×2 | — |
| 4 | 4 | grimório: 12 magias (+2 por nível) | 1º×4 2º×3 | — |
| 5 | 4 | grimório: 14 magias (+2 por nível) | 1º×4 2º×3 3º×2 | — |
| 6 | 4 | grimório: 16 magias (+2 por nível) | 1º×4 2º×3 3º×3 | — |
| 7 | 4 | grimório: 18 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×1 | — |
| 8 | 4 | grimório: 20 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×2 | — |
| 9 | 4 | grimório: 22 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×1 | — |
| 10 | 5 | grimório: 24 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×2 | — |
| 11 | 5 | grimório: 26 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 12 | 5 | grimório: 28 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 | — |
| 13 | 5 | grimório: 30 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 14 | 5 | grimório: 32 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 | — |
| 15 | 5 | grimório: 34 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 16 | 5 | grimório: 36 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 | — |
| 17 | 5 | grimório: 38 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×2 6º×1 7º×1 8º×1 9º×1 | — |
| 18 | 5 | grimório: 40 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×1 7º×1 8º×1 9º×1 | — |
| 19 | 5 | grimório: 42 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×1 8º×1 9º×1 | — |
| 20 | 5 | grimório: 44 magias (+2 por nível) | 1º×4 2º×3 3º×3 4º×3 5º×3 6º×2 7º×2 8º×1 9º×1 | — |

### Paladino

| Nível | Truques | Magias conhecidas / preparadas | Espaços (pack) | Observação |
|---|---|---|---|---|
| 1 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | — | — |
| 2 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×2 | — |
| 3 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×3 | — |
| 4 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×3 | — |
| 5 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×2 | — |
| 6 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×2 | — |
| 7 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 | — |
| 8 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 | — |
| 9 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×2 | — |
| 10 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×2 | — |
| 11 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 | — |
| 12 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 | — |
| 13 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×1 | — |
| 14 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×1 | — |
| 15 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×2 | — |
| 16 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×2 | — |
| 17 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×3 5º×1 | — |
| 18 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×3 5º×1 | — |
| 19 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×3 5º×2 | — |
| 20 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×3 5º×2 | — |

### Patrulheiro

| Nível | Truques | Magias conhecidas / preparadas | Espaços (pack) | Observação |
|---|---|---|---|---|
| 1 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | — | — |
| 2 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×2 | — |
| 3 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×3 | — |
| 4 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×3 | — |
| 5 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×2 | — |
| 6 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×2 | — |
| 7 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 | — |
| 8 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 | — |
| 9 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×2 | — |
| 10 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×2 | — |
| 11 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 | — |
| 12 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 | — |
| 13 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×1 | — |
| 14 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×1 | — |
| 15 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×2 | — |
| 16 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×2 | — |
| 17 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×3 5º×1 | — |
| 18 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×3 5º×1 | — |
| 19 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×3 5º×2 | — |
| 20 | — | preparadas: metade do nível (arred. p/ baixo) + mod. de atributo (mín. 1), conferir | 1º×4 2º×3 3º×3 4º×3 5º×2 | — |


## 5. Progressão por classe

Cada tabela segue o pack; a coluna "Ausente/errado" indica o que o livro tem e o pack não. PB = bônus de proficiência.

### Bárbaro (`barbarian`)

Dado de Vida d12. Escolha de subclasse no nível 3. Não conjura no nível 1.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Fúria (`barbarian.rage`); Defesa sem Armadura (`barbarian.unarmored-defense`) | — | recurso `barbarian.rage` |
| 2 | +2 | Ataque Descuidado (`barbarian.reckless-attack`); Sentido de Perigo (`barbarian.danger-sense`) | — | — |
| 3 | +2 | Caminho Primitivo (`barbarian.primal-path`) | — | recurso `barbarian.rage` |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 5 | +3 | Ataque Extra (`barbarian.extra-attack`); Movimento Rápido (`barbarian.fast-movement`) | — | — |
| 6 | +3 | — | — | recurso `barbarian.rage` |
| 7 | +3 | Instinto Selvagem (`barbarian.feral-instinct`) | — | — |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 9 | +4 | Crítico Brutal (`barbarian.brutal-critical`) | — | — |
| 11 | +4 | Fúria Implacável (`barbarian.relentless-rage`) | — | — |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `barbarian.rage` |
| 15 | +5 | Fúria Persistente (`barbarian.persistent-rage`) | — | — |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 17 | +6 | — | — | recurso `barbarian.rage` |
| 18 | +6 | Força Indomável (`barbarian.indomitable-might`) | — | — |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 20 | +6 | Campeão Primitivo (`barbarian.primal-champion`) | — | recurso `barbarian.rage` |

#### Subclasses

### Bardo (`bard`)

Dado de Vida d8. Escolha de subclasse no nível 3. Conjuração: magias conhecidas; habilidade de conjuração: Carisma.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Conjuração (`bard.spellcasting`); Inspiração de Bardo (`bard.bardic-inspiration`) | — | bard.cantrips.1 (2–2); bard.spells.1 (4–4); recurso `bard.bardic-inspiration` |
| 2 | +2 | Versatilidade (`bard.jack-of-all-trades`); Canção de Descanso (`bard.song-of-rest`) | — | — |
| 3 | +2 | Colégio de Bardo (`bard.bard-college`); Aptidão (`bard.expertise`) | — | ❌ escolha ausente: Aptidão: 2 perícias |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 5 | +3 | Fonte de Inspiração (`bard.font-of-inspiration`) | — | — |
| 6 | +3 | Canção de Proteção (`bard.countercharm`) | — | — |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 10 | +4 | Segredos Mágicos (`bard.magical-secrets`); Aptidão (`bard.expertise`) | — | ❌ escolha ausente: Aptidão: 2 perícias |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 20 | +6 | Inspiração Superior (`bard.superior-inspiration`) | — | — |

#### Subclasses

### Bruxo (`warlock`)

Dado de Vida d8. Escolha de subclasse no nível 1. Conjuração: magias conhecidas; habilidade de conjuração: Carisma.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Patrono Transcendental (`warlock.otherworldly-patron`); Magia de Pacto (`warlock.pact-magic`) | — | warlock.cantrips.1 (2–2); warlock.spells.1 (2–2) |
| 2 | +2 | Invocações Místicas (`warlock.eldritch-invocations`) | — | ❌ escolha ausente: Invocações Místicas: 2 escolhas (contagem sobe em 5, 7, 9, 12, 15 e 18) |
| 3 | +2 | Dádiva do Pacto (`warlock.pact-boon`) | — | ❌ escolha ausente: Dádiva do Pacto: Pacto da Corrente, da Lâmina ou do Tomo |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 11 | +4 | Arcana Mística (`warlock.mystic-arcanum`) | — | ❌ escolha ausente: Arcana Mística 6º |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 13 | +5 | — | ❌ Arcana Mística 7º (`warlock.mystic-arcanum` só existe no nível 11) | — |
| 15 | +5 | — | ❌ Arcana Mística 8º | — |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 17 | +6 | — | ❌ Arcana Mística 9º | — |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 20 | +6 | Mestre Místico (`warlock.eldritch-master`) | — | — |

#### Subclasses

### Clérigo (`cleric`)

Dado de Vida d8. Escolha de subclasse no nível 1. Conjuração: magias preparadas; habilidade de conjuração: Sabedoria.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Conjuração (`cleric.spellcasting`); Domínio Divino (`cleric.divine-domain`) | — | cleric.cantrips.1 (3–3); cleric.spells.1 (1–1); ❌ escolha ausente: Domínio Divino (subclasse); Domínio do Conhecimento: 2 idiomas |
| 2 | +2 | Canalizar Divindade (`cleric.channel-divinity`) | — | recurso `cleric.channel-divinity` |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 5 | +3 | Destruir Mortos-Vivos (`cleric.destroy-undead`) | — | — |
| 6 | +3 | — | — | recurso `cleric.channel-divinity` |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 10 | +4 | Intervenção Divina (`cleric.divine-intervention`) | — | — |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 18 | +6 | — | — | recurso `cleric.channel-divinity` |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 20 | +6 | Intervenção Divina Maior (`cleric.greater-divine-intervention`) | — | — |

#### Subclasses

### Druida (`druid`)

Dado de Vida d8. Escolha de subclasse no nível 2. Conjuração: magias preparadas; habilidade de conjuração: Sabedoria.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Druídico (`druid.druidic`); Conjuração (`druid.spellcasting`) | — | druid.cantrips.1 (2–2); druid.spells.1 (1–1) |
| 2 | +2 | Forma Selvagem (`druid.wild-shape`); Círculo Druídico (`druid.druid-circle`) | ❌ Recurso Forma Selvagem não modelado (2 usos, recupera em descanso curto ou longo) | — |
| 4 | +2 | Melhoria de Forma Selvagem (`druid.wild-shape-improvement`) | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 18 | +6 | Corpo Atemporal (`druid.timeless-body`); Magias da Besta (`druid.beast-spells`) | — | — |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 20 | +6 | Arquidruida (`druid.archdruid`) | — | — |

#### Subclasses

### Feiticeiro (`sorcerer`)

Dado de Vida d6. Escolha de subclasse no nível 1. Conjuração: magias conhecidas; habilidade de conjuração: Carisma.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Conjuração (`sorcerer.spellcasting`); Origem de Feitiçaria (`sorcerer.sorcerous-origin`) | — | sorcerer.cantrips.1 (4–4); sorcerer.spells.1 (2–2); ❌ escolha ausente: Origem de Feitiçaria (subclasse); Ancestral Dracônico (tipo de dragão, se Linhagem Dracônica) |
| 2 | +2 | Fonte de Magia (`sorcerer.font-of-magic`) | — | recurso `sorcerer.sorcery-points` |
| 3 | +2 | Metamagia (`sorcerer.metamagic`) | — | recurso `sorcerer.sorcery-points`; ❌ escolha ausente: Metamagia: 2 opções |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `sorcerer.sorcery-points` |
| 5 | +3 | — | — | recurso `sorcerer.sorcery-points` |
| 6 | +3 | — | — | recurso `sorcerer.sorcery-points` |
| 7 | +3 | — | — | recurso `sorcerer.sorcery-points` |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `sorcerer.sorcery-points` |
| 9 | +4 | — | — | recurso `sorcerer.sorcery-points` |
| 10 | +4 | Metamagia (`sorcerer.metamagic`) | — | recurso `sorcerer.sorcery-points`; ❌ escolha ausente: Metamagia: +1 opção |
| 11 | +4 | — | — | recurso `sorcerer.sorcery-points` |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `sorcerer.sorcery-points` |
| 13 | +5 | — | — | recurso `sorcerer.sorcery-points` |
| 14 | +5 | — | — | recurso `sorcerer.sorcery-points` |
| 15 | +5 | — | — | recurso `sorcerer.sorcery-points` |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `sorcerer.sorcery-points` |
| 17 | +6 | — | — | recurso `sorcerer.sorcery-points`; ❌ escolha ausente: Metamagia: +1 opção |
| 18 | +6 | — | — | recurso `sorcerer.sorcery-points` |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `sorcerer.sorcery-points` |
| 20 | +6 | Restauração Mística (`sorcerer.sorcerous-restoration`) | — | recurso `sorcerer.sorcery-points` |

#### Subclasses

### Guerreiro (`fighter`)

Dado de Vida d10. Escolha de subclasse no nível 3. Não conjura no nível 1.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Estilo de Luta (`fighter.fighting-style`); Retomar o Fôlego (`fighter.second-wind`) | — | recurso `fighter.second-wind`; ❌ escolha ausente: Estilo de Luta (`fighter.fighting-style` sem escolha) |
| 2 | +2 | Surto de Ação (`fighter.action-surge`) | ❌ Recurso Surto de Ação não modelado (1 uso; 2 no 17º) | — |
| 3 | +2 | Arquétipo Marcial (`fighter.martial-archetype`) | — | — |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 5 | +3 | Ataque Extra (`fighter.extra-attack`) | — | — |
| 6 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 9 | +4 | Indomável (`fighter.indomitable`) | ❌ Recurso Indomável não modelado (`fighter.indomitable` sem capacidade: 1 uso, 2 no 13º, 3 no 17º) | — |
| 11 | +4 | Ataque Extra (`fighter.extra-attack`) | — | — |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 13 | +5 | Indomável (`fighter.indomitable`) | — | — |
| 14 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 17 | +6 | Surto de Ação (`fighter.action-surge`); Indomável (`fighter.indomitable`) | — | — |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 20 | +6 | Ataque Extra (`fighter.extra-attack`) | — | — |

#### Subclasses

### Ladino (`rogue`)

Dado de Vida d8. Escolha de subclasse no nível 3. Não conjura no nível 1.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Especialização (`rogue.expertise`); Ataque Furtivo (`rogue.sneak-attack`); Gíria de Ladrão (`rogue.thieves-cant`) | — | ❌ escolha ausente: Especialização: 2 perícias ou perícia + ferramentas de ladrão |
| 2 | +2 | Ação Ardilosa (`rogue.cunning-action`) | — | — |
| 3 | +2 | Arquétipo de Ladino (`rogue.roguish-archetype`) | — | — |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 5 | +3 | Esquiva Sobrenatural (`rogue.uncanny-dodge`) | — | — |
| 6 | +3 | — | ❌ Especialização, 2ª escolha de perícias (`rogue.expertise` só aparece no nível 1) | ❌ escolha ausente: Especialização: 2 perícias |
| 7 | +3 | Evasão (`rogue.evasion`) | — | — |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 10 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 11 | +4 | Talento Confiável (`rogue.reliable-talent`) | — | — |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 14 | +5 | Sentido Cego (`rogue.blindsense`) | — | — |
| 15 | +5 | Mente Escorregadia (`rogue.slippery-mind`) | — | — |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 18 | +6 | Elusivo (`rogue.elusive`) | — | — |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 20 | +6 | Golpe de Sorte (`rogue.stroke-of-luck`) | — | recurso `rogue.stroke-of-luck` |

#### Subclasses

### Mago (`wizard`)

Dado de Vida d6. Escolha de subclasse no nível 2. Conjuração: grimório e magias preparadas; habilidade de conjuração: Inteligência.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Conjuração (`wizard.spellcasting`); Recuperação Arcana (`wizard.arcane-recovery`) | ❌ Recuperação Arcana: pack diz 1 uso no descanso longo; livro diz 1 vez por dia no descanso curto, soma de níveis ≤ metade do nível de mago (arredondada para cima), sem espaços de 6º nível ou superior | wizard.cantrips.1 (3–3); wizard.spells.1 (6–6); recurso `wizard.arcane-recovery`; ❌ escolha ausente: Grimório: 6 magias de 1º nível |
| 2 | +2 | Tradição Arcana (`wizard.arcane-tradition`) | — | ❌ escolha ausente: +2 magias no grimório a cada nível de mago |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 18 | +6 | Dominar Magia (`wizard.spell-mastery`) | — | ❌ escolha ausente: Dominar Magia: magias de 1º e 2º nível do grimório (conferir) |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 20 | +6 | Assinatura Mágica (`wizard.signature-spells`) | — | ❌ escolha ausente: Assinatura Mágica: 2 magias de 3º nível |

#### Subclasses

### Monge (`monk`)

Dado de Vida d8. Escolha de subclasse no nível 3. Não conjura no nível 1.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Defesa sem Armadura (`monk.unarmored-defense`); Artes Marciais (`monk.martial-arts`) | — | — |
| 2 | +2 | Chi (`monk.ki`); Movimento sem Armadura (`monk.unarmored-movement`) | — | recurso `monk.ki` |
| 3 | +2 | Tradição Monástica (`monk.monastic-tradition`); Defletir Projéteis (`monk.deflect-missiles`) | — | recurso `monk.ki` |
| 4 | +2 | — | ❌ Queda Lenta (`monk.slow-fall`, livro: reação, dano de queda −5×nível de monge) | Incremento de Habilidade (registrado, sem efeito no motor); recurso `monk.ki` |
| 5 | +3 | Ataque Extra (`monk.extra-attack`); Ataque Atordoante (`monk.stunning-strike`) | — | recurso `monk.ki` |
| 6 | +3 | — | ❌ Golpes de Chi (`monk.ki-empowered-strikes`) | recurso `monk.ki` |
| 7 | +3 | Evasão (`monk.evasion`); Mente Tranquila (`monk.stillness-of-mind`) | — | recurso `monk.ki` |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `monk.ki` |
| 9 | +4 | — | — | recurso `monk.ki` |
| 10 | +4 | Pureza Corporal (`monk.purity-of-body`) | — | recurso `monk.ki` |
| 11 | +4 | — | — | recurso `monk.ki` |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `monk.ki` |
| 13 | +5 | Idiomas do Sol e da Lua (`monk.tongue-of-sun-and-moon`) | — | recurso `monk.ki` |
| 14 | +5 | Alma de Diamante (`monk.diamond-soul`) | — | recurso `monk.ki` |
| 15 | +5 | Corpo Atemporal (`monk.timeless-body`) | — | recurso `monk.ki` |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `monk.ki` |
| 17 | +6 | — | — | recurso `monk.ki` |
| 18 | +6 | Corpo Vazio (`monk.empty-body`) | — | recurso `monk.ki` |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `monk.ki` |
| 20 | +6 | Auto-aperfeiçoamento (`monk.perfect-self`) | — | recurso `monk.ki` |

#### Subclasses

### Paladino (`paladin`)

Dado de Vida d10. Escolha de subclasse no nível 3. Conjuração: magias preparadas; habilidade de conjuração: Carisma.

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Sentido Divino (`paladin.divine-sense`); Cura pelas Mãos (`paladin.lay-on-hands`) | ❌ Recurso Sentido Divino não modelado | recurso `paladin.lay-on-hands` |
| 2 | +2 | Estilo de Luta (`paladin.fighting-style`); Destruição Divina (`paladin.divine-smite`); Conjuração (`paladin.spellcasting`) | — | recurso `paladin.lay-on-hands`; ❌ escolha ausente: Estilo de Luta |
| 3 | +2 | Saúde Divina (`paladin.divine-health`) | — | recurso `paladin.lay-on-hands` |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `paladin.lay-on-hands` |
| 5 | +3 | Ataque Extra (`paladin.extra-attack`) | — | recurso `paladin.lay-on-hands` |
| 6 | +3 | Aura de Proteção (`paladin.aura-of-protection`) | — | recurso `paladin.lay-on-hands` |
| 7 | +3 | — | — | recurso `paladin.lay-on-hands` |
| 8 | +3 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `paladin.lay-on-hands` |
| 9 | +4 | — | — | recurso `paladin.lay-on-hands` |
| 10 | +4 | Aura de Coragem (`paladin.aura-of-courage`) | — | recurso `paladin.lay-on-hands` |
| 11 | +4 | Destruição Divina Aprimorada (`paladin.improved-divine-smite`) | — | recurso `paladin.lay-on-hands` |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `paladin.lay-on-hands` |
| 13 | +5 | — | — | recurso `paladin.lay-on-hands` |
| 14 | +5 | Toque Purificador (`paladin.cleansing-touch`) | — | recurso `paladin.lay-on-hands` |
| 15 | +5 | — | — | recurso `paladin.lay-on-hands` |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `paladin.lay-on-hands` |
| 17 | +6 | — | — | recurso `paladin.lay-on-hands` |
| 18 | +6 | Aura Aprimorada (alcance) (`paladin.aura-range-improvement`) | — | recurso `paladin.lay-on-hands` |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor); recurso `paladin.lay-on-hands` |
| 20 | +6 | — | — | recurso `paladin.lay-on-hands` |

#### Subclasses

### Patrulheiro (`ranger`)

Dado de Vida d10. Escolha de subclasse no nível 3. Conjuração: magias preparadas; habilidade de conjuração: Sabedoria. ❌ Pack marca como preparada; livro diz conhecidas (D-06).

#### Progressão por nível

| Nível | PB | Características (nome em português, id do pack) | Ausente/errado contra o livro | Recursos e escolhas no pack |
|---|---|---|---|---|
| 1 | +2 | Inimigo Favorito (`ranger.favored-enemy`); Explorador Natural (`ranger.natural-explorer`) | — | ❌ escolha ausente: Inimigo Favorito (tipo e idioma) e Explorador Natural (terreno), conferir |
| 2 | +2 | Estilo de Luta (`ranger.fighting-style`); Conjuração (`ranger.spellcasting`) | ❌ Conjuração marcada como preparada; livro: magias conhecidas (2 de 1º nível no nível 2) | ❌ escolha ausente: Estilo de Luta; magias conhecidas (2 de 1º nível) |
| 3 | +2 | Consciência Primitiva (`ranger.primeval-awareness`) | — | — |
| 4 | +2 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 5 | +3 | Ataque Extra (`ranger.extra-attack`) | — | — |
| 6 | +3 | — | ❌ Inimigo Favorito Maior (`ranger.favored-enemy-greater`) | — |
| 8 | +3 | Pés Rápidos (`ranger.land-stride`) | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 10 | +4 | Mimetismo (`ranger.hide-in-plain-sight`) | — | — |
| 12 | +4 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 14 | +5 | Desaparecer (`ranger.vanish`) | — | — |
| 16 | +5 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 18 | +6 | Sentidos Selvagens (`ranger.feral-senses`) | — | — |
| 19 | +6 | — | — | Incremento de Habilidade (registrado, sem efeito no motor) |
| 20 | +6 | Matador de Inimigos (`ranger.foe-slayer`) | — | — |

#### Subclasses


## 6. Escolhas que o jogador faz ao subir

Escolhas que o livro define e que o pack não tem como escolher hoje. As escolhas de Incremento de Habilidade e de magias de 1º nível já existem no pack.

| Classe | Nível | Escolha ao subir | Situação no pack |
|---|---|---|---|
| Bardo | 3 | Aptidão: 2 perícias | ❌ ausente |
| Bardo | 10 | Aptidão: 2 perícias | ❌ ausente |
| Bruxo | 2 | Invocações Místicas: 2 escolhas (contagem sobe em 5, 7, 9, 12, 15 e 18) | ❌ ausente |
| Bruxo | 3 | Dádiva do Pacto: Pacto da Corrente, da Lâmina ou do Tomo | ❌ ausente |
| Bruxo | 11 | Arcana Mística 6º | ❌ ausente |
| Clérigo | 1 | Domínio Divino (subclasse); Domínio do Conhecimento: 2 idiomas | ❌ ausente |
| Feiticeiro | 1 | Origem de Feitiçaria (subclasse); Ancestral Dracônico (tipo de dragão, se Linhagem Dracônica) | ❌ ausente |
| Feiticeiro | 3 | Metamagia: 2 opções | ❌ ausente |
| Feiticeiro | 10 | Metamagia: +1 opção | ❌ ausente |
| Feiticeiro | 17 | Metamagia: +1 opção | ❌ ausente |
| Guerreiro | 1 | Estilo de Luta (`fighter.fighting-style` sem escolha) | ❌ ausente |
| Ladino | 1 | Especialização: 2 perícias ou perícia + ferramentas de ladrão | ❌ ausente |
| Ladino | 6 | Especialização: 2 perícias | ❌ ausente |
| Mago | 1 | Grimório: 6 magias de 1º nível | ❌ ausente |
| Mago | 2 | +2 magias no grimório a cada nível de mago | ❌ ausente |
| Mago | 18 | Dominar Magia: magias de 1º e 2º nível do grimório (conferir) | ❌ ausente |
| Mago | 20 | Assinatura Mágica: 2 magias de 3º nível | ❌ ausente |
| Paladino | 2 | Estilo de Luta | ❌ ausente |
| Patrulheiro | 1 | Inimigo Favorito (tipo e idioma) e Explorador Natural (terreno), conferir | ❌ ausente |
| Patrulheiro | 2 | Estilo de Luta; magias conhecidas (2 de 1º nível) | ❌ ausente |


## 7. Subclasses

Nível da escolha e níveis de característica conferidos com o pack. Os nomes vêm de extração automática do livro, com correções manuais onde a extração misturou seções; "(não extraído)" significa que ainda precisa ser lido no texto.

### Bárbaro

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Caminho do Furioso | `path-of-the-berserker` | 3 | 3, 6, 10, 14 | 3: Frenesi; 6: Fúria inconsciente; 10: Presença intimidante; 14: Retaliação |
| Caminho do Guerreiro Totêmico | `path-of-the-totem-warrior` | 3 | 3, 6, 10, 14 | 3: Totem Espiritual; 6: Aspecto da Besta; 10: Andarilho espiritual; 14: Sintonia totêmica |

### Bardo

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Colégio do Conhecimento | `college-of-lore` | 3 | 3, 6, 14 | 3: (não extraído, conferir o texto); 6: Palavras de interrupção / Segredos mágicos adicionais; 14: Perícia inigualável |
| Colégio da Bravura | `college-of-valor` | 3 | 3, 6, 14 | 3: Proficiência adicional / Inspiração em combate; 6: Ataque extra; 14: Magia de batalha |

### Bruxo

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| A Arquifada | `the-archfey` | 1 | 1, 6, 10, 14 | 1: Lista de magia expandida; 6: Bênção do obscuro; 10: Defesa sedutora; 14: Delírio sombrio |
| O Corruptor | `the-fiend` | 1 | 1, 6, 10, 14 | 1: Magias expandidas do corruptor; 6: Sorte do próprio obscuro; 10: Resistência demoníaca; 14: Lançar no inferno |
| O Grande Antigo | `the-great-old-one` | 1 | 1, 6, 10, 14 | 1: Despertar a mente; 6: Proteção entrópica; 10: Escudo de pensamentos; 14: Criar lacaio |

### Clérigo

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Domínio do Conhecimento | `knowledge-domain` | 1 | 1, 2, 6, 8, 17 | 1: Bênçãos do conhecimento; 2: Canalizar divindade: conhecimento das eras; 6: Canalizar divindade: ler pensamentos; 8: Conjuração poderosa; 17: Visões do passado |
| Domínio da Vida | `life-domain` | 1 | 1, 2, 6, 8, 17 | 1: (não extraído, conferir o texto); 2: (não extraído, conferir o texto); 6: Domínio da vida; 8: Golpe divino; 17: Cura suprema |
| Domínio da Luz | `light-domain` | 1 | 1, 2, 6, 8, 17 | 1: Magias do domínio da natureza / Labareda protetora; 2: Canalizar divindade: radiação do amanhecer; 6: Labareda aprimorada; 8: Conjuração poderosa; 17: Coroa de luz |
| Domínio da Natureza | `nature-domain` | 1 | 1, 2, 6, 8, 17 | 1: Acólito da natureza / Proficiência adicional; 2: Enfeitiçar animais e plantas; 6: Amortecer elementos; 8: Golpe divino; 17: Senhor da natureza |
| Domínio da Tempestade | `tempest-domain` | 1 | 1, 2, 6, 8, 17 | 1: Proficiência adicional / Ira da tormenta / Discípulo da vida; 2: Canalizar divindade: preservar a vida; 6: Canalizar divindade: ira destruidora; 8: Golpe divino; 17: Filho da tormenta |
| Domínio da Enganação | `trickery-domain` | 1 | 1, 2, 6, 8, 17 | 1: Bênção do trapaceiro; 2: Canalizar divindade: invocar duplicidade; 6: Canalizar divindade: manto de sombras; 8: Golpe divino; 17: Duplicidade aprimorada |
| Domínio da Guerra | `war-domain` | 1 | 1, 2, 6, 8, 17 | 1: Proficiência adicional / Sacerdote da guerra; 2: Canalizar divindade: ataque dirigido; 6: Bênção do deus da guerra; 8: Golpe divino; 17: Avatar da batalha |

### Druida

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Círculo da Terra | `circle-of-the-land` | 2 | 2, 6, 10, 14 | 2: Truque adicional / Recuperação natural; 6: Ataque primordial; 10: (não extraído, conferir o texto); 14: Santuário natural |
| Círculo da Lua | `circle-of-the-moon` | 2 | 2, 6, 10, 14 | 2: Forma selvagem de combate; 6: Formas de círculo; 10: Forma selvagem de elemental; 14: (não extraído, conferir o texto) |

### Feiticeiro

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Linhagem Dracônica | `draconic-bloodline` | 1 | 1, 6, 14, 18 | 1: Ancestral dracônico; 6: Afinidade elemental / Dobrar a sorte; 14: Asas de dragão / Caos controlado; 18: Presença dracônica / Bombardeio de magia |
| Magia Selvagem | `wild-magic` | 1 | 1, 6, 14, 18 | 1: Marés de caos; 6: (não extraído, conferir o texto); 14: (não extraído, conferir o texto); 18: (não extraído, conferir o texto) |

### Guerreiro

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Campeão | `champion` | 3 | 3, 7, 10, 15, 18 | 3: Crítico Aprimorado; 7: Atletismo Extraordinário; 10: Estilo de Luta Adicional; 15: Crítico Superior; 18: Sobrevivente |
| Mestre de Batalha | `battle-master` | 3 | 3, 7, 10, 15, 18 | 3: Superioridade em combate / Estudioso da guerra; 7: Conheça seu inimigo; 10: Superioridade em combate aprimorada; 15: Implacável; 18: (não extraído, conferir o texto) |
| Cavaleiro Místico | `eldritch-knight` | 3 | 3, 7, 10, 15, 18 | 3: Vínculo com Arma; 7: Magia de Guerra; 10: (não extraído, conferir o texto); 15: (não extraído, conferir o texto); 18: (não extraído, conferir o texto) |

### Ladino

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Ladrão | `thief` | 3 | 3, 9, 13, 17 | 3: Mãos Rápidas / Andarilho de Telhados; 9: Furtividade Suprema; 13: Usar Instrumento Mágico; 17: Reflexos de Ladrão |
| Assassino | `assassin` | 3 | 3, 9, 13, 17 | 3: Proficiência Adicional / Assassinar; 9: Especialização em Infiltração; 13: Impostor; 17: Golpe Letal |
| Trapaceiro Arcano | `arcane-trickster` | 3 | 3, 9, 13, 17 | 3: Mãos Mágicas Malabaristas; 9: Emboscada Mágica; 13: Trapaceiro Versátil; 17: Ladrão de Magia |

### Mago

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Escola de Abjuração | `school-of-abjuration` | 2 | 2, 6, 10, 14 | 2: Abjuração instruída / Proteção arcana; 6: Proteção projetada / Especialista em adivinhação; 10: Abjuração aprimorada / O terceiro olho; 14: Resistência à magia |
| Escola de Conjuração | `school-of-conjuration` | 2 | 2, 6, 10, 14 | 2: Conjuração instruída / Conjuração menor; 6: Transposição benigna; 10: Conjuração focada; 14: Invocações resistentes |
| Escola de Adivinhação | `school-of-divination` | 2 | 2, 6, 10, 14 | 2: Adivinhação instruída / Prodígio; 6: (não extraído, conferir o texto); 10: (não extraído, conferir o texto); 14: (não extraído, conferir o texto) |
| Escola de Encantamento | `school-of-enchantment` | 2 | 2, 6, 10, 14 | 2: Encantamento instruído / Olhar hipnotizante; 6: Encanto instintivo; 10: Dividir encantamento; 14: Alterar memórias |
| Escola de Evocação | `school-of-evocation` | 2 | 2, 6, 10, 14 | 2: Evocação instruída / Esculpir magias; 6: Truque potente; 10: Evocação potencializada; 14: Sobrecarga |
| Escola de Ilusão | `school-of-illusion` | 2 | 2, 6, 10, 14 | 2: Ilusão instruída / Ilusão menor aprimorada; 6: Ilusões moldáveis; 10: Eu ilusório; 14: Realidade ilusória |
| Escola de Necromancia | `school-of-necromancy` | 2 | 2, 6, 10, 14 | 2: Necromancia instruída / Colheita sinistra; 6: Escravos mortos-vivos; 10: Acostumado à morte-vida; 14: Comandar mortos-vivos |
| Escola de Transmutação | `school-of-transmutation` | 2 | 2, 6, 10, 14 | 2: Transmutação instruída / Alquimia menor; 6: Pedra de transmutador; 10: Metamorfo; 14: Mestre transmutador |

### Monge

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Caminho da Mão Aberta | `way-of-the-open-hand` | 3 | 3, 6, 11, 17 | 3: Técnica da Mão Aberta; 6: Integridade Corporal; 11: Tranquilidade; 17: Palma Vibrante |
| Caminho da Sombra | `way-of-shadow` | 3 | 3, 6, 11, 17 | 3: Artes das Sombras; 6: Passo das Sombras; 11: Manto de Sombras; 17: Oportunista |
| Caminho dos Quatro Elementos | `way-of-the-four-elements` | 3 | 3, 6, 11, 17 | 3: Discípulo dos elementos; 6: (não extraído, conferir o texto); 11: Manto de sombras; 17: (não extraído, conferir o texto) |

### Paladino

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Juramento de Devoção | `oath-of-devotion` | 3 | 3, 7, 15, 20 | 3: (não extraído, conferir o texto); 7: (não extraído, conferir o texto); 15: (não extraído, conferir o texto); 20: (não extraído, conferir o texto) |
| Juramento dos Anciões | `oath-of-the-ancients` | 3 | 3, 7, 15, 20 | 3: Magias de Juramento; 7: Aura de Vigilância; 15: Sentinela Imortal; 20: Campeão dos Anciões |
| Juramento de Vingança | `oath-of-vengeance` | 3 | 3, 7, 15, 20 | 3: Canalizar Divindade (Juramento de Vingança); 7: Vingador Implacável; 15: Alma de Vingança; 20: (não extraído, conferir o texto) |

### Patrulheiro

| Subclasse (nome) | ID | Escolha no nível | Níveis de característica (pack) | Nomes no texto do livro (nível: nome) |
|---|---|---|---|---|
| Conclave da Besta | `beast-conclave` | 3 | 3, 5, 7, 11, 15 | 3: Companheiro Animal; 5: Ataque Coordenado; 7: Defesa da Besta; 11: Tempestade de Garras e Presas; 15: Defesa da Besta Superior |
| Conclave do Caçador | `hunter-conclave` | 3 | 3, 5, 7, 11, 15 | 3: Presa do Caçador; 5: Ataque Extra; 7: Táticas Defensivas; 11: Ataque Múltiplo; 15: Defesa de Caçador Superior |
| Conclave do Rastreador Subterrâneo | `deep-stalker-conclave` | 3 | 3, 5, 7, 11, 15 | 3: Magia do Rastreador Subterrâneo; 5: Ataque Extra; 7: Mente de Aço; 11: Rajada do Rastreador; 15: Esquiva do Rastreador |


## 8. Divergências e lacunas (priorizadas)

| ID | Severidade | O que está errado | Evidência | Efeito |
|---|---|---|---|---|
| D-01 | Alta | Subida de nível não está ligada à interface nem à aplicação | `src/app/router.tsx` sem rota; `src/app/feature-registry.ts:96,176`; `applyLevelUp` sem chamador | Não há como subir de nível. Adiado por decisão sua. |
| D-02 | Alta | `applyLevelUp` não atualiza espaços, fontes de conjuração, grimório, preparadas nem dados de vida de classe nova | `src/domain/character/progression/progression.ts` (`applyLevelUp`) | Conjurador sobe de nível e continua com espaços do nível 1. |
| D-03 | Alta | Incremento de Habilidade e talentos são registrados como escolha sem efeito | `src/data/classes/classes.ts` (`asiChoice`); `src/domain/rules/core/modifiers.ts` só trata a escolha de atributo de raça | ASI não aumenta atributo; talento não é aplicado. Atenção: a escolha de raça "qualquer atributo" pega a primeira escolha de atributo entre todas as escolhas gravadas. Hoje isso é seguro porque o ASI é gravado depois da criação, mas a regra depende da ordem da lista. |
| D-04 | Alta | Escolhas de característica vazias | `src/data/classes/features.ts` (`choices: []`); `src/data/subclasses/subclasses.ts` (`choices: []`) | Estilo de Luta, Metamagia, Invocações, Manobras, Especialização, Dádiva do Pacto etc. não podem ser escolhidas (seção 6). |
| D-05 | Alta | Paladino e Patrulheiro não conjuram | `src/domain/character/creation/materialize.ts` (`spellState` só cria fonte se `castsAtLevelOne`); progressão não cria fonte | No nível 2 não surge fonte de conjuração; a classe nunca conjura. |
| D-06 | Média | Patrulheiro marcado como preparado | `src/data/classes/classes.ts` (`halfSpellcasting("wis")`, kind `prepared`); livro: "Magias Conhecidas" | Ao corrigir, muda para conhecidas e precisa da coluna de conhecidas. |
| D-07 | Alta | Truques e magias conhecidas só no nível 1 (bruxo, feiticeiro, clérigo, druida, mago, patrulheiro) | `fullSpellcasting` sem o parâmetro `known`; `warlock` sem contagens; só `initialSpellChoices` do nível 1 | Ao subir, não surgem novos truques nem magias. Bardo está completo. |
| D-08 | Média | Mago não ganha as 2 magias de grimório por nível | Livro: "A cada nível de mago adquirido, você pode adicionar duas magias" | Grimório fica com 6 magias para sempre. |
| D-09 | Média | Características base ausentes | Monge nível 4 (Queda Lenta), nível 6 (Golpes de Chi); Patrulheiro nível 6 (Inimigo Favorito Maior); Ladino nível 6 (Especialização); Bruxo níveis 13, 15 e 17 (Arcana Mística 7º, 8º, 9º) | Características que o jogador espera ao subir não aparecem. |
| D-10 | Média | Recursos ausentes | Surto de Ação (1 uso; 2 no 17º), Indomável (1, 2 e 3 usos nos níveis 9, 13 e 17), Forma Selvagem (2 usos), Sentido Divino | Usos não são controlados nem recuperados. |
| D-11 | Média | Recuperação Arcana errada | `src/data/classes/features.ts`: capacidade fixa 1, recuperação em descanso longo. Livro: uma vez por dia, no descanso **curto**, soma de níveis ≤ metade do nível de mago (arredondada para cima), sem espaços de 6º nível ou superior | Mago recupera de forma errada. |
| D-12 | Alta | Características são narrativas: nenhuma tem efeito mecânico | `src/data/classes/features.ts` (`effects: [{ kind: "narrative" }]`) | Defesa sem Armadura, Ataque Extra, Fúria (dano), Evasão, Sentido de Perigo etc. não mudam a ficha derivada. |
| D-13 | Média | Limites de preparadas e truques só são calculados na criação | `src/features/character/creation/CharacterCreationWizard.tsx` e `src/domain/character/creation/limits.ts` | A progressão não valida o limite de preparadas nem de truques. |
| D-14 | Média | Multiclasse de espaços não implementada | `docs/criacao/magia/classes/README.md` define a regra; o motor não soma espaços de classes diferentes | Conjurador multiclasse não recebe espaços combinados. |
| D-15 | Média | Subclasses de terço (Cavaleiro Místico, Trapaceiro Arcano) sem fonte de conjuração | `subclass.spellGrants: []` em todas as subclasses | Cavaleiro Místico e Trapaceiro Arcano não conjuram. |
| D-16 | Média | Quantidades de Metamagia, Invocações e Ataques Extra não existem no modelo | Feiticeiro (2 no 3º, +1 no 10º, +1 no 17º); Bruxo (invocações 2 a 8); Guerreiro (2, 3 e 4 ataques) | Só há um registro de cada característica. |
| D-17 | Média | Nome e página de origem das características são aproximados | `src/data/classes/features.ts`: `name: featureId` e página fixa por classe | A interface mostra o ID, não o nome; citações de página ficam erradas dentro da mesma classe. |
| D-18 | Média | Subclasses não concedem magias (domínio, círculo, patrono) | `subclass.spellGrants: []` | Magias de domínio, de círculo da terra e de patrono expandido não aparecem. |
| D-19 | Baixa | Escalas por nível não modeladas | Seção 9 | Dano e dados de características não mudam com o nível. |
| D-20 | Baixa | Patrulheiro e Paladino não têm truques (correto), mas o pack não diz isso explicitamente | `src/data/classes/classes.ts` | Sem ação; só documentação. |


## 9. Escalas por nível não modeladas

| Característica | Escala no livro | Status no pack |
|---|---|---|
| Ataque Furtivo (Ladino) | 1d6 no nível 1, mais 1d6 a cada 2 níveis (2d6 no 3º… 10d6 no 19º) | ❌ dado fixo ausente; conferir a progressão exata |
| Inspiração de Bardo | d6 (1º), d8 (5º), d10 (10º), d12 (15º) | ❌ só o número de usos está modelado |
| Chi e Artes Marciais (Monge) | Dado de Artes Marciais: d4 (1º), d6 (5º), d8 (11º), d10 (17º); conferir | ❌ |
| Crítico Brutal (Bárbaro) | +1 dado (9º), +2 (13º), +3 (17º) | ❌ só consta no nível 9 |
| Fúria (Bárbaro) | Dano +2 (1º), +3 (9º), +4 (16º); usos 2, 3, 4, 5, 6 e ∞ | ✓ usos; ❌ dano |
| Destruir Mortos-Vivos (Clérigo) | ND 1/2 (5º), 1 (8º), 2 (11º), 3 (14º), 4 (17º) | ❌ só consta no nível 5 |
| Forma Selvagem (Druida) | ND máximo 1/4 (2º), 1/2 (4º), 1 (8º); duração 1h (2º), 2h (4º) … 10h (20º) | ❌ |
| Ataque Extra | 2 ataques (5º; Guerreiro 11º: 3; Guerreiro 20º: 4) | ❌ quantidade |
| Metamagia (Feiticeiro) | 2 opções (3º), +1 (10º), +1 (17º) | ❌ quantidade |
| Invocações Místicas (Bruxo) | 2 (2º), 3 (5º), 4 (7º), 5 (9º), 6 (12º), 7 (15º), 8 (18º) | ❌ quantidade |
| Arcana Mística (Bruxo) | 6º (11º), 7º (13º), 8º (15º), 9º (17º) | ❌ só o 11º |
| Recuperação Arcana (Mago) | Ver D-11 | ❌ |
| Cura pelas Mãos (Paladino) | 5 × nível de paladino | ✓ |
| Canalizar Divindade (Clérigo) | 1 (2º), 2 (6º), 3 (18º) | ✓ |
| Pontos de Feitiçaria (Feiticeiro) | = nível de feiticeiro (a partir do 2º); custo de conversão pela tabela | ✓ pontos; ❌ conversão |
| Chi (Monge) | = nível de monge (a partir do 2º) | ✓ |
| Golpe de Sorte, Retomar o Fôlego | 1 uso | ✓ |
| Truques (dano escalonado) | Dano sobe nos níveis 5, 11 e 17 | ❌ (ver D-19) |


## 10. Pendências já registradas

Estão em `docs/criacao/decisoes/PENDENCIAS.md`:

| Pendência | Assunto | Relação com a evolução |
|---|---|---|
| PEND-004 | Clérigo e Druida com ritual de magia que "conheça"; círculo druida "sempre poderá prepará-la" | Preparadas e rituais (seção 3). |
| PEND-005 | Mago, Assinatura Mágica (nível 20), uso uma vez por dia com recuperação curta/longa | Recurso no nível 20 (D-09 e seção 9). |
| PEND-006 | Bruxo, Correntes de Cárceri com pré-requisito que se refere a si mesmo | Opção de Invocação (seção 6). |
| PEND-008 | Druida Lua, nível 10: formas elementais sem estatísticas no apêndice | Forma Selvagem (D-10). |
| PEND-017 | Mago, Pedra do Transmutador: escola de magia incompatível na troca de benefício | Escolha de Tradição Arcana, nível 6. |


## 11. Dependências entre os itens

A ordem diz o que depende de quê, para evitar construir uma camada sobre outra que não existe.

1. **Fonte de conjuração por classe e nível** (D-02, D-05). Base de todo o resto que é de magia.
2. **Contagens de magia** (D-06, D-07, D-08, D-18): conhecidas, truques, grimório e preparadas. Dependem de 1.
3. **Modelo de escolha de característica** (D-04). `feature.choices` e `subclass.choices` existem no contrato e estão vazios. Alimenta Metamagia, Invocações, Estilo de Luta, Manobras, Especialização, Dádiva do Pacto, Inimigo Favorito e Ancestral Dracônico.
4. **ASI e talentos** (D-03). Depende de aplicar `ability-score-increase` ao motor de atributos. Talentos dependem de 6.
5. **Recursos e correções** (D-10, D-11). Dependem só do que já existe em `capacityRule` (já suporta `by-class-level`).
6. **Efeitos mecânicos das características** (D-12). É a maior dívida: CA (Defesa sem Armadura), ataques extras, dano, deslocamento, sentidos. Depende de um efeito por característica no Rules Engine.
7. **Subclasses que concedem magia e conjuração de terço** (D-15, D-18). Dependem de 1 e 2.
8. **Subida de nível ligada** (D-01, D-02, D-13). Depende de 1 a 7. Fica para depois, como você pediu.
9. **Multiclasse de espaços** (D-14). Depende de 1 e 2.

**Atenção à criação (nível 1)**: vários itens de nível 1 já afetam a criação e não dependem de subida. São: Estilo de Luta do Guerreiro; Especialização do Ladino (2 perícias); Inimigo Favorito e Explorador Natural do Patrulheiro; Origem de Feitiçaria do Feiticeiro (subclasse); Domínio Divino do Clérigo (subclasse, com magias de domínio); Patrono do Bruxo (subclasse); idiomas do Domínio do Conhecimento; e Ancestral Dracônico (se a subclasse for Linhagem Dracônica). A criação ainda não pede subclasse, e isso precisa entrar no próximo passo.


## 12. Próximos passos e decisões

Sugestão de ordem, para quando você decidir começar (nada disso foi implementado nesta rodada):

1. **Corrigir dados** sem mexer no motor: Patrulheiro como conhecido; contagens de truques e magias conhecidas; Arcana Mística 13/15/17; Queda Lenta e Golpes de Chi; Inimigo Favorito Maior; Especialização no nível 6; Recuperação Arcana; recursos faltantes. Cada item tem um teste de conferência com o texto do livro.
2. **Escolhas de característica**: popular `feature.choices` e `subclass.choices` para as escolhas da seção 6, começando pelas do nível 1 (são as que afetam a criação).
3. **ASI e talentos** aplicados ao motor de atributos (D-03).
4. **Efeitos mecânicos** das características, por ordem de impacto: Defesa sem Armadura, Ataque Extra, Fúria, Ataque Furtivo, Evasão, Chi/Artes Marciais.
5. **Subida de nível ligada** (quando você mandar): fonte de conjuração, grimório, espaços, preparadas e dados de vida (D-01, D-02, D-13).

Pontos de decisão que pedem a sua escolha antes de implementar: (a) Paladino e Patrulheiro devem ganhar fonte de conjuração no nível 2 pelo motor, ou o pack deve trazer a fonte já no nível 1 com espaços zerados? (b) Recuperação Arcana: capacidade calculada pelo motor ou valor fixo por nível? (c) Talentos do livro: entram como escolha de ASI ou só no nível 4, 8, … como alternativa?


## Índice estruturado

O arquivo `indice.json` ao lado deste documento contém os mesmos dados em forma de grafo (classes, subclasses, características base, recursos, lacunas e arestas entre eles), para consulta por ferramentas. Gerado a partir do pack exportado; regenerar quando o pack mudar.
