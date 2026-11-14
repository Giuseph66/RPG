/**
 * Catálogo estruturado completo do Apêndice A local (páginas impressas 317–340).
 * Descrições completas permanecem na extração privada; aqui estão estatísticas, traços e ações
 * com sourceRefs por página para consulta rastreável. Enxames e criaturas não-besta preservam tipo.
 */
import { asEntityId, asRulesetId } from "@domain/contracts/ids";
import { asCentimeters } from "@domain/contracts/primitives";
import { type CreatureAction, type CreatureLegendaryAction, type CreatureSense, type CreatureStatBlock } from "@domain/creatures";

const sourceId = asRulesetId("manual-dos-monstros-apendice-a");
type ParsedSpeeds = {
  readonly walkCm?: number;
  readonly climbCm?: number;
  readonly swimCm?: number;
  readonly flyCm?: number;
  readonly burrowCm?: number;
  readonly hover?: boolean;
  readonly sourceText?: string;
};

type ParsedCreatureAction = Omit<CreatureAction, "reachCm" | "rangeCm"> & { readonly reachCm?: number; readonly rangeCm?: number };
type ParsedCreatureSense = Omit<CreatureSense, "rangeCm"> & { readonly rangeCm?: number };
type ParsedSourceRef = Omit<CreatureStatBlock["sourceRefs"][number], "sourceId"> & { readonly sourceId?: string };
type ParsedCreature = Omit<CreatureStatBlock, "id" | "speeds" | "sourceRefs" | "senses" | "actions" | "bonusActions" | "reactions" | "legendaryActions"> & {
  readonly id: string;
  readonly speeds: ParsedSpeeds;
  readonly sourceRefs: readonly ParsedSourceRef[];
  readonly senses?: readonly ParsedCreatureSense[];
  readonly actions?: readonly ParsedCreatureAction[];
  readonly bonusActions?: readonly ParsedCreatureAction[];
  readonly reactions?: readonly ParsedCreatureAction[];
  readonly legendaryActions?: Omit<CreatureLegendaryAction, "actions"> & { readonly actions: readonly ParsedCreatureAction[] };
};

