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
