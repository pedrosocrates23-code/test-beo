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

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
