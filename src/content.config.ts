// Content collection dos artigos do blog.
//
// Origem dos dados: migração do blog antigo (Framer), em
// output/beorange-blog-migracao/. Cada artigo virou um JSON em src/data/artigos/,
// e o nome do arquivo é o slug — é ele que vira a URL em /blog/<slug>/.
//
// O corpo vem como HTML já limpo na migração (sem <style> inline, sem atributo de
// evento, com os <h1> do texto rebaixados para <h2> e as imagens apontando para
// public/img/blog/<slug>/). O schema abaixo é a última barreira: um artigo que não
// satisfizer isso quebra o build em vez de subir torto.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const artigos = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/data/artigos" }),
  schema: z.object({
    /** Número do post no acervo da migração. Serve para rastrear até a planilha. */
    n: z.number().int().positive(),
    slug: z.string().min(1),
    /** Teto de 150: um artigo do Framer (n=145) veio com o texto inteiro colado dentro do
     *  campo de título — 7.568 caracteres, que na página viravam um H1 do tamanho da tela.
     *  O mais longo legítimo do acervo tem 122. Acima de 150 é dado quebrado, e o build
     *  precisa parar em vez de publicar. */
    titulo: z.string().min(1).max(150, "título acima de 150 caracteres: dado quebrado na origem"),
    /** Parágrafo de abertura. Vazio em 19 artigos cujo texto não abria com parágrafo. */
    lead: z.string(),
    /** AAAA-MM-DD. formatarData() em lib/artigo.ts monta a data por extenso sem new Date. */
    dataIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD"),
    categoria: z.string().min(1),
    autor: z.string().min(1),
    metaTitle: z.string().min(1),
    metaDescription: z.string(),
    palavras: z.number().int().nonnegative(),
    /** Imagem de destaque. null quando a capa não passou no corte de qualidade:
     *  nesse caso o artigo sobe sem hero e a capa serve apenas de card na listagem. */
    hero: z.string().nullable(),
    /** Imagem do card na listagem. Todo artigo tem uma. */
    card: z.string().nullable(),
    imagemAlt: z.string(),
    /** Corpo em HTML, renderizado com set:html. */
    corpo: z.string().min(1),
    cluster: z.string(),
    /** Dois vizinhos para o "Continue lendo". Navegação estrutural: não conta no
     *  teto de 2 links por texto que vale para os links dentro do corpo. */
    relacionados: z.array(z.object({
      slug: z.string(),
      titulo: z.string(),
      categoria: z.string(),
      palavras: z.number().int().nonnegative(),
    })).max(2),
    urlAntiga: z.string().url(),
    notasDaMigracao: z.array(z.string()),
  }),
});

export const collections = { artigos };
