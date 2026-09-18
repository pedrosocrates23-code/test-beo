/** Cálculo da carga tributária da pessoa jurídica. Simples Nacional e Lucro Presumido. */

import {
  ANEXO_I,
  ANEXO_III,
  ANEXO_V,
  DIVIDENDOS,
  INSS_PRO_LABORE,
  LUCRO_PRESUMIDO,
  SIMPLES,
  type FaixaSimples,
} from './tabelas-2026.ts';
import { round2 } from './format.ts';
import { calcularInssProLabore, calcularIrrf } from './irpf.ts';

export type Anexo = 'I' | 'III' | 'V';

export const ANEXOS: Record<Anexo, FaixaSimples[]> = {
  I: ANEXO_I,
  III: ANEXO_III,
  V: ANEXO_V,
};

// ---------------------------------------------------------------------------
// Fator R
// ---------------------------------------------------------------------------

export interface ResultadoFatorR {
  fatorR: number;
  anexo: Extract<Anexo, 'III' | 'V'>;
  atingiuCorte: boolean;
  /** Folha adicional em 12 meses necessária para alcançar os 28%. */
  folhaFaltante: number;
}

/**
 * Fator R = folha de pagamento dos últimos 12 meses ÷ receita bruta dos
 * últimos 12 meses. A folha inclui pró-labore, salários, encargos e FGTS.
 * >= 28% enquadra no Anexo III; abaixo disso, Anexo V.
 */
export function calcularFatorR(folha12: number, rbt12: number): ResultadoFatorR {
  const fatorR = rbt12 > 0 ? folha12 / rbt12 : 0;
  const atingiuCorte = fatorR >= SIMPLES.fatorRCorte;
  return {
    fatorR,
    anexo: atingiuCorte ? 'III' : 'V',
    atingiuCorte,
    folhaFaltante: atingiuCorte
      ? 0
      : round2(Math.max(0, rbt12 * SIMPLES.fatorRCorte - folha12)),
  };
}

// ---------------------------------------------------------------------------
// Simples Nacional
// ---------------------------------------------------------------------------

export interface ResultadoSimples {
  anexo: Anexo;
  rbt12: number;
  faixa: number;
  aliquotaNominal: number;
  parcelaDeduzir: number;
  aliquotaEfetiva: number;
  dasMensal: number;
  acimaDoLimite: boolean;
  acimaDoSublimite: boolean;
}

/**
 * DAS do Simples Nacional.
 *
 *   alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12
 *   DAS do mês       = receita do mês × alíquota efetiva
 *
 * Norma: LC 123/2006, art. 18, §1º e §1º-A.
 */
export function calcularSimples(params: {
  receitaMensal: number;
  rbt12: number;
  anexo: Anexo;
}): ResultadoSimples {
  const receitaMensal = Math.max(0, params.receitaMensal);
  const rbt12 = Math.max(0, params.rbt12);
  const tabela = ANEXOS[params.anexo];

  const indice = Math.max(
    0,
    tabela.findIndex((f) => rbt12 <= f.ate),
  );
  const faixa = tabela[indice === -1 ? tabela.length - 1 : indice] ?? tabela[tabela.length - 1]!;

  // Empresa nova (RBT12 = 0) paga a alíquota nominal da primeira faixa.
  const aliquotaEfetiva =
    rbt12 > 0
      ? Math.max(0, (rbt12 * faixa.nominal - faixa.deduzir) / rbt12)
      : tabela[0]!.nominal;

  return {
    anexo: params.anexo,
    rbt12,
    faixa: (indice === -1 ? tabela.length : indice + 1),
    aliquotaNominal: faixa.nominal,
    parcelaDeduzir: faixa.deduzir,
    aliquotaEfetiva,
    dasMensal: round2(receitaMensal * aliquotaEfetiva),
    acimaDoLimite: rbt12 > SIMPLES.limiteAnual,
    acimaDoSublimite: rbt12 > SIMPLES.sublimiteIcmsIss,
  };
}

// ---------------------------------------------------------------------------
// Lucro Presumido (serviços)
// ---------------------------------------------------------------------------

export interface ResultadoPresumido {
  receitaAnual: number;
  baseAnual: number;
  presuncaoAplicada: number;
  houveMajoracao: boolean;
  irpj: number;
  irpjAdicional: number;
  csll: number;
  pis: number;
  cofins: number;
  iss: number;
  /** Contribuição patronal de 20% sobre o pró-labore, fora do DAS. */
  cpp: number;
  totalMensal: number;
  cargaEfetiva: number;
}

