/**
 * FONTE ÚNICA DA VERDADE, parâmetros legais vigentes em 2026.
 *
 * Toda constante aqui tem norma de origem declarada. Nenhum valor deste arquivo
 * foi estimado ou arredondado por conveniência: se a norma mudar, muda-se aqui e
 * as duas calculadoras acompanham.
 *
 * Última verificação das fontes: agosto de 2026.
 */

export const VIGENCIA = {
  anoBase: 2026,
  verificadoEm: '2026-08-04',
} as const;

// ---------------------------------------------------------------------------
// 1. Salário mínimo e INSS
// ---------------------------------------------------------------------------

/** Salário mínimo nacional vigente em 2026. */
export const SALARIO_MINIMO = 1621.0;

/**
 * Tabela de contribuição mensal do INSS, segurado empregado, doméstico e
 * trabalhador avulso. Alíquotas PROGRESSIVAS por faixa (cada alíquota incide
 * apenas sobre a parcela do salário contida na faixa).
 *
 * Norma: Portaria Interministerial MPS/MF nº 13, de 09/01/2026 (competência a
 * partir de janeiro/2026).
 */
export const INSS_EMPREGADO = {
  faixas: [
    { ate: 1621.0, aliquota: 0.075 },
    { ate: 2902.84, aliquota: 0.09 },
    { ate: 4354.27, aliquota: 0.12 },
    { ate: 8475.55, aliquota: 0.14 },
  ],
  /** Teto do salário de contribuição. Acima disso não há incidência. */
  teto: 8475.55,
  /** Desconto máximo possível do empregado (soma das quatro faixas no teto). */
  descontoMaximo: 988.09,
  fonte: 'Portaria Interministerial MPS/MF nº 13, de 09/01/2026',
} as const;

/**
 * Contribuinte individual (sócio que recebe pró-labore).
 * A empresa retém 11% sobre o pró-labore, limitado ao teto (Lei 8.212/1991,
 * art. 21 c/c art. 4º da Lei 10.666/2003).
 */
export const INSS_PRO_LABORE = {
  aliquotaSegurado: 0.11,
  teto: 8475.55,
  /**
   * Contribuição patronal (CPP) sobre o pró-labore: 20%.
   * Está DENTRO do DAS nos Anexos III e V do Simples Nacional; é recolhida
   * à parte no Lucro Presumido e no Lucro Real (Lei 8.212/1991, art. 22, III).
   */
  aliquotaPatronal: 0.2,
  fonte: 'Lei 8.212/1991, arts. 21 e 22, III; Portaria Interministerial MPS/MF nº 13/2026',
} as const;

// ---------------------------------------------------------------------------
// 2. IRPF, tabela progressiva mensal e redutor da Lei 15.270/2025
// ---------------------------------------------------------------------------

/**
 * Tabela progressiva mensal do IRRF vigente a partir de janeiro/2026.
 * Norma: Lei nº 15.191, de 11/08/2025.
 */
