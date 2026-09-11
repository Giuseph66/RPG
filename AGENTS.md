# Orquestração do projeto RPG

## Papel do agente raiz

O agente raiz atua somente como **orquestrador** até a conclusão de todos os
passos em `docs/criacao/passos/`.

- Triar pedido, consultar documentação, decompor trabalho, escolher agentes,
  acompanhar dependências, integrar resultados e reportar status.
- Não implementar produto, editar código de aplicação, executar build/testes
  de produto ou assumir tarefa de subagente quando houver delegação possível.
- Usar `gpt-5.6-sol` com `reasoning_effort = "high"`.
- Respeitar ownership, DAG, checkpoints, handoffs e critérios de QA em
  `docs/criacao/swarm/`.

## Subagentes nativos Codex

- Máximo: **3 subagentes simultâneos**; profundidade máxima: **1**.
- Somente `gpt-5.6-luna` ou `gpt-5.6-terra`. Nunca usar `gpt-5.6-sol` ou
  `gpt-6-astra` para subagentes.
- O orquestrador escolhe modelo e esforço conforme risco, escopo e
  independência da tarefa.
- Padrão seguro: `gpt-5.6-terra`, esforço `medium`.
- Usar Luna para busca, inventário, revisão factual e edições pequenas;
  Terra para análise, alteração coordenada e validação com maior contexto.
- Cada delegação deve definir: objetivo fechado, arquivos/ownership, entrada,
  saída esperada, dependências e critério de aceite.
- Subagentes não criam outros subagentes.

## Claude Code via MCP

- Usar as lanes MCP `claude-sonnet` e `claude-opus` para delegação Claude
  Code quando apropriado.
- `claude-sonnet`: tarefas simples ou médias, exploração delimitada e revisão.
- `claude-opus`: somente tarefas muito complexas, críticas, ambíguas ou
  interdisciplinares.
- Nunca solicitar outro modelo Claude.
- `claude-start` é somente review leaf, read-only e assíncrono; acompanhar com
  `claude-status`, obter com `claude-result` e encerrar com `claude-cancel`
  quando necessário.
- `claude_code` é one-shot bloqueante, recomendado apenas para prompts
  pequenos; não tratá-lo como worker persistente.
- O agente raiz mantém propriedade da decomposição, acompanhamento,
  integração e validação dos resultados Claude.

## Descoberta e documentação

- Para descoberta estrutural de código, usar primeiro Codebase Memory MCP:
  `search_graph`, `trace_path`, `get_code_snippet`, `query_graph` e
  `get_architecture`.
- Reindexar o grafo quando arquivos, símbolos, rotas ou relações estruturais
  relevantes forem criados, removidos ou movidos; usar busca textual somente
  para lacunas do grafo, strings e arquivos não-código.
- Antes de planejar/atribuir trabalho, consultar `docs/criacao/` e o DAG do
  swarm; preservar decisões, ADRs, fontes e pendências.
- Atualizar artefatos de swarm quando uma mudança alterar ownership,
  dependências, handoff, risco ou checkpoint.

## Regra de transição

Esta política vale até todos os passos em `docs/criacao/passos/` terem seus
critérios de aceite concluídos. Depois, reavaliar a estratégia com o usuário.
