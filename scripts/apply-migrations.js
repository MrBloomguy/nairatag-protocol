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
  console.log('Connected to Supabase PostgreSQL.');

  const migrations = [
    '202610220001_arc_agent_task_earnings.sql',
    '202610220002_arc_personal_agent_memory.sql'
  ];

  for (const m of migrations) {
    const file = path.join(process.cwd(), 'supabase', 'migrations', m);
    if (!fs.existsSync(file)) {
      console.error('File not found:', file);
      continue;
    }
    console.log(`\nApplying ${m}...`);
    const sql = fs.readFileSync(file, 'utf8');
    try {
      await client.query(sql);
      console.log(`✅ ${m} applied successfully.`);
    } catch (e) {
      console.error(`❌ Error applying ${m}:`, e.message);
    }
  }

  // Verify tables
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'arc_personal_agent_profiles', 
      'arc_personal_agent_memories', 
      'arc_personal_agent_goals',
      'arc_personal_agent_audit_events',
      'arc_task_payouts'
    )
    ORDER BY table_name
  `);
  console.log('\nVerified tables in DB:', tables.rows.map(r => r.table_name));

  const colCheck = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'arc_tasks' AND column_name = 'assigned_agent_tag'
  `);
  console.log('arc_tasks.assigned_agent_tag column exists:', colCheck.rows.length > 0);

  await client.end();
}

run().catch(console.error);
