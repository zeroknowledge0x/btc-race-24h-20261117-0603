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
bot only leaves the market when the price is stretched far above that average and takes it
back when it is stretched below it.

- It holds cbBTC by default, so the drift of the window it races is never missed.
- It sells the whole position when the close is 60 bps or more above its 240-minute moving
  average, or when the position itself is 150 bps under water.
- It buys the whole position back when the close is 80 bps or more below that average, and
  on the first bar it can act on.

## Measured on the dev window

The kit's own grader (`grade-local --driver process`), two executions, action logs
identical: net PnL **+18.60 USDC** against buy-and-hold's +1.07, 6 trades, 0 rejected
orders, maximum drawdown 0.72%, and +16.17 USDC with every fee doubled. Every 6-hour block
of the dev window is non-negative for this rule where buy-and-hold loses in three of the
four, and on the same window mirrored into a downtrend it reads -0.68 against
buy-and-hold's -8.16.

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
