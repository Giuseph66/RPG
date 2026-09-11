# Equipamento

Fonte: Livro do Jogador fornecido, cap.5, pp.145–163/PDF144–162. Definitions são catálogo; `InventoryItem` é instância mutável. Catálogo mínimo: [armaduras](armaduras.md), [armas](armas.md), [itens de aventura](itens.md), [ferramentas](ferramentas.md) e [inventário](inventario.md).

Moeda canônica usa cobre inteiro:1pp=10pc,1pe=50pc,1po=100pc,1pl=1000pc. Ficha conserva cp/sp/ep/gp/pp como contadores inteiros e apresenta PC/PP/PE/PO/PL. Conversão ou pagamento nunca ocorre sem intenção; moedas não têm peso aplicado automaticamente sem regra opcional habilitada.

`EquipmentDefinition`: id/name/category/valueCp/weightGrams/stackable/properties/sourceRefs e payload weapon/armor/tool/consumable/container/mount. `InventoryItem`: UUID, equipmentRef, quantidade, equippedState, containerId, nome/notas, chargesSpent. Item personalizado guarda snapshot próprio e origem `userContent`, sem se passar por regra do pack.

Estado equipado não altera definition. Ativar escudo, vestir armadura, carregar munição, consumir item e transferir contêiner são comandos validados. Compra inicial e conjunto de classe/antecedente registram proveniência; receber opção A não recebe B. Peso usa gramas inteiras e quantidade; conteúdo pode contar conforme regra específica.

Não há itens mágicos catalogados neste livro como equipamento comum. Serviço, estilo de vida, bem de escambo, montaria/veículo e bugiganga são categorias consultáveis/narrativas; só viram InventoryItem quando possuídos. Nenhuma taxa de serviço mágico fixa acima das faixas descritas é inventada.

Aceite: catálogo resolve todos IDs listados; CA/ataque referenciam definition única; duas instâncias idênticas podem ter estados diferentes; consumir último uso é atômico; importação recusa referência quebrada; alteração de label não quebra save.
