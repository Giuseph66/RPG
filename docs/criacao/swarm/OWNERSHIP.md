# Ownership — um escritor por caminho

Os caminhos são PROPOSTOS para implementação futura. O registro abaixo é exclusivo por tarefa; não há glob pai pertencente a um segundo owner. Diretórios somente leitura não concedem permissão de edição. Testes locais dentro da área seguem seu owner; pastas transversais tests/rules, integration, responsive, accessibility, offline e acceptance pertencem às tarefas QA indicadas.

| Owner/tarefa | Escrita exclusiva |
| --- | --- |
| CORE-001 | `.gitignore`<br>`package.json`<br>`package-lock.json`<br>`tsconfig.json`<br>`tsconfig.app.json`<br>`tsconfig.node.json`<br>`vite.config.ts`<br>`index.html`<br>`src/main.tsx`<br>`src/app/bootstrap.tsx`<br>`src/app/bootstrap.test.tsx`<br>`tests/setup.ts` |
| DATA-001 | `src/domain/contracts/**`<br>`src/application/ports/**` |
| UI-001 | `src/styles/**`<br>`src/components/ui/**` |
| DATA-002 | `src/data/rulepacks/**`<br>`src/data/rules/**`<br>`src/data/abilities/**`<br>`src/data/skills/**`<br>`src/data/dice/**` |
| DATA-003 | `src/infrastructure/persistence/indexeddb/**`<br>`src/infrastructure/preferences/**` |
| DICE-001 | `src/domain/dice/**` |
| STATE-001 | `src/application/character/**`<br>`src/application/campaign/**`<br>`src/application/settings/**`<br>`src/application/dice/**`<br>`src/application/state/**` |
| UI-002 | `src/components/layout/**`<br>`src/app/router.tsx`<br>`src/app/routes.ts`<br>`src/features/settings/**` |
| RULE-001 | `src/domain/rules/core/**`<br>`src/domain/rules/derived/**` |
| DICE-002 | `src/features/dice/**` |
| DATA-004 | `src/data/races/**` |
| DATA-005 | `src/data/classes/**`<br>`src/data/subclasses/**`<br>`src/data/backgrounds/**`<br>`src/data/feats/**`<br>`src/data/progression/**`<br>`src/data/character-templates/**` |
| CHAR-001 | `src/domain/character/creation/**` |
| CHAR-002 | `src/features/character/sheet/**` |
| CHAR-003 | `src/features/character/creation/**`<br>`src/features/character/selection/**` |
| CHAR-004 | `src/domain/character/progression/**`<br>`src/features/character/progression/**` |
| SPELL-001 | `src/data/spells/**` |
| ITEM-001 | `src/data/equipment/**` |
| ITEM-002 | `src/domain/inventory/**` |
| RULE-002 | `src/domain/rules/combat/**`<br>`src/domain/rules/conditions/**`<br>`src/domain/rules/rest/**`<br>`src/data/conditions/**` |
| SPELL-002 | `src/domain/spells/**` |
| UI-003 | `src/features/actions/**` |
| UI-004 | `src/features/inventory/**` |
| MAP-001 | `src/features/journey/map/**`<br>`src/domain/campaign/maps/**` |
| JOUR-001 | `src/features/journey/journal/**`<br>`src/features/journey/campaign/**`<br>`src/domain/campaign/journal/**` |
| COMP-001 | `src/features/compendium/**`<br>`src/application/compendium/**` |
| CORE-002 | `src/app/feature-registry.ts` |
| DATA-006 | `src/infrastructure/persistence/migrations/**`<br>`src/application/transfer/**`<br>`src/features/data-management/**` |
| PWA-001 | `src/infrastructure/pwa/**`<br>`public/manifest.webmanifest`<br>`public/icons/**`<br>`public/offline.html` |
| UI-005 | `tests/responsive/**`<br>`docs/implementacao/responsividade/**` |
| A11Y-001 | `tests/accessibility/**`<br>`docs/implementacao/acessibilidade/**` |
| QA-001 | `tests/rules/**`<br>`tests/fixtures/rules/**` |
| QA-002 | `tests/integration/**`<br>`tests/fixtures/backups/**` |
| QA-003 | `tests/offline/**`<br>`docs/implementacao/offline/**` |
| QA-004 | `docs/implementacao/qa/**`<br>`tests/acceptance/**` |
| REL-001 | `docs/implementacao/entrega/**` |

## Documentação e arquivos compartilhados

