# Backup JSON e operações de persistência

## Envelope de exportação, versão 1

Campos: `format: rpg-companion-backup`, `formatVersion: 1`, `exportedAt`, `appVersion`, `kind: character|campaign`, `schemaVersion`, `rulesetRefs[]`, `rootId`, `records{characters,campaigns,journalEntries,maps,rolls,favorites}`, `assets[]`, `manifest{counts,hashes,historyRange?}`. Coleções não aplicáveis vazias, nunca omitidas ambiguamente.

Asset exportado: id, mediaType, encoding=base64, bytes, hash, width, height. Blob URLs não saem do navegador. Hash detecta corrupção acidental; não autentica autoria. Exportação do personagem inclui retrato e dependências pessoais; remove vínculo com campanha não incluída e preserva seu nome como metadado informativo. Exportação de campanha inclui seus personagens, notas, mapas, NPCs, missões, assets e referências internas. Definitions licenciadas não são embutidas automaticamente: backup declara pack exigido e pode trazer pack privado em seção separada, apenas por escolha explícita de conteúdo.

## Exportar

Flush rascunhos → snapshot consistente numa transação de leitura → resolver fechamento de referências → codificar assets → validar envelope → apresentar nome/quantidade/tamanho → download. Erro não atualiza “último backup” como sucesso. Timestamp registra solicitação de download, sem garantir que sistema externo conservou arquivo.

## Importar

1. Escolher arquivo pelo seletor de arquivos do sistema; proibição de alert/confirm/prompt não impede acesso nativo a arquivos.
2. Verificar tamanho antes de parse e limites de profundidade/coleções/textos/imagens; proposta inicial 50 MiB por backup e 10 MiB por imagem, ajustável por ADR e dispositivo.
3. Validar JSON, formatVersion/schemaVersion, hashes, IDs, referências e disponibilidade de pack.
4. Migrar cópia em memória; nunca arquivo original nem banco ativo.
5. Mostrar prévia: tipo, conteúdo, versões, conflitos, avisos e tamanho estimado.
6. Padrão “importar cópia”: novos UUIDs e remapeamento integral de vínculos internos; referências estáticas preservadas. “Substituir” exige seleção explícita e revisão esperada, mais snapshot anterior.
7. Commit único sobre stores afetados; falha em asset ou personagem aborta tudo.
8. Reabrir via repositório e validar fechamento; só então selecionar importado.

Pack ausente: mostrar nome/versão e conservar arquivo/draft recuperável; não substituir por regra de outra edição. Schema futuro: recusar escrita, explicar versão incompatível e permitir guardar arquivo original. IDs duplicados dentro do mesmo backup são erro, não deduplicação heurística.

## Proteções e casos de aceite

Strings são texto simples, não HTML. Não buscar automaticamente URL de asset importado. Rejeitar tipos não suportados, decompression/image bombs por dimensões, contêiner cíclico e números não finitos. Base64 aumenta tamanho: estimativa de quota usa bytes decodificados e metadados.

Round-trip conserva escolhas, PV, recursos, moedas, mapas, pins, relações e texto; UUIDs mudam somente na opção cópia. Cancelar prévia não escreve. Importação com referência inexistente aborta. Falha na última imagem não deixa personagens soltos. Exportar durante fila dirty aguarda ou informa que não pode produzir snapshot salvo.

## Sincronização remota opcional (CLOUD-001)

IndexedDB recebe a mutação primeiro. O sincronizador autenticado lê a outbox e envia documentos para Firestore sob `ownerUid`/membership, usando `expectedRevision` e `operationId`; assets seguem para Cloud Storage e deixam apenas hash/metadados no Firestore. Sem rede, a fila permanece local e a UI mostra `pending`. Revisão divergente vira `conflict` com cópias preservadas; nenhum merge ou sobrescrita silenciosa é permitido. A primeira sincronização é opt-in, com preview, limites e snapshot/exportação anterior. O contrato completo, convites e regras de segurança estão em [ADR-0007](../decisoes/ADR-0007-cloud-sync.md).
