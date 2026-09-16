/**
 * Dados estruturados do site — um @graph por página.
 *
 * Método: squads/schema-entity (arquitetura macro×micro, elegibilidade 2026) e
 * squads/entity-ops (regras de entidade do olaf-kopp). As decisões que divergem do
 * template padrão estão explicadas abaixo, cada uma com o motivo.
 *
 * ── 1. O @id da organização nasce na entity home, e nunca muda ────────────────────────
 * O template do schema-entity sugere `{DOMAIN}/#organization`. A regra do entity-ops é mais
 * específica e ganha: "UMA entidade principal por site, com @id na entity home; todas as
 * páginas referenciam o MESMO @id". A entity home da Beorange é /sobre-nos/, então o @id é
 * https://beorange.app/sobre-nos/#organization.
 * Esse @id é o CPF técnico da entidade. Trocar depois equivale a trocar de CPF: o buscador
 * perde o fio entre o que já associou a ele e o que vier a seguir. Se um dia a entity home
 * mudar de endereço, o @id NÃO acompanha.
 *
 * ── 2. O nó da organização vai inteiro em toda página ─────────────────────────────────
 * Fragmentação é ter dois nós Organization com @ids DIFERENTES. Repetir o mesmo nó, com o
 * mesmo @id, é o contrário disso: reforça. E evita referência pendurada — em toda página o
 * `publisher` aponta para um nó que está ali, na mesma resposta.
 *
 * ── 3. O tipo é AccountingService, não Organization ───────────────────────────────────
 * Regra do Jarno van Driel: sempre o tipo mais específico que couber. AccountingService
 * desce de FinancialService → LocalBusiness → Organization, então ele já É uma Organization
 * para qualquer consumidor do vocabulário — e ainda diz o que a empresa faz. É também o que
 * habilita o cartão de endereço e horário, segundo a tabela de elegibilidade 2026.
 *
 * ── 4. O que NÃO entra, e por quê ─────────────────────────────────────────────────────
 * • SearchAction / sitelinks searchbox — o Google descontinuou. Marcado como MORTO na
 *   tabela de elegibilidade. Emitir só engorda o HTML.
 * • Review e aggregateRating na organização — os depoimentos da /cases/ são coletados e
 *   publicados pela própria Beorange. O Google chama isso de self-serving review e proíbe
 *   para LocalBusiness e Organization; é caso de ação manual, não de estrela dourada.
 *   Estrela em review de si mesmo não é oportunidade perdida: é risco.
 * • FAQPage — o site não tem FAQ. Quando tiver, entra: o cartão só renderiza para saúde e
 *   governo desde ago/2023, mas continua alimentando People Also Ask e as respostas de IA.
 * • openingHoursSpecification e taxID — os dados existem, mas não em fonte primária que eu
 *   tenha conseguido ler. Campo sem lastro não entra. Ver PENDENTE, no fim do arquivo.
 *
 * ── 5. Autoria ───────────────────────────────────────────────────────────────────────
 * Os 149 artigos assinam "Por Beorange", então `author` é a própria organização — que é o
 * que a página diz. No dia em que houver assinatura por área, o author vira Person com @id
 * próprio, e é só aqui que muda.
 */

/** Domínio final. O mesmo de astro.config.mjs e do sitemap: as URLs do grafo já nascem
 *  definitivas, mesmo enquanto o site vive numa URL de preview. */
export const SITE = "https://beorange.app";

export const ID_SITE = `${SITE}/#website`;
/** Entity home. Ver a nota 1 do cabeçalho: este valor é imutável. */
export const ID_ORG = `${SITE}/sobre-nos/#organization`;

const abs = (caminho: string) => new URL(caminho, SITE + "/").href;

/** Os fatos da organização moram aqui e em nenhum outro lugar. Todos foram conferidos nas
 *  páginas do próprio site — endereço e telefone em /contato/, redes no rodapé. */
