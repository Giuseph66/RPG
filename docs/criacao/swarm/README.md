# Swarm — painel de implementação

**FASE OFFLINE-FIRST EM EXECUÇÃO.** A fase local anterior permanece aceita. A expansão atual introduz integridade referencial, Firebase assíncrono, identidade preto/carmim, catálogo 3D e correções de regras sem tornar a rede obrigatória.

## Leitura e coordenação

Todo agente começa por [00-START-HERE](../00-START-HERE.md) e [AGENT-PROTOCOL](AGENT-PROTOCOL.md). [TASKS](TASKS.md) é o registro canônico; [OWNERSHIP](OWNERSHIP.md) define limites; [DEPENDENCIES](DEPENDENCIES.md) mostra DAG e capacidade real; [CHECKPOINTS](CHECKPOINTS.md) define provas; [HANDOFF](HANDOFF.md) padroniza entrega; [DECISIONS](DECISIONS.md) controla contratos; [RISKS](RISKS.md) rastreia riscos e [QA](QA.md) define aceite.

Usuário → coordenador `gpt-5.6-sol`/`high` → até 3 subagentes Codex `gpt-5.6-luna`. Coordenador só orquestra; produto é sempre delegado ao owner. Profundidade é 1: subagentes não delegam. Para descoberta estrutural, Codebase Memory é primeira fonte; busca textual é fallback. Sol/Astra nunca são modelos de subagente.

O override ativo mantém Claude Code indisponível e restringe toda delegação nova ao Luna. Ownership, DAG, handoff e limite de três agentes continuam obrigatórios.

Este painel responde o que existe/falta/pode começar. Somente o coordenador atualiza TASKS e este painel juntos após revisão, preservando IDs; suas edições limitam-se aos metadados de coordenação/integração, nunca ao produto do owner. Checkbox marcado significa implementação aceita. Espera normal por dependência aparece TODO; impedimento externo concreto vira BLOCKED com motivo/owner.

## Fundação, contratos e estado

- [x] **CORE-001** — Fundação e ferramentas planejadas · `DONE` · gates 3/3 · depende de: nenhuma.
- [x] **DATA-001** — Congelar contratos compartilhados · `DONE` · CAS e contexto transacional aceitos.
- [x] **DATA-002** — Loader e núcleo do rule pack · `DONE` · catálogos publicados e validados.
- [x] **DATA-003** — Repositories locais e transações base · `DONE` · IndexedDB, CAS e recovery aceitos.
- [x] **STATE-001** — Estado local e serviços de aplicação · `DONE` · stores e serviços aceitos.
- [x] **CORE-002** — Integrar features e serviços reais · `DONE` · seleção, diário, backup/importação e divisão por rota aceitos.

## Interface e dados de mesa

- [x] **UI-001** — Tokens e componentes fundamentais · `DONE` · validação de UI, estilos e typecheck aceitos.
- [x] **UI-002** — Shell, navegação e header · `DONE` · router, shell e prova desktop/mobile aceitos.
- [x] **DICE-001** — Engine de dados pura · `DONE` · validação focalizada aceita.
- [x] **DICE-002** — Overlay e histórico de dados · `DONE` · rolagem e histórico validados no navegador.
- [x] **UI-003** — Página Ações e execução de capacidades · `DONE` · execução real aceita.
- [x] **UI-004** — Interface de inventário · `DONE` · comandos de inventário aceitos.

## Personagem e conteúdo

- [x] **DATA-004** — Raças e sub-raças do material · `DONE` · catálogo e validação aceitos.
- [x] **DATA-005** — Classes, subclasses, antecedentes e talentos · `DONE` · catálogo aceito; wiring em DATA-002.
- [x] **CHAR-001** — Domínio de criação e validação · `DONE` · domínio aceito.
- [x] **CHAR-002** — Ficha rápida e expandida · `DONE` · ficha aceita.
- [x] **CHAR-003** — Wizard de criação e seleção · `DONE` · criação conectada aceita.
- [x] **CHAR-004** — Progressão e escolhas de nível · `DONE` · progressão aceita.
- [x] **SPELL-001** — Catálogo de magias e acesso · `DONE` · catálogo aceito.
- [x] **ITEM-001** — Catálogo de equipamentos · `DONE` · catálogo aceito; wiring em DATA-002.

## Regras e magia

- [x] **RULE-001** — Rules Engine e valores derivados · `DONE` · typecheck e testes focais aceitos.
- [x] **RULE-002** — Combate, condições, descanso e morte · `DONE` · domínio aceito.
- [x] **SPELL-002** — Conjuração e recursos mágicos · `DONE` · domínio aceito.
- [x] **ITEM-002** — Domínio de inventário e equipamento · `DONE` · domínio aceito.

## Jornada e consulta

- [x] **MAP-001** — Mapas, anexos e marcadores · `DONE` · interface aceita.
- [x] **JOUR-001** — Campanha, diário, missões e NPCs · `DONE` · interface aceita.
- [x] **COMP-001** — Compêndio local e favoritos · `DONE` · nove categorias publicadas e revalidadas.

## Persistência, PWA e qualidade

