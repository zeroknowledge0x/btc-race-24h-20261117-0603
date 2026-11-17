# Harbor Swing - a long-only cbBTC swing bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/zeroknowledge0x/btc-race-24h-20261117-0603/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/zeroknowledge0x/btc-race-24h-20261117-0603/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603)

An entry for make.fun's "Race a BTC trading bot live for 24 hours" bounty: it trades
Coinbase Wrapped BTC (cbBTC) against USDC, minute by minute, on
`agent-fun/bars-replay/v1`, with $1,000 of paper money.

## The rules it trades on

The price of cbBTC on its Orca Whirlpool is mean-reverting around its own multi-hour
average. On the published dev window (1,440 one-minute bars) the trailing 30/60/120-minute
return correlates -0.24 to -0.45 with the return of the next one to four hours, and the
forward return after a sharp drop is positive while the forward return after a sharp rise
is -17 to -74 bps. Cash earns nothing and a full-size round trip costs about 26 bps (4 bps
of fee twice, 2 bps of modelled slippage twice, and the pool's own price impact), so the
bot only leaves the market when the price is stretched above that average and takes it back
when it is stretched below it.

- It holds cbBTC by default, so the drift of the window it races is never missed.
- It sells the whole position when the close is 50 bps or more above its 90-minute moving
  average, or when the position itself is 150 bps under water.
- It buys the whole position back when the close is 80 bps or more below that average, and
  on the first bar it can act on.

## How the numbers were chosen

Every candidate was scored with a local replay of the same protocol (calibrated against the
kit's grader on the house `buy-and-hold` baseline: 1.067319 USDC against the grader's
1.067187), and a candidate only survived if it held up on **both 12-hour halves** of the
dev window, on **each 6-hour block** of it, and on the window **mirrored** into a
downtrend. That screen is what picked a 90-minute average and a 50 bps exit band over the
longer averages and wider bands (several of which score higher on the whole window but lose
a whole 12-hour half, or a 6-hour block); a take-profit on the position, a trailing exit
from the running high, a confirmation bar before re-entry, and a momentum "bounce off the
low" entry were all measured and rejected.

| rule (average, exit band, re-entry band) | dev window | worse 12h half | 6h blocks | mirrored window |
| --- | --- | --- | --- | --- |
| **90 min, +50 bps, -80 bps (this entry)** | **+21.50** | **+12.58** | all >= 0 | **+5.37** |
| 240 min, +60 bps, -80 bps | +18.60 | +8.61 | all >= 0 | -0.68 |
| 90 min, +60 bps, -80 bps | +32.00 | -0.07 | one block < 0 | +6.86 |
| 180 min, +60 bps, -80 bps | +17.53 | +9.24 | all >= 0 | +8.86 |
| buy and hold | +1.07 | -6.04 | three of four < 0 | -8.16 |

## Measured on the dev window

The kit's own grader (`grade-local --driver process`, this repository, two executions whose
action logs must match): net PnL **+21.497047 USDC** against buy-and-hold's +1.07, 8 trades,
0 rejected orders, maximum drawdown 0.72%, exposure 0.32, and +18.25 USDC with every fee
doubled. `check` on the same commit and transcripts: every runnable row passes.

## Run it

```sh
node main.ts < bars.ndjson        # one JSON line of hello / batch / done per line
```

`main.ts` needs Node 22 (`--experimental-strip-types`); `vendor/makefun-bars.ts` is a
byte-identical copy of the kit's `sdk/makefun-bars.ts`, which speaks the protocol for the
bot. Nothing is installed and nothing is read outside this repository: every decision is a
function of the closes already seen, so two runs on the same bars send the same orders.

## License

MIT - see `LICENSE`.

---

Built with [Hermes Agent](https://github.com/NousResearch/hermes-agent) for
[make.fun](https://make.fun/?ref=zeroknowledge0x).
