/**
 * Valida os dados estruturados de TODAS as páginas do build.
 *
 * Não é um "o JSON-LD está lá?". A checagem que importa é semântica, e é feita contra o
 * vocabulário oficial do schema.org (tests/schema-org-vocabulario.json, extraído do arquivo
 * que o próprio schema.org publica): todo @type tem de ser uma classe que existe, e toda
 * propriedade tem de ser válida NAQUELE tipo. `telephone` numa Organization vale;
 * `telephone` num BlogPosting é erro, e nenhum validador de sintaxe pega isso.
 *
 * Também confere o que quebra entidade em silêncio:
 *   - @id de organização diferente entre páginas (fragmentação — o defeito que o entity-ops
 *     manda evitar acima de qualquer outro);
 *   - referência { "@id": ... } apontando para um nó que não existe no mesmo grafo;
 *   - migalha cuja última posição não é a própria página;
 *   - imagem ou URL apontando para arquivo que não está no build;
 *   - tipos que o Google aposentou e que só engordam o HTML.
 *
 * Roda depois do build:  npm run test:schema
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SITE = "https://beorange.app";
const vocab = JSON.parse(readFileSync("tests/schema-org-vocabulario.json", "utf8"));

/** Tipos que o Google aposentou ou que não devem aparecer aqui. Ver o cabeçalho de
 *  src/lib/schema.ts para o porquê de cada um. */
const PROIBIDOS = {
  SearchAction: "descontinuado pelo Google (sitelinks searchbox)",
  Review: "review de si mesmo é proibido pelo Google em Organization/LocalBusiness",
  AggregateRating: "idem — estrela em review próprio é risco de ação manual",
};

/** Propriedades que não são do schema.org e são legítimas no JSON-LD. */
const CHAVES_JSONLD = new Set(["@type", "@id", "@context", "@graph"]);

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
const paginas = [["/", "dist/index.html"], ...paginasDe("dist")];

const falhas = [];
const erro = (rota, msg) => falhas.push(`${rota}  ${msg}`);

/** Todas as classes que um tipo é, subindo a hierarquia. */
function ancestrais(tipo, vistos = new Set()) {
  if (vistos.has(tipo)) return vistos;
  vistos.add(tipo);
  for (const pai of vocab.classes[tipo] ?? []) ancestrais(pai, vistos);
  return vistos;
}

const idsDeOrganizacao = new Set();
let totalNos = 0, totalPaginas = 0;

