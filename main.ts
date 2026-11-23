// Pullback swing trader for the cbBTC/USDC 24h race (agent-fun/bars-replay/v1).
//
// Idea, in one paragraph: one-minute cbBTC prices on this pool mean-revert in
// short bursts around a drifting level — a sharp pullback below the recent high
// is usually followed by a recovery of at least the same size, while a full
// round trip costs roughly 45 bps in fees, slippage and pool impact, so only
// pullbacks clearly larger than that cost are worth buying. The bot therefore
// buys 100% of cash when the close prints at least 1.10% below the highest
// close of the last 90 bars, sells the whole position at +1.80% from its fill
// price, cuts it at -1.20%, or exits after 240 bars if neither fired. If it
// has sat flat for 360 bars with no trade at all it relaxes the entry to a
// 0.70% pullback, so a quiet window still produces at least one trade (the
// guardrail needs one) instead of holding cash for 24 hours.
//
// Everything is integer math on the raw bar prices (BigInt), so two runs on
// the same bars answer byte for byte the same. No clock, no environment, no
// randomness: the only inputs are the hello and the batches the harness sends.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// Entry: close at least this many bps below the rolling 90-bar high.
const DIP_BPS = 110n;
// Relaxed entry after sitting flat this many bars with no filled trade.
const PATIENCE_BARS = 360;
const RELAXED_DIP_BPS = 70n;
// How far back the rolling high looks (bars).
const HIGH_WINDOW = 90;
// Exits, measured from the buy's fill price.
const TAKE_PROFIT_BPS = 180n;
const STOP_LOSS_BPS = 120n;
// Give up on a position after this many bars.
const MAX_HOLD_BARS = 240;
// Cap on how far a fill may print from the latest close we were sent.
const MAX_SLIPPAGE_BPS = 200;

const BPS = 10000n;

const closes: bigint[] = [];
// Fill price of the open position (0 when flat), and the batch seq whose
// fills reported it, so the hold is counted from the fill, not the decision.
let entryPrice = 0n;
let entrySeq = -1;
// Batch seq of the last filled trade (buy or sell); starts at 0 so the
// relaxed entry only kicks in after 360 flat bars from the window's start.
let lastTradeSeq = 0;

function rollingHigh(): bigint {
  let high = 0n;
  const start = Math.max(0, closes.length - HIGH_WINDOW);
  for (let i = start; i < closes.length; i++) {
    if (closes[i]! > high) high = closes[i]!;
  }
  return high;
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    // First fold in any fills the batch reports, so the position and its
    // fill price are current before we decide on this bar.
    for (const fill of batch.fills) {
      if (fill.symbol !== SYMBOL || fill.status !== 'filled') continue;
      lastTradeSeq = state.seq;
      if (fill.side === 'buy') {
        entryPrice = BigInt(fill.price);
        entrySeq = state.seq;
      } else {
        entryPrice = 0n;
        entrySeq = -1;
      }
    }

    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = BigInt(bar.c);
    closes.push(close);

    const position = state.positions.get(SYMBOL);
    const qty = position?.qty ?? 0n;

    if (qty === 0n) {
      if (state.warmingUp || closes.length < 6) return [];
      const high = rollingHigh();
      if (high === 0n) return [];
      const dip = state.seq - lastTradeSeq >= PATIENCE_BARS ? RELAXED_DIP_BPS : DIP_BPS;
      // close <= high * (10000 - dip) / 10000, in integers.
      if (close * BPS <= high * (BPS - dip)) {
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // In a position: exits are measured from the fill price.
    if (entryPrice === 0n) return [];
    if (close * BPS >= entryPrice * (BPS + TAKE_PROFIT_BPS)) {
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    if (close * BPS <= entryPrice * (BPS - STOP_LOSS_BPS)) {
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    if (entrySeq >= 0 && state.seq - entrySeq >= MAX_HOLD_BARS) {
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