Durante a implementação, coordenador mantém somente metadados em `docs/criacao/swarm/**` e painel: reserva, lane/modelo/esforço, status, evidências, handoff, dependências aprovadas e decisão de integração. Alteração semântica de arquitetura/contratos vai ao responsável DATA-001 para revisão. Coordenador não edita produto. A arquitetura documental permanece baseline versionada. Agentes não modificam regras/fontes para fazer teste passar. `README.md` e demais arquivos fora da matriz exigem atribuição explícita antes de edição; não há ownership implícito “qualquer agente”.

Subagente Codex e Claude Code via MCP são executores temporários, não owners adicionais. Ambos recebem um único owner/tarefa, paths desta tabela e retornam handoff ao coordenador. Claude só usa lane `claude-sonnet` ou `claude-opus` quando a identidade/modelo efetivo estiver comprovado; fallback não altera ownership. A lane/modelo não cria permissão para editar path de outro owner.

CORE-001 possui somente arquivos de configuração nomeados, bootstrap e setup; CORE-002 possui somente feature-registry. UI-002 possui layout/router/routes e não o bootstrap. DATA-002 não possui `src/data/**` inteiro: catálogos de raças, classes, magias, condições e equipamento têm donos distintos. DATA-003 não possui migrations/transfer; DATA-006 não possui adapter IndexedDB. JOUR-001 e MAP-001 têm subdiretórios disjuntos. UI-003 possui apresentação de magias em Ações; SPELL-002 possui apenas domínio, evitando duas SpellCards concorrentes.

Se PWA precisar alterar vite.config.ts, PWA-001 envia mudança a CORE-001, que a executa com reserva exclusiva e devolve prova; não se transfere ownership informalmente. Se mapa precisar ampliar CampaignRepository, MAP-001 solicita DATA-001; não declara port paralelo. Correção de QA é solicitação ao dono, seguida de reteste afetado. Toda transferência real de ownership atualiza esta matriz e TASKS antes da edição; cópia de módulo não resolve conflito.

## Reservas corretivas de 04/10/2026

