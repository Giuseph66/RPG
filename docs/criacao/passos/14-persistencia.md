# 14 — Persistência, backup e recuperação

Estado: TODO — implementação não iniciada.

Prioridade: P0.

Complexidade: Alta.

Dependências: DATA-001, CHAR-003, CHAR-004, JOUR-001, MAP-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: STATE-001, PWA-001, QA-002.

Tasks: DATA-003, DATA-006; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Garantir armazenamento local consistente e transferível por JSON versionado, com recuperação e migrações explícitas.

## 2. Por que existe

Browser pode apagar storage; sem backup manual o usuário não possui portabilidade. Adapter desacoplado permite backend futuro sem reescrever UI.

## 3. Escopo

DATA-003 cedo: IndexedDB/ports/CAS/transações. DATA-006 depois dos agregados reais: export/import personagem/campanha/anexos, migrações e resets.

## 4. Fora do escopo

Supabase/Firebase atual, autenticação, sincronização, prometer armazenamento permanente e UI escrevendo banco diretamente.

## 5. Pré-requisitos

DATA-003 requer apenas contratos; STATE-001 depende dela. DATA-006 requer domínio/campanha/mapa existentes. A numeração 14 não adia persistência até o fim.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/infrastructure/persistence/indexeddb/**`
- `src/infrastructure/preferences/**`
- `src/infrastructure/persistence/migrations/**`
- `src/application/transfer/**`
- `src/features/data-management/**`

## 7. Contratos envolvidos

CharacterRepository/CampaignRepository/SettingsRepository; revision CAS, schemaVersion, migrations e envelope JSON com metadados/ruleset/anexos conforme schemas.

Fontes/documentos canônicos: [Persistência local](../08-PERSISTENCIA-LOCAL.md), [Migrações](../dados/migracoes.md), [Schemas](../dados/schemas.md).

## 8. Fluxo

Hidratar → validar comando → gravar atomicamente por revisão → confirmar salvo; para import: ler/validar → prévia/conflitos → migrar cópia → commit → reler; para export: snapshot consistente → envelope → download.

## 9. Regras

localStorage só preferências pequenas; IndexedDB para estado relevante/anexos; memória para UI transitória. Versão futura rejeitada com dados intactos. Reset seletivo não apaga outros agregados; completo exige modal próprio.

## 10. Mobile

Backup/importação com controles de toque e texto direto; teclado/formato não encobrem prévia; aviso local-only no fluxo pertinente.

## 11. Desktop

Prévia mostra entidades/anexos/conflitos; diálogo permite exportar antes de substituir/apagar; sem alert/confirm/prompt.

## 12. Estados especiais

Quota, transação abortada, corrupção, migração falha, ID colidente, JSON inválido/versão futura, anexo ausente e concorrência em abas.

## 13. Armadilhas

Autosave sobrescrever estado novo com debounce antigo; importar parcialmente; apagar banco para “corrigir”; confundir revision e schemaVersion; exportar só metadados do mapa.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **DATA-003**: Round trip, atualização concorrente em duas conexões, falha de transação/quota, leitura inexistente e reabertura; harness isolado não representa prova offline final.
- **DATA-006**: Round trip real com anexos, migrações encadeadas, JSON inválido/malicioso, IDs colidentes, quota, corrupção, falha atômica e backup manual.

## 15. Critérios de aceite

- **DATA-003**: Criar/ler/gravar/listar agregados e anexos por ports; conflito de revisão é erro tipado; settings pequenos em localStorage; commit confirmado antes de status salvo.
- **DATA-006**: Exportação→importação preserva identidade/vínculos conforme política; versão futura rejeitada sem apagar dados; import preview define conflito antes do commit; reset próprio preserva outros agregados.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Entregar adapter cedo por contrato.
- [ ] Provar round trip personagem/campanha com anexos.
- [ ] Preservar original em erro e conflito.

## 17. Handoff

STATE-001 recebe adapter inicial; PWA-001 recebe garantias e limites de save/migration; QA-002 recebe backups versionados e cenários de falha.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

