/**
 * Confere o DESTINO DA ABA de cada link do corpo dos artigos, no build.
 *
 * A regra, em uma linha: link da casa SUBSTITUI a aba, link de fora ABRE outra.
 *
 * Existe porque o acervo migrado do Framer trazia o target decidido item a item, e decidido
 * errado: dos 11 `target="_blank"` dos 149 artigos, 9 eram links INTERNOS (/blog/...) e só 2
 * apontavam para fora. Havia ainda 96 `rel="noopener"` em links sem target nenhum, onde o
 * atributo não faz nada. Quem aplica a regra é normalizarLinks(), em src/lib/artigo.ts, no
 * build — e é justamente por ser invisível no conteúdo que ela precisa de uma trava: se
 * alguém remover a chamada em [slug].astro, nada quebra na tela e o site volta a abrir aba
 * nova para link interno sem ninguém perceber.
 *
 * O que é defeito aqui:
 *   - link da casa com target="_blank"        (rouba a navegação do visitante)
 *   - link de fora sem target="_blank"        (tira o visitante do artigo)
 *   - link de fora sem rel="noopener noreferrer" (window.opener aberto e Referer vazando)
 *   - href vazio ou só "#"                    (link que não leva a lugar nenhum)
 *
 * Roda depois do build:  npm run test:links
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const DOMINIO = "beorange.app";

/** Mesma classificação de src/lib/artigo.ts, reescrita aqui de propósito: um teste que
 *  importa a função que ele testa só confere que ela é igual a si mesma. */
const ehDaCasa = (href) => {
  const h = href.trim();
  if (/^(mailto|tel|sms|whatsapp):/i.test(h)) return null; // protocolo: não se aplica
  if (/^(https?:)?\/\//i.test(h)) {
    const host = h.replace(/^(https?:)?\/\//i, "").split(/[/?#]/)[0].toLowerCase();
    return host === DOMINIO || host === `www.${DOMINIO}`;
  }
  return true;
};

const artigos = readdirSync("dist/blog", { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join("dist/blog", e.name, "index.html")))
  .map((e) => [e.name, join("dist/blog", e.name, "index.html")]);

if (artigos.length === 0) {
  console.log("Nenhum artigo em dist/blog/. Rode `npm run build` antes.");
  process.exit(1);
}

const defeitos = [];
let casa = 0;
let fora = 0;
const hosts = new Map();

for (const [slug, arquivo] of artigos) {
  const { document } = new JSDOM(readFileSync(arquivo, "utf8")).window;
  const corpo = document.querySelector(".prose");
  if (!corpo) continue;

  for (const a of corpo.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    const rel = (a.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
    const blank = a.getAttribute("target") === "_blank";
    const texto = (a.textContent ?? "").trim().slice(0, 40);

    if (!href || href === "#") {
      defeitos.push({ tipo: "href vazio", slug, href, texto });
      continue;
    }

    const daCasa = ehDaCasa(href);
    if (daCasa === null) continue;

    if (daCasa) {
      casa++;
      if (blank) defeitos.push({ tipo: "link da casa abrindo aba nova", slug, href, texto });
    } else {
      fora++;
      const host = href.replace(/^(https?:)?\/\//i, "").split(/[/?#]/)[0];
      hosts.set(host, (hosts.get(host) ?? 0) + 1);
      if (!blank) {
        defeitos.push({ tipo: "link de fora sem aba nova", slug, href, texto });
      } else if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
        defeitos.push({ tipo: "link de fora sem rel de seguranca", slug, href, texto });
      }
    }
  }
}

console.log(`${artigos.length} artigos varridos`);
console.log(`  ${String(casa).padStart(4)} links da casa   — mesma aba`);
console.log(`  ${String(fora).padStart(4)} links de fora   — aba nova + rel="noopener noreferrer"`);
console.log(`  ${String(hosts.size).padStart(4)} hosts externos distintos\n`);

if (defeitos.length) {
  const porTipo = new Map();
  for (const d of defeitos) porTipo.set(d.tipo, [...(porTipo.get(d.tipo) ?? []), d]);
  for (const [tipo, lista] of porTipo) {
    console.log(`${lista.length}x  ${tipo}`);
    for (const d of lista.slice(0, 8)) {
      console.log(`      ${d.href.slice(0, 68)}`);
      console.log(`      "${d.texto}"  em /blog/${d.slug}/`);
    }
    if (lista.length > 8) console.log(`      … e mais ${lista.length - 8}`);
    console.log();
  }
}

console.log(`${defeitos.length === 0 ? "OK" : "FALHA"}: ${casa + fora} links, ${defeitos.length} defeitos`);
process.exit(defeitos.length === 0 ? 0 : 1);
