# 15 — PWA e operação offline

Estado: DONE — aceite local registrado em [QA-004](../../implementacao/qa/QA-004-completude-2026-09-12.md); validações físicas externas permanecem pendentes.

Prioridade: P0.

Complexidade: Alta.

Dependências: CORE-002, DATA-006, COMP-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: UI-005, QA-003.

Tasks: PWA-001; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Permitir instalação e uso offline de sessão, com atualização segura do shell/conteúdo sem afetar dados locais.

## 2. Por que existe

Companion precisa continuar funcionando sem rede durante campanha; service worker mal planejado pode misturar versões ou perder draft no reload.

## 3. Escopo

Manifest, ícones, theme color/splash por plataforma, SW/cache/versionamento, offline shell/fallback, rotas profundas e fluxo de atualização.

## 4. Fora do escopo

Prometer prompts de instalação idênticos no iPhone/Android, backend, CDN obrigatória e reload forçado no meio da sessão.

## 5. Pré-requisitos

CORE-002, DATA-006 e COMP-001 aceitos; corpus offline mínimo identificado; configuração Vite pertence CORE-001 e muda por handoff.

## 6. Arquivos criados/modificados

Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/infrastructure/pwa/**`
- `public/manifest.webmanifest`
- `public/icons/**`
- `public/offline.html`

## 7. Contratos envolvidos

Metadados de versão de assets/ruleset/schema separados; eventos update-ready/activate-when-safe; serviço de persistência informa operações pendentes.

Fontes/documentos canônicos: [PWA offline](../07-PWA-OFFLINE.md), [Persistência](../08-PERSISTENCIA-LOCAL.md).

## 8. Fluxo

Preparar assets/conteúdo → instalar/cachear → reabrir sem rede → detectar atualização → avisar em superfície própria → concluir save/backup → ativar versão compatível.

## 9. Regras

Cache de assets não é banco de personagens. Limpeza de versão antiga não apaga IndexedDB. Offline shell deve resolver rotas profundas. Nem tudo fica disponível no primeiro acesso sem cache; estado de preparo é explícito.

## 10. Mobile

Orientação de instalação varia por plataforma; safe area/ícones e viewport após instalar; edição funciona em airplane mode após preparo.

## 11. Desktop

Instalação quando suportada, uso em janela e abas normais; atualização preserva fluxos e responde ao estado de outras abas conforme política.

## 12. Estados especiais

Primeiro acesso sem rede, cache parcial, versão antiga, SW esperando, draft pendente, storage indisponível e instalação não oferecida.

## 13. Armadilhas

Validar offline só no dev server; precache de imagem enorme; atualizar pacote sem compatibilidade; anunciar “tudo offline” com conteúdo ainda remoto.

## 14. Testes necessários e executados

Os gates locais foram executados e registrados em [QA-004](../../implementacao/qa/QA-004-completude-2026-09-12.md).

- **PWA-001**: 92 arquivos e 586 testes passaram na suíte completa; typecheck, build e diff passaram. O smoke Chromium cobriu rotas profundas, draft/update, overlay e fluxo móvel simulado. Android/iOS físicos, Safari, leitor de tela nativo, zoom físico, CAS entre abas reais e atualização de Service Worker em sessão real permanecem pendentes.

## 15. Critérios de aceite

- **PWA-001**: Instalação orientada por plataforma; rotas profundas e sessão funcionam offline após preparo; atualização espera operação/salvamento; dados IndexedDB não são apagados por limpeza de cache.

O aceite cobre os gates locais e o smoke Chromium documentados no QA-004. As verificações externas listadas acima continuam como limitações, sem serem declaradas como provadas.

## 16. Checklist

- [x] Preparar shell e conteúdo offline explícitos.
- [x] Adiar ativação durante operação pendente.
- [x] Provar atualização sem perda de dados nos gates locais.

## 17. Handoff

QA-003 recebe artefato/cenários/versões de cache e instrução de instalação; UI-005 recebe comportamento de viewport instalada.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
