# Checkpoints de integração

Estado atual: **CP0 documental concluído em 2026-09-11; nenhum checkpoint de software concluído**. Evidência: [auditoria documental](../AUDITORIA.md). Os números agrupam aceites, não impõem ordem: CP2 (storage) pode anteceder CP1, porque shell usa estado restaurável.

| Gate | Pré-requisitos/tarefas | Evidência mínima | Estado |
| --- | --- | --- | --- |
| CP0 — Documentação | Árvore obrigatória, fontes, contratos, passos e swarm. | Links internos válidos; regras com fonte/pendência; DAG/ownership sem conflito; nenhum src criado. | **Concluído** — [evidência](../AUDITORIA.md). |
| CP1 — Shell + Design + Rotas | CORE-001, UI-001, UI-002, STATE-001. | Quatro destinos e header usáveis; dados global pode usar conteúdo ainda isolado; teclado/reflow básico; sem UI nativa proibida. | Não iniciado. |
| CP2 — Modelo + Persistência base | DATA-001, DATA-002, DATA-003, STATE-001. | Agregado real round trip; schema/revisão/versionamento distintos; conflito CAS e recuperação sem overwrite. | Não iniciado. |
| CP3 — Dados | DICE-001, DICE-002. | RNG injetável provado; faces/total/modos; header/FAB/contexto usam serviço único e histórico. | Não iniciado. |
| CP4 — Ficha e criação | DATA-004, DATA-005, CHAR-001..004, UI-004. | Criar ficha válida, campos PDF 1–3 cobertos, escolhas/progressão e equipamento restaurados. | Não iniciado. |
| CP5 — Rules Engine | RULE-001, ITEM-001, ITEM-002. | Fórmulas/precedência/proveniência e inventário com casos determinísticos da fonte. | Não iniciado. |
| CP6 — Combate + Magia | RULE-002, SPELL-001, SPELL-002, UI-003, QA-001. | Dano/concentração/morte/descanso/conjuração em engine real; recursos atômicos e cancelamento íntegro. | Não iniciado. |
| CP7 — Jornada + Compêndio | MAP-001, JOUR-001, COMP-001, DATA-006, CORE-002. | Campanha/anexos exportáveis, busca offline local, integração real e rotas profundas. | Não iniciado. |
| CP8 — PWA | PWA-001, QA-002, QA-003. | Artefato de produção inicia sem rede, preserva dados na atualização, falhas recuperáveis. | Não iniciado. |
| CP9 — QA e entrega | UI-005, A11Y-001, QA-001..004, REL-001. | Aceite responsivo/acessível/manual, riscos declarados, performance e regressões fechadas. | Não iniciado. |

Cada gate registra data, revisão/commit, ambiente, comandos, resultados, capturas quando úteis e limitações. Código existente ou componente com fixture não é prova de fluxo real. Falha bloqueadora mantém gate aberto; item não suportado por fonte fica explicitamente fora da capacidade entregue, com decisão de escopo, nunca desabilitado silenciosamente para aprovar.
