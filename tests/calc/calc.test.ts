/**
 * Testes de conformidade legal.
 *
 * Cada assert abaixo trava um número que veio de norma publicada, não de
 * conveniência de implementação. Se um destes quebrar, ou a norma mudou ou o
 * cálculo está errado, nos dois casos, a correção começa em `tabelas-2026.ts`.
 *
 * Executar: npm test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { round2, parseInteiro, parseMoeda, parsePercentual } from '../../src/lib/calc/format.ts';
import {
  mascararInteiro,
  mascararMoeda,
  mascararPercentual,
  valorInicial,
} from '../../src/lib/calc/mascara.ts';
import {
  calcularInssEmpregado,
  calcularInssProLabore,
  calcularIrrf,
  calcularRedutor,
  calcularSalarioLiquido,
} from '../../src/lib/calc/irpf.ts';
import { calcularFatorR, calcularLucroPresumido, calcularSimples } from '../../src/lib/calc/pj.ts';
import {
  calcularClt,
  compararCltPj,
  detectarDegrauDividendos,
  encontrarFaturamentoEquivalente,
  somarBeneficios,
} from '../../src/lib/calc/clt-pj.ts';

// --- Arredondamento --------------------------------------------------------

test('round2 respeita o meio exato onde o float falharia', () => {
  assert.equal(round2(121.575), 121.58);
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(-2.345), -2.35);
});

test('parseMoeda aceita os formatos que o usuário realmente digita', () => {
  assert.equal(parseMoeda('5.000,00'), 5000);
  assert.equal(parseMoeda('5000,50'), 5000.5);
  assert.equal(parseMoeda('R$ 12.345,67'), 12345.67);
  assert.equal(parseMoeda('7350'), 7350);
  assert.equal(parseMoeda(''), 0);
});

// --- Máscaras --------------------------------------------------------------

/**
 * `Intl.NumberFormat` separa "R$" do número com espaço não separável (U+00A0),
 * não com espaço comum. Normalizar aqui deixa a asserção legível sem esconder
 * o formato real, que é o que o campo exibe.
 */
const semNbsp = (texto: string) => texto.replace(/ /g, ' ');

test('máscara de moeda cresce da direita para a esquerda, em centavos', () => {
  assert.equal(semNbsp(mascararMoeda('7')), 'R$ 0,07');
  assert.equal(semNbsp(mascararMoeda('700000')), 'R$ 7.000,00');
  assert.equal(semNbsp(mascararMoeda('R$ 7.000,000')), 'R$ 70.000,00');
  assert.equal(mascararMoeda(''), '');
  assert.equal(mascararMoeda('abc'), '');
});

test('máscara de percentual e de inteiro', () => {
  assert.equal(mascararPercentual('250'), '2,50%');
  assert.equal(mascararPercentual('5'), '0,05%');
  assert.equal(mascararInteiro('007'), '7');
  assert.equal(mascararInteiro('12x'), '12');
  assert.equal(mascararInteiro(''), '');
});

test('o que a máscara escreve, o parser lê de volta sem perda', () => {
  for (const valor of [0.07, 1621, 5000, 13000.55, 8475.55, 1234567.89]) {
    const texto = valorInicial('moeda', valor);
    assert.equal(parseMoeda(texto), valor, `falhou em ${texto}`);
  }
  assert.equal(parsePercentual(valorInicial('percentual', 2)), 0.02);
  assert.equal(parsePercentual(valorInicial('percentual', 4.5)), 0.045);
  assert.equal(parseInteiro(valorInicial('inteiro', 3)), 3);
});

test('digitar e mascarar em sequência é estável', () => {
  // Simula o usuário digitando "13000" no campo de faturamento.
  let campo = '';
  for (const tecla of '1300000') campo = mascararMoeda(campo + tecla);
  assert.equal(semNbsp(campo), 'R$ 13.000,00');
  assert.equal(parseMoeda(campo), 13000);
});

// --- INSS ------------------------------------------------------------------

test('INSS no salário mínimo: 7,5% de R$ 1.621,00 = R$ 121,58', () => {
  assert.equal(calcularInssEmpregado(1621).total, 121.58);
});

