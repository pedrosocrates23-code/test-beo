// Variante de 640px das capas do blog (public/img/blog/<slug>/capa-640.webp). O card mostra a
// capa com ~360px de largura; sem srcset todo card baixava o arquivo de 960px inteiro.
// Só as capas "capa.webp" têm variante — qualquer outro caminho volta sem srcset.
export const SIZES_CARD = "(min-width: 941px) 360px, (min-width: 681px) calc(50vw - 40px), calc(100vw - 56px)";

export function capaSrcset(src: string | undefined): string | undefined {
  if (!src || !src.endsWith("/capa.webp")) return undefined;
  return `${src.replace(/capa\.webp$/, "capa-640.webp")} 640w, ${src} 960w`;
}
