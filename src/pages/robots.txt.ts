// robots.txt, servido em /robots.txt.
//
// TRAVA DE INDEXAÇÃO
// Este site ainda não é o oficial: beorange.app continua servindo o blog anterior, com os
// MESMOS 149 artigos. Se a URL de preview da Vercel for indexada enquanto isso, os dois
// endereços disputam as mesmas consultas e o buscador escolhe um — que pode ser o preview.
//
// Por isso o padrão aqui é BLOQUEAR tudo. A liberação é explícita, por variável de ambiente
// no build:
//
//     SITE_OFICIAL=true npm run build
//
// Enquanto ela não existir, sai "Disallow: /" e nenhuma versão de teste entra no índice.
// No dia da virada, basta definir a variável no projeto da Vercel e publicar de novo —
// nenhuma linha de código muda.
//
// O sitemap é anunciado SEMPRE, inclusive na versão bloqueada. Não custa nada: um robots
// que proíbe a varredura também faz o buscador ignorar o sitemap, e deixar a linha ali
// garante que ela não seja esquecida na virada.
import type { APIRoute } from "astro";

const SITE = "https://beorange.app";

/** Só `true` libera. Qualquer outro valor, e a ausência da variável, mantém o bloqueio —
 *  o padrão precisa ser o seguro, porque esquecer de bloquear custa caro e esquecer de
 *  liberar custa um build. */
const oficial = import.meta.env.SITE_OFICIAL === "true";

const liberado = `# beorange.app
# Site oficial. Varredura liberada.

User-agent: *
Allow: /

# O acervo de imagens é servido daqui e pode ser varrido normalmente.
Allow: /img/

# Sem valor de busca: o índice da busca interna é um JSON que repete, em texto corrido,
# o conteúdo que já está nas próprias páginas.
Disallow: /busca.json

Sitemap: ${SITE}/sitemap.xml
`;

const bloqueado = `# beorange.app — AMBIENTE DE TESTE
#
# Esta NÃO é a versão oficial do site. O endereço oficial é ${SITE}, que hoje
# serve o blog anterior com o mesmo conteúdo.
#
# A varredura está bloqueada de propósito, para que este ambiente não dispute as mesmas
# consultas que o site oficial. Para liberar, publique com SITE_OFICIAL=true.

User-agent: *
Disallow: /

Sitemap: ${SITE}/sitemap.xml
`;

export const GET: APIRoute = async () =>
  new Response(oficial ? liberado : bloqueado, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
