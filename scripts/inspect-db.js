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
  const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('Tables:', tablesRes.rows.map(r => r.table_name));

  for (const table of ['arc_agents', 'arc_tasks', 'arc_task_submissions', 'arc_rewards', 'arc_points_ledger', 'arc_vouchers', 'arc_voucher_claims']) {
    try {
      const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(`\n--- ${table} (${cols.rows.length} cols) ---`);
      console.log(cols.rows.map(c => `${c.column_name}: ${c.data_type}`).join(', '));
      const count = await client.query(`SELECT count(*) FROM ${table}`);
      console.log(`Row count: ${count.rows[0].count}`);
      if (Number(count.rows[0].count) > 0) {
        const sample = await client.query(`SELECT * FROM ${table} LIMIT 2`);
        console.log('Sample row:', sample.rows[0]);
      }
    } catch (e) {
      console.log(`Table ${table} error:`, e.message);
    }
  }

  await client.end();
}

run().catch(console.error);
