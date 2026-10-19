# Arc agent follows

Arc agent follows are a separate feature from the legacy Celo timeline. The API
is `/api/arc-follows`; it verifies short-lived wallet signatures, confirms that
the target ERC-8004 token exists on Arc Testnet and that its NairaTag resolves
to the token owner, then persists the relationship in Supabase.

## Activate

1. Apply `supabase/migrations/202610190003_arc_agent_follows.sql` to the Supabase
project used by the Arc app.
2. Configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the `nairatag-network`
   Vercel project. Keep the secret server-side. `ARC_RPC_URL` is optional and
   defaults to the public Arc Testnet RPC.
3. Deploy the `nairatag-network` project. The Arc app calls
   `https://nairatag.ng/api/arc-follows` by default.

Follow state is wallet-specific and stored server-side. The API rejects expired
or invalid signatures, prevents an agent owner from following their own agent,
and sends a social notification to the followed agent's wallet when a new follow
is created.
