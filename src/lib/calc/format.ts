/** Utilidades de formatação e arredondamento monetário. */

/**
 * Arredonda para 2 casas.
 *
 * Usa deslocamento por notação exponencial em vez de `× 100`: em ponto
 * flutuante, `121.575 * 100` vira `12157.499999999998` e `Math.round` devolve
 * R$ 121,57 onde a norma diz R$ 121,58. O truque do expoente evita isso.
 */
export function round2(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  const sinal = valor < 0 ? -1 : 1;
  // 1621 × 0,075 dá 121.57499999999999 em ponto flutuante. Sem normalizar a
  // precisão antes, o meio exato R$ 121,575 arredondaria para R$ 121,57:
  // um centavo abaixo do valor publicado na Portaria MPS/MF nº 13/2026.
  const abs = Number(Math.abs(valor).toPrecision(12));
  const deslocado = Math.round(Number(`${abs}e2`));
  return sinal * Number(`${deslocado}e-2`);
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function moeda(valor: number): string {
  return brl.format(Number.isFinite(valor) ? valor : 0);
}

export function percentual(fracao: number): string {
  return pct.format(Number.isFinite(fracao) ? fracao : 0);
}

/**
 * Converte texto digitado pelo usuário em número.
 * Aceita "5.000,00", "5000,00", "5000.00" e "5000".
 */
export function parseMoeda(texto: string | number | null | undefined): number {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : 0;
  if (!texto) return 0;

  let limpo = String(texto).replace(/[^\d.,-]/g, '').trim();
  if (!limpo) return 0;

  const temVirgula = limpo.includes(',');
  const temPonto = limpo.includes('.');

  if (temVirgula && temPonto) {
    // Formato pt-BR: ponto é separador de milhar, vírgula é decimal.
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  } else if (temVirgula) {
    limpo = limpo.replace(',', '.');
  } else if (temPonto) {
    // "5.000" é milhar; "5000.50" é decimal. Decide pelo tamanho do sufixo.
    const partes = limpo.split('.');
    const ultima = partes[partes.length - 1] ?? '';
    if (partes.length > 2 || ultima.length === 3) limpo = partes.join('');
  }

  const numero = Number.parseFloat(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

/** Lê um campo mascarado como inteiro. "03" e "3 dependentes" devolvem 3. */
export function parseInteiro(texto: string | number | null | undefined): number {
  if (typeof texto === 'number') return Number.isFinite(texto) ? Math.trunc(texto) : 0;
  const digitos = String(texto ?? '').replace(/\D/g, '');
  return digitos ? Number(digitos) : 0;
}

/** Lê um campo mascarado como percentual e devolve a fração. "2,50%" vira 0,025. */
export function parsePercentual(texto: string | number | null | undefined): number {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto / 100 : 0;
  return parseMoeda(texto) / 100;
}
