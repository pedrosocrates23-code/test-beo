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
import { PAGINAS_FIXAS, ROTAS_FORA } from "../lib/paginas";

const SITE = "https://beorange.app";

/** A lista de páginas fixas e o que fica fora vivem em src/lib/paginas.ts, compartilhados
 *  com o índice de busca. Emitidas aqui ordenadas por `priority` — a ordem daquele array é a
 *  da busca, que agrupa os resultados pela primeira aparição, e não teria sentido aqui. */
const PAGINAS = [...PAGINAS_FIXAS].sort((a, b) => b.priority - a.priority);
const FORA = ROTAS_FORA;

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
