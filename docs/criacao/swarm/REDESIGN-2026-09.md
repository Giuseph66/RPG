# Redesign dark fantasy — 2026-09

## AUDIT-UX-001 — Auditoria estrutural

- Status: `DONE`
- Responsável: `/root/audit_shell`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `medium`; fallback por indisponibilidade Claude MCP.
- Escopo leitura: `src/styles/**`, `src/components/layout/**`, `src/app/{router.tsx,routes.ts,feature-registry.ts}`, `src/components/ui/**`, testes adjacentes.
- Saída: mapa de composição, tokens, rotas, dependências e limites de redesign; nenhum arquivo de produto alterado.

## AUDIT-UX-002 — Auditoria personagem, ações e dados

- Status: `DONE`
- Responsável: `/root/audit_character_actions_dice`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `medium`; fallback por indisponibilidade Claude MCP.
- Escopo leitura: `src/features/{character,actions,dice,dice3d}/**` e testes adjacentes.
- Saída: componentes, dados reais, callbacks preserváveis, estados vazios e riscos; nenhum arquivo de produto alterado.

## AUDIT-UX-003 — Auditoria jornada, compêndio e conta

- Status: `DONE`
- Responsável: `/root/audit_journey_account`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `medium`; fallback por indisponibilidade Claude MCP.
- Escopo leitura: `src/features/{journey,compendium,account,collaboration}/**` e testes adjacentes.
- Saída: componentes, dados reais, callbacks preserváveis, estados vazios e riscos; nenhum arquivo de produto alterado.

## Dependências e regra

Auditorias são somente leitura. Handoffs confirmam que dados, serviços, callbacks, estados vazios/erro/pendência, foco, diálogos e fontes são reais e devem ser preservados.

## Direção aprovada pelo pedido

- Paleta: carvão `#070A0B`, superfícies `#0C1113/#11191C/#17110D`, bronze `#A97845`, dourado `#D0AB72`, texto `#F0E4D4`, apoio `#B8AA9B`, carmesim `#C2484D`, sucesso `#829B5F`, arcano `#7694C9`.
- Tipo offline: Cinzel para display; Alegreya para leitura; controles legíveis conservam escala e contraste AA.
- Layout: mobile = header compacto + conteúdo em coterra + barra inferior com D20 elevado; >=768px = rail/sidebar, região principal até 1440px, sem duplicar árvores nem callbacks.
- Tratamento: painéis de grafite com borda bronze translúcida, ornamento contido por CSS/SVG, artes apenas em heróis/estados vazios/cartões de classe, jamais como screenshot de interface.
- Dependências explícitas do pedido: `@fontsource/cinzel`, `@fontsource/alegreya`, `@phosphor-icons/react`, `react-icons` (Game Icons); todas empacotadas localmente, sem CDN.

## REDESIGN-001 — Fundação visual, assets e primitives

- Status: `DONE`
- Responsável: `/root/redesign_foundation`
- Lane/modelo/esforço: Codex `gpt-5.6-luna` / `high`; fallback por override de indisponibilidade Claude MCP.
- Dependências: AUDIT-UX-001..003 `DONE`.
- Arquivos próprios temporários: `package.json`, `package-lock.json`, `src/assets/**`, `src/styles/**`, `src/components/ui/**` e respectivos testes locais.
- Transferência: para este redesign, CORE-001/UI-001 cedem somente os paths acima; demais owners não são alterados.
- Escopo: instalar deps locais; copiar/otimizar PNGs de `docs/imagens/uso` para WebP; registro central de artes/fallback; SVGs próprios `CampaignSigil`/`DiceD20Mark`; manifesto de licenças; tokens sincronizados; primitives premium/a11y.
- Fora de escopo: rotas, layout, domínio, armazenamento, engines e composição de features.
- Critério de aceite: assets lazy/eager corretos, fallback por classe, tokens CSS/TS em paridade e contraste, ícones sem CDN/ícone sem nome, primitives preservam APIs e testes focais passam.

## Próximas ondas

## REDESIGN-002 — Shell, navegação e dados

- Status: `DONE` — navegação, D20 e Conta→Colaboração integrados; testes focais, typecheck e gate REDESIGN-006 aceitos.
- Responsável: `/root/redesign_shell_dice`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `high`; fallback por override de indisponibilidade Claude MCP.
- Dependências: REDESIGN-001 `DONE`.
- Arquivos próprios temporários: `src/components/layout/**`, `src/app/{router.tsx,routes.ts}`, `src/features/settings/**`, `src/features/dice/**`, `src/features/dice3d/**` e respectivos testes locais.
- Escopo: header compacto, cinco destinos visuais + D20 global, rail responsivo, rota Collaboration compatível, overlay dark-fantasy sem duplicar controller/RNG/3D.

## REDESIGN-003 — Ficha, criação, progressão e ações

- Status: `DONE` — arte/dados reais e fluxos preservados; testes focais, typecheck e gate REDESIGN-006 aceitos.
- Responsável: `/root/redesign_character_actions`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `high`; fallback por override de indisponibilidade Claude MCP.
- Dependências: REDESIGN-001 `DONE`.
- Arquivos próprios temporários: `src/features/character/{sheet,selection,creation,progression}/**`, `src/features/actions/**` e testes locais correspondentes.
- Escopo: hero/empty/class artwork, ficha real, criação/progressão, ações rápidas reais; serviços, intents, fontes, drafts e estados preservados.