test('INSS no teto: desconto máximo de R$ 988,09 (Portaria MPS/MF 13/2026)', () => {
  assert.equal(calcularInssEmpregado(8475.55).total, 988.09);
});

test('INSS acima do teto não aumenta', () => {
  assert.equal(calcularInssEmpregado(50000).total, 988.09);
  assert.equal(calcularInssEmpregado(50000).atingiuTeto, true);
});

test('INSS é progressivo, não por faixa cheia', () => {
  // R$ 3.000: 7,5% até 1.621 + 9% até 2.902,84 + 12% no restante.
  const esperado = 1621 * 0.075 + (2902.84 - 1621) * 0.09 + (3000 - 2902.84) * 0.12;
  assert.equal(calcularInssEmpregado(3000).total, round2(esperado));
});

test('INSS do pró-labore: 11% limitado ao teto', () => {
  assert.equal(calcularInssProLabore(5000), 550);
  assert.equal(calcularInssProLabore(20000), round2(8475.55 * 0.11));
});

// --- IRRF e redutor da Lei 15.270/2025 -------------------------------------

test('redutor zera exatamente em R$ 7.350,00', () => {
  assert.equal(calcularRedutor(7350), 0);
  assert.equal(calcularRedutor(8000), 0);
  assert.ok(calcularRedutor(6000) > 0);
});

test('redutor em R$ 6.000 = R$ 179,75', () => {
  assert.equal(calcularRedutor(6000), 179.75);
});

test('salário de R$ 5.000 fica isento de IRRF', () => {
  const r = calcularSalarioLiquido({ salarioBruto: 5000 });
  assert.equal(r.ir.irrf, 0);
  assert.equal(r.ir.isento, true);
});

test('abaixo de R$ 5.000 também fica isento', () => {
  for (const bruto of [2500, 3200, 4000, 4500, 4999]) {
    assert.equal(
      calcularSalarioLiquido({ salarioBruto: bruto }).ir.irrf,
      0,
      `esperava isenção em R$ ${bruto}`,
    );
  }
});

test('acima de R$ 7.350 o redutor não existe mais e o imposto é o da tabela', () => {
  const r = calcularSalarioLiquido({ salarioBruto: 10000 });
  assert.equal(r.ir.redutor, 0);
  assert.equal(r.ir.irrf, r.ir.impostoApurado);
  assert.ok(r.ir.irrf > 0);
});

test('o cálculo escolhe o desconto mais vantajoso ao contribuinte', () => {
  // Salário baixo: INSS é menor que o desconto simplificado de R$ 607,20.
  const baixo = calcularIrrf({ rendimentoBruto: 3000, inss: 246.34 });
  assert.equal(baixo.modeloUsado, 'simplificado');

  // Salário alto com dependentes: deduções legais superam o simplificado.
  const alto = calcularIrrf({ rendimentoBruto: 15000, inss: 988.09, dependentes: 3 });
  assert.equal(alto.modeloUsado, 'legal');
});

test('dependentes reduzem o imposto devido', () => {
  const sem = calcularSalarioLiquido({ salarioBruto: 12000 }).ir.irrf;
  const com = calcularSalarioLiquido({ salarioBruto: 12000, dependentes: 2 }).ir.irrf;
  assert.ok(com < sem);
});

test('IRRF nunca é negativo', () => {
  for (let bruto = 0; bruto <= 8000; bruto += 137) {
    assert.ok(calcularSalarioLiquido({ salarioBruto: bruto }).ir.irrf >= 0);
  }
});

// --- Simples Nacional ------------------------------------------------------

test('Anexo III, RBT12 de R$ 360.000: alíquota efetiva de 8,60%', () => {
  const r = calcularSimples({ receitaMensal: 30000, rbt12: 360000, anexo: 'III' });
  assert.equal(round2(r.aliquotaEfetiva * 100), 8.6);
  assert.equal(r.dasMensal, 2580);
});

