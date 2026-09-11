# 19 — Polimento e entrega

Estado: TODO — implementação não iniciada.

Prioridade: P1.

Complexidade: Média.

Dependências: QA-004; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: entrega futura, após aceite final.

Tasks: REL-001; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Fechar entrega futura com instruções precisas de uso, instalação, backup, suporte do pack e limitações demonstradas.

## 2. Por que existe

Uma ferramenta local precisa explicar recuperação e disponibilidade offline; documentação de entrega não pode prometer capacidades ainda planejadas.

## 3. Escopo

Release notes, guia de sessão/backup/instalação, matriz de limitações e pedidos finais de correção aos owners existentes.

## 4. Fora do escopo

Nova feature, backend, pacote de regras externo, refatoração estética ampla ou mudança de fonte para encerrar pendência.

## 5. Pré-requisitos

QA-004 aceito e gates obrigatórios comprovados. Qualquer correção tardia reabre testes afetados; polish não contorna QA.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `docs/implementacao/entrega/**`

## 7. Contratos envolvidos

Versão do app/pack/schema e evidências de entrega; instruções de export/import/recuperação compatíveis com implementação real.

Fontes/documentos canônicos: [Escopo](../02-ESCOPO.md), [Fontes](../14-CONTEUDO-E-FONTES.md), [Checkpoints](../swarm/CHECKPOINTS.md).

## 8. Fluxo

Revisar comportamento comprovado → escrever instruções com fluxos reais → declarar limites → corrigir discrepâncias por owner → revalidar gate afetado → publicar pacote de entrega após autorização pertinente.

## 9. Regras

Local only, sem sincronização, dados no dispositivo e backup manual explícitos. Conteúdo privado/aberto respeita política de fontes. Nesta entrega atual declarar implementação não iniciada.

## 10. Mobile

Guia demonstra instalar quando suportado, abrir dados, usar ações e exportar por toque; sem prometer prompt universal de instalação.

## 11. Desktop

Guia cobre navegação/atalhos existentes, backup e múltiplas abas; não documentar atalho não implementado.

## 12. Estados especiais

Plataforma sem instalação, fonte pendente, armazenamento limpo e feature V2 ainda indisponível.

## 13. Armadilhas

Marcar roadmap inteiro como entregue; encobrir limitação de forma/Patrulheiro; alterar token sem reteste; publicar sem autorização futura aplicável.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **REL-001**: Checklist editorial de comportamento demonstrado, caminhos de recuperação e correspondência entre release notes e evidências.

## 15. Critérios de aceite

- **REL-001**: Entrega descreve versão/pack, limites, backup manual e prova; nenhum item planejado é anunciado como implementado; correção tardia reabre validação afetada.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Conferir documentação contra evidências.
- [ ] Declarar limites e backup manual.
- [ ] Encerrar sem expansão de escopo.

## 17. Handoff

Coordenador recebe pacote de entrega e backlog posterior com IDs preservados. Nenhuma implementação deve começar ou continuar automaticamente após a fase documental atual.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

