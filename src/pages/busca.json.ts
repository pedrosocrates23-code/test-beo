// Índice de busca do site, gerado no build e servido como /busca.json.
//
// A busca é do lado do cliente: o overlay baixa este arquivo uma vez, na primeira abertura, e
// filtra em memória. Não existe servidor para consultar — o site é estático —, e um índice de
// 149 artigos cabe folgado em memória. Se o acervo crescer muito (alguns milhares), o caminho
// é paginar ou trocar por um serviço de busca; até lá, isto é mais rápido que qualquer
// ida à rede por tecla digitada.
//
// O campo `busca` é o que o filtro varre: título, categoria e lead juntos, já em minúsculas e
// sem acento. Normalizar aqui, uma vez no build, evita repetir o trabalho a cada tecla no
// navegador do visitante — e é o que faz "societario" encontrar "Societário".
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

/** Minúsculas e sem acento, para comparar sem depender de como a pessoa digitou. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}


/** Nome legível de cada silo de conteúdo.
 *
 *  Os artigos migrados trazem o silo em sigla maiúscula (REFORMA, DP, IRPF), que serve para
 *  organizar o acervo mas não para aparecer num filtro. Os rótulos abaixo foram escritos
 *  depois de ler o que há em cada silo, não deduzidos da sigla — três deles teriam saído
 *  errados por dedução:
 *    CONTABIL       não é "contábil" no sentido de frente de serviço: são balanço, due
 *                   diligence e contabilidade para SaaS e startups;
 *    CONTA          não é a Conta Beorange: é PIX, Open Finance, golpes e fraude;
 *    REGIME         não é só enquadramento: inclui créditos, CSLL e redução de carga.
 *
 *  Silo novo sem entrada aqui aparece com a própria sigla — feio, mas visível, o que é melhor
 *  que sumir da busca. */
const NOME_DO_SILO: Record<string, string> = {
  REFORMA: "Reforma Tributária",
  ACESSORIAS: "Obrigações acessórias",
  IRPF: "Imposto de Renda",
  CONTABIL: "Contabilidade",
  SOCIETARIO: "Societário",
  REGIME: "Regime e carga tributária",
  DP: "Departamento Pessoal",
  TECH: "Tecnologia e automação",
  SIMPLES: "Simples Nacional",
  NEGOCIO: "Gestão do negócio",
  CONTA: "Pagamentos e PIX",
  FINANCEIRO: "Gestão financeira",
  INSTITUCIONAL: "Notícias Beorange",
};

/** Páginas fixas do site. Não vêm de collection: são rotas escritas à mão, e a lista precisa
 *  ser mantida junto com elas. Uma página nova sem entrada aqui simplesmente não aparece na
 *  busca — não quebra nada, mas some. */
