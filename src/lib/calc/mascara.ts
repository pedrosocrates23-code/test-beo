/**
 * Máscaras de entrada.
 *
 * O modelo é o de centavos: o usuário digita apenas dígitos e o valor cresce da
 * direita para a esquerda. Isso evita o problema clássico de máscara com cursor
 * no meio do texto, porque a digitação é sempre acréscimo no fim.
 *
 * A formatação é aplicada na fase de captura do evento (ver Base.astro), então
 * quando a calculadora lê o campo o texto já está normalizado.
 */

export type TipoMascara = 'moeda' | 'inteiro' | 'percentual';

/** Teto de dígitos aceitos, para não estourar a precisão do Number. */
const MAX_DIGITOS = 13;

const somenteDigitos = (texto: string) => texto.replace(/\D/g, '').slice(0, MAX_DIGITOS);

const fmtMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtDecimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "7000000" vira "R$ 70.000,00". Campo vazio continua vazio. */
export function mascararMoeda(texto: string): string {
  const digitos = somenteDigitos(texto);
  if (!digitos) return '';
  return fmtMoeda.format(Number(digitos) / 100);
}

/** "250" vira "2,50%". Usado na alíquota de ISS. */
export function mascararPercentual(texto: string): string {
  const digitos = somenteDigitos(texto);
  if (!digitos) return '';
  return `${fmtDecimal.format(Number(digitos) / 100)}%`;
}

/**
 * Dígitos puros, sem zero à esquerda. Usado em contagem de dependentes.
 * Os zeros saem ANTES do corte de tamanho: cortar primeiro transformaria
 * "007" em "00", ou seja, zero dependentes onde o usuário quis sete.
 */
export function mascararInteiro(texto: string): string {
  const digitos = somenteDigitos(texto);
  if (!digitos) return '';
  const semZerosAEsquerda = digitos.replace(/^0+/, '');
  return (semZerosAEsquerda === '' ? '0' : semZerosAEsquerda).slice(0, 2);
}

export function aplicarMascara(tipo: TipoMascara, texto: string): string {
  switch (tipo) {
    case 'moeda':
      return mascararMoeda(texto);
    case 'percentual':
      return mascararPercentual(texto);
    case 'inteiro':
      return mascararInteiro(texto);
  }
}

/**
 * Formata um número já conhecido para o texto inicial do campo.
 * Usado no atributo `value` renderizado pelo servidor.
 */
export function valorInicial(tipo: TipoMascara, valor: number): string {
  switch (tipo) {
    case 'moeda':
      return fmtMoeda.format(valor);
    case 'percentual':
      return `${fmtDecimal.format(valor)}%`;
    case 'inteiro':
      return String(Math.trunc(valor));
  }
}