export const IRRF_MENSAL = {
  faixas: [
    { ate: 2428.8, aliquota: 0, deducao: 0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
    { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
    { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
  ],
  /** Dedução mensal por dependente. */
  dependente: 189.59,
  /**
   * Desconto simplificado mensal: substitui TODAS as deduções legais quando
   * for mais vantajoso ao contribuinte.
   */
  descontoSimplificado: 607.2,
  fonte: 'Lei nº 15.191, de 11/08/2025',
} as const;

/**
 * Redutor do IRRF, "isenção até R$ 5.000".
 *
 * A Lei 15.270/2025 não zerou a tabela: criou um REDUTOR aplicado sobre o
 * imposto apurado. O redutor decresce linearmente e zera exatamente em
 * R$ 7.350,00 de rendimento bruto mensal.
 *
 *   redutor = 978,62 − (0,133145 × rendimento bruto tributável mensal)
 *
 * Coerência verificada: em R$ 5.000,00 com desconto simplificado, o imposto
 * apurado é R$ 312,89 e o redutor é R$ 312,90 (978,62 − 665,725, arredondado),
 * de modo que o imposto retido é zero. Abaixo de R$ 5.000 o redutor cresce mais
 * rápido do que o imposto, então a isenção integral se mantém em toda a faixa.
 *
 * Norma: Lei nº 15.270, de 26/11/2025 (vigência 01/01/2026).
 */
export const REDUTOR_IRRF = {
  constante: 978.62,
  coeficiente: 0.133145,
  /** Acima deste rendimento bruto mensal o redutor é zero. */
  limiteRendimento: 7350.0,
  /** Faixa em que o redutor zera integralmente o imposto. */
  isencaoIntegralAte: 5000.0,
  fonte: 'Lei nº 15.270, de 26/11/2025',
} as const;

/**
 * Tributação de lucros e dividendos a partir de 2026.
 * IRRF de 10% quando uma MESMA pessoa jurídica paga a uma MESMA pessoa física
 * residente valor superior a R$ 50.000,00 no mês. Ultrapassado o limite, os 10%
 * incidem sobre o TOTAL do mês, sem dedução da base.
 *
 * Norma: Lei nº 15.270, de 26/11/2025.
 */
export const DIVIDENDOS = {
  limiteMensalIsento: 50000.0,
  aliquotaRetencao: 0.1,
  /** IRPFM, tributação mínima anual da alta renda (soma anual > R$ 600 mil). */
  irpfmLimiteAnual: 600000.0,
  irpfmAliquotaMaxima: 0.1,
  fonte: 'Lei nº 15.270, de 26/11/2025',
} as const;

// ---------------------------------------------------------------------------
// 3. Simples Nacional
// ---------------------------------------------------------------------------

export interface FaixaSimples {
  /** Limite superior da receita bruta acumulada em 12 meses (RBT12). */
  ate: number;
  /** Alíquota nominal da faixa. */
  nominal: number;
  /** Parcela a deduzir (PD). */
  deduzir: number;
}

/**
 * Anexos do Simples Nacional, faixas, alíquotas nominais e parcelas a deduzir.
 * Norma: Lei Complementar nº 123/2006, com a redação da LC nº 155/2016.
 * As tabelas permanecem inalteradas em 2026; a Reforma Tributária alterou
 * apenas a repartição interna entre IBS e CBS dentro do DAS.
 */
export const ANEXO_I: FaixaSimples[] = [
  { ate: 180000, nominal: 0.04, deduzir: 0 },
  { ate: 360000, nominal: 0.073, deduzir: 5940 },
  { ate: 720000, nominal: 0.095, deduzir: 13860 },
  { ate: 1800000, nominal: 0.107, deduzir: 22500 },
  { ate: 3600000, nominal: 0.143, deduzir: 87300 },
  { ate: 4800000, nominal: 0.19, deduzir: 378000 },
];

export const ANEXO_III: FaixaSimples[] = [
  { ate: 180000, nominal: 0.06, deduzir: 0 },
  { ate: 360000, nominal: 0.112, deduzir: 9360 },
  { ate: 720000, nominal: 0.135, deduzir: 17640 },
  { ate: 1800000, nominal: 0.16, deduzir: 35640 },
  { ate: 3600000, nominal: 0.21, deduzir: 125640 },
  { ate: 4800000, nominal: 0.33, deduzir: 648000 },
];

export const ANEXO_V: FaixaSimples[] = [
  { ate: 180000, nominal: 0.155, deduzir: 0 },
  { ate: 360000, nominal: 0.18, deduzir: 4500 },
  { ate: 720000, nominal: 0.195, deduzir: 9900 },
  { ate: 1800000, nominal: 0.205, deduzir: 17100 },
  { ate: 3600000, nominal: 0.23, deduzir: 62100 },
  { ate: 4800000, nominal: 0.305, deduzir: 540000 },
];

export const SIMPLES = {
  /** Limite anual de receita bruta (EPP). */
  limiteAnual: 4800000,
  /** Limite anual do MEI. */
  limiteMei: 81000,
  /** Sublimite estadual para ICMS/ISS dentro do DAS. */
  sublimiteIcmsIss: 3600000,
  /**
   * Fator R: folha de pagamento dos últimos 12 meses ÷ RBT12.
   * >= 28% → Anexo III. < 28% → Anexo V.
   * Norma: LC 123/2006, art. 18, §5º-J e §5º-M.
   */
  fatorRCorte: 0.28,
  fonte: 'LC nº 123/2006 (redação da LC nº 155/2016), art. 18 e Anexos III e V',
} as const;

// ---------------------------------------------------------------------------
// 4. Lucro Presumido
// ---------------------------------------------------------------------------

/**
 * Lucro Presumido, serviços em geral.
 * Norma: Lei nº 9.249/1995 (presunção e alíquotas), Lei nº 9.718/1998 e
 * Lei nº 9.430/1996 (adicional trimestral de IRPJ).
 *
 * Alteração 2026: a LC nº 224/2025 majorou em 10% os percentuais de presunção
 * sobre a parcela da receita bruta anual que exceder R$ 5 milhões, para
 * serviços, 32% passa a 35,2% nessa parcela.
 */
export const LUCRO_PRESUMIDO = {
  presuncaoServicos: 0.32,
  presuncaoServicosMajorada: 0.352,
  limiteReceitaMajoracao: 5000000,
  irpj: 0.15,
  /** Adicional de 10% sobre o que exceder R$ 60.000 de base no trimestre. */
  irpjAdicional: 0.1,
  irpjAdicionalLimiteTrimestral: 60000,
  csll: 0.09,
  /** Regime cumulativo, sem direito a crédito. */
  pis: 0.0065,
  cofins: 0.03,
  /** ISS: competência municipal, de 2% a 5% (CF art. 156, §3º; LC 116/2003). */
  issMinimo: 0.02,
  issMaximo: 0.05,
  limiteReceitaAnual: 78000000,
  fonte: 'Leis nº 9.249/1995, 9.430/1996 e 9.718/1998; LC nº 224/2025 (majoração 2026)',
} as const;

// ---------------------------------------------------------------------------
// 5. Encargos e direitos trabalhistas (lado CLT)
// ---------------------------------------------------------------------------

/**
 * Direitos do empregado CLT que compõem a remuneração real além do salário.
 * Normas: CF/88 art. 7º; CLT arts. 129 e ss. (férias); Lei nº 4.090/1962 (13º);
 * Lei nº 8.036/1990 (FGTS).
 */
export const CLT = {
  /** Depósito mensal do FGTS pelo empregador. */
  fgts: 0.08,
  /** Multa rescisória sobre o saldo do FGTS na dispensa sem justa causa. */
  multaFgts: 0.4,
  /** Adicional constitucional de férias: 1/3. */
  tercoFerias: 1 / 3,
  /** 13º salário: uma remuneração adicional por ano. */
  decimoTerceiroPorAno: 1,
  fonte: 'CF/88 art. 7º; CLT arts. 129 e ss.; Lei nº 4.090/1962; Lei nº 8.036/1990',
} as const;

// ---------------------------------------------------------------------------
// 6. Reforma Tributária do consumo, ano-teste
// ---------------------------------------------------------------------------

/**
 * Em 2026 CBS (0,9%) e IBS (0,1%) são destacados no documento fiscal, mas o
 * contribuinte fica DISPENSADO do recolhimento se cumprir as obrigações
 * acessórias; eventual valor pago é compensado com PIS/COFINS.
 * Efeito prático em 2026: zero de carga adicional, por isso não entram no
 * cálculo, apenas no aviso ao usuário.
 *
 * Norma: EC nº 132/2023 e LC nº 214/2025.
 */
export const REFORMA_TRIBUTARIA_2026 = {
  cbsTeste: 0.009,
  ibsTeste: 0.001,
  recolhimentoDispensado: true,
  fonte: 'EC nº 132/2023; LC nº 214/2025',
} as const;
