# Protocolo de agentes

## Topologia obrigatória até REL-001

Usuário conversa somente com o **coordenador**. Coordenador usa `gpt-5.6-sol` com raciocínio `high` e atua somente como orquestrador: decompõe trabalho, consulta Codebase Memory antes de descoberta estrutural, reserva tarefas, escolhe lane/modelo/esforço, revisa handoffs e integra metadados de coordenação. Não implementa produto.

Coordenador pode manter no máximo **três subagentes Codex simultâneos**, em profundidade máxima 1. Subagente Codex usa exclusivamente `gpt-5.6-luna` ou `gpt-5.6-terra`; `gpt-5.6-sol` e `gpt-6-astra` são proibidos como subagentes. Coordenador escolhe modelo e esforço por complexidade, risco, superfície de ownership, incerteza e evidência exigida:

| Perfil | Lane Codex padrão | Esforço |
| --- | --- | --- |
| Leitura localizada, inventário, revisão simples | Luna | low/medium |
| Implementação isolada, teste focal, integração delimitada | Terra | medium/high |
| Contrato, migração, regra crítica, investigação difícil | Terra | high/xhigh |

Claude Code é leaf subordinado ao mesmo coordenador, ownership e handoff. A cópia estável `mcp-agents` 0.30.0 seleciona modelo por ambiente: MCP `claude-sonnet` usa Sonnet/`medium`, com fallback de **modelo** Opus na própria lane; MCP `claude-opus` usa Opus/`xhigh`, com fallback de **modelo** Sonnet na própria lane. Fallback não troca servidor/MCP. Sonnet atende tarefas simples/médias; Opus atende tarefas complexas/críticas. São as únicas famílias Claude permitidas. Antes de cada uso, coordenador comprova identidade/modelo efetivo da lane; sem essa prova, não prometer nem iniciar lane Claude.

Nenhum subagente cria outro agente. Delegação não transfere ownership: um agente por path, uma tarefa reservada, um handoff ao coordenador.

## Entrada obrigatória

1. Ler [00-START-HERE](../00-START-HERE.md), este protocolo, tarefa atribuída, ownership, dependências e contratos citados.
2. Identificar fonte/pack `phb-ptbr-local-2017`, escopo V1, pendências aplicáveis e origem de cada regra. Livro fornecido prevalece sobre representação da ficha; não preencher lacunas com outra edição.
3. Confirmar no registro que tarefa está READY e todos predecessores estão DONE. Nenhuma tarefa pode usar status presumido de conversa privada.
4. Coordenador consulta Codebase Memory como primeira opção para descobrir estrutura, símbolos, chamadas e arquitetura; usa busca textual somente para literais/configuração ou quando o grafo não bastar.
5. Coordenador reserva tarefa e caminhos em uma única alteração de registro, incluindo responsável, lane/modelo/esforço, branch/worktree quando usados, horário, revisão-base e heartbeat. Até a reserva aparecer, agente não edita.
6. Declarar arquivos previstos; produzir menor diff no ownership. Documentos desta etapa não são licença para instalar/testar sem a autorização aplicável à futura sessão.

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

Um caminho tem um dono. Não editar “só uma linha” em ownership alheio. Abrir handoff de mudança com assinatura esperada, motivo, impacto e prova; dono corrige e consumidor atualiza depois do aceite. Configurações/package.json/vite.config.ts continuam CORE-001 mesmo em PWA. Relatórios QA pedem correção ao owner original; não autorizam refatoração global. Coordenador é único escritor em `docs/criacao/swarm/**` durante implementação e só altera metadados de coordenação/integração: reserva, lane, status, evidências, dependências aprovadas e decisões. Produto permanece com o owner delegado. Agente entrega proposta de status no handoff.

## Trabalho independente e integração

Contratos revisados antes de features. Stubs/mocks podem apoiar componente isolado após contrato congelado, identificados como tal; não satisfazem integração, persistência, offline ou checkpoints de sessão. Handoff registra exports/assinaturas, versão, erros e fixtures. Integrador CORE-002 conecta exports em seu arquivo, não invade features. Mudanças de contrato exigem DATA-001 e avaliação dos consumidores antes da retomada.

Agente sem trabalho READY não se autoatribui tarefa bloqueada nem cria escopo. Coordenador mantém no máximo três lanes Codex ativas; lane Claude não contorna DAG ou ownership. Revisão/read-only também requer atribuição delimitada. Batimento/reserva expirados exigem conferência do estado de trabalho pelo coordenador antes de reatribuir; timeout sozinho não autoriza apagar diff.

## Saída

Entregar [handoff](HANDOFF.md), referência do diff, aceite itemizado e testes realmente executados com resultado/limites. “Não executado” deve permanecer explícito. Nunca marcar DONE porque arquivos existem ou suite usa apenas mocks. Falta de fonte vira pendência com citação e bloqueio somente do recurso afetado. Nenhuma implementação ocorreu na fase atual.
