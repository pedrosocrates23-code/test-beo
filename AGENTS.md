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

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
