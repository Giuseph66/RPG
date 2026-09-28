/**
 * Divergências revisadas em que o nosso valor fica: o Livro do Jogador pt-BR (fonte canônica
 * do pack) difere da SRD 5.1 ou a própria API tem erro de dados. `--aplica` nunca as grava;
 * o relatório as lista como "exceção" com o motivo. Preço e peso de equipamento já são
 * conferidos automaticamente contra as tabelas impressas (src/data/correto).
 *
 * Chave: `<domínio>:<nosso id>:<campo>` (campo = rótulo usado no relatório).
 */
export const EXCECOES: Readonly<Record<string, string>> = {
  "magias-livro:adivinhacao:Classes": "Catálogo extraído do PDF lista só clérigo; a SRD lista druida. Não confirmado no texto do livro: conferir a página antes de mudar.",
  "magias-livro:criar-alimentos:Classes": "Catálogo extraído do PDF lista clérigo e paladino; a SRD acrescenta druida. Não confirmado no texto do livro: conferir a página antes de mudar.",
  "magias-livro:fogo-das-fadas:Classes": "Catálogo extraído do PDF lista bardo e druida; a SRD lista só druida. Não confirmado no texto do livro: conferir a página antes de mudar.",
  "magias-livro:mesclar-se-as-rochas:Classes": "Catálogo extraído do PDF lista clérigo e druida; a SRD lista só clérigo. Não confirmado no texto do livro: conferir a página antes de mudar.",
  "magias-livro:olho-arcano:Classes": "Catálogo extraído do PDF lista só mago; a SRD acrescenta clérigo. Não confirmado no texto do livro: conferir a página antes de mudar.",
  "magias-livro:revivify:Escola": "Catálogo extraído do PDF diz necromancia (lista de classe e descrição); a SRD diz conjuração. Não confirmado no texto do livro: conferir a página antes de mudar.",
  "magias-pack:revivify:Escola": "Definição automatizada e PDF dizem necromancia; a SRD diz conjuração. Não confirmado no texto do livro: conferir a página antes de mudar.",
  "equipamento:greatclub:Propriedades": "Livro pt-BR imprime \"Pesada, duas mãos\" para Clava Grande; a SRD traz só duas mãos.",
  "equipamento:pouch:Preço (po)": "Livro pt-BR imprime 5 po; o original e a SRD trazem 5 pp (0,5 po), valor mantido.",
  "magias-livro:curar-ferimentos-em-massa:Escola": "Catálogo extraído do PDF diz evocação (nas três listas de classe); a SRD diz conjuração. Não confirmado no texto do livro: conferir a página antes de mudar.",
  "magias-livro:cura-completa-em-massa:Escola": "Catálogo extraído do PDF diz evocação; a SRD diz conjuração. Não confirmado no texto do livro: conferir a página antes de mudar.",
};

/**
 * Itens em que nenhum valor deve ser gravado automaticamente (chave `<domínio>:<id>:*`):
 * o problema é de identidade, não de número. Vazio quando não há caso pendente.
 */
export const REVISAO_MANUAL: Readonly<Record<string, string>> = {};

export function excecaoKey(domain: string, id: string, field: string): string {
  return `${domain}:${id}:${field}`;
}
