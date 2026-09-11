# ADR-0002 — Dados locais e backup

Estado: adotado no plano.

## Decisão

IndexedDB guarda agregados e assets; localStorage somente preferências pequenas; memória somente transitório/snapshots. Repositórios assíncronos isolam IO. Comandos mutáveis recebem ID e revisão esperada; operações compostas usam transação. Exportação/importação JSON de personagem e campanha é parte da V1, não melhoria opcional.

## Alternativas

localStorage para ficha/imagem não atende transações compostas e dimensão esperada. Banco remoto contraria escopo. Salvar tudo num blob único dificulta conflitos, reset seletivo e edição paralela. Persistir apenas ao fechar perde alterações quando ciclo de vida interrompe.

## Consequências

Não existe sync, segurança contra outras pessoas no dispositivo nem backup externo automático. Conflito entre abas é visível; UI distingue salvo/pendente/erro. Expulsão de dados pelo navegador é possível, por isso backup manual. [Estratégia](../08-PERSISTENCIA-LOCAL.md), [formato](../dados/persistencia.md), [migrações](../dados/migracoes.md).