const parsedCreatures: readonly ParsedCreature[] = [
  {
    "id": "appendix-a-abutre",
    "name": "ABUTRE",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 5,
      "hitDice": "1d8 + 1"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 1500
    },
    "abilityScores": {
      "str": 7,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 12,
      "cha": 4
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "abutre-visao-e-faro-agucados",
        "name": "Visão e Faro Aguçados",
        "description": "O abutre tem vantagem em testes de Sabedoria (Percepção) relacionados à visão e ao olfato."
      },
      {
        "id": "abutre-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O abutre tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do abutre estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "abutre-bicada",
        "name": "Bicada",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, um alvo. Acerto: 2 (1d4) de dano perfurante.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 317,
        "pdfPage": 1,
        "section": "ABUTRE"
      }
    ]
  },
  {
    "id": "appendix-a-abutre-gigante",
    "name": "ABUTRE GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "neutro e mau",
    "armorClass": 10,
    "hitPoints": {
      "average": 22,
      "hitDice": "3d10 + 6"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 1800
    },
    "abilityScores": {
      "str": 15,
      "dex": 10,
      "con": 15,
      "int": 6,
      "wis": 12,
      "cha": 7
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "languages": [
      "compreende Comum, mas não pode falar"
    ],
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "abutre-gigante-visao-e-faro-agucados",
        "name": "Visão e Faro Aguçados",
        "description": "O abutre tem vantagem em testes de Sabedoria (Percepção) relacionados à visão e ao olfato."
      },
      {
        "id": "abutre-gigante-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O abutre tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do abutre estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "abutre-gigante-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "A águia realiza dois ataques: um com sua bicada e um com suas garras."
      },
      {
        "id": "abutre-gigante-bicada",
        "name": "Bicada",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (2d4 + 2) de dano perfurante.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      },
      {
        "id": "abutre-gigante-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 9 (2d6 + 2) de dano cortante. Um abutre gigante possui uma inteligência avançada e uma inclinação malévola. Diferente de sua espécime menor, ele irá atacar uma criatura ferida apressar seu fim. Os abutres gigantes são conhecidos por assombrar criaturas sedentas e famintas por dias, divertindo-se com o sofrimento delas.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 317,
        "pdfPage": 1,
        "section": "ABUTRE GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-aguia",
    "name": "ÁGUIA",
    "creatureType": "beast",
    "size": "small",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 3,
      "hitDice": "1d6"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 1800
    },
    "abilityScores": {
      "str": 6,
      "dex": 15,
      "con": 10,
      "int": 2,
      "wis": 14,
      "cha": 7
    },
    "skills": {
      "perception": 4
    },
    "passivePerception": 14,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "aguia-visao-agucada",
        "name": "Visão Aguçada",
        "description": "A águia tem vantagem em testes de Sabedoria (Percepção) relacionados à visão."
      }
    ],
    "actions": [
      {
        "id": "aguia-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d4 + 2) de dano cortante.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 317,
        "pdfPage": 1,
        "section": "ÁGUIA"
      }
    ]
  },
  {
    "id": "appendix-a-aguia-gigante",
    "name": "ÁGUIA GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "neutro e bom",
    "armorClass": 13,
    "hitPoints": {
      "average": 26,
      "hitDice": "4d10 + 4"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 2400
    },
    "abilityScores": {
      "str": 16,
      "dex": 17,
      "con": 13,
      "int": 8,
      "wis": 14,
      "cha": 10
    },
    "skills": {
      "perception": 4
    },
    "passivePerception": 14,
    "languages": [
      "Águia Gigante, compreende Comum e Auran, mas não pode falar"
    ],
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "aguia-gigante-visao-agucada",
        "name": "Visão Aguçada",
        "description": "A águia tem vantagem em testes de Sabedoria (Percepção) relacionados à visão."
      }
    ],
    "actions": [
      {
        "id": "aguia-gigante-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "A águia realiza dois ataques: um com sua bicada e um com suas garras."
      },
      {
        "id": "aguia-gigante-bicada",
        "name": "Bicada",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d6 + 3) de dano perfurante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      },
      {
        "id": "aguia-gigante-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 10 (2d6 + 3) de dano cortante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      },
    ],
    "additionalInfo": {
      "notes": "Uma águia gigante é uma criatura nobre que fala seu próprio idioma e compreende os dialetos da língua Comum. Um casal pode ter até quatro ovos ou filhotes em seu ninho (trate os filhotes como águias normais)."
    },
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 317,
        "pdfPage": 1,
        "section": "ÁGUIA GIGANTE"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 318,
        "pdfPage": 2,
        "section": "ÁGUIA GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-alce",
    "name": "ALCE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 13,
      "hitDice": "2d10 + 2"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 16,
      "dex": 10,
      "con": 12,
      "int": 2,
      "wis": 10,
      "cha": 6
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "alce-investida",
        "name": "Investida",
        "description": "Se o alce se mover, pelo menos, 6 metros em linha reta em direção de um alvo logo antes de atingi-lo com seu ataque de cabeçada, o alvo sofrerá 7 (2d6) de dano extra. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Força CD 13 para não cair no chão."
      }
    ],
    "actions": [
      {
        "id": "alce-cabecada",
        "name": "Cabeçada",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d6 + 3) de dano de concussão.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      },
      {
        "id": "alce-cascos",
        "name": "Cascos",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (2d4 + 3) de dano de concussão.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 318,
        "pdfPage": 2,
        "section": "ALCE"
      }
    ]
  },
  {
    "id": "appendix-a-alce-gigante",
    "name": "ALCE GIGANTE",
    "creatureType": "beast",
    "size": "huge",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 14,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 42,
      "hitDice": "5d12 + 10"
    },
    "speeds": {
      "walkCm": 1800
    },
    "abilityScores": {
      "str": 19,
      "dex": 16,
      "con": 14,
      "int": 7,
      "wis": 14,
      "cha": 10
    },
    "skills": {
      "perception": 4
    },
    "passivePerception": 14,
    "languages": [
      "Alce Gigante, compreende Comum, Élfico e Silvestre, mas não pode falar"
    ],
    "challengeRating": {
      "numerator": 2,
      "denominator": 1
    },
    "experiencePoints": 450,
    "traits": [
      {
        "id": "alce-gigante-investida",
        "name": "Investida",
        "description": "Se o alce se mover, pelo menos, 6 metros em linha reta em direção de um alvo logo antes de atingi-lo com seu ataque de cabeçada, o alvo sofrerá 7 (2d6) de dano extra. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Força CD 14 para não cair no chão."
      }
    ],
    "actions": [
      {
        "id": "alce-gigante-cabecada",
        "name": "Cabeçada",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d6 + 3) de dano de concussão.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      },
      {
        "id": "alce-gigante-cascos",
        "name": "Cascos",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (2d4 + 3) de dano de concussão. O majestoso alce gigante é raro ao ponto de sua aparição ser, frequentemente ligado ao prenúncio de um evento importante, como o nascimento de um rei. Lendas contam de deuses que assumiam a forma de alces gigantes para visitar o Plano Material. Muitas culturas acreditam, por isso, que caçar essas criaturas é um convite a ira divina.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 318,
        "pdfPage": 2,
        "section": "ALCE GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-aranha",
    "name": "ARANHA",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 600,
      "climbCm": 600
    },
    "abilityScores": {
      "str": 2,
      "dex": 14,
      "con": 8,
      "int": 1,
      "wis": 10,
      "cha": 2
    },
    "skills": {
      "stealth": 4
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "aranha-escalada-aracnidea",
        "name": "Escalada Aracnídea",
        "description": "A aranha pode escalar superfícies difíceis, incluindo tetos de cabeça para baixo, sem precisar realizar um teste de habilidade."
      },
      {
        "id": "aranha-sentido-na-teia",
        "name": "Sentido na Teia",
        "description": "Quando em contato com uma teia, a aranha sabe a localização exata de qualquer outra criatura em contato com a mesma teia."
      },
      {
        "id": "aranha-andar-na-teia",
        "name": "Andar na Teia",
        "description": "A aranha ignora restrições de movimento causadas por estar numa teia."
      }
    ],
    "actions": [
      {
        "id": "aranha-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, uma criatura. Acerto: 1 de dano perfurante e o alvo deve ser bem sucedido num teste de resistência de Constituição CD 9 ou sofrerá 2 (1d4) de dano de veneno.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "note": "somente se falhar no teste de resistência de Constituição CD 9",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 318,
        "pdfPage": 2,
        "section": "ARANHA"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 319,
        "pdfPage": 3,
        "section": "ARANHA"
      }
    ]
  },
  {
    "id": "appendix-a-aranha-gigante",
    "name": "ARANHA GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 14,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 26,
      "hitDice": "4d10 + 4"
    },
    "speeds": {
      "walkCm": 900,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 14,
      "dex": 16,
      "con": 12,
      "int": 2,
      "wis": 11,
      "cha": 4
    },
    "skills": {
      "stealth": 7
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      },
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "aranha-gigante-escalada-aracnidea",
        "name": "Escalada Aracnídea",
        "description": "A aranha pode escalar superfícies difíceis, incluindo tetos de cabeça para baixo, sem precisar realizar um teste de habilidade."
      },
      {
        "id": "aranha-gigante-sentido-na-teia",
        "name": "Sentido na Teia",
        "description": "Quando em contato com uma teia, a aranha sabe a localização exata de qualquer outra criatura em contato com a mesma teia."
      },
      {
        "id": "aranha-gigante-andar-na-teia",
        "name": "Andar na Teia",
        "description": "A aranha ignora restrições de movimento causadas por estar numa teia."
      }
    ],
    "actions": [
      {
        "id": "aranha-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, uma criatura. Acerto: 7 (1d8 + 3) de dano perfurante e o alvo deve realizar um teste de resistência de Constituição CD 11, sofrendo 9 (2d8) de dano de veneno se falhar na resistência ou metade desse dano se obtiver sucesso. Se o dano de veneno reduzir o alvo a 0 pontos de vida, o alvo estará estável, porém, envenenado, por 1 hora e paralisado enquanto estiver envenenado dessa forma.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 3
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 2,
              "faces": 8
            },
            "note": "teste de resistência de Constituição CD 11; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      },
      {
        "id": "aranha-gigante-teia",
        "name": "Teia",
        "description": "Ataque à Distância com Arma: +5 para atingir, alcance 9 m/ 18 m, uma criatura. Acerto: O alvo ficará impedido pela teia. Com uma ação, o alvo impedido pode realizar um teste de Força CD 12, rompendo a teia com sucesso. A teia também pode ser atacada e destruída (CA 10; 5 pv; vulnerabilidade a fogo; imune a dano de concussão, veneno e psíquico).",
        "attackBonus": 5,
        "rangeCm": 1800,
        "recharge": "5–6"
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 319,
        "pdfPage": 3,
        "section": "ARANHA GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-aranha-interplanar",
    "name": "ARANHA INTERPLANAR",
    "creatureType": "monstrosity",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 32,
      "hitDice": "5d10 + 5"
    },
    "speeds": {
      "walkCm": 900,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 15,
      "dex": 15,
      "con": 12,
      "int": 6,
      "wis": 10,
      "cha": 6
    },
    "skills": {
      "stealth": 6
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 3,
      "denominator": 1
    },
    "experiencePoints": 700,
    "traits": [
      {
        "id": "aranha-interplanar-escalada-aracnidea",
        "name": "Escalada Aracnídea",
        "description": "A aranha pode escalar superfícies difíceis, incluindo tetos de cabeça para baixo, sem precisar realizar um teste de habilidade."
      },
      {
        "id": "aranha-interplanar-salto-etereo",
        "name": "Salto Etéreo",
        "description": "Com uma ação bônus, a aranha pode, magicamente, mudar do Plano Material para o Plano Etéreo, ou vice-versa."
      },
      {
        "id": "aranha-interplanar-andar-na-teia",
        "name": "Andar na Teia",
        "description": "A aranha ignora restrições de movimento causadas por estar numa teia."
      }
    ],
    "actions": [
      {
        "id": "aranha-interplanar-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, uma criatura. Acerto: 7 (1d10 + 2) de dano perfurante e o alvo deve realizar um teste de resistência de Constituição CD 11, sofrendo 18 (4d8) de dano de veneno se falhar na resistência ou metade desse dano se obtiver sucesso. Se o dano de veneno reduzir o alvo a 0 pontos de vida, o alvo estará estável, porém, envenenado, por 1 hora e paralisado enquanto estiver envenenado dessa forma. Uma aranha interplanar possui a habilidade mágica de entrar e sair do Plano Etéreo. Ela parece surgir de lugar nenhum e, rapidamente desaparece após atacar. Ela se movimenta no Plano Etéreo antes de voltar para o Plano Material, fazendo parecer que ela pode se teletransportar.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 10
            },
            "flatBonus": 2
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 4,
              "faces": 8
            },
            "note": "teste de resistência de Constituição CD 11; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 319,
        "pdfPage": 3,
        "section": "ARANHA INTERPLANAR"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 320,
        "pdfPage": 4,
        "section": "ARANHA INTERPLANAR"
      }
    ]
  },
  {
    "id": "appendix-a-aranha-lobo-gigante",
    "name": "ARANHA-LOBO GIGANTE",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "hitPoints": {
      "average": 11,
      "hitDice": "2d8 + 2"
    },
    "speeds": {
      "walkCm": 1200,
      "climbCm": 1200
    },
    "abilityScores": {
      "str": 12,
      "dex": 16,
      "con": 13,
      "int": 3,
      "wis": 12,
      "cha": 4
    },
    "skills": {
      "stealth": 7,
      "perception": 3
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      },
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "aranha-lobo-gigante-escalada-aracnidea",
        "name": "Escalada Aracnídea",
        "description": "A aranha pode escalar superfícies difíceis, incluindo tetos de cabeça para baixo, sem precisar realizar um teste de habilidade."
      },
      {
        "id": "aranha-lobo-gigante-sentido-na-teia",
        "name": "Sentido na Teia",
        "description": "Quando em contato com uma teia, a aranha sabe a localização exata de qualquer outra criatura em contato com a mesma teia."
      },
      {
        "id": "aranha-lobo-gigante-andar-na-teia",
        "name": "Andar na Teia",
        "description": "A aranha ignora restrições de movimento causadas por estar numa teia."
      }
    ],
    "actions": [
      {
        "id": "aranha-lobo-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, uma criatura. Acerto: 4 (1d6 + 1) de dano perfurante e o alvo deve realizar um teste de resistência de Constituição CD 11, sofrendo 7 (2d6) de dano de veneno se falhar na resistência ou metade desse dano se obtiver sucesso. Se o dano de veneno reduzir o alvo a 0 pontos de vida, o alvo estará estável, porém, envenenado, por 1 hora e paralisado enquanto estiver envenenado dessa forma. Menor que uma aranha gigante, a aranha-lobo gigante caça sua presa em terrenos abertos ou se esconde em tocas ou fendas, ou em cavidades cobertas por escombros.",
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 1
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "note": "teste de resistência de Constituição CD 11; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 320,
        "pdfPage": 4,
        "section": "ARANHA-LOBO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-arbusto-desperto",
    "name": "ARBUSTO DESPERTO",
    "creatureType": "plant",
    "size": "small",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 9,
    "hitPoints": {
      "average": 10,
      "hitDice": "3d6"
    },
    "speeds": {
      "walkCm": 600
    },
    "abilityScores": {
      "str": 6,
      "dex": 8,
      "con": 11,
      "int": 10,
      "wis": 10,
      "cha": 6
    },
    "damageVulnerabilities": [
      "fire"
    ],
    "damageResistances": [
      "piercing"
    ],
    "passivePerception": 10,
    "languages": [
      "um idioma conhecido pelo seu criador"
    ],
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "arbusto-desperto-aparencia-falsa",
        "name": "Aparência Falsa",
        "description": "Enquanto o arbusto permanecer imóvel, ele é indistinguível de um arbusto comum."
      }
    ],
    "actions": [
      {
        "id": "arbusto-desperto-rasgar",
        "name": "Rasgar",
        "description": "Ataque Corpo-a-Corpo com Arma: +1 para atingir, alcance 1,5 m, um alvo. Acerto: 1 (1d4 – 1) de dano cortante. Um arbusto desperto é um arbusto comum que adquiriu raciocínio e mobilidade através da magia despertar ou mágica similar.",
        "attackBonus": 1,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": -1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 320,
        "pdfPage": 4,
        "section": "ARBUSTO DESPERTO"
      }
    ]
  },
  {
    "id": "appendix-a-arminho",
    "name": "ARMINHO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 900
    },
    "abilityScores": {
      "str": 3,
      "dex": 16,
      "con": 8,
      "int": 2,
      "wis": 12,
      "cha": 3
    },
    "skills": {
      "stealth": 5,
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "arminho-audicao-e-faro-agucados",
        "name": "Audição e Faro Aguçados",
        "description": "O arminho tem vantagem em testes de Sabedoria (Percepção) relacionados à audição e ao olfato."
      }
    ],
    "actions": [
      {
        "id": "arminho-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano perfurante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 320,
        "pdfPage": 4,
        "section": "ARMINHO"
      }
    ]
  },
  {
    "id": "appendix-a-arminho-gigante",
    "name": "ARMINHO GIGANTE",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "hitPoints": {
      "average": 9,
      "hitDice": "2d8"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 11,
      "dex": 16,
      "con": 10,
      "int": 4,
      "wis": 12,
      "cha": 5
    },
    "skills": {
      "stealth": 5,
      "perception": 3
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [
      {
        "id": "arminho-gigante-audicao-e-faro-agucados",
        "name": "Audição e Faro Aguçados",
        "description": "O arminho tem vantagem em testes de Sabedoria (Percepção) relacionados à audição e ao olfato."
      }
    ],
    "actions": [
      {
        "id": "arminho-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 5 (1d4 + 3) de dano perfurante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 320,
        "pdfPage": 4,
        "section": "ARMINHO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-arvore-desperta",
    "name": "ÁRVORE DESPERTA",
    "creatureType": "plant",
    "size": "huge",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 59,
      "hitDice": "7d12 + 14"
    },
    "speeds": {
      "walkCm": 600
    },
    "abilityScores": {
      "str": 19,
      "dex": 6,
      "con": 15,
      "int": 10,
      "wis": 10,
      "cha": 7
    },
    "damageVulnerabilities": [
      "fire"
    ],
    "damageResistances": [
      "bludgeoning",
      "piercing"
    ],
    "passivePerception": 10,
    "languages": [
      "um idioma conhecido pelo seu criador"
    ],
    "challengeRating": {
      "numerator": 2,
      "denominator": 1
    },
    "experiencePoints": 450,
    "traits": [
      {
        "id": "arvore-desperta-aparencia-falsa",
        "name": "Aparência Falsa",
        "description": "Enquanto a árvore permanecer imóvel, ela é indistinguível de uma árvore normal."
      }
    ],
    "actions": [
      {
        "id": "arvore-desperta-pancada",
        "name": "Pancada",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 3 m, um alvo. Acerto: 14 (3d6 + 4) de dano de concussão. Uma árvore desperta é uma árvore comum que adquiriu raciocínio e mobilidade através da magia despertar ou mágica similar.",
        "attackBonus": 6,
        "reachCm": 300,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 3,
              "faces": 6
            },
            "flatBonus": 4
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 320,
        "pdfPage": 4,
        "section": "ÁRVORE DESPERTA"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 321,
        "pdfPage": 5,
        "section": "ÁRVORE DESPERTA"
      }
    ]
  },
  {
    "id": "appendix-a-babuino",
    "name": "BABUÍNO",
    "creatureType": "beast",
    "size": "small",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 3,
      "hitDice": "1d6"
    },
    "speeds": {
      "walkCm": 900,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 8,
      "dex": 14,
      "con": 11,
      "int": 4,
      "wis": 12,
      "cha": 6
    },
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "babuino-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O babuíno tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do babuíno estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "babuino-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +1 para atingir, alcance 1,5 m, um alvo. Acerto: 1 (1d4 – 1) de dano perfurante.",
        "attackBonus": 1,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": -1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 321,
        "pdfPage": 5,
        "section": "BABUÍNO"
      }
    ]
  },
  {
    "id": "appendix-a-baleia-assassina",
    "name": "BALEIA ASSASSINA",
    "creatureType": "beast",
    "size": "huge",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 90,
      "hitDice": "12d12 + 12"
    },
    "speeds": {
      "walkCm": 0,
      "swimCm": 1800
    },
    "abilityScores": {
      "str": 19,
      "dex": 10,
      "con": 13,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "skills": {
      "perception": 3
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 3600
      }
    ],
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 3,
      "denominator": 1
    },
    "experiencePoints": 700,
    "traits": [
      {
        "id": "baleia-assassina-audicao-agucada",
        "name": "Audição Aguçada",
        "description": "A baleia tem vantagem em testes de Sabedoria (Percepção) relacionados à audição."
      },
      {
        "id": "baleia-assassina-eco-localizacao",
        "name": "Eco Localização",
        "description": "Enquanto não puder ouvir, a baleia perderá a percepção às cegas."
      },
      {
        "id": "baleia-assassina-prender-a-respiracao",
        "name": "Prender a Respiração",
        "description": "A baleia consegue prender sua respiração por 30 minutos."
      }
    ],
    "actions": [
      {
        "id": "baleia-assassina-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 1,5 m, um alvo. Acerto: 21 (5d6 + 4) de dano perfurante.",
        "attackBonus": 6,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 5,
              "faces": 6
            },
            "flatBonus": 4
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 321,
        "pdfPage": 5,
        "section": "BALEIA ASSASSINA"
      }
    ]
  },
  {
    "id": "appendix-a-besouro-de-fogo-gigante",
    "name": "BESOURO DE FOGO GIGANTE",
    "creatureType": "beast",
    "size": "small",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 4,
      "hitDice": "1d6 + 1"
    },
    "speeds": {
      "walkCm": 900
    },
    "abilityScores": {
      "str": 8,
      "dex": 10,
      "con": 12,
      "int": 1,
      "wis": 7,
      "cha": 3
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 900
      }
    ],
    "passivePerception": 8,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "besouro-de-fogo-gigante-iluminacao",
        "name": "Iluminação",
        "description": "O besouro emite luz plena num raio de 3 metros e penumbra por mais 3 metros adicionais."
      }
    ],
    "actions": [
      {
        "id": "besouro-de-fogo-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +1 para atingir, alcance 1,5 m, um alvo. Acerto: 2 (1d6 – 1) de dano cortante. Um besouro de fogo gigante é uma criatura noturna que adquiriu esse nome por ter um par de glândulas brilhantes que emitem luz. Mineradores e aventureiros apreciam essas criaturas, pois as glândulas de um besouro de fogo gigante continuam a emitir luz por 1d6 dias após o besouro morrer. Os besouros de fogo gigantes são mais comumente encontrados no subsolo e em florestas escuras.",
        "attackBonus": 1,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": -1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 321,
        "pdfPage": 5,
        "section": "BESOURO DE FOGO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-bico-de-machado",
    "name": "BICO DE MACHADO",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "hitPoints": {
      "average": 19,
      "hitDice": "3d10 + 3"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 14,
      "dex": 12,
      "con": 12,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "passivePerception": 1,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [],
    "actions": [
      {
        "id": "bico-de-machado-bicada",
        "name": "Bicada",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d8 + 2) de dano cortante. Um bico de machado é uma ave alta incapaz de voar com poderosas pernas e um pesado bico curvado. Ele tem a desagradável disposição de atacar qualquer criatura desconhecida que passe muito próximo dele.",
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 321,
        "pdfPage": 5,
        "section": "BICO DE MACHADO"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 322,
        "pdfPage": 6,
        "section": "BICO DE MACHADO"
      }
    ]
  },
  {
    "id": "appendix-a-bode",
    "name": "BODE",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 4,
      "hitDice": "1d8"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 12,
      "dex": 10,
      "con": 11,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "bode-estavel",
        "name": "Estável",
        "description": "O bode possui vantagem em testes de resistência de Força e Destreza feitos contra efeitos que poderiam derruba-lo no chão."
      },
      {
        "id": "bode-investida",
        "name": "Investida",
        "description": "Se o bode se mover, pelo menos, 6 metros em linha reta em direção de uma criatura logo antes de atingi-la com seu ataque de cabeçada, o alvo sofre 2 (1d4) de dano de concussão extra. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Força CD 10 para não cair no chão."
      }
    ],
    "actions": [
      {
        "id": "bode-cabecada",
        "name": "Cabeçada",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 3 (1d4 + 1) de dano de concussão.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 322,
        "pdfPage": 6,
        "section": "BODE"
      }
    ]
  },
  {
    "id": "appendix-a-bode-gigante",
    "name": "BODE GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 19,
      "hitDice": "3d10 + 3"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 17,
      "dex": 11,
      "con": 12,
      "int": 3,
      "wis": 12,
      "cha": 6
    },
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [
      {
        "id": "bode-gigante-estavel",
        "name": "Estável",
        "description": "O bode possui vantagem em testes de resistência de Força e Destreza feitos contra efeitos que poderiam derruba-lo no chão."
      },
      {
        "id": "bode-gigante-investida",
        "name": "Investida",
        "description": "Se o bode se mover, pelo menos, 6 metros em linha reta em direção de uma criatura logo antes de atingi-la com seu ataque de cabeçada, o alvo sofre 5 (2d4) de dano de concussão extra. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Força CD 13 para não cair no chão."
      }
    ],
    "actions": [
      {
        "id": "bode-gigante-cabecada",
        "name": "Cabeçada",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (2d4 + 3) de dano de concussão.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 322,
        "pdfPage": 6,
        "section": "BODE GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-cao-da-morte",
    "name": "CÃO DA MORTE",
    "creatureType": "monstrosity",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "neutro e mau",
    "armorClass": 12,
    "hitPoints": {
      "average": 39,
      "hitDice": "6d8 + 12"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 15,
      "dex": 14,
      "con": 14,
      "int": 3,
      "wis": 13,
      "cha": 6
    },
    "skills": {
      "stealth": 4,
      "perception": 5
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 3600
      }
    ],
    "passivePerception": 15,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "cao-da-morte-duas-cabecas",
        "name": "Duas Cabeças",
        "description": "O cão tem vantagem e testes de Sabedoria (Percepção) e em testes de resistência contra ser amedrontado, atordoado, cegado, enfeitiçado, ensurdecido ou derrubado inconsciente."
      }
    ],
    "actions": [
      {
        "id": "cao-da-morte-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "O cão realiza dois ataques de mordida."
      },
      {
        "id": "cao-da-morte-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 5 (1d6 + 2) de dano perfurante. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Constituição CD 12 contra doença, ou ficará envenenado até a doença ser curada. A cada 24 horas passadas, a criatura deve repetir o teste de resistência, reduzindo seu máximo de pontos de vida em 5 (1d10) se fracassar. Essa redução dura até a doença ser curada. A criatura morre se a doença reduzir seu máximo de pontos de vida a 0. O cão da morte é um cão horrendo de duas cabeças que vaga por planícies, desertos e pelo Subterrâneo. O ódio queima no coração de um cão da morte e o gosto pela carne humanoide o leva a atacar viajantes e exploradores. A saliva do cão da morte carrega uma doença medonha que faz com que a carne da vítima apodreça lentamente, soltando-se dos ossos.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 322,
        "pdfPage": 6,
        "section": "CÃO DA MORTE"
      }
    ]
  },
  {
    "id": "appendix-a-cao-teleportador",
    "name": "CÃO TELEPORTADOR",
    "creatureType": "fey",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "leal e bom",
    "armorClass": 13,
    "hitPoints": {
      "average": 22,
      "hitDice": "4d8 + 4"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 12,
      "dex": 17,
      "con": 12,
      "int": 10,
      "wis": 13,
      "cha": 11
    },
    "skills": {
      "stealth": 5,
      "perception": 3
    },
    "passivePerception": 13,
    "languages": [
      "Cão Teleportador, compreende Silvestre, mas não pode falar"
    ],
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "cao-teleportador-audicao-e-faro-agucados",
        "name": "Audição e Faro Aguçados",
        "description": "O cão tem vantagem em testes de Sabedoria (Percepção) relacionados à audição e ao olfato."
      }
    ],
    "actions": [
      {
        "id": "cao-teleportador-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d6 + 1) de dano perfurante.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 1
          }
        ]
      },
      {
        "id": "cao-teleportador-teletransporte",
        "name": "Teletransporte",
        "description": "O cão teletransporta-se magicamente, juntamente com qualquer equipamento que ele esteja vestindo ou carregando, para um espaço desocupado, a até 12 metros, que ele possa ver. Um cão teleportador recebe esse nome por causa da habilidade de piscar para dentro e para fora da existência, um talento usado para ajudá-lo a atacar e evitar se ferir. Os cães teleportadores nutrem um ódio antigo pelas panteras deslocadoras e as atacam a primeira vista."
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 322,
        "pdfPage": 6,
        "section": "CÃO TELEPORTADOR"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 323,
        "pdfPage": 7,
        "section": "CÃO TELEPORTADOR"
      }
    ]
  },
  {
    "id": "appendix-a-camelo",
    "name": "CAMELO",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 9,
    "hitPoints": {
      "average": 15,
      "hitDice": "2d10 + 4"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 16,
      "dex": 8,
      "con": 14,
      "int": 2,
      "wis": 8,
      "cha": 5
    },
    "passivePerception": 9,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [],
    "actions": [
      {
        "id": "camelo-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 2 (1d4) de dano de concussão.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 4
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 323,
        "pdfPage": 7,
        "section": "CAMELO"
      }
    ]
  },
  {
    "id": "appendix-a-caranguejo",
    "name": "CARANGUEJO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 2,
      "hitDice": "1d4"
    },
    "speeds": {
      "walkCm": 600,
      "swimCm": 600
    },
    "abilityScores": {
      "str": 2,
      "dex": 11,
      "con": 10,
      "int": 1,
      "wis": 8,
      "cha": 2
    },
    "skills": {
      "stealth": 2
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 900
      }
    ],
    "passivePerception": 9,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "caranguejo-anfibio",
        "name": "Anfíbio",
        "description": "O caranguejo pode respirar ar e água."
      }
    ],
    "actions": [
      {
        "id": "caranguejo-garra",
        "name": "Garra",
        "description": "Ataque Corpo-a-Corpo com Arma: +0 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano de concussão.",
        "attackBonus": 0,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 323,
        "pdfPage": 7,
        "section": "CARANGUEJO"
      }
    ]
  },
  {
    "id": "appendix-a-caranguejo-gigante",
    "name": "CARANGUEJO GIGANTE",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 15,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 13,
      "hitDice": "3d8"
    },
    "speeds": {
      "walkCm": 900,
      "swimCm": 900
    },
    "abilityScores": {
      "str": 13,
      "dex": 15,
      "con": 11,
      "int": 1,
      "wis": 9,
      "cha": 3
    },
    "skills": {
      "stealth": 4
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 900
      }
    ],
    "passivePerception": 9,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [
      {
        "id": "caranguejo-gigante-anfibio",
        "name": "Anfíbio",
        "description": "O caranguejo pode respirar ar e água."
      }
    ],
    "actions": [
      {
        "id": "caranguejo-gigante-garra",
        "name": "Garra",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d6 + 1) de dano de concussão e o alvo fica agarrado (CD 11 para escapar). Se o caranguejo tiver duas garras, cada uma pode agarrar apenas um alvo.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 323,
        "pdfPage": 7,
        "section": "CARANGUEJO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-cavalo-de-carga",
    "name": "CAVALO DE CARGA",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 19,
      "hitDice": "3d10 + 3"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 18,
      "dex": 10,
      "con": 12,
      "int": 2,
      "wis": 11,
      "cha": 7
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [],
    "actions": [
      {
        "id": "cavalo-de-carga-cascos",
        "name": "Cascos",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 9 (2d4 + 4) de dano de concussão.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 4
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 323,
        "pdfPage": 7,
        "section": "CAVALO DE CARGA"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 324,
        "pdfPage": 8,
        "section": "CAVALO DE CARGA"
      }
    ]
  },
  {
    "id": "appendix-a-cavalo-de-guerra",
    "name": "CAVALO DE GUERRA",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "hitPoints": {
      "average": 19,
      "hitDice": "3d10 + 3"
    },
    "speeds": {
      "walkCm": 1800
    },
    "abilityScores": {
      "str": 18,
      "dex": 12,
      "con": 13,
      "int": 2,
      "wis": 12,
      "cha": 7
    },
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [
      {
        "id": "cavalo-de-guerra-atropelar",
        "name": "Atropelar",
        "description": "Se o cavalo se mover, pelo menos, 6 metros em linha reta em direção de um alvo logo antes de atingi-lo com seu ataque de cascos, o alvo deve ser bem sucedido num teste de resistência de Força CD 14 para não cair no chão. Se o alvo cair no chão, o cavalo poderá realizar uma ação bônus para realizar outro ataque de cascos contra ele."
      }
    ],
    "sourceText": {
      "variation.armoredWarhorse": "VARIAÇÃO: ARMADURA PARA CAVALO DE GUERRA Um cavalo de guerra de armadura terá uma Classe de Armadura baseada no tipo de armadura vestida (veja o Livro do Jogador para mais informações sobre armaduras). A Classe de Armadura dele inclui o modificador de Destreza do cavalo, quando aplicável. A armadura não altera o nível de desafio do cavalo. CA Armadura CA Armadura 12 Armadura de couro 16 Cota de malha 13 Gibão de peles 17 Cota de talas 14 Cota de anéis 18 Placas 15 Brunea"
    },
    "actions": [
      {
        "id": "cavalo-de-guerra-cascos",
        "name": "Cascos",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 1,5 m, um alvo. Acerto: 11 (2d6 + 4) de dano de concussão.",
        "attackBonus": 6,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 4
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 324,
        "pdfPage": 8,
        "section": "CAVALO DE GUERRA"
      }
    ]
  },
  {
    "id": "appendix-a-cavalo-de-montaria",
    "name": "CAVALO DE MONTARIA",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 13,
      "hitDice": "2d10 + 2"
    },
    "speeds": {
      "walkCm": 1800
    },
    "abilityScores": {
      "str": 16,
      "dex": 10,
      "con": 12,
      "int": 2,
      "wis": 11,
      "cha": 7
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [],
    "actions": [
      {
        "id": "cavalo-de-montaria-cascos",
        "name": "Cascos",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (2d4 + 3) de dano de concussão.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 324,
        "pdfPage": 8,
        "section": "CAVALO DE MONTARIA"
      }
    ]
  },
  {
    "id": "appendix-a-cavalo-marinho",
    "name": "CAVALO MARINHO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 0,
      "swimCm": 1200
    },
    "abilityScores": {
      "str": 1,
      "dex": 12,
      "con": 8,
      "int": 1,
      "wis": 10,
      "cha": 2
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 3600
      }
    ],
    "passivePerception": 14,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 0,
    "traits": [
      {
        "id": "cavalo-marinho-respirar-na-agua",
        "name": "Respirar na Água",
        "description": "O cavalo marinho pode respirar apenas em baixo d’água."
      }
    ],
    "actions": [],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 324,
        "pdfPage": 8,
        "section": "CAVALO MARINHO"
      }
    ]
  },
  {
    "id": "appendix-a-cavalo-marinho-gigante",
    "name": "CAVALO MARINHO GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 16,
      "hitDice": "3d10"
    },
    "speeds": {
      "walkCm": 0,
      "swimCm": 1200
    },
    "abilityScores": {
      "str": 12,
      "dex": 15,
      "con": 11,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [
      {
        "id": "cavalo-marinho-gigante-investida",
        "name": "Investida",
        "description": "Se o cavalo marinho se mover, pelo menos, 6 metros em linha reta em direção de uma criatura logo antes de atingi-la com seu ataque de cabeçada, o alvo sofre 7 (2d6) de dano de concussão extra. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Força CD 11 para não cair no chão."
      },
      {
        "id": "cavalo-marinho-gigante-respirar-na-agua",
        "name": "Respirar na Água",
        "description": "O cavalo marinho pode respirar apenas em baixo d’água."
      }
    ],
    "actions": [
      {
        "id": "cavalo-marinho-gigante-cabecada",
        "name": "Cabeçada",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d6 + 1) de dano de concussão. Como sua espécie menor, os cavalos marinhos gigantes são peixes coloridos tímidos com corpos alongados e caudas enroladas. Os elfos aquáticos os treinam como montarias.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 324,
        "pdfPage": 8,
        "section": "CAVALO MARINHO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-centopeia-gigante",
    "name": "CENTOPEIA GIGANTE",
    "creatureType": "beast",
    "size": "small",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 4,
      "hitDice": "1d6 + 1"
    },
    "speeds": {
      "walkCm": 900,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 5,
      "dex": 14,
      "con": 12,
      "int": 1,
      "wis": 7,
      "cha": 3
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 900
      }
    ],
    "passivePerception": 8,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [],
    "actions": [
      {
        "id": "centopeia-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, uma criatura. Acerto: 4 (1d4 + 2) de dano perfurante e o alvo deve ser bem sucedido num teste de resistência de Constituição CD 11 ou sofrerá 10 (3d6) de dano de veneno. Se o veneno reduzir os pontos de vida do alvo a 0, ele fica estável mas envenenado por 1 hora, mesmo após recuperar pontos de vida, e fica paralisado enquanto estiver envenenado dessa forma.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 2
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 3,
              "faces": 6
            },
            "note": "somente se falhar no teste de resistência de Constituição CD 11",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 324,
        "pdfPage": 8,
        "section": "CENTOPEIA GIGANTE"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 325,
        "pdfPage": 9,
        "section": "CENTOPEIA GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-chacal",
    "name": "CHACAL",
    "creatureType": "beast",
    "size": "small",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 3,
      "hitDice": "1d6"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 8,
      "dex": 15,
      "con": 11,
      "int": 3,
      "wis": 12,
      "cha": 6
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "chacal-audicao-e-faro-agucados",
        "name": "Audição e Faro Aguçados",
        "description": "O chacal tem vantagem em testes de Sabedoria (Percepção) relacionados à audição e ao olfato."
      },
      {
        "id": "chacal-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O chacal tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do chacal estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "chacal-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +1 para atingir, alcance 1,5 m, um alvo. Acerto: 1 (1d4 – 1) de dano perfurante.",
        "attackBonus": 1,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": -1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 325,
        "pdfPage": 9,
        "section": "CHACAL"
      }
    ]
  },
  {
    "id": "appendix-a-cobra-constritora",
    "name": "COBRA CONSTRITORA",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 13,
      "hitDice": "2d10 + 2"
    },
    "speeds": {
      "walkCm": 900,
      "swimCm": 900
    },
    "abilityScores": {
      "str": 15,
      "dex": 14,
      "con": 12,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [],
    "actions": [
      {
        "id": "cobra-constritora-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, uma criatura. Acerto: 5 (1d6 + 2) de dano perfurante.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 2
          }
        ]
      },
      {
        "id": "cobra-constritora-constricao",
        "name": "Constrição",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, uma criatura. Acerto: 6 (1d8 + 2) de dano de concussão e o alvo está agarrado (CD 14 para escapar). Até o agarrão terminar, a criatura estará impedida e a cobra não poderá constringir outro alvo.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 325,
        "pdfPage": 9,
        "section": "COBRA CONSTRITORA"
      }
    ]
  },
  {
    "id": "appendix-a-cobra-constritora-gigante",
    "name": "COBRA CONSTRITORA GIGANTE",
    "creatureType": "beast",
    "size": "huge",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 60,
      "hitDice": "8d12 + 8"
    },
    "speeds": {
      "walkCm": 900,
      "swimCm": 900
    },
    "abilityScores": {
      "str": 19,
      "dex": 14,
      "con": 12,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "skills": {
      "perception": 2
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      }
    ],
    "passivePerception": 12,
    "challengeRating": {
      "numerator": 2,
      "denominator": 1
    },
    "experiencePoints": 450,
    "traits": [],
    "actions": [
      {
        "id": "cobra-constritora-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 3 m, uma criatura. Acerto: 11 (2d6 + 4) de dano perfurante.",
        "attackBonus": 6,
        "reachCm": 300,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 4
          }
        ]
      },
      {
        "id": "cobra-constritora-gigante-constricao",
        "name": "Constrição",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 1,5 m, uma criatura. Acerto: 13 (2d8 + 4) de dano de concussão e o alvo está agarrado (CD 16 para escapar). Até o agarrão terminar, a criatura estará impedida e a cobra não poderá constringir outro alvo.",
        "attackBonus": 6,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 8
            },
            "flatBonus": 4
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 325,
        "pdfPage": 9,
        "section": "COBRA CONSTRITORA GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-cobra-voadora",
    "name": "COBRA VOADORA",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 14,
    "hitPoints": {
      "average": 5,
      "hitDice": "2d4"
    },
    "speeds": {
      "walkCm": 900,
      "swimCm": 900,
      "flyCm": 1800
    },
    "abilityScores": {
      "str": 4,
      "dex": 18,
      "con": 11,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      }
    ],
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [],
    "actions": [
      {
        "id": "cobra-voadora-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 1,5 m, uma criatura. Acerto: 1 de dano perfurante mais 7 (3d4) de dano de veneno. Uma cobra voadora é uma serpente alada de cores vivas, encontrada em selvas remotas. Povos de tribo e cultistas, às vezes, domesticam cobras voadoras para servir de mensageiros que entregam pergaminhos enrolados em seus corpos.",
        "attackBonus": 6,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 3,
              "faces": 4
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 325,
        "pdfPage": 9,
        "section": "COBRA VOADORA"
      }
    ]
  },
  {
    "id": "appendix-a-coruja",
    "name": "CORUJA",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 150,
      "flyCm": 1800
    },
    "abilityScores": {
      "str": 3,
      "dex": 13,
      "con": 8,
      "int": 2,
      "wis": 14,
      "cha": 7
    },
    "skills": {
      "stealth": 3,
      "perception": 4
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 3600
      }
    ],
    "passivePerception": 14,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "coruja-sobrevoo",
        "name": "Sobrevoo",
        "description": "A coruja não provoca ataques de oportunidade quando voa para fora do alcance de um inimigo."
      },
      {
        "id": "coruja-visao-e-audicao-agucadas",
        "name": "Visão e Audição Aguçadas",
        "description": "A coruja tem vantagem em testes de Sabedoria (Percepção) relacionados à visão e à audição."
      }
    ],
    "actions": [
      {
        "id": "coruja-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano cortante.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 325,
        "pdfPage": 9,
        "section": "CORUJA"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 326,
        "pdfPage": 10,
        "section": "CORUJA"
      }
    ]
  },
  {
    "id": "appendix-a-coruja-gigante",
    "name": "CORUJA GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 19,
      "hitDice": "3d10 + 3"
    },
    "speeds": {
      "walkCm": 150,
      "flyCm": 1800
    },
    "abilityScores": {
      "str": 13,
      "dex": 15,
      "con": 12,
      "int": 8,
      "wis": 14,
      "cha": 10
    },
    "skills": {
      "stealth": 4,
      "perception": 6
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 3600
      }
    ],
    "passivePerception": 16,
    "languages": [
      "Coruja Gigante, compreende Comum, Élfico e Silvestre, mas não pode falar"
    ],
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "coruja-gigante-sobrevoo",
        "name": "Sobrevoo",
        "description": "A coruja não provoca ataques de oportunidade quando voa para fora do alcance de um inimigo."
      },
      {
        "id": "coruja-gigante-visao-e-audicao-agucadas",
        "name": "Visão e Audição Aguçadas",
        "description": "A coruja tem vantagem em testes de Sabedoria (Percepção) relacionados à visão e à audição."
      }
    ],
    "actions": [
      {
        "id": "coruja-gigante-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (2d6 + 1) de dano cortante. As corujas gigantes frequentemente fazem amizades com fadas e outras criaturas silvestres, e são guardiãs dos reinos florestais.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 326,
        "pdfPage": 10,
        "section": "CORUJA GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-corvo",
    "name": "CORVO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 1500
    },
    "abilityScores": {
      "str": 2,
      "dex": 14,
      "con": 8,
      "int": 2,
      "wis": 12,
      "cha": 6
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "corvo-mimica",
        "name": "Mímica",
        "description": "O corvo é capaz de imitar sons simples que ele ouve, como pessoas cochichando, um bebê chorando ou um animal rangendo. Uma criatura que ouvir os sons pode perceber que são imitações se for bem sucedida num teste de Sabedoria (Intuição) CD 10."
      }
    ],
    "actions": [
      {
        "id": "corvo-bicada",
        "name": "Bicada",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano perfurante.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 326,
        "pdfPage": 10,
        "section": "CORVO"
      }
    ]
  },
  {
    "id": "appendix-a-crocodilo",
    "name": "CROCODILO",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 19,
      "hitDice": "3d10 + 3"
    },
    "speeds": {
      "walkCm": 600,
      "swimCm": 900
    },
    "abilityScores": {
      "str": 15,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "skills": {
      "stealth": 2
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [
      {
        "id": "crocodilo-prender-a-respiracao",
        "name": "Prender a Respiração",
        "description": "O crocodilo consegue prender sua respiração por 15 minutos."
      }
    ],
    "actions": [
      {
        "id": "crocodilo-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (1d10 + 2) de dano perfurante e o alvo está agarrado (CD 12 para escapar). Até o agarrão terminar, a criatura estará impedida e o crocodilo não poderá morder outro alvo.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 10
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 326,
        "pdfPage": 10,
        "section": "CROCODILO"
      }
    ]
  },
  {
    "id": "appendix-a-crocodilo-gigante",
    "name": "CROCODILO GIGANTE",
    "creatureType": "beast",
    "size": "huge",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 14,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 85,
      "hitDice": "9d12 + 27"
    },
    "speeds": {
      "walkCm": 900,
      "swimCm": 1500
    },
    "abilityScores": {
      "str": 21,
      "dex": 9,
      "con": 17,
      "int": 2,
      "wis": 10,
      "cha": 7
    },
    "skills": {
      "stealth": 5
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 5,
      "denominator": 1
    },
    "experiencePoints": 1800,
    "traits": [
      {
        "id": "crocodilo-gigante-prender-a-respiracao",
        "name": "Prender a Respiração",
        "description": "O crocodilo consegue prender sua respiração por 30 minutos."
      }
    ],
    "actions": [
      {
        "id": "crocodilo-gigante-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "O crocodilo realiza dois ataques: um com sua mordida e um com sua cauda."
      },
      {
        "id": "crocodilo-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +8 para atingir, alcance 1,5 m, um alvo. Acerto: 21 (3d10 + 5) de dano perfurante e o alvo está agarrado (CD 16 para escapar). Até o agarrão terminar, a criatura estará impedida e o crocodilo não poderá morder outro alvo.",
        "attackBonus": 8,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 3,
              "faces": 10
            },
            "flatBonus": 5
          }
        ]
      },
      {
        "id": "crocodilo-gigante-cauda",
        "name": "Cauda",
        "description": "Ataque Corpo-a-Corpo com Arma: +8 para atingir, alcance 3 m, um alvo. Acerto: 14 (2d8 + 5) de dano de concussão. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Força CD 16 ou cairá no chão.",
        "attackBonus": 8,
        "reachCm": 300,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 8
            },
            "flatBonus": 5
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 326,
        "pdfPage": 10,
        "section": "CROCODILO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-elefante",
    "name": "ELEFANTE",
    "creatureType": "beast",
    "size": "huge",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 76,
      "hitDice": "8d12 + 24"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 22,
      "dex": 9,
      "con": 17,
      "int": 3,
      "wis": 11,
      "cha": 6
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 4,
      "denominator": 1
    },
    "experiencePoints": 1100,
    "traits": [
      {
        "id": "elefante-investida-esmagadora",
        "name": "Investida Esmagadora",
        "description": "Se o elefante se mover, pelo menos, 6 metros em linha reta em direção de uma criatura logo antes de atingi-la com seu ataque de presa, o alvo deve ser bem sucedido num teste de resistência de Força CD 16 para não cair no chão. Se o alvo cair no chão, o elefante pode realizar um ataque de pisotear contra ele com uma ação bônus."
      }
    ],
    "actions": [
      {
        "id": "elefante-presas",
        "name": "Presas",
        "description": "Ataque Corpo-a-Corpo com Arma: +8 para atingir, alcance 1,5 m, um alvo. Acerto: 19 (3d8 + 6) de dano perfurante.",
        "attackBonus": 8,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 3,
              "faces": 8
            },
            "flatBonus": 6
          }
        ]
      },
      {
        "id": "elefante-pisotear",
        "name": "Pisotear",
        "description": "Ataque Corpo-a-Corpo com Arma: +8 para atingir, alcance 1,5 m, uma criatura caída. Acerto: 22 (3d10 + 6) de dano de concussão.",
        "attackBonus": 8,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 3,
              "faces": 10
            },
            "flatBonus": 6
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 326,
        "pdfPage": 10,
        "section": "ELEFANTE"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 327,
        "pdfPage": 11,
        "section": "ELEFANTE"
      }
    ]
  },
  {
    "id": "appendix-a-enxame-de-corvos",
    "name": "ENXAME DE CORVOS",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a",
      "swarm"
    ],
    "isSwarm": true,
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 24,
      "hitDice": "7d8 – 1"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 1500
    },
    "abilityScores": {
      "str": 6,
      "dex": 14,
      "con": 8,
      "int": 3,
      "wis": 12,
      "cha": 6
    },
    "skills": {
      "perception": 5
    },
    "damageResistances": [
      "bludgeoning",
      "slashing",
      "piercing"
    ],
    "conditionImmunities": [
      "agarrado",
      "amedrontado",
      "atordoado",
      "caído",
      "enfeitiçado",
      "impedido",
      "paralisado",
      "petrificado"
    ],
    "passivePerception": 15,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "enxame-de-corvos-enxame",
        "name": "Enxame",
        "description": "O enxame pode ocupar o espaço de outra criatura e vice- versa, e o enxame pode se mover através de qualquer abertura grande o suficiente para um corvo Miúdo. O enxame não pode recuperar pontos de vida ou ganhar pontos de vida temporários."
      }
    ],
    "actions": [
      {
        "id": "enxame-de-corvos-bicadas",
        "name": "Bicadas",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 0 m, um alvo no espaço do enxame. Acerto: 7 (2d6) de dano perfurante, ou 3 (1d6) de dano perfurante se o enxame estiver com metade de seus pontos de vida ou menos.",
        "requiresManualResolution": true,
        "attackBonus": 4,
        "reachCm": 0,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 6
            }
          },
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 327,
        "pdfPage": 11,
        "section": "ENXAME DE CORVOS"
      }
    ]
  },
  {
    "id": "appendix-a-enxame-de-insetos",
    "name": "ENXAME DE INSETOS",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a",
      "swarm"
    ],
    "isSwarm": true,
    "alignment": "imparcial",
    "armorClass": 12,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 22,
      "hitDice": "5d8"
    },
    "speeds": {
      "walkCm": 600,
      "climbCm": 600
    },
    "abilityScores": {
      "str": 3,
      "dex": 13,
      "con": 10,
      "int": 1,
      "wis": 7,
      "cha": 1
    },
    "damageResistances": [
      "bludgeoning",
      "slashing",
      "piercing"
    ],
    "conditionImmunities": [
      "agarrado",
      "amedrontado",
      "atordoado",
      "caído",
      "enfeitiçado",
      "impedido",
      "paralisado",
      "petrificado"
    ],
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      }
    ],
    "passivePerception": 8,
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [
      {
        "id": "enxame-de-insetos-enxame",
        "name": "Enxame",
        "description": "O enxame pode ocupar o espaço de outra criatura e vice- versa, e o enxame pode se mover através de qualquer abertura grande o suficiente para um inseto Miúdo. O enxame não pode recuperar pontos de vida ou ganhar pontos de vida temporários."
      },
      {
        "id": "enxame-de-insetos-enxame-de-aranhas",
        "name": "Enxame de Aranhas (variante)",
        "description": "Variação: um enxame de aranhas possui os seguintes traços adicionais."
      },
      {
        "id": "enxame-de-insetos-andar-na-teia",
        "name": "Andar na Teia (variante: enxame de aranhas)",
        "description": "Variação: o enxame ignora restrições de movimento causadas por estar numa teia."
      },
      {
        "id": "enxame-de-insetos-escalada-aracnidea",
        "name": "Escalada Aracnídea (variante: enxame de aranhas)",
        "description": "Variação: o enxame pode escalar superfícies difíceis, incluindo tetos de cabeça para baixo, sem precisar realizar um teste de habilidade."
      },
      {
        "id": "enxame-de-insetos-sentido-na-teia",
        "name": "Sentido na Teia (variante: enxame de aranhas)",
        "description": "Variação: quando em contato com uma teia, o enxame sabe a localização exata de qualquer outra criatura em contato com a mesma teia."
      },
      {
        "id": "enxame-de-insetos-enxame-de-besouros",
        "name": "Enxame de Besouros (variante)",
        "description": "Variação: um enxame de besouros ganha deslocamento de escavação de 1,5 metro."
      },
      {
        "id": "enxame-de-insetos-enxame-de-centopeias",
        "name": "Enxame de Centopeias (variante)",
        "description": "Variação: Enxame de Centopeias. Uma criatura reduzida a 0 pontos de vida por um enxame de centopeias fica estável, mas envenenado por 1 hora, mesmo depois de recuperar pontos de vida, e paralisado enquanto estiver envenenado dessa forma."
      },
      {
        "id": "enxame-de-insetos-enxame-de-vespas",
        "name": "Enxame de Vespas (variante)",
        "description": "Variação: um enxame de vespas tem deslocamento de caminhada de 1,5 metro, deslocamento de voo de 9 m e nenhum deslocamento de escalada."
      }
    ],
    "actions": [
      {
        "id": "enxame-de-insetos-mordidas",
        "name": "Mordidas",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 0 m, um alvo no espaço do enxame. Acerto: 10 (4d4) de dano perfurante, ou 5 (2d4) de dano perfurante se o enxame estiver com metade de seus pontos de vida ou menos.",
        "requiresManualResolution": true,
        "attackBonus": 3,
        "reachCm": 0,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 4,
              "faces": 4
            }
          },
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 4
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 327,
        "pdfPage": 11,
        "section": "ENXAME DE INSETOS"
      }
    ]
  },
  {
    "id": "appendix-a-enxame-de-morcegos",
    "name": "ENXAME DE MORCEGOS",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a",
      "swarm"
    ],
    "isSwarm": true,
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 22,
      "hitDice": "5d8"
    },
    "speeds": {
      "walkCm": 0,
      "flyCm": 900
    },
    "abilityScores": {
      "str": 5,
      "dex": 15,
      "con": 10,
      "int": 2,
      "wis": 12,
      "cha": 4
    },
    "damageResistances": [
      "bludgeoning",
      "slashing",
      "piercing"
    ],
    "conditionImmunities": [
      "agarrado",
      "amedrontado",
      "atordoado",
      "caído",
      "enfeitiçado",
      "impedido",
      "paralisado",
      "petrificado"
    ],
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "enxame-de-morcegos-eco-localizacao",
        "name": "Eco Localização",
        "description": "Enquanto não puder ouvir, o enxame perderá a percepção às cegas."
      },
      {
        "id": "enxame-de-morcegos-audicao-agucada",
        "name": "Audição Aguçada",
        "description": "O enxame tem vantagem em testes de Sabedoria (Percepção) relacionados à audição."
      },
      {
        "id": "enxame-de-morcegos-enxame",
        "name": "Enxame",
        "description": "O enxame pode ocupar o espaço de outra criatura e vice- versa, e o enxame pode se mover através de qualquer abertura grande o suficiente para um morcego Miúdo. O enxame não pode recuperar pontos de vida ou ganhar pontos de vida temporários."
      }
    ],
    "actions": [
      {
        "id": "enxame-de-morcegos-mordidas",
        "name": "Mordidas",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 0 m, uma criatura no espaço do enxame. Acerto: 5 (2d4) de dano perfurante, ou 2 (1d4) de dano perfurante se o enxame estiver com metade de seus pontos de vida ou menos.",
        "requiresManualResolution": true,
        "attackBonus": 4,
        "reachCm": 0,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 4
            }
          },
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 327,
        "pdfPage": 11,
        "section": "ENXAME DE MORCEGOS"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 328,
        "pdfPage": 12,
        "section": "ENXAME DE MORCEGOS"
      }
    ]
  },
  {
    "id": "appendix-a-enxame-de-piranhas",
    "name": "ENXAME DE PIRANHAS",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a",
      "swarm"
    ],
    "isSwarm": true,
    "alignment": "imparcial",
    "armorClass": 13,
    "hitPoints": {
      "average": 28,
      "hitDice": "8d8 – 8"
    },
    "speeds": {
      "walkCm": 0,
      "swimCm": 1200
    },
    "abilityScores": {
      "str": 13,
      "dex": 16,
      "con": 9,
      "int": 1,
      "wis": 7,
      "cha": 2
    },
    "damageResistances": [
      "bludgeoning",
      "slashing",
      "piercing"
    ],
    "conditionImmunities": [
      "agarrado",
      "amedrontado",
      "atordoado",
      "caído",
      "enfeitiçado",
      "impedido",
      "paralisado",
      "petrificado"
    ],
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 8,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "enxame-de-piranhas-frenesi-de-sangue",
        "name": "Frenesi de Sangue",
        "description": "O enxame tem vantagem nas jogadas de ataque corpo-a-corpo contra qualquer criatura que não esteja com todos os seus pontos de vida."
      },
      {
        "id": "enxame-de-piranhas-respirar-na-agua",
        "name": "Respirar na Água",
        "description": "O enxame pode respirar apenas em baixo d’água."
      },
      {
        "id": "enxame-de-piranhas-enxame",
        "name": "Enxame",
        "description": "O enxame pode ocupar o espaço de outra criatura e vice- versa, e o enxame pode se mover através de qualquer abertura grande o suficiente para uma piranha Miúda. O enxame não pode recuperar pontos de vida ou ganhar pontos de vida temporários."
      }
    ],
    "actions": [
      {
        "id": "enxame-de-piranhas-mordidas",
        "name": "Mordidas",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 0 m, uma criatura no espaço do enxame. Acerto: 14 (4d6) de dano perfurante, ou 7 (2d6) de dano perfurante se o enxame estiver com metade de seus pontos de vida ou menos.",
        "requiresManualResolution": true,
        "attackBonus": 5,
        "reachCm": 0,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 4,
              "faces": 6
            }
          },
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 6
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 328,
        "pdfPage": 12,
        "section": "ENXAME DE PIRANHAS"
      }
    ]
  },
  {
    "id": "appendix-a-enxame-de-ratos",
    "name": "ENXAME DE RATOS",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a",
      "swarm"
    ],
    "isSwarm": true,
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 24,
      "hitDice": "7d8 – 7"
    },
    "speeds": {
      "walkCm": 900
    },
    "abilityScores": {
      "str": 9,
      "dex": 11,
      "con": 9,
      "int": 2,
      "wis": 10,
      "cha": 3
    },
    "damageResistances": [
      "bludgeoning",
      "slashing",
      "piercing"
    ],
    "conditionImmunities": [
      "agarrado",
      "amedrontado",
      "atordoado",
      "caído",
      "enfeitiçado",
      "impedido",
      "paralisado",
      "petrificado"
    ],
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 900
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "enxame-de-ratos-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O enxame tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      },
      {
        "id": "enxame-de-ratos-enxame",
        "name": "Enxame",
        "description": "O enxame pode ocupar o espaço de outra criatura e vice- versa, e o enxame pode se mover através de qualquer abertura grande o suficiente para um rato Miúdo. O enxame não pode recuperar pontos de vida ou ganhar pontos de vida temporários."
      }
    ],
    "actions": [
      {
        "id": "enxame-de-ratos-mordidas",
        "name": "Mordidas",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 0 m, um alvo no espaço do enxame. Acerto: 7 (2d6) de dano perfurante, ou 3 (1d6) de dano perfurante se o enxame estiver com metade de seus pontos de vida ou menos.",
        "requiresManualResolution": true,
        "attackBonus": 2,
        "reachCm": 0,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 6
            }
          },
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 328,
        "pdfPage": 12,
        "section": "ENXAME DE RATOS"
      }
    ]
  },
  {
    "id": "appendix-a-enxame-de-serpentes-venenosas",
    "name": "ENXAME DE SERPENTES VENENOSAS",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a",
      "swarm"
    ],
    "isSwarm": true,
    "alignment": "imparcial",
    "armorClass": 14,
    "hitPoints": {
      "average": 36,
      "hitDice": "8d8"
    },
    "speeds": {
      "walkCm": 900,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 8,
      "dex": 18,
      "con": 11,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "damageResistances": [
      "bludgeoning",
      "slashing",
      "piercing"
    ],
    "conditionImmunities": [
      "agarrado",
      "amedrontado",
      "atordoado",
      "caído",
      "enfeitiçado",
      "impedido",
      "paralisado",
      "petrificado"
    ],
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 2,
      "denominator": 1
    },
    "experiencePoints": 450,
    "traits": [
      {
        "id": "enxame-de-serpentes-venenosas-enxame",
        "name": "Enxame",
        "description": "O enxame pode ocupar o espaço de outra criatura e vice- versa, e o enxame pode se mover através de qualquer abertura grande o suficiente para uma serpente Miúda. O enxame não pode recuperar pontos de vida ou ganhar pontos de vida temporários."
      }
    ],
    "actions": [
      {
        "id": "enxame-de-serpentes-venenosas-mordidas",
        "name": "Mordidas",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 0 m, uma criatura no espaço do enxame. Acerto: 7 (2d6) de dano perfurante, ou 3 (1d6) de dano perfurante se o enxame estiver com metade de seus pontos de vida ou menos. O alvo deve realizar um teste de resistência de Constituição CD 10, sofrendo 14 (4d6) de dano de veneno se fracassar na resistência, ou metade desse dano se obtiver sucesso.",
        "requiresManualResolution": true,
        "attackBonus": 6,
        "reachCm": 0,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 6
            }
          },
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            }
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 4,
              "faces": 6
            },
            "note": "teste de resistência de Constituição CD 10; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 328,
        "pdfPage": 12,
        "section": "ENXAME DE SERPENTES VENENOSAS"
      }
    ]
  },
  {
    "id": "appendix-a-escorpiao",
    "name": "ESCORPIÃO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 300
    },
    "abilityScores": {
      "str": 2,
      "dex": 11,
      "con": 8,
      "int": 1,
      "wis": 8,
      "cha": 2
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      }
    ],
    "passivePerception": 9,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [],
    "actions": [
      {
        "id": "escorpiao-ferrao",
        "name": "Ferrão",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, uma criatura. Acerto: 1 de dano perfurante e o alvo deve realizar um teste de resistência de Constituição CD 9, sofrendo 4 (1d8) de dano de veneno se fracassar na resistência, ou metade desse dano se obtiver sucesso.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "note": "teste de resistência de Constituição CD 9; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 328,
        "pdfPage": 12,
        "section": "ESCORPIÃO"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 329,
        "pdfPage": 13,
        "section": "ESCORPIÃO"
      }
    ]
  },
  {
    "id": "appendix-a-escorpiao-gigante",
    "name": "ESCORPIÃO GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 15,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 52,
      "hitDice": "7d10 + 14"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 15,
      "dex": 13,
      "con": 15,
      "int": 1,
      "wis": 9,
      "cha": 3
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 9,
    "challengeRating": {
      "numerator": 3,
      "denominator": 1
    },
    "experiencePoints": 700,
    "traits": [],
    "actions": [
      {
        "id": "escorpiao-gigante-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "O escorpião realiza três ataques: dois com suas garras e um com seu ferrão."
      },
      {
        "id": "escorpiao-gigante-garra",
        "name": "Garra",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d8 + 2) de dano de concussão e o alvo fica agarrado (CD 12 para escapar). O escorpião possui duas garras, cada uma podendo agarrar apenas um alvo.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 2
          }
        ]
      },
      {
        "id": "escorpiao-gigante-ferrao",
        "name": "Ferrão",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, uma criatura. Acerto: 7 (1d10 + 2) de dano perfurante e o alvo deve realizar um teste de resistência de Constituição CD 12, sofrendo 22 (4d10) de dano de veneno se fracassar na resistência, ou metade desse dano se obtiver sucesso.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 10
            },
            "flatBonus": 2
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 4,
              "faces": 10
            },
            "note": "teste de resistência de Constituição CD 12; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 329,
        "pdfPage": 13,
        "section": "ESCORPIÃO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-falcao",
    "name": "FALCÃO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 1800
    },
    "abilityScores": {
      "str": 5,
      "dex": 16,
      "con": 8,
      "int": 2,
      "wis": 14,
      "cha": 6
    },
    "skills": {
      "perception": 4
    },
    "passivePerception": 14,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "falcao-visao-agucada",
        "name": "Visão Aguçada",
        "description": "O falcão tem vantagem em testes de Sabedoria (Percepção) relacionados à visão."
      }
    ],
    "actions": [
      {
        "id": "falcao-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano cortante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 329,
        "pdfPage": 13,
        "section": "FALCÃO"
      }
    ]
  },
  {
    "id": "appendix-a-falcao-de-sangue",
    "name": "FALCÃO DE SANGUE",
    "creatureType": "beast",
    "size": "small",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 7,
      "hitDice": "2d6"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 1800
    },
    "abilityScores": {
      "str": 6,
      "dex": 14,
      "con": 10,
      "int": 3,
      "wis": 14,
      "cha": 5
    },
    "skills": {
      "perception": 4
    },
    "passivePerception": 14,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [
      {
        "id": "falcao-de-sangue-visao-agucada",
        "name": "Visão Aguçada",
        "description": "O falcão tem vantagem em testes de Sabedoria (Percepção) relacionados à visão."
      },
      {
        "id": "falcao-de-sangue-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O falcão tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do falcão estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "falcao-de-sangue-bicada",
        "name": "Bicada",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d4 + 2) de dano perfurante. Recebendo seu nome devido ás suas penas carmesins e sua natureza agressiva, o falcão de sangue ataca destemidamente praticamente qualquer animal, apunhalando-o com seu bico em forma de adaga. Os falcões de sangue voam juntos em grandes números, atacando como uma matilha para derrubar sua presa.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 329,
        "pdfPage": 13,
        "section": "FALCÃO DE SANGUE"
      }
    ]
  },
  {
    "id": "appendix-a-gato",
    "name": "GATO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 2,
      "hitDice": "1d4"
    },
    "speeds": {
      "walkCm": 1200,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 3,
      "dex": 15,
      "con": 10,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "skills": {
      "stealth": 4,
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "gato-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O gato tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "actions": [
      {
        "id": "gato-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +0 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano cortante.",
        "attackBonus": 0,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 329,
        "pdfPage": 13,
        "section": "GATO"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 330,
        "pdfPage": 14,
        "section": "GATO"
      }
    ]
  },
  {
    "id": "appendix-a-gorila",
    "name": "GORILA",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 19,
      "hitDice": "3d8 + 6"
    },
    "speeds": {
      "walkCm": 900,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 16,
      "dex": 14,
      "con": 14,
      "int": 6,
      "wis": 12,
      "cha": 7
    },
    "skills": {
      "athletics": 5,
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [],
    "actions": [
      {
        "id": "gorila-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "O gorila realiza dois ataques de punho."
      },
      {
        "id": "gorila-punho",
        "name": "Punho",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d6 + 3) de dano de concussão.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      },
      {
        "id": "gorila-rocha",
        "name": "Rocha",
        "description": "Ataque à Distância com Arma: +5 para atingir, distância 7,5/15 m, um alvo. Acerto: 6 (1d6 + 3) de dano de concussão.",
        "attackBonus": 5,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 330,
        "pdfPage": 14,
        "section": "GORILA"
      }
    ]
  },
  {
    "id": "appendix-a-gorila-gigante",
    "name": "GORILA GIGANTE",
    "creatureType": "beast",
    "size": "huge",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 157,
      "hitDice": "15d12 + 60"
    },
    "speeds": {
      "walkCm": 1200,
      "climbCm": 1200
    },
    "abilityScores": {
      "str": 23,
      "dex": 14,
      "con": 18,
      "int": 7,
      "wis": 12,
      "cha": 7
    },
    "skills": {
      "athletics": 9,
      "perception": 4
    },
    "passivePerception": 14,
    "challengeRating": {
      "numerator": 7,
      "denominator": 1
    },
    "experiencePoints": 2900,
    "traits": [],
    "actions": [
      {
        "id": "gorila-gigante-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "O gorila realiza dois ataques de punho."
      },
      {
        "id": "gorila-gigante-punho",
        "name": "Punho",
        "description": "Ataque Corpo-a-Corpo com Arma: +9 para atingir, alcance 3 m, um alvo. Acerto: 22 (3d10 + 6) de dano de concussão.",
        "attackBonus": 9,
        "reachCm": 300,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 3,
              "faces": 10
            },
            "flatBonus": 6
          }
        ]
      },
      {
        "id": "gorila-gigante-rocha",
        "name": "Rocha",
        "description": "Ataque à Distância com Arma: +9 para atingir, distância 15/30 m, um alvo. Acerto: 30 (7d6 + 6) de dano de concussão.",
        "attackBonus": 9,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 7,
              "faces": 6
            },
            "flatBonus": 6
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 330,
        "pdfPage": 14,
        "section": "GORILA GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-hiena",
    "name": "HIENA",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "hitPoints": {
      "average": 5,
      "hitDice": "1d8 + 1"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 11,
      "dex": 13,
      "con": 12,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [
      {
        "id": "hiena-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "A hiena tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados da hiena estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "hiena-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, um alvo. Acerto: 3 (1d6) de dano perfurante.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 330,
        "pdfPage": 14,
        "section": "HIENA"
      }
    ]
  },
  {
    "id": "appendix-a-hiena-gigante",
    "name": "HIENA GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 45,
      "hitDice": "6d10 + 12"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 16,
      "dex": 14,
      "con": 14,
      "int": 2,
      "wis": 12,
      "cha": 7
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "hiena-gigante-frenesi",
        "name": "Frenesi",
        "description": "Quando a hiena reduz uma criatura a 0 pontos de vida com um ataque corpo-a-corpo no seu turno, ela pode realizar uma ação bônus para se mover até metade do seu deslocamento e realizar um ataque de mordida."
      }
    ],
    "actions": [
      {
        "id": "hiena-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 10 (2d6 + 3) de dano perfurante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 330,
        "pdfPage": 14,
        "section": "HIENA GIGANTE"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 331,
        "pdfPage": 15,
        "section": "HIENA GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-javali",
    "name": "JAVALI",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 11,
      "hitDice": "2d8 + 2"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 13,
      "dex": 11,
      "con": 12,
      "int": 2,
      "wis": 9,
      "cha": 5
    },
    "passivePerception": 9,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "javali-investida",
        "name": "Investida",
        "description": "Se o javali se mover, pelo menos, 6 metros em linha reta em direção de uma criatura logo antes de atingi-la com seu ataque de presa, o alvo sofre 3 (1d6) de dano cortante extra e deve ser bem sucedido num teste de resistência de Força CD 11 para não cair no chão. Implacável (Recarrega Após um Descanso Curto ou Longo). Se o javali sofrer 7 de dano ou menos, que o reduziria a 0 pontos de vida, ele é reduzido a 1 ponto de vida, no lugar."
      }
    ],
    "actions": [
      {
        "id": "javali-presas",
        "name": "Presas",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d6 + 1) de dano cortante.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 331,
        "pdfPage": 15,
        "section": "JAVALI"
      }
    ]
  },
  {
    "id": "appendix-a-javali-gigante",
    "name": "JAVALI GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 42,
      "hitDice": "5d10 + 15"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 17,
      "dex": 10,
      "con": 16,
      "int": 2,
      "wis": 7,
      "cha": 5
    },
    "passivePerception": 8,
    "challengeRating": {
      "numerator": 2,
      "denominator": 1
    },
    "experiencePoints": 450,
    "traits": [
      {
        "id": "javali-gigante-investida",
        "name": "Investida",
        "description": "Se o javali se mover, pelo menos, 6 metros em linha reta em direção de uma criatura logo antes de atingi-la com seu ataque de presa, o alvo sofre 7 (2d6) de dano cortante extra e deve ser bem sucedido num teste de resistência de Força CD 13 para não cair no chão. Implacável (Recarrega Após um Descanso Curto ou Longo). Se o javali sofrer 10 de dano ou menos, que o reduziria a 0 pontos de vida, ele é reduzido a 1 ponto de vida, no lugar."
      }
    ],
    "actions": [
      {
        "id": "javali-gigante-presas",
        "name": "Presas",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 10 (2d6 + 3) de dano cortante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 331,
        "pdfPage": 15,
        "section": "JAVALI GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-lagarto",
    "name": "LAGARTO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 2,
      "hitDice": "1d4"
    },
    "speeds": {
      "walkCm": 600,
      "climbCm": 600
    },
    "abilityScores": {
      "str": 2,
      "dex": 11,
      "con": 10,
      "int": 1,
      "wis": 8,
      "cha": 3
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 900
      }
    ],
    "passivePerception": 9,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [],
    "actions": [
      {
        "id": "lagarto-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +0 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano perfurante.",
        "attackBonus": 0,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 331,
        "pdfPage": 15,
        "section": "LAGARTO"
      }
    ]
  },
  {
    "id": "appendix-a-lagarto-gigante",
    "name": "LAGARTO GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 19,
      "hitDice": "3d10 + 3"
    },
    "speeds": {
      "walkCm": 900,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 15,
      "dex": 12,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 900
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "lagarto-gigante-prender-a-respiracao",
        "name": "Prender a Respiração (variante)",
        "description": "Variação opcional: O lagarto pode prender a respiração por 15 minutos (um lagarto que possua esse traço também terá um deslocamento de natação de 9 metros)."
      },
      {
        "id": "lagarto-gigante-escalada-aracnidea",
        "name": "Escalada Aracnídea (variante)",
        "description": "Variação opcional: O lagarto pode escalar superfícies difíceis, incluindo andar de cabeça para baixo em tetos, sem precisar realizar um teste de habilidade."
      }
    ],
    "actions": [
      {
        "id": "lagarto-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d8 + 2) de dano perfurante.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 331,
        "pdfPage": 15,
        "section": "LAGARTO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-leao",
    "name": "LEÃO",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 26,
      "hitDice": "4d10 + 4"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 17,
      "dex": 15,
      "con": 13,
      "int": 3,
      "wis": 12,
      "cha": 8
    },
    "skills": {
      "stealth": 6,
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "leao-bote",
        "name": "Bote",
        "description": "Se o leão se mover, pelo menos, 6 metros em linha reta em direção de um alvo logo antes de atingi-lo com seu ataque de garra, o alvo deve ser bem sucedido num teste de resistência de Força CD 13 para não cair no chão. Se o alvo cair no chão, o leão poderá realizar uma ação bônus para realizar um ataque de mordida contra ele."
      },
      {
        "id": "leao-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O leão tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      },
      {
        "id": "leao-salto-em-corrida",
        "name": "Salto em Corrida",
        "description": "Como parte do seu movimento e depois de uma corrida inicial de 3 metros, o leão pode realizar um salto em distância de até 7,5 metros."
      },
      {
        "id": "leao-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O leão tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do leão estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "leao-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (1d8 + 3) de dano perfurante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 3
          }
        ]
      },
      {
        "id": "leao-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d6 + 3) de dano cortante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 331,
        "pdfPage": 15,
        "section": "LEÃO"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 332,
        "pdfPage": 16,
        "section": "LEÃO"
      }
    ]
  },
  {
    "id": "appendix-a-lobo",
    "name": "LOBO",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 11,
      "hitDice": "2d8 + 2"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 12,
      "dex": 15,
      "con": 12,
      "int": 3,
      "wis": 12,
      "cha": 6
    },
    "skills": {
      "stealth": 4,
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "lobo-audicao-e-faro-agucados",
        "name": "Audição e Faro Aguçados",
        "description": "O lobo tem vantagem em testes de Sabedoria (Percepção) relacionados à audição e ao olfato."
      },
      {
        "id": "lobo-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O lobo tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do lobo estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "lobo-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (2d4 + 2) de dano perfurante. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Força CD 11 para não cair no chão.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 332,
        "pdfPage": 16,
        "section": "LOBO"
      }
    ]
  },
  {
    "id": "appendix-a-lobo-atroz",
    "name": "LOBO ATROZ",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 14,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 37,
      "hitDice": "5d10 + 10"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 17,
      "dex": 15,
      "con": 15,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "skills": {
      "stealth": 4,
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "lobo-atroz-audicao-e-faro-agucados",
        "name": "Audição e Faro Aguçados",
        "description": "O lobo tem vantagem em testes de Sabedoria (Percepção) relacionados à audição e ao olfato."
      },
      {
        "id": "lobo-atroz-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O lobo tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do lobo estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "lobo-atroz-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 10 (2d6 + 3) de dano perfurante. Se o alvo for uma criatura, ela deve ser bem sucedida num teste de resistência de Força CD 13 ou será derrubada no chão.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 332,
        "pdfPage": 16,
        "section": "LOBO ATROZ"
      }
    ]
  },
  {
    "id": "appendix-a-lobo-invernal",
    "name": "LOBO INVERNAL",
    "creatureType": "monstrosity",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "neutro e mau",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 75,
      "hitDice": "10d10 + 20"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 18,
      "dex": 13,
      "con": 14,
      "int": 7,
      "wis": 12,
      "cha": 8
    },
    "skills": {
      "stealth": 3,
      "perception": 5
    },
    "passivePerception": 15,
    "languages": [
      "Comum, Gigante, Lobo Invernal"
    ],
    "challengeRating": {
      "numerator": 3,
      "denominator": 1
    },
    "experiencePoints": 700,
    "traits": [
      {
        "id": "lobo-invernal-audicao-e-faro-agucados",
        "name": "Audição e Faro Aguçados",
        "description": "O lobo tem vantagem em testes de Sabedoria (Percepção) relacionados à audição e ao olfato."
      },
      {
        "id": "lobo-invernal-camuflagem-de-neve",
        "name": "Camuflagem de Neve",
        "description": "O lobo tem vantagem em testes de Destreza (Furtividade) feitos em terrenos de neve."
      },
      {
        "id": "lobo-invernal-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O lobo tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do lobo estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "lobo-invernal-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 1,5 m, um alvo. Acerto: 11 (2d6 + 4) de dano perfurante. Se o alvo for uma criatura, ela deve ser bem sucedida num teste de resistência de Força CD 14 ou será derrubada no chão.",
        "attackBonus": 6,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 4
          }
        ]
      },
      {
        "id": "lobo-invernal-sopro-congelante",
        "name": "Sopro Congelante",
        "description": "O lobo expele um jato de vento congelante num cone de 4,5 metros. Cada criatura na área deve realizar um teste de resistência de Destreza CD 12, sofrendo 18 (4d8) de dano de frio caso fracasse, ou metade desse dano caso obtenha sucesso.",
        "requiresManualResolution": true,
        "recharge": "5–6",
        "damage": [
          {
            "damageType": "cold",
            "formula": {
              "quantity": 4,
              "faces": 8
            },
            "note": "teste de resistência de Destreza CD 12; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 332,
        "pdfPage": 16,
        "section": "LOBO INVERNAL"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 333,
        "pdfPage": 17,
        "section": "LOBO INVERNAL"
      }
    ]
  },
  {
    "id": "appendix-a-mamute",
    "name": "MAMUTE",
    "creatureType": "beast",
    "size": "huge",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 126,
      "hitDice": "11d12 + 55"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 24,
      "dex": 9,
      "con": 21,
      "int": 3,
      "wis": 11,
      "cha": 6
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 6,
      "denominator": 1
    },
    "experiencePoints": 2300,
    "traits": [
      {
        "id": "mamute-investida-esmagadora",
        "name": "Investida Esmagadora",
        "description": "Se o mamute se mover, pelo menos, 6 metros em linha reta em direção de uma criatura logo antes de atingi-la com seu ataque de presa, o alvo deve ser bem sucedido num teste de resistência de Força CD 18 para não cair no chão. Se o alvo cair no chão, o elefante pode realizar um ataque de pisotear contra ele com uma ação bônus."
      }
    ],
    "actions": [
      {
        "id": "mamute-presas",
        "name": "Presas",
        "description": "Ataque Corpo-a-Corpo com Arma: +10 para atingir, alcance 3 m, um alvo. Acerto: 25 (4d8 + 7) de dano perfurante.",
        "attackBonus": 10,
        "reachCm": 300,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 4,
              "faces": 8
            },
            "flatBonus": 7
          }
        ]
      },
      {
        "id": "mamute-pisotear",
        "name": "Pisotear",
        "description": "Ataque Corpo-a-Corpo com Arma: +10 para atingir, alcance 1,5 m, uma criatura caída. Acerto: 29 (4d10 + 7) de dano de concussão. Um mamute é uma criatura elefântica com pelagem grossa e longas presas. Mais atarracados e mais ferozes que os elefantes normais, os mamutes vivem em uma grande variedade de climas, desde o subártico até o subtropical.",
        "attackBonus": 10,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 4,
              "faces": 10
            },
            "flatBonus": 7
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 333,
        "pdfPage": 17,
        "section": "MAMUTE"
      }
    ]
  },
  {
    "id": "appendix-a-mastim",
    "name": "MASTIM",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 5,
      "hitDice": "1d8 + 1"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 13,
      "dex": 14,
      "con": 12,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [
      {
        "id": "mastim-audicao-e-olfato-agucados",
        "name": "Audição e Olfato Aguçados",
        "description": "O mastim tem vantagem em testes de Sabedoria (Percepção) relacionados à audição e ao olfato."
      }
    ],
    "actions": [
      {
        "id": "mastim-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d6 + 1) de dano perfurante. Se o alvo for uma criatura, ela deve ser bem sucedida num teste de resistência de Força CD 11 para não cair no chão. Os mastins são cães de caça impressionantes valorizados por humanoides por sua lealdade e sentidos apurados. Os mastins podem ser treinados como cães de guarda, cães de caça e cães de guerra. Os halflings e outros humanoides Pequenos usam-nos como montarias.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 333,
        "pdfPage": 17,
        "section": "MASTIM"
      }
    ]
  },
  {
    "id": "appendix-a-morcego",
    "name": "MORCEGO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 150,
      "flyCm": 900
    },
    "abilityScores": {
      "str": 2,
      "dex": 15,
      "con": 8,
      "int": 2,
      "wis": 12,
      "cha": 4
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "morcego-eco-localizacao",
        "name": "Eco Localização",
        "description": "Enquanto não puder ouvir, o morcego perderá a percepção às cegas."
      },
      {
        "id": "morcego-audicao-agucada",
        "name": "Audição Aguçada",
        "description": "O morcego tem vantagem em testes de Sabedoria (Percepção) relacionados à audição."
      }
    ],
    "actions": [
      {
        "id": "morcego-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +0 para atingir, alcance 1,5 m, uma criatura. Acerto: 1 de dano perfurante.",
        "attackBonus": 0,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 333,
        "pdfPage": 17,
        "section": "MORCEGO"
      }
    ]
  },
  {
    "id": "appendix-a-morcego-gigante",
    "name": "MORCEGO GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "hitPoints": {
      "average": 22,
      "hitDice": "4d10"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 1800
    },
    "abilityScores": {
      "str": 15,
      "dex": 16,
      "con": 11,
      "int": 2,
      "wis": 12,
      "cha": 6
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "morcego-gigante-eco-localizacao",
        "name": "Eco Localização",
        "description": "Enquanto não puder ouvir, o morcego perderá a percepção às cegas."
      },
      {
        "id": "morcego-gigante-audicao-agucada",
        "name": "Audição Aguçada",
        "description": "O morcego tem vantagem em testes de Sabedoria (Percepção) relacionados à audição."
      }
    ],
    "actions": [
      {
        "id": "morcego-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, uma criatura. Acerto: 5 (1d6 + 2) de dano perfurante.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 333,
        "pdfPage": 17,
        "section": "MORCEGO GIGANTE"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 334,
        "pdfPage": 18,
        "section": "MORCEGO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-mula",
    "name": "MULA",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 11,
      "hitDice": "2d8 + 2"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 14,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [
      {
        "id": "mula-besta-de-carga",
        "name": "Besta de Carga",
        "description": "A mula é considerada como um animal Grande com os propósitos de determinar sua capacidade de carga."
      },
      {
        "id": "mula-estavel",
        "name": "Estável",
        "description": "A mula possui vantagem em testes de resistência de Força e Destreza feitos contra efeitos que poderiam derruba-la no chão."
      }
    ],
    "actions": [
      {
        "id": "mula-cascos",
        "name": "Cascos",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d4 + 2) de dano de concussão.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 334,
        "pdfPage": 18,
        "section": "MULA"
      }
    ]
  },
  {
    "id": "appendix-a-pantera",
    "name": "PANTERA",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 13,
      "hitDice": "3d8"
    },
    "speeds": {
      "walkCm": 1500,
      "climbCm": 1200
    },
    "abilityScores": {
      "str": 14,
      "dex": 15,
      "con": 10,
      "int": 3,
      "wis": 14,
      "cha": 7
    },
    "skills": {
      "stealth": 6,
      "perception": 4
    },
    "passivePerception": 14,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "pantera-bote",
        "name": "Bote",
        "description": "Se a pantera se mover, pelo menos, 6 metros em linha reta em direção de um alvo logo antes de atingi-lo com seu ataque de garra, o alvo deve ser bem sucedido num teste de resistência de Força CD 12 para não cair no chão. Se o alvo cair no chão, a pantera poderá realizar uma ação bônus para realizar um ataque de mordida contra ele."
      },
      {
        "id": "pantera-faro-agucado",
        "name": "Faro Aguçado",
        "description": "A pantera tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "actions": [
      {
        "id": "pantera-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 5 (1d6 + 2) de dano perfurante.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 2
          }
        ]
      },
      {
        "id": "pantera-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d4 + 2) de dano cortante.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 334,
        "pdfPage": 18,
        "section": "PANTERA"
      }
    ]
  },
  {
    "id": "appendix-a-piranha",
    "name": "PIRANHA",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 0,
      "swimCm": 1200
    },
    "abilityScores": {
      "str": 2,
      "dex": 16,
      "con": 9,
      "int": 1,
      "wis": 7,
      "cha": 2
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 8,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "piranha-frenesi-de-sangue",
        "name": "Frenesi de Sangue",
        "description": "A piranha tem vantagem nas jogadas de ataque corpo-a-corpo contra qualquer criatura que não esteja com todos os seus pontos de vida."
      },
      {
        "id": "piranha-respirar-na-agua",
        "name": "Respirar na Água",
        "description": "A piranha pode respirar apenas em baixo d’água."
      }
    ],
    "actions": [
      {
        "id": "piranha-mordidas",
        "name": "Mordidas",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano perfurante. Uma piranha é um peixe carnívoro de dentes afiados. As piranhas podem se adaptar a qualquer ambiente aquático, incluindo lagos subterrâneos gelados. Elas frequentemente se juntam em cardumes; as estatísticas para um enxame de piranhas aparece posteriormente nesse apêndice.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 334,
        "pdfPage": 18,
        "section": "PIRANHA"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 335,
        "pdfPage": 19,
        "section": "PIRANHA"
      }
    ]
  },
  {
    "id": "appendix-a-polvo",
    "name": "POLVO",
    "creatureType": "beast",
    "size": "small",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 3,
      "hitDice": "1d6"
    },
    "speeds": {
      "walkCm": 150,
      "swimCm": 900
    },
    "abilityScores": {
      "str": 4,
      "dex": 15,
      "con": 11,
      "int": 3,
      "wis": 10,
      "cha": 4
    },
    "skills": {
      "stealth": 4,
      "perception": 2
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 900
      }
    ],
    "passivePerception": 12,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "polvo-camuflagem-submersa",
        "name": "Camuflagem Submersa",
        "description": "O polvo tem vantagem em testes de Destreza (Furtividade) feitos enquanto estiver submerso."
      },
      {
        "id": "polvo-prender-a-respiracao",
        "name": "Prender a Respiração",
        "description": "Enquanto estiver fora da água, o polvo pode prender a respiração por 30 minutos."
      },
      {
        "id": "polvo-respirar-na-agua",
        "name": "Respirar na Água",
        "description": "O polvo pode respirar apenas em baixo d’água."
      }
    ],
    "actions": [
      {
        "id": "polvo-tentaculos",
        "name": "Tentáculos",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano de concussão e o alvo fica agarrado (CD 10 para escapar). Até o agarrão acabar, o polvo não pode usar seus tentáculos em outro alvo.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "flatBonus": 1
          }
        ]
      },
      {
        "id": "polvo-nuvem-de-tinta",
        "name": "Nuvem de Tinta",
        "description": "Recarrega após um Descanso Curto ou Longo. Uma nuvem de tinta de 1,5 metro de raio se espalha em volta do polvo, se ele estiver submerso. A área fica com escuridão densa por 1 minuto, no entanto, uma corrente forte pode dispersar a tinta. Após liberar a tinta, o polvo pode usar a ação de Disparada com uma ação bônus."
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 335,
        "pdfPage": 19,
        "section": "POLVO"
      }
    ]
  },
  {
    "id": "appendix-a-polvo-gigante",
    "name": "POLVO GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "hitPoints": {
      "average": 52,
      "hitDice": "8d10 + 8"
    },
    "speeds": {
      "walkCm": 300,
      "swimCm": 1800
    },
    "abilityScores": {
      "str": 17,
      "dex": 13,
      "con": 13,
      "int": 4,
      "wis": 10,
      "cha": 4
    },
    "skills": {
      "stealth": 5,
      "perception": 4
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 14,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "polvo-gigante-camuflagem-submersa",
        "name": "Camuflagem Submersa",
        "description": "O polvo tem vantagem em testes de Destreza (Furtividade) feitos enquanto estiver submerso."
      },
      {
        "id": "polvo-gigante-prender-a-respiracao",
        "name": "Prender a Respiração",
        "description": "Enquanto estiver fora da água, o polvo pode prender a respiração por 1 hora."
      },
      {
        "id": "polvo-gigante-respirar-na-agua",
        "name": "Respirar na Água",
        "description": "O polvo pode respirar apenas em baixo d’água."
      }
    ],
    "actions": [
      {
        "id": "polvo-gigante-tentaculos",
        "name": "Tentáculos",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 4,5 m, um alvo. Acerto: 10 (2d6 + 3) de dano de concussão e o alvo fica agarrado (CD 16 para escapar). Até o agarrão acabar, o alvo fica impedido e o polvo não pode usar seus tentáculos em outro alvo.",
        "attackBonus": 5,
        "reachCm": 450,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      },
      {
        "id": "polvo-gigante-nuvem-de-tinta",
        "name": "Nuvem de Tinta",
        "description": "Recarrega após um Descanso Curto ou Longo. Uma nuvem de tinta de 6 metros de raio se espalha em volta do polvo, se ele estiver submerso. A área fica com escuridão densa por 1 minuto, no entanto, uma corrente forte pode dispersar a tinta. Após liberar a tinta, o polvo pode usar a ação de Disparada com uma ação bônus."
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 335,
        "pdfPage": 19,
        "section": "POLVO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-ponei",
    "name": "PÔNEI",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 11,
      "hitDice": "2d8 + 2"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 15,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 11,
      "cha": 7
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [],
    "actions": [
      {
        "id": "ponei-cascos",
        "name": "Cascos",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (2d4 + 2) de dano de concussão.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 335,
        "pdfPage": 19,
        "section": "PÔNEI"
      }
    ]
  },
  {
    "id": "appendix-a-ra-gigante",
    "name": "RÃ GIGANTE",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "hitPoints": {
      "average": 18,
      "hitDice": "4d8"
    },
    "speeds": {
      "walkCm": 900,
      "swimCm": 900
    },
    "abilityScores": {
      "str": 12,
      "dex": 13,
      "con": 11,
      "int": 2,
      "wis": 10,
      "cha": 3
    },
    "skills": {
      "stealth": 3,
      "perception": 2
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 900
      }
    ],
    "passivePerception": 12,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "ra-gigante-anfibio",
        "name": "Anfíbio",
        "description": "A rã pode respirar ar e água."
      },
      {
        "id": "ra-gigante-salto-parado",
        "name": "Salto Parado",
        "description": "O salto à distância da rã vai até 6 metros e o salto em altura vai até 3 metros, com ou sem uma corrida inicial."
      }
    ],
    "actions": [
      {
        "id": "ra-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d6 + 1) de dano perfurante e o alvo fica agarrado (CD 11 para escapar). Até o agarrão acabar, o alvo fica impedido e a rã não pode morder outro alvo.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 1
          }
        ]
      },
      {
        "id": "ra-gigante-engolir",
        "name": "Engolir",
        "description": "A rã realiza um ataque de mordida contra um alvo Pequeno ou menor que esteja agarrando. Se o ataque atingir, o alvo é engolido e o agarrão termina. Enquanto estiver engolido, o alvo estará cego e impedido, ele terá cobertura total contra ataques e outros efeitos de fora da rã e sofre 5 (2d4) de dano ácido no começo de cada turno da rã. A rã pode ter apenas um alvo engolido por vez. Se a rã morrer, uma criatura engolida não estará mais impedida por ela e poderá escapar do corpo usando 1,5 metro de movimento, estando caída ao sair.",
        "requiresManualResolution": true,
        "damage": [
          {
            "damageType": "acid",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "note": "no começo de cada turno da rã enquanto o alvo estiver engolido",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 335,
        "pdfPage": 19,
        "section": "RÃ GIGANTE"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 336,
        "pdfPage": 20,
        "section": "RÃ GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-rato",
    "name": "RATO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 600
    },
    "abilityScores": {
      "str": 2,
      "dex": 11,
      "con": 9,
      "int": 2,
      "wis": 10,
      "cha": 4
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 900
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "rato-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O rato tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "actions": [
      {
        "id": "rato-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +0 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano perfurante.",
        "attackBonus": 0,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 336,
        "pdfPage": 20,
        "section": "RATO"
      }
    ]
  },
  {
    "id": "appendix-a-rato-gigante",
    "name": "RATO GIGANTE",
    "creatureType": "beast",
    "size": "small",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 7,
      "hitDice": "2d6"
    },
    "speeds": {
      "walkCm": 900
    },
    "abilityScores": {
      "str": 7,
      "dex": 15,
      "con": 11,
      "int": 2,
      "wis": 10,
      "cha": 4
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [
      {
        "id": "rato-gigante-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O rato tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      },
      {
        "id": "rato-gigante-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O rato tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do rato estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "sourceText": {
      "variation.infectedGiantRat": "VARIAÇÃO: RATO GIGANTE INFECTADO Alguns ratos gigantes carregam doenças vis que eles podem transmitir através de suas mordidas. Um rato gigante infectado possui nível de desafio 1/8 (25 XP) e a seguinte ação, ao invés de seu ataque de mordida normal."
    },
    "actions": [
      {
        "id": "rato-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d4 + 2) de dano perfurante.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      },
      {
        "id": "rato-gigante-infectado-mordida",
        "name": "Mordida (rato gigante infectado)",
        "description": "Variação: esta ação substitui a mordida normal do rato gigante infectado. Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d4 + 2) de dano perfurante. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Constituição CD 10 ou contrairá uma doença. Até a doença ser curada, o alvo não pode recuperar pontos de vida, exceto por meios mágicos, e o máximo de pontos de vida do alvo é reduzido em 3 (1d6) a cada 24 horas. Se o máximo de pontos de vida do alvo cair a 0 com resultado dessa doença, ele morre.",
        "requiresManualResolution": true,
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 336,
        "pdfPage": 20,
        "section": "RATO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-rinoceronte",
    "name": "RINOCERONTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 45,
      "hitDice": "6d10 + 12"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 21,
      "dex": 8,
      "con": 15,
      "int": 2,
      "wis": 12,
      "cha": 6
    },
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 2,
      "denominator": 1
    },
    "experiencePoints": 450,
    "traits": [
      {
        "id": "rinoceronte-investida",
        "name": "Investida",
        "description": "Se o rinoceronte se mover, pelo menos, 6 metros em linha reta em direção de uma criatura logo antes de atingi-la com seu ataque de chifre, o alvo sofre 9 (2d8) de dano de concussão extra. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Força CD 15 para não cair no chão."
      }
    ],
    "actions": [
      {
        "id": "rinoceronte-chifre",
        "name": "Chifre",
        "description": "Ataque Corpo-a-Corpo com Arma: +7 para atingir, alcance 1,5 m, um alvo. Acerto: 14 (2d8 + 5) de dano de concussão.",
        "attackBonus": 7,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "bludgeoning",
            "formula": {
              "quantity": 2,
              "faces": 8
            },
            "flatBonus": 5
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 336,
        "pdfPage": 20,
        "section": "RINOCERONTE"
      }
    ]
  },
  {
    "id": "appendix-a-sapo",
    "name": "SAPO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "hitPoints": {
      "average": 1,
      "hitDice": "1d4 – 1"
    },
    "speeds": {
      "walkCm": 600,
      "swimCm": 600
    },
    "abilityScores": {
      "str": 1,
      "dex": 13,
      "con": 8,
      "int": 1,
      "wis": 8,
      "cha": 3
    },
    "skills": {
      "stealth": 3,
      "perception": 1
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 0,
    "traits": [
      {
        "id": "sapo-anfibio",
        "name": "Anfíbio",
        "description": "O sapo pode respirar ar e água."
      },
      {
        "id": "sapo-salto-parado",
        "name": "Salto Parado",
        "description": "O salto à distância do sapo vai até 3 metros e o salto em altura vai até 1,5 metros, com ou sem uma corrida inicial."
      },
      {
        "id": "sapo-um-sapo-nao-tem-ataques-efetivos",
        "name": "Um sapo não tem ataques efetivos",
        "description": "Ele se alimenta de pequenos insetos e geralmente vive perto da água, em árvores ou no subterrâneo. As estatísticas do sapo podem ser usadas para representar uma rã."
      }
    ],
    "actions": [],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 336,
        "pdfPage": 20,
        "section": "SAPO"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 337,
        "pdfPage": 21,
        "section": "SAPO"
      }
    ]
  },
  {
    "id": "appendix-a-sapo-gigante",
    "name": "SAPO GIGANTE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "hitPoints": {
      "average": 39,
      "hitDice": "6d10 + 6"
    },
    "speeds": {
      "walkCm": 600,
      "swimCm": 1200
    },
    "abilityScores": {
      "str": 15,
      "dex": 13,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 3
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 900
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "sapo-gigante-anfibio",
        "name": "Anfíbio",
        "description": "O sapo pode respirar ar e água."
      },
      {
        "id": "sapo-gigante-salto-parado",
        "name": "Salto Parado",
        "description": "O salto à distância do sapo vai até 6 metros e o salto em altura vai até 3 metros, com ou sem uma corrida inicial."
      }
    ],
    "actions": [
      {
        "id": "sapo-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (1d10 + 2) de dano perfurante mais 5 (1d10) de dano de veneno e o alvo fica agarrado (CD 13 para escapar). Até o agarrão acabar, o alvo fica impedido e o sapo não pode morder outro alvo.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 10
            },
            "flatBonus": 2
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 1,
              "faces": 10
            }
          }
        ]
      },
      {
        "id": "sapo-gigante-engolir",
        "name": "Engolir",
        "description": "O sapo realiza um ataque de mordida contra um alvo Médio ou menor que esteja agarrando. Se o ataque atingir, o alvo é engolido e o agarrão termina. Enquanto estiver engolido, o alvo estará cego e impedido, terá cobertura total contra ataques e outros efeitos de fora do sapo e sofre 10 (3d6) de dano ácido no começo de cada turno do sapo. O sapo pode ter apenas um alvo engolido por vez. Se o sapo morrer, uma criatura engolida não estará mais impedida por ele e poderá escapar do corpo usando 1,5 metro de movimento, estando caída ao sair.",
        "requiresManualResolution": true,
        "damage": [
          {
            "damageType": "acid",
            "formula": {
              "quantity": 3,
              "faces": 6
            },
            "note": "no começo de cada turno do sapo enquanto o alvo estiver engolido",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 337,
        "pdfPage": 21,
        "section": "SAPO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-serpente-venenosa",
    "name": "SERPENTE VENENOSA",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "hitPoints": {
      "average": 2,
      "hitDice": "1d4"
    },
    "speeds": {
      "walkCm": 900,
      "swimCm": 900
    },
    "abilityScores": {
      "str": 2,
      "dex": 16,
      "con": 11,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      }
    ],
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 8
    },
    "experiencePoints": 25,
    "traits": [],
    "actions": [
      {
        "id": "serpente-venenosa-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano perfurante e o alvo deve realizar um teste de resistência de Constituição CD 10, sofrendo 5 (2d4) de dano de veneno se falhar na resistência ou metade desse dano se obtiver sucesso.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "note": "teste de resistência de Constituição CD 10; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 337,
        "pdfPage": 21,
        "section": "SERPENTE VENENOSA"
      }
    ]
  },
  {
    "id": "appendix-a-serpente-venenosa-gigante",
    "name": "SERPENTE VENENOSA GIGANTE",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 14,
    "hitPoints": {
      "average": 11,
      "hitDice": "2d8 + 2"
    },
    "speeds": {
      "walkCm": 900,
      "swimCm": 900
    },
    "abilityScores": {
      "str": 10,
      "dex": 18,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 3
    },
    "skills": {
      "perception": 2
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 300
      }
    ],
    "passivePerception": 12,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [],
    "actions": [
      {
        "id": "serpente-venenosa-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 3 m, um alvo. Acerto: 6 (1d4 + 4) de dano perfurante e o alvo deve realizar um teste de resistência de Constituição CD 11, sofrendo 10 (3d6) de dano de veneno se falhar na resistência ou metade desse dano se obtiver sucesso.",
        "attackBonus": 6,
        "reachCm": 300,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            },
            "flatBonus": 4
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 3,
              "faces": 6
            },
            "note": "teste de resistência de Constituição CD 11; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 337,
        "pdfPage": 21,
        "section": "SERPENTE VENENOSA GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-texugo",
    "name": "TEXUGO",
    "creatureType": "beast",
    "size": "tiny",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 3,
      "hitDice": "1d4 + 1"
    },
    "speeds": {
      "walkCm": 600,
      "burrowCm": 150
    },
    "abilityScores": {
      "str": 4,
      "dex": 11,
      "con": 12,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 900
      }
    ],
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [
      {
        "id": "texugo-faro-agucados",
        "name": "Faro Aguçados",
        "description": "O texugo tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "actions": [
      {
        "id": "texugo-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, um alvo. Acerto: 1 de dano perfurante.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 337,
        "pdfPage": 21,
        "section": "TEXUGO"
      }
    ]
  },
  {
    "id": "appendix-a-texugo-gigante",
    "name": "TEXUGO GIGANTE",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 10,
    "hitPoints": {
      "average": 13,
      "hitDice": "2d8 + 4"
    },
    "speeds": {
      "walkCm": 900,
      "burrowCm": 300
    },
    "abilityScores": {
      "str": 13,
      "dex": 10,
      "con": 15,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 900
      }
    ],
    "passivePerception": 11,
    "challengeRating": {
      "numerator": 1,
      "denominator": 4
    },
    "experiencePoints": 50,
    "traits": [
      {
        "id": "texugo-gigante-faro-agucados",
        "name": "Faro Aguçados",
        "description": "O texugo tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "actions": [
      {
        "id": "texugo-gigante-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "O texugo realiza dois ataques: um com sua mordida e um com suas garras."
      },
      {
        "id": "texugo-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 4 (1d6 + 1) de dano perfurante.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 1
          }
        ]
      },
      {
        "id": "texugo-gigante-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (2d4 + 1) de dano cortante.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 1
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 337,
        "pdfPage": 21,
        "section": "TEXUGO GIGANTE"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 338,
        "pdfPage": 22,
        "section": "TEXUGO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-tigre",
    "name": "TIGRE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 37,
      "hitDice": "5d10 + 10"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 17,
      "dex": 15,
      "con": 14,
      "int": 3,
      "wis": 12,
      "cha": 8
    },
    "skills": {
      "stealth": 6,
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "tigre-bote",
        "name": "Bote",
        "description": "Se o tigre se mover, pelo menos, 6 metros em linha reta em direção de um alvo logo antes de atingi-lo com seu ataque de garra, o alvo deve ser bem sucedido num teste de resistência de Força CD 13 para não cair no chão. Se o alvo cair no chão, o tigre poderá realizar uma ação bônus para realizar um ataque de mordida contra ele."
      },
      {
        "id": "tigre-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O tigre tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "actions": [
      {
        "id": "tigre-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (1d10 + 3) de dano perfurante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 10
            },
            "flatBonus": 3
          }
        ]
      },
      {
        "id": "tigre-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (1d8 + 3) de dano cortante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 338,
        "pdfPage": 22,
        "section": "TIGRE"
      }
    ]
  },
  {
    "id": "appendix-a-tigre-dentes-de-sabre",
    "name": "TIGRE DENTES-DE-SABRE",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 57,
      "hitDice": "7d10 + 14"
    },
    "speeds": {
      "walkCm": 1200
    },
    "abilityScores": {
      "str": 18,
      "dex": 14,
      "con": 15,
      "int": 3,
      "wis": 12,
      "cha": 8
    },
    "skills": {
      "stealth": 6,
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 2,
      "denominator": 1
    },
    "experiencePoints": 450,
    "traits": [
      {
        "id": "tigre-dentes-de-sabre-bote",
        "name": "Bote",
        "description": "Se o tigre se mover, pelo menos, 6 metros em linha reta em direção de um alvo logo antes de atingi-lo com seu ataque de garra, o alvo deve ser bem sucedido num teste de resistência de Força CD 14 para não cair no chão. Se o alvo cair no chão, o tigre poderá realizar uma ação bônus para realizar um ataque de mordida contra ele."
      },
      {
        "id": "tigre-dentes-de-sabre-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O tigre tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "actions": [
      {
        "id": "tigre-dentes-de-sabre-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 1,5 m, um alvo. Acerto: 10 (1d12 + 4) de dano perfurante.",
        "attackBonus": 6,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 12
            },
            "flatBonus": 4
          }
        ]
      },
      {
        "id": "tigre-dentes-de-sabre-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 1,5 m, um alvo. Acerto: 11 (2d6 + 4) de dano cortante.",
        "attackBonus": 6,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 4
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 338,
        "pdfPage": 22,
        "section": "TIGRE DENTES-DE-SABRE"
      }
    ]
  },
  {
    "id": "appendix-a-tubarao-cacador",
    "name": "TUBARÃO CAÇADOR",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 45,
      "hitDice": "6d10 + 12"
    },
    "speeds": {
      "walkCm": 0,
      "swimCm": 1200
    },
    "abilityScores": {
      "str": 18,
      "dex": 13,
      "con": 15,
      "int": 1,
      "wis": 10,
      "cha": 4
    },
    "skills": {
      "perception": 2
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 900
      }
    ],
    "passivePerception": 12,
    "challengeRating": {
      "numerator": 2,
      "denominator": 1
    },
    "experiencePoints": 450,
    "traits": [
      {
        "id": "tubarao-cacador-frenesi-de-sangue",
        "name": "Frenesi de Sangue",
        "description": "O tubarão tem vantagem nas jogadas de ataque corpo-a-corpo contra qualquer criatura que não esteja com todos os seus pontos de vida."
      },
      {
        "id": "tubarao-cacador-respirar-na-agua",
        "name": "Respirar na Água",
        "description": "O tubarão pode respirar apenas em baixo d’água."
      }
    ],
    "actions": [
      {
        "id": "tubarao-cacador-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +6 para atingir, alcance 1,5 m, um alvo. Acerto: 13 (2d8 + 4) de dano perfurante. Menor que um tubarão gigante, mas maior e mais feroz que um tubarão dos arrecifes, um tubarão caçador assombra as águas profundas. Ele geralmente caça sozinho, mas diversos tubarões caçadores podem se alimentar na mesma área. Um tubarão caçador totalmente crescido tem entre 4,5 e 6 metros de comprimento.",
        "attackBonus": 6,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 8
            },
            "flatBonus": 4
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 338,
        "pdfPage": 22,
        "section": "TUBARÃO CAÇADOR"
      }
    ]
  },
  {
    "id": "appendix-a-tubarao-dos-arrecifes",
    "name": "TUBARÃO DOS ARRECIFES",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 22,
      "hitDice": "4d8 + 4"
    },
    "speeds": {
      "walkCm": 0,
      "swimCm": 1200
    },
    "abilityScores": {
      "str": 14,
      "dex": 13,
      "con": 13,
      "int": 1,
      "wis": 10,
      "cha": 4
    },
    "skills": {
      "perception": 2
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 900
      }
    ],
    "passivePerception": 12,
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [
      {
        "id": "tubarao-dos-arrecifes-respirar-na-agua",
        "name": "Respirar na Água",
        "description": "O tubarão pode respirar apenas em baixo d’água."
      },
      {
        "id": "tubarao-dos-arrecifes-taticas-de-matilha",
        "name": "Táticas de Matilha",
        "description": "O tubarão tem vantagem nas jogadas de ataque contra uma criatura se, pelo menos, um dos aliados do tubarão estiver a 1,5 metro da criaturas e não estiver incapacitado."
      }
    ],
    "actions": [
      {
        "id": "tubarao-dos-arrecifes-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d8 + 2) de dano perfurante. Menores que os tubarões gigantes e os tubarões caçadores, os tubarões dos arrecifes vivem em águas rasas e em recifes de corais, se unindo em pequenos grupos para caçar. Um espécime totalmente crescido mede entre 1,80 e 3 metros.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 338,
        "pdfPage": 22,
        "section": "TUBARÃO DOS ARRECIFES"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 339,
        "pdfPage": 23,
        "section": "TUBARÃO DOS ARRECIFES"
      }
    ]
  },
  {
    "id": "appendix-a-tubarao-gigante",
    "name": "TUBARÃO GIGANTE",
    "creatureType": "beast",
    "size": "huge",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 126,
      "hitDice": "11d12 + 55"
    },
    "speeds": {
      "walkCm": 0,
      "swimCm": 1500
    },
    "abilityScores": {
      "str": 23,
      "dex": 11,
      "con": 21,
      "int": 1,
      "wis": 10,
      "cha": 5
    },
    "skills": {
      "perception": 3
    },
    "senses": [
      {
        "kind": "blindsight",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 5,
      "denominator": 1
    },
    "experiencePoints": 1800,
    "traits": [
      {
        "id": "tubarao-gigante-frenesi-de-sangue",
        "name": "Frenesi de Sangue",
        "description": "O tubarão tem vantagem nas jogadas de ataque corpo-a-corpo contra qualquer criatura que não esteja com todos os seus pontos de vida."
      },
      {
        "id": "tubarao-gigante-respirar-na-agua",
        "name": "Respirar na Água",
        "description": "O tubarão pode respirar apenas em baixo d’água."
      }
    ],
    "actions": [
      {
        "id": "tubarao-gigante-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +9 para atingir, alcance 1,5 m, um alvo. Acerto: 22 (3d10 + 6) de dano perfurante. Um tubarão gigante tem 9 metros de comprimento e, normalmente é encontrado em oceanos profundos. Absolutamente destemido, ele caça qualquer coisa que cruze seu caminho, incluindo baleias e navios.",
        "attackBonus": 9,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 3,
              "faces": 10
            },
            "flatBonus": 6
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 339,
        "pdfPage": 23,
        "section": "TUBARÃO GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-urso-marrom",
    "name": "URSO MARROM",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 34,
      "hitDice": "4d10 + 12"
    },
    "speeds": {
      "walkCm": 1200,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 19,
      "dex": 10,
      "con": 16,
      "int": 2,
      "wis": 13,
      "cha": 7
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 1
    },
    "experiencePoints": 200,
    "traits": [
      {
        "id": "urso-marrom-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O urso tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "actions": [
      {
        "id": "urso-marrom-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "O urso realiza dois ataques: um com sua mordida e um com suas garras."
      },
      {
        "id": "urso-marrom-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (1d8 + 4) de dano perfurante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 4
          }
        ]
      },
      {
        "id": "urso-marrom-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 11 (2d6 + 4) de dano cortante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 4
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 339,
        "pdfPage": 23,
        "section": "URSO MARROM"
      }
    ]
  },
  {
    "id": "appendix-a-urso-negro",
    "name": "URSO NEGRO",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 11,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 19,
      "hitDice": "3d8 + 6"
    },
    "speeds": {
      "walkCm": 1200,
      "climbCm": 900
    },
    "abilityScores": {
      "str": 15,
      "dex": 10,
      "con": 14,
      "int": 2,
      "wis": 12,
      "cha": 7
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [
      {
        "id": "urso-negro-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O urso tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "actions": [
      {
        "id": "urso-negro-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "O urso realiza dois ataques: um com sua mordida e um com suas garras."
      },
      {
        "id": "urso-negro-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 5 (1d6 + 2) de dano perfurante.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 2
          }
        ]
      },
      {
        "id": "urso-negro-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +3 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (2d4 + 2) de dano cortante.",
        "attackBonus": 3,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 2,
              "faces": 4
            },
            "flatBonus": 2
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 339,
        "pdfPage": 23,
        "section": "URSO NEGRO"
      }
    ]
  },
  {
    "id": "appendix-a-urso-polar",
    "name": "URSO POLAR",
    "creatureType": "beast",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 42,
      "hitDice": "5d10 + 15"
    },
    "speeds": {
      "walkCm": 1200,
      "swimCm": 900
    },
    "abilityScores": {
      "str": 20,
      "dex": 10,
      "con": 16,
      "int": 2,
      "wis": 13,
      "cha": 7
    },
    "skills": {
      "perception": 3
    },
    "passivePerception": 13,
    "challengeRating": {
      "numerator": 2,
      "denominator": 1
    },
    "experiencePoints": 450,
    "traits": [
      {
        "id": "urso-polar-faro-agucado",
        "name": "Faro Aguçado",
        "description": "O urso tem vantagem em testes de Sabedoria (Percepção) relacionados ao olfato."
      }
    ],
    "sourceText": {
      "variation.caveBear": "VARIAÇÃO: URSO DAS CAVERNAS Alguns ursos se adaptaram à vida no subterrâneo, alimentando-se de líquens e peixes cegos. Conhecidos como ursos das cavernas, esses gigantes mal-humorados tem pelo grosso e negro e visão no escuro com alcance de 18 metros. No mais, eles tem as mesmas estatísticas de um urso polar."
    },
    "actions": [
      {
        "id": "urso-polar-ataques-multiplos",
        "name": "Ataques Múltiplos",
        "description": "O urso realiza dois ataques: um com sua mordida e um com suas garras."
      },
      {
        "id": "urso-polar-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +7 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (1d8 + 5) de dano perfurante.",
        "attackBonus": 7,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 8
            },
            "flatBonus": 5
          }
        ]
      },
      {
        "id": "urso-polar-garras",
        "name": "Garras",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 12 (2d6 + 5) de dano cortante.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "slashing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 5
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 339,
        "pdfPage": 23,
        "section": "URSO POLAR"
      },
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 340,
        "pdfPage": 24,
        "section": "URSO POLAR"
      }
    ]
  },
  {
    "id": "appendix-a-veado",
    "name": "VEADO",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 13,
    "hitPoints": {
      "average": 4,
      "hitDice": "1d8"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 11,
      "dex": 16,
      "con": 11,
      "int": 2,
      "wis": 14,
      "cha": 5
    },
    "passivePerception": 12,
    "challengeRating": {
      "numerator": 0,
      "denominator": 1
    },
    "experiencePoints": 10,
    "traits": [],
    "actions": [
      {
        "id": "veado-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +2 para atingir, alcance 1,5 m, um alvo. Acerto: 2 (1d4) de dano perfurante.",
        "attackBonus": 2,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 4
            }
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 340,
        "pdfPage": 24,
        "section": "VEADO"
      }
    ]
  },
  {
    "id": "appendix-a-vespa-gigante",
    "name": "VESPA GIGANTE",
    "creatureType": "beast",
    "size": "medium",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "imparcial",
    "armorClass": 12,
    "hitPoints": {
      "average": 13,
      "hitDice": "3d8"
    },
    "speeds": {
      "walkCm": 300,
      "flyCm": 1500
    },
    "abilityScores": {
      "str": 10,
      "dex": 14,
      "con": 10,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "passivePerception": 10,
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [],
    "actions": [
      {
        "id": "vespa-gigante-ferrao",
        "name": "Ferrão",
        "description": "Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, uma criatura. Acerto: 5 (1d6 + 2) de dano perfurante e o alvo deve realizar um teste de resistência de Constituição CD 11, sofrendo 10 (3d6) de dano de veneno se fracassar na resistência, ou metade desse dano se obtiver sucesso. Se o veneno reduzir os pontos de vida do alvo a 0, ele fica estável mas envenenado por 1 hora, mesmo após recuperar pontos de vida, e fica paralisado enquanto estiver envenenado dessa forma.",
        "attackBonus": 4,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 1,
              "faces": 6
            },
            "flatBonus": 2
          },
          {
            "damageType": "poison",
            "formula": {
              "quantity": 3,
              "faces": 6
            },
            "note": "teste de resistência de Constituição CD 11; metade do dano em sucesso",
            "requiresManualResolution": true
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 340,
        "pdfPage": 24,
        "section": "VESPA GIGANTE"
      }
    ]
  },
  {
    "id": "appendix-a-worg",
    "name": "WORG",
    "creatureType": "monstrosity",
    "size": "large",
    "tags": [
      "monster-manual-appendix-a"
    ],
    "alignment": "neutro e mau",
    "armorClass": 13,
    "armorClassNote": "armadura natural",
    "hitPoints": {
      "average": 26,
      "hitDice": "4d10 + 4"
    },
    "speeds": {
      "walkCm": 1500
    },
    "abilityScores": {
      "str": 16,
      "dex": 13,
      "con": 13,
      "int": 7,
      "wis": 11,
      "cha": 8
    },
    "skills": {
      "perception": 4
    },
    "senses": [
      {
        "kind": "darkvision",
        "rangeCm": 1800
      }
    ],
    "passivePerception": 14,
    "languages": [
      "Goblin, Worg"
    ],
    "challengeRating": {
      "numerator": 1,
      "denominator": 2
    },
    "experiencePoints": 100,
    "traits": [
      {
        "id": "worg-audicao-e-faro-agucados",
        "name": "Audição e Faro Aguçados",
        "description": "O worg tem vantagem em testes de Sabedoria (Percepção) relacionados à audição e ao olfato."
      }
    ],
    "actions": [
      {
        "id": "worg-mordida",
        "name": "Mordida",
        "description": "Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 10 (2d6 + 3) de dano perfurante. Se o alvo for uma criatura, ele deve ser bem sucedido num teste de resistência de Força CD 13 para não cair no chão. Um worg é um predador maligno que sente prazer em caçar e devorar criaturas mais fracas que ele. Astutos e malévolos, os worgs vagam pelos ambientes selvagens remotos ou são criados por goblins e hobgoblins. Essas criaturas usam os worgs como montarias, mas um worg se voltará contra seu cavaleiro caso se sinta maltratado ou desnutrido. Os worgs falam em seu próprio idioma, Goblin e alguns poucos aprendem a falar em Comum também.",
        "attackBonus": 5,
        "reachCm": 150,
        "damage": [
          {
            "damageType": "piercing",
            "formula": {
              "quantity": 2,
              "faces": 6
            },
            "flatBonus": 3
          }
        ]
      }
    ],
    "sourceRefs": [
      {
        "sourceId": "manual-dos-monstros-apendice-a",
        "chapter": "Apêndice A: Criaturas Diversas",
        "printedPage": 340,
        "pdfPage": 24,
        "section": "WORG"
      }
    ]
  }
];

