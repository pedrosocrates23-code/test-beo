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
import { PAGINAS_FIXAS, ROTAS_FORA } from "../lib/paginas";

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

/** As páginas fixas vêm de src/lib/paginas.ts, a mesma lista que alimenta o sitemap. Antes
 *  eram duas listas paralelas mantidas à mão, e foi assim que as quatro páginas de
 *  calculadoras e a home ficaram de fora da busca enquanto estavam no sitemap. */

export const GET: APIRoute = async () => {
  const artigos = await getCollection("artigos");

  const itens = [
    ...PAGINAS_FIXAS.filter((p) => !ROTAS_FORA.has(p.caminho)).map((p) => ({
      tipo: "pagina" as const,
      titulo: p.titulo,
      url: p.caminho,
      grupo: p.grupo,
      resumo: p.resumo,
      busca: normalizar(`${p.titulo} ${p.grupo} ${p.resumo}`),
    })),
    ...artigos
      .filter((e) => !ROTAS_FORA.has(`/blog/${e.data.slug}/`))
      .map((e) => {
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
