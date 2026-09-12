# 05 — Ficha do personagem

Estado: DONE — CHAR-002 concluída; aceite canônico registrado em TASKS/QA.

Prioridade: P1.

Complexidade: Alta.

Dependências: UI-002, RULE-001, STATE-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: CHAR-003, UI-004.

Tasks: CHAR-002; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Representar todos os campos relevantes das três páginas da ficha fornecida em visão rápida e expandida.

## 2. Por que existe

A ficha física orienta agrupamento e prioridades de sessão; uma simples coleção de formulários não atende consulta/ação rápida.

## 3. Escopo

Atributos, perícias/resistências, PV/defesas, recursos/condições, identidade, proficiências/idiomas, narrativa e resumos de inventário/progressão/magia.

## 4. Fora do escopo

Reimplementar regras, inferir valores de personagem inexistente, implementar criação/progressão aqui ou transformar inventário em novo destino principal.

## 5. Pré-requisitos

UI-002, RULE-001 e STATE-001. Ler ficha fornecida PDF 1–3 e mapeamento documentado; valores dos wireframes são ilustrativos.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/features/character/sheet/**`

## 7. Contratos envolvidos

Character read model, derivados com proveniência, intenções de teste, comandos de ajuste e links para inventário/progressão/ações.

Fontes/documentos canônicos: [Ficha](../personagem/ficha.md), [Página Personagem](../interface/pagina-personagem.md).

## 8. Fluxo

Carregar personagem → mostrar estado rápido → expandir grupo → consultar origem/rolar quando aplicável → editar draft → validar/salvar → restaurar após reload.

## 9. Regras

Livro prevalece sobre ficha para mecânica. Raça/classe/subclasse/antecedente referenciam definições; PV temporários não se fundem a PV atuais; condição é instância com origem.

## 10. Mobile

Matriz compacta de atributos; listas tocáveis de perícias; ações frequentes a poucos toques; narrativa expandida sem poluir estado de sessão.

## 11. Desktop

Atributos, perícias e resistências lado a lado; painel de sessão opcional; tabela/lista de equipamento mantém ações visíveis.

## 12. Estados especiais

Sem ficha, ficha incompleta, campo opcional vazio, múltiplas classes, PV zero, recursos esgotados, fonte pendente e gravação falha.

## 13. Armadilhas

Confundir inspiração com proficiência; esconder idiomas/traços/narrativa; atualizar número derivado manualmente; duplicar aggregate entre visão rápida/expandida.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **CHAR-002**: Mapeamento dos campos da ficha, rolagem contextual, PV temporários separados, 0 PV, condições, fonte de bônus e reload real.

## 15. Critérios de aceite

- **CHAR-002**: Visões compartilham mesmo agregado; atributos/perícias/resistências e estados críticos legíveis; formulário preserva draft; narrativas/identidade não são omitidas.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Mapear ficha PDF 1–3.
- [ ] Exibir proveniência e estado crítico.
- [ ] Restaurar mesma ficha após recarga.

## 17. Handoff

CHAR-003 recebe superfície de revisão/seleção; UI-004 e CHAR-004 integram subáreas próprias; header continua sob UI-002.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