- [x] **DATA-006** — Backup, migrações e recuperação completa · `DONE` · recuperação aceita.
- [x] **PWA-001** — Instalação, cache e atualização offline · `DONE` · prova offline aceita.
- [x] **UI-005** — Auditoria responsiva e orçamento visual · `DONE` · matriz aceita.
- [x] **A11Y-001** — Auditoria de acessibilidade · `DONE` · R3-03/R4-01 aceitos na rodada 5.
- [x] **QA-001** — Prova determinística de regras · `DONE` · cenários aceitos.
- [x] **QA-002** — Integração de sessão e persistência · `DONE` · integração aceita.
- [x] **QA-003** — Prova de offline e atualização · `DONE` · prova offline aceita.
- [x] **QA-004** — Aceite final integrado · `DONE` · 110 testes focais, 588 completos, build e smoke offline aceitos.
- [x] **REL-001** — Polimento documental e entrega futura · `DONE` · evidência de aceite consolidada.

## Próximo movimento

Ativar e publicar o projeto Firebase, depois validar duas contas reais e sincronização entre dispositivos. A implementação local, regras, PWA, visual e QA já foram aceitos; conteúdo parcial da fonte e decisões de mesa pendentes continuam explicitamente rastreados.

## Expansão offline-first

- [x] **DATA-007** — Integridade referencial local · `DONE` · relações, reset e backup consistentes.
- [ ] **CLOUD-001** — Contas, Firebase e sincronização · `BLOCKED` · implementação local aceita; Console Firebase pendente.
- [x] **THEME-001** — Identidade preto e carmim · `DONE` · tokens, primitives e telas revalidados.
- [x] **DICE-003** — Catálogo 3D e orçamento de renderização · `DONE` · modelos e performance alinhados.
- [x] **RULE-003** — Correção de regras e relacionamentos · `DONE` · domínio, dispatcher e efeitos aceitos.
- [ ] **QA-005** — Aceite offline-first, visual e 3D · `BLOCKED` · gates locais aceitos; Firebase real/dispositivos pendentes.

## Correções após QA de 04/10/2026

Reabertura vigente de CLOUD-001/MAP-001/JOUR-001, RULE-002/003/SPELL-002/UI-003/STATE-001/UI-002/CORE-001/002 e CHAR-002/003/UI-001/COMP-001/DATA-006. Três executores Luna xhigh, com paths disjuntos e handoffs registrados em [TASKS](TASKS.md#reabertura-corretiva--qa-de-04102026). QA-004/005 e REL-001 aguardam revisão integrada; gates históricos não constituem aceite das correções. Desempenho e reteste serão a segunda onda.

## Reabertura C03 — orientação base64 do usuário (05/10/2026)

Usuário reafirmou armazenamento dos mapas em base64. A premissa de Storage obrigatório foi rejeitada; MAP-001/CLOUD-001 e QA pertinente reabertos, sem ativar faturamento. Claude permanece indisponível pelo override vigente; reutilizar Luna xhigh, até3 filhos/profundidade1. Migration: preservar mapas antigos/local/retry/offline e publicar novos em base64 no Firestore, inclusive imagens grandes dentro do limite vigente10MiB, com fragmentos se necessário.

Reserva fechar_sync_retratos: contrato de transporte de mapas/AssetTransfer, novo adapter Firestore base64 e teste direto, integração bootstrap/cloud exports, map-publication e teste direto, consumidores diretos indispensáveis (declarar antes). Entregar esquema congelado antes de implementação para regras; nenhum write em firestore.rules. Não alterar fluxos de retratos/PV/wizard.

Reserva fechar_validacao: firestore.rules e teste/emulador isolado pertinente, índices apenas dos campos base64 se necessários, Testes/correcao-mapas-base64-regras.md. Aguardar esquema do produtor antes de editar regras. Revisar autorização mestre/visibilidade mapa/jogador e publicação completa/privacidade de bytes; não editar adapter/contratos/bootstrap.

jogador_fechamento fica QA Chrome, sem produto; será acionado após fonte/regras prontas. Raiz coordena/revisa/QA mestre e registros Testes/swarm. Gate final somente após integração estável.

## C03 base64 — integração revisada em 05/10/2026

Adapter e regras harmonizados, sem timestamps fora do contrato. Regras e override `chunks.data` publicados no Firestore existente com status 0. Mestre confirmou upload de 4.447 bytes e de 1.573.919 bytes; leitura remota administrativa reconstruiu conteúdo e conferiu digests, 1 e 3 chunks respectivamente. Emulador autenticado executou 2 testes com round-trip do adapter real e ACL. Focos: 39 testes; gate atual: 1.090 passaram/3 ignorados, typecheck/build status 0. Reindexação: 8.562 nós/22.421 arestas.

Produto devolvido pelos dois owners; nenhuma dependência ou faturamento ativado. Aceite final ainda aguarda QA Chrome jogador: renderização/reload/mobile e ocultação pareada. Raiz mantém ownership de consolidação e IAB mestre; jogador mantém Chrome e seu relatório. Não modificar produto nem repetir gates sem falha nova comprovada.

## C03 — aceite final em 05/10/2026

MAP-001/CLOUD-001 no escopo da correção base64 aprovados. QA jogador confirmou grande ausente após ocultação/reload sem limpar cache; pequeno público continua imagem real. Mestre e jogador retomados após reinício Vite com dados persistidos. Gates atuais 1.090/3 ignorados, typecheck/build 0, regras 2/2 executadas separadamente, diff check limpo. Produto devolvido, QA/relatórios fechados, reservas corretivas C03 liberadas. Pendência anterior de Storage retirada: não é requisito de novos mapas base64. Outros gates históricos/dispositivos fora desta rodada não são promovidos por inferência.
