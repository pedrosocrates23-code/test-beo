// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Domínio final do site. É o que o sitemap, o robots.txt e a tag canonical usam para
  // montar URL absoluta.
  //
  // Fica fixo em beorange.app mesmo enquanto o site vive numa URL de preview da Vercel, e é
  // de propósito: assim o sitemap já nasce com as URLs definitivas e nada precisa ser
  // reescrito no dia em que o domínio apontar para cá. Quem impede o preview de ser
  // indexado enquanto isso é o robots.txt, não este campo — ver src/pages/robots.txt.ts.
  site: 'https://beorange.app',

  // CSS dentro do HTML: os dois .css externos bloqueavam a primeira pintura (Lighthouse mobile,
  // 1,5 s estimados). O custo é o CSS repetido em cada página, que o cache de HTML absorve.
  build: { inlineStylesheets: 'always' },
});
