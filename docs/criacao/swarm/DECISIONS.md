# Decisões de coordenação

ADRs arquiteturais vivem em [decisoes](../decisoes/README.md); lacunas de fonte em [PENDENCIAS](../decisoes/PENDENCIAS.md). Este documento governa mudança, não cria segunda fonte arquitetural.

## Baseline

| Decisão | Contrato | Consequência |
| --- | --- | --- |
| Software não iniciado | Pedido documental. | Não instalar pacotes nem criar src nesta etapa. |
| Stack planejada | React + TypeScript + Vite; React Router. | Dependências somente na fase autorizada. |
| Estado local | External store por agregado + useSyncExternalStore; Context para injeção/UI pequena. | Sem Zustand obrigatório, sem mega-store, formulários locais. |
| Local-first | Ports e IndexedDB; localStorage só preferências pequenas. | UI independente de adapter/backend futuro. |
| Regras e dados | Engine pura; catálogo imutável; ID estável/sourceRef/versionamento. | Não derivar regras em componentes nem alterar definição por personagem. |
| Fonte | Pack `phb-ptbr-local-2017`, sem substituição por 2024/suplementos. | Divergências do arquivo fornecido viram pendências por capacidade. |
| Navegação | Quatro destinos + Dados global. | Nenhum quinto destino Dados ou duplicação Regras/Compêndio. |
| Contratos primeiro | DATA-001 em 09/10/11/dados-schemas como baseline. | Consumers importam; alterações revisadas antes da implementação dependente. |
| Ordem real | DAG de tasks, não números dos passos. | DATA-003 cedo; DATA-006 hardening do passo 14. |

## Alteração de contrato

Abrir decisão com problema verificável, alternativas, opção recomendada, compatibilidade, owners afetados, critério de aceite e rollback. DATA-001 decide assinatura com coordenador; mudanças que alteram produto/fonte não são inferidas por agente. Versionar contrato/fixtures e notificar consumidores pelo registro. Aprovação de uma assinatura não significa software implementado. Uma pendência de fonte pode impedir um único talento/classe/efeito sem bloquear compêndio genérico ou dados avulsos.

## Arbitragem

Conflito de ownership: matriz vence até transferência explícita. Conflito livro/ficha: fonte mecânica prevalece e diferença fica documentada. Conflito entre docs: 00-START-HERE aponta o canônico, ADR registra resolução e links afetados são corrigidos. Decisão que ampliar escopo/dependências deve atualizar TASKS, DAG e passos na mesma revisão. Não usar comunicação privada como contrato permanente.
