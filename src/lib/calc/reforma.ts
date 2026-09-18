/**
 * Reforma Tributária do consumo. IBS e CBS (Regime Geral).
 *
 * Normas: EC nº 132/2023 (ADCT arts. 124 a 133), LC nº 214/2025 (lei geral do
 * IBS, da CBS e do Imposto Seletivo) e LC nº 227/2026 (Comitê Gestor do IBS).
 *
 * HONESTIDADE DO CÁLCULO: as alíquotas de 2026 (CBS 0,9% + IBS 0,1%) são as
 * únicas FIXADAS em norma. A alíquota-padrão do regime pleno é ESTIMATIVA
 * oficial (~27,91%), o cálculo da alíquota de referência da CBS para 2027
 * será homologado pelo TCU e encaminhado ao Senado até 30/10/2026 (prazo
 * prorrogado em 45 dias, cf. Resolução CGIBS nº 14/2026). Toda função aqui
 * aceita alíquota customizada e o site marca o padrão como estimativa.
 *
 * Última verificação das fontes: 04/08/2026.
 */

import { round2 } from './format.ts';

// ---------------------------------------------------------------------------
// 1. Alíquotas
// ---------------------------------------------------------------------------

/** Ano-teste, únicos percentuais fixados em norma (ADCT art. 125; LC 214/2025). */
export const ANO_TESTE_2026 = {
  cbs: 0.009,
  ibs: 0.001,
  /** Cumprindo as obrigações acessórias, o recolhimento é dispensado. */
  recolhimentoDispensavel: true,
  /** O que for recolhido compensa com PIS/COFINS. */
  compensavelComPisCofins: true,
  fonte: 'EC 132/2023, ADCT art. 125; LC 214/2025',
} as const;

/**
 * Alíquota-padrão ESTIMADA do regime pleno.
 * IBS 18,7% + CBS 9,21% = 27,91%, números usados pelo próprio Comitê Gestor
 * do IBS na Resolução CGIBS nº 14, de 29/07/2026 (DOU 31/07/2026), alinhados
 * às projeções da Secretaria Extraordinária da Reforma Tributária (SERT/MF).
 */
export const ALIQUOTA_PADRAO_ESTIMADA = {
  total: 0.2791,
  ibs: 0.187,
  cbs: 0.0921,
  /** Estimativa inicial da SERT antes da regulamentação. */
  estimativaInicialSert: 0.265,
  fonte: 'Resolução CGIBS nº 14/2026, Anexo, Quadro 2; projeções SERT/MF',
} as const;

/** Proporção IBS estadual/municipal no ano de estreia (ADCT art. 127). */
export const IBS_2027 = {
  estadual: 0.0005,
  municipal: 0.0005,
  total: 0.001,
  fonte: 'EC 132/2023, ADCT art. 127; Resolução CGIBS nº 14/2026',
} as const;

// ---------------------------------------------------------------------------
// 2. Tratamentos favorecidos (LC 214/2025)
// ---------------------------------------------------------------------------

export type Tratamento = 'padrao' | 'reduzida-30' | 'reduzida-60' | 'zero';

export interface InfoTratamento {
  rotulo: string;
  /** Fração da alíquota-padrão que é CORTADA. */
  reducao: number;
  exemplos: string;
  fonte: string;
}

export const TRATAMENTOS: Record<Tratamento, InfoTratamento> = {
  padrao: {
    rotulo: 'Alíquota padrão',
    reducao: 0,
    exemplos: 'Regra geral: comércio, indústria e serviços sem tratamento favorecido.',
    fonte: 'LC 214/2025, regime regular',
  },
  'reduzida-30': {
    rotulo: 'Redução de 30%',
    reducao: 0.3,
    exemplos:
      'Serviços de 18 profissões intelectuais regulamentadas: advogados, contadores, engenheiros, arquitetos, médicos autônomos e outras.',
    fonte: 'LC 214/2025, art. 127',
  },
  'reduzida-60': {
    rotulo: 'Redução de 60%',
    reducao: 0.6,
    exemplos:
      'Serviços de saúde e de educação, medicamentos, dispositivos médicos, alimentos destinados ao consumo humano, produtos agropecuários e insumos agrícolas, produções artísticas e culturais.',
    fonte: 'LC 214/2025, arts. 128 a 143 e anexos',
  },
  zero: {
    rotulo: 'Alíquota zero',
    reducao: 1,
    exemplos:
      'Cesta básica nacional (Anexo I da LC 214/2025), hortifrutigranjeiros e ovos, medicamentos de lista específica, entre outros.',
    fonte: 'LC 214/2025, arts. 144 e ss. e Anexo I',
  },
};