## REDESIGN-004 — Jornada, mapa, diário e compêndio

- Status: `DONE` — dados e interações reais preservados; testes focais, typecheck e gate REDESIGN-006 aceitos.
- Responsável: `/root/redesign_journey_compendium`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `high`; fallback por override de indisponibilidade Claude MCP.
- Dependências: REDESIGN-001 `DONE`.
- Arquivos próprios temporários: `src/features/journey/{campaign,journal,map}/**`, `src/features/compendium/**` e testes locais correspondentes.
- Escopo: campanha real, mapa/zoom/pan/marcadores, diário lista→editor mobile, NPCs/objetivos, busca/detalhe/favoritos locais; sem conteúdo falso.

## Próximas ondas

1. `REDESIGN-005` conta/colaboração após vaga de worker.
2. `REDESIGN-006` responsividade/a11y/regressões/gates após features.

## REDESIGN-001A — Alias de assets

- Status: `DONE` — `@assets/*` resolvido em TypeScript/Vite; typecheck aceito.
- Responsável: `/root/redesign_asset_alias`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `medium`; fallback por override de indisponibilidade Claude MCP.
- Dependências: REDESIGN-001 `DONE`.
- Arquivos próprios temporários: `tsconfig.app.json`, `vite.config.ts` e testes/configuração estritamente necessários.
- Escopo: expor alias `@assets/*` ao TypeScript e Vite sem alterar resolução existente; destravar imports de artwork/ícones e typecheck.

## REDESIGN-005 — Conta e colaboração

- Status: `DONE` — estado sync real, campanhas e mesa compartilhada integrados; testes focais e gate REDESIGN-006 aceitos.
- Responsável: `/root/redesign_account_collaboration`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `high`; fallback por override de indisponibilidade Claude MCP.
- Dependências: REDESIGN-001 `DONE`.
- Arquivos próprios temporários: `src/features/account/**`, `src/features/collaboration/**` e testes locais correspondentes.
- Escopo: perfil e sync reais; cards de mesas reais; Collaboration como entrada de conta sem remover rota/fluxos; créditos/licenças acessíveis; nenhum estado de Firebase/offline inventado.

## REDESIGN-002A — Estado real de sincronização

- Status: `DONE` — snapshot runtime traduzido e entregue ao router; 21 testes bootstrap/router + typecheck aceitos.
- Responsável: `/root/redesign_sync_wiring`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `medium`; fallback por override de indisponibilidade Claude MCP.
- Dependências: REDESIGN-002 e REDESIGN-005 em `REVIEW`.
- Arquivos próprios temporários: `src/app/bootstrap.tsx`, `src/app/bootstrap.test.tsx`.
- Escopo: observar o snapshot de sync já exposto no runtime e passá-lo ao `AppRouter`; sem criar/alterar sync, Firebase, armazenamento ou estado fictício.

## REDESIGN-006 — Gate integrado visual, acessível e de produção

- Status: `DONE` — `typecheck`, 767 testes, build e smoke Playwright 320–1440 aprovados; sem overflow/erros de console.
- Responsável: `/root/redesign_qa`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `high`; fallback por override de indisponibilidade Claude MCP.
- Dependências: REDESIGN-001..005 e REDESIGN-001A/002A em `REVIEW`.
- Arquivos próprios: nenhum; diagnóstico somente leitura. Relatórios permanecem no handoff ao coordenador.
- Escopo: `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`; smoke visual Playwright em 320/390/768/1024/1440, nav/D20/Conta→Colaboração e foco básico. Falha retorna ao owner, sem edição QA.

## REDESIGN-007 — App bar fiel à referência

- Status: `DONE` — app bar fiel à referência; 5 testes focais, typecheck e diff check aprovados.
- Responsável: `/root/redesign_app_bar_terra`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `high`; autorizado explicitamente pelo usuário em 2026-09-13.
- Dependências: REDESIGN-001, REDESIGN-002 e REDESIGN-006 `DONE`.
- Arquivos próprios temporários: `src/components/layout/Header.tsx`, `src/components/layout/AppShell.tsx`, `src/components/layout/layout.module.css`, `src/components/layout/AppShell.test.tsx`.
- Escopo: app bar compacto com sigilo, título fixo do produto, contexto real e engrenagem; remover visual de dashboard da barra; preservar D20 global no rail/mobile e todos os callbacks/rotas.

## REDESIGN-008 — D20 flutuante sobre Jornada

- Status: `DONE` — cinco destinos em ordem, Jornada central e D20 independente/flutuante; 5 testes focais, typecheck e diff check aprovados.
- Responsável: `/root/redesign_app_bar_terra`
- Lane/modelo/esforço: Codex `gpt-5.6-terra` / `high`; autorizado explicitamente pelo usuário.
- Dependências: REDESIGN-007 `DONE`.
- Arquivos próprios temporários: `src/components/layout/PrimaryNavigation.tsx`, `src/components/layout/layout.module.css`, `src/components/layout/AppShell.test.tsx`.
- Escopo: cinco destinos igualmente distribuídos na ordem Ficha, Ações, Jornada, Regras, Conta; Jornada central; D20 absoluto/flutuante acima da coluna Jornada e acionador independente do destino.
