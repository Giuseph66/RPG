# 11 — Inventário e equipamento

Estado: DONE — ITEM-001, ITEM-002 e UI-004 concluídas; aceite canônico registrado em TASKS/QA.

Prioridade: P1.

Complexidade: Alta.

Dependências: DATA-002, RULE-001, CHAR-002; consultar ordem individual das tasks, pois o passo é tema de documentação, não unidade atômica de agendamento.

Destrava: CHAR-001, COMP-001, RULE-002, QA-001, CORE-002.

Tasks: ITEM-001, ITEM-002, UI-004; registro canônico em [TASKS](../swarm/TASKS.md).

## 1. Objetivo

Gerenciar equipamentos por instância e refletir seus efeitos mecânicos sem mutar o catálogo.

## 2. Por que existe

Quantidade, equipado, moedas e carga são estado do personagem; propriedades e fórmula de armadura são regras compartilhadas.

## 3. Escopo

Catálogo de armas/armaduras/escudos/ferramentas/itens; quantidades, moedas, peso/valor, equipamentos ativos e UI adaptativa.

## 4. Fora do escopo

Economia de mercado remoto, inventário multiplayer, itens mágicos de fontes ausentes e carga variante ativa sem escolha.

## 5. Pré-requisitos

ITEM-001 após loader; ITEM-002 após derivados e catálogo; UI-004 após domínio de inventário e ficha.

## 6. Arquivos que futuramente serão criados/modificados

Caminhos propostos; nada criado nesta fase. Ownership por tarefa em [OWNERSHIP](../swarm/OWNERSHIP.md).

- `src/data/equipment/**`
- `src/domain/inventory/**`
- `src/features/inventory/**`

## 7. Contratos envolvidos

EquipmentDefinition, InventoryItem com instanceId, propriedades de arma, moedas/unidades, comandos equipar/consumir/transferir e modificadores de regra.

Fontes/documentos canônicos: [Inventário](../equipamento/inventario.md), [Armas](../equipamento/armas.md), [Armaduras](../equipamento/armaduras.md).

## 8. Fluxo

Selecionar definição → criar instância/quantidade → equipar ou usar → validar pré-requisitos → recalcular derivados → persistir estado → exibir impacto.

## 9. Regras

Equipar não altera definição. Remover instância equipada resolve vínculo explicitamente. Moedas/unidades não são floats sem política; carga opcional depende de configuração documentada.

## 10. Mobile

Lista com quantidade/equipado sempre visíveis; editar sem precisar deslizar horizontalmente; menu tem botão além de gesto.

## 11. Desktop

Tabela com nome/qtd/equipado/peso/valor/ações; ordenação usa IDs, sem deslocar seleção incorretamente.

## 12. Estados especiais

Quantidade inválida, item não reconhecido no pack, moeda insuficiente, item equipado removido, escudo/armadura conflitantes e storage falho.

## 13. Armadilhas

Guardar CA final manualmente; compartilhar a mesma instância entre fichas; confundir ferramenta com proficiência adquirida automaticamente; peso sem unidade.

## 14. Testes necessários

Testes FUTUROS; não executados nesta etapa.

- **ITEM-001**: IDs/propriedades válidas, unidade de peso, valor monetário, referência de proficiência e fórmula de armadura.
- **ITEM-002**: Transferência/remoção do item equipado, quantidades fracionárias inválidas, moedas, armadura/escudo e regra opcional desligada.
- **UI-004**: Quantidade inválida, equipar e CA recalculada, ordenação preservando IDs, teclado, estado vazio e erro de gravação.

## 15. Critérios de aceite

- **ITEM-001**: Propriedades de armas e fórmulas de armadura são dados tipados; escudo separado; unidades/moedas explícitas; itens não existem como estados globais mutáveis.
- **ITEM-002**: Equipar/desequipar não muta definição; evita quantidade negativa; CA/propriedades/proficiência recalculadas por regras; carga variante só quando habilitada.
- **UI-004**: Operações equivalentes em mobile/desktop; item equipado sempre identificado; remover equipado mostra efeito; peso/valor exibem unidade e regra ativa.

Existência de código ou mock não conclui integração. Cada task só vira DONE após aceite e revisão; aguardar a ordem do DAG.

## 16. Checklist

- [ ] Separar catálogo e instâncias.
- [ ] Aplicar equipamento pelo engine.
- [ ] Provar quantidades, moedas e derivados.

## 17. Handoff

RULE-002 recebe propriedades/capacidades de ataque; UI-003 recebe itens utilizáveis; DATA-006 recebe estrutura e invariantes de importação.

Entregar arquivos tocados, exports/contratos, critérios provados, comandos realmente executados, limitações e dependências ao coordenador, conforme [HANDOFF](../swarm/HANDOFF.md). Nunca editar ownership alheio nem declarar validação não executada.