/**
 * Lucro Presumido para serviços em geral, apurado no ano e convertido a mês.
 *
 * Presunção de 32% sobre a receita; 35,2% sobre a parcela anual que exceder
 * R$ 5 milhões (LC 224/2025, vigente em 2026). Adicional de IRPJ de 10% sobre
 * a base que exceder R$ 60.000 por trimestre. R$ 240.000 no ano.
 */
export function calcularLucroPresumido(params: {
  receitaMensal: number;
  aliquotaIss: number;
  proLabore?: number;
}): ResultadoPresumido {
  const receitaMensal = Math.max(0, params.receitaMensal);
  const receitaAnual = receitaMensal * 12;
  const proLabore = Math.max(0, params.proLabore ?? 0);

  const parcelaNormal = Math.min(receitaAnual, LUCRO_PRESUMIDO.limiteReceitaMajoracao);
  const parcelaMajorada = Math.max(0, receitaAnual - LUCRO_PRESUMIDO.limiteReceitaMajoracao);
  const baseAnual =
    parcelaNormal * LUCRO_PRESUMIDO.presuncaoServicos +
    parcelaMajorada * LUCRO_PRESUMIDO.presuncaoServicosMajorada;

  const irpj = baseAnual * LUCRO_PRESUMIDO.irpj;
  const limiteAdicionalAnual = LUCRO_PRESUMIDO.irpjAdicionalLimiteTrimestral * 4;
  const irpjAdicional =
    Math.max(0, baseAnual - limiteAdicionalAnual) * LUCRO_PRESUMIDO.irpjAdicional;
  const csll = baseAnual * LUCRO_PRESUMIDO.csll;
  const pis = receitaAnual * LUCRO_PRESUMIDO.pis;
  const cofins = receitaAnual * LUCRO_PRESUMIDO.cofins;
  const iss = receitaAnual * Math.max(0, params.aliquotaIss);
  const cpp = proLabore * 12 * INSS_PRO_LABORE.aliquotaPatronal;

  const totalAnual = irpj + irpjAdicional + csll + pis + cofins + iss + cpp;

  return {
    receitaAnual,
    baseAnual: round2(baseAnual),
    presuncaoAplicada: receitaAnual > 0 ? baseAnual / receitaAnual : LUCRO_PRESUMIDO.presuncaoServicos,
    houveMajoracao: parcelaMajorada > 0,
    irpj: round2(irpj / 12),
    irpjAdicional: round2(irpjAdicional / 12),
    csll: round2(csll / 12),
    pis: round2(pis / 12),
    cofins: round2(cofins / 12),
    iss: round2(iss / 12),
    cpp: round2(cpp / 12),
    totalMensal: round2(totalAnual / 12),
    cargaEfetiva: receitaAnual > 0 ? totalAnual / receitaAnual : 0,
  };
}

// ---------------------------------------------------------------------------
// Retirada do sócio: pró-labore + dividendos
// ---------------------------------------------------------------------------

export interface ResultadoRetirada {
  proLabore: number;
  inssProLabore: number;
  irrfProLabore: number;
  proLaboreLiquido: number;
  /** Lucro disponível para distribuição depois de tributos e custos. */
  dividendos: number;
  /** IRRF de 10% da Lei 15.270/2025, quando aplicável. */
  irrfDividendos: number;
  dividendosLiquidos: number;
  totalLiquido: number;
  alertaDividendos: boolean;
}

/**
 * Retirada líquida do sócio.
 *
 * Pró-labore é rendimento tributável: sofre INSS (11% até o teto) e IRRF pela
 * tabela progressiva, com o redutor da Lei 15.270/2025.
 *
 * Dividendos: isentos até R$ 50.000/mês pagos pela MESMA PJ à MESMA PF. Acima
 * disso, IRRF de 10% sobre o TOTAL do mês, sem dedução (Lei 15.270/2025).
 */