const PAGINAS = [
  { titulo: "Contabilidade Beorange", url: "/contabilidade-beorange/", grupo: "Soluções",
    resumo: "Contábil, fiscal, departamento pessoal, tributário, societário e assessoria." },
  { titulo: "Conta Beorange", url: "/conta-beorange/", grupo: "Soluções",
    resumo: "Conta PJ, cobranças, portal de gestão, BPO Financeiro e Bora Financeira." },
  { titulo: "Lucro Real e estratégia tributária", url: "/lucro-real/", grupo: "Soluções",
    resumo: "Revisão de bases, créditos, recuperação e planejamento tributário." },
  { titulo: "Reforma Tributária: IBS e CBS", url: "/reforma-tributaria/", grupo: "Soluções",
    resumo: "Análise de impacto sobre preços, margens, contratos e créditos." },
  { titulo: "Contábil", url: "/contabilidade-beorange/contabil/", grupo: "Frentes",
    resumo: "Informação contábil completa, confiável e útil para a gestão." },
  { titulo: "Fiscal", url: "/contabilidade-beorange/fiscal/", grupo: "Frentes",
    resumo: "Apuração, escrituração e cumprimento das obrigações fiscais." },
  { titulo: "Departamento Pessoal", url: "/contabilidade-beorange/departamento-pessoal/", grupo: "Frentes",
    resumo: "Operação trabalhista e previdenciária organizada." },
  { titulo: "Tributário", url: "/contabilidade-beorange/tributario/", grupo: "Frentes",
    resumo: "Estratégia tributária construída a partir da sua operação." },
  { titulo: "Societário", url: "/contabilidade-beorange/societario/", grupo: "Frentes",
    resumo: "Estrutura jurídica alinhada ao modelo de negócio e ao crescimento." },
  { titulo: "Assessoria e Consultoria", url: "/contabilidade-beorange/assessoria/", grupo: "Frentes",
    resumo: "Análise recorrente dos números com um analista dedicado." },
  { titulo: "Conta PJ e movimentação", url: "/conta-beorange/conta-pj/", grupo: "Frentes",
    resumo: "Controle financeiro com múltiplos usuários, limites e alçadas." },
  { titulo: "Cobranças e recebimentos", url: "/conta-beorange/cobrancas/", grupo: "Frentes",
    resumo: "Cobrança organizada do início ao recebimento." },
  { titulo: "Portal de gestão financeira", url: "/conta-beorange/portal/", grupo: "Frentes",
    resumo: "Uma estrutura que substitui controles e softwares avulsos." },
  { titulo: "BPO Financeiro", url: "/conta-beorange/bpo-financeiro/", grupo: "Frentes",
    resumo: "Execução operacional com clareza e orientação." },
  { titulo: "Bora Financeira", url: "/conta-beorange/bora-financeira/", grupo: "Frentes",
    resumo: "Automação assistida com validação humana." },
  { titulo: "Sobre nós", url: "/sobre-nos/", grupo: "Institucional",
    resumo: "Quem somos, como trabalhamos e por que a Beorange existe." },
  { titulo: "Cases", url: "/cases/", grupo: "Institucional",
    resumo: "Empresas que reorganizaram a estrutura administrativa." },
  { titulo: "Contato", url: "/contato/", grupo: "Institucional",
    resumo: "Fale com quem vai ler os seus números." },
  { titulo: "Blog", url: "/blog/", grupo: "Institucional",
    resumo: "Conteúdo sobre Lucro Real, Reforma Tributária e gestão financeira." },
  { titulo: "Política de Privacidade", url: "/politica-de-privacidade/", grupo: "Legal",
    resumo: "Como a Beorange coleta, usa, armazena e protege dados pessoais." },
  { titulo: "Política de Cookies", url: "/politica-de-cookies/", grupo: "Legal",
    resumo: "Quais cookies o site usa, para quê, e como você controla." },
  { titulo: "Termos de Uso", url: "/termos-de-uso/", grupo: "Legal",
    resumo: "Condições para utilizar o site, o portal e as soluções." },
  { titulo: "LGPD", url: "/lgpd/", grupo: "Legal",
    resumo: "Como exercer os direitos previstos na Lei Geral de Proteção de Dados." },
];

export const GET: APIRoute = async () => {
  const artigos = await getCollection("artigos");

  const itens = [
    ...PAGINAS.map((p) => ({
      tipo: "pagina" as const,
      titulo: p.titulo,
      url: p.url,
      grupo: p.grupo,
      resumo: p.resumo,
      busca: normalizar(`${p.titulo} ${p.grupo} ${p.resumo}`),
    })),
    ...artigos.map((e) => {
      const a = e.data;
      return {
        tipo: "artigo" as const,
        titulo: a.titulo,
        url: `/blog/${a.slug}/`,
        grupo: NOME_DO_SILO[a.cluster] ?? a.cluster,
        resumo: a.lead,
        data: a.dataIso,
        // a categoria continua no texto buscável mesmo sem virar filtro: quem procura
        // "lucro presumido" deve achar o artigo, ainda que o silo se chame outra coisa
        busca: normalizar(`${a.titulo} ${a.categoria} ${a.cluster} ${a.lead}`),
      };
    }),
  ];

  // Os grupos alimentam o filtro: os 13 silos de conteúdo mais os grupos das páginas fixas.
  // Antes o filtro vinha das categorias do Framer — 20 rótulos sobrepostos, com "Tributação",
  // "Tributário" e "Obrigações Fiscais" como entradas distintas, e seis delas com um artigo
  // só. Silo é a divisão real do acervo, e é ela que ajuda a encontrar.
  const contagem = new Map<string, number>();
  for (const i of itens) contagem.set(i.grupo, (contagem.get(i.grupo) ?? 0) + 1);
  const grupos = [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([g, n]) => ({ nome: g, total: n }));

  return new Response(JSON.stringify({ itens, grupos }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
