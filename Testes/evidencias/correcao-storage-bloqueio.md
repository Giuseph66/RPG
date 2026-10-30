# Bucket de imagens — bloqueio confirmado

Diagnóstico somente de leitura em 05/10/2026, usando a autenticação já existente da Firebase CLI. Nenhum faturamento, conta de cobrança ou plano foi alterado.

- SDK oficial da aplicação WEB no projeto rpg-c8827 confirmou storageBucket = rpg-c8827.firebasestorage.app, igual à configuração local.
- Cloud Billing API autenticada GET /v1/projects/rpg-c8827/billingInfo retornou HTTP 200 com billingEnabled = false.
- Cloud Storage API autenticada GET /storage/v1/b/rpg-c8827.firebasestorage.app retornou HTTP 404: The specified bucket does not exist.
- O SDK real de upload não criou bytes; o documento de mapa não foi marcado como imagem confirmada.

A documentação oficial exige plano Blaze para Cloud Storage for Firebase: [Requisitos de bucket e faturamento](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024). Logo, provisionar o bucket requer uma decisão de faturamento do proprietário. A tarefa de correção não autoriza assumir esse compromisso financeiro. O fluxo local deve preservar a imagem, explicar a indisponibilidade e permitir retentar depois da configuração.

C03 (envio/recebimento real de mapa) permanece sem aceite remoto. Esta evidência não é uma falha de nome do bucket nem permite declarar compartilhamento aprovado.
