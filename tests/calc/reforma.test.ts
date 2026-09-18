/**
 * Testes da calculadora da Reforma Tributária (IBS/CBS. LC 214/2025).
 * Executar: npm test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALIQUOTA_PADRAO_ESTIMADA,
  aliquotasDoAno,
  calcularOperacao,
  compararSistemas,
  CRONOGRAMA,
} from '../../src/lib/calc/reforma.ts';
import { round2 } from '../../src/lib/calc/format.ts';

// --- Alíquotas por ano -----------------------------------------------------

test('2026 usa as únicas alíquotas fixadas em norma: CBS 0,9% + IBS 0,1%', () => {
  const a = aliquotasDoAno(2026);
  assert.equal(a.cbs, 0.009);
  assert.equal(a.ibs, 0.001);
  assert.equal(a.fixadaEmNorma, true);
});

test('2027-2028: CBS de referência menos 0,1 p.p., IBS fixo em 0,1%', () => {
  for (const ano of [2027, 2028]) {
    const a = aliquotasDoAno(ano);
    assert.equal(round2(a.cbs * 1000) / 1000, round2((0.0921 - 0.001) * 1000) / 1000);
    assert.equal(a.ibs, 0.001);
    assert.equal(a.fixadaEmNorma, false);
  }
});

test('2029-2032: IBS cresce 1/10 por ano; 2033 é pleno', () => {
  const ibsRef = ALIQUOTA_PADRAO_ESTIMADA.total - ALIQUOTA_PADRAO_ESTIMADA.total * (ALIQUOTA_PADRAO_ESTIMADA.cbs / ALIQUOTA_PADRAO_ESTIMADA.total);
  assert.ok(Math.abs(aliquotasDoAno(2029).ibs - ibsRef * 0.1) < 1e-9);
  assert.ok(Math.abs(aliquotasDoAno(2032).ibs - ibsRef * 0.4) < 1e-9);
  assert.ok(Math.abs(aliquotasDoAno(2033).ibs - ibsRef) < 1e-9);
  // No regime pleno, CBS + IBS = alíquota-padrão estimada (27,91%).
  assert.ok(Math.abs(aliquotasDoAno(2033).total - ALIQUOTA_PADRAO_ESTIMADA.total) < 1e-9);
});

test('anos após 2033 mantêm o regime pleno', () => {
  assert.equal(aliquotasDoAno(2040).total, aliquotasDoAno(2033).total);
});

test('alíquota de referência customizada preserva a proporção CBS/IBS', () => {
  const a = aliquotasDoAno(2033, 0.265);
  assert.ok(Math.abs(a.total - 0.265) < 1e-9);
  const proporcao = ALIQUOTA_PADRAO_ESTIMADA.cbs / ALIQUOTA_PADRAO_ESTIMADA.total;
  assert.ok(Math.abs(a.cbs - 0.265 * proporcao) < 1e-9);
});

// --- Operação --------------------------------------------------------------

test('operação de R$ 30.000 no ano-teste: CBS 270 + IBS 30', () => {
  const r = calcularOperacao({ ano: 2026, valorOperacao: 30000, tratamento: 'padrao' });
  assert.equal(r.debitoCbs, 270);
  assert.equal(r.debitoIbs, 30);
  assert.equal(r.debitoTotal, 300);
  assert.equal(r.precoComImposto, 30300);
});

test('o imposto é por fora: preço final = valor + tributo', () => {
  const r = calcularOperacao({ ano: 2033, valorOperacao: 1000, tratamento: 'padrao' });
  assert.equal(r.precoComImposto, round2(1000 + r.debitoTotal));
  assert.equal(r.debitoTotal, round2(1000 * ALIQUOTA_PADRAO_ESTIMADA.total));
});

test('redução de 60% paga 40% da alíquota; de 30% paga 70%; zero paga nada', () => {
  const cheia = calcularOperacao({ ano: 2033, valorOperacao: 10000, tratamento: 'padrao' });
  const r60 = calcularOperacao({ ano: 2033, valorOperacao: 10000, tratamento: 'reduzida-60' });
  const r30 = calcularOperacao({ ano: 2033, valorOperacao: 10000, tratamento: 'reduzida-30' });
  const zero = calcularOperacao({ ano: 2033, valorOperacao: 10000, tratamento: 'zero' });

  assert.equal(r60.debitoTotal, round2(cheia.debitoTotal * 0.4));
  assert.equal(r30.debitoTotal, round2(cheia.debitoTotal * 0.7));
  assert.equal(zero.debitoTotal, 0);
  assert.equal(zero.precoComImposto, 10000);
});

test('créditos abatem o débito e o excedente vira crédito acumulado', () => {
  const r = calcularOperacao({
    ano: 2033,
    valorOperacao: 10000,
    tratamento: 'padrao',
    creditos: 1500,
  });
  assert.equal(r.aRecolher, round2(r.debitoTotal - 1500));
  assert.equal(r.creditoAcumulado, 0);

  const excesso = calcularOperacao({
    ano: 2033,
    valorOperacao: 1000,
    tratamento: 'padrao',
    creditos: 5000,
  });
  assert.equal(excesso.aRecolher, 0);
  assert.equal(excesso.creditoAcumulado, round2(5000 - excesso.debitoTotal));
});

test('a redução aplica-se igualmente à CBS e ao IBS', () => {
  const r = calcularOperacao({ ano: 2033, valorOperacao: 10000, tratamento: 'reduzida-60' });
  assert.equal(r.debitoCbs, round2(10000 * ALIQUOTA_PADRAO_ESTIMADA.cbs * 0.4));
});

// --- Comparador ------------------------------------------------------------

test('comparação preserva a receita líquida do vendedor', () => {
  const r = compararSistemas({
    precoAtual: 1000,
    regimePisCofins: 'nao-cumulativo',
    icms: 0.18,
    tratamento: 'padrao',
  });
  // Carga atual: 9,25% + 18% = 27,25% por dentro → R$ 272,50.
  assert.equal(r.cargaAtual, 272.5);
  assert.equal(r.receitaLiquida, 727.5);
  // Novo: 27,91% por fora sobre a receita líquida.
  assert.equal(r.tributoNovo, round2(727.5 * 0.2791));
  assert.equal(r.precoNovo, round2(727.5 + r.tributoNovo));
});

test('serviço de profissão regulamentada compara com a redução de 30%', () => {
  const r = compararSistemas({
    precoAtual: 10000,
    regimePisCofins: 'cumulativo',
    iss: 0.05,
    tratamento: 'reduzida-30',
  });
  // Atual: 3,65% + 5% = 8,65% → R$ 865. Receita líquida R$ 9.135.
  assert.equal(r.cargaAtual, 865);
  // Nova alíquota: 27,91% × 0,7 = 19,537%.
  assert.equal(r.tributoNovo, round2(9135 * 0.2791 * 0.7));
});

test('a diferença de carga bate com débito novo menos carga atual', () => {
  const r = compararSistemas({
    precoAtual: 5000,
    regimePisCofins: 'cumulativo',
    iss: 0.02,
    tratamento: 'padrao',
  });
  assert.equal(r.diferencaCarga, round2(r.tributoNovo - r.cargaAtual));
  assert.equal(r.diferencaPreco, round2(r.precoNovo - r.precoAtual));
});

// --- Cronograma ------------------------------------------------------------

test('o cronograma cobre 2026 a 2033 sem buracos', () => {
  const anos = CRONOGRAMA.map((f) => f.ano);
  assert.deepEqual(anos, [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]);
});

test('frações do IBS na transição: 0, 0, 0, 10%, 20%, 30%, 40%, 100%', () => {
  assert.deepEqual(
    CRONOGRAMA.map((f) => f.fracaoIbs),
    [0, 0, 0, 0.1, 0.2, 0.3, 0.4, 1],
  );
});
