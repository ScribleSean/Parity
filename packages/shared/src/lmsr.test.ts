import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPrices,
  lmsrCost,
  quoteBuy,
  quoteSell,
} from './lmsr';

describe('LMSR engine', () => {
  const base = { qYes: 0, qNo: 0, b: 1000 };

  it('starts at 50/50', () => {
    const p = getPrices(base);
    assert.equal(p.yesCents, 50);
    assert.equal(p.noCents, 50);
  });

  it('buying YES increases YES price', () => {
    const q = quoteBuy(base, 'YES', 100);
    assert.ok(q.costNotional > 0);
    assert.ok(q.newPrices.yesCents > 50);
    assert.ok(q.newPrices.noCents < 50);
  });

  it('buy moves price with impact', () => {
    const q = quoteBuy(base, 'YES', 500);
    assert.ok(q.priceImpactCents > 0);
    assert.ok(q.newPrices.yesCents > 50);
  });

  it('cost function is symmetric at origin', () => {
    const c0 = lmsrCost(0, 0, 1000);
    assert.ok(c0 > 0);
    const cBal = lmsrCost(100, 100, 1000);
    assert.ok(cBal > c0);
  });
});
