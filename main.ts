// Harbor Swing - a long-only cbBTC swing bot for make.fun's bars-replay/v1 race.
//
// The shape of the edge, measured on the published dev window (1,440 one-minute bars):
// a 1-minute cbBTC close is mean-reverting around its own multi-hour average. Over the
// dev window the 30/60/120-minute trailing return correlates -0.24 to -0.45 with the
// return of the next 1-4 hours, and the forward return after a sharp drop is positive
// while the forward return after a sharp rise is negative -17 to -74 bps. Cash earns
// nothing and a full-size round trip costs about 26 bps (4 bps fee twice, 2 bps
// slippage twice, pool impact), so the bot only has to leave the market when the price
// is stretched far above that average, and take it back when it is stretched below it.
//
// So the bot holds cbBTC by default - it never sits in cash waiting for a signal, which
// is what makes it capture the drift of the window it races - and it swings around
// that holding:
//   - it sells the whole position when the close is at least EXIT_ABOVE_BPS above its
//     SMA of SMA_BARS minutes (the window's stretched-up state, whose forward return is
//     negative), or when the position itself is STOP_BELOW_BPS under water;
//   - it buys back the whole position when the close is at least ENTRY_BELOW_BPS below
//     the same average, or on the first bar it can act on.
// Measured on the dev window against the kit's own grader: net PnL +18.55 USDC against
// buy-and-hold's +1.07, and the same rule is non-negative in every 6-hour block of that
// window (buy-and-hold loses in three of the four) and holds up on the window mirrored
// into a downtrend (-0.68 against buy-and-hold's -8.16).
//
// Determinism: no clock, no randomness, no network, no files - every decision is a
// function of the closes already seen, so two runs on the same bars send the same orders.

import { runBars } from './vendor/makefun-bars.ts';
import type { OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Minutes in the moving average the close is compared against. */
const SMA_BARS = 240;
/** Sell the whole position when the close is this far above the average. */
const EXIT_ABOVE_BPS = 60;
/** Buy the whole position back when the close is this far below the average. */
const ENTRY_BELOW_BPS = 80;
/** Sell the whole position when it is this far under water, whatever the average says. */
const STOP_BELOW_BPS = 150;
/**
 * A trade is refused when it would fill this far past the latest close it was decided on. Wide, because
 * the fill is the next bar's open and a refusal only loses the trade - but not unbounded, since a market
 * order that would fill over 1% away from the close it was sized on is a gap this rule never intended to
 * chase. Measured on the dev window: 0 of 6 fills refused at 100, the same net PnL as an unbounded cap.
 */
const MAX_SLIPPAGE_BPS = 100;
const BPS = 10_000n;

/** The closes seen so far, oldest first, at most SMA_BARS of them. */
const closes: bigint[] = [];
/** Their sum, kept incrementally so no bar is ever walked twice. */
let closeSum = 0n;
/** Whether the bot has taken its first position yet (a flat bot before that buys at once). */
let started = false;

await runBars({
  onBatch(state) {
    const bar = state.latest.get(SYMBOL);
    if (bar === undefined) return [];
    const close = BigInt(bar.c);
    closes.push(close);
    closeSum += close;
    if (closes.length > SMA_BARS) closeSum -= closes.shift() as bigint;

    // Warm-up bars are not scored and any order on one is refused: read them, answer nothing.
    if (state.warmingUp) return [];

    const mean = closeSum / BigInt(closes.length);
    const stretchedBps = Number(((close - mean) * BPS) / mean);

    const held = state.positions.get(SYMBOL);
    if (held === undefined || held.qty === 0n) {
      // Flat: take the position at the first chance, then only on a dip below the average.
      if (!started || stretchedBps <= -ENTRY_BELOW_BPS) {
        const room = state.weightRoom(SYMBOL);
        const notional = state.cash < room ? state.cash : room;
        if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
        started = true;
        return [
          { side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS },
        ] satisfies OrderInput[];
      }
      return [];
    }

    // Long: leave it when the price is stretched above the average, or when the position is losing.
    const underWaterBps = Number(((state.value(SYMBOL, held.qty) - held.cost) * BPS) / held.cost);
    if (stretchedBps >= EXIT_ABOVE_BPS || underWaterBps <= -STOP_BELOW_BPS) {
      started = true;
      return [
        { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS },
      ] satisfies OrderInput[];
    }
    return [];
  },
});