const ORGANIZACAO = {
  "@type": "AccountingService",
  "@id": ID_ORG,
  name: "Beorange",
  legalName: "Beorange",
  url: `${SITE}/`,
  description:
    "Contabilidade, operação financeira e tecnologia para empresas em crescimento.",
  logo: {
    "@type": "ImageObject",
    "@id": `${SITE}/#logo`,
    url: abs("/img/blog/logo-header.svg"),
    contentUrl: abs("/img/blog/logo-header.svg"),
    caption: "Beorange",
  },
  image: { "@id": `${SITE}/#logo` },
  email: "contato@beorange.app",
  telephone: "+55 41 9644-0060",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Av. Visc. de Guarapuava, 3263",
    addressLocality: "Curitiba",
    addressRegion: "PR",
    postalCode: "80010-100",
    addressCountry: "BR",
  },
  areaServed: { "@type": "Country", name: "Brasil" },
  /** Só perfis que a Beorange controla e que batem com a versão canônica da marca — é a
   *  régua do entity-ops. Perfil de terceiro, diretório e agregador ficam de fora. */
  sameAs: [
    "https://www.instagram.com/beorangeapp/",
    "https://www.linkedin.com/company/beorangeapp/",
    "https://www.facebook.com/beorangeapp/",
  ],
  knowsAbout: [
    "Contabilidade",
    "Lucro Real",
    "Reforma Tributária",
    "Departamento Pessoal",
    "Planejamento tributário",
    "Gestão financeira",
  ],
} as const;

const SITE_NODE = {
  "@type": "WebSite",
  "@id": ID_SITE,
  url: `${SITE}/`,
  name: "Beorange",
  description: ORGANIZACAO.description,
  publisher: { "@id": ID_ORG },
  inLanguage: "pt-BR",
} as const;

export interface Migalha {
  nome: string;
  /** Caminho a partir da raiz, com barra no fim. "/" para a home. */
  url: string;
}

export type DadosDaPagina =
  | { tipo: "home" }
  | { tipo: "sobre"; nome: string; descricao: string; migalhas: Migalha[] }
  | { tipo: "contato"; nome: string; descricao: string; migalhas: Migalha[] }
  | { tipo: "pagina"; nome: string; descricao: string; migalhas: Migalha[] }
  | { tipo: "colecao"; nome: string; descricao: string; migalhas: Migalha[] }
  | {
      tipo: "servico";
      nome: string;
      descricao: string;
      migalhas: Migalha[];
      /** Nome da frente de serviço, como aparece na página. */
      servico: string;
    }
  | { tipo: "blog"; nome: string; descricao: string; migalhas: Migalha[] }
  | {
      tipo: "artigo";
      nome: string;
      descricao: string;
      migalhas: Migalha[];
      titulo: string;
      dataIso: string;
      categoria: string;
      palavras: number;
      minutos: number;
      imagem?: string | null;
    };

function migalhasNode(url: string, migalhas: Migalha[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: migalhas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nome,
      item: abs(m.url),
    })),
  };
}

/**
 * Monta o @graph de uma página.
 *
 * @param dados    o que a página é e o que ela diz de si
 * @param caminho  o pathname, com barra no fim ("/contato/")
 */
