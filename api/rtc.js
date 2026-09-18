/**
 * Proxy serverless (Vercel Function) para a Calculadora oficial da Reforma Tributária
 * (RFB/Serpro, piloto do Regime Geral).
 *
 * Existe porque a API oficial bloqueia CORS de origem externa (o preflight responde 403):
 * o navegador não pode chamá-la direto. Este proxy roda no servidor, repassa a operação e
 * devolve a resposta oficial ao front, que a mostra ao lado do cálculo local.
 *
 * ── ATENÇÃO: este é o ÚNICO código de servidor do beorange.app ──────────────────────────
 * O resto do site é estático puro. Uma função é uma superfície de ataque que um arquivo
 * .html não tem, então as regras abaixo são apertadas de propósito. Se um dia o botão
 * "Consultar API oficial" sair da página /calculadoras/ibs-cbs/, APAGUE este arquivo: o
 * front já degrada sozinho com um aviso explicativo quando o proxy não responde.
 *
 * ── O que este proxy NÃO faz, e é o que o torna seguro ──────────────────────────────────
 * • Não repassa JSON arbitrário. Ele monta o payload oficial a partir de seis campos, cada
 *   um validado por formato. O que o cliente manda nunca chega inteiro ao destino.
 * • Não aceita destino do cliente. O ENDPOINT é constante no código, sem isso, o proxy
 *   seria um SSRF pronto: qualquer um mandaria o servidor da Vercel buscar o que quisesse,
 *   inclusive endereços internos.
 * • Não guarda nada. Nenhuma linha do que o usuário digita é persistida ou logada; o log de
 *   erro registra NCM e UF, que não identificam ninguém.
 *
 * Portado de calculadoras-fiscais/api/rtc.js em 18/09/2026, com duas proteções que lá não
 * existiam: teto de chamadas por IP e exigência de origem própria. Ver cada uma abaixo.
 */

const ENDPOINT =
  "https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/calculadora/regime-geral";

/** Hosts de onde a página pode chamar. O preview da Vercel entra porque é onde o site é
 *  conferido antes de publicar. Qualquer outra origem leva 403: sem isto, qualquer site na
 *  internet poderia pendurar o consumo da API oficial na conta da Beorange. */
const ORIGENS = [
  /^https:\/\/beorange\.app$/,
  /^https:\/\/www\.beorange\.app$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

/* ── Teto de chamadas por IP ─────────────────────────────────────────────────────────────
 * Janela deslizante em memória. É honestamente parcial: cada instância da função tem o
 * próprio mapa, e a Vercel pode ter várias no ar, então o teto real é o dobro ou o triplo
 * do número abaixo. Ainda assim resolve o caso que importa, o laço de repetição disparado
 * de um navegador, que cairia todo na mesma instância. Se um dia isto precisar ser exato,
 * o lugar é um Redis do Marketplace, não um Map.
 *
 * O limite é generoso para uso humano: conferir uma operação é um clique, e 20 por minuto
 * cobrem quem está testando variações de NCM sem parar. */
const TETO_POR_MINUTO = 20;
const JANELA_MS = 60_000;
const chamadas = new Map();

function excedeuTeto(ip) {
  const agora = Date.now();
  const marcas = (chamadas.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  marcas.push(agora);
  chamadas.set(ip, marcas);

  // Limpeza oportunista: sem isto o Map cresce para sempre numa instância de vida longa.
  if (chamadas.size > 5000) {
    for (const [k, v] of chamadas) {
      if (v.every((t) => agora - t >= JANELA_MS)) chamadas.delete(k);
    }
  }
  return marcas.length > TETO_POR_MINUTO;
}

const erro = (status, mensagem) => Response.json({ erro: mensagem }, { status });

export async function POST(request) {
  // ── origem ────────────────────────────────────────────────────────────────────────────
  // Origin é enviado pelo navegador em toda requisição cross-origin e em todo POST de
  // fetch; não dá para forjá-lo a partir de outra página. Quem chama por curl não manda
  // Origin nenhum, e aí o Referer também não bate, e a chamada cai aqui.
  const origem = request.headers.get("origin") ?? "";
  if (!ORIGENS.some((re) => re.test(origem))) {
    return erro(403, "Origem não autorizada.");
  }

  // ── teto ──────────────────────────────────────────────────────────────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "desconhecido";
  if (excedeuTeto(ip)) {
    return new Response(
      JSON.stringify({ erro: "Muitas consultas seguidas. Tente de novo em um minuto." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } },
    );
  }

  // ── corpo ─────────────────────────────────────────────────────────────────────────────
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return erro(400, "Corpo deve ser JSON");
  }

  const { base, ncm, uf, municipio, cClassTrib, cst } = corpo ?? {};

  const baseNum = Number(base);
  if (!Number.isFinite(baseNum) || baseNum <= 0 || baseNum > 1e12) {
    return erro(400, "base deve ser um número positivo");
  }
  if (!/^\d{8}$/.test(String(ncm ?? ""))) {
    return erro(400, "ncm deve ter 8 dígitos");
  }
  if (!/^[A-Z]{2}$/.test(String(uf ?? ""))) {
    return erro(400, "uf deve ter 2 letras maiúsculas");
  }
  const municipioNum = Number(municipio);
  if (!Number.isInteger(municipioNum) || municipioNum < 1100000 || municipioNum > 5300999) {
    return erro(400, "municipio deve ser um código IBGE válido");
  }
  const classTrib = String(cClassTrib ?? "000001");
  const cstItem = String(cst ?? "000");
  if (!/^\d{6}$/.test(classTrib) || !/^\d{3}$/.test(cstItem)) {
    return erro(400, "cClassTrib (6 dígitos) ou cst (3 dígitos) inválido");
  }

  const payload = {
    id: `beorange-calculadoras-${Date.now()}`,
    versao: "0.0.1",
    dataHoraEmissao: new Date().toISOString().replace(/\.\d+Z$/, "-03:00"),
    municipio: municipioNum,
    uf,
    itens: [
      {
        numero: 1,
        ncm: String(ncm),
        cst: cstItem,
        baseCalculo: baseNum,
        quantidade: 1,
        unidade: "UN",
        cClassTrib: classTrib,
      },
    ],
  };

  try {
    const resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const texto = await resposta.text();

    // O upstream é um piloto: quando cai, responde HTML de portal, não JSON. Repassar esse
    // HTML com Content-Type: application/json entregaria ao front um corpo que ele não sabe
    // ler, e, pior, faria o site servir markup de terceiro sob o próprio domínio.
    try {
      JSON.parse(texto);
    } catch {
      console.error(`rtc-proxy: upstream devolveu não-JSON (status ${resposta.status})`);
      return erro(502, "A calculadora oficial devolveu uma resposta inesperada.");
    }

    if (!resposta.ok) {
      // 4xx de negócio é esperado (NCM inexistente, por exemplo) e a mensagem original é
      // útil ao usuário. Vai para os Runtime Logs da Vercel sem nada que identifique alguém.
      console.warn(`rtc-proxy: upstream ${resposta.status} para ncm=${ncm} uf=${uf}`);
    }

    return new Response(texto, {
      status: resposta.status,
      headers: {
        "Content-Type": "application/json",
        // A resposta depende do corpo enviado; cachear seria servir o cálculo de um usuário
        // para outro.
        "Cache-Control": "no-store",
      },
    });
  } catch (excecao) {
    console.error("rtc-proxy: falha ao alcançar a calculadora oficial", excecao);
    return erro(502, "A calculadora oficial não respondeu no tempo limite.");
  }
}