const convertSpeeds = (speeds: ParsedSpeeds) => ({
  ...(speeds.walkCm === undefined ? {} : { walkCm: asCentimeters(speeds.walkCm) }),
  ...(speeds.climbCm === undefined ? {} : { climbCm: asCentimeters(speeds.climbCm) }),
  ...(speeds.swimCm === undefined ? {} : { swimCm: asCentimeters(speeds.swimCm) }),
  ...(speeds.flyCm === undefined ? {} : { flyCm: asCentimeters(speeds.flyCm) }),
  ...(speeds.burrowCm === undefined ? {} : { burrowCm: asCentimeters(speeds.burrowCm) }),
  ...(speeds.hover === undefined ? {} : { hover: speeds.hover }),
  ...(speeds.sourceText === undefined ? {} : { sourceText: speeds.sourceText }),
});

function convertAction(action: ParsedCreatureAction): CreatureAction {
  const { reachCm, rangeCm, ...rest } = action;
  return {
    ...rest,
    ...(reachCm === undefined ? {} : { reachCm: asCentimeters(reachCm) }),
    ...(rangeCm === undefined ? {} : { rangeCm: asCentimeters(rangeCm) }),
  };
}

function convertSense(sense: ParsedCreatureSense): CreatureSense {
  const { rangeCm, ...rest } = sense;
  return { ...rest, ...(rangeCm === undefined ? {} : { rangeCm: asCentimeters(rangeCm) }) };
}

export const appendixACreatures: readonly CreatureStatBlock[] = parsedCreatures.map((creature): CreatureStatBlock => {
  const { speeds, senses, actions, bonusActions, reactions, legendaryActions, sourceRefs, ...base } = creature;
  return {
    ...base,
    id: asEntityId(creature.id),
    speeds: convertSpeeds(speeds),
    ...(senses === undefined ? {} : { senses: senses.map(convertSense) }),
    ...(actions === undefined ? {} : { actions: actions.map(convertAction) }),
    ...(bonusActions === undefined ? {} : { bonusActions: bonusActions.map(convertAction) }),
    ...(reactions === undefined ? {} : { reactions: reactions.map(convertAction) }),
    ...(legendaryActions === undefined ? {} : { legendaryActions: {
      ...legendaryActions,
      actions: legendaryActions.actions.map(convertAction),
    } }),
    sourceRefs: sourceRefs.map((sourceRef) => ({ ...sourceRef, sourceId })),
  };
});
