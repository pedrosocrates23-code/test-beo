/**
 * Comparação CLT × PJ.
 *
 * A comparação honesta não é "salário líquido × faturamento". É preciso trazer
 * para a mesma base tudo que o CLT recebe além do salário (13º, terço de
 * férias, FGTS) e tudo que a PJ gasta para existir (DAS, contabilidade,
 * INSS do pró-labore), e reconhecer o que não tem preço na planilha
 * (estabilidade, seguro-desemprego, aviso prévio, licenças).
 */

import { CLT, INSS_EMPREGADO, SALARIO_MINIMO, SIMPLES } from './tabelas-2026.ts';
import { round2 } from './format.ts';
import { calcularSalarioLiquido, type ResultadoSalarioLiquido } from './irpf.ts';
import { calcularPj, type RegimePj, type ResultadoPj } from './pj.ts';

// ---------------------------------------------------------------------------
// Lado CLT
// ---------------------------------------------------------------------------

export interface EntradaClt {
  salarioBruto: number;
  dependentes?: number;
  /** Vale-refeição e vale-alimentação (opcional). */
  valeRefeicao?: number;
  /**
   * Vale-transporte (opcional). O empregador pode descontar do salário até 6%
   * do salário básico a título de coparticipação, de modo que só o excedente é
   * ganho líquido. Lei nº 7.418/1985, art. 4º, parágrafo único.
   */
  valeTransporte?: number;
  /** Plano de saúde custeado pelo empregador (opcional). */
  planoSaude?: number;
  /** Demais benefícios com valor em dinheiro (opcional). */
  outrosBeneficios?: number;
  /** Contar o depósito de FGTS como remuneração (é patrimônio do trabalhador). */
  incluirFgts?: boolean;
  /** Contar a provisão da multa de 40% (só se materializa em dispensa sem justa causa). */
  incluirMultaFgts?: boolean;
  outrosDescontos?: number;
}

/** Teto legal do desconto de coparticipação do vale-transporte. */
export const VALE_TRANSPORTE_COPARTICIPACAO = 0.06;

export interface DetalheBeneficios {
  valeRefeicao: number;
  valeTransporteBruto: number;
  /** Coparticipação descontada em folha, limitada a 6% do salário. */
  valeTransporteDesconto: number;
  valeTransporteLiquido: number;
  planoSaude: number;
  outros: number;
  totalMensal: number;
}

/**
 * Soma os benefícios opcionais, aplicando a coparticipação do vale-transporte.
 * Só o que excede o desconto de 6% é ganho real do trabalhador.
 */
export function somarBeneficios(entrada: EntradaClt): DetalheBeneficios {
  const salario = Math.max(0, entrada.salarioBruto);
  const valeRefeicao = Math.max(0, entrada.valeRefeicao ?? 0);
  const valeTransporteBruto = Math.max(0, entrada.valeTransporte ?? 0);
  const planoSaude = Math.max(0, entrada.planoSaude ?? 0);
  const outros = Math.max(0, entrada.outrosBeneficios ?? 0);

  const valeTransporteDesconto =
    valeTransporteBruto > 0
      ? round2(Math.min(valeTransporteBruto, salario * VALE_TRANSPORTE_COPARTICIPACAO))
      : 0;
  const valeTransporteLiquido = round2(valeTransporteBruto - valeTransporteDesconto);

  return {
    valeRefeicao,
    valeTransporteBruto,
    valeTransporteDesconto,
    valeTransporteLiquido,
    planoSaude,
    outros,
    totalMensal: round2(valeRefeicao + valeTransporteLiquido + planoSaude + outros),
  };
}

export interface ResultadoClt {
  mensal: ResultadoSalarioLiquido;
  beneficios: DetalheBeneficios;
  /** Mês de férias: salário + 1/3, tributado em conjunto. */
  liquidoFerias: number;
  /** 13º salário líquido (tributação exclusiva, INSS e IRRF próprios). */
  liquidoDecimoTerceiro: number;
  fgtsAnual: number;
  multaFgtsAnual: number;
  beneficiosAnuais: number;
  totalLiquidoAnual: number;
  /** Remuneração mensal equivalente: tudo do ano dividido por 12. */
  equivalenteMensal: number;
  /** Quanto o equivalente mensal supera o salário líquido "de contracheque". */
  ganhoSobreContracheque: number;
}

