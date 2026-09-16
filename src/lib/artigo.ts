// Utilitários do template de artigo (/blog/*).
// Rodam sempre em build time — a saída do projeto é estática.

/** Palavras por minuto usadas no "tempo de leitura". 200 é a média de leitura
 *  silenciosa em português para texto de prosa informativa. */
export const PALAVRAS_POR_MINUTO = 200;

/**
 * Conta as palavras de um trecho de HTML (ou de um arquivo .astro), ignorando
 * tags, frontmatter e expressões `{...}`. Só conta o que tem letra ou dígito,
 * para que pontuação solta não vire palavra.
 */
export function contarPalavras(fonte: string): number {
  let texto = fonte;

  // frontmatter do .astro, quando vier o arquivo inteiro
  if (texto.startsWith("---")) {
    const fim = texto.indexOf("---", 3);
    if (fim !== -1) texto = texto.slice(fim + 3);
  }

  texto = texto
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ");

  return texto.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
}

/**
 * Minutos de leitura a partir da contagem de palavras. Arredonda para cima
 * (convenção editorial: "3 min" cobre 2m30s) e nunca devolve menos de 1.
 */
export function tempoDeLeitura(palavras: number, ppm = PALAVRAS_POR_MINUTO): number {
  return Math.max(1, Math.ceil(palavras / ppm));
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

/**
 * "2026-06-16" → "16 de junho de 2026".
 * Monta a data a partir dos números da própria string, sem `new Date`, para não
 * depender do fuso do servidor de build — `new Date("2026-06-16")` é UTC e vira
 * dia 15 em qualquer fuso a oeste de Greenwich, incluindo o do Brasil.
 */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia || mes < 1 || mes > 12) {
    throw new Error(`Data inválida em artigo: "${iso}". Use o formato AAAA-MM-DD.`);
  }
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

/** O domínio da casa. Único — beorange.app. Qualquer outro host é link de fora. */
export const DOMINIO = "beorange.app";

/**
 * Decide, para um href, se o link é da casa ou de fora.
 *
 *   "casa"       — fica na mesma aba: o visitante está navegando dentro do site.
 *                  Cobre caminho absoluto (/blog/…), âncora (#secao), relativo (../)
 *                  e o endereço completo do próprio domínio.
 *   "protocolo"  — mailto:, tel:, whatsapp:. Quem abre é o sistema operacional,
 *                  não o navegador; target aqui não significa nada.
 *   "fora"       — qualquer outro host. Abre em aba nova.
 */
export function classificarHref(href: string): "casa" | "protocolo" | "fora" {
  const h = href.trim();
  if (!h) return "casa";
  if (/^(mailto|tel|sms|whatsapp):/i.test(h)) return "protocolo";
  if (/^(https?:)?\/\//i.test(h)) {
    const host = h.replace(/^(https?:)?\/\//i, "").split(/[/?#]/)[0].toLowerCase();
    return host === DOMINIO || host === `www.${DOMINIO}` ? "casa" : "fora";
  }
  return "casa"; // /caminho, #ancora, ../, caminho/relativo
}

/**
 * Aplica a regra de target aos links do corpo de um artigo, em build time.
 *
 * A regra, em uma linha: link da casa SUBSTITUI a aba, link de fora ABRE outra.
 *
 * Por que aqui e não no conteúdo: o corpo dos 149 artigos veio da migração do Framer com o
 * target decidido item a item, e decidido errado — dos 11 `target="_blank"` do acervo, 9
 * eram links internos (/blog/…) e só 2 apontavam para fora. Havia ainda 96 `rel="noopener"`
 * em links sem target nenhum, onde o atributo não faz absolutamente nada. Corrigir isso no
 * JSON seria corrigir uma vez; aqui a regra vale também para todo artigo que entrar depois,
 * sem depender de quem escreve lembrar dela.
 *
 * O que cada caso recebe:
 *   casa       → sem target; o rel de segurança sai (sem target ele é ruído)
 *   fora       → target="_blank" + rel="noopener noreferrer"
 *   protocolo  → intocado
 *
 * `noreferrer` junto de `noopener` é intencional: `noopener` fecha o acesso da página de
 * destino ao `window.opener`, e `noreferrer` impede que o endereço do artigo viaje no
 * cabeçalho Referer. Os dois são o par recomendado para link de saída.
 *
 * rel que o autor tenha escrito por um motivo — nofollow, sponsored, ugc — é preservado.
 */
export function normalizarLinks(html: string): string {
  const REL_SEGURANCA = new Set(["noopener", "noreferrer"]);

  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
    const href = attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
    if (href === undefined) return tag; // <a name="..."> antigo, sem destino

    const destino = classificarHref(href);
    if (destino === "protocolo") return tag;

    // tira target e rel para reescrever do zero, preservando o resto dos atributos
    let limpo = attrs
      .replace(/\s*\btarget\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\s*\brel\s*=\s*["'][^"']*["']/gi, "");

    const relAutor = (attrs.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1] ?? "")
      .split(/\s+/)
      .filter((t) => t && !REL_SEGURANCA.has(t.toLowerCase()));

    const rel = destino === "fora" ? [...relAutor, "noopener", "noreferrer"] : relAutor;
    const alvo = destino === "fora" ? ' target="_blank"' : "";
    const relAttr = rel.length ? ` rel="${[...new Set(rel)].join(" ")}"` : "";

    return `<a${limpo.trimEnd()}${alvo}${relAttr}>`;
  });
}
