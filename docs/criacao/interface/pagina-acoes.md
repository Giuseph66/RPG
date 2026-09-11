# Ações — capacidades em uso

## Organização

Priorizar favoritos recentes opcionais e grupos Ataques, Magias/Truques, Recursos/Habilidades, Itens utilizáveis e Descanso. Filtros por ação, ação bônus, reação e outras durações refletem classificação da fonte; não impor contador de turno automático sem combate completo. Busca local por nome e tags. Concentração ativa visível acima da lista. Apenas referência textual sem interação não atende este destino.

| Entidade | Operações disponíveis | Comando/resultado esperado |
| --- | --- | --- |
| Ataque | Ver bônus; rolar ataque; rolar dano. | Intenção de ataque/dano usa engine e RNG injetável; sem inventar acerto contra alvo desconhecido. |
| Magia | Ver fonte; escolher origem/nível; conjurar; rolar quando aplicável. | Validar acesso, componente/custo e slot; atualizar recursos/concentração atomicamente. |
| Truque | Consultar; conjurar; rolar se aplicável. | Não consome slot; escala conforme regra validada. |
| Recurso de classe | Ver usos; usar; ver recuperação. | Recurso tipado; gasto e efeito no domínio, origem preservada. |
| Cura | Informar/rolar quantidade; aplicar ao personagem selecionado. | Domínio limita PV e trata estados associados. |
| Item utilizável | Selecionar instância; usar; ajustar quantidade quando cabível. | Engine distingue consumo do item e efeito. |
| Forma Selvagem | Usar recurso; escolher forma suportada; ativar/encerrar. | Sem catálogo de formas na fonte atual: registrar pendência e não inventar bestiário. |
| Descanso | Escolher tipo; revisar recuperação; confirmar. | Uma transação de domínio; cancelar não recupera nada. |
| Concentração | Ver efeito; encerrar; substituir ao conjurar. | Um vínculo ativo por personagem conforme regra; fonte do efeito rastreável. |

## Pipeline de UX

Selecionar → exibir opções/custo/pré-requisitos → validar comando contra snapshot/revisão → apresentar resultado/erro → aguardar confirmação de persistência → atualizar seletores. Repetir clique durante busy não duplica gasto; comando tem identidade e aplicação controla duplicação. Resultados de dados não podem reaplicar custos. Erro de slot/munição/recurso mantém formulário com motivo e alternativas. Usuário pode consultar regra mesmo com operação desabilitada.

## Responsividade e acesso

Mobile usa lista de ações e sheet para detalhes; desktop lista e painel contextual. Estado selecionado não dispara ação só por navegação. Rótulos “Rolar ataque” e “Rolar dano” explícitos; reações não escondidas em hover. Resultados mostram dados individuais e parcelas; screen reader recebe resumo. Pendências específicas do pack bloqueiam capacidades afetadas, sem misturar versão 2024 ou suplementos. Tasks: UI-003, RULE-002, SPELL-002; regras em [combate](../regras/combate.md), [magia](../magia/README.md) e [recursos](../personagem/recursos.md).
