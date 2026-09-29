// Registro de autores do site.
//
// POR QUE ESTE ARQUIVO EXISTE
// Até aqui a assinatura dos artigos era uma frase solta dentro de cada JSON ("Por Beorange"),
// e uma frase não é uma entidade: ela não tem @id, não tem página, não acumula autoridade e
// não pode ser referenciada pelo grafo. Quem assina passou a ser uma PESSOA com página
// própria, então a assinatura virou uma referência a este registro, e o campo `autor` do JSON
// passou a guardar um slug, validado pelo Zod em content.config.ts.
//
// A REGRA DE OURO
// O que está aqui aparece em duas superfícies ao mesmo tempo: no byline visível da página e no
// nó Person do JSON-LD. As duas precisam dizer a MESMA coisa. Dado estruturado que afirma algo
// que a página não mostra é o que o buscador trata como discrepância, e é por isso que `nome`
// e `cargo` alimentam o byline e o Person a partir da mesma fonte.
//
// PARA ACRESCENTAR UM AUTOR
// 1. adicione a entrada aqui, com @id em /sobre-nos/<slug>/#person;
// 2. crie a página em src/pages/sobre-nos/<slug>/index.astro (a entity home da pessoa);
// 3. inclua o slug no enum de `autor` em content.config.ts;
// 4. registre a URL no sitemap.
// Sem a página, não crie a entrada: um Person com @id que não resolve é referência pendurada,
// e pendurar referência é pior do que não ter o nó.

/** Domínio final. Repetido de schema.ts de propósito: este módulo é lido por páginas que não
 *  montam grafo, e importar schema.ts só para pegar a constante criaria dependência de mão
 *  dupla entre os dois arquivos. */
const SITE = "https://beorange.app";

export interface Autor {
  /** Slug, que é ao mesmo tempo a chave do registro e o último segmento da URL. */
  slug: string;
  /** Como o nome aparece no byline e em `name` do Person. */
  nome: string;
  /** Linha de baixo do byline e `jobTitle` do Person. */
  cargo: string;
  /** Entity home da pessoa, com barra no fim. */
  url: string;
  /** @id do nó Person. IMUTÁVEL depois de publicado: trocar o @id não renomeia a entidade,
   *  cria uma segunda e deixa a primeira órfã com todo o histórico dela. */
  id: string;
  /** Uma linha, para o cartão de autor no fim do artigo. */
  resumo: string;
  /** Assuntos que a pessoa domina, para `knowsAbout`. Cada um precisa se sustentar no que a
   *  trajetória dela mostra: lista de tema que ninguém consegue verificar é ruído. */
  temas: string[];
  /** Retrato, em 4:5, para a entity home. Também é o `image` do nó Person, e é por isso que
   *  precisa ser a foto oficial: o campo afirma ao buscador que aquela é a cara da entidade. */
  foto: string;
  /** Texto alternativo do retrato. Descreve a pessoa, não o arquivo. */
  fotoAlt: string;
  /** Recorte quadrado do rosto, para o byline dos artigos. */
  avatar: string;
  /** Cartão de compartilhamento, 1200x630. Em JPEG de propósito: ver o comentário na página. */
  og: string;
  /** Perfis que a própria pessoa controla e que foram confirmados um a um. Vira `sameAs`.
   *  Perfil de terceiro, diretório e agregador não entram. */
  perfis: string[];
}

export const AUTORES = {
  "myle-pontes": {
    slug: "myle-pontes",
    nome: "Myle Pontes",
    cargo: "Fundadora e CEO da Beorange",
    url: `${SITE}/sobre-nos/myle-pontes/`,
    id: `${SITE}/sobre-nos/myle-pontes/#person`,
    /** Sem ano de fundação: a única fonte fala em "quatro anos" em julho de 2026, e converter
     *  isso em data exata é deduzir, não apurar. Entra quando a empresa confirmar. */
    resumo:
      "Contadora especializada em contabilidade internacional, com passagens por Grant Thornton, Deloitte e Ernst & Young. Fundou a Beorange e responde pela leitura contábil, fiscal e tributária publicada aqui.",
    temas: [
      "Contabilidade internacional",
      "Normas internacionais de contabilidade",
      "Investigação de fraudes corporativas",
      "Planejamento tributário",
      "Reforma Tributária",
      "Automação de rotinas administrativas",
      "Inteligência artificial aplicada à contabilidade",
    ],
    /** Os três recortes saem da MESMA foto oficial entregue pela Beorange, o retrato de fundo
     *  branco que a empresa já usa na home. Nada foi buscado em banco de imagens nem em busca:
     *  numa página que existe para dizer quem é a pessoa, foto de procedência incerta é o tipo
     *  de detalhe que derruba a página inteira. */
    foto: "/img/sobre-nos/myle-pontes.webp",
    fotoAlt: "Myle Pontes, fundadora e CEO da Beorange, de blazer laranja, sorrindo",
    avatar: "/img/sobre-nos/myle-pontes-avatar.webp",
    og: "/img/sobre-nos/myle-pontes-og.jpg",
    perfis: [
      "https://www.linkedin.com/in/myle-pontes/",
      "https://www.instagram.com/mylepontes/",
    ],
  },
} as const satisfies Record<string, Autor>;

export type SlugDeAutor = keyof typeof AUTORES;

/** Busca no registro. Recebe o slug já validado pelo Zod, então uma falha aqui só acontece se
 *  o enum de content.config.ts e este registro saírem de sincronia — caso em que é melhor o
 *  build parar do que a página sair com o byline vazio. */
export function autorPorSlug(slug: string): Autor {
  const autor = (AUTORES as Record<string, Autor>)[slug];
  if (!autor) {
    throw new Error(
      `Autor desconhecido: "${slug}". Registre-o em src/lib/autores.ts e no enum de content.config.ts.`,
    );
  }
  return autor;
}

/** Caminho relativo da entity home, para usar em href. A URL do registro é absoluta porque o
 *  @id precisa ser; o link da página é relativo porque o site é servido em preview e em
 *  produção, e link absoluto fixaria o domínio errado enquanto a migração não acontece. */
export function caminhoDoAutor(autor: Autor): string {
  return `/sobre-nos/${autor.slug}/`;
}
