# Migrações e recuperação

Separar banco IndexedDB (estrutura de stores), schema de registro, formato de backup e versão do pack. Nenhum é inferido de appVersion. A V1 nasce schema1; não há migração legada real a executar nesta etapa.

## Contrato futuro

Cada migração declara fromVersion/toVersion, pré-condições, transformação determinística, campos preservados, validação pós-transformação e fixture antiga. Aplicar cadeia sem saltos, sobre cópia. Migração não consulta rede nem regra de outra versão por conveniência. Resultado deve preservar IDs, vínculos e valores conhecidos.

Upgrade do banco usa transação apropriada; conexões antigas recebem pedido de fechamento. Se aba impedir upgrade, UI explica e permite adiar, sem apagar banco. Dados de schema não suportado permanecem somente leitura/recuperação; write é bloqueado.

Antes de migração semântica, criar snapshot recuperável e oferecer exportação. Se não houver quota para cópia necessária, cancelar migração. Falha conserva versão anterior ou backup íntegro; não fazer rollback de schema por truncamento de campos.

## Mudança de ruleset

`phb-ptbr-local-2017@1.0.0 → outra versão` exige comparação de entidades usadas, escolhas que deixaram de ser válidas e mudanças nos derivados. Preview mostra diferença antes/depois; confirmação cria nova revisão. Caso sem regra migratória (subclasse removida, magia renomeada sem alias) fica pendente. Atualização cosmética nunca recupera recurso gasto.

## Corrupção

Detectar formato inválido, referência quebrada e hash de asset divergente. Não confundir erro de banco indisponível com registro ausente. Preservar material original para exportação; oferecer restaurar snapshot, importar backup ou reset seletivo. Não executar reset automático ao capturar exceção.

Aceite: migração de fixture antiga conserva todos campos especificados; erro no meio não produz estado misto; execução sobre versão já migrada é no-op; dois upgrades concorrentes não silenciam bloqueio; pack indisponível não corrompe save.
