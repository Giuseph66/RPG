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
# Checkpoints SUP — 11/11/2026

1. SUP-CP1: cinco anexos integralmente extraídos, hashes/páginas e campos dos blocos identificados; contratos aditivos publicados aos consumers.
2. SUP-CP2: Fada/Tasha opt-in e catálogo completo disponível; Forma Selvagem provada com bestas vistas, PV, excedente, retorno e persistência.
3. SUP-CP3: fluxo mestre/jogador, sugestões revisáveis e atributos efetivos integrados na interface existente.
4. SUP-CP4: testes pertinentes, typecheck/build e QA integrado registrados; aceite somente após revisão. Estado inicial: todos pendentes.

Heartbeat SUP-01: cinco extrações nativas gravadas; OCR separado concluído sem falhas em Tasha 162/162 páginas, Fada 1/1 e Apêndice A 24/24. Conferência visual/manifesto e aceite SUP-CP1 ainda pendentes. Contrato genérico v0.1 já compartilhado aos consumers.

Inventário raw final SUP-01: 95 blocos no Apêndice A (88 bestas, das quais 6 enxames; 4 monstruosidades, 2 plantas, 1 fada). Este inventário substitui a contagem preliminar 81; publicação no catálogo/testes ainda pendente. Mídia de três PDFs compactada por fonte com índice/hash, sem milhares de binários avulsos.

SUP-CP1 aceito pela coordenação: leitura independente do manifesto e hashing dos cinco originais confirmou 5/5 SHA-256; extrações existem com 162/1/24 separadores de página e 1 tabela por DOCX. Três ZIPs passaram CRC; 2.258 membros conferidos byte a byte em tamanho/SHA-256 contra media-index.csv, zero divergências. OCR integral/controle visual do owner estão registrados em `Testes/complementos-fontes.md`; contrato aditivo publicado e grafo reindexado. Isso aceita extração/proveniência, não catálogo/complementos funcionais nem SUP-02/03.

Revisão intermediária SUP: interface de Forma Selvagem ligada à ficha (catálogo elegível, PV, equipamento, duração manual e orçamento de ações), ainda sem aceite integrado. Auditoria independente de Tasha p.51–56 encontrou regras/transcrições incompletas no pacote de dados; SUP-01 está corrigindo custos, níveis de magia, textos e referências. Testes de formato ou componentes não substituem essa fidelidade à fonte. SUP-CP2/3/4 permanecem abertos.

## Aceite SUP — 14/11/2026

Estado vigente desta extensão, independente dos checkpoints históricos CP0–CP9:

| Gate | Estado | Evidência revisada pela coordenação |
| --- | --- | --- |
| SUP-CP1 | Aceito | Cinco originais/extrações e mídias conferidos conforme registro acima. |
| SUP-CP2 | Aceito após correção e prova no dist7 | Fada/Tasha opt-in; catálogo auditado 95/95; domínio e runtime de Forma Selvagem, pools separados, excedente, retorno e reabertura persistente. Casts gratuitos/espaços, material e concentração provados na UI; Incansável/Glamour aplicados. |
| SUP-CP3 | Aceito | Proposta real pending → mestre define ND/aprova → backup → jogador vincula ficha pela UI → catálogo 96/0 vistas sem reload; marcar visto exige ação separada. Custom vista/transformada persistiu em outro percurso documentado. Blocos/editor/sugestões e atributos efetivos integrados. |
| SUP-CP4 | Aceito | Rodada 7: 176 arquivos passaram/4 condicionais ignorados; 1.308 testes passaram/7 condicionais ignorados. Typecheck, build e ambos diff checks passaram. Dist7, mesmo perfil/origem: card8→17 imediatamente após Inconsciente (rev28), condição removida, nova forma8/original17/recurso2 de2 preservados após reload (rev30); console sem erros/avisos. |

Relatório consolidado: [SUP-ENTREGA.md](SUP-ENTREGA.md). Logs e limitações: [QA geral](../../../Testes/complementos-qa-geral.md), [interface](../../../Testes/complementos-interface.md), [papéis](../../../Testes/complementos-roles-qa.md). Snapshot avaliado: worktree sobre `7fb54db`, sem commit desta coordenação. Não há prova de sincronização hospedada; ACL de criaturas passou separadamente no emulador (3/3). Nenhum deploy desta rodada.

Finding posterior ao gate da rodada 5: no dist, inconsciência encerrou a forma e gravou PV17 originais, mas o card manteve PV8 até reload. SUP-CP2 reaberto nesse ponto; SUP-CP4 não aceito. Correção Luna no fluxo de publicação do store e prova imediata sem reload são obrigatórias.

Rodada 6: suíte1.306/7 condicionais ignorados, typecheck/build/diffs verdes; smoke do novo bundle repetiu o card stale (IDB rev24 sem forma/PV17; card8). Patch do store insuficiente para o fluxo real; CP2/4 permanecem abertos e owners investigam estado UI.

Fechamento vigente SUP, 14/11: causa final do card stale estava no estado local de Colaboração, que copiava PV do formulário anterior à normalização. Callback agora devolve projeção canônica persistida; painel atualiza só o card alvo. Focal13/13, rodada7 global1.308/7 condicionais ignorados, tipo/build/diffs e smoke novo passaram. SUP-CP2/4 novamente aceitos; SUP-CP1/3 mantidos. Captura independente revista pela coordenação: `output/playwright/sup03-qa-2026-11-12/production-cp4-round7-immediate-card.png`. Limitações de automação e prova local/emulador em SUP-ENTREGA permanecem explícitas.
