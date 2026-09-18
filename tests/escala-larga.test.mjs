/**
 * Trava o comportamento de src/styles/escala-larga.css num Chromium de verdade.
 *
 * Três coisas que nenhum parser de CSS responde, e que a spec do CSSWG não define:
 *
 *   1. a foto do hero da home chega às duas bordas da tela num monitor largo?
 *      A prova é por pixel, não por cálculo: o hero é capturado duas vezes na mesma
 *      largura — uma normal e outra com `--hero-photo:none`, que deixa só o gradiente
 *      de fundo. Onde as duas capturas são idênticas em toda a coluna, a foto não
 *      pinta: é sobra lateral. Medir pela altura do hero vezes a proporção do arquivo
 *      daria o mesmo número hoje e mentiria no dia em que o `background-size` mudasse.
 *
 *   2. o zoom estoura alguma página para o lado? `vw` não é compensado pelo zoom, então
 *      um `100vw` cru que hoje não existe passaria a rolar a página na horizontal.
 *
 *   3. o header, que é `position:fixed`, continua com a largura exata da janela?
 *
 * E o contrário também: abaixo de 2100px nada pode ter mudado.
 */
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { chromium } from "playwright";

const TIPOS = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".json":"application/json",
  ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp",
  ".woff2":"font/woff2", ".ico":"image/x-icon", ".xml":"application/xml", ".txt":"text/plain" };
const servidor = createServer((req, res) => {
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

// O breakpoint e o alvo moram no CSS; repetidos aqui para que o teste falhe se um mudar
// sem o outro. A largura de 1920 é o controle: abaixo do breakpoint, zoom obrigatoriamente 1.
const ALVO = 2100;
const LARGURAS_LARGAS = [2100, 2304, 2560, 3440, 3840];
const LARGURA_CONTROLE = 1920;

// Telas em que a foto precisa alcançar as duas bordas. Além das larguras grandes, entram as
// janelas LARGAS E BAIXAS: o aperto do hero em prototype-home.css encolhe a foto junto, e a
// 1920x744 isso chegou a reabrir 49px de sobra. Sem um caso baixo aqui, aquela regressão
// passaria batida.
const TELAS_FOTO = [
  [LARGURA_CONTROLE, 1440], [2100, 1440], [2304, 1440], [2560, 1440], [3440, 1440], [3840, 1440],
  [1920, 744], [1920, 800], [2100, 744], [2560, 744], [2560, 900], [3440, 900],
];

// Tablets deitados, onde o hero da home passava da dobra (112% da tela no iPad mini). O teto
// é 100%: acima disso os dois CTAs e a faixa de selos ficam abaixo da linha d'água numa tela
// que não dá nenhum sinal de que exista mais coisa.
// As duas últimas são o controle do desktop: o aperto não pode encostar nelas.
const TELAS_DOBRA = [
  ["iPad mini paisagem",   1133,  744], ["Galaxy Tab paisagem", 1280,  800],
  ["iPad Pro 11 paisagem", 1194,  834], ["iPad Pro 13 paisagem", 1366, 1024],
  ["iPad Pro 11 retrato",   834, 1194], ["iPad mini retrato",     744, 1133],
  ["Surface Pro paisagem", 1368,  912],
  ["desktop 1440x900",     1440,  900], ["desktop 1920x1080",    1920, 1080],
  // Telas sob zoom. Só fazem sentido nesta lista depois que a medida passou a ser a altura
  // pintada: com `offsetHeight` elas apareceriam com 71% e 58% em vez dos 71% e 95% reais.
  ["monitor 27pol 2560",   2560, 1440], ["ultrawide 3440",       3440, 1440],
];
/** Altura do hero da home a 1440x900, em px. É o desenho do Figma e não pode mudar: serve de
 *  âncora para provar que o aperto do tablet e a escala do monitor largo não vazam para o
 *  desktop. Se o texto do hero mudar, este número muda junto — de propósito. */
const HERO_DESKTOP = 839;

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
// Rotas fixas em todas as larguras; do blog basta uma amostra — o template é um só.
const rotas = [...todas.filter((r) => !artigos.includes(r)), ...artigos.slice(0, 3)];

const navegador = await chromium.launch();
const falhas = [];

/** Colunas em que as duas capturas diferem — ou seja, em que a foto pinta. */
async function extensaoDaFoto(pagina, largura) {
  const faixa = await pagina.evaluate(() => {
    const r = document.querySelector(".hero").getBoundingClientRect();
    // Uma faixa fina a 25% da altura do hero: já passou do header e ainda é foto.
    return { x: 0, y: Math.round(r.top + r.height * 0.25), width: Math.round(r.width), height: 24 };
  });
  const capturar = async (semFoto) => {
    const marca = semFoto
      ? await pagina.addStyleTag({ content: ".hero{--hero-photo:none!important}.hero .wrap{visibility:hidden!important}" })
      : await pagina.addStyleTag({ content: ".hero .wrap{visibility:hidden!important}" });
    await pagina.waitForTimeout(120);
    const buf = await pagina.screenshot({ clip: faixa });
    await marca.evaluate((n) => n.remove());
    return buf.toString("base64");
  };
  const comFoto = await capturar(false);
  const soFundo = await capturar(true);
  return await pagina.evaluate(async ([a, b]) => {
    const ler = async (b64) => {
      const bm = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(bm.width, bm.height);
      c.getContext("2d").drawImage(bm, 0, 0);
      return { d: c.getContext("2d").getImageData(0, 0, bm.width, bm.height).data, w: bm.width, h: bm.height };
    };
    const A = await ler(a), B = await ler(b);
    let ini = -1, fim = -1;
    for (let x = 0; x < A.w; x++) {
      let difere = false;
      for (let y = 0; y < A.h && !difere; y++) {
        const i = (y * A.w + x) * 4;
        if (Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i+1] - B.d[i+1]) + Math.abs(A.d[i+2] - B.d[i+2]) > 2) difere = true;
      }
      if (difere) { if (ini < 0) ini = x; fim = x; }
    }
    return { ini, fim, largura: A.w };
  }, [comFoto, soFundo]);
}

