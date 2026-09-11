# Auditoria documental

Data: 2026-09-11. Escopo: documentação de criação; nenhuma suíte de aplicação, lint ou build foi executada porque não existe implementação.

## Resultado

**CP0 aprovado.** A estrutura obrigatória existe, referências relativas resolvem, o DAG é acíclico, contratos compartilhados têm proprietário único e não há artefato de aplicação.

| Verificação | Resultado | Evidência |
|---|---:|---|
| Documentos Markdown em `docs/criacao/` | 246 | inventário completo em [ARVORE](ARVORE.md) |
| Estrutura mínima solicitada | completa | nenhum caminho obrigatório ausente |
| Links Markdown relativos | 0 quebrados | varredura de 246 documentos e README raiz, com URL-decoding |
| Passos | 20/20 válidos | todos contêm metadados e seções 1–17 |
| Tarefas | 36 IDs únicos | todos têm os 13 campos obrigatórios |
| Dependências | válidas | 0 ID desconhecido, 0 ciclo e relação `bloqueia` inversa exata |
| Ownership | completo | 36/36 tarefas mapeadas; nenhum ID extra |
| Painel do swarm | sincronizado | 36/36 tarefas listadas |
| Classes | 12 | oito documentos por classe, mais contratos comuns |
| Subclasses | 41 | somente as identificadas na compilação local |
| Raças | 9 | 9 sub-raças e variante humana tratada separadamente |
| Antecedentes | 13 | variantes registradas na documentação |
| Talentos | 42 | catálogo estruturado e fase opcional explícita |
| Condições | 15 | 14 condições ordinárias e exaustão |
| Artefatos de software | 0 | sem `src/`, package manager, Vite, componentes ou dados executáveis |
| Arquivos não Markdown em `docs/criacao/` | 0 | diretório contém somente documentação |

## Fontes verificadas

- `Livro do Jogador.pdf`: 315 páginas; SHA-256 `ed6028a48dc566e91720b68a24d38eb4f8c927b071cab151739a7f15f08a4a91`.
- `Ficha de Personagem em branco.pdf`: 3 páginas; SHA-256 `6728135486b750ff762de86ac97b117756b5de16332ada345e0b0e9ca375c71d`.
- Estrutura de `Giuseph66/Pixel/docs/Passos`: consultada apenas como referência de decomposição; arquitetura e regras não foram copiadas.

As referências distinguem página impressa e página do PDF. Mecânicas sem suporte inequívoco permanecem em [PENDENCIAS](decisoes/PENDENCIAS.md). O pack inicial é `phb-ptbr-local-2017@1.0.0`; nenhuma edição, suplemento ou correção externa foi misturada silenciosamente.

## Checklist obrigatório

- [x] Fontes lidas e identificadas por hash.
- [x] Classes, raças, sub-raças, subclasses, antecedentes e talentos catalogados.
- [x] Magia, combate, condições, equipamentos, multiclasse e fórmulas documentados.
- [x] Criação de personagem e as três páginas da ficha cobertas.
- [x] Rules Engine e Dice Engine especificados com resultados discriminados e RNG injetável.
- [x] IndexedDB, memória, preferências, autosave, migrações, corrupção e resets planejados.
- [x] Exportação/importação versionada de personagem e campanha documentada.
- [x] PWA, cache, atualização, instalação e uso offline planejados.
- [x] Mobile, tablet, desktop, wireframes e design system cobertos.
- [x] Exatamente quatro destinos principais e Dice FAB global preservados.
- [x] `alert`, `confirm` e `prompt` proibidos; feedback próprio especificado.
- [x] Tasks, ownership, DAG, checkpoints, aceite, testes e limites de escrita criados.
- [x] Contratos canônicos precedem consumidores; estado mutável não duplica definições.
- [x] Swarm de 4/6/8/12 agentes consegue selecionar trabalho por prontidão e ownership.
- [x] Orquestração registrada: Codex limitado a 3 subagentes Luna/Terra; Claude MCP em `claude-sonnet` (Sonnet/medium) e `claude-opus` (Opus/xhigh), com fallback apenas entre as duas lanes.
- [x] Identidade, modelo e raciocínio não verificáveis bloqueiam a lane; cópia estável `mcp-agents 0.30.0` registrada no ADR-0006.
- [x] Nenhuma aplicação implementada.

## Contradições e limites

Há 19 pendências abertas de fonte, interpretação ou publicação. Cada uma bloqueia somente a automação afetada; o restante do plano pode avançar após autorização futura. A auditoria corrigiu nomenclatura de seleção de subclasse, representação de recursos por `spent`, forma discriminada de `RuleResult`, links de classe e perfis mágicos específicos. Nenhuma regra pendente foi resolvida por inferência.

**IMPLEMENTAÇÃO DO SOFTWARE NÃO INICIADA.**
