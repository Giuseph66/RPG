/**
 * EXTRAÇÃO PARA INTEGRAÇÃO DO COMPÊNDIO
 * Fonte exclusiva: PDF "Livro do Jogador" fornecido pelo usuário.
 * O campo `text` preserva o texto extraído da fonte sem correções externas,
 * sem reescrita e sem inferência de regras.
 * Quebras de linha/paginação são mantidas quando presentes na extração.
 */

export const PHB_REST_DESCRIPTIONS = {
  "overview": {
    "name": "Descanso",
    "sourceHeading": "DESCANSO",
    "pdfPages": [
      187,
      187
    ],
    "printedPages": [
      188,
      188
    ],
    "text": "DESCANSO\nPor mais heroicos que sejam, os aventureiros não podem\ngastar cada hora do dia no meio da exploração, interação\nsocial e do combate. Eles precisam descansar – tempo\npara dormir e comer, cuidar de seus ferimentos, atualizar\nsuas mentes e espíritos para conjurar magias, e se\nprepararem para mais aventuras.\nQualquer criatura pode fazer descansos curtos no meio\nde um dia de aventura e um descanso longo ao fim do dia.\nDESCANSO CURTO\nUm descanso curto é um período de tempo de inatividade,\ncom pelo menos 1 hora de duração, durante o qual um\npersonagem não faz nada mais árduo do que comer,\nbeber, ler e tratar seus ferimentos.\nUm personagem pode gastar um ou mais Dados de\nVida no final de um descanso curto, até o máximo de\nDados de Vida do personagem, que é igual ao nível do\npersonagem. Para cada Dado de Vida gasto dessa forma, o\njogador joga o dado e adiciona seu modificador de\nConstituição à jogada. Após aplicar seu modificador de\nConstituição a jogada de Dado de Vida, você recupera no\nmínimo 0 pontos de vida. O jogador pode decidir gastar\num Dado de Vida adicional após cada jogada. Um\npersonagem recupera alguns Dados de Vida gastos ao\nterminar um descanso longo, conforme explicado abaixo.\nDESCANSO LONGO\nUm descanso longo é um período de tempo de inatividade\nprolongada, pelo menos 8 horas de duração, durante o\nqual um personagem dorme ou exerce atividades leves:\nler, falar, comer ou vigiar por não mais de 2 horas. Se o\ndescanso for interrompido por um período de atividade\nextenuante – pelo menos 1 hora de caminhada, combate,\nconjurando magias ou atividades semelhantes – os\npersonagens devem começar o descanso de novo para\nganhar algum benefício dele.\nNo final de um descanso longo, o personagem recupera\ntodos os pontos de vida perdidos. O personagem também\nrecupera uma quantidade de Dados de Vida gastos igual a\nmetade da quantidade total de Dados de Vida do\npersonagem. Por exemplo, se um personagem tem oito\nDados de Vida, ele pode recuperar quatro Dados de Vida\nao terminar um descanso longo.\nUm personagem não pode se beneficiar de mais de um\ndescanso longo em um período de 24 horas, e um\npersonagem deve ter pelo menos 1 ponto de vida no início\ndo descanso para obter seus benefícios."
  },
  "entries": [
    {
      "id": "short-rest",
      "name": "Descanso Curto",
      "sourceHeading": "DESCANSO CURTO",
      "chapter": "Capítulo 8 — Aventurando-se",
      "pdfPages": [
        187,
        187
      ],
      "printedPages": [
        188,
        188
      ],
      "text": "DESCANSO CURTO\nUm descanso curto é um período de tempo de inatividade,\ncom pelo menos 1 hora de duração, durante o qual um\npersonagem não faz nada mais árduo do que comer,\nbeber, ler e tratar seus ferimentos.\nUm personagem pode gastar um ou mais Dados de\nVida no final de um descanso curto, até o máximo de\nDados de Vida do personagem, que é igual ao nível do\npersonagem. Para cada Dado de Vida gasto dessa forma, o\njogador joga o dado e adiciona seu modificador de\nConstituição à jogada. Após aplicar seu modificador de\nConstituição a jogada de Dado de Vida, você recupera no\nmínimo 0 pontos de vida. O jogador pode decidir gastar\num Dado de Vida adicional após cada jogada. Um\npersonagem recupera alguns Dados de Vida gastos ao\nterminar um"
    },
    {
      "id": "long-rest",
      "name": "Descanso Longo",
      "sourceHeading": "DESCANSO LONGO",
      "chapter": "Capítulo 8 — Aventurando-se",
      "pdfPages": [
        187,
        187
      ],
      "printedPages": [
        188,
        188
      ],
      "text": "descanso longo ao fim do dia.\nDESCANSO CURTO\nUm descanso curto é um período de tempo de inatividade,\ncom pelo menos 1 hora de duração, durante o qual um\npersonagem não faz nada mais árduo do que comer,\nbeber, ler e tratar seus ferimentos.\nUm personagem pode gastar um ou mais Dados de\nVida no final de um descanso curto, até o máximo de\nDados de Vida do personagem, que é igual ao nível do\npersonagem. Para cada Dado de Vida gasto dessa forma, o\njogador joga o dado e adiciona seu modificador de\nConstituição à jogada. Após aplicar seu modificador de\nConstituição a jogada de Dado de Vida, você recupera no\nmínimo 0 pontos de vida. O jogador pode decidir gastar\num Dado de Vida adicional após cada jogada. Um\npersonagem recupera alguns Dados de Vida gastos ao\nterminar um descanso longo, conforme explicado abaixo.\nDESCANSO LONGO\nUm descanso longo é um período de tempo de inatividade\nprolongada, pelo menos 8 horas de duração, durante o\nqual um personagem dorme ou exerce atividades leves:\nler, falar, comer ou vigiar por não mais de 2 horas. Se o\ndescanso for interrompido por um período de atividade\nextenuante – pelo menos 1 hora de caminhada, combate,\nconjurando magias ou atividades semelhantes – os\npersonagens devem começar o descanso de novo para\nganhar algum benefício dele.\nNo final de um descanso longo, o personagem recupera\ntodos os pontos de vida perdidos. O personagem também\nrecupera uma quantidade de Dados de Vida gastos igual a\nmetade da quantidade total de Dados de Vida do\npersonagem. Por exemplo, se um personagem tem oito\nDados de Vida, ele pode recuperar quatro Dados de Vida\nao terminar um descanso longo.\nUm personagem não pode se beneficiar de mais de um\ndescanso longo em um período de 24 horas, e um\npersonagem deve ter pelo menos 1 ponto de vida no início\ndo descanso para obter seus benefícios."
    }
  ]
} as const;

export default PHB_REST_DESCRIPTIONS;