test('Anexo V é mais caro que o Anexo III na mesma receita', () => {
  const iii = calcularSimples({ receitaMensal: 20000, rbt12: 240000, anexo: 'III' });
  const v = calcularSimples({ receitaMensal: 20000, rbt12: 240000, anexo: 'V' });
  assert.ok(v.dasMensal > iii.dasMensal);
});

test('empresa nova (RBT12 zero) usa a alíquota nominal da 1ª faixa', () => {
  const r = calcularSimples({ receitaMensal: 10000, rbt12: 0, anexo: 'III' });
  assert.equal(r.aliquotaEfetiva, 0.06);
  assert.equal(r.dasMensal, 600);
});

test('Fator R: corte em 28% define Anexo III ou V', () => {
  assert.equal(calcularFatorR(28000, 100000).anexo, 'III');
  assert.equal(calcularFatorR(27999, 100000).anexo, 'V');
  assert.equal(calcularFatorR(20000, 100000).folhaFaltante, 8000);
});

// --- Lucro Presumido -------------------------------------------------------

test('Lucro Presumido de serviços: R$ 100 mil/mês, ISS 2%', () => {
  const r = calcularLucroPresumido({ receitaMensal: 100000, aliquotaIss: 0.02 });
  // Base anual: 1.200.000 × 32% = 384.000
  assert.equal(r.baseAnual, 384000);
  assert.equal(r.irpj, round2((384000 * 0.15) / 12)); // 4.800/mês
  assert.equal(r.irpjAdicional, round2(((384000 - 240000) * 0.1) / 12)); // 1.200/mês
  assert.equal(r.csll, round2((384000 * 0.09) / 12)); // 2.880/mês
  assert.equal(r.pis, 650);
  assert.equal(r.cofins, 3000);
  assert.equal(r.iss, 2000);
  assert.equal(r.totalMensal, 14530);
});

test('presunção majorada de 35,2% só atinge a receita anual acima de R$ 5 mi', () => {
  const abaixo = calcularLucroPresumido({ receitaMensal: 400000, aliquotaIss: 0.02 });
  assert.equal(abaixo.houveMajoracao, false);
  assert.equal(round2(abaixo.presuncaoAplicada), 0.32);

  const acima = calcularLucroPresumido({ receitaMensal: 600000, aliquotaIss: 0.02 });
  assert.equal(acima.houveMajoracao, true);
  assert.ok(acima.presuncaoAplicada > 0.32 && acima.presuncaoAplicada < 0.352);
});

// --- CLT -------------------------------------------------------------------

test('o pacote CLT vale mais que o contracheque', () => {
  const r = calcularClt({ salarioBruto: 8000, incluirFgts: true });
  assert.ok(r.equivalenteMensal > r.mensal.liquido);
  assert.ok(r.ganhoSobreContracheque > 0);
});

test('FGTS anual incide sobre salário, terço de férias e 13º', () => {
  const r = calcularClt({ salarioBruto: 3000, incluirFgts: true });
  const baseEsperada = 3000 * 12 + 3000 / 3 + 3000;
  assert.equal(r.fgtsAnual, round2(baseEsperada * 0.08));
});

test('vale-transporte: só o que excede a coparticipação de 6% é ganho real', () => {
  // Salário de R$ 5.000 permite desconto de até R$ 300. Um VT de R$ 1.000
  // resulta em R$ 700 líquidos.
  const b = somarBeneficios({ salarioBruto: 5000, valeTransporte: 1000 });
  assert.equal(b.valeTransporteDesconto, 300);
  assert.equal(b.valeTransporteLiquido, 700);
  assert.equal(b.totalMensal, 700);
});

test('vale-transporte menor que os 6% é descontado só até o valor do próprio vale', () => {
  const b = somarBeneficios({ salarioBruto: 10000, valeTransporte: 200 });
  assert.equal(b.valeTransporteDesconto, 200);
  assert.equal(b.valeTransporteLiquido, 0);
});

test('benefícios opcionais somam sem quebrar quando ausentes', () => {
  assert.equal(somarBeneficios({ salarioBruto: 5000 }).totalMensal, 0);
  assert.equal(
    somarBeneficios({
      salarioBruto: 7000,
      valeRefeicao: 600,
      planoSaude: 300,
      outrosBeneficios: 500,
    }).totalMensal,
    1400,
  );
});

