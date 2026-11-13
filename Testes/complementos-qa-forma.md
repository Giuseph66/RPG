# QA focal — Forma Selvagem

Atualizado em 12/11/2026. Evidência focal de domínio, aplicação e browser; não representa aceite de cloud ou gate global.

## Prova nova

`npx vitest run src/application/character/service.test.ts src/domain/rules/wild-shape/index.test.ts` — 2 arquivos, 12 testes passaram.

Os nove casos puros em `src/domain/rules/wild-shape/index.test.ts` usam o catálogo publicado do PHB local (95 criaturas: 88 bestas, incluindo seis enxames) e um Druida 2 com histórico obrigatório (ganhos de PV 8+5 e dado de vida d8). Eles verificam:

- besta individual vista dentro do ND permitido; rejeição de não vista, acima do ND, não besta, enxame e bloco escalável;
- falhas de seleção sem gastar usos; ação normal, ação bônus do Círculo da Lua e usos ilimitados no nível 20;
- besta voadora permitida, velocidades de voo/natação suprimidas e CA/tamanho/sentidos a partir do bloco da forma;
- Força, Destreza e Constituição da forma sem somar bônus racial de novo; Inteligência, Sabedoria e Carisma preservadas; maior bônus entre personagem e forma para perícia/resistência;
- PV temporários, dano, cura e retorno mantendo recursos/inventário atuais; excedente transferido uma vez sem reaplicar resistência;
- avanço explícito de minutos e mínimo de 1h/8h em descansos curto/longos, incluindo expiração automática.

Os três casos em `src/application/character/service.test.ts` cobrem retorno por inconsciência em atualização direta, gravação otimista de PV efetivos no `formHp` com retorno ao atingir zero e normalização em `saveCharacter` preservando PV originais/campos atuais. Esse teste usa repositório em memória; não prova IndexedDB ou sincronização remota.

`npx vitest run src/app/bootstrap.test.tsx` — 1 arquivo, 16 testes passaram. O novo caso grava as quatro coleções de criaturas em `replace` e `copy`, confirma os registros no IndexedDB e confirma que reset de campanhas limpa `creatures`, `sightings`, `guesses` e `proposals`.

`npx vitest run src/application/character/action-dispatcher.test.ts src/application/character/action-capabilities.test.ts src/domain/spells/spells.test.ts src/domain/rules/derived/derive-character.test.ts` — 4 arquivos, 60 testes passaram. A prova integrada percorre `deriveActionCapabilities` → `ActionDispatcher` → persistência e usa o resolver canônico para testar Druida 2/18/20 em forma: nível 2 e nível 18 com M rejeitam sem gastar; nível 18 V/S e nível 20 M simples concluem e gastam o slot. Os mesmos focais cobrem usos raciais gratuitos versus espaços, Fogo das Fadas e Aumentar/Reduzir com alvo/componente explícitos, Reforço Feérico gratuito/slot com dispensa de M e concentração anterior preservada, e Incansável com rolagem d8, gasto/PV atômicos e falhas/cancelamento/CAS sem gasto.

O teste de foco druídico usa Bordão Místico da lista de truques de Guerreiro Druídico (`sourceKind: feature`, atributo SAB, `spellListClassId: druid`): foco fica desativado sem `ranger.druidic-focus` concedido e ativo somente após optar pela característica Tasha. Cura própria mantém `targetIds:[character.id]` no comando e omite `spellTargeting`, para não pedir ou gravar seleção vazia na interface. Componentes com custo, consumo ou tipo de item rastreável permanecem bloqueados e sinalizados por `spellMaterialRequiresTrackedItem`; foco não contorna esses materiais. Reforço Feérico é a exceção declarada que dispensa M.

O smoke de browser da interface percorreu catálogo real com 95 criaturas (88 bestas, incluindo seis enxames), marcou LOBO como visto, entrou em Forma Selvagem como Druida 2/Círculo da Lua, recarregou com a forma ativa e retornou mantendo PV original 17 e gasto de uso (2/2 → 1/2). Na forma, mostrou CA 13, atributos 12/15/12 e 11 PV efetivos.