export function calcularRetiradaSocio(params: {
  proLabore: number;
  lucroDistribuivel: number;
  dependentes?: number;
}): ResultadoRetirada {
  const proLabore = Math.max(0, params.proLabore);
  const dividendos = Math.max(0, params.lucroDistribuivel);

  const inssProLabore = calcularInssProLabore(proLabore);
  const ir = calcularIrrf({
    rendimentoBruto: proLabore,
    inss: inssProLabore,
    dependentes: params.dependentes,
  });

  const excedeLimite = dividendos > DIVIDENDOS.limiteMensalIsento;
  const irrfDividendos = excedeLimite
    ? round2(dividendos * DIVIDENDOS.aliquotaRetencao)
    : 0;

  const proLaboreLiquido = round2(proLabore - inssProLabore - ir.irrf);
  const dividendosLiquidos = round2(dividendos - irrfDividendos);

  return {
    proLabore,
    inssProLabore,
    irrfProLabore: ir.irrf,
    proLaboreLiquido,
    dividendos: round2(dividendos),
    irrfDividendos,
    dividendosLiquidos,
    totalLiquido: round2(proLaboreLiquido + dividendosLiquidos),
    alertaDividendos: excedeLimite,
  };
}

// ---------------------------------------------------------------------------
// Visão consolidada da PJ
// ---------------------------------------------------------------------------

export type RegimePj = 'simples-iii' | 'simples-v' | 'simples-auto' | 'presumido';

export interface ResultadoPj {
  regime: RegimePj;
  anexoAplicado?: Anexo;
  fatorR?: ResultadoFatorR;
  simples?: ResultadoSimples;
  presumido?: ResultadoPresumido;
  /** Total de tributos do mês (DAS ou soma do presumido, + CPP quando houver). */
  tributosMensais: number;
  custosOperacionais: number;
  retirada: ResultadoRetirada;
  /** Quanto sobra no bolso do sócio por mês. */
  liquidoSocio: number;
  cargaEfetivaSobreFaturamento: number;
}

export function calcularPj(params: {
  regime: RegimePj;
  faturamentoMensal: number;
  /** Receita bruta acumulada em 12 meses. Se ausente, projeta-se mensal × 12. */
  rbt12?: number;
  /** Folha dos últimos 12 meses, usada só quando o regime é `simples-auto`. */
  folha12?: number;
  proLabore: number;
  /** Contabilidade, certificado digital, software etc. */
  custosOperacionais?: number;
  aliquotaIss?: number;
  dependentes?: number;
}): ResultadoPj {
  const faturamentoMensal = Math.max(0, params.faturamentoMensal);
  const rbt12 = params.rbt12 && params.rbt12 > 0 ? params.rbt12 : faturamentoMensal * 12;
  const proLabore = Math.max(0, params.proLabore);
  const custosOperacionais = Math.max(0, params.custosOperacionais ?? 0);

  let simples: ResultadoSimples | undefined;
  let presumido: ResultadoPresumido | undefined;
  let fatorR: ResultadoFatorR | undefined;
  let anexoAplicado: Anexo | undefined;
  let tributosMensais = 0;

  if (params.regime === 'presumido') {
    presumido = calcularLucroPresumido({
      receitaMensal: faturamentoMensal,
      aliquotaIss: params.aliquotaIss ?? LUCRO_PRESUMIDO.issMinimo,
      proLabore,
    });
    tributosMensais = presumido.totalMensal;
  } else {
    if (params.regime === 'simples-auto') {
      // Sem folha informada, o pró-labore anual é a folha mínima presumida.
      const folha12 = params.folha12 && params.folha12 > 0 ? params.folha12 : proLabore * 12;
      fatorR = calcularFatorR(folha12, rbt12);
      anexoAplicado = fatorR.anexo;
    } else {
      anexoAplicado = params.regime === 'simples-iii' ? 'III' : 'V';
    }
    simples = calcularSimples({ receitaMensal: faturamentoMensal, rbt12, anexo: anexoAplicado });
    tributosMensais = simples.dasMensal;
  }

  // O pró-labore sai do caixa da empresa; a CPP patronal, quando devida, já
  // está somada em `tributosMensais` via `presumido.cpp`.
  const lucroDistribuivel = Math.max(
    0,
    faturamentoMensal - tributosMensais - proLabore - custosOperacionais,
  );

  const retirada = calcularRetiradaSocio({
    proLabore,
    lucroDistribuivel,
    dependentes: params.dependentes,
  });

  return {
    regime: params.regime,
    anexoAplicado,
    fatorR,
    simples,
    presumido,
    tributosMensais: round2(tributosMensais),
    custosOperacionais,
    retirada,
    liquidoSocio: retirada.totalLiquido,
    cargaEfetivaSobreFaturamento:
      faturamentoMensal > 0
        ? (tributosMensais + retirada.inssProLabore + retirada.irrfProLabore + retirada.irrfDividendos) /
          faturamentoMensal
        : 0,
  };
}
