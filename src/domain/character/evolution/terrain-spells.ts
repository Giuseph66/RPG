/**
 * Magias de círculo do Círculo da Terra por terreno (Livro do Jogador, cap. 3). Sempre preparadas
 * e fora do limite de preparadas. Formato: nível de druida, ids das magias. Gerado das tabelas do livro.
 */
export const CIRCLE_TERRAIN_SPELLS: Readonly<Record<string, readonly (readonly [number, readonly string[]])[]>> = {
  "arctic": [[3, ["imobilizar-pessoa", "crescer-espinhos"]], [5, ["nevasca", "lentidao"]], [7, ["movimentacao-livre", "tempestade-de-gelo"]], [9, ["comunhao-com-a-natureza", "cone-de-frio"]]],
  "coast": [[3, ["passo-nebuloso", "reflexos"]], [5, ["andar-na-agua", "respirar-na-agua"]], [7, ["movimentacao-livre", "controlar-a-agua"]], [9, ["videncia", "conjurar-elemental"]]],
  "desert": [[3, ["nublar", "silencio"]], [5, ["criar-alimentos", "protecao-contra-energia"]], [7, ["praga", "terreno-alucinogeno"]], [9, ["muralha-de-pedra", "praga-de-insetos"]]],
  "forest": [[3, ["patas-de-aranha", "pele-de-arvore"]], [5, ["convocar-relampagos", "ampliar-plantas"]], [7, ["adivinhacao", "movimentacao-livre"]], [9, ["comunhao-com-a-natureza", "caminhar-em-arvores"]]],
  "mountain": [[3, ["crescer-espinhos", "patas-de-aranha"]], [5, ["mesclar-se-as-rochas", "relampago"]], [7, ["moldar-rochas", "pele-de-pedra"]], [9, ["criar-passagem", "muralha-de-pedra"]]],
  "swamp": [[3, ["escuridao", "flecha-acida-de-melf"]], [5, ["andar-na-agua", "nevoa-fetida"]], [7, ["localizar-criatura", "movimentacao-livre"]], [9, ["videncia", "praga-de-insetos"]]],
  "grassland": [[3, ["invisibilidade", "passos-sem-pegadas"]], [5, ["luz-do-dia", "velocidade"]], [7, ["adivinhacao", "movimentacao-livre"]], [9, ["praga-de-insetos", "sonho"]]],
  "underdark": [[3, ["patas-de-aranha", "teia"]], [5, ["forma-gasosa", "nevoa-fetida"]], [7, ["invisibilidade-maior", "moldar-rochas"]], [9, ["praga-de-insetos", "nevoa-mortal"]]],
};
