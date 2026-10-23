import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.bbpdupijsgdghemfpijr',
  password: 'LhcqTM8uK00m0x92',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const agents = await client.query("SELECT id, tag, display_name, owner_type, owner_wallet FROM arc_agents");
  console.log('All agents in arc_agents:');
  console.table(agents.rows);

  const claims = await client.query("SELECT count(*), min(tag), max(tag) FROM user_claims");
  console.log('user_claims summary:', claims.rows);

  const claimsForAgents = await client.query("SELECT * FROM user_claims WHERE clean_tag = ANY($1)", [agents.rows.map(a => a.tag)]);
  console.log('user_claims matching agent tags:', claimsForAgents.rows);

  const pointsForAgents = await client.query("SELECT * FROM user_points WHERE tag = ANY($1)", [agents.rows.map(a => '₦' + a.tag)]);
  console.log('user_points matching agent tags:', pointsForAgents.rows);

  await client.end();
}

run().catch(console.error);
