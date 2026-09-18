/**
 * As três calculadoras, em um lugar só.
 *
 * Quatro consumidores leem desta lista: o seletor do CalculadoraShell, o hub em
 * /calculadoras/, a coluna do rodapé e o sitemap. Enquanto a lista for uma só, acrescentar
 * uma quarta calculadora é acrescentar uma linha aqui, e ela aparece nos quatro lugares.
 *
 * A advertência do Footer.astro vale de novo: rota que existe em três listas paralelas é
 * rota que sai do ar em duas delas no dia da mudança. Aqui não há três listas.
 */
export interface Calculadora {
  /** Fim do caminho: /calculadoras/<slug>/ */
  slug: string;
  /** Rótulo curto, para o seletor e para o rodapé. */
  curto: string;
  /** Nome por extenso, para o hub e para os dados estruturados. */
  nome: string;
  /** Uma linha sobre o que a calculadora responde. */
  resumo: string;
}

export const CALCULADORAS: Calculadora[] = [
  {
    slug: "tributaria",
    curto: "Tributária",
    nome: "Calculadora tributária",
    resumo:
      "INSS e IRRF da pessoa física com o redutor da Lei 15.270/2025, e o DAS do Simples, o Lucro Presumido e a retirada do sócio na pessoa jurídica.",
  },
  {
    slug: "clt-vs-pj",
    curto: "CLT × PJ",
    nome: "Calculadora CLT × PJ",
    resumo:
      "O pacote CLT inteiro (13º, férias com o terço, FGTS e benefícios) contra a retirada líquida da PJ, com o faturamento que empata os dois.",
  },
  {
    slug: "ibs-cbs",
    curto: "IBS e CBS",
    nome: "Calculadora de IBS e CBS",
    resumo:
      "O IBS e a CBS da Reforma Tributária: ano-teste de 2026, transição até 2033, reduções de 30% e 60%, créditos e a comparação com a carga de hoje.",
  },
];

export const caminhoDe = (slug: string) => `/calculadoras/${slug}/`;