// ---------------------------------------------------------------------------
// 3. Cronograma de transição (EC 132/2023)
// ---------------------------------------------------------------------------

export interface FaseAno {
  ano: number;
  titulo: string;
  /** Fração da alíquota de referência do IBS efetivamente cobrada. */
  fracaoIbs: number;
  /** CBS cheia? (2027-2028 tem redução de 0,1 p.p.) */
  cbsPlena: boolean;
  notas: string[];
}

export const CRONOGRAMA: FaseAno[] = [
  {
    ano: 2026,
    titulo: 'Ano-teste',
    fracaoIbs: 0,
    cbsPlena: false,
    notas: [
      'CBS 0,9% e IBS 0,1% destacados no documento fiscal.',
      'Cumprindo as obrigações acessórias, o recolhimento é dispensado; o que for pago compensa com PIS/COFINS.',
      'Carga adicional efetiva: zero.',
    ],
  },
  {
    ano: 2027,
    titulo: 'CBS plena e Imposto Seletivo',
    fracaoIbs: 0,
    cbsPlena: true,
    notas: [
      'PIS e COFINS são extintos; a CBS entra na alíquota de referência, reduzida em 0,1 p.p. em 2027 e 2028.',
      'IBS segue em 0,1% (0,05% estadual + 0,05% municipal).',
      'IPI zerado, exceto Zona Franca de Manaus. Começa o Imposto Seletivo.',
    ],
  },
  {
    ano: 2028,
    titulo: 'Consolidação da CBS',
    fracaoIbs: 0,
    cbsPlena: true,
    notas: ['Mesma configuração de 2027: CBS de referência (−0,1 p.p.) e IBS de 0,1%.'],
  },
  {
    ano: 2029,
    titulo: 'Transição do IBS: 10%',
    fracaoIbs: 0.1,
    cbsPlena: true,
    notas: ['IBS cobrado a 1/10 da referência; ICMS e ISS reduzidos a 9/10 das alíquotas atuais.'],
  },
  {
    ano: 2030,
    titulo: 'Transição do IBS: 20%',
    fracaoIbs: 0.2,
    cbsPlena: true,
    notas: ['IBS a 2/10 da referência; ICMS e ISS a 8/10.'],
  },
  {
    ano: 2031,
    titulo: 'Transição do IBS: 30%',
    fracaoIbs: 0.3,
    cbsPlena: true,
    notas: ['IBS a 3/10 da referência; ICMS e ISS a 7/10.'],
  },
  {
    ano: 2032,
    titulo: 'Transição do IBS: 40%',
    fracaoIbs: 0.4,
    cbsPlena: true,
    notas: ['IBS a 4/10 da referência; ICMS e ISS a 6/10.'],
  },
  {
    ano: 2033,
    titulo: 'Regime pleno',
    fracaoIbs: 1,
    cbsPlena: true,
    notas: ['ICMS e ISS extintos. IBS e CBS integrais: o novo sistema opera sozinho.'],
  },
];

// ---------------------------------------------------------------------------
// 4. Cashback (LC 214/2025, arts. 112 e ss.)
// ---------------------------------------------------------------------------

export const CASHBACK = {
  /** Requisitos: CadÚnico + renda familiar per capita até meio salário mínimo. */
  requisito: 'Família inscrita no CadÚnico com renda per capita de até meio salário mínimo',
  /** Devolução em serviços essenciais domésticos e GLP até 13 kg. */
  essenciais: { cbs: 1.0, ibs: 0.2 },
  itensEssenciais:
    'Energia elétrica residencial, água e esgoto, gás encanado, botijão de GLP de até 13 kg e telecomunicações',
  /** Demais aquisições. */
  geral: { cbs: 0.2, ibs: 0.2 },
  fonte: 'LC 214/2025, arts. 112 e ss.',
} as const;