export function montarGrafo(dados: DadosDaPagina, caminho: string): object[] {
  const url = abs(caminho);
  const temMigalhas = dados.tipo !== "home" && dados.migalhas.length > 1;

  // O tipo de WebPage acompanha o que a página é. AboutPage, ContactPage e CollectionPage
  // são subtipos de WebPage: quem só entende WebPage continua entendendo.
  const tipoPagina =
    dados.tipo === "sobre" ? "AboutPage"
    : dados.tipo === "contato" ? "ContactPage"
    : dados.tipo === "colecao" || dados.tipo === "blog" ? "CollectionPage"
    : dados.tipo === "artigo" ? "WebPage"
    : "WebPage";

  const pagina: Record<string, unknown> = {
    "@type": tipoPagina,
    "@id": `${url}#webpage`,
    url,
    name: dados.tipo === "home" ? "Beorange" : dados.nome,
    description: dados.tipo === "home" ? ORGANIZACAO.description : dados.descricao,
    isPartOf: { "@id": ID_SITE },
    about: { "@id": ID_ORG },
    inLanguage: "pt-BR",
  };
  if (temMigalhas) pagina.breadcrumb = { "@id": `${url}#breadcrumb` };

  const grafo: object[] = [SITE_NODE, ORGANIZACAO, pagina];
  if (temMigalhas) grafo.push(migalhasNode(url, dados.migalhas));

  if (dados.tipo === "servico") {
    // Service não gera cartão no SERP, e não é por isso que está aqui: é o que diz ao
    // buscador e aos modelos QUAL serviço esta página descreve e de quem ele é. Sem isso,
    // as 15 páginas de solução e frente são só texto sobre contabilidade.
    grafo.push({
      "@type": "Service",
      "@id": `${url}#service`,
      name: dados.servico,
      description: dados.descricao,
      serviceType: dados.servico,
      provider: { "@id": ID_ORG },
      areaServed: { "@type": "Country", name: "Brasil" },
      mainEntityOfPage: { "@id": `${url}#webpage` },
    });
    pagina.mainEntity = { "@id": `${url}#service` };
  }

  if (dados.tipo === "blog") {
    grafo.push({
      "@type": "Blog",
      "@id": `${SITE}/blog/#blog`,
      name: dados.nome,
      description: dados.descricao,
      url: abs("/blog/"),
      publisher: { "@id": ID_ORG },
      inLanguage: "pt-BR",
    });
    pagina.mainEntity = { "@id": `${SITE}/blog/#blog` };
  }

  if (dados.tipo === "artigo") {
    const artigo: Record<string, unknown> = {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      // headline é o H1, palavra por palavra. Resumo diferente do H1 vira dois títulos para
      // a mesma página, e o buscador tem de escolher um.
      headline: dados.titulo,
      description: dados.descricao,
      url,
      datePublished: dados.dataIso,
      // Sem histórico de edição por artigo, dateModified seria a data do build — que diz
      // que os 149 mudaram toda vez que um muda. A data de publicação é o que se sabe.
      dateModified: dados.dataIso,
      author: { "@id": ID_ORG },
      publisher: { "@id": ID_ORG },
      mainEntityOfPage: { "@id": `${url}#webpage` },
      isPartOf: { "@id": `${SITE}/blog/#blog` },
      articleSection: dados.categoria,
      wordCount: dados.palavras,
      timeRequired: `PT${dados.minutos}M`,
      inLanguage: "pt-BR",
    };
    if (dados.imagem) {
      artigo.image = { "@type": "ImageObject", url: abs(dados.imagem) };
    }
    grafo.push(artigo);
    pagina.mainEntity = { "@id": `${url}#article` };
  }

  return grafo;
}

/* ── PENDENTE — campos que existem no mundo e ainda não no grafo ──────────────────────
 *
 * openingHoursSpecification
 *   O Perfil da Empresa no Google tem os horários, mas o Google devolve só um stub de
 *   redirecionamento para leitura automática (tentado por curl e por fetch em 16/09/2026).
 *   Entra assim, quando os horários vierem confirmados:
 *       openingHoursSpecification: [{
 *         "@type": "OpeningHoursSpecification",
 *         dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
 *         opens: "09:00", closes: "18:00"
 *       }]
 *
 * taxID
 *   Candidato encontrado em agregador (Econodata): 47.029.891/0001-72, BE ORANGE ASSESSORIA
 *   E CONSULTORIA LTDA. Agregador não é fonte primária — confirmar no cartão CNPJ antes de
 *   publicar, aqui e no rodapé.
 *
 * sameAs → Perfil da Empresa no Google e Wikidata
 *   O GBP existe (o link que originou esta investigação aponta para ele) e entra em sameAs
 *   assim que a URL canônica for confirmada. Item no Wikidata exige o gate QG-EO-2 do
 *   entity-ops: sem a decisão registrada, não se cria item nem se inventa QID.
 *
 * author → Person
 *   Quando houver assinatura por área, trocar author de { "@id": ID_ORG } por um Person com
 *   @id próprio em /sobre-nos/#<slug>. É a única linha que muda.
 */
