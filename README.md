# Proof

**AI agents are smart once and forgetful forever. Proof compounds what works — so the tenth run costs a fraction of the first.**

A go-to-market workspace that figures out where to market a product, which copy resonates, and then **turns the winning procedure into a replayable play**. The second product does not re-derive the answer. It recalls it.

Live demo: `npm start` → [http://localhost:3000/proof.html](http://localhost:3000/proof.html)

Repo: [https://github.com/srodrift/proof](https://github.com/srodrift/proof)

Pipeline: [`gtm_discovery.pipe`](./gtm_discovery.pipe)

## The judging moment

1. **Run 1 — Relay** (webhook debugger). The agent explores channels from scratch. Scores stay hidden until each isolated Hotdata experiment finishes.
2. **Correct it.** Type: *our founder got flamed on HN last year — we have no standing there.* Hacker News drops, the badge flips to **your call**, and that correction is stored as human-sourced.
3. **Promote to Modiqo play.** The five-step procedure becomes deterministic muscle memory.
4. **Run 2 — Ledgerline** (reconciliation API, same ICP shape). The play replays. Same ranking logic, fewer calls, less time.

Variant scores are a **labeled simulated ICP panel**, not a live channel. Channel populations are drawn from real public-activity patterns. Call counts and timings on the scoreboard are **measured from the session**, not hardcoded.

## Why each sponsor is load-bearing

| Layer | Job |
|---|---|
| **Cognee** | Structures outcomes into entities and relationships — not a blob in a prompt. |
| **HydraDB** | Durable product → ICP → channel graph. Run 2 queries this, not the chat window. |
| **Hotdata** | One isolated database per channel experiment. Personas score copy in parallel without colliding. |
| **RocketRide** | The agent. `gtm_discovery.pipe` sequences extraction, panel scoring, and ranking. |
| **Modiqo** | Captures the winning procedure and replays it. Memory of *how*, not just *what*. |
| **Snyk** | Scan on promote. Shipping a play without a scan is not a play. |

Adapters live in `server.js`. Every route stubs if a key is missing, so one sponsor outage does not kill the demo. Flip `LIVE = true` in `proof.html` once keys are in `.env`.

## Demo script (90 seconds)

```
npm install
cp .env.example .env   # optional — stubs work without keys
npm start
```

Open http://localhost:3000/proof.html

1. Click **Run experiments**. Watch four Hotdata DBs spin up.
2. Click **Use the Hacker News correction** → **Add to context**. Watch HN re-rank.
3. Click **Promote to Modiqo play**.
4. Click **Replay on Ledgerline**. Read the split-screen scoreboard.

## Tracks

- **Main** — memory → muscle memory, measured on the scoreboard
- **Multi-agent / Hotdata** — concurrent channel experiments, isolated databases
- **RocketRide** — `gtm_discovery.pipe` is the scoring pipeline

## Safety

Human context always outranks the agent. Simulated panel scores are labeled on screen. No live ads are purchased. No secrets are committed (`.env` is gitignored).
