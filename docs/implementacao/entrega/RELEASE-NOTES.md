# Release notes — snapshot aceito

**Data:** 2026-09-12
**Versão do pacote:** `0.0.0`
**Rule pack:** `phb-ptbr-local-2017@1.0.0`
**PWA:** `2026.09.11`
**Estado:** aceite integrado QA-004 completude e revalidação de cobertura
(`ACCEPT`).

## Incluído

- Shell React/Vite com rotas de seleção/ficha, ações, jornada/diário,
  compêndio, configurações e backup/recuperação, com navegação profunda e
  estados locais explícitos.
- Ficha, wizard inicial de personagem, progressão e estado de sessão com
  autosave/CAS conforme os serviços disponíveis.
- Regras puras de combate, condições, descanso, morte/estabilização e
  conjuração, com resultados auditáveis e pendências preservadas.
- Ações, inventário, campanha, diário e compêndio compostos sobre serviços
  reais; `spend-resource` e `consume-item` validam e persistem operações, e a
  campanha salva no IndexedDB volta ativa após reload.
- Exclusão de campanha e conteúdo usa transação atômica IndexedDB com rollback
  em falha, preservando assets compartilhados.
- Catálogo local consultável com busca, detalhe, fonte e favoritos por ID.
- Cobertura local publicada para as nove categorias antes incompletas: Regras
  (9), Combate (9), Atributos (6), Perícias (18), Armas (37), Armaduras (13),
  Descanso (6), Movimentação (7) e Aventura (9). Armas e Armaduras são
  subconjuntos dos equipamentos existentes; fontes, detalhes e favoritos foram
  revalidados.
- Rolagem com RNG injetado, overlay acessível e histórico local persistido.
- IndexedDB, preferências locais, backup versionado por API, migrações,
  recuperação de registros e painel de gestão em `/settings/data`.
- Manifesto, ícones, Service Worker versionado, cache de shell/corpus e
  fallback offline sem apagar IndexedDB, drafts ou dados da aplicação.
- Verificações aceitas de teclado, foco, contraste, responsividade, cenário
  offline, atualização PWA com draft pendente entre instâncias e code splitting
  no ambiente registrado. O entry tem 541932 bytes (limite 642400); a mesa 3D
  é carregada sob demanda em chunk separado.
- A validação QA-004 passou em 17 arquivos/110 testes focais e 92 arquivos/588
  testes completos.

## Limites conhecidos

- Não há backend, contas, sincronização, multiplayer/VTT, fog of war,
  automação completa de mestre, marketplace ou integração obrigatória com API.
- Anexos e read model de mapa real ainda não foram provados em fluxo completo da
  UI integrada.
- O catálogo publicado tem 1.383 entradas únicas e continua parcial em várias
  áreas. Aventura cobre somente regras mecânicas resumidas do Livro do
  Jogador; não inclui campanhas, PNJs, mapas ou procedimentos do Mestre.
  Decisões de fonte pendentes e opções que dependem da mesa continuam
  explicitamente bloqueadas, sem promoção automática a executáveis.
- O chunk lazy da mesa 3D permanece acima de 500 kB e gera aviso do Vite; o
  entry principal está dentro do limite e as rotas têm code splitting.
- A prova offline e o smoke foram feitos no Chromium em localhost alternativo
  (`5184`, preview `5185`); Android/iOS físicos, Safari, leitores de tela nativos, notch/safe
  area, zoom real de 200/400%, instalação/eviction, suspensão pelo sistema e
  atualização do worker durante draft em dispositivo real permanecem fora da
  prova local.
- O catálogo e as regras permanecem parciais por escopo contínuo; os 19 itens
  de `docs/criacao/decisoes/PENDENCIAS.md` continuam sem resposta e bloqueados
  até decisão explícita da mesa.
- A atualização do worker aguarda decisão explícita do host/UI. Nenhum reload
  ou `applyUpdate` automático ocorre.
