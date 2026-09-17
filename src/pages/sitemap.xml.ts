// Sitemap do site, servido em /sitemap.xml.
//
// Escrito à mão em vez de usar @astrojs/sitemap por dois motivos:
//
// 1. A integração oficial publica sitemap-index.xml + sitemap-0.xml. O endereço combinado
//    é beorange.app/sitemap.xml, e com 174 páginas — muito abaixo do limite de 50.000 por
//    arquivo — o índice não traz vantagem nenhuma, só um salto a mais para o buscador.
// 2. O lastmod de cada artigo sai da data real do post, não da data do build. Data de build
//    em sitemap é ruído: diz que 149 páginas mudaram toda vez que qualquer uma muda.
//
// As URLs saem sempre com https://beorange.app, o domínio final, mesmo enquanto o site
// estiver numa URL de preview. Quem segura a indexação do preview é o robots.txt.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const SITE = "https://beorange.app";

/** Páginas fora do blog, na ordem em que importam. Mantidas à mão porque prioridade e
 *  frequência são decisão editorial: não há como deduzir do sistema de arquivos que
 *  /contabilidade-beorange/ vale mais que /termos-de-uso/. */
const PAGINAS: { caminho: string; priority: number; changefreq: string }[] = [
  { caminho: "/", priority: 1.0, changefreq: "weekly" },
  { caminho: "/contabilidade-beorange/", priority: 0.9, changefreq: "monthly" },
  { caminho: "/conta-beorange/", priority: 0.9, changefreq: "monthly" },
  { caminho: "/lucro-real/", priority: 0.9, changefreq: "monthly" },
  { caminho: "/reforma-tributaria/", priority: 0.9, changefreq: "weekly" },
  { caminho: "/blog/", priority: 0.8, changefreq: "daily" },
  { caminho: "/contabilidade-beorange/contabil/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/fiscal/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/tributario/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/departamento-pessoal/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/societario/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/contabilidade-beorange/assessoria/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/conta-pj/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/cobrancas/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/portal/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/bpo-financeiro/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/conta-beorange/bora-financeira/", priority: 0.8, changefreq: "monthly" },
  { caminho: "/sobre-nos/", priority: 0.6, changefreq: "yearly" },
  // A entity home da pessoa que assina os 149 artigos. Prioridade acima da /sobre-nos/ porque
  // é a página que o `author` de todo BlogPosting referencia: se ela não for varrida, a
  // referência existe no dado estruturado e não existe no índice.
  { caminho: "/sobre-nos/myle-pontes/", priority: 0.7, changefreq: "monthly" },
  { caminho: "/cases/", priority: 0.6, changefreq: "monthly" },
  { caminho: "/contato/", priority: 0.6, changefreq: "yearly" },
  { caminho: "/politica-de-privacidade/", priority: 0.2, changefreq: "yearly" },
  { caminho: "/politica-de-cookies/", priority: 0.2, changefreq: "yearly" },
  { caminho: "/termos-de-uso/", priority: 0.2, changefreq: "yearly" },
  { caminho: "/lgpd/", priority: 0.2, changefreq: "yearly" },
];

/** /blog/exemplo/ NÃO entra: é o rascunho editorial do designer, e a própria página se
 *  declara "conteúdo de exemplo, a revisar antes de publicar". Sitemap é a lista do que
 *  você quer que seja indexado — pedir indexação de um rascunho é pedir para ser julgado
 *  por ele. */
const FORA = new Set(["/blog/exemplo/"]);

function entrada(loc: string, lastmod: string | null, changefreq: string, priority: number) {
  const partes = [
    `    <loc>${SITE}${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
  ].filter(Boolean);
  return `  <url>\n${partes.join("\n")}\n  </url>`;
}

export const GET: APIRoute = async () => {
  const artigos = await getCollection("artigos");

  const urls: string[] = [];

  for (const p of PAGINAS) {
    if (FORA.has(p.caminho)) continue;
    urls.push(entrada(p.caminho, null, p.changefreq, p.priority));
  }

  // Artigos do mais recente para o mais antigo: a ordem não muda nada para o buscador,
  // mas deixa o arquivo legível para quem abrir de olho.
  const ordenados = [...artigos].sort((a, b) =>
    b.data.dataIso.localeCompare(a.data.dataIso),
  );
  for (const a of ordenados) {
    const caminho = `/blog/${a.data.slug}/`;
    if (FORA.has(caminho)) continue;
    urls.push(entrada(caminho, a.data.dataIso, "monthly", 0.7));
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
