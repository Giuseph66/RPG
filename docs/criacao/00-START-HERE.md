# 00 — Comece aqui

**IMPLEMENTAÇÃO EM ANDAMENTO.** A fundação e primeiras ondas existem no workspace. O estado vigente, inclusive tarefas reabertas após a auditoria de recuperação, está em [TASKS](swarm/TASKS.md).

## Leitura obrigatória para agente futuro

1. Este arquivo e [AGENT-PROTOCOL](swarm/AGENT-PROTOCOL.md).
2. [ADR de orquestração](decisoes/ADR-0006-orquestracao-agentes.md), [escopo](02-ESCOPO.md), [arquitetura](03-ARQUITETURA.md), [fontes](14-CONTEUDO-E-FONTES.md) e [pendências](decisoes/PENDENCIAS.md).
3. [Contratos](dados/schemas.md), [modelo](09-MODELO-DE-DADOS.md), [Rules Engine](10-RULES-ENGINE.md) e [Dice Engine](11-DICE-ENGINE.md) conforme tarefa.
4. [Painel](swarm/README.md), [TASKS](swarm/TASKS.md), [ownership](swarm/OWNERSHIP.md) e passo específico.

Para novas implementações, reservar uma tarefa READY com dependências satisfeitas; não trabalhar simultaneamente em arquivo de outro owner.

## Invariantes

- Quatro destinos: Personagem, Ações, Jornada, Compêndio. Dados é ferramenta global, nunca quinto destino.
- React/TypeScript/PWA, local e offline; sem backend, autenticação ou API obrigatória.
- Definitions imutáveis separadas de Character e campanha mutáveis; IDs estáveis independentes de tradução.
- Domínio puro, contexto explícito e RNG controlável; UI não conhece IndexedDB.
- Salvo significa transação concluída; backup de personagem e campanha faz parte do produto.
- Sem `alert()`, `confirm()` ou `prompt()`; usar componentes próprios e acessíveis.
- Fonte é o PDF exato, pack `phb-ptbr-local-2017`; não pressupor PHB padrão,2024 ou suplementos.
- Pendência de fonte não é autorização para inventar regra; usar status/capacidade e decisão registrada.

## Como executar depois

Numeração dos [20 passos](passos/README.md) organiza leitura; o [DAG](swarm/DEPENDENCIES.md) define ordem real. Persistência base vem cedo, embora o passo14 finalize backup/migrações. Contratos antecedem implementação de consumidores. `DONE` exige aceite e evidência, não somente arquivo criado.

Status de tarefa: TODO planejada; READY liberada; IN_PROGRESS reservada/em execução; BLOCKED com impedimento identificado; REVIEW aguardando revisão; DONE aceita com evidência. Há gates específicos de fonte e de conteúdo/publicação. Tarefas independentes podem avançar quando implementação for autorizada, sem aguardar regra não usada por elas.

Operação de agentes segue o [ADR-0006](decisoes/ADR-0006-orquestracao-agentes.md): orquestrador Sol/alto; até três Codex em Luna/Terra; Claude MCP somente Sonnet/Opus; Codebase Memory primeiro; sem fallback proibido.

## Onde procurar

[Índice](README.md) apresenta produto e módulos; [árvore completa](ARVORE.md) lista arquivos; [auditoria](AUDITORIA.md) registra cobertura e limites. Documentação de interface descreve experiências; documentos de regras determinam comportamento; schemas são canônicos. Divergência entre documentos exige corrigir contrato e consumidores conjuntamente.
