# Inventário, carga e moedas

Fonte: Livro do Jogador fornecido, cap.1 p.14/PDF13; cap.5 pp.145–163/PDF144–162; cap.7 p.176/PDF175 para carga. Catálogos: [armas](armas.md), [armaduras](armaduras.md), [itens](itens.md), [ferramentas](ferramentas.md).

## Operações

Adicionar, dividir/unir pilha, mover para contêiner, equipar/desequipar, consumir carga/item, ajustar moeda, transferir, renomear instância, remover e restaurar via histórico. Todo comando recebe itemId, quantidade, revisão esperada e motivo/origem. Quantidade inteira>0; item não empilhável mantém instância individual. Contêiner não contém si/ancestral.

Equipar valida mãos, slot semântico, proficiência/restrição e tempos de armadura. “Carregado” não significa “equipado”. Duas mãos é requisito no ataque, não ao segurar. Item assimilado por Forma Selvagem continua possuído, sem efeito. Item no chão mantém localização narrativa, não some do save.

Consumir munição/componente/veneno/kit ocorre na mesma transação do efeito. Falha/cancelamento não consome; commandId evita duplo clique. Desfazer cria comando compensatório explícito e pode ser inválido após outro efeito; não regrava revisão antiga.

## Carga

Regra base indicada na criação: capacidade=`7,5kg×FOR`; empurrar/arrastar/levantar=`15kg×FOR`, com tamanho modificando multiplicador conforme cap.7. Regra variante de sobrecarga só ativa por configuração da campanha e é identificada como opcional. Peso total soma instâncias, conteúdo e equipamento; não contar contêiner duas vezes. Moedas só pesam se regra da campanha definir mecanismo presente na fonte utilizada.

Capacidade de recipientes é auxiliar, não substitui carga. Valores volumétricos suspeitos ficam desativados por PEND-012. Interface mostra total/capacidade, origem dos modificadores e itens que contribuem; cor não é único aviso.

## Moedas e compra

Guardar cinco denominações, sem normalizar automaticamente. Pagamento pode sugerir troco, mas preview mostra moedas antes/depois. Saldo nunca negativo; transação de compra adiciona item e debita moeda atomicamente. Riqueza inicial por classe ou equipamento inicial são alternativas quando fonte assim define; não conceder ambos.

## Aceite

Round-trip preserva instâncias/containers/equipado/cargas/moedas; pilha não perde customização; ciclo rejeitado; ataque sem munição explica; poção duplo clique consome uma; CA muda somente ao concluir equipagem; carga inclui item em mochila uma vez; exportação fecha refs de assets/definitions.