// ---------------------------------------------------------------------------
// 5. Motor de cálculo
// ---------------------------------------------------------------------------

export interface AliquotasAno {
  ano: number;
  cbs: number;
  ibs: number;
  total: number;
  fase: FaseAno;
  /** True quando o ano usa alíquota fixada em norma (só 2026). */
  fixadaEmNorma: boolean;
}

/**
 * Alíquotas vigentes (ou estimadas) em cada ano da transição.
 * `aliquotaRef` permite simular com outra alíquota-padrão total; a divisão
 * IBS/CBS mantém a proporção oficial da estimativa.
 */
export function aliquotasDoAno(
  ano: number,
  aliquotaRefTotal: number = ALIQUOTA_PADRAO_ESTIMADA.total,
): AliquotasAno {
  const fase =
    CRONOGRAMA.find((f) => f.ano === ano) ?? CRONOGRAMA[CRONOGRAMA.length - 1]!;

  if (fase.ano === 2026) {
    return {
      ano: 2026,
      cbs: ANO_TESTE_2026.cbs,
      ibs: ANO_TESTE_2026.ibs,
      total: ANO_TESTE_2026.cbs + ANO_TESTE_2026.ibs,
      fase,
      fixadaEmNorma: true,
    };
  }

  const proporcaoCbs = ALIQUOTA_PADRAO_ESTIMADA.cbs / ALIQUOTA_PADRAO_ESTIMADA.total;
  const cbsRef = aliquotaRefTotal * proporcaoCbs;
  const ibsRef = aliquotaRefTotal - cbsRef;

  // 2027-2028: CBS de referência menos 0,1 p.p.; IBS fixo em 0,1%.
  const emEstreia = fase.ano === 2027 || fase.ano === 2028;
  const cbs = emEstreia ? Math.max(0, cbsRef - 0.001) : cbsRef;
  const ibs = emEstreia ? IBS_2027.total : ibsRef * fase.fracaoIbs;

  return { ano: fase.ano, cbs, ibs, total: cbs + ibs, fase, fixadaEmNorma: false };
}

export interface EntradaOperacao {
  ano: number;
  /** Valor da operação SEM IBS/CBS, o imposto é "por fora". */
  valorOperacao: number;
  tratamento: Tratamento;
  /** IBS/CBS suportados nas aquisições do período (crédito amplo). */
  creditos?: number;
  /** Simular outra alíquota-padrão total (fração, ex.: 0.28). */
  aliquotaRefTotal?: number;
}

export interface ResultadoOperacao {
  aliquotas: AliquotasAno;
  tratamento: InfoTratamento;
  /** Alíquota após a redução do tratamento. */
  aliquotaAplicada: { cbs: number; ibs: number; total: number };
  valorOperacao: number;
  debitoCbs: number;
  debitoIbs: number;
  debitoTotal: number;
  /** Preço final: valor da operação + tributo por fora. */
  precoComImposto: number;
  creditos: number;
  /** Débito do período menos créditos, nunca negativo. */
  aRecolher: number;
  /** Crédito excedente que fica acumulado para períodos seguintes. */
  creditoAcumulado: number;
}

/**
 * Operação no regime regular: débito "por fora" sobre o valor da operação,
 * menos os créditos das aquisições (não cumulatividade plena, LC 214/2025).
 */
