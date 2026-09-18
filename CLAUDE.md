## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

### Depois de mexer em `src/data/artigos/` ou em `public/img/blog/` em lote

Apague `.astro/` antes de subir o dev server:

```
rm -rf .astro
```

O `.astro/data-store.json` é o cache da content collection. Ele guarda uma cópia dos campos
de cada artigo — inclusive `hero` e `card`, que são caminhos de imagem. Quando um lote de
arquivos é trocado fora do dev server (um script que renomeia imagens e reescreve os JSON, por
exemplo), o cache não é invalidado: o `astro build` regenera e sai certo, mas o `astro dev`
reaproveita o cache velho e serve os caminhos antigos.

O sintoma é enganoso — a página monta inteira e só as imagens vêm quebradas, como se o
problema fosse o arquivo de imagem. Já aconteceu: depois de converter as 149 capas para WebP,
o cache ainda apontava para 86 `.png` e 52 `.jpg` que não existiam mais.

## Regra do "Continue lendo" (rodapé de todo artigo)

Os dois cartões no fim de cada artigo seguem esta ordem de escolha, nesta ordem:

1. **Os dois textos mais próximos daquele artigo**, por proximidade de vocabulário
   (TF-IDF sobre título, subtítulos e corpo). **Não é por categoria** — "Gestão
   Empresarial" cabe tanto em razão social quanto em estrutura de grupo, e foi assim que o
   artigo sobre subsidiárias e coligadas acabou fechando com "Razão Social" e "Indicadores
   financeiros", que não continuam o assunto.
2. **Piso de proximidade de 0,10.** Abaixo disso a ligação é ruído, e ruído no rodapé é
   pior que nada: o bloco promete continuação do assunto.
3. **Sem candidato acima do piso, completa com o artigo mais recente.**
4. **Sempre exatamente dois.** Um cartão sozinho quebra a grade de duas colunas.

O campo `relacionados` de cada `src/data/artigos/*.json` já chega resolvido; o componente
`RelatedArticles.astro` só desenha. Depois de acrescentar ou reescrever artigos, rode de
novo o script que recalcula esse campo — senão os artigos novos não entram no rodapé de
ninguém, e os antigos seguem apontando para vizinhos que mudaram.

## Acima de 2100px o site roda sob `zoom` — `100vw` e `100vh` crus viram bug

`src/styles/escala-larga.css` trava a viewport útil do site em 2100px: acima disso o `:root`
recebe `zoom` contínuo e tudo — container, tipografia e a foto do hero — cresce junto. É o que
impede a foto de deixar sobra nas laterais num monitor de 27" ou maior (eram 176px de cada lado
a 2560px, 616px a 3440px), e é o mesmo efeito do zoom de 125% do Chrome, só que como regra.

Medido em Chromium, porque o CSSWG não especifica: **`vw` e `vh` não são compensados pelo
zoom.** Um `100vw` cru sob zoom 1,22 pinta 122% da tela e rola a página para o lado. O site
escapa hoje porque todo uso de `100vw` está dentro de um `min()` com teto menor, e todo `vw`
tipográfico está em `clamp()` já saturado nessas larguras.

Ao escrever CSS novo: se a medida precisa valer a tela inteira, divida por `var(--zoom)`, que
existe em qualquer largura justamente para isso. E lembre que media queries são avaliadas na
largura **real** da janela, não nos 2100px úteis — um `min-width` novo acima de 2100px compara
com a tela física.

`npm run test:escala` mede a sobra da foto pixel a pixel e o estouro horizontal das 31 rotas
nas cinco larguras. Ele reprova se a folha sair do Layout.

## Página nova: a rota precisa entrar em `src/lib/paginas.ts`

Aquele arquivo é a lista única das páginas fixas — as que não vêm de content collection — e
alimenta o índice de busca (`/busca.json`) e o sitemap ao mesmo tempo. Antes eram duas listas
paralelas mantidas à mão, e elas saíram de sincronia: as quatro páginas de calculadoras
entraram no sitemap e ficaram de fora da busca, e a home nunca esteve nela. Cinco páginas
publicadas, encontráveis pelo Google e invisíveis para quem usava a lupa do próprio site.

**A ordem do array importa para a busca.** O overlay agrupa os resultados por `grupo` e ordena
os grupos pela primeira aparição no índice (ver `filtrar`, em `BuscaOverlay.astro`). Mover uma
linha reordena o resultado. O sitemap não depende da ordem: ele emite por `priority`.

`npm run test:paginas` compara a lista com as rotas que o build realmente gerou, nos dois
sentidos — rota sem entrada reprova, entrada sem rota também. Não há como a lista envelhecer
em silêncio de novo.

Detalhe que economiza tempo: o campo `resumo` **não é desenhado** no resultado da busca, que
mostra só ícone e título. Ele existe para entrar no texto pesquisável. Por isso 19 artigos
importados do Framer sem `lead` não deixam buraco na interface — só ficam buscáveis apenas
pelo título e pela categoria. O teste avisa, não reprova.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
