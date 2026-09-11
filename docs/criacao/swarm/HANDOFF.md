# Handoff — formato obrigatório

## Entrega do produtor

Usar um registro por tarefa/revisão, enviado ao coordenador para anexação ao histórico; não disputar escrita de arquivo global.

```text
ID e título:
Responsável e revisão-base:
Status proposto: REVIEW | BLOCKED
Resumo de comportamento entregue:
Arquivos realmente alterados:
Arquivos próprios confirmados / exceções autorizadas:
Contratos importados e versão:
Exports públicos, entradas, resultados e códigos de erro:
Persistência, efeitos e atomicidade envolvidos:
Fontes mecânicas e pendências relevantes:
Critérios de aceite: cada item + evidência
Testes executados: comando, ambiente, resultado
Testes não executados e motivo:
Mocks/fixtures utilizados e limites da prova:
Riscos, limitações e dívida autorizada:
Consumidores destraváveis após aceite:
Como reproduzir manualmente:
Pedido concreto ao próximo owner, se houver:
```

## Solicitação entre ownerships

Informar produtor/consumidor, arquivo do produtor, contrato atual/proposto, caso real que exige mudança, compatibilidade/migração e exemplo de aceite. Consumidor pausa só trabalho dependente. Produtor responde com alteração ou alternativa documentada; consumidor não cria adapter duplicado para contornar indefinição sem ADR. Coordenador reserva produtor caso já exista outra tarefa ativa na área.

Exemplo: MAP-001 precisa de importação atômica de Asset+Map no CampaignRepository. Envia requisitos a DATA-001/DATA-003 e aguarda contrato/adapter revisados; não importa IndexedDB na feature. Se mudança for apenas composição de implementação existente, encaminhar CORE-002.

## Revisão e conclusão

Revisor confere escopo, fonte, invariantes e evidência; coordenador aceita DONE somente depois da prova exigida. Handoff documenta API pronta para consumo, não “veja o código”. Não reportar teste planejado como executado. Nesta fase documental todos os testes descritos são futuros.
