# 07 — Criação de personagem

Estado: TODO — implementação não iniciada.

Prioridade: P1.

Complexidade: Alta.

Dependências: RULE-001, DATA-004, DATA-005, ITEM-001, SPELL-001, CHAR-002; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: CHAR-004, CORE-002, DATA-006.

Tasks: CHAR-001, CHAR-003; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Permitir construir uma ficha válida a partir das opções da fonte, com escolhas explícitas e revisão antes do primeiro commit.

## 2. Por que existe

Raça/classe/antecedente afetam atributos, proficiências, equipamento e capacidades; um formulário sem grafo de escolhas cria fichas inconsistentes.

## 3. Escopo

Domínio de criação e wizard: identidade, origem, método de atributos, escolhas, equipamento/magia inicial quando aplicável, revisão e save inicial.

## 4. Fora do escopo

Gerar personagem real por exemplo dos wireframes; implementar opções de outra edição; completar automaticamente decisões não definidas pela fonte.

## 5. Pré-requisitos

CHAR-001 aguarda engine e catálogos raciais/classes/equipamento/magias; CHAR-003 aguarda CHAR-001 e ficha. Catálogos do passo 08 precisam avançar antes desta interface.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/domain/character/creation/**`
- `src/features/character/creation/**`
- `src/features/character/selection/**`

## 7. Contratos envolvidos

Draft de criação separado de Character final; Choice/Selection tipados; resultado de validação com caminhos de campo; comando de criação por repository.

Fontes/documentos canônicos: [Criação](../personagem/criacao-personagem.md), [Raças](../personagem/racas/README.md), [Classes](../personagem/classes/README.md).

## 8. Fluxo

Selecionar origem/método → resolver opções obrigatórias → calcular derivados → revisar inconsistências → confirmar → salvar agregado válido → abrir ficha.

## 9. Regras

Mudança de raça/classe preserva só escolhas compatíveis e informa invalidações; não duplica proficiência; known/prepared/slot obedecem classe de origem.

## 10. Mobile

Uma etapa por vez com progresso textual e voltar; resumo acessível sem perder foco; teclado não cobre confirmar.

## 11. Desktop

Etapa e resumo contínuo em duas colunas; mudanças mostram efeitos sem exigir hover.

## 12. Estados especiais

Draft retomado, escolha invalidada por alteração anterior, fonte pendente, import incompleto, quota ao concluir e duplo clique.

## 13. Armadilhas

Persistir ficha parcial como válida; atribuir escolha aleatória; recalcular destrói edição; aceitar import como criação sem schema validation.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **CHAR-001**: Combinações válidas/invalidas, pontos/rolagem de atributos conforme método, escolhas repetidas, proficiência duplicada e fonte não resolvida.
- **CHAR-003**: Fluxo completo por classe representativa, erro em cada etapa, alterar raça/classe, repetir confirmar e falha de persistência.

## 15. Critérios de aceite

- **CHAR-001**: Criação exige escolhas obrigatórias; valores derivados vêm do engine; alteração de opção invalida escolhas incompatíveis com explicação; personagem válido tem ruleset/version e schemaVersion.
- **CHAR-003**: Voltar preserva escolhas compatíveis; conclusão só após validação e commit; falha não cria múltiplas fichas; seletores usam IDs estáveis.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Resolver escolhas obrigatórias com fonte.
- [ ] Preservar draft ao voltar.
- [ ] Confirmar uma única ficha após commit.

## 17. Handoff

Entregar exemplos válidos por perfil e erros recuperáveis a DATA-006/QA-002; CHAR-004 reutiliza sistema de escolhas na progressão.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

