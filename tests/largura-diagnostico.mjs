/** Desce do elemento que estoura ate a FOLHA que exige a largura, perguntando ao proprio
 *  navegador qual e a largura minima de cada candidato (width:min-content). */
import { chromium } from "playwright";
// Precisa de um servidor servindo dist/. O jeito rapido:  npx http-server dist -p 4325 -c-1
const BASE = process.env.BASE ?? "http://127.0.0.1:4325";
const LARG = Number(process.env.W ?? 320);
const rotas = process.argv.slice(2);
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport:{width:LARG,height:780}, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
const p = await ctx.newPage();
for (const rota of rotas) {
  await p.goto(BASE + rota, { waitUntil:"load" });
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate((LARG) => {
    const minC = (el) => { const a = el.style.width, b = el.style.maxWidth;
      el.style.width = "min-content"; el.style.maxWidth = "none";
      const v = el.getBoundingClientRect().width;
      el.style.width = a; el.style.maxWidth = b; return Math.round(v); };
    const nome = (el) => el.tagName.toLowerCase() + (el.className ? "." + (el.className.baseVal ?? el.className).toString().trim().split(/\s+/).join(".") : "");
    const doc = document.scrollingElement;
    const lim = doc.clientWidth;
    if (doc.scrollWidth <= lim) return { ok: true };

    // topo: o elemento mais externo que ultrapassa
    const acusados = [];
    const vistos = new Set();
    for (const el of document.querySelectorAll("body *")) {
      const b = el.getBoundingClientRect();
      if (!b.width && !b.height) continue;
      if (Math.max(b.right - lim, -b.left) <= 1) continue;
      let pai = el.parentElement, coberto = false;
      while (pai) { if (vistos.has(pai)) { coberto = true; break; } pai = pai.parentElement; }
      vistos.add(el);
      if (coberto || getComputedStyle(el).position === "fixed") continue;
      // desce ate a folha
      const trilha = [];
      let atual = el;
      for (let i = 0; i < 12; i++) {
        trilha.push({ n: nome(atual).slice(0, 52), min: minC(atual),
                      pad: getComputedStyle(atual).padding, ws: getComputedStyle(atual).whiteSpace });
        const filhos = [...atual.children].filter((c) => c.getBoundingClientRect().width || c.getBoundingClientRect().height);
        if (!filhos.length) break;
        const pior = filhos.reduce((a, c) => (minC(c) > minC(a) ? c : a));
        if (minC(pior) < minC(atual) * 0.55) break;
        atual = pior;
      }
      acusados.push({ raiz: nome(el).slice(0, 52), passa: Math.round(Math.max(b.right - lim, -b.left)), trilha });
    }
    return { lim, estouro: doc.scrollWidth - lim, acusados: acusados.sort((a,b)=>b.passa-a.passa).slice(0, 4) };
  }, LARG);
  console.log(`\n### ${rota}  @${LARG}px`);
  if (r.ok) { console.log("  sem estouro"); continue; }
  console.log(`  estoura ${r.estouro}px`);
  for (const a of r.acusados) {
    console.log(`  +${a.passa}px  ${a.raiz}`);
    a.trilha.forEach((t, i) => console.log(`      ${"  ".repeat(i)}${t.n}  min=${t.min}px  pad=${t.pad}  ${t.ws!=="normal"?t.ws:""}`));
  }
}
await nav.close();
