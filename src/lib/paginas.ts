// Lista única das páginas fixas do site — as que não vêm de content collection.
//
// POR QUE ESTE ARQUIVO EXISTE
//
// A mesma lista era mantida duas vezes: uma em sitemap.xml.ts, outra em busca.json.ts. Elas
// saíram de sincronia. Quando as calculadoras entraram, foram acrescentadas ao sitemap e
// esquecidas na busca — resultado: quatro páginas publicadas, indexáveis pelo Google e
// invisíveis para quem usava a lupa do próprio site. A home nunca esteve na busca.
//
// Uma lista só, com os campos dos dois consumidores, elimina a classe do problema; o
// tests/paginas.test.mjs elimina o resto, comparando esta lista com as rotas que o build
// realmente gerou. Página nova sem entrada aqui passa a REPROVAR o teste, em vez de sumir
// da busca em silêncio.
//
// A ORDEM DESTE ARRAY IMPORTA — mas só para a busca
//
// O overlay agrupa os resultados por `grupo` e usa a ordem de PRIMEIRA APARIÇÃO no índice
// para ordenar os grupos (ver BuscaOverlay.astro, função `filtrar`). Por isso a ordem aqui é
// a da busca: Soluções, Frentes, Ferramentas, Institucional, Legal — e só então os artigos.
// Mover uma linha reordena os grupos na busca.
//
// O sitemap não depende da ordem: ele emite ordenado por `priority`, que é a decisão
// editorial de peso e não tem como ser deduzida do sistema de arquivos.

export interface PaginaFixa {
  /** Rota com barra no fim, como o build a gera. */
  caminho: string;
  /** Rótulo curto para a busca — não é o <title> da página, que carrega a marca e o SEO. */
  titulo: string;
  /** Vira cabeçalho de seção e opção de filtro na busca. */
  grupo: string;
  /** Linha de apoio sob o título, no resultado da busca. */
  resumo: string;
  priority: number;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
}

