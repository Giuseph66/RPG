# 08 — Persistência local

## Distribuição

IndexedDB armazena personagens, campanhas, diário, mapas, assets, histórico, favoritos, rascunhos e metadados. localStorage guarda preferências pequenas (tema, idioma, densidade), com validação e fallback; nunca ficha ou imagem. Memória guarda overlay aberto, filtros não salvos, gestos de mapa e snapshots. [Modelo](09-MODELO-DE-DADOS.md).

Banco futuro `rpg-companion`, versão inicial 1. Stores propostas: `characters`, `campaigns`, `journalEntries`, `maps`, `assets`, `rolls`, `favorites`, `drafts`, `commandReceipts`, `meta`, `recovery`. Índices por `campaignId`, `characterId`, `updatedAt` quando necessários; não indexar toda nota. Map pins pertencem ao agregado de mapa. NPCs, missões e objetivos pertencem ao agregado de campanha na V1, com IDs próprios.

## Repositórios e atomicidade

Todos métodos assíncronos; retorno tipado para ausência, validação, conflito, armazenamento indisponível, quota e schema incompatível. `CharacterRepository.get/list/save/delete`, `CampaignRepository.get/list/save/delete`, `SettingsRepository.get/update/reset`. `save` recebe revisão esperada e comando; devolve nova revisão após commit. Detalhes: [schemas](dados/schemas.md).

Operação que altera personagem, registra rolagem e grava recibo de comando usa uma transação sobre os três stores. Importação de campanha usa transação cobrindo todos agregados incluídos. Nenhum sucesso parcial. Ler revisão e escrever na mesma transação evita corrida entre abas. BroadcastChannel, quando disponível, apenas avisa invalidação; não oferece exclusão mútua nem substitui revisão. IndexedDB possui transações e eventos próprios de conclusão/abortamento: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).

## Autosave

Recurso/HP/inventário: fila serial por agregado e commit imediato, com indicação de operação pendente. Narrativa: debounce de 500 ms, máximo 2 s entre saves enquanto houver edição; parâmetros de UX, não regras de RPG. Rascunho é preservado se write falhar. Mudança de personagem, exportação, importação e atualização aguardam flush explícito. `pagehide` tenta flush, mas nenhuma garantia de execução é presumida.

Estado de gravação: `clean → dirty → saving → clean`; falha leva a `error`, colisão a `conflict`. `clean` só após confirmação durável. Segundo clique reutiliza comando pendente; recibo impede duplicação mesmo após reload. Não usar efeito React disparado por render como gatilho de consumo.

## Recuperação

Schema inválido é isolado em recuperação quando possível, preservando bytes originais; oferecer download do registro bruto, restaurar último snapshot válido ou importar backup. Banco indisponível permite visualizar dados já carregados e exportar snapshot em memória identificado como não salvo; não aparentar modo durável.

Manter último snapshot válido anterior a migração e a operações destrutivas. Quota insuficiente: cancelar transação, manter rascunho, permitir exportar e gerenciar imagens/histórico. Não apagar personagens para liberar espaço automaticamente. Detalhes: [migrações](dados/migracoes.md).

## Reset e exclusão

Reset de preferências afeta somente SettingsRepository. Reset de personagem exige seleção inequívoca, prévia e backup opcional; excluir personagem remove seus vínculos e registros próprios numa transação, sem apagar campanha e personagens irmãos. Excluir campanha oferece manter personagens sem campanha ou excluir o conjunto listado; decisão explícita. Reset completo enumera banco, preferências e caches afetados e exige modal próprio. Cancelar não escreve.

## Backup obrigatório

Exportar/importar personagem e campanha em JSON versionado, incluindo imagens incorporadas quando referenciadas, sem URLs temporárias. Download manual é responsabilidade visível do usuário; informar data do último backup, sem prometer cópia fora do navegador até download solicitado. Conteúdo local não tem criptografia ou privacidade contra outros usuários do dispositivo garantidas. [Formato e fluxo](dados/persistencia.md).
