/**
 * Toda pergunta marcada como FAQPage aparece visível na página?
 *
 * O Google exige que o conteúdo de um FAQPage esteja visível ao usuário, na mesma forma em
 * que foi marcado. Marcação sem texto correspondente é spam de dados estruturados, e a
 * penalidade é ação manual, não é "o rich result não aparece", é o site levar uma marca.
 *
 * Esta checagem existe porque o defeito estava lá. As calculadoras vieram do projeto
 * calculadoras-fiscais, onde o FAQPage era montado à mão no frontmatter de cada página e as
 * perguntas não apareciam em lugar nenhum do HTML: os H3 do corpo tratavam dos mesmos temas
 * com outra redação ("A isenção até R$ 5.000 não zerou a tabela" contra a pergunta "Quem
 * ganha até R$ 5.000 está isento de Imposto de Renda em 2026?"). Nenhum validador de
 * sintaxe pega isso, o JSON-LD está perfeito.
 *
 * O CalculadoraShell agora monta as duas saídas da MESMA prop, então o defeito só volta se
 * alguém escrever um FAQPage por fora dele. É esse caso que o teste trava.
 *
 * Roda depois do build:  npm run test:faq
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const paginasDe = (dir, pre = "") => {
  const saida = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = join(dir, e.name);
    if (existsSync(join(p, "index.html"))) saida.push([`${pre}/${e.name}/`, join(p, "index.html")]);
    saida.push(...paginasDe(p, `${pre}/${e.name}`));
  }
  return saida;
};

/** Texto que o usuário lê: sem tags, sem entidade HTML, com o espaço colapsado. */
const textoVisivel = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const paginas = [["/", "dist/index.html"], ...paginasDe("dist")];
const erros = [];
let comFaq = 0;
let perguntas = 0;

for (const [rota, arquivo] of paginas) {
  const html = readFileSync(arquivo, "utf8");
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (blocos.length === 0) continue;

  const visivel = textoVisivel(html);

  for (const [, bruto] of blocos) {
    let dados;
    try {
      dados = JSON.parse(bruto);
    } catch (e) {
      erros.push(`${rota}: JSON-LD inválido, ${e.message}`);
      continue;
    }
    const nos = dados["@graph"] ?? (Array.isArray(dados) ? dados : [dados]);
    for (const no of nos) {
      if (no["@type"] !== "FAQPage") continue;
      comFaq++;
      for (const q of no.mainEntity ?? []) {
        perguntas++;
        const pergunta = (q.name ?? "").replace(/\s+/g, " ").trim();
        const resposta = (q.acceptedAnswer?.text ?? "").replace(/\s+/g, " ").trim();

        if (!visivel.includes(pergunta)) {
          erros.push(`${rota}: pergunta marcada mas NÃO visível, "${pergunta.slice(0, 70)}"`);
        }
        // A resposta é comparada pelos primeiros 90 caracteres: é o bastante para provar que
        // o parágrafo está na página, e não quebra se um dia houver um <strong> no meio.
        const inicio = resposta.slice(0, 90);
        if (inicio && !visivel.includes(inicio)) {
          erros.push(`${rota}: resposta marcada mas NÃO visível, "${inicio.slice(0, 70)}"`);
        }
      }
    }
  }
}

if (erros.length > 0) {
  console.error(`FAQ: ${erros.length} problema(s)\n`);
  for (const e of erros) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(`FAQ: ${perguntas} pergunta(s) em ${comFaq} FAQPage, todas visíveis na página. OK`);