export const PAGINAS_FIXAS: PaginaFixa[] = [
  // ---------------------------------------------------------------- Soluções
  { caminho: "/contabilidade-beorange/", titulo: "Contabilidade Beorange", grupo: "Soluções",
    resumo: "Contábil, fiscal, departamento pessoal, tributário, societário e assessoria.",
    priority: 0.9, changefreq: "monthly" },
  { caminho: "/conta-beorange/", titulo: "Conta Beorange", grupo: "Soluções",
    resumo: "Conta PJ, cobranças, portal de gestão, BPO Financeiro e Bora Financeira.",
    priority: 0.9, changefreq: "monthly" },
  { caminho: "/lucro-real/", titulo: "Lucro Real e estratégia tributária", grupo: "Soluções",
    resumo: "Revisão de bases, créditos, recuperação e planejamento tributário.",
    priority: 0.9, changefreq: "monthly" },
  { caminho: "/reforma-tributaria/", titulo: "Reforma Tributária: IBS e CBS", grupo: "Soluções",
    resumo: "Análise de impacto sobre preços, margens, contratos e créditos.",
    priority: 0.9, changefreq: "weekly" },

  // ---------------------------------------------------------------- Frentes
  { caminho: "/contabilidade-beorange/contabil/", titulo: "Contábil", grupo: "Frentes",
    resumo: "Informação contábil completa, confiável e útil para a gestão.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/fiscal/", titulo: "Fiscal", grupo: "Frentes",
    resumo: "Apuração, escrituração e cumprimento das obrigações fiscais.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/departamento-pessoal/", titulo: "Departamento Pessoal", grupo: "Frentes",
    resumo: "Operação trabalhista e previdenciária organizada.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/tributario/", titulo: "Tributário", grupo: "Frentes",
    resumo: "Estratégia tributária construída a partir da sua operação.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/societario/", titulo: "Societário", grupo: "Frentes",
    resumo: "Estrutura jurídica alinhada ao modelo de negócio e ao crescimento.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/assessoria/", titulo: "Assessoria e Consultoria", grupo: "Frentes",
    resumo: "Análise recorrente dos números com um analista dedicado.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/conta-pj/", titulo: "Conta PJ e movimentação", grupo: "Frentes",
    resumo: "Controle financeiro com múltiplos usuários, limites e alçadas.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/cobrancas/", titulo: "Cobranças e recebimentos", grupo: "Frentes",
    resumo: "Cobrança organizada do início ao recebimento.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/portal/", titulo: "Portal de gestão financeira", grupo: "Frentes",
    resumo: "Uma estrutura que substitui controles e softwares avulsos.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/bpo-financeiro/", titulo: "BPO Financeiro", grupo: "Frentes",
    resumo: "Execução operacional com clareza e orientação.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/bora-financeira/", titulo: "Bora Financeira", grupo: "Frentes",
    resumo: "Automação assistida com validação humana.",
    priority: 0.8, changefreq: "monthly" },

  // ---------------------------------------------------------------- Ferramentas
  // Grupo próprio, e posicionado à frente de Institucional, porque são as únicas páginas do
  // site que respondem a uma busca com um resultado calculado, e não com descrição de
  // serviço. Os resumos saem da `descricao` de cada página, encurtados — não reescritos.
  { caminho: "/calculadoras/", titulo: "Calculadoras", grupo: "Ferramentas",
    resumo: "Três calculadoras gratuitas com as tabelas de 2026: tributária, CLT e PJ, e IBS e CBS.",
    priority: 0.8, changefreq: "monthly" },
  { caminho: "/calculadoras/tributaria/", titulo: "Calculadora Tributária 2026", grupo: "Ferramentas",
    resumo: "INSS, IRRF, DAS do Simples Nacional e Lucro Presumido, com memória de cálculo.",
    priority: 0.8, changefreq: "yearly" },
  { caminho: "/calculadoras/clt-vs-pj/", titulo: "Calculadora CLT vs PJ 2026", grupo: "Ferramentas",
    resumo: "Compara o pacote CLT completo com a retirada líquida de uma PJ e mostra o ponto de equilíbrio.",
    priority: 0.8, changefreq: "yearly" },
  { caminho: "/calculadoras/ibs-cbs/", titulo: "Calculadora IBS e CBS", grupo: "Ferramentas",
    resumo: "Simula o IBS e a CBS do Regime Geral, a transição até 2033 e a comparação com PIS, COFINS, ICMS e ISS.",
    priority: 0.8, changefreq: "monthly" },

  // ---------------------------------------------------------------- Institucional
  { caminho: "/", titulo: "Página inicial", grupo: "Institucional",
    resumo: "Contabilidade consultiva, conta PJ e automação financeira no mesmo ambiente.",
    priority: 1.0, changefreq: "weekly" },
  { caminho: "/sobre-nos/", titulo: "Sobre nós", grupo: "Institucional",
    resumo: "Quem somos, como trabalhamos e por que a Beorange existe.",
    priority: 0.6, changefreq: "yearly" },
  { caminho: "/cases/", titulo: "Cases", grupo: "Institucional",
    resumo: "Empresas que reorganizaram a estrutura administrativa.",
    priority: 0.6, changefreq: "monthly" },
  { caminho: "/contato/", titulo: "Contato", grupo: "Institucional",
    resumo: "Fale com quem vai ler os seus números.",
    priority: 0.6, changefreq: "yearly" },
  { caminho: "/blog/", titulo: "Blog", grupo: "Institucional",
    resumo: "Conteúdo sobre Lucro Real, Reforma Tributária e gestão financeira.",
    priority: 0.8, changefreq: "daily" },

  // ---------------------------------------------------------------- Legal
  { caminho: "/politica-de-privacidade/", titulo: "Política de Privacidade", grupo: "Legal",
    resumo: "Como a Beorange coleta, usa, armazena e protege dados pessoais.",
    priority: 0.2, changefreq: "yearly" },
  { caminho: "/politica-de-cookies/", titulo: "Política de Cookies", grupo: "Legal",
    resumo: "Quais cookies o site usa, para quê, e como você controla.",
    priority: 0.2, changefreq: "yearly" },
  { caminho: "/termos-de-uso/", titulo: "Termos de Uso", grupo: "Legal",
    resumo: "Condições para utilizar o site, o portal e as soluções.",
    priority: 0.2, changefreq: "yearly" },
  { caminho: "/lgpd/", titulo: "LGPD", grupo: "Legal",
    resumo: "Como exercer os direitos previstos na Lei Geral de Proteção de Dados.",
    priority: 0.2, changefreq: "yearly" },
];

/** /blog/exemplo/ é o rascunho editorial do designer, e a própria página se declara
 *  "conteúdo de exemplo, a revisar antes de publicar". Fica fora do sitemap — pedir
 *  indexação de um rascunho é pedir para ser julgado por ele — e fora da busca pelo mesmo
 *  motivo: quem procura no site não deve esbarrar num texto que não foi revisado. */
export const ROTAS_FORA = new Set(["/blog/exemplo/"]);
