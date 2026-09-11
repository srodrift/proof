import { RocketRideClient } from 'rocketride';
import 'dotenv/config';

const want = ['memory_internal','memory_persistent','response_answers'];

await RocketRideClient.withConnection(
  { auth: process.env.ROCKETRIDE_APIKEY, uri: process.env.ROCKETRIDE_URI },
  async (client) => {
    for (const n of want) {
      try {
        const s = await client.getService(n);
        const props = s?.Pipe?.schema?.properties ?? {};
        console.log(`\n=== ${n} ===`);
        console.log('classType:', JSON.stringify(s.classType));
        console.log('lanes:', JSON.stringify(s.lanes));
        console.log('invoke:', JSON.stringify(s.invoke));
        console.log('config keys:', Object.keys(props).join(', '));
      } catch { console.log(`\n=== ${n} === NOT FOUND`); }
    }
  }
);