Para esta rodada, a reserva explícita por executor em [TASKS](TASKS.md#reabertura-corretiva--qa-de-04102026) agrupa os owners originais e é exclusiva. Não altera fronteiras de domínio nem permite dois escritores. Integração de `src/app/**` fica com corrigir_jogabilidade; shared UI/styles com corrigir_interface; cloud/journey com corrigir_colaboracao. Caminhos novos exigem registro antes de edição. Coordenador mantém somente documentação/coordenação e revisão.

Ajuste de reserva (04/10/2026): `corrigir_colaboracao` também possui `src/application/membership/**`, `src/application/session/**`, `src/application/campaign/**`, `src/domain/campaign/**`, `src/application/campaign-log/**`. Esses paths saem da reserva de jogabilidade (que não edita `src/application/campaign/**`). Integração bootstrap/router permanece com jogabilidade; contratos/ports não são transferidos automaticamente. Necessário pelo grafo atual de memberships/sessões e publicação de mapa.

Reserva adicional corrigir_colaboracao: `src/infrastructure/persistence/indexeddb/outbox-repository.ts` e `outbox-repository.test.ts`, recuperação de operações syncing abandonadas após reload. Nenhum outro adapter IndexedDB transferido. Coordenador identificou edição antes da reserva; regularizada sem conflito de writer, agente orientado a solicitar paths antes de futuras expansões.

Reserva adicional corrigir_jogabilidade: `src/data/classes/**` (inclui testes), escolhas iniciais de magia Bardo e grants/proficiências se necessário, conforme fonte/pack existente. Wizard continua corrigir_interface; assinatura integrada por handoff. Interface entregou 44 testes focais; revisão parcial, C13 escolhas de magia ainda pendente do domínio.

Segunda onda parcial — corrigir_interface continua writer de seus paths e recebe `vite.config.ts`, `src/features/dice/**`, `src/data/compendium/**`, `src/data/correto/**` exclusivamente para diagnóstico/redução de carga inicial (sem mudanças de conteúdo/regras). Pode produzir build/sourcemap diagnóstico com dependências existentes; não reduzir apenas nome/tamanho do entry se a carga inicial total permanecer igual. Bootstrap/router permanecem jogabilidade, integração via handoff. QA UI/backup mobile e produção permitida em dados sintéticos; viewport retornar ao original. Handoff adicional `Testes/correcao-performance.md`, evidências `Testes/evidencias/correcao-ui-*` e `correcao-performance-*`. No máximo três workers.

Reserva adicional corrigir_interface: `src/infrastructure/pwa/**` para preservar atualização/cache offline quando a divisão do bundle mudar, com prova de upgrade e cache aquecido; não mudar schema local.

Segunda onda jogabilidade: integração/triagem continua IN_PROGRESS; reserva adicional `src/data/rulepacks/manifest.ts` (checksum de classes alteradas, já revisado com 30 testes), `src/features/inventory/**`, `tests/setup.ts`, `tests/integration/**`, `tests/acceptance/**` para correções/provas pertinentes. Seus paths anteriores permanecem. Objetivo inclui zerar falhas bootstrap/router, sem diminuir cobertura/mascarar WebGL global; coordenar Dice/Compendium com interface. Suíte final/test/build em `Testes/evidencias/correcao-*`. QA jogador Chrome 4173 e colaboração com mestre ficam autorizados após build atual. Código/UI de terceiros segue ownership correspondente.

Reserva adicional corrigir_jogabilidade: `src/data/spells/**` para restaurar bônus/escala declarados na fonte local (Curar Ferimentos/Palavra Curativa), com manifesto/checksum e testes pertinentes. Sem liberação automática dos contratos; field existente preferível quando semântica suficiente.

Reserva adicional corrigir_jogabilidade: `src/components/layout/**` para corrigir estado de conexão do header (pending não equivale a live; erro de permissão não equivale a offline) e testes de composição. Journey/Collaboration continuam colaboração; props de sync integradas pelo router owner.

Transferência explícita para fechar performance: `src/app/bootstrap.tsx`, `src/app/bootstrap.test.tsx`, `src/app/feature-registry.ts`, `src/app/feature-registry.test.ts` e novo helper se necessário `src/app/lazy-compendium.ts` agora exclusivos de corrigir_interface; jogabilidade NÃO os edita, mantém router/routes/character-route-data e demais paths. Performance ainda IN_PROGRESS: entry 4471kB não reduziu carga; implementar lazy real sob esta reserva. QA Bardo encontrou 0 truques e 3 magias elegíveis, correção de conteúdo fica com jogabilidade; inventário 36px é jogabilidade em src/features/inventory/**. Backup copy/replace real precisa IAB (Chrome bloqueou upload file URI); persistência deve ser demonstrada.

Reserva adicional performance: `src/assets/icons/**` para corrigir alcance estático de Gi* sem alterar semântica/seleção de ícones; corrigir_interface mantém writer. `src/components/layout/**` segue jogabilidade: request de lazy DiceOverlay por handoff, não writer paralelo. Interface integra bootstrap/controller/Firebase/catalog conforme reserva; raiz continua sem implementar produto.

Reserva complementar formalizada — jogabilidade: `src/domain/contracts/definitions/spell.ts` para campo opcional compatível `bonusPerCastingSourceAbility` (os demais contratos não são transferidos); `src/data/rulepacks/phb-ptbr-local-2017/index.test.ts` e `tests/srd/relatorio.md` (relatório gerado pelos testes do catálogo alterado). Auditar todos consumidores do bônus de cura e regressões Bardo/Clérigo/ASI/upcast. Campo legado permanece compatível, sourceRefs continuam autoridade. Alterações atuais revisadas estruturalmente, aceite ainda depende de prova.

- Reserva complementar de correção C17: `public/pwa-worker.js` pertence exclusivamente a `corrigir_interface`, junto da política de cache PWA, para atualização verificável e compatível com chunks sob demanda.

- Recuperação 05/10: owners nativos encerraram com limite de uso confirmado. Sem delegação disponível, raiz assume somente correções restantes comprovadas e QA complementar; ownership anterior fica suspenso até retomada explícita. Primeira reserva exata: fluxo de importação em `src/app/router.tsx`, `src/app/bootstrap.tsx` e seus testes, por snapshot stale reproduzido após substituir backup. Não há novo worker ou mudança de modelo.

- 05/10 retomada após verificação oficial: ordinaryUsageAllowed=true, janela7%; colaboração/interface reativados, jogador anterior não pôde retomar (agent thread limit), substituído por `jogador_qa_final` Luna xhigh, limitado a Chrome e `Testes/correcao-jogador-final.md`/evidências respectivas. Produto volta aos owners. Interface reassume bootstrap com a correção flush/hydrate da raiz já aprovada no foco14 e recebe exclusivamente DataManagementRoute em router para fechamento de recovery/preview de backup. Demais trechos de router preservados; ninguém escreve esses paths em paralelo. Gate final completo reservado à interface quando cloud estiver estável.

- Interface: reserva adicional de `src/features/settings/SettingsPanel.tsx`, teste/tipos locais diretamente necessários e somente SettingsRoute em router, para acesso visível a Backup e recuperação usando navegação existente. Não autoriza outras seções do router.

- Reserva C02/C18: colaboração recebe `JourneyCampaign.tsx` e teste direto para aba de vínculo da própria ficha disponível ao jogador; mantém guards e não expõe comandos do mestre. Reserva estreita de interface em `router.test.tsx`: somente integração de Backup/Settings e reparo do helper/import de fireEvent necessário ao gate, preservando demais testes. `remote-sync-adapter.ts` (port) reservado à colaboração somente para resultado parcial de coleções recusadas, já integrado com runtime/pull.

- Interface recebe reserva estreita de `src/features/actions/Actions.tsx` e teste direto exclusivamente para labels de custo/tempo em português, mantendo execução e domínio.

- Recuperação de capacidade 05/10: ambos owners de produto encerraram novamente com Selected model is at capacity, confirmado por list_agents e tentativas repetidas no mesmo modelo permitido. Delegação de codificação indisponível; raiz assume exclusivamente CreateCharacterRoute em router.tsx/teste direto e CharacterCreationWizard.tsx/teste direto para ciclo seguro de draft já materializado. Nenhum overwrite de ficha existente; opção de cópia com novo ID; draft original preservado até criação concluída. Owners anteriores ficam suspensos nesses trechos até devolução explícita. QA jogador segue separado.

- Reserva raiz C14 ampliada apenas para `CreationWizardService` em creation/types.ts e adapter creationService em bootstrap.tsx/teste direto, pois a interface deixou uma retomada idempotente parcial antes do erro de capacidade. Raiz conclui guard de propriedade, limpeza honesta do draft e provas focais. Demais trechos continuam com owners já definidos.

- As tentativas de retomada dos dois owners encerraram novamente com capacidade do modelo. Raiz assume fechamento estreito restante: SessionPanel.tsx/teste direto (leitura de encontro sem comandos para jogador), public/pwa-worker.js e teste direto (preservar chunks do cliente anterior na atualização); compatibilidade portrait será reservada após localizar contrato exato. Sem delegação possível nesses pontos e sem troca de modelo.

- Retomada após continuação 05/10: agentes anteriores não aparecem mais em list_agents; temporários anteriores ausentes. Delegação restabelecida com Luna xhigh: fechar_sync_retratos assume paths portrait/adapter/worker delimitados no prompt; fechar_validacao assume wizard e apenas CreateCharacterRoute/test, PWA/cache/test e gate final quando liberado; jogador_fechamento só Chrome e novo relatório/evidências. Raiz preserva SessionPanel e QA mestre, sem editar produto com owner ativo. Necessário fechamento C05/C14/C17/C18, mantendo Storage bloqueado externamente.

- C05 causa remota comprovada: IDs de retrato raiz pertencem a outras contas; recusa get correta. fechar_sync_retratos recebe portrait-store.ts/test direto para namespace privado por conta users/{uid}/portraits/{assetId}, leitura compatível somente própria e preservação dos documentos raiz. Rules novas self/owner estritas passam em emulador e revisão raiz antes deploy. Fence sem recuperação da fila legítima não basta para aceite.

- C10 reteste integrado revelou mutação antecipada de PV ao rolar em revisão de magia, com confirmação bloqueada e cancelamento sem desfazer. fechar_validacao recebe Actions.tsx/test/tipos e capacidades/dispatcher responsáveis. Bootstrap handler dice será transferido após fechar_sync_retratos concluir composição portraitRemote, evitando writer paralelo. Não liberar gate final antes C05/C10 estáveis.

- C05 fonte revisada após reparo: mapper legado usa operation.ownerUid autoritativo, testes53 e typecheck verdes; cloud devolveu bootstrap após publicar composição portrait. fechar_validacao assume exclusivamente handler/integração dice em bootstrap/test pertinente para C10, sem editar retratos. Raiz publica somente firestore:rules após owner/namespace validado, depois QA jogador confirma retentativa. Gate final após C10 estável.

## Fechamento final — 05/10/2026

C05 privado aprovado local/remoto: regras publicadas, dois retratos novos owner correto, raízes de terceiros preservadas; GUI Sincronizado. C10 correção e QA passaram: revisão mostra slot/efeito, confirmação única aplica/gasta, cancelamento e roll isolado preservam PV/slot/reload. Correção de diagnóstico: a mutação legada registrada ocorreu após Confirmar execução; não se atribui à simples rolagem, pois controlador só registra histórico. Gate final1083/1 ignorado, typecheck/build0; assert do mock revisado e suíte repetida. Todos os owners concluíram/devolveram fonte; raiz revisou evidências e reindexou grafo8484/22208. C03 é a única pendência externa: bucket404 e billing false; nenhum compromisso financeiro autorizado. Estado de retomada em Testes/evidencias/correcao-fechamento-estado.json; não repetir matriz/gates sem mudança de fonte ou backend.

## Reabertura C03 — orientação base64 do usuário (05/10/2026)

Usuário reafirmou armazenamento dos mapas em base64. A premissa de Storage obrigatório foi rejeitada; MAP-001/CLOUD-001 e QA pertinente reabertos, sem ativar faturamento. Claude permanece indisponível pelo override vigente; reutilizar Luna xhigh, até3 filhos/profundidade1. Migration: preservar mapas antigos/local/retry/offline e publicar novos em base64 no Firestore, inclusive imagens grandes dentro do limite vigente10MiB, com fragmentos se necessário.

Reserva fechar_sync_retratos: contrato de transporte de mapas/AssetTransfer, novo adapter Firestore base64 e teste direto, integração bootstrap/cloud exports, map-publication e teste direto, consumidores diretos indispensáveis (declarar antes). Entregar esquema congelado antes de implementação para regras; nenhum write em firestore.rules. Não alterar fluxos de retratos/PV/wizard.

Reserva fechar_validacao: firestore.rules e teste/emulador isolado pertinente, índices apenas dos campos base64 se necessários, Testes/correcao-mapas-base64-regras.md. Aguardar esquema do produtor antes de editar regras. Revisar autorização mestre/visibilidade mapa/jogador e publicação completa/privacidade de bytes; não editar adapter/contratos/bootstrap.

jogador_fechamento fica QA Chrome, sem produto; será acionado após fonte/regras prontas. Raiz coordena/revisa/QA mestre e registros Testes/swarm. Gate final somente após integração estável.

## C03 base64 — integração revisada em 05/10/2026

Adapter e regras harmonizados, sem timestamps fora do contrato. Regras e override `chunks.data` publicados no Firestore existente com status 0. Mestre confirmou upload de 4.447 bytes e de 1.573.919 bytes; leitura remota administrativa reconstruiu conteúdo e conferiu digests, 1 e 3 chunks respectivamente. Emulador autenticado executou 2 testes com round-trip do adapter real e ACL. Focos: 39 testes; gate atual: 1.090 passaram/3 ignorados, typecheck/build status 0. Reindexação: 8.562 nós/22.421 arestas.

Produto devolvido pelos dois owners; nenhuma dependência ou faturamento ativado. Aceite final ainda aguarda QA Chrome jogador: renderização/reload/mobile e ocultação pareada. Raiz mantém ownership de consolidação e IAB mestre; jogador mantém Chrome e seu relatório. Não modificar produto nem repetir gates sem falha nova comprovada.

Retomada após interrupção: workers anteriores indisponíveis no inventário. Produto permanece devolvido, gates preservados; raiz consolida apenas relatórios. Reserva QA final exclusivamente Chrome e `Testes/correcao-mapas-base64-jogador.md` para `jogador_base64_ocultacao`, Luna xhigh, sem produto/testes/deps. Critério fechado: mapa grande ocultado sai do atlas/UI após sync/reload; pequeno público permanece imagem real. Servidor Vite 5173 reiniciado sem alterar fonte.

Atualização da retomada: `followup_task` do owner original foi aceito assincronamente e apareceu depois no inventário. Substituto `jogador_base64_ocultacao` interrompido imediatamente, sem reservar produto. Chrome/relatório novamente exclusivos de `jogador_fechamento`; não há dois operadores simultâneos autorizados.

## C03 — aceite final em 05/10/2026

MAP-001/CLOUD-001 no escopo da correção base64 aprovados. QA jogador confirmou grande ausente após ocultação/reload sem limpar cache; pequeno público continua imagem real. Mestre e jogador retomados após reinício Vite com dados persistidos. Gates atuais 1.090/3 ignorados, typecheck/build 0, regras 2/2 executadas separadamente, diff check limpo. Produto devolvido, QA/relatórios fechados, reservas corretivas C03 liberadas. Pendência anterior de Storage retirada: não é requisito de novos mapas base64. Outros gates históricos/dispositivos fora desta rodada não são promovidos por inferência.
# Reservas vigentes — SUP 11/11/2026

Estas reservas substituem somente os paths necessários das reservas históricas encerradas. Um escritor por arquivo; consumidor solicita mudança ao produtor.

| Owner | Escrita exclusiva nesta rodada |
| --- | --- |
| fontes_complementos / SUP-01 | `docs/fontes/complementos-2026-11/**`, `src/data/**`, `Testes/complementos-fontes.md`; criação/progressão de domínio somente após liberação pontual de SUP-02 |
| dominio_criaturas / SUP-02 | `src/domain/**` exceto paths explicitamente liberados a SUP-01; `src/application/**`, persistência necessária em `src/infrastructure/persistence/**`, `src/app/bootstrap.tsx` e teste direto; `Testes/complementos-dominio.md` |
| interface_criaturas / SUP-03 | `src/features/**`, componentes pertinentes em `src/components/**`, `src/app/router.tsx`, route-data/feature-registry e testes diretos; `Testes/complementos-interface.md` |
| coordenador | Metadados em `docs/criacao/swarm/**`; sem implementação/build/testes de produto |

Escopo amplo acima é fronteira, não autorização para refatoração geral. Cada worker declara arquivos exatos antes de editar. `CharacterCreationWizard.tsx` e `mapping.ts` contêm diff anterior do usuário e não podem ser restaurados ao HEAD.

Paths declarados SUP-01: `src/data/creatures/catalog.ts`, `src/data/races/fairy.ts`, `src/data/classes/tasha-ranger.ts` e testes diretos. SUP-02: contratos Character/rules/derived, `src/domain/creatures/**`, `src/domain/rules/wild-shape/**`, combate/derivação e campanha/criaturas; serviços character/wild-shape/dispatcher, campaign/creature-service, compendium, port de journey-visibility e bootstrap. SUP-03: Compendium, CharacterSheet, wizard, CreatureBoard/PlayerCreatureBoard, router e feature-registry, com tipos/CSS/testes diretos. Extensões concretas de persistência/sync devem ser declaradas antes da edição.

Extensão SUP-01: append localizado em `docs/criacao/14-CONTEUDO-E-FONTES.md` para as fontes novas. Extensão SUP-02: categoria de proposta no transporte JourneyVisibility existente; `firestore.rules`, teste de regras/emulador direto e adapter sync Firebase/teste pertinente (confirmar paths reais no handoff). Sem publicação remota antes de revisão e gates locais. Nenhum outro worker edita essas áreas.

Transferência SUP-02 → SUP-01 ratificada: `src/domain/character/creation/**` e `src/domain/character/progression/**` exclusivamente para seleção/validação/gravação dos complementos. `src/domain/contracts/definitions/rulepack.ts` e `src/domain/creatures/index.ts` permanecem SUP-02. Alterações dependentes aguardam contrato compartilhado, sem dois writers.

SUP-02 declarou ainda `src/domain/contracts/primitives.ts` e `src/domain/rules/core/modifiers.ts`: predicado de categoria de armadura para voo da Fada; resources de suplementos e fontes de conjuração raciais nos contratos pertinentes. Aprovação aditiva, sem refatoração geral de regras.

SUP-02 mantém exclusivamente `src/domain/rules/derived/derive-character.ts`, `src/domain/character/evolution/spell-state.ts` e `src/domain/rules/rest/index.ts` para consumidores de suplementos/racial spell sources, forma efetiva e recuperação. SUP-01 não edita spell-state; outros paths de evolution exigem declaração antes da edição.

SUP-02 declarou `src/domain/contracts/definitions/spell.ts` e `src/domain/spells/index.ts`: estado/payload de custo gratuito racial ou slot, validado e consumido atomicamente; IDs de recursos mutáveis não devem ser embutidos nas definições estáticas de magia.

Persistência SUP-02 declarada nominalmente: `src/application/ports/journey-visibility-repository.ts`, `src/infrastructure/persistence/indexeddb/schema.ts`, `journey-visibility-repository.ts`, `campaign-repository.ts`, `cleanup-manifest-reader.ts`, `remote-hydration-repository.ts`, `src/application/sync/index.ts`, `firestore.rules` e `src/infrastructure/cloud/firebase/firestore-sync-adapter.ts`, com testes diretos. Eventual store novo/DB v6 deve justificar mudança do plano inicial de reuso de guesses e provar migração preservadora, backup e cleanup.

SUP-QA-FORMA: transferido exclusivamente de SUP-02 para `qa_forma_selvagem` (Luna xhigh, leaf): `src/domain/rules/wild-shape/index.test.ts`, `Testes/complementos-qa-forma.md` e logs próprios `Testes/logs/qa-forma*`. Somente testes/evidência; código produto continua com SUP-02. SUP-01 encerrou implementação e está em REVIEW com34focais passados; slot de execução foi reutilizado, mantendo máximo3subagentes simultâneos.

Transferência narrow de recuperação SUP: `src/data/rulepacks/phb-ptbr-local-2017/index.ts` passa temporariamente de SUP-01 encerrado para SUP-02, exclusivamente para publicar `appendixACreatures` no `RulePack.creatures` base. Demais dados/criação/progressão continuam com SUP-01 em REVIEW. Novo parâmetro de facade foi descartado para preservar uma única fonte de catálogo no pack.

## Reserva vigente após recuperação — 12/11/2026

As reservas abaixo substituem os owners SUP anteriores, cujos handles não estão no inventário. Todos são Luna xhigh, leaf; máximo três ativos.

- `regras_retomada`: `src/domain/**`, exceto `src/domain/campaign/creatures/index.ts` e `src/domain/contracts/cloud-sync.ts`; `src/application/character/**`; bootstrap e teste; loader PHB local e teste; handoffs domínio/QA da forma. Assume também o novo teste `src/domain/rules/wild-shape/index.test.ts`, ainda ausente. Dados/criação/progressão em REVIEW só recebem correção se houver falha comprovada.
- `persistencia_retomada`: application/campaign, ports e sync pertinentes; infraestrutura pertinente; Firestore rules e harness pertinente; domain/campaign/creatures e contracts/cloud-sync; testes dessas áreas; novo `Testes/complementos-persistencia.md`. Não edita bootstrap: solicita wiring ao owner de regras.
- `interface_retomada`: features, componentes de criaturas, router/feature-registry e testes; handoff da interface e browser/logs/capturas isolados. Não edita domínio/aplicação/infra/dados/bootstrap.

Alterações anteriores staged e hunks de autoria ambígua são preservados. Nenhum stage/reset/commit foi solicitado. Mudanças de contrato exigem comunicação direta entre produtores e consumidores.

Extensões da retomada 12/11: `src/data/creatures/catalog.ts` (apenas mapper/tipagem, sem alterar estatísticas) fica com `regras_retomada`; `src/domain/contracts/backup.ts` e teste direto ficam exclusivamente com `persistencia_retomada`, para coleções opcionais de criaturas/avistamentos/palpites/propostas e leitura retrocompatível. UI não edita contratos de domínio.

SUP-02P extensão necessária ao backup: `src/application/transfer/backup.ts`, `types.ts`, `backup.test.ts` e `src/application/ports/backup-service.ts` são de `persistencia_retomada`. Wiring de `commitBackupEnvelope` permanece exclusivamente `regras_retomada` no bootstrap, após receber contrato de P.

SUP-02 extensão de fidelidade funcional: `src/data/classes/tasha-ranger.ts`, `src/data/races/fairy.ts` e testes diretos passam a `regras_retomada` somente para defeitos comprovados na auditoria dos benefícios passivos/recursos/casts. Anunciar causa/hunk antes; preservar valores/fontes revisados. O owner SUP-01 antigo permanece encerrado; não há quarto worker.

SUP-QA global reservado a `interface_retomada`, sem ampliar escrita de produto: executar somente após B/P/UI em REVIEW e liberação da coordenação. Falhas retornam ao owner do arquivo. Raiz não executa build/testes de produto. Logs/capturas de QA ficam com o executor.

Transferência SUP-CAT após auditoria integral: `src/data/creatures/catalog.ts`, `catalog.test.ts` e `Testes/complementos-catalogo-qa.md` passam exclusivamente a `persistencia_retomada`. Encerra a reserva narrow de mapper de B, cujas correções de tipagem devem ser preservadas. Corrigir somente divergências documentadas contra o Apêndice A: deslocamentos, segmentação/integridade de ações/traços/variantes e IDs únicos. Sem novo schema unilateral, reescrita do corpus, fonte externa ou normalização da fonte impressa. Gate global passa a exigir também REVIEW de SUP-CAT; janela de navegador aguarda estabilidade conjunta de dados e regras.

13/11: SUP-QA global transferido de C para `persistencia_retomada`, exclusivamente execução e `Testes/complementos-qa-geral.md`/logs próprios. B/P/cat e implementação UI congelados; C conserva browser/relatório interface e smoke pós-build. Raiz libera execução paralela dos dois ramos de validação, sem ampliar ownership de produto; falhas exigem retorno ao owner e revalidação pertinente.

Correções do gate13/11: P recebe extensão narrow de `tests/integration/session-persistence.integration.test.ts` para adequar o contrato obrigatório de journey no backup; mantém mapper de catalog.ts e backup/infra. B mantém erros de bootstrap/application-character/domain/loader e recebe `src/application/state/context.test.ts` somente para stub de CharacterRepository conforme contrato real. C mantém `src/app/router.test.tsx` e interface. Não remover validações nem enfraquecer contratos para aprovar testes. Logs da rodada falha preservados antes de reexecução.

QA de complementos13/11: B recebe somente `output/playwright/sup03-fixtures-regras-2026-11-13/` para gerar backups sintéticos Ranger10/11 pelos builders atuais, sem editar fonte ou perfil Chromium de C. Níveis avançados preparados por API devem ser distinguidos da criação/ações UI. C importa pelo fluxo normal e prova casts reais; concentração anterior deve preferencialmente nascer de conjuração normal, seguida pela variante de 1 minuto.

Correção de Druidismo13/11: extensão narrow a B de `src/data/spells/spells.ts` e teste direto para metadado de alvo assistido exclusivamente do Druidismo textual. Contratos de SpellTargetContext/SpellTargeting, validação canônica e capabilities/bootstrap continuam com B. Não liberar fallback mixed universal nem dispensar alvo de magia com dano/cura/efeito de estado. UI permanece com C após contrato anunciado.

B também possui `src/data/rulepacks/manifest.ts` apenas para atualizar checksums.spell pela função vigente após o metadado de Druidismo. Loader continua fail-closed; proibido executar correção ampla SRD/--aplica ou substituir validação por bypass.

QA de papéis: P recebe exclusivamente `output/playwright/sup03-roles-qa-2026-11-13/**`, sessões Chromium novas e `Testes/complementos-roles-qa.md`/logs próprios. Meta: submit jogador e aprovação mestre via UI, transporte entre perfis por backup normal explicitamente local, catálogo do jogador não registra visto automaticamente. Fixtures só para vínculos/memberships iniciais; não escrever submit/approval/seen diretamente no storage. Não operar perfis de C nem editar produto. Gates globais aguardam retorno do runtime e esta prova, sem ampliar limite de3workers.

Fechamento14/11: ownership temporário SUP liberado após revisão/gates/smoke dist7. Nenhum worker deve continuar editando produto nesta rodada. Perfis e dados de QA preservados; servidor próprio de C restaurado ao dev em 127.0.0.1:5173 (PID711677, HTTP200), sem tocar listener IPv6 ou projetos alheios. Raiz permanece orquestradora conforme política global do projeto.


NAV-CRIATURAS: writer exclusivo criaturas_navegacao (Luna xhigh), src/app/router.tsx/test, navegação estritamente relacionada, features/character/sheet, compendium e pontos de entrada collaboration/tipos; registry apenas ligação necessária. Sem domínio/persistência/dados. Raiz coordena e registra evidências; nenhum outro writer de produto nesta mudança.

NAV-CRIATURAS extensão focal: owner único também pode alterar contratos de categoria e application/compendium/catalogItemsFromPacks/testes diretamente necessários para indexar criaturas na busca comum. Sem alterar domínio de transformação, fonte ou persistência. Regras recebe consulta, sem controles de gerenciamento/avistamento.

NAV-CRIATURAS QA: interface_retomada, Luna xhigh, somente navegador em perfil novo output/playwright/nav-criaturas-2026-11-14, relatório Testes/nav-criaturas-qa.md/logs próprios. Não edita produto/não toca perfis antigos/não reinicia listeners. Depende de freeze do writer para evidência final.

NAV-CRIATURAS correção: mesmo writer autorizado a componentes/layout PrimaryNavigation/AppShell/layout.types e contratos/routes/configuração de navegação estritamente necessária para aba /creatures exclusiva contaMestre; testes diretos. QA interface_retomada pausado, sem novas navegações. Servidor5174 próprio preservado.

NAV-CRIATURAS writer concluído após focais/typecheck. Nenhum worker deve continuar editando esta mudança sem novo pedido. QA anterior interrompida; não há prova visual final desta correção de escopo.

NAV-CRIATURAS writer reativado criaturas_navegacao para tabs JourneyCampaign/tipos/testes, router/nav e CreatureCatalog/estilos/testes. Preservar acesso fichaDruida2, regra contaMestre para aba Jornada. Sem domínio/persistência/dados/novas dependências.

REGRAS-LINGUAGENS: criaturas_navegacao único writer para categoria/indexação application/compendium e dados informativos existentes de Regras/compendium/tests. Sem domínio/persistência/navCriaturas. Raiz coordena/fontes e docs swarm; nenhum outro worker necessário.
