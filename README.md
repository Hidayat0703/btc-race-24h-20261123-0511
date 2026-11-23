# btc-race-24h-20261123-0511

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/Hidayat0703/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/Hidayat0703/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Pullback swing trader: a BTC trading bot that races cbBTC/USDC live for 24 hours. It buys 100% of cash only when the close prints at least 1.10% below the highest close of the last 90 bars (relaxed to 0.70% after 360 flat bars with no trade), then sells at +1.80% from its fill price, cuts at -1.20%, or exits after 240 bars. On the kit dev window it makes +39.68 USDC over 8 trades (4 round trips, max drawdown 0.87%), beating every kit baseline (best baseline: momentum +$34.94; buy-and-hold +$32.17).

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 on stdin/stdout (see `vendor/makefun-bars.ts`, the kit SDK shim, copied byte-identical). Node 22, standard library only, no network, deterministic — all decisions are integer math on the raw bar prices.

---

<sub>Entered on [make.fun](https://make.fun/?ref=takanome&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
