import { RocketRideClient } from 'rocketride';
import { readFile } from 'node:fs/promises';
import 'dotenv/config';

const pipeline = JSON.parse(await readFile('./gtm_discovery.pipe', 'utf8'));

await RocketRideClient.withConnection(
  { auth: process.env.ROCKETRIDE_APIKEY, uri: process.env.ROCKETRIDE_URI },
  async (client) => {
    const res = await client.getServices();
    const names = Object.keys(res.services ?? res);
    console.log('\nPROVIDERS (' + names.length + '):\n');
    console.log(names.join('\n'));

    const llm = names.filter(n => /chat|llm|ai|anthropic|openai|model|agent/i.test(n));
    console.log('\nLIKELY LLM PROVIDERS:\n', llm.join(', ') || '(none matched)');

    for (const n of llm.slice(0, 3)) {
      const s = await client.getService(n);
      console.log(`\n--- ${n} config ---\n`, JSON.stringify(s, null, 2).slice(0, 900));
    }

    try {
      console.log('\nVALIDATION:\n', JSON.stringify(await client.validate({ pipeline }), null, 2));
    } catch (e) { console.log('\nVALIDATION FAILED:', e.message); }
  }
);
