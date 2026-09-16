/**
 * Procura texto que NAO DA PARA LER: compara a cor de cada texto com o fundo real (sobe a
 * arvore ate achar um fundo opaco) e calcula a razao de contraste da WCAG.
 *
 * Nasceu de um bug que nao parecia um bug de cor: 29 titulos de cartao, em 14 paginas,
 * saiam brancos sobre cartao branco. Na tela aquilo lia como um buraco de espacamento entre
 * a etiqueta e a lista — foi assim que foi reportado. Nenhuma leitura de CSS pega isso,
 * porque a regra culpada (`section.dark h3{color:#fff}`) esta correta para o resto da secao.
 *
 * O corte e 2:1 de proposito. Nao e um teste de acessibilidade — abaixo de 2:1 o texto
 * praticamente sumiu, e isso e defeito sem discussao. A régua da WCAG para leitura (4,5:1)
 * acusaria coisas decorativas e viraria ruido.
 */
import { chromium } from "playwright";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
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
const rotasDe = (d, p = "") => { const s = [];
  for (const e of readdirSync(d, { withFileTypes: true })) { if (!e.isDirectory()) continue;
    const q = `${d}/${e.name}`; if (existsSync(`${q}/index.html`)) s.push(`${p}/${e.name}/`);
    s.push(...rotasDe(q, `${p}/${e.name}`)); } return s; };
const todas = ["/", ...rotasDe("dist")];
const artigos = todas.filter((r) => r.startsWith("/blog/") && r !== "/blog/");
const rotas = [...todas.filter((r) => !artigos.includes(r)), ...artigos.slice(0, 4)];

const VARRER = () => {
  const lum = (c) => { const [r,g,b] = c.map((v) => { v /= 255; return v <= .03928 ? v/12.92 : ((v+.055)/1.055)**2.4; });
    return .2126*r + .7152*g + .0722*b; };
  const rgb = (s) => { const m = s.match(/[\d.]+/g); return m ? m.slice(0,3).map(Number) : null; };
  const alpha = (s) => { const m = s.match(/[\d.]+/g); return m && m.length > 3 ? Number(m[3]) : 1; };
  const fundo = (el) => { let n = el;
    while (n && n !== document.documentElement) { const cs = getComputedStyle(n);
      if (alpha(cs.backgroundColor) > .5) return rgb(cs.backgroundColor);
      if (cs.backgroundImage !== "none") return null;   // gradiente/foto: nao da para julgar
      n = n.parentElement; }
    return [255,255,255]; };
  const saida = [];
  for (const el of document.querySelectorAll("body *")) {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (!txt) continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || Number(cs.opacity) < .1) continue;
    const f = fundo(el); if (!f) continue;
    const c = rgb(cs.webkitTextFillColor !== "rgba(0, 0, 0, 0)" ? cs.webkitTextFillColor : cs.color);
    if (!c) continue;
    const l1 = lum(c), l2 = lum(f);
    const razao = (Math.max(l1,l2) + .05) / (Math.min(l1,l2) + .05);
    if (razao < 2) saida.push({ tag: el.tagName.toLowerCase(), cls:(el.className||"").toString().slice(0,34),
      cor: cs.color, fundo: `rgb(${f.join(",")})`, razao: Math.round(razao*100)/100, txt: txt.slice(0, 46) });
  }
  return saida;
};

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport:{width:1440,height:900} });
const p = await ctx.newPage();
const tudo = [];
for (const rota of rotas) {
  await p.goto(BASE + rota, { waitUntil:"load" });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => { document.querySelectorAll(".rv").forEach((e) => e.classList.add("in")); });
  await p.waitForTimeout(150);
  const r = await p.evaluate(VARRER);
  for (const x of r) tudo.push({ rota, ...x });
}
await nav.close();
console.log(`${rotas.length} rotas varridas, ${tudo.length} textos com contraste abaixo de 2:1\n`);
const vistos = new Set();
for (const t of tudo) {
  const k = `${t.tag}.${t.cls}|${t.cor}|${t.fundo}`;
  if (vistos.has(k)) continue; vistos.add(k);
  const n = tudo.filter((x) => `${x.tag}.${x.cls}|${x.cor}|${x.fundo}` === k).length;
  console.log(`${String(n).padStart(3)}x  razao ${t.razao}  ${t.tag}.${t.cls}`);
  console.log(`      cor ${t.cor} sobre ${t.fundo}   ${t.rota}`);
  console.log(`      "${t.txt}"`);
}

servidor.close();
console.log(`
${tudo.length === 0 ? "OK" : "FALHA"}: ${rotas.length} rotas, ${tudo.length} textos ilegiveis`);
process.exit(tudo.length === 0 ? 0 : 1);