export function calcularOperacao(entrada: EntradaOperacao): ResultadoOperacao {
  const aliquotas = aliquotasDoAno(entrada.ano, entrada.aliquotaRefTotal);
  const tratamento = TRATAMENTOS[entrada.tratamento];
  const fator = 1 - tratamento.reducao;

  const valor = Math.max(0, entrada.valorOperacao);
  const creditos = Math.max(0, entrada.creditos ?? 0);

  const aliquotaCbs = aliquotas.cbs * fator;
  const aliquotaIbs = aliquotas.ibs * fator;

  const debitoCbs = round2(valor * aliquotaCbs);
  const debitoIbs = round2(valor * aliquotaIbs);
  const debitoTotal = round2(debitoCbs + debitoIbs);

  const saldo = debitoTotal - creditos;

  return {
    aliquotas,
    tratamento,
    aliquotaAplicada: { cbs: aliquotaCbs, ibs: aliquotaIbs, total: aliquotaCbs + aliquotaIbs },
    valorOperacao: valor,
    debitoCbs,
    debitoIbs,
    debitoTotal,
    precoComImposto: round2(valor + debitoTotal),
    creditos,
    aRecolher: round2(Math.max(0, saldo)),
    creditoAcumulado: round2(Math.max(0, -saldo)),
  };
}

// ---------------------------------------------------------------------------
// 6. Comparador: sistema atual × regime pleno
// ---------------------------------------------------------------------------

export interface EntradaComparacao {
  /** Preço de venda atual, com os tributos de hoje embutidos. */
  precoAtual: number;
  /** 'cumulativo' = PIS/COFINS 3,65%; 'nao-cumulativo' = 9,25%. */
  regimePisCofins: 'cumulativo' | 'nao-cumulativo';
  /** Alíquota de ICMS embutida no preço (fração). Zero para serviços puros. */
  icms?: number;
  /** Alíquota de ISS embutida no preço (fração). Zero para mercadorias. */
  iss?: number;
  tratamento: Tratamento;
  aliquotaRefTotal?: number;
}

export const PIS_COFINS_ATUAL = {
  cumulativo: 0.0365,
  naoCumulativo: 0.0925,
  fonte: 'Leis nº 9.718/1998, 10.637/2002 e 10.833/2003',
} as const;

export interface ResultadoComparacao {
  precoAtual: number;
  cargaAtual: number;
  aliquotaAtualEfetiva: number;
  /** O que sobra do preço atual depois dos tributos de hoje: a receita própria. */
  receitaLiquida: number;
  aliquotaNova: number;
  tributoNovo: number;
  /** Receita própria + IBS/CBS por fora, mantida a margem do vendedor. */
  precoNovo: number;
  diferencaPreco: number;
  diferencaCarga: number;
}

/**
 * Compara a carga da operação no sistema atual com o regime pleno (2033).
 *
 * Método: extrai do preço atual os tributos por dentro (PIS/COFINS + ICMS ou
 * ISS), preservando a receita líquida do vendedor; sobre essa receita aplica
 * IBS/CBS por fora. É uma comparação de OPERAÇÃO ISOLADA, não captura o
 * ganho de crédito amplo ao longo da cadeia, que tende a reduzir a carga real.
 */
export function compararSistemas(entrada: EntradaComparacao): ResultadoComparacao {
  const preco = Math.max(0, entrada.precoAtual);
  const pisCofins =
    entrada.regimePisCofins === 'cumulativo'
      ? PIS_COFINS_ATUAL.cumulativo
      : PIS_COFINS_ATUAL.naoCumulativo;
  const icms = Math.max(0, entrada.icms ?? 0);
  const iss = Math.max(0, entrada.iss ?? 0);

  const aliquotaAtual = pisCofins + icms + iss;
  const cargaAtual = round2(preco * aliquotaAtual);
  const receitaLiquida = round2(preco - cargaAtual);

  const ref = entrada.aliquotaRefTotal ?? ALIQUOTA_PADRAO_ESTIMADA.total;
  const aliquotaNova = ref * (1 - TRATAMENTOS[entrada.tratamento].reducao);
  const tributoNovo = round2(receitaLiquida * aliquotaNova);
  const precoNovo = round2(receitaLiquida + tributoNovo);

  return {
    precoAtual: preco,
    cargaAtual,
    aliquotaAtualEfetiva: preco > 0 ? cargaAtual / preco : 0,
    receitaLiquida,
    aliquotaNova,
    tributoNovo,
    precoNovo,
    diferencaPreco: round2(precoNovo - preco),
    diferencaCarga: round2(tributoNovo - cargaAtual),
  };
}
