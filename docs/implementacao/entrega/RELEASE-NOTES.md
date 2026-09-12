# Release notes — snapshot aceito

**Data:** 2026-09-12
**Versão do pacote:** `0.0.0`
**Rule pack:** `phb-ptbr-local-2017@1.0.0`
**PWA:** `2026.09.11`
**Estado:** aceite integrado QA-004, rodada 5 e revalidação de cobertura
(`ACCEPT`).

## Incluído

- Shell React/Vite com quatro destinos primários, navegação por rota profunda e
  estados locais explícitos.
- Ficha, wizard inicial de personagem, progressão e estado de sessão com
  autosave/CAS conforme os serviços disponíveis.
- Regras puras de combate, condições, descanso, morte/estabilização e
  conjuração, com resultados auditáveis e pendências preservadas.
- Ações, inventário, campanha e compêndio compostos sobre serviços reais; a
  campanha salva no IndexedDB volta ativa após reload.
- Catálogo local consultável com busca, detalhe, fonte e favoritos por ID.
- Cobertura local publicada para as nove categorias antes incompletas: Regras
  (9), Combate (9), Atributos (6), Perícias (18), Armas (37), Armaduras (13),
  Descanso (6), Movimentação (7) e Aventura (9). Armas e Armaduras são
  subconjuntos dos equipamentos existentes; fontes, detalhes e favoritos foram
  revalidados.
- Rolagem com RNG injetado, overlay acessível e histórico local persistido.
- IndexedDB, preferências locais, backup versionado por API, migrações e
  recuperação de registros.
- Manifesto, ícones, Service Worker versionado, cache de shell/corpus e
  fallback offline sem apagar IndexedDB, drafts ou dados da aplicação.
- Verificações aceitas de teclado, foco, contraste, responsividade e cenário
  offline no ambiente registrado.

## Limites conhecidos

- Não há backend, contas, sincronização, multiplayer/VTT, fog of war,
  automação completa de mestre, marketplace ou integração obrigatória com API.
- Backup/importação não tem rota montada; diário, anexos e read model de mapa
  real também não foram provados na UI integrada.
- O catálogo publicado tem 1.383 entradas únicas e continua parcial em várias
  áreas. Aventura cobre somente regras mecânicas resumidas do Livro do
  Jogador; não inclui campanhas, PNJs, mapas ou procedimentos do Mestre.
  Decisões de fonte pendentes e opções que dependem da mesa continuam
  explicitamente bloqueadas, sem promoção automática a executáveis.
- O bundle validado tem um único chunk JavaScript de 596,68 kB (gzip 169,33 kB),
  com aviso do Vite acima de 500 kB; code-splitting por rota não está presente.
- A prova offline foi feita no Chromium 147 em localhost. Android/iOS,
  Safari, leitores de tela nativos, notch/safe area, zoom real de 200/400%,
  CAS entre abas reais e atualização do worker durante draft permanecem fora
  da prova.
- A atualização do worker aguarda decisão explícita do host/UI. Nenhum reload
  ou `applyUpdate` automático ocorre.
