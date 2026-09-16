/**
 * Testa o comportamento do filtro da busca num DOM de verdade (jsdom), em vez de conferir
 * o código lendo.
 *
 * O bug que motivou isto era invisível na leitura: o menu abria e fechava no MESMO clique,
 * porque o handler de "clique fora" comparava `e.target !== botaoFiltro` e o alvo real é o
 * <span> dentro do botão. Só um teste que clica de fato pega isso.
 *
 * Roda depois do build:  npm run build && npm run test:busca
 */
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";

const html = readFileSync("dist/index.html", "utf8");
const indice = JSON.parse(readFileSync("dist/busca.json", "utf8"));

const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom;
const { document } = window;

// <dialog> não é implementado pelo jsdom: mínimo necessário para o script funcionar.
const dialogo = document.getElementById("busca");
dialogo.showModal = function () { this.open = true; };
dialogo.close = function () { this.open = false; this.dispatchEvent(new window.Event("close")); };

window.matchMedia = (q) => ({ matches: /min-width:\s*881px/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
window.fetch = async () => ({ json: async () => indice });
window.scrollTo = () => {};
// jsdom não implementa scrollIntoView; a navegação por teclado chama isso.
window.Element.prototype.scrollIntoView = function () {};

// injeta o script do componente, extraído do bundle
const bundles = readFileSync("dist/index.html", "utf8").match(/src="(\/_astro\/[^"]+\.js)"/g) ?? [];
let script = "";
for (const b of bundles) {
  const caminho = "dist" + b.match(/\/_astro\/[^"]+\.js/)[0];
  const conteudo = readFileSync(caminho, "utf8");
  if (conteudo.includes("busca-filtro")) script = conteudo;
}
if (!script) { console.log("NAO ACHEI o script da busca nos bundles"); process.exit(1); }

const fn = new window.Function(script);
fn.call(window);

const campo = document.getElementById("busca-campo");
const botaoFiltro = document.getElementById("busca-filtro");
const nomeFiltro = document.getElementById("busca-filtro-nome");
const menu = document.getElementById("busca-menu");
const lista = document.getElementById("busca-resultados");
const contagem = document.getElementById("busca-contagem");

const clicar = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
const digitar = (t) => { campo.value = t; campo.dispatchEvent(new window.Event("input", { bubbles: true })); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const resultados = [];
const checar = (nome, ok, extra = "") => {
  resultados.push(ok);
  console.log(`  ${ok ? "ok  " : "FALHA"}  ${nome}${extra ? "  — " + extra : ""}`);
};

const main = async () => {
  console.log("abrindo a busca pela lupa do header");
  clicar(document.querySelector('[aria-label="Buscar"]'));
  await espera(50);
  checar("o diálogo abre", dialogo.open === true);
  checar("o índice foi carregado", menu.children.length > 0, `${menu.children.length} opções no filtro`);

  console.log("\nabrindo o menu do filtro pelo TEXTO do botão (o caso do bug)");
  clicar(nomeFiltro);                       // clique no <span>, não no <button>
  await espera(10);
  checar("o menu ABRE ao clicar no texto", menu.hidden === false);
  checar('aria-expanded vira "true"', botaoFiltro.getAttribute("aria-expanded") === "true");

  console.log("\nselecionando um silo");
  const opcoes = [...menu.querySelectorAll("li")];
  const alvo = opcoes.find((li) => li.textContent.includes("Reforma Tributária"));
  checar("a opção existe no menu", !!alvo);
  clicar(alvo.firstChild);                  // clique no <span> do nome, dentro do <li>
  await espera(10);
  checar("o menu fecha ao escolher", menu.hidden === true);
  checar("o nome do filtro muda", nomeFiltro.textContent === "Reforma Tributária", nomeFiltro.textContent);

  const itens = [...lista.querySelectorAll('li[role="option"]')];
  checar("a lista filtra", itens.length > 0, `${itens.length} itens`);
  const doSilo = indice.itens.filter((i) => i.grupo === "Reforma Tributária").length;
  checar("a contagem bate com o índice", contagem.textContent.startsWith(String(doSilo)),
         `${contagem.textContent} vs ${doSilo} no índice`);
  checar("todo resultado é do silo escolhido",
         itens.every((li) => {
           const url = li.querySelector("a").getAttribute("href");
           const item = indice.itens.find((i) => i.url === url);
           return item && item.grupo === "Reforma Tributária";
         }));

  console.log("\ncombinando filtro com termo digitado");
  digitar("nota fiscal");
  await espera(10);
  const combinados = [...lista.querySelectorAll('li[role="option"]')];
  checar("filtra por silo E por termo", combinados.length > 0 && combinados.length < itens.length,
         `${combinados.length} de ${itens.length}`);

  console.log("\nvoltando para Tudo");
  clicar(nomeFiltro);
  await espera(10);
  const tudo = [...menu.querySelectorAll("li")].find((li) => li.textContent.includes("Tudo"));
  clicar(tudo);
  await espera(10);
  checar('volta para "Tudo"', nomeFiltro.textContent === "Tudo");
  const semFiltro = [...lista.querySelectorAll('li[role="option"]')];
  checar("sem filtro, o termo busca em tudo", semFiltro.length >= combinados.length,
         `${semFiltro.length} resultados`);

  console.log("\nnavegação por teclado");
  campo.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  await espera(10);
  const sel = lista.querySelector('li[data-sel="sim"]');
  checar("a seta seleciona um item", !!sel);
  checar("a seleção não cai num cabeçalho de grupo",
         !sel || sel.getAttribute("role") === "option");

  console.log("\nmenu do filtro: posicao e altura");
  // O jsdom nao tem motor de layout, entao nao enxerga recorte. O que da para travar aqui e a
  // MECANICA que causava o corte: a caixa nao pode voltar a recortar, e o menu tem de abrir
  // ancorado pelo topo. Era essa combinacao que fazia o menu aparecer com uma opcao so
  // enquanto o filtro estava em "Tudo" — a caixa media ~90px e cortava o resto.
  const css = readdirSync("dist/_astro")
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(`dist/_astro/${f}`, "utf8"))
    .find((t) => t.includes(".busca__menu"));
  checar("achei o CSS da busca no build", !!css);
  // O Astro carimba o cid no seletor e minifica tudo numa linha: a regra de .busca__menu sai
  // como `.busca__menu[data-astro-cid-x]{...}` e convive com .busca__menu[hidden] e com as
  // regras dos filhos. Por isso a busca pede o corpo que contem uma declaracao conhecida.
  const regra = (sel, precisa) =>
    (css.match(new RegExp(`\\${sel}[^{}]*\\{[^}]*\\}`, "g")) ?? []).find((r) => r.includes(precisa)) ?? "";
  const caixa = regra(".busca__caixa", "border-radius");
  const painel = regra(".busca__menu", "position:absolute");
  checar("a caixa nao recorta o menu", !!caixa && !/overflow:hidden/.test(caixa));
  checar("o menu abre para baixo", /top:calc\(100%/.test(painel) && !/bottom:calc\(100%/.test(painel));
  checar("o menu e translucido", /color-mix/.test(painel) && /backdrop-filter:blur/.test(painel));

  clicar(nomeFiltro);
  await espera(10);
  checar("a altura e medida na abertura", /^\d+px$/.test(menu.style.maxHeight), menu.style.maxHeight);
  clicar(nomeFiltro);
  await espera(10);

  console.log("\nbusca sem resultado");
  digitar("zzzqqq");
  await espera(10);
  checar("mostra o aviso de vazio", document.getElementById("busca-vazio").hidden === false);

  const total = resultados.length, passou = resultados.filter(Boolean).length;
  console.log(`\n${passou} de ${total} verificações passaram`);
  process.exit(passou === total ? 0 : 1);
};

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
