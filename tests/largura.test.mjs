/**
 * Mede, num Chromium de verdade, duas coisas que nenhum parser de CSS responde:
 *
 *   1. se a pagina rola para o lado em cada largura de celular, e QUAL elemento causa;
 *   2. se a capa de cada artigo realmente chega e pinta.
 *
 * O culpado nao e o elemento mais largo: e o mais EXTERNO que ultrapassa a borda. Um filho
 * estourado dentro de um pai estourado aparece nos dois, e listar os dois esconde a causa.
 * Por isso o script descarta todo elemento cujo ancestral ja foi acusado.
 */
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";

// Servidor proprio, para `npm run test:largura` nao depender de nada estar de pe. So le
// dentro de dist/ e so sobe enquanto o teste roda.
const TIPOS = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".json":"application/json",
  ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp",
  ".woff2":"font/woff2", ".ico":"image/x-icon", ".xml":"application/xml", ".txt":"text/plain" };
const servidor = createServer(async (req, res) => {
  try {
    let caminho = decodeURIComponent(req.url.split("?")[0]);
    if (caminho.endsWith("/")) caminho += "index.html";
    const arquivo = join("dist", normalize(caminho).split("..").join(""));
    const dados = readFileSync(arquivo);
    res.writeHead(200, { "Content-Type": TIPOS[extname(arquivo)] ?? "application/octet-stream" });
    res.end(dados);
  } catch { res.writeHead(404); res.end("nao encontrado"); }
});
await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;
const LARGURAS = [320, 360, 375, 390, 412, 430];

// Rotas: as 25 fixas em todas as larguras; os artigos, todos, na largura mais apertada.
const rotasDe = (dir, prefixo = "") => {
  const saida = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = `${dir}/${e.name}`;
    if (existsSync(`${p}/index.html`)) saida.push(`${prefixo}/${e.name}/`);
    saida.push(...rotasDe(p, `${prefixo}/${e.name}`));
  }
  return saida;
};
const todas = ["/", ...rotasDe("dist")];
const artigos = todas.filter((r) => r.startsWith("/blog/") && r !== "/blog/");
const fixas = todas.filter((r) => !artigos.includes(r));
const amostraArtigos = artigos.filter((_, i) => i % Math.ceil(artigos.length / 8) === 0).slice(0, 8);

const plano = [
  ...fixas.flatMap((r) => LARGURAS.map((w) => [r, w])),
  ...amostraArtigos.flatMap((r) => LARGURAS.map((w) => [r, w])),
  ...artigos.filter((r) => !amostraArtigos.includes(r)).map((r) => [r, 320]),
];

console.log(`${fixas.length} rotas fixas x ${LARGURAS.length} larguras`);
console.log(`${amostraArtigos.length} artigos x ${LARGURAS.length} larguras`);
console.log(`${artigos.length - amostraArtigos.length} artigos restantes so a 320px`);
console.log(`${plano.length} medicoes\n`);

const MEDIR = () => {
  const doc = document.scrollingElement;
  const limite = doc.clientWidth;
  const estouro = doc.scrollWidth - limite;

  const culpados = [];
  if (estouro > 0) {
    const acusados = new Set();
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const passa = Math.max(r.right - limite, -r.left);
      if (passa <= 1) continue;
      let pai = el.parentElement, jaCoberto = false;
      while (pai) { if (acusados.has(pai)) { jaCoberto = true; break; } pai = pai.parentElement; }
      acusados.add(el);
      if (jaCoberto) continue;
      const cs = getComputedStyle(el);
      culpados.push({
        tag: el.tagName.toLowerCase(),
        classe: (el.className?.baseVal ?? el.className ?? "").toString().trim().slice(0, 70),
        passa: Math.round(passa),
        largura: Math.round(r.width),
        esquerda: Math.round(r.left),
        pistas: [
          cs.position !== "static" ? `position:${cs.position}` : "",
          cs.whiteSpace === "nowrap" ? "nowrap" : "",
          cs.minWidth !== "0px" && cs.minWidth !== "auto" ? `min-width:${cs.minWidth}` : "",
          cs.width === `${Math.round(r.width)}px` && cs.flexShrink === "0" ? "flex-shrink:0" : "",
          el.scrollWidth > el.clientWidth + 1 ? "conteudo maior que a caixa" : "",
        ].filter(Boolean).join(" "),
        texto: (el.textContent || "").trim().slice(0, 45),
      });
    }
  }

  // capa do artigo: pintou?
  const capa = document.querySelector(".feature .img");
  let imagem = null;
  if (capa) {
    const bg = getComputedStyle(capa).backgroundImage;
    const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
    imagem = { url: m ? m[1] : null, altura: Math.round(capa.getBoundingClientRect().height) };
  }
  return { estouro, limite, culpados: culpados.sort((a, b) => b.passa - a.passa).slice(0, 6), imagem };
};

const navegador = await chromium.launch();
const achados = [], imagens = [], erros = [];

