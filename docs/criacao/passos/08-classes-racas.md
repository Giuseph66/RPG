# 08 — Classes, raças e progressão

Estado: DONE — DATA-002, DATA-004, DATA-005 e CHAR-004 concluídas; aceite canônico registrado em TASKS/QA.

Prioridade: P0.

Complexidade: Alta.

Dependências: DATA-001, CHAR-001; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: RULE-001, SPELL-001, ITEM-001, CHAR-001, COMP-001, RULE-002, SPELL-002, CORE-002, DATA-006, QA-001.

Tasks: DATA-002, DATA-004, DATA-005, CHAR-004; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Codificar conteúdo estruturado e progressão da fonte atual, mantendo decisões de origem, versão e suporte visíveis.

## 2. Por que existe

Catálogos são dependências de criação, regras e consulta; precisam existir cedo. Progressão reutiliza esses dados depois de criação disponível.

## 3. Escopo

Loader/índice, raças/sub-raças, classes/subclasses, antecedentes, talentos e progressão; templates sem inventar personagens ou opções.

## 4. Fora do escopo

Adicionar 2024, Tasha, Xanathar, UA ou homebrew automaticamente; copiar descrições integrais; presumir que arquivo fornecido é edição padrão sem divergências.

## 5. Pré-requisitos

DATA-002 após contrato; DATA-004/005 após loader; CHAR-004 após domínio de criação e catálogo. Dependências são por task, não passo monolítico.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/data/rulepacks/**`
- `src/data/rules/**`
- `src/data/abilities/**`
- `src/data/skills/**`
- `src/data/dice/**`
- `src/data/races/**`
- `src/data/classes/**`
- `src/data/subclasses/**`
- `src/data/backgrounds/**`
- `src/data/feats/**`
- `src/data/progression/**`
- `src/data/character-templates/**`
- `src/domain/character/progression/**`
- `src/features/character/progression/**`

## 7. Contratos envolvidos

Race/Class/Subclass/Background/Feat definitions, ProgressionTable, escolhas/recursos, sourceRef e pack phb-ptbr-local-2017.

Fontes/documentos canônicos: [Conteúdo e fontes](../14-CONTEUDO-E-FONTES.md), [Progressão](../personagem/progressao.md), [Pendências](../decisoes/PENDENCIAS.md).

## 8. Fluxo

Catalogar item com fonte → mapear propriedades/níveis/escolhas → validar referências → disponibilizar lookup → calcular prévia de progressão → resolver decisões → aplicar commit único.

## 9. Regras

ID não depende de tradução/índice. Fonte com conflito produz pendência por capacidade. Talentos/multiclasse classificados como opções; não anunciar V2 como pronta. Atualizar máximo de recurso não implica recuperar usos sem regra.

## 10. Mobile

Comparação de escolha em sheet/lista; progressão expõe ganhos e decisões, sem tabela larga obrigatória.

## 11. Desktop

Comparação e tabela de progressão com detalhes; cada célula mantém fonte e estado de suporte.

## 12. Estados especiais

Subclasse sem escolha, nível sem dados confiáveis, Patrulheiro divergente, limiar XP, escolha repetida e regra opcional desativada.

## 13. Armadilhas

Dados de classe duplicados dentro da ficha; inferir valores da edição memorizada; usar índice de array para IDs; fase posterior apagada do plano.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **DATA-002**: IDs duplicados, referência órfã, versão incompatível, alteração de label/tradução e arquivo de pack inválido.
- **DATA-004**: Referências pai/sub-raça, opções obrigatórias, efeitos raciais por nível e labels localizados independentes do ID.
- **DATA-005**: Cobertura por nível, referência classe/subclasse, escolhas concedidas, recursos recuperáveis e rejeição de tabela ambígua.
- **CHAR-004**: Limiares XP, níveis consecutivos, PV por método, troca/adição de escolhas, tentativa de salto sem decisões e rollback de falha.

## 15. Critérios de aceite

- **DATA-002**: IDs estáveis e referências verificáveis; edição divergente não é substituída automaticamente; loader informa pack ausente/incompatível; índice não copia longos textos do livro.
- **DATA-004**: Todas entradas documentadas da fonte possuem ID/sourceRef; escolha incompleta permanece escolha, sem default inventado; sem mistura de suplementos.
- **DATA-005**: Classes/subclasses/antecedentes/talentos catalogados com fontes; tabelas não inferidas de outra edição; divergências do Patrulheiro bloqueiam só mecânicas envolvidas.
- **CHAR-004**: Prévia lista ganhos e escolhas; commit único após resolução; valores não sobrescrevem recursos atuais sem política; opções não suportadas não aparecem como prontas.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Catalogar opções e fontes sem mistura.
- [ ] Separar definição e escolhas/usos.
- [ ] Aplicar progressão somente após decisões.

## 17. Handoff

CHAR-001, SPELL-002, RULE-002 e COMP-001 recebem catálogos/versão/cobertura; pendências precisas evitam bloqueio global injustificado.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