test('multa de 40% só entra quando pedida', () => {
  assert.equal(calcularClt({ salarioBruto: 5000 }).multaFgtsAnual, 0);
  assert.ok(calcularClt({ salarioBruto: 5000, incluirMultaFgts: true }).multaFgtsAnual > 0);
});

// --- Comparação CLT × PJ ---------------------------------------------------

test('comparação devolve os dois lados e um vencedor coerente', () => {
  const r = compararCltPj(
    { salarioBruto: 10000, incluirFgts: true },
    {
      faturamentoMensal: 12000,
      regime: 'simples-auto',
      estrategiaProLabore: 'minimo',
      custosOperacionais: 300,
    },
  );

  assert.ok(r.clt.equivalenteMensal > 0);
  assert.ok(r.pj.liquidoSocio > 0);
  assert.equal(
    r.vencedor,
    Math.abs(r.diferencaMensal) < 1 ? 'empate' : r.diferencaMensal > 0 ? 'pj' : 'clt',
  );
  assert.equal(r.diferencaAnual, round2(r.diferencaMensal * 12));
});

test('o faturamento equivalente realmente empata os dois lados', () => {
  const entradaPj = {
    faturamentoMensal: 10000,
    regime: 'simples-iii' as const,
    estrategiaProLabore: 'minimo' as const,
    custosOperacionais: 300,
  };
  const clt = calcularClt({ salarioBruto: 9000, incluirFgts: true });
  const alvo = clt.equivalenteMensal;

  const faturamento = encontrarFaturamentoEquivalente(alvo, entradaPj);
  assert.ok(faturamento !== null);

  const comparacao = compararCltPj(
    { salarioBruto: 9000, incluirFgts: true },
    { ...entradaPj, faturamentoMensal: faturamento! },
  );
  assert.ok(
    Math.abs(comparacao.diferencaMensal) <= 1,
    `esperava empate, diferença foi ${comparacao.diferencaMensal}`,
  );
});

test('abaixo do degrau dos dividendos, o líquido da PJ cresce com o faturamento', () => {
  const entrada = {
    faturamentoMensal: 0,
    regime: 'simples-iii' as const,
    estrategiaProLabore: 'minimo' as const,
  };
  let anterior = -1;
  // R$ 50.000 é o limite mensal de dividendos isentos: até ali a curva é limpa.
  for (let fat = 2000; fat <= 50000; fat += 2000) {
    const r = compararCltPj({ salarioBruto: 1 }, { ...entrada, faturamentoMensal: fat });
    assert.ok(r.pj.liquidoSocio > anterior, `quebrou em R$ ${fat}`);
    anterior = r.pj.liquidoSocio;
  }
});

test('o IRRF de 10% sobre o total cria um degrau: faturar mais rende menos', () => {
  // Não é defeito de cálculo, é o desenho da Lei 15.270/2025. Passando de
  // R$ 50.000 de dividendos no mês, os 10% incidem sobre TUDO, não só sobre o
  // excedente. A calculadora precisa mostrar isso, não esconder.
  const degrau = detectarDegrauDividendos({
    faturamentoMensal: 0,
    regime: 'simples-iii',
    estrategiaProLabore: 'minimo',
  });

  assert.ok(degrau !== null, 'o degrau dos dividendos deveria existir');
  assert.ok(degrau!.liquidoDepois < degrau!.liquidoAntes);
  assert.ok(degrau!.faturamentoDepois > degrau!.faturamentoAntes);
});

test('dividendos acima de R$ 50 mil/mês sofrem IRRF de 10% sobre o total', () => {
  const r = compararCltPj(
    { salarioBruto: 1 },
    {
      faturamentoMensal: 80000,
      regime: 'simples-iii',
      estrategiaProLabore: 'minimo',
    },
  );
  if (r.pj.retirada.dividendos > 50000) {
    assert.equal(r.pj.retirada.alertaDividendos, true);
    assert.equal(
      r.pj.retirada.irrfDividendos,
      round2(r.pj.retirada.dividendos * 0.1),
    );
  }
});