/**
 * Remuneração anual real do empregado CLT.
 *
 * Modelo do ano: 11 meses de salário + 1 mês de férias (salário + 1/3) + 13º.
 * O INSS incide sobre férias gozadas e sobre o terço constitucional
 * (STF, RE 1.072.485. Tema 985). O 13º tem tributação própria e separada.
 */
export function calcularClt(entrada: EntradaClt): ResultadoClt {
  const salario = Math.max(0, entrada.salarioBruto);
  const dependentes = entrada.dependentes ?? 0;
  const beneficios = somarBeneficios(entrada);

  const mensal = calcularSalarioLiquido({
    salarioBruto: salario,
    dependentes,
    outrosDescontos: entrada.outrosDescontos,
  });

  // Mês de férias: recebe salário + 1/3 no lugar do salário normal.
  const brutoFerias = salario * (1 + CLT.tercoFerias);
  const ferias = calcularSalarioLiquido({ salarioBruto: brutoFerias, dependentes });

  // 13º: tributação exclusiva na fonte, base própria.
  const decimo = calcularSalarioLiquido({ salarioBruto: salario, dependentes });

  // FGTS incide sobre salário, férias, terço e 13º.
  const baseFgtsAnual = salario * 12 + salario * CLT.tercoFerias + salario;
  const fgtsAnual = round2(baseFgtsAnual * CLT.fgts);
  const multaFgtsAnual = entrada.incluirMultaFgts ? round2(fgtsAnual * CLT.multaFgts) : 0;

  const beneficiosAnuais = round2(beneficios.totalMensal * 12);

  const totalLiquidoAnual = round2(
    mensal.liquido * 11 +
      ferias.liquido +
      decimo.liquido +
      beneficiosAnuais +
      (entrada.incluirFgts ? fgtsAnual : 0) +
      multaFgtsAnual,
  );

  const equivalenteMensal = round2(totalLiquidoAnual / 12);

  return {
    mensal,
    beneficios,
    liquidoFerias: ferias.liquido,
    liquidoDecimoTerceiro: decimo.liquido,
    fgtsAnual,
    multaFgtsAnual,
    beneficiosAnuais,
    totalLiquidoAnual,
    equivalenteMensal,
    ganhoSobreContracheque: round2(equivalenteMensal - mensal.liquido),
  };
}

/**
 * Custo do empregador com um CLT, visão da empresa.
 *
 * CPP de 20%, RAT (1% a 3%, conforme o CNAE, ajustável pelo FAP) e terceiros
 * (até 5,8%) NÃO são devidos sobre a folha de empresas do Simples Nacional nos
 * Anexos I, II, III e V, nesses casos a CPP está dentro do DAS.
 * Norma: Lei 8.212/1991, art. 22; LC 123/2006, art. 13, VI.
 */
export function calcularCustoEmpregador(params: {
  salarioBruto: number;
  cppDevida?: boolean;
  rat?: number;
  terceiros?: number;
  beneficiosMensais?: number;
}): {
  salario: number;
  cpp: number;
  rat: number;
  terceiros: number;
  fgts: number;
  provisaoDecimoTerceiro: number;
  provisaoFerias: number;
  beneficios: number;
  custoMensalTotal: number;
  multiplicador: number;
} {
  const salario = Math.max(0, params.salarioBruto);
  const cppDevida = params.cppDevida ?? false;
  const rat = cppDevida ? Math.max(0, params.rat ?? 0.02) : 0;
  const terceiros = cppDevida ? Math.max(0, params.terceiros ?? 0.058) : 0;
  const beneficios = Math.max(0, params.beneficiosMensais ?? 0);

  const cppValor = cppDevida ? salario * 0.2 : 0;
  const ratValor = salario * rat;
  const terceirosValor = salario * terceiros;
  const fgts = salario * CLT.fgts;
  const provisaoDecimoTerceiro = salario / 12;
  const provisaoFerias = (salario * (1 + CLT.tercoFerias)) / 12;

  const custoMensalTotal = round2(
    salario +
      cppValor +
      ratValor +
      terceirosValor +
      fgts +
      provisaoDecimoTerceiro +
      provisaoFerias +
      beneficios,
  );

  return {
    salario,
    cpp: round2(cppValor),
    rat: round2(ratValor),
    terceiros: round2(terceirosValor),
    fgts: round2(fgts),
    provisaoDecimoTerceiro: round2(provisaoDecimoTerceiro),
    provisaoFerias: round2(provisaoFerias),
    beneficios,
    custoMensalTotal,
    multiplicador: salario > 0 ? custoMensalTotal / salario : 0,
  };
}

