const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.bbpdupijsgdghemfpijr',
    password: 'LhcqTM8uK00m0x92',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL successfully!');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_claims (
        id BIGSERIAL PRIMARY KEY,
        tag TEXT NOT NULL UNIQUE,
        clean_tag TEXT NOT NULL UNIQUE,
        wallet_address TEXT NOT NULL UNIQUE,
        network TEXT NOT NULL DEFAULT 'Celo Sepolia',
        is_sub BOOLEAN NOT NULL DEFAULT true,
        block BIGINT,
        tx_hash TEXT,
        reputation INTEGER NOT NULL DEFAULT 100,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_user_claims_wallet ON public.user_claims(lower(wallet_address));
      CREATE INDEX IF NOT EXISTS idx_user_claims_tag ON public.user_claims(lower(clean_tag));

      CREATE TABLE IF NOT EXISTS public.user_points (
        wallet_address TEXT PRIMARY KEY,
        tag TEXT,
        total_points INTEGER NOT NULL DEFAULT 100,
        invite_count INTEGER NOT NULL DEFAULT 0,
        rebates_ngn NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.points_ledger (
        id BIGSERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        action TEXT NOT NULL,
        points INTEGER NOT NULL,
        reference_tag TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE public.user_claims ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
    `);

    // Create RLS policies if they don't exist
    const policies = [
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_claims' AND policyname = 'user_claims_public_read') THEN
          CREATE POLICY user_claims_public_read ON public.user_claims FOR SELECT USING (true);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_claims' AND policyname = 'user_claims_public_write') THEN
          CREATE POLICY user_claims_public_write ON public.user_claims FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_points' AND policyname = 'user_points_public_read') THEN
          CREATE POLICY user_points_public_read ON public.user_points FOR SELECT USING (true);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_points' AND policyname = 'user_points_public_write') THEN
          CREATE POLICY user_points_public_write ON public.user_points FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'points_ledger' AND policyname = 'points_ledger_public_read') THEN
          CREATE POLICY points_ledger_public_read ON public.points_ledger FOR SELECT USING (true);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'points_ledger' AND policyname = 'points_ledger_public_write') THEN
          CREATE POLICY points_ledger_public_write ON public.points_ledger FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;`
    ];

    for (const sql of policies) {
      await client.query(sql);
    }

    console.log('Schema and RLS policies created successfully!');

    // Seed anchor claims if table is empty
    const { rows } = await client.query('SELECT count(*) as count FROM public.user_claims');
    if (parseInt(rows[0].count) === 0) {
      console.log('Seeding initial sovereign anchor claims...');
      const seeds = [
        {
          tag: '₦michael',
          clean_tag: 'michael',
          is_sub: true,
          wallet_address: '0x71C8A9b708C5D3048995394B73223049b14D91A2',
          network: 'Celo Sepolia',
          block: 2185012,
          tx_hash: '0x126057ef008b43f57f028cd405807e6924156b85bb504f7676e687139870f1bb',
          reputation: 100
        },
        {
          tag: '₦tobi',
          clean_tag: 'tobi',
          is_sub: true,
          wallet_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          network: 'Celo Sepolia',
          block: 2185018,
          tx_hash: '0xb95b9133600019a0255222ad70a374a7c836983fb0f4760b162df7a898528474',
          reputation: 100
        },
        {
          tag: '₦josh',
          clean_tag: 'josh',
          is_sub: false,
          wallet_address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
          network: 'Celo Sepolia',
          block: 2185022,
          tx_hash: '0x9923847192837491827394817239481729384719283749182739481723948172',
          reputation: 100
        },
        {
          tag: '₦chi',
          clean_tag: 'chi',
          is_sub: true,
          wallet_address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          network: 'Celo Sepolia',
          block: 2185028,
          tx_hash: '0xa80056f171c3d168ad9fd5d2aedecf4a577e5d7b951315db09a52810d2876d38',
          reputation: 100
        }
      ];

      for (const s of seeds) {
        await client.query(
          `INSERT INTO public.user_claims (tag, clean_tag, wallet_address, network, is_sub, block, tx_hash, reputation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (wallet_address) DO NOTHING`,
          [s.tag, s.clean_tag, s.wallet_address, s.network, s.is_sub, s.block, s.tx_hash, s.reputation]
        );
        await client.query(
          `INSERT INTO public.user_points (wallet_address, tag, total_points)
           VALUES ($1, $2, 100)
           ON CONFLICT (wallet_address) DO NOTHING`,
          [s.wallet_address, s.tag]
        );
      }
      console.log('Seeded 4 anchor claims successfully.');
    }

    const { rows: verifyRows } = await client.query('SELECT tag, wallet_address, network FROM public.user_claims');
    console.log('Verified user_claims in Supabase:');
    console.table(verifyRows);

    await client.end();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
