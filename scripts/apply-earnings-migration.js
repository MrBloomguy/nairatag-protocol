import fs from 'node:fs';
import path from 'node:path';
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

  const file = path.join(process.cwd(), 'supabase', 'migrations', '202610220001_arc_agent_task_earnings.sql');
  let sql = fs.readFileSync(file, 'utf8');
  if (sql.charCodeAt(0) === 0xFEFF) {
    sql = sql.slice(1);
  }

  console.log('Applying 202610220001_arc_agent_task_earnings.sql without BOM...');
  await client.query(sql);
  console.log('✅ Applied successfully.');

  const colCheck = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'arc_tasks' AND column_name = 'assigned_agent_tag'
  `);
  console.log('arc_tasks.assigned_agent_tag exists:', colCheck.rows.length > 0);

  const payoutTable = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'arc_task_payouts'
  `);
  console.log('arc_task_payouts exists:', payoutTable.rows.length > 0);

  await client.end();
}

run().catch(console.error);
