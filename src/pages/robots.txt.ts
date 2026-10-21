// robots.txt, servido em /robots.txt.
//
// Varredura SEMPRE liberada (pedido do cliente, 19/10/2026): o site pode ser indexado.
//
// Antes havia uma trava de indexação: o padrão era "Disallow: /" e só a variável de ambiente
// SITE_OFICIAL=true liberava, para o preview não disputar consultas com o blog anterior em
// beorange.app. A trava foi removida a pedido. Duas coisas continuam valendo:
//
// - Em beorange.app nenhuma página tem noindex. Desde 21/10/2026 o test-beo.vercel.app tem:
//   <meta name="robots" content="noindex, nofollow"> (Layout.astro, só no build do repo
//   test-beo) e X-Robots-Tag no vercel.json (só host *.vercel.app). Por isso este arquivo NÃO
//   pode voltar a dar "Disallow: /": com a varredura bloqueada o buscador nunca lê o noindex,
//   e uma URL do teste já indexada fica no índice.
// - Cada página declara <link rel="canonical"> para https://beorange.app/..., então, se uma
//   URL de preview da Vercel for indexada antes da virada de domínio, o canonical aponta o
//   endereço oficial como o preferido.
//
// O sitemap é anunciado sempre.
import type { APIRoute } from "astro";

const SITE = "https://beorange.app";

const robots = `# beorange.app
# Varredura liberada.

User-agent: *
Allow: /

# O acervo de imagens é servido daqui e pode ser varrido normalmente.
Allow: /img/

# Sem valor de busca: o índice da busca interna é um JSON que repete, em texto corrido,
# o conteúdo que já está nas próprias páginas.
Disallow: /busca.json

Sitemap: ${SITE}/sitemap.xml
`;

export const GET: APIRoute = async () =>
  new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
