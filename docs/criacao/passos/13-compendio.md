# 13 — Compêndio

Estado: TODO — implementação não iniciada.

Prioridade: P1.

Complexidade: Alta.

Dependências: UI-002, RULE-002, DATA-004, DATA-005, SPELL-001, ITEM-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: CORE-002, PWA-001.

Tasks: COMP-001; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Permitir consulta rápida de regras e entidades locais por nome, categoria e tags, com favoritos e referência da fonte.

## 2. Por que existe

Companion precisa explicar números e capacidades durante sessão sem depender de internet ou reprodução integral do livro.

## 3. Escopo

Índice local, categorias, busca normalizada, detalhes navegáveis, relações, favoritos e carregamento por categoria.

## 4. Fora do escopo

Busca remota obrigatória, conceder capacidade ao favoritar, introduzir outro destino Regras e redistribuir textos sem política.

## 5. Pré-requisitos

Shell, condições de RULE-002 e catálogos racial/classe/magia/equipamento aceitos. Contratos de índice e conteúdo disponível offline precisam ser compatíveis com PWA.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/features/compendium/**`
- `src/application/compendium/**`

## 7. Contratos envolvidos

EntityRef por ruleset/tipo/ID, SearchQuery/SearchResult, favoritos de settings e sourceRef; definição imutável.

Fontes/documentos canônicos: [Compêndio](../interface/pagina-compendio.md), [Fontes](../14-CONTEUDO-E-FONTES.md), [PWA](../07-PWA-OFFLINE.md).

## 8. Fluxo

Abrir índice leve → buscar/filtrar → abrir detalhe → seguir relação/fonte → favoritar → voltar preservando consulta/posição.

## 9. Regras

Nome/tradução não é ID. Normalização de acento/caixa só afeta busca. Categoria pendente é diferente de consulta vazia. Consulta não altera personagem.

## 10. Mobile

Busca + filtros recolhíveis + resultado em lista; detalhe em rota subordinada com retorno previsível.

## 11. Desktop

Filtros/lista/detalhe em painéis quando couber; teclado percorre resultados sem obrigar mouse.

## 12. Estados especiais

Pack ausente, categoria ainda não disponível, favorito órfão, nenhum resultado, erro de carga local e atualização de versão.

## 13. Armadilhas

Carregar corpus inteiro no primeiro render; usar índice de array como favorito; categoria de magia duplicar entidade; dados remotos disfarçados de offline.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **COMP-001**: Acentos/caixa/tags, retorno preservando filtros, favorito órfão, categoria pendente, offline e carga inicial sem corpus integral.

## 15. Critérios de aceite

- **COMP-001**: Categorias planejadas navegáveis; alias Regras mesmo destino; busca local determinística; detalhe mostra fonte; favorito não altera definição nem concede habilidade.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Buscar nome, categoria e tags offline.
- [ ] Exibir fonte e disponibilidade honestas.
- [ ] Preservar favoritos por IDs.

## 17. Handoff

PWA-001 recebe manifesto de conteúdo necessário e estratégia lazy; QA-002 recebe cenários de busca/detalhe sem rede.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.