// ---------------------------------------------------------------------------
// Lado PJ
// ---------------------------------------------------------------------------

export type EstrategiaProLabore = 'minimo' | 'fator-r' | 'fixo';

export interface EntradaPj {
  faturamentoMensal: number;
  regime: RegimePj;
  estrategiaProLabore: EstrategiaProLabore;
  /** Usado apenas quando a estratégia é `fixo`. */
  proLaboreFixo?: number;
  /** Contabilidade, certificado digital, emissor, contas da empresa. */
  custosOperacionais?: number;
  aliquotaIss?: number;
  dependentes?: number;
  rbt12?: number;
}

/** Pró-labore conforme a estratégia escolhida. */
export function definirProLabore(entrada: EntradaPj, faturamento?: number): number {
  const base = faturamento ?? entrada.faturamentoMensal;
  switch (entrada.estrategiaProLabore) {
    case 'minimo':
      return SALARIO_MINIMO;
    case 'fator-r':
      // Pró-labore de 28% do faturamento mantém o Fator R no corte do Anexo III.
      return round2(base * SIMPLES.fatorRCorte);
    case 'fixo':
      return Math.max(0, entrada.proLaboreFixo ?? SALARIO_MINIMO);
  }
}

export function calcularLadoPj(entrada: EntradaPj, faturamento?: number): ResultadoPj {
  const faturamentoMensal = Math.max(0, faturamento ?? entrada.faturamentoMensal);
  const proLabore = definirProLabore(entrada, faturamentoMensal);
  return calcularPj({
    regime: entrada.regime,
    faturamentoMensal,
    rbt12: entrada.rbt12 ?? faturamentoMensal * 12,
    folha12: proLabore * 12,
    proLabore,
    custosOperacionais: entrada.custosOperacionais,
    aliquotaIss: entrada.aliquotaIss,
    dependentes: entrada.dependentes,
  });
}

// ---------------------------------------------------------------------------
// Comparação
// ---------------------------------------------------------------------------

export interface ResultadoComparacao {
  clt: ResultadoClt;
  pj: ResultadoPj;
  proLaboreAplicado: number;
  /** Diferença mensal: PJ − CLT. Positivo significa PJ à frente. */
  diferencaMensal: number;
  diferencaAnual: number;
  vencedor: 'pj' | 'clt' | 'empate';
  /**
   * Faturamento mensal que a PJ precisa atingir para empatar com o pacote CLT.
   * `null` quando não há empate dentro do limite do Simples Nacional.
   */
  faturamentoEquivalente: number | null;
  /**
   * Reserva mensal que o PJ precisa fazer por conta própria para reproduzir
   * 13º + férias + terço, direitos que a PJ não tem.
   */
  reservaSugeridaPj: number;
  /** Contribuição mensal ao INSS necessária para manter o mesmo teto de benefício. */
  inssTetoReferencia: number;
}