// ---------------------------------------------------------------- 1. cobertura da foto
console.log("1. FOTO DO HERO — sobra lateral na home\n");
console.log("viewport   | zoom  | foto de..ate    | sobra esq | sobra dir | veredito");
for (const [w, h] of TELAS_FOTO) {
  const pag = await navegador.newPage({ viewport: { width: w, height: h } });
  await pag.goto(`${BASE}/`, { waitUntil: "load" });
  await pag.waitForTimeout(150);
  const zoom = await pag.evaluate(() => parseFloat(getComputedStyle(document.documentElement).zoom) || 1);
  const { ini, fim } = await extensaoDaFoto(pag, w);
  const esq = ini, dir = w - 1 - fim;
  const ok = ini === 0 && fim === w - 1;
  if (!ok) falhas.push(`${w}x${h}: foto deixa ${esq}px de sobra à esquerda e ${dir}px à direita`);
  if (w < ALVO && zoom !== 1) falhas.push(`${w}x${h}: zoom deveria ser 1 abaixo de ${ALVO}px, veio ${zoom}`);
  if (w > ALVO && zoom <= 1) falhas.push(`${w}x${h}: zoom deveria ser > 1 acima de ${ALVO}px, veio ${zoom}`);
  console.log(`${String(w).padStart(4)}x${String(h).padStart(4)} | ${zoom.toFixed(3)} | ${String(ini).padStart(5)}..${String(fim).padEnd(7)} | ` +
    `${String(esq).padStart(9)} | ${String(dir).padStart(9)} | ${ok ? "cobre" : "SOBRA"}`);
  await pag.close();
}