A CA `worn` também tem casos de derivação: forma publicada 13 + escudo vestido 2 + bônus geral 1 resulta 16; forma natural 18 permanece acima da base equipada; armadura corporal superior vence a forma com DES efetiva; `dropped`/`merged-with-form` sem bônus ativo resultam em 14. A derivação de velocidades aplica modificadores de estado uma vez e preserva `max(velocidade publicada, caminhada copiada)` antes de suprimir voo/natação.

## Limites atuais

- Magias que ainda dependem de posição, área, salvaguarda ou decisão da mesa continuam assistidas; este fluxo coleta somente alvo/material explícitos e registra custo. Summons não criam criaturas, posições ou duração automatizadas. Magias com M rastreável ficam bloqueadas até existir seleção/consumo real de item.
- O focal de UI/preview da variante de Reforço Feérico sem concentração passou. O browser ainda precisa provar o runtime com uma ficha que já tenha concentração ativa; a regra de domínio preserva a concentração anterior e registra a alternativa de 1 minuto.
- Ainda não foram executados typecheck global, build ou suíte integral. O log de diagnóstico antigo não é evidência atual; os gates finais seguem com o orquestrador.

## Reproduzir

```sh
npx vitest run src/application/character/service.test.ts src/domain/rules/wild-shape/index.test.ts
npx vitest run src/app/bootstrap.test.tsx
npx vitest run src/application/character/action-dispatcher.test.ts src/application/character/action-capabilities.test.ts src/domain/spells/spells.test.ts src/domain/rules/derived/derive-character.test.ts
```

## Rechecagem SUP-02 (12/11/2026)

- A criação/derivação/dispatcher reais registram Druidismo de uma Fada de 1º nível com escolha racial válida sem slot ou recurso racial; não aplicam efeitos e declaram resolução manual. A omissão da escolha obrigatória falha na validação/materialização. Druida e Guerreiro Druídico continuam bloqueados para os truques cuja estrutura segue pendente.
- Progressão Ranger com Fey Wanderer adiciona magias concedidas nos níveis 3 e 5 à fonte conhecida sem consumir escolhas ou limite; JSON reload preserva concessões e o cast exige subclasse e nível ativos. A lista expandida do Bruxo permanece distinta. Identidade compatível é conferida por `DefinitionRef` contra o ruleset da ficha, nunca pelo `SourceRef` bibliográfico.
- A prova de conjuração superior confirma `higherLevels: none` com slot acima do nível base sem alterar efeito; `custom` não estruturado permanece assistido/bloqueado. Fada usa a opção gratuita ou slot explicitamente escolhido, nunca ambos; componentes materiais rastreáveis continuam bloqueados sem inventário selecionável.
- A derivação de ataque em forma filtra Engolir, dano recorrente, veneno condicionado e ações sem jogada publicada. As fixtures reais preservam o veneno incondicional do Sapo, Mordida/Constrição da Cobra Constritora e Mordida do Lobo. `AttackOption.label` alimenta capability e histórico (`ação — forma`); capacidades de forma avisam que riders publicados são resolvidos manualmente. Dano plano sem fórmula não é rolado e deixa a ação inteira manual.
- Focais passaram: `npx vitest run src/application/character/action-dispatcher.test.ts src/application/character/action-capabilities.test.ts src/domain/spells/spells.test.ts src/domain/character/creation/creation.test.ts` (4 arquivos/63 testes); `npx vitest run src/domain/character/evolution/granted-spells.test.ts src/data/classes/tasha-ranger.test.ts src/domain/character/creation/creation.test.ts` (3/33); `npx vitest run src/domain/rules/derived/derive-character.test.ts src/domain/creatures/index.test.ts src/data/creatures/catalog.test.ts src/application/character/action-capabilities.test.ts src/application/character/action-dispatcher.test.ts` (5/66). Comandos têm arquivos sobrepostos; contagens não são somadas.
- O restante segue no gate global: typecheck/build/suíte integral e smoke UI atualizado. Os efeitos do Druidismo, riders que exigem salvaguarda/turno, magias de área/posição e seleção real de M custoso seguem assistidos ou bloqueados conforme descrito; esta prova não os automatiza.
