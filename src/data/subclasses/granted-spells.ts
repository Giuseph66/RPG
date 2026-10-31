/**
 * Magias que a subclasse concede e que ficam sempre preparadas (Livro do Jogador, cap. 3):
 * magias de domínio do Clérigo, de juramento do Paladino e do Conclave do Rastreador Subterrâneo.
 * Formato: nível de classe, ids das magias no catálogo. Gerado das tabelas do livro.
 */
export const SUBCLASS_GRANTED_SPELLS: Readonly<Record<string, readonly (readonly [number, readonly string[]])[]>> = {
  "knowledge-domain": [[1, ["comando", "identificacao"]], [3, ["augurio", "sugestao"]], [5, ["dificultar-deteccao", "falar-com-os-mortos"]], [7, ["olho-arcano", "confusao"]], [9, ["conhecimento-lendario", "videncia"]]],
  "trickery-domain": [[1, ["enfeiticar-pessoa", "disfarcar-se"]], [3, ["reflexos", "passos-sem-pegadas"]], [5, ["piscar", "dissipar-magia"]], [7, ["porta-dimensional", "metamorfose"]], [9, ["dominar-pessoa", "modificar-memoria"]]],
  "war-domain": [[1, ["auxilio-divino", "escudo-da-fe"]], [3, ["arma-magica", "arma-espiritual"]], [5, ["manto-do-cruzado", "espiritos-guardioes"]], [7, ["movimentacao-livre", "pele-de-pedra"]], [9, ["coluna-de-chamas", "imobilizar-monstro"]]],
  "light-domain": [[1, ["maos-flamejantes", "fogo-das-fadas"]], [3, ["esfera-flamejante", "raio-ardente"]], [5, ["luz-do-dia", "fireball"]], [7, ["guardiao-da-fe", "muralha-de-fogo"]], [9, ["coluna-de-chamas", "videncia"]]],
  "nature-domain": [[1, ["amizade-animal", "falar-com-animais"]], [3, ["pele-de-arvore", "crescer-espinhos"]], [5, ["ampliar-plantas", "muralha-de-vento"]], [7, ["dominar-besta", "vinha-esmagadora"]], [9, ["praga-de-insetos", "caminhar-em-arvores"]]],
  "tempest-domain": [[1, ["nevoa-obscurecente", "onda-trovejante"]], [3, ["lufada-de-vento", "despedacar"]], [5, ["convocar-relampagos", "nevasca"]], [7, ["controlar-a-agua", "tempestade-de-gelo"]], [9, ["onda-destrutiva", "praga-de-insetos"]]],
  "life-domain": [[1, ["bencao", "cure-wounds"]], [3, ["restauracao-menor", "arma-espiritual"]], [5, ["sinal-de-esperanca", "revivify"]], [7, ["protecao-contra-a-morte", "guardiao-da-fe"]], [9, ["curar-ferimentos-em-massa", "reviver-os-mortos"]]],
  "oath-of-devotion": [[3, ["protecao-contra-o-bem-e-mal", "santuario"]], [5, ["restauracao-menor", "zona-da-verdade"]], [9, ["sinal-de-esperanca", "dissipar-magia"]], [13, ["movimentacao-livre", "guardiao-da-fe"]], [17, ["comunhao", "coluna-de-chamas"]]],
  "oath-of-the-ancients": [[3, ["golpe-constritor", "falar-com-animais"]], [5, ["raio-lunar", "passo-nebuloso"]], [9, ["ampliar-plantas", "protecao-contra-energia"]], [13, ["tempestade-de-gelo", "pele-de-pedra"]], [17, ["comunhao-com-a-natureza", "caminhar-em-arvores"]]],
  "oath-of-vengeance": [[3, ["perdicao", "marca-do-cacador"]], [5, ["imobilizar-pessoa", "passo-nebuloso"]], [9, ["velocidade", "protecao-contra-energia"]], [13, ["banimento", "porta-dimensional"]], [17, ["imobilizar-monstro", "videncia"]]],
  "deep-stalker-conclave": [[3, ["disfarcar-se"]], [5, ["truque-de-corda"]], [9, ["glifo-de-vigilancia"]], [13, ["invisibilidade-maior"]], [17, ["similaridade"]]],
};
