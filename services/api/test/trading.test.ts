import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPrices,
  quoteBuy,
  quoteSell,
} from '@parity/shared';

describe('Trade flow math', () => {
  const base = { qYes: 0, qNo: 0, b: 1000 };

  it('buy YES costs between min and max trade bounds for 100 contracts', () => {
    const q = quoteBuy(base, 'YES', 100);
    assert.ok(q.costNotional >= 10);
    assert.ok(q.costNotional <= 50000);
  });

  it('settlement payout: 100 N per contract', () => {
    const qty = 1000;
    const buy = quoteBuy(base, 'YES', qty);
    const payout = qty * 100;
    assert.ok(payout > buy.costNotional);
  });

  it('sell reduces YES price', () => {
    const bought = quoteBuy(base, 'YES', 200);
    const sold = quoteSell(bought.newState, 'YES', 100);
    assert.ok(sold.newPrices.yesCents < bought.newPrices.yesCents);
  });
});
