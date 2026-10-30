/**
 * Orientação curta para cada tipo de escolha: o que é, para que serve e como decidir.
 * O texto completo de cada opção vem do livro (botão ⓘ); aqui ficam só as regras gerais
 * da escolha e dicas de decisão, em linguagem de mesa.
 */
export interface ChoiceGuide {
  /** O que é e para que serve. */
  readonly what: string;
  /** Como escolher. */
  readonly how: readonly string[];
}

const GUIDES: readonly (readonly [RegExp, ChoiceGuide])[] = [
  [/\.asi\.\d+$/, {
    what: "Nos níveis 4, 8, 12, 16 e 19 você aumenta um atributo em 2, ou dois atributos em 1 (máximo 20). No lugar do aumento, pode pegar um talento.",
    how: [
      "O modificador sobe a cada 2 pontos. Se o atributo tem valor ímpar, +1 já aumenta o modificador.",
      "Em geral vale subir o atributo principal da classe (o que mais entra em ataque, magia ou CD) até 20.",
      "Com dois atributos ímpares, +1 em cada rende dois modificadores novos.",
    ],
  }],
  [/\.feat\.\d+$/, {
    what: "Um talento dá uma habilidade especial no lugar do aumento de atributo. Alguns exigem atributo mínimo, conjuração ou proficiência.",
    how: ["Se o seu atributo principal já está em 20 (ou perto), o talento costuma render mais que o aumento.", "Opções com requisito não atendido aparecem em cinza, com o motivo."],
  }],
  [/fighting-style/, {
    what: "Um estilo de combate é uma especialidade fixa que melhora a forma como você luta. Não dá para escolher o mesmo estilo duas vezes.",
    how: ["Combine com a arma: Arquearia para arco ou besta; Duelismo para arma de uma mão; Combate com Armas Grandes para duas mãos; Duas Armas para duas armas leves.", "Defesa serve a quem usa armadura e Proteção a quem usa escudo para guardar aliados."],
  }],
  [/expertise/, {
    what: "Especialização dobra o seu bônus de proficiência em perícias nas quais você já é proficiente.",
    how: ["Escolha as perícias que o personagem usa o tempo todo (Furtividade para ladino, Persuasão para face da mesa).", "Só aparecem perícias em que você já é proficiente e que ainda não têm especialização."],
  }],
  [/metamagic/, {
    what: "Metamagia são ajustes que você aplica a uma magia ao conjurá-la, pagando pontos de feitiçaria. Em geral dá para usar só uma opção por magia.",
    how: ["Defesa e controle: Magia Cuidadosa e Magia Sutil. Dano: Magia Potencializada e Magia Duplicada. Alcance e duração: Distante e Estendida.", "Magia Acelerada deixa conjurar e agir no mesmo turno; Magia Aumentada dá desvantagem ao teste de resistência do alvo.", "Leia o custo em pontos (ⓘ) antes de decidir: opções caras esgotam seus pontos rápido."],
  }],
  [/invocation-swap/, {
    what: "A cada nível que você ganha na classe pode trocar uma invocação conhecida por outra que você possa aprender.",
    how: ["Use a troca quando uma invocação não fizer mais sentido (por exemplo, depois de mudar de pacto)."],
  }],
  [/invocations/, {
    what: "Invocações Místicas são fragmentos de conhecimento proibido que dão poderes permanentes ao bruxo. Você ganha 2 no 2º nível e mais ao longo dos níveis.",
    how: [
      "Algumas exigem nível, uma Dádiva do Pacto ou um truque (como Rajada Mística). Essas aparecem em cinza com o requisito.",
      "Rajada Mística combina com Explosão Agonizante, Explosão Repulsiva e Lança Mística.",
      "Pacto da Lâmina combina com Lâmina Sedenta e Sorvedor de Vida; Pacto da Corrente com Voz do Mestre das Correntes; Pacto do Tomo com Livro de Segredos Antigos.",
      "As demais dão sentidos, idiomas, magias sem gastar espaço ou truques utilitários: escolha o que cobre o que o grupo não tem.",
    ],
  }],
  [/pact-boon/, {
    what: "A Dádiva do Pacto, no 3º nível, é o presente do seu patrono e define como seu bruxo luta ou conjura.",
    how: ["Pacto da Lâmina: uma arma do pacto para lutar de perto.", "Pacto da Corrente: um familiar especial que ajuda e espiona.", "Pacto do Tomo: um livro com 3 truques de qualquer lista e rituais, para um bruxo mais mago.", "Algumas invocações só funcionam com um pacto específico."],
  }],
  [/maneuvers/, {
    what: "Manobras gastam dados de superioridade (d8, recuperados em descanso curto ou longo) para dar efeitos especiais a um ataque. Só se usa uma manobra por ataque.",
    how: ["Ao aprender uma manobra nova, você pode trocar uma que já conhece por outra.", "Ofensivas (Ataque de Precisão, Ataque Estendido) e de controle (Derrubar, Ataque Provocante, Ataque Ameaçador) ajudam quem luta na linha de frente; Inspirar e Golpe do Comandante ajudam o grupo."],
  }],
  [/hunters-prey/, { what: "Presa do Caçador é um golpe especial contra tipos diferentes de alvo.", how: ["Assassino de Colossos para duelos contra um inimigo grande e forte.", "Matador de Gigantes para criaturas Grandes ou maiores.", "Destruidor de Hordas para muitos inimigos pequenos juntos."] }],
  [/defensive-tactics/, { what: "Táticas Defensivas protegem o patrulheiro quando ele é cercado ou atacado por várias criaturas.", how: ["Escolha pelo que mais ameaça o personagem nas campanhas: hordas, ataques múltiplos ou medo e encantamento."] }],
  [/multiattack/, { what: "Ataque Múltiplo é uma opção de ataque em área ou à distância.", how: ["Saraivada para atacar vários alvos à distância; Ataque Giratório para vários inimigos corpo a corpo ao seu redor."] }],
  [/superior-defense/, { what: "A Defesa de Caçador Superior é a proteção final do seu conclave.", how: ["Evasão evita dano de áreas; Esquiva Sobrenatural corta o dano de um ataque; Manter-se Contra a Maré faz o atacante que errou repetir o ataque contra outra criatura."] }],
  [/totem-/, {
    what: "O totem liga o guerreiro a um animal espiritual. Cada nível (3, 6 e 14) tem uma escolha própria, e é possível repetir o mesmo animal.",
    how: ["Urso: resistência e força para quem protege o grupo.", "Águia: velocidade e mobilidade.", "Lobo: ajuda os aliados a atacar."],
  }],
  [/greater-favored-enemy/, { what: "O Inimigo Favorito Maior acrescenta um tipo de criatura poderosa à sua lista de inimigos, com os mesmos benefícios e dano maior.", how: ["Escolha o tipo que a campanha mais coloca contra você (dragões, corruptores, gigantes…)."] }],
  [/favored-enemy/, {
    what: "O inimigo favorito dá +2 no dano com armas contra o tipo escolhido, vantagem para rastrear e lembrar informações sobre ele, e um idioma que ele fale.",
    how: ["Pergunte ao Mestre que tipo de criatura aparece mais na campanha.", "Bestas e humanoides costumam ser os mais comuns; fadas, monstruosidades e mortos-vivos são mais específicos."],
  }],
  [/terrain/, { what: "O terreno do círculo define as magias de círculo que você sempre terá preparadas nos níveis 3, 5, 7 e 9.", how: ["Escolha o terreno que combina com a história do seu druida e com o que o Mestre usa; cada terreno tem uma lista de magias própria, descrita no texto do Círculo da Terra (em 'Ver o que Círculo da Terra faz')."] }],
  [/ancestry/, { what: "O ancestral dracônico define o tipo de dano ligado às suas características de feiticeiro dracônico.", how: ["Escolha pelo tipo de dano que combina com suas magias favoritas: fogo, frio, elétrico, ácido ou veneno."] }],
  [/disciplines/, { what: "Disciplinas Elementais gastam pontos de chi para criar efeitos elementais. Algumas exigem nível de monge (aparecem em cinza).", how: ["Escolha poucas disciplinas bem úteis: seu chi é limitado.", "Ataques à distância e movimentação costumam valer mais que efeitos situacionais."] }],
  [/companion/, { what: "O companheiro animal luta ao seu lado e usa seu bônus de proficiência. O Mestre pode adaptar a escolha ao terreno.", how: ["Lobo, urso e javali são bons de combate; pantera e arminho são ágeis; mula carrega peso."] }],
  [/bonus-skills/, { what: "Perícias adicionais do Colégio do Conhecimento: três perícias à sua escolha.", how: ["Escolha as que o grupo não cobre; Percepção e Intuição servem a quase todos."] }],
  [/knowledge-domain\.languages/, { what: "Bênçãos do Conhecimento: dois idiomas à sua escolha.", how: ["Escolha idiomas que a campanha deve usar (pergunte ao Mestre)."] }],
  [/knowledge-domain\.skills/, { what: "Bênçãos do Conhecimento: duas dentre Arcanismo, História, Natureza e Religião, com o bônus de proficiência dobrado.", how: ["Escolha as que o Mestre mais cobra nas investigações."] }],
  [/student-of-war/, { what: "Estudioso da Guerra: proficiência em um tipo de ferramenta de artesão.", how: ["Escolha pela história do personagem (ferreiro, carpinteiro…) ou pela utilidade na campanha."] }],
  [/cantrips?\.\d+$|tome-cantrips/, {
    what: "Truques são magias simples que não gastam espaço e podem ser usadas à vontade.",
    how: ["Escolha pelo menos um truque de dano para ataques à distância e alguns utilitários.", "Ao abrir o ⓘ você vê alcance, tempo de conjuração e como o dano cresce com o nível."],
  }],
  [/spell-swap/, { what: "Ao subir de nível, quem conhece uma lista fixa de magias pode trocar uma magia conhecida por outra da mesma lista.", how: ["Troque uma magia que você nunca usa por outra que combine com o grupo."] }],
  [/magical-secrets|additional-secrets/, { what: "Segredos Mágicos deixam o bardo aprender magias de qualquer classe. Elas contam como magias de bardo.", how: ["Pegue o que falta ao grupo: cura de outra lista, dano de área do mago, utilidades do clérigo."] }],
  [/arcanum/, { what: "A Arcana Mística é uma magia de 6º a 9º nível que o bruxo lança uma vez por descanso longo, sem gastar espaço.", how: ["Escolha uma magia de alto impacto, já que só dá para usá-la uma vez ao dia."] }],
  [/spell-mastery|signature-spells/, { what: "Magias de domínio e assinatura saem do grimório e passam a ser conjuradas sem custo ou de forma preparada.", how: ["Escolha as magias que você mais usa."] }],
  [/\.spells\.\d+$/, {
    what: "Magias novas entram na sua lista (ou no seu grimório, se você é mago). Só dá para aprender magias de círculos que você já conjura.",
    how: ["Misture dano, controle e defesa; abra o ⓘ para ver alcance, duração e como a magia melhora com espaços maiores.", "Magias com a etiqueta de nível mostram o círculo de espaço necessário."],
  }],
];

export function guideFor(choiceId: string): ChoiceGuide | undefined {
  for (const [pattern, guide] of GUIDES) if (pattern.test(choiceId)) return guide;
  return undefined;
}
