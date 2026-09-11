# Passos de implementação

**IMPLEMENTAÇÃO DO SOFTWARE NÃO INICIADA.** 20 passos, numerados 00–19, cada um com metadados e 17 seções. Inspirados na organização do [Pixel — docs/Passos](https://github.com/Giuseph66/Pixel/tree/main/docs/Passos): uma responsabilidade delimitada, pré-requisitos, arquivos, armadilhas, aceite e limites de prova; nenhuma arquitetura Godot copiada.

## Ordem de leitura não é ordem de execução

Ler na numeração para entender o produto; agendar pelo [DAG de tarefas](../swarm/DEPENDENCIES.md). Um passo pode conter tarefas de fases diferentes: no passo 03, DATA-001 congela contratos antes de DATA-003 criar persistência base; STATE-001 vem depois. No passo 14, DATA-003 ocorre cedo e DATA-006 completa migração/backup mais tarde. Engine de dados avança sem shell; seu overlay espera shell. Catálogos do passo 08 destravam criação do passo 07. Não criar dependências circulares entre passos tentando torná-los blocos indivisíveis.

Todas as verificações descritas são futuras; esta documentação não afirma testes/lint/build executados. Aplicar autorizações vigentes na fase de implementação. Só CORE-001 está READY no estado inicial; nenhum passo representa software pronto.

| Passo | Tema | Tasks |
| --- | --- | --- |
| [00 — Fundação](00-fundacao.md) | Estabelecer o esqueleto técnico mínimo sobre o qual contratos, design e módulos poderão avançar independentemente na futura implementação. | CORE-001 |
| [01 — Design system](01-design-system.md) | Converter a direção dark fantasy natural em tokens e componentes reutilizáveis, com foco na legibilidade e operação durante sessão. | UI-001 |
| [02 — App shell](02-app-shell.md) | Criar navegação estável, header de sessão e composição visual das quatro áreas com ação global de dados. | UI-002 |
| [03 — Modelo do personagem e estado](03-modelo-personagem.md) | Fixar tipos compartilhados e organizar estado local persistente/transitório sem acoplar UI ao banco. | DATA-001, STATE-001 |
| [04 — Dice Engine e interface global](04-dice-engine.md) | Entregar rolagem pura testável e experiência global consistente entre header, FAB e contexto de regra. | DICE-001, DICE-002 |
| [05 — Ficha do personagem](05-ficha.md) | Representar todos os campos relevantes das três páginas da ficha fornecida em visão rápida e expandida. | CHAR-002 |
| [06 — Rules Engine](06-rules-engine.md) | Construir cálculo puro, rastreável à fonte, que transforma definições/estado/contexto em derivados e resultados tipados. | RULE-001 |
| [07 — Criação de personagem](07-criacao-personagem.md) | Permitir construir uma ficha válida a partir das opções da fonte, com escolhas explícitas e revisão antes do primeiro commit. | CHAR-001, CHAR-003 |
| [08 — Classes, raças e progressão](08-classes-racas.md) | Codificar conteúdo estruturado e progressão da fonte atual, mantendo decisões de origem, versão e suporte visíveis. | DATA-002, DATA-004, DATA-005, CHAR-004 |
| [09 — Combate e página Ações](09-combate.md) | Entregar transições de combate/recuperação e ações utilizáveis com custo, contexto e resultado claros. | RULE-002, UI-003 |
| [10 — Magia](10-magia.md) | Estruturar magias/truques e resolver conjuração por classe, origem, slots, componentes e concentração. | SPELL-001, SPELL-002 |
| [11 — Inventário e equipamento](11-inventario.md) | Gerenciar equipamentos por instância e refletir seus efeitos mecânicos sem mutar o catálogo. | ITEM-001, ITEM-002, UI-004 |
| [12 — Jornada, campanha e mapa](12-jornada.md) | Organizar memória local da campanha com mapa simples, locais, diário, NPCs, objetivos e sessões. | MAP-001, JOUR-001 |
| [13 — Compêndio](13-compendio.md) | Permitir consulta rápida de regras e entidades locais por nome, categoria e tags, com favoritos e referência da fonte. | COMP-001 |
| [14 — Persistência, backup e recuperação](14-persistencia.md) | Garantir armazenamento local consistente e transferível por JSON versionado, com recuperação e migrações explícitas. | DATA-003, DATA-006 |
| [15 — PWA e operação offline](15-pwa.md) | Permitir instalação e uso offline de sessão, com atualização segura do shell/conteúdo sem afetar dados locais. | PWA-001 |
| [16 — Responsividade](16-responsividade.md) | Provar que os fluxos funcionam em mobile, tablet e desktop, com reflow e controles acessíveis em zoom/orientação/teclado. | UI-005 |
| [17 — Acessibilidade](17-acessibilidade.md) | Validar critérios WCAG 2.2 AA aplicáveis e uso real por teclado/leitor de tela, com foco em sessão e recuperação. | A11Y-001 |
| [18 — Integração e testes](18-testes.md) | Integrar módulos reais e comprovar regras, persistência, offline e fluxos completos sem confundir mocks com produto pronto. | CORE-002, QA-001, QA-002, QA-003, QA-004 |
| [19 — Polimento e entrega](19-polimento.md) | Fechar entrega futura com instruções precisas de uso, instalação, backup, suporte do pack e limitações demonstradas. | REL-001 |

## Contrato de conclusão

Checklist marcado requer evidência. Task vai a REVIEW antes de DONE; coordenador verifica ownership/contratos e critérios. O painel único de progresso é [swarm/README](../swarm/README.md), e [TASKS](../swarm/TASKS.md) é fonte de IDs/dependências/status. Mocks não concluem persistência, integração ou offline. Pendência mecânica bloqueia somente capacidades afetadas; manter alternativa de leitura/backup quando possível.
