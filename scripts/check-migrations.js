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

async function check() {
  await client.connect();

  const tablesRes = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('arc_personal_agent_profiles', 'arc_personal_agent_memories', 'arc_task_payouts')
  `);
  console.log('Existing target tables:', tablesRes.rows.map(r => r.table_name));

  const colRes = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'arc_tasks' AND column_name = 'assigned_agent_tag'
  `);
  console.log('arc_tasks.assigned_agent_tag exists:', colRes.rows.length > 0);

  await client.end();
}

check().catch(console.error);
