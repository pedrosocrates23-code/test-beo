/**
 * Confere que TODA rota que o build gerou está na busca e no sitemap — e vice-versa.
 *
 * Este teste existe por um defeito concreto: as quatro páginas de calculadoras entraram no
 * sitemap e ficaram de fora do índice de busca, e a home nunca esteve nele. Cinco páginas
 * publicadas, encontráveis pelo Google e invisíveis para quem usava a lupa do próprio site.
 * Ninguém percebeu porque nada quebra — a página simplesmente não aparece.
 *
 * A fonte da verdade aqui é o `dist/`: o que o build realmente produziu, não o que alguém
 * lembrou de listar. Página nova sem entrada em src/lib/paginas.ts reprova aqui.
 *
 * O caminho contrário também reprova: entrada na lista sem página correspondente no dist
 * significa link morto na busca e URL 404 oferecida ao buscador no sitemap.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";

const DIST = "dist";

/** Toda pasta com index.html vira uma rota, no mesmo formato da lista: barra no fim. */
function rotasConstruidas(dir = DIST, prefixo = "") {
  const saida = [];
  if (existsSync(`${dir}/index.html`)) saida.push(prefixo === "" ? "/" : `${prefixo}/`);
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) saida.push(...rotasConstruidas(`${dir}/${e.name}`, `${prefixo}/${e.name}`));
  }
  return saida;
}

const todas = rotasConstruidas();
const artigos = new Set(todas.filter((r) => r.startsWith("/blog/") && r !== "/blog/"));
const fixas = new Set(todas.filter((r) => !artigos.has(r)));

// O índice de busca e o sitemap são lidos do build, não importados do fonte: é o arquivo que
// o visitante baixa e o que o buscador lê que precisam estar certos.
const indice = JSON.parse(readFileSync(`${DIST}/busca.json`, "utf8"));
const naBusca = new Set(indice.itens.map((i) => i.url));
const sitemap = readFileSync(`${DIST}/sitemap.xml`, "utf8");
const noSitemap = new Set(
  [...sitemap.matchAll(/<loc>https:\/\/beorange\.app([^<]*)<\/loc>/g)].map((m) => m[1]),
);

// Rotas deliberadamente fora dos dois. Mantido em sincronia com ROTAS_FORA de
// src/lib/paginas.ts — se divergir, os dois primeiros blocos abaixo acusam.
const FORA = new Set(["/blog/exemplo/"]);

const falhas = [];
const conferir = (rotulo, esperadas, presentes) => {
  for (const r of [...esperadas].sort()) {
    if (FORA.has(r)) {
      if (presentes.has(r)) falhas.push(`${rotulo}: ${r} deveria estar FORA e está presente`);
      continue;
    }
    if (!presentes.has(r)) falhas.push(`${rotulo}: ${r} existe no build e NÃO está lá`);
  }
  for (const r of [...presentes].sort()) {
    if (!esperadas.has(r)) falhas.push(`${rotulo}: ${r} está lá e NÃO existe no build`);
  }
};

const construidas = new Set([...fixas, ...artigos]);
conferir("busca", construidas, naBusca);
conferir("sitemap", construidas, noSitemap);

// Sem estes campos o item não monta: o overlay desenha ícone e título, navega por url e
// agrupa por grupo, e `busca` é o texto que o filtro varre.
for (const i of indice.itens) {
  for (const campo of ["titulo", "url", "grupo", "busca"]) {
    if (!i[campo] || !String(i[campo]).trim()) falhas.push(`busca: ${i.url} sem ${campo}`);
  }
}

// `resumo` é caso à parte e NÃO reprova. Ele não é desenhado em lugar nenhum — o resultado
// mostra só ícone e título (ver a função `filtrar` em BuscaOverlay.astro). O que ele faz é
// entrar no campo `busca`, então um resumo vazio não deixa buraco na interface: deixa o item
// com menos texto pesquisável, e só. Nas páginas fixas o campo é escrito à mão e está sempre
// lá; nos artigos ele é o `lead`, que 19 dos importados do Framer não trouxeram. Isso é falta
// de conteúdo a preencher, não defeito de código — fica como aviso para não virar ruído.
const semResumo = indice.itens.filter((i) => !i.resumo || !String(i.resumo).trim());
if (semResumo.length) {
  console.log(`\nAVISO: ${semResumo.length} item(ns) sem resumo — buscáveis só pelo título e pela categoria:`);
  for (const i of semResumo) console.log(`  - ${i.url}`);
}

console.log(`rotas no build: ${construidas.size}  (fixas ${fixas.size} + artigos ${artigos.size})`);
console.log(`no indice de busca: ${naBusca.size}   |   no sitemap: ${noSitemap.size}`);
console.log(`fora dos dois, de proposito: ${[...FORA].join(", ")}`);

const grupos = new Map();
for (const i of indice.itens) grupos.set(i.grupo, (grupos.get(i.grupo) ?? 0) + 1);
const paginas = indice.itens.filter((i) => i.tipo === "pagina");
console.log(`\npaginas fixas indexadas: ${paginas.length}, em ${new Set(paginas.map((p) => p.grupo)).size} grupos`);
for (const g of [...new Set(paginas.map((p) => p.grupo))]) {
  console.log(`  ${g.padEnd(16)} ${paginas.filter((p) => p.grupo === g).map((p) => p.url).join(", ")}`);
}

if (falhas.length) {
  console.log(`\nFALHOU — ${falhas.length} divergencia(s):`);
  for (const f of falhas) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\nPASSOU — busca e sitemap cobrem exatamente as rotas que o build gerou.");