// ------------------------------------------------------- 1b. o hero cabe na dobra?
console.log("\n1b. HERO DA HOME NA DOBRA — tablet deitado e controle de desktop\n");
console.log("tela".padEnd(22) + "| viewport  | hero  | % da tela | veredito");
for (const [nome, w, h] of TELAS_DOBRA) {
  const pag = await navegador.newPage({ viewport: { width: w, height: h } });
  await pag.goto(`${BASE}/`, { waitUntil: "load" });
  await pag.waitForTimeout(80);
  // ALTURA PINTADA, não `offsetHeight`. A pergunta aqui é quanto da JANELA o hero ocupa, e a
  // janela se mede em pixels de tela. Sob `zoom`, `offsetHeight` continua em px CSS, sem a
  // escala — dividi-lo pela altura real da janela mistura dois espaços e devolve um número
  // otimista na exata proporção do zoom. Com as telas de hoje dá no mesmo, porque todas estão
  // abaixo do limiar de 2100px e rodam com zoom 1; o erro só apareceria quando alguém
  // acrescentasse uma tela larga à lista, que é quando ninguém está olhando.
  // `getBoundingClientRect().height` já vem escalada e é a medida certa dos dois lados.
  const hero = await pag.evaluate(() => {
    const e = document.querySelector(".hero");
    return { pintada: e.getBoundingClientRect().height, css: e.offsetHeight };
  });
  const pct = (hero.pintada / h) * 100;
  let veredito = "cabe";
  if (pct > 100) { falhas.push(`${nome} (${w}x${h}): hero ocupa ${pct.toFixed(0)}% da tela`); veredito = "PASSA DA DOBRA"; }
  // O desktop de referência é âncora: o aperto do tablet não pode encostar nele. A conferência
  // é em px CSS, que é o espaço em que o valor do desenho (839px) foi medido.
  if (w === 1440 && h === 900 && hero.css !== HERO_DESKTOP) {
    falhas.push(`1440x900: hero deveria continuar com ${HERO_DESKTOP}px e veio com ${hero.css}px`);
    veredito = "DESKTOP MUDOU";
  }
  console.log(nome.padEnd(22) + `| ${String(w).padStart(4)}x${String(h).padStart(4)} | ${hero.pintada.toFixed(0).padStart(4)}px | ` +
    `${pct.toFixed(0).padStart(8)}% | ${veredito}`);
  await pag.close();
}

// ------------------------------------------------- 2 e 3. estouro horizontal e header
console.log(`\n2. ESTOURO HORIZONTAL E HEADER — ${rotas.length} rotas x ${LARGURAS_LARGAS.length} larguras\n`);
let medidas = 0;
for (const w of LARGURAS_LARGAS) {
  for (const rota of rotas) {
    const pag = await navegador.newPage({ viewport: { width: w, height: 1440 } });
    await pag.goto(`${BASE}${rota}`, { waitUntil: "load" });
    await pag.waitForTimeout(40);
    const m = await pag.evaluate(() => {
      const de = document.documentElement;
      const hd = document.querySelector("header.site");
      return { estouro: de.scrollWidth - de.clientWidth, headerW: hd ? hd.getBoundingClientRect().width : null };
    });
    if (m.estouro > 0) falhas.push(`${rota} a ${w}px: rola ${m.estouro}px para o lado`);
    if (m.headerW !== null && Math.abs(m.headerW - w) > 2) falhas.push(`${rota} a ${w}px: header com ${m.headerW}px, esperado ${w}px`);
    medidas++;
    await pag.close();
  }
}
console.log(`${medidas} medições, nenhuma pendente.`);

await navegador.close();
servidor.close();

if (falhas.length) {
  console.log(`\nFALHOU — ${falhas.length} problema(s):`);
  for (const f of falhas) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\nPASSOU — a foto cobre a largura em todas as telas medidas, nenhuma página rola para o lado.");