for (const [rota, arquivo] of paginas) {
  const html = readFileSync(arquivo, "utf8");
  const blocos = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];

  if (blocos.length === 0) { erro(rota, "sem JSON-LD"); continue; }
  if (blocos.length > 1) erro(rota, `${blocos.length} blocos de JSON-LD — deve ser um só, com @graph`);

  let doc;
  try { doc = JSON.parse(blocos[0][1]); }
  catch (e) { erro(rota, `JSON inválido: ${e.message.slice(0, 60)}`); continue; }
  totalPaginas++;

  if (doc["@context"] !== "https://schema.org") erro(rota, `@context inesperado: ${doc["@context"]}`);
  const grafo = doc["@graph"];
  if (!Array.isArray(grafo)) { erro(rota, "@graph ausente ou não é lista"); continue; }

  const definidos = new Set(grafo.map((n) => n["@id"]).filter(Boolean));
  const referenciados = [];

  const visitar = (no, tipoDono, caminho) => {
    totalNos++;
    const tipos = [].concat(no["@type"] ?? tipoDono ?? []);
    for (const t of tipos) {
      if (!vocab.classes[t]) erro(rota, `${caminho}: @type "${t}" não existe no schema.org`);
      if (PROIBIDOS[t]) erro(rota, `${caminho}: @type "${t}" — ${PROIBIDOS[t]}`);
    }
    const familia = new Set();
    for (const t of tipos) for (const a of ancestrais(t)) familia.add(a);

    for (const [chave, valor] of Object.entries(no)) {
      if (CHAVES_JSONLD.has(chave)) continue;
      const dominios = vocab.propriedades[chave];
      if (!dominios) { erro(rota, `${caminho}: propriedade "${chave}" não existe no schema.org`); continue; }
      // Uma referência pura ({ "@id": ... }) não declara tipo: só confere o nome da propriedade.
      if (tipos.length && !dominios.some((d) => familia.has(d))) {
        erro(rota, `${caminho}: "${chave}" não é válida em ${tipos.join("/")} (vale em ${dominios.slice(0, 3).join(", ")}…)`);
      }
      for (const v of [].concat(valor)) {
        if (v && typeof v === "object") {
          if (Object.keys(v).length === 1 && v["@id"]) referenciados.push([caminho + "." + chave, v["@id"]]);
          else visitar(v, null, `${caminho}.${chave}`);
        }
      }
    }
  };

  for (const no of grafo) {
    const nome = [].concat(no["@type"] ?? "?").join("/");
    visitar(no, null, nome);
    if (familiaOrganizacao(no)) idsDeOrganizacao.add(no["@id"]);
  }

  // referências penduradas: { "@id": X } sem nó X no mesmo grafo
  for (const [onde, id] of referenciados) {
    if (!definidos.has(id)) erro(rota, `${onde}: aponta para "${id}", que não existe neste @graph`);
  }

  // migalhas
  const trilha = grafo.find((n) => n["@type"] === "BreadcrumbList");
  if (trilha) {
    const itens = trilha.itemListElement ?? [];
    itens.forEach((it, i) => {
      if (it.position !== i + 1) erro(rota, `migalha ${i}: position ${it.position}, esperado ${i + 1}`);
    });
    const ultimo = itens.at(-1)?.item;
    const esperado = SITE + rota;
    if (ultimo !== esperado) erro(rota, `última migalha é "${ultimo}", esperado "${esperado}"`);
  }

  // datas e arquivos
  for (const no of grafo) {
    for (const campo of ["datePublished", "dateModified"]) {
      const v = no[campo];
      if (v && Number.isNaN(Date.parse(v))) erro(rota, `${campo} não é data válida: ${v}`);
    }
    for (const campo of ["url", "contentUrl"]) {
      const v = no[campo];
      if (typeof v === "string" && v.startsWith(SITE)) {
        const local = v.slice(SITE.length);
        const alvo = local.endsWith("/") ? join("dist", local, "index.html") : join("dist", local);
        if (/\.[a-z0-9]{2,5}$/i.test(local) && !existsSync(alvo)) erro(rota, `${campo} aponta para arquivo ausente: ${local}`);
      }
    }
    const img = no.image;
    const urlImg = typeof img === "string" ? img : img?.url;
    if (typeof urlImg === "string" && urlImg.startsWith(SITE)) {
      const local = urlImg.slice(SITE.length);
      if (!existsSync(join("dist", local))) erro(rota, `image aponta para arquivo ausente: ${local}`);
    }
  }
}

function familiaOrganizacao(no) {
  const tipos = [].concat(no["@type"] ?? []);
  return tipos.some((t) => ancestrais(t).has("Organization"));
}

console.log(`${totalPaginas} páginas com JSON-LD | ${totalNos} nós validados`);
console.log(`vocabulário: ${Object.keys(vocab.classes).length} classes, ${Object.keys(vocab.propriedades).length} propriedades (coletado em ${vocab.coletadoEm})`);

if (idsDeOrganizacao.size === 1) {
  console.log(`@id da organização, igual nas ${totalPaginas} páginas: ${[...idsDeOrganizacao][0]}`);
} else {
  falhas.push(`FRAGMENTAÇÃO: ${idsDeOrganizacao.size} @ids de organização diferentes — ${[...idsDeOrganizacao].join(" | ")}`);
}

if (falhas.length) {
  console.log(`\n${falhas.length} problemas:`);
  for (const f of falhas.slice(0, 40)) console.log("  " + f);
  if (falhas.length > 40) console.log(`  … e mais ${falhas.length - 40}`);
}
console.log(`\n${falhas.length === 0 ? "OK" : "FALHA"}: ${falhas.length} problemas em ${paginas.length} páginas`);
process.exit(falhas.length === 0 ? 0 : 1);