for (const w of [...new Set(plano.map(([, w]) => w))]) {
  const ctx = await navegador.newContext({
    viewport: { width: w, height: 780 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153 Mobile Safari/537.36",
  });
  const pag = await ctx.newPage();
  const falhas = [];
  pag.on("response", (r) => { if (r.status() >= 400) falhas.push(`${r.status()} ${r.url().replace(BASE, "")}`); });
  pag.on("pageerror", (e) => erros.push(`JS ${e.message.slice(0, 80)}`));

  const rotas = plano.filter(([, lw]) => lw === w).map(([r]) => r);
  let n = 0;
  for (const rota of rotas) {
    falhas.length = 0;
    try {
      await pag.goto(BASE + rota, { waitUntil: "load", timeout: 30000 });
      await pag.evaluate(() => document.fonts.ready);
      const r = await pag.evaluate(MEDIR);
      if (r.estouro > 0) achados.push({ rota, largura: w, ...r });
      if (r.imagem) imagens.push({ rota, largura: w, ...r.imagem, falhas: [...falhas] });
      else if (falhas.length) erros.push(`${rota} @${w}: ${falhas.join(", ")}`);
    } catch (e) {
      erros.push(`${rota} @${w}: ${e.message.split("\n")[0].slice(0, 70)}`);
    }
    if (++n % 40 === 0) process.stdout.write(`  ${w}px: ${n}/${rotas.length}\n`);
  }
  console.log(`${w}px: ${rotas.length} rotas medidas`);
  await ctx.close();
}
// ---------------------------------------------------------------- desktop nao regrediu
// As correcoes de celular vivem todas dentro de @media(max-width:...), mas uma delas mexe no
// desktop de proposito (a trilha minmax(0,1fr) do artigo). Esta passagem confirma que o
// desktop continua sem estouro e com a capa no tamanho cheio.
const amostraDesktop = [...fixas, ...artigos.slice(0, 6)];
const desktop = [];
for (const w of [1280, 1440]) {
  const ctx = await navegador.newContext({ viewport: { width: w, height: 900 } });
  const pag = await ctx.newPage();
  for (const rota of amostraDesktop) {
    try {
      await pag.goto(BASE + rota, { waitUntil: "load", timeout: 30000 });
      await pag.evaluate(() => document.fonts.ready);
      const r = await pag.evaluate(() => {
        const d = document.scrollingElement, f = document.querySelector(".feature .img");
        return { over: d.scrollWidth - d.clientWidth, capa: f ? Math.round(f.getBoundingClientRect().height) : null };
      });
      if (r.over > 0) desktop.push(`${rota} @${w}px estoura ${r.over}px`);
      if (r.capa !== null && r.capa < 100) desktop.push(`${rota} @${w}px capa com ${r.capa}px`);
    } catch (e) { erros.push(`desktop ${rota} @${w}: ${e.message.split(String.fromCharCode(10))[0].slice(0, 60)}`); }
  }
  await ctx.close();
}
console.log(`\ndesktop (1280 e 1440px): ${amostraDesktop.length * 2} medicoes, ${desktop.length} problemas`);
desktop.forEach((d) => console.log("  " + d));

await navegador.close();

writeFileSync(process.env.SAIDA ?? "achados.json", JSON.stringify({ achados, imagens, erros }, null, 1));
console.log(`\n=== SCROLL LATERAL: ${achados.length} medicoes com estouro ===`);
const porRota = {};
for (const a of achados) (porRota[a.rota] ??= []).push(a);
for (const [rota, lista] of Object.entries(porRota)) {
  console.log(`\n${rota}`);
  for (const a of lista) {
    console.log(`  ${a.largura}px  estoura ${a.estouro}px`);
    for (const c of a.culpados)
      console.log(`      +${c.passa}px  ${c.tag}.${c.classe || "(sem classe)"}  larg ${c.largura} esq ${c.esquerda}  ${c.pistas}  "${c.texto}"`);
  }
}
if (!achados.length) console.log("nenhuma rota rolou para o lado");

console.log(`\n=== CAPA DOS ARTIGOS: ${imagens.length} medicoes ===`);
const semCapa = imagens.filter((i) => !i.url || i.url === "none" || i.altura < 20 || i.falhas.length);
console.log(`sem capa ou com falha de rede: ${semCapa.length}`);
for (const i of semCapa.slice(0, 15)) console.log(`  ${i.rota} @${i.largura}px  altura ${i.altura}  ${i.falhas.join(",")}  ${i.url}`);
if (erros.length) { console.log(`\n=== ERROS: ${erros.length} ===`); erros.slice(0, 15).forEach((e) => console.log("  " + e)); }

servidor.close();

const problemas = achados.length + semCapa.length + desktop.length + erros.length;
console.log(`\n${problemas === 0 ? "OK" : "FALHA"}: ${plano.length + amostraDesktop.length * 2} medicoes, ${problemas} problemas`);
process.exit(problemas === 0 ? 0 : 1);
