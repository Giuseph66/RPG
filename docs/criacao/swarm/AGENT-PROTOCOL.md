# Protocolo de agentes

## Entrada obrigatória

1. Ler [00-START-HERE](../00-START-HERE.md), este protocolo, tarefa atribuída, ownership, dependências e contratos citados.
2. Identificar fonte/pack `phb-ptbr-local-2017`, escopo V1, pendências aplicáveis e origem de cada regra. Livro fornecido prevalece sobre representação da ficha; não preencher lacunas com outra edição.
3. Confirmar no registro que tarefa está READY e todos predecessores estão DONE. Nenhuma tarefa pode usar status presumido de conversa privada.
4. Coordenador reserva tarefa e caminhos em uma única alteração de registro, incluindo responsável, branch/worktree quando usados, horário, revisão-base e heartbeat. Até a reserva aparecer, agente não edita.
5. Declarar arquivos previstos; produzir menor diff no ownership. Documentos desta etapa não são licença para instalar/testar sem a autorização aplicável à futura sessão.

## Status

| Status | Significado e saída |
| --- | --- |
| TODO | Trabalho não iniciado; aguardando dependências/priorização. |
| READY | Não iniciado; contratos e predecessores aceitos, sem impedimento. Pode ser reservado. |
| IN_PROGRESS | Reserva ativa; agente trabalha exclusivamente nos paths atribuídos. |
| BLOCKED | Impedimento explícito; registrar causa, caminho/contrato, dono e condição de desbloqueio. |
| REVIEW | Handoff e evidências entregues; integração/aceite ainda não aprovados. |
| DONE | Aceite da tarefa comprovado, revisão aprovada e integração pertinente verificada. |

Transições normais TODO→READY→IN_PROGRESS→REVIEW→DONE. IN_PROGRESS/REVIEW podem voltar a BLOCKED ou IN_PROGRESS com motivo. DONE não significa infalibilidade: regressão reabre tarefa e gates afetados, sem renomear IDs ou fingir novo trabalho independente. Coordenador registra correção do produtor; não adiciona dependência circular produtor→consumidor ao DAG original.

## Fronteiras

Contratos compartilhados pertencem a DATA-001, documentados em 09/10/11 e dados/schemas. Consumidor importa, nunca redefine Character/RuleResult/DiceRoll ou interfaces de repository localmente. UI não importa IndexedDB nem implementa fórmula; engine não conhece React/DOM/storage; definições imutáveis não guardam slots/HP atuais. External stores por agregado e serviço de aplicação separam comando, persistência e apresentação.

Um caminho tem um dono. Não editar “só uma linha” em ownership alheio. Abrir handoff de mudança com assinatura esperada, motivo, impacto e prova; dono corrige e consumidor atualiza depois do aceite. Configurações/package.json/vite.config.ts continuam CORE-001 mesmo em PWA. Relatórios QA pedem correção ao owner original; não autorizam refatoração global. Coordenador é único escritor em docs/criacao/swarm durante implementação; agente entrega proposta de status no handoff.

## Trabalho independente e integração

Contratos revisados antes de features. Stubs/mocks podem apoiar componente isolado após contrato congelado, identificados como tal; não satisfazem integração, persistência, offline ou checkpoints de sessão. Handoff registra exports/assinaturas, versão, erros e fixtures. Integrador CORE-002 conecta exports em seu arquivo, não invade features. Mudanças de contrato exigem DATA-001 e avaliação dos consumidores antes da retomada.

Agente sem trabalho READY não se autoatribui tarefa bloqueada nem cria escopo. Com 4/6/8/12 agentes, ocupar somente slots reais do DAG; revisão/read-only pode usar sobra com atribuição delimitada, sem competir por arquivos. Batimento/reserva expirados exigem conferência do estado de trabalho pelo coordenador antes de reatribuir; timeout sozinho não autoriza apagar diff.

## Saída

Entregar [handoff](HANDOFF.md), referência do diff, aceite itemizado e testes realmente executados com resultado/limites. “Não executado” deve permanecer explícito. Nunca marcar DONE porque arquivos existem ou suite usa apenas mocks. Falta de fonte vira pendência com citação e bloqueio somente do recurso afetado. Nenhuma implementação ocorreu na fase atual.
