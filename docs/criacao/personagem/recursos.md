# Recursos e recuperação

Fontes: **Livro do Jogador fornecido**, recursos nas respectivas raças/classes/talentos; descanso cap8,p188/PDF187; inspiração cap4,p127/PDF126; slots cap10 e tabelas das classes. Este contrato não substitui as regras de cada característica.

## Definição e instância

`ResourceDefinition`:ID, fonte, unidade (`uses`,`points`,`dice`,`slots`), limite fixo ou fórmula, escopo (`character`,`target`,`form`), custo/ação, recuperação, restrições e escolha opcional. Não guardar contador atual no rule pack.

`ResourceInstance`:ID de instância,`definitionRef`, origem da concessão, valor disponível, marcas de uso, escolhas e referências de beneficiário quando relevantes. Máximo calculado pela definição e personagem. Recurso com dados heterogêneos usa pools por dado; slots por nível e origem; não reduzir tudo a um inteiro genérico.

IDs estáveis ingleses dentro do pack; referências=`{rulesetId,entityId}`; instâncias possuem ID próprio. Dois recursos com mesmo rótulo mas origens diferentes não se fundem automaticamente. Canalizar Divindade e suas regras de multiclasse são exceção explícita.

## Catálogo de comportamentos

| Tipo | Exemplo | Limite/recuperação |
|---|---|---|
| Booleano |Inspiração|Presente/ausente, concessão do Mestre; não acumula|
| Uso fixo curto/longo |Sopro draconato|1;curto ou longo (p34/PDF33)|
| Uso fixo longo |Resistência Implacável|1;longo (p41/PDF40)|
| Concessão mágica racial |Drow/tiefling|Usos separados por magia desbloqueada; nível total e longo (p24,43/PDF23,42)|
| Pontos |Sorte|3;longo (p172/PDF171)|
| Uso por beneficiário |Líder Inspirador/Curandeiro|Reutilização depende do descanso do alvo (p169–170/PDF168–169)|
| Dados por classe |Dados de Vida|Gasto sequencial no curto; recuperação parcial longo|
| Slots normais |Conjuração|Quantidade por nível de slot; recuperação longa conforme classe|
| Slots de Pacto |Bruxo|Pool e recuperação próprios; não misturar silenciosamente com normais|
| Transformação |Forma Selvagem|Usos de classe, forma ativa e PV próprios são entidades relacionadas, não mesmo contador|

Recursos de classe remetem a [classes](classes/README.md), com fórmulas e recuperação próprias. Recurso primário do header é apresentação selecionada, não duplicação do estado.

## Fluxo de uso e recuperação

Solicitar ação → validar origem/habilitação/alvo/ação disponível/custo → obter escolhas/rolagens necessárias → calcular resultado → confirmar consumo+efeitos em uma transação. Cancelamento antes de confirmação não gasta. Repetição de clique/retentativa usa ID da operação e não duplica custo.

Recuperação não é sempre “encher”: pode ser parcial, dados limitados, uma vez por dia, distribuição escolhida ou exclusão de certos níveis. Eventos `short-rest`,`long-rest` e eventos específicos da característica aplicam só regras inscritas. Relógio real não recupera usos da campanha.

Ao mudar máximo por nível/efeito, preservar consumo com política explícita do contrato central; não conceder usos extras só por reabrir a ficha. Usos negativos ou acima de limites são rejeitados, nunca silenciosamente normalizados em importação sem explicação.

## Interface e testes futuros

Contador deve mostrar disponível/máximo, unidade, custo e recuperação;0 tem rótulo esgotado e explicação. Ajuste manual exige motivo e registro. Ações indisponíveis revelam requisito; mesma instância exibida no header e Ações.

Teste:sopro1→0;segundo uso rejeita;curto→1. Meio-orc curto continua0/longo→1. Slot normal e Pacto consomem somente pool selecionado. Beneficiário que não descansou continua impedido de novo Líder Inspirador mesmo se orador descansou. Reabrir/exportar/importar mantém gastos. `RuleResult` é puro, sem IndexedDB/RNG/React. [Descanso](../regras/descanso.md), [Rules Engine](../10-RULES-ENGINE.md).
