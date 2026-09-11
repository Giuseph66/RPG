# Componentes e equipamento

Fonte: Livro do Jogador, cap.10 p.205/PDF204, armadura p.203/PDF202; focos no cap.5 e na classe concedente.

V exige capacidade de vocalizar: mordaça ou silêncio impede quando aplicável. S exige ao menos uma mão livre para gestos. M exige componentes descritos; bolsa/foco pode substituir apenas o permitido. Componente com custo expresso exige objeto específico; componente consumido precisa ser provido a cada conjuração. A mão que acessa M pode executar S dessa magia.

Não assumir que foco serve para qualquer fonte. Classe determina foco permitido; mão que segura foco numa magia S sem M não recebe exceção automaticamente. Talentos e características podem modificar restrições mediante regra própria. Armadura não proficiente impede conjuração, não apenas impõe penalidade ao ataque.

## Contrato de verificação

`componentContext`: canSpeak, freeHands, heldItems, accessibleComponentItems, availableFocusRefs, wearingArmor, proficiencyResult. Informação não rastreada recebe confirmação do jogador; não marcar disponível por padrão escondido.

Prévia enumera item e quantidade consumidos. Componente caro não consumido continua no inventário; não converter preço em dedução automática de moedas. Componente consumido é removido junto do gasto de magia, numa transação. Contexto insuficiente gera `needsInput`; cancelamento e falha não consomem.

Casos: V+S sem voz bloqueia; M valioso com foco somente bloqueia; diamante não consumido permanece; Revivificar remove componente consumido se conjuração elegível. Desconhecer rastreamento de mãos não impede consulta ao compêndio.