export function compararCltPj(
  entradaClt: EntradaClt,
  entradaPj: EntradaPj,
): ResultadoComparacao {
  const clt = calcularClt(entradaClt);
  const pj = calcularLadoPj(entradaPj);
  const proLaboreAplicado = definirProLabore(entradaPj);

  const diferencaMensal = round2(pj.liquidoSocio - clt.equivalenteMensal);

  // A PJ precisa poupar do próprio bolso o equivalente a 13º + terço de férias:
  // 1,333 salário por ano ≈ 11,1% da retirada mensal.
  const reservaSugeridaPj = round2(
    (pj.liquidoSocio * (CLT.decimoTerceiroPorAno + CLT.tercoFerias)) / 12,
  );

  return {
    clt,
    pj,
    proLaboreAplicado,
    diferencaMensal,
    diferencaAnual: round2(diferencaMensal * 12),
    vencedor:
      Math.abs(diferencaMensal) < 1 ? 'empate' : diferencaMensal > 0 ? 'pj' : 'clt',
    faturamentoEquivalente: encontrarFaturamentoEquivalente(clt.equivalenteMensal, entradaPj),
    reservaSugeridaPj,
    inssTetoReferencia: INSS_EMPREGADO.descontoMaximo,
  };
}

/**
 * Menor faturamento mensal em que o líquido da PJ alcança o equivalente
 * mensal do CLT.
 *
 * ATENÇÃO, a função NÃO é monotônica. O IRRF de 10% da Lei 15.270/2025 incide
 * sobre o TOTAL dos dividendos do mês assim que eles passam de R$ 50.000, e não
 * apenas sobre o excedente. Isso cria um degrau: existe uma faixa em que faturar
 * mais deixa o sócio com menos no bolso. Por isso a busca é varredura grossa
 * (que atravessa o degrau) seguida de bisseção dentro do intervalo já monotônico.
 */
export function encontrarFaturamentoEquivalente(
  alvoLiquidoMensal: number,
  entradaPj: EntradaPj,
  tolerancia = 0.5,
): number | null {
  if (alvoLiquidoMensal <= 0) return 0;

  const tetoBusca = SIMPLES.limiteAnual / 12; // R$ 400.000/mês
  const passo = 250;

  const liquidoEm = (faturamento: number) =>
    calcularLadoPj(entradaPj, faturamento).liquidoSocio;

  let anterior = 0;

  for (let faturamento = passo; faturamento <= tetoBusca; faturamento += passo) {
    const liquido = liquidoEm(faturamento);
    if (liquido >= alvoLiquidoMensal) {
      // Alvo cruzado entre `anterior` e `faturamento`: trecho monotônico.
      let baixo = anterior;
      let alto = faturamento;
      for (let i = 0; i < 60; i++) {
        const meio = (baixo + alto) / 2;
        const meioLiquido = liquidoEm(meio);
        if (Math.abs(meioLiquido - alvoLiquidoMensal) <= tolerancia) return round2(meio);
        if (meioLiquido < alvoLiquidoMensal) baixo = meio;
        else alto = meio;
      }
      return round2(alto);
    }
    anterior = faturamento;
  }

  return null;
}

/**
 * Localiza o degrau dos dividendos: o intervalo de faturamento em que faturar
 * mais reduz o líquido do sócio, por efeito do IRRF de 10% sobre o total.
 * Devolve `null` quando a configuração não atinge o degrau.
 */
export function detectarDegrauDividendos(
  entradaPj: EntradaPj,
): { faturamentoAntes: number; liquidoAntes: number; faturamentoDepois: number; liquidoDepois: number } | null {
  const passo = 500;
  const tetoBusca = SIMPLES.limiteAnual / 12;
  let anterior = passo;
  let anteriorLiquido = calcularLadoPj(entradaPj, anterior).liquidoSocio;

  for (let faturamento = passo * 2; faturamento <= tetoBusca; faturamento += passo) {
    const liquido = calcularLadoPj(entradaPj, faturamento).liquidoSocio;
    if (liquido < anteriorLiquido) {
      return {
        faturamentoAntes: anterior,
        liquidoAntes: round2(anteriorLiquido),
        faturamentoDepois: faturamento,
        liquidoDepois: round2(liquido),
      };
    }
    anterior = faturamento;
    anteriorLiquido = liquido;
  }
  return null;
}
