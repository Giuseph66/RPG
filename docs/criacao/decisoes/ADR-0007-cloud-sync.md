# ADR-0007 — PWA offline-first com Firebase opcional (CLOUD-001)

Estado: adotado para implementação; Firebase Console, projeto e regras de produção ainda não configurados.

Data: 2026-09-12

Supersede: [ADR-0002 — dados locais e backup](ADR-0002-local-first.md), somente na parte que excluía backend, contas e sincronização. As regras de IndexedDB, backup, revisão e atomicidade continuam válidas.

## Contexto

O aplicativo precisa funcionar durante uma sessão sem rede, mas também precisa manter contas, personagens, campanhas, sessões e vínculos entre mestre e jogadores. A rede não pode ser pré-requisito para consultar ou registrar uma ação já carregada. Firebase será o serviço remoto opcional para identidade, Firestore e Cloud Storage; não haverá anúncio de backend disponível antes da configuração do projeto, das regras e dos testes de integração.

## Decisão

IndexedDB é a fonte de escrita imediata e o cache operacional local. Toda mutação válida grava primeiro no agregado local, com revisão, recibo idempotente e item de outbox. Um sincronizador assíncrono drena a outbox quando a sessão está autenticada e há rede; falha de rede mantém a alteração pendente e não impede o uso offline. A UI distingue `local`, `pending`, `synced`, `conflict` e `error`.

Firebase Authentication começa com email e senha. Provedores sociais, link mágico e outros métodos são alternativas futuras e não fazem parte do contrato inicial. A sessão autenticada identifica o usuário; nenhuma chave de cliente é tratada como segredo. Segredos administrativos e credenciais de servidor nunca vão para o bundle.

O Firestore guarda metadados e documentos estruturados. Bytes de imagens e outros assets ficam no Cloud Storage, com metadados e hash no Firestore. A camada de sincronização traduz o modelo local para o modelo remoto e nunca expõe o formato remoto diretamente à UI.

## Modelo remoto e relações

Os IDs locais estáveis continuam sendo IDs de documento. O namespace remoto é o usuário autenticado, e cada documento contém `ownerUid`, `createdAt`, `updatedAt`, `revision` e `schemaVersion` quando aplicável. Campos de servidor (`createdAt`, `updatedAt`) são preenchidos por timestamp confiável do Firebase.

| Coleção | Chave e conteúdo | Relações |
| --- | --- | --- |
| `users/{uid}` | perfil mínimo, preferências e timestamps | `uid` vem do Authentication; não armazenar senha |
| `campaigns/{campaignId}` | nome, regraset, configurações e estado resumido | `ownerUid` é o mestre/proprietário |
| `campaigns/{campaignId}/members/{uid}` | `role: master\|player`, status, convite e timestamps | liga usuários à campanha; um mestre proprietário, jogadores explícitos |
| `campaigns/{campaignId}/characters/{characterId}` | personagem e revisão | `ownerUid` é o jogador; `campaignId` liga à campanha |
| `campaigns/{campaignId}/journals/{journalId}` | entrada de diário e revisão | somente membros autorizados pela política da campanha |
| `campaigns/{campaignId}/maps/{mapId}` | mapa, pins e referências de asset | asset apontado por `assetId` |
| `assets/{assetId}` | metadados, hash, tamanho, ownerUid e caminho Storage | documento aponta para `gs://...`; bytes não ficam no Firestore |
| `outbox/{operationId}` (local) | operação serializável, comando, baseRevision e tentativas | não é coleção remota; cada usuário mantém sua fila local |

Personagem sem campanha pode ser privado do usuário. Um personagem ligado a uma campanha só é compartilhado por referência e autorização de `members`; a propriedade do documento não é inferida pelo nome ou pelo cliente. Diário, mapas e assets seguem o mesmo `campaignId` e não podem atravessar campanhas.

## Acesso, convites e segurança

O cliente pode solicitar convite, mas somente o mestre proprietário pode criar, revogar ou alterar o papel de membros. Convite contém token aleatório de uso único, expiração e campanha; sua aceitação é validada por Authentication e por regra transacional/server-side apropriada. O token não concede acesso por si só e não aparece em logs.

Firestore Security Rules devem exigir usuário autenticado, verificar `ownerUid`/membership e impedir que o cliente eleve seu próprio papel, altere `ownerUid`, reduza `revision`, escreva timestamps protegidos ou leia outra campanha. Storage deve exigir a mesma autorização, limitar prefixo por campanha/usuário, content-type permitido e tamanho máximo. Regras devem ser testadas no Emulator Suite antes de qualquer publicação. App Check e funções server-side para convites/limpeza são recomendados para a etapa de endurecimento, sem substituir as regras.

## CAS, outbox e conflitos

Cada comando remoto envia `expectedRevision`/`baseRevision` e usa transação ou precondition equivalente. Revisão divergente é conflito; o sincronizador não sobrescreve silenciosamente a versão remota nem faz merge semântico de ficha. Ele preserva a operação e o snapshot remoto/local, marca `conflict` e oferece revisão explícita, cópia ou descarte após backup. Operações idempotentes usam `operationId`/`commandId`; reenvio não duplica consumo, rolagem ou entrada.

Outbox não contém senha, token de Authentication ou bytes secretos. Backoff é limitado e persistente; falhas permanentes exigem ação visível. Escrita local bem-sucedida continua disponível mesmo se Firebase estiver indisponível.

## Migração, exclusão e limites

Dados locais existentes não são enviados automaticamente. A primeira vinculação exige autenticação, escolha explícita da conta/campanha e preview de quantos registros e bytes serão enviados. Migração é opt-in, versionada e retomável; exportação JSON local continua sendo fallback. Importação remota para local passa pelas mesmas validações e migrações do ADR-0002.

Excluir campanha remotamente exige confirmação do mestre e operação atômica ou saga recuperável com estado de exclusão; personagens privados e assets ainda referenciados por outro proprietário devem ser preservados. Falhas deixam a operação retomável, nunca uma falsa confirmação.

Limites iniciais de produto: 50 MiB por backup, 10 MiB por imagem e formatos raster permitidos conforme `dados/persistencia.md`; limites remotos devem ser configurados no servidor e refletidos no cliente. Quota, custo, retenção, privacidade e exclusão de conta devem ser definidos antes do lançamento.

## Alternativas consideradas

Manter apenas IndexedDB atende o offline, mas não contas nem colaboração entre dispositivos. Exigir Firebase para cada gravação quebra o requisito de sessão sem rede. Gravar diretamente no Firestore a partir da UI mistura autorização, conflito e estado visual. Um servidor próprio aumenta operação sem benefício necessário para a primeira sincronização.

## Consequências e critérios de aceite

O produto ganha conta e sincronização eventual, ao custo de autenticação, regras, quota, custo e resolução explícita de conflitos. A implementação só pode declarar CLOUD-001 concluído quando houver configuração não secreta, regras testadas no Emulator Suite, sincronização offline/online idempotente, migração opt-in comprovada, limites aplicados e documentação de privacidade. Até lá, Firebase é uma capacidade planejada/opcional e o caminho local continua completo.
