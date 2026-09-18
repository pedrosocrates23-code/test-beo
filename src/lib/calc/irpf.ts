/** Cálculo do INSS e do IRRF da pessoa física, competência 2026. */

import {
  INSS_EMPREGADO,
  INSS_PRO_LABORE,
  IRRF_MENSAL,
  REDUTOR_IRRF,
} from './tabelas-2026.ts';
import { round2 } from './format.ts';

export interface DetalheFaixaInss {
  faixa: string;
  baseNaFaixa: number;
  aliquota: number;
  valor: number;
}

export interface ResultadoInss {
  total: number;
  aliquotaEfetiva: number;
  atingiuTeto: boolean;
  detalhe: DetalheFaixaInss[];
}

/**
 * INSS do empregado (CLT), doméstico e avulso, cálculo progressivo por faixa.
 * Cada alíquota incide apenas sobre a parcela do salário contida na faixa.
 */
export function calcularInssEmpregado(salarioBruto: number): ResultadoInss {
  const salario = Math.max(0, salarioBruto);
  const detalhe: DetalheFaixaInss[] = [];
  let piso = 0;
  let total = 0;

  for (const faixa of INSS_EMPREGADO.faixas) {
    if (salario <= piso) break;
    const topo = Math.min(salario, faixa.ate);
    const baseNaFaixa = topo - piso;
    const valor = baseNaFaixa * faixa.aliquota;
    total += valor;
    detalhe.push({
      faixa: `${piso === 0 ? 'até' : `${piso.toFixed(2)} a`} ${faixa.ate.toFixed(2)}`,
      baseNaFaixa: round2(baseNaFaixa),
      aliquota: faixa.aliquota,
      valor: round2(valor),
    });
    piso = faixa.ate;
  }

  const totalArredondado = round2(total);
  return {
    total: totalArredondado,
    aliquotaEfetiva: salario > 0 ? totalArredondado / salario : 0,
    atingiuTeto: salario >= INSS_EMPREGADO.teto,
    detalhe,
  };
}

/** INSS retido sobre pró-labore do sócio: 11% limitado ao teto. */
export function calcularInssProLabore(proLabore: number): number {
  const base = Math.min(Math.max(0, proLabore), INSS_PRO_LABORE.teto);
  return round2(base * INSS_PRO_LABORE.aliquotaSegurado);
}

export interface EntradaIrrf {
  /** Rendimento bruto tributável do mês. */
  rendimentoBruto: number;
  /** Contribuição previdenciária oficial já descontada. */
  inss: number;
  dependentes?: number;
  pensaoAlimenticia?: number;
  /** Outras deduções legais (previdência complementar, por exemplo). */
  outrasDeducoes?: number;
}

export interface ResultadoIrrf {
  /** Deduções legais somadas (INSS + dependentes + pensão + outras). */
  deducoesLegais: number;
  /** Desconto simplificado (teto mensal). */
  descontoSimplificado: number;
  /** Qual desconto o cálculo usou, o mais vantajoso ao contribuinte. */
  modeloUsado: 'legal' | 'simplificado';
  baseCalculo: number;
  aliquotaNominal: number;
  parcelaDeduzir: number;
  /** Imposto pela tabela progressiva, antes do redutor. */
  impostoApurado: number;
  /** Redutor da Lei 15.270/2025. */
  redutor: number;
  /** Imposto efetivamente retido, já com o redutor aplicado. */
  irrf: number;
  aliquotaEfetiva: number;
  isento: boolean;
}

/** Redutor da Lei 15.270/2025, decresce linearmente e zera em R$ 7.350,00. */
export function calcularRedutor(rendimentoBruto: number): number {
  if (rendimentoBruto > REDUTOR_IRRF.limiteRendimento) return 0;
  const valor = REDUTOR_IRRF.constante - REDUTOR_IRRF.coeficiente * rendimentoBruto;
  return round2(Math.max(0, valor));
}

/**
 * IRRF mensal.
 *
 * A ordem importa: apura-se o imposto pela tabela progressiva sobre a base
 * mais vantajosa (deduções legais x desconto simplificado) e só então subtrai-se
 * o redutor. O resultado nunca é negativo.
 */
export function calcularIrrf(entrada: EntradaIrrf): ResultadoIrrf {
  const bruto = Math.max(0, entrada.rendimentoBruto);
  const dependentes = Math.max(0, entrada.dependentes ?? 0);
  const pensao = Math.max(0, entrada.pensaoAlimenticia ?? 0);
  const outras = Math.max(0, entrada.outrasDeducoes ?? 0);

  const deducoesLegais = round2(
    entrada.inss + dependentes * IRRF_MENSAL.dependente + pensao + outras,
  );
  const descontoSimplificado = IRRF_MENSAL.descontoSimplificado;

  // O desconto simplificado substitui todas as deduções legais quando maior.
  const usaSimplificado = descontoSimplificado > deducoesLegais;
  const desconto = usaSimplificado ? descontoSimplificado : deducoesLegais;
  const baseCalculo = round2(Math.max(0, bruto - desconto));

  const faixa =
    IRRF_MENSAL.faixas.find((f) => baseCalculo <= f.ate) ??
    IRRF_MENSAL.faixas[IRRF_MENSAL.faixas.length - 1]!;

  const impostoApurado = round2(
    Math.max(0, baseCalculo * faixa.aliquota - faixa.deducao),
  );
  const redutor = calcularRedutor(bruto);
  const irrf = round2(Math.max(0, impostoApurado - redutor));

  return {
    deducoesLegais,
    descontoSimplificado,
    modeloUsado: usaSimplificado ? 'simplificado' : 'legal',
    baseCalculo,
    aliquotaNominal: faixa.aliquota,
    parcelaDeduzir: faixa.deducao,
    impostoApurado,
    redutor,
    irrf,
    aliquotaEfetiva: bruto > 0 ? irrf / bruto : 0,
    isento: irrf === 0,
  };
}

export interface ResultadoSalarioLiquido {
  bruto: number;
  inss: ResultadoInss;
  ir: ResultadoIrrf;
  outrosDescontos: number;
  liquido: number;
  /** Carga tributária direta sobre o bruto (INSS + IRRF). */
  cargaEfetiva: number;
}

/** Salário líquido CLT: bruto − INSS − IRRF − outros descontos informados. */
export function calcularSalarioLiquido(params: {
  salarioBruto: number;
  dependentes?: number;
  pensaoAlimenticia?: number;
  outrasDeducoes?: number;
  outrosDescontos?: number;
}): ResultadoSalarioLiquido {
  const bruto = Math.max(0, params.salarioBruto);
  const inss = calcularInssEmpregado(bruto);
  const ir = calcularIrrf({
    rendimentoBruto: bruto,
    inss: inss.total,
    dependentes: params.dependentes,
    pensaoAlimenticia: params.pensaoAlimenticia,
    outrasDeducoes: params.outrasDeducoes,
  });
  const outrosDescontos = Math.max(0, params.outrosDescontos ?? 0);
  const liquido = round2(bruto - inss.total - ir.irrf - outrosDescontos);

  return {
    bruto,
    inss,
    ir,
    outrosDescontos,
    liquido,
    cargaEfetiva: bruto > 0 ? (inss.total + ir.irrf) / bruto : 0,
  };
}
