# Arc rewards backend

Arc rewards use their own Supabase tables and API. They are separate from the Celo cNGN escrow and Celo points flows.

## Deploy prerequisites

1. Apply `supabase/migrations/202610190002_arc_rewards.sql` to the Supabase project used by the Arc app.
2. Configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the `nairatag-network` Vercel project for Production and Preview. Keep the secret server-side; do not expose it as a `VITE_` variable.
3. Deploy the `nairatag-network` project so `/api/arc-rewards` and `/api/arc-tasks` route to their serverless handlers. Optionally set `ARC_RPC_URL`; the handler defaults to Arc Testnet's public RPC.

The API rejects writes without a valid short-lived wallet signature. Spin outcomes are selected by the server and credited in one database transaction. Payment-earned spins and first-payment referral rewards require a successful Arc USDC receipt from the signed wallet. Referral tags are resolved against the Arc registry before crediting either wallet.

Until the migration and Vercel environment are configured, the API returns a service-unavailable response. The Arc app does not fall back to browser-local reward balances.
