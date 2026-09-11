# Druida — 2 círculos

Fonte: Livro do Jogador fornecido, cap.3, pp.74–76/PDF73–75. Escolha nível2; marcos6/10/14.

## `circle-of-the-land` — Círculo da Terra

- Nível2, Truque Adicional: um truque de druida extra. Recuperação Natural: uma vez por dia, ao fim de descanso curto, escolher slots gastos cuja soma de níveis ≤`floor(nívelDruida/2)` e cada slot ≤5º. A compilação usa arredondamento para baixo; preservar.
- Níveis3/5/7/9, Magias de Círculo: escolher terreno ártico, costa, deserto, floresta, montanha, pântano, planície ou subterrâneo; duas magias por marco. Contam como druida e não usam limite. A frase “sempre poderá prepará-la” fica em [PEND-004](../../../decisoes/PENDENCIAS.md); guardar concessão separada do estado prepared.
- Nível6, Caminho da Floresta: terreno difícil não mágico por plantas não custa extra; atravessa plantas não mágicas sem dano; vantagem contra plantas mágicas que impedem movimento.
- Nível10, Proteção Natural: imune a veneno/doença; não enfeitiçado/amedrontado por elementais/fadas.
- Nível14, Santuário Natural: besta/planta que ataca faz SAB contra CD druida; falha escolhe outro alvo ou erra; sucesso imune24h. Efeito não protege contra área.

Tabela completa de terrenos/magias: [magia](magia.md). UI exige uma escolha de terreno única no nível3, mostra concessões futuras, recuperação com orçamento e slots elegíveis.

## `circle-of-the-moon` — Círculo da Lua

- Nível2, Forma Selvagem de Combate: transformar como bônus. Durante forma, bônus + gasto de slot para curar `1d8×nível do slot`; não é conjuração, mas consome slot atomicamente.
- Nível2/6, Formas: nível2 aceita besta ND≤1 respeitando limites de natação/voo; nível6 teto=`floor(nívelDruida/3)`. Não usar teto base menor quando Lua substitui ND.
- Nível6, Ataque Primordial: ataques naturais da forma contam mágicos para resistência/imunidade.
- Nível10, Forma Selvagem Elemental: gastar2 usos simultâneos para elemental ar/terra/fogo/água. Blocos não constam completos nesta fonte: [PEND-008](../../../decisoes/PENDENCIAS.md).
- Nível14, Mil Formas: conjurar `alterar-se` à vontade, sem gastar espaço; demais requisitos continuam conforme característica.

Fluxo integral de transformação, HP, overflow, equipamentos e concentração: [regras especiais](regras-especiais.md). `WildShapeState` não substitui Character. Testes: Lua2 aceita Lobo Atroz visto; base2 não; cura slot2 rola2d8; dois usos exigidos juntos; falta de bloco elemental rejeita só transformação elemental.

## Contrato comum

`SubclassDefinition.classId=druid`, `selectionLevel=2`; terreno é ChoiceSelection própria. Recuperação/forma guarda `spent`, não usos restantes duplicados. Mudança de círculo exige prévia das magias, recursos e transformação ativa.
