// Utilitários do template de artigo (/blog/*).
// Rodam sempre em build time — a saída do projeto é estática.

/** Palavras por minuto usadas no "tempo de leitura". 200 é a média de leitura
 *  silenciosa em português para texto de prosa informativa. */
export const PALAVRAS_POR_MINUTO = 200;

/**
 * Conta as palavras de um trecho de HTML (ou de um arquivo .astro), ignorando
 * tags, frontmatter e expressões `{...}`. Só conta o que tem letra ou dígito,
 * para que pontuação solta não vire palavra.
 */
export function contarPalavras(fonte: string): number {
  let texto = fonte;

  // frontmatter do .astro, quando vier o arquivo inteiro
  if (texto.startsWith("---")) {
    const fim = texto.indexOf("---", 3);
    if (fim !== -1) texto = texto.slice(fim + 3);
  }

  texto = texto
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ");

  return texto.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
}

/**
 * Minutos de leitura a partir da contagem de palavras. Arredonda para cima
 * (convenção editorial: "3 min" cobre 2m30s) e nunca devolve menos de 1.
 */
export function tempoDeLeitura(palavras: number, ppm = PALAVRAS_POR_MINUTO): number {
  return Math.max(1, Math.ceil(palavras / ppm));
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

/**
 * "2026-06-16" → "16 de junho de 2026".
 * Monta a data a partir dos números da própria string, sem `new Date`, para não
 * depender do fuso do servidor de build — `new Date("2026-06-16")` é UTC e vira
 * dia 15 em qualquer fuso a oeste de Greenwich, incluindo o do Brasil.
 */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia || mes < 1 || mes > 12) {
    throw new Error(`Data inválida em artigo: "${iso}". Use o formato AAAA-MM-DD.`);
  }
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}
