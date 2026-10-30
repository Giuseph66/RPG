# Retratos privados — causa remota confirmada

05/10/2026. Diagnóstico somente de leitura com OAuth existente da Firebase CLI; sem alteração de dados/regra/faturamento.

Dois IDs encontrados no log dev (4bc8b5dc-5885-4c2f-8040-4be91982ccca e b89e7e31-acb5-40a7-8703-fe84085c4232) existem na coleção raiz portraits. Ambos têm revision1, schemaVersion1, createdAt timestamp e envelope de retrato completo. Seus ownerUid são diferentes entre si e diferentes do jogador atual da campanha f77.

A leitura foi limitada à identidade/envelope/tamanho, sem gravar ou exibir bytes/base64. Portanto a recusa de get para a sessão atual é coerente com a regra de propriedade publicada; falta de regra, bucket ou formato de timestamp não explica essa recusa. O namespace global de ID de asset permite colidir retratos privados reutilizados por sessões diferentes. A correção não pode sobrescrever esses documentos, trocar ownerUid, apagar fila ou reconhecer envio inexistente.

O owner de sincronização recebeu esse diagnóstico para implementar recuperação com isolamento de conta e compatibilidade não destrutiva. Aceite depende de testes de propriedade/CAS e prova do jogador após retentativa.
