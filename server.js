// Proof — sponsor adapter layer
// Every route works with no keys (returns a stub). Add a key to .env and the
// same route goes live. Nothing upstream changes: the front end calls the same
// six paths either way, so a sponsor that fights you never blocks the demo.

import express from 'express';
import 'dotenv/config';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static('.'));            // serves proof.html
app.get('/', (_req, res) => res.redirect('/proof.html'));

// --------------------------------------------------------------------------
// helper: one place for auth + errors + the live/stub switch
// --------------------------------------------------------------------------
async function proxy({ key, url, body, headers = {}, stub }) {
  if (!key || !url) return { ok: true, stub: true, data: stub };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${key}`, ...headers },
      body: JSON.stringify(body)
    });
    const text = await r.text();
    if (!r.ok) {
      console.error(`[${url}] ${r.status} ${text.slice(0, 300)}`);
      return { ok: false, stub: true, status: r.status, data: stub };
    }
    return { ok: true, stub: false, data: JSON.parse(text) };
  } catch (e) {
    console.error(`[${url}] ${e.message}`);
    return { ok: false, stub: true, data: stub };   // demo never hard-fails
  }
}

// --------------------------------------------------------------------------
// COGNEE — unstructured product/outcome text -> entities + relationships
// --------------------------------------------------------------------------
app.post('/api/cognee/cognify', async (req, res) => {
  const { text, dataset = 'proof_gtm' } = req.body;
  res.json(await proxy({
    key: process.env.COGNEE_API_KEY,
    url: process.env.COGNEE_URL,              // <-- PASTE: cognify endpoint
    body: { data: text, datasetName: dataset },
    stub: {
      entities: [
        { type: 'product',  name: 'Relay', motion: 'bottom-up' },
        { type: 'icp',      name: 'backend / platform engineer', stage: 'Series A-C' }
      ],
      edges: [{ from: 'Relay', rel: 'sold_to', to: 'backend / platform engineer' }]
    }
  }));
});

// --------------------------------------------------------------------------
// HYDRADB — persist + traverse the product -> ICP -> channel -> outcome graph
// --------------------------------------------------------------------------
const memGraph = { nodes: [], edges: [] };

app.post('/api/hydradb/upsert', async (req, res) => {
  const { nodes = [], edges = [] } = req.body;
  memGraph.nodes.push(...nodes);
  memGraph.edges.push(...edges);
  res.json(await proxy({
    key: process.env.HYDRADB_API_KEY,
    url: process.env.HYDRADB_URL,             // <-- PASTE: upsert endpoint
    body: { nodes, edges },
    stub: { nodes: memGraph.nodes.length, edges: memGraph.edges.length }
  }));
});

// match a new product against stored ICP shapes — this is what makes run 2 fast
app.post('/api/hydradb/match', async (req, res) => {
  const { shape } = req.body;
  res.json(await proxy({
    key: process.env.HYDRADB_API_KEY,
    url: process.env.HYDRADB_MATCH_URL,       // <-- PASTE: query endpoint
    body: { shape },
    stub: {
      matched: true, shape,
      ranking: ['Platform eng Discords', 'Hacker News', 'r/webdev', 'LinkedIn'],
      excluded: [{ channel: 'LinkedIn', reason: 'reaches managers, not adopters' }]
    }
  }));
});

// --------------------------------------------------------------------------
// HOTDATA — one isolated database per experiment, scored in parallel
// This is the Hotdata prize criterion: concurrent agents, separate DBs.
// --------------------------------------------------------------------------
app.post('/api/hotdata/query', async (req, res) => {
  const { db, sql, rows } = req.body;
  res.json(await proxy({
    key: process.env.HOTDATA_API_KEY,
    url: process.env.HOTDATA_URL,             // <-- PASTE: query endpoint
    body: { database: db, query: sql, seed: rows },
    stub: { database: db, rows: [{ variant: 'a', score: 86 }, { variant: 'b', score: 61 }] }
  }));
});

// run every experiment at once, each in its own database
app.post('/api/hotdata/parallel', async (req, res) => {
  const { experiments = [] } = req.body;
  const out = await Promise.all(experiments.map(e => proxy({
    key: process.env.HOTDATA_API_KEY,
    url: process.env.HOTDATA_URL,
    body: { database: e.db, query: e.sql, seed: e.rows },
    stub: { database: e.db, rows: e.rows ?? [] }
  })));
  res.json({ count: out.length, results: out });
});

// --------------------------------------------------------------------------
// ROCKETRIDE — NOT a REST endpoint. It's a WebSocket client with a session
// lifecycle: connect -> use(.pipe) -> token -> send() -> terminate().
// We connect once at boot with persist:true and reuse the connection, because
// reconnecting per request would dominate your demo's latency.
// --------------------------------------------------------------------------
let rr = null, rrToken = null;

async function rocketride() {
  if (!process.env.ROCKETRIDE_APIKEY) return null;        // no key -> stub path
  if (rr?.isAuthenticated()) return rr;

  const { RocketRideClient } = await import('rocketride');
  rr = new RocketRideClient({
    auth: process.env.ROCKETRIDE_APIKEY,
    uri:  process.env.ROCKETRIDE_URI ?? 'https://cloud.rocketride.ai',
    persist: true,                                        // auto-reconnect
    requestTimeout: 30_000,
    onConnectError: e => console.error('[rocketride]', e.message),
    onEvent: async e => { if (e.event === 'apaevt_status_processing') console.log('  ·', e.body); }
  });
  await rr.connect();
  console.log('[rocketride] connected');
  return rr;
}

app.post('/api/rocketride/run', async (req, res) => {
  const { input = {}, pipe = './gtm_discovery.pipe' } = req.body;
  const stub = { pipeline: 'gtm_discovery', status: 'completed', steps: 3,
                 scores: [{ copy: 'Replay a failed webhook without redeploying', score: 86 }] };
  try {
    const client = await rocketride();
    if (!client) return res.json({ ok: true, stub: true, data: stub });

    // reuse one long-lived task across requests; ttl keeps it warm
    if (!rrToken) ({ token: rrToken } = await client.use({ filepath: pipe, ttl: 3600 }));

    const result = await client.send(
      rrToken, JSON.stringify(input), { name: 'input.json' }, 'application/json'
    );
    res.json({ ok: true, stub: false, data: result });
  } catch (e) {
    // classify on e.code, never on e.message — the message gets reworded
    if (['TASK_NOT_REGISTERED', 'TASK_COMPLETED', 'TASK_STOPPED'].includes(e.code)) {
      rrToken = null;                                     // task died, restart next call
      console.error('[rocketride] task gone:', e.code, '- will restart');
    } else {
      console.error('[rocketride]', e.code ?? '', e.message, e.hint ?? '');
    }
    res.json({ ok: false, stub: true, data: stub });      // demo never hard-fails
  }
});

process.on('SIGINT', async () => {
  try { if (rrToken) await rr?.terminate(rrToken); await rr?.disconnect(); } catch {}
  process.exit(0);
});

// --------------------------------------------------------------------------
// MODIQO / ROTE — capture the winning procedure, replay it on a new product.
// Do NOT rely on auto-capture. Send the five steps explicitly; a thin API can
// still store and execute an explicit play, and it demos identically.
// --------------------------------------------------------------------------
const PLAY = {
  name: 'dev_tool_channel_qualification_v1',
  steps: [
    'Extract ICP shape and adoption motion from the product description',
    'Shortlist channels where that ICP is the primary population',
    'Generate variants on failure-mode specificity, not outcome claims',
    'Score each variant in an isolated database, in parallel',
    'Apply stored human context before ranking'
  ]
};

app.post('/api/modiqo/play', async (req, res) => {
  const { action = 'capture', input = {} } = req.body;   // capture | replay
  res.json(await proxy({
    key: process.env.MODIQO_API_KEY,
    url: action === 'replay' ? process.env.MODIQO_RUN_URL   // <-- PASTE
                             : process.env.MODIQO_SAVE_URL, // <-- PASTE
    body: { play: PLAY, input },
    stub: { play: PLAY.name, action, steps: PLAY.steps.length, deterministic: true }
  }));
});

// --------------------------------------------------------------------------
// SNYK — run the CLI, not the API. `npx snyk test --json` is faster to wire.
// --------------------------------------------------------------------------
app.post('/api/snyk/scan', async (_req, res) => {
  const { execFile } = await import('node:child_process');
  execFile('npx', ['snyk', 'test', '--json'], { timeout: 90_000 }, (err, stdout) => {
    try {
      const r = JSON.parse(stdout);
      res.json({ ok: true, stub: false, data: {
        vulnerabilities: r.vulnerabilities?.length ?? 0,
        critical: r.vulnerabilities?.filter(v => v.severity === 'critical').length ?? 0
      }});
    } catch {
      res.json({ ok: false, stub: true, data: { vulnerabilities: null,
        note: 'run `npx snyk auth` once, then retry' } });
    }
  });
});

app.listen(3000, () => console.log('proof → http://localhost:3000/proof.html'));
