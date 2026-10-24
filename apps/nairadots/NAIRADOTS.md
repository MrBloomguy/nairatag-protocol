# NairaDots — NairaTag Agent Workspace

NairaDots retains the OpenDots workspace and agent runtime, with a NairaTag wallet identity layer. The portal in `apps/nairadots/src` and the OpenDots-derived workspace in `apps/nairadots/opendots` are separate deployables: the portal is static; the agent workspace needs a persistent Node server and storage.

## Agent and account model

- Sign-in supports Circle email OTP or an injected wallet, then uses the same NairaTag Arc JWT session (`ARC_SESSION_SECRET`). Circle email users get an Arc wallet through Circle behind the scenes; the OpenDots runtime validates either session before routing any API request.
- Each wallet gets an isolated SQLite workspace under `NAIRADOTS_TENANT_DATA_DIR/<wallet>.sqlite`. On restart, the service restores each tenant and its scheduled-task runner.
- Each Dot is linked to a unique private `arc_agents` row (`owner_type=user`, `owner_wallet=<signed-in wallet>`, `runtime_type=opendots`). The owner must prove an existing NairaTag resolves to their wallet on Arc Testnet before the binding is created.
- These agent names are NairaTag registry identities. They are not separate on-chain tag claims or ERC-8004 registrations. Public publication is not enabled until public traffic can be routed to the correct owner runtime.
- OpenDots features remain in the workspace: conversations, memory, scheduled tasks, pages, voice, computer tools, and per-Dot app connections. Saved memories can be shared across permitted Dots or limited to one Dot; the SQLite migration keeps existing memories shared. A deployment-wide managed Slack channel is disabled in multi-user mode because it would cross-deliver messages between owners.

## NairaTag task and reward connection

Agents can list open Arc reward tasks assigned to their own NairaTag and prepare work using the existing OpenDots tools. The owner reviews and submits completed work from the NairaTag task page. Injected-wallet users sign the exact deliverable digest; Circle email users authorize the action with their verified NairaTag Arc session, which is bound server-side to the Circle-owned wallet. Circle submissions send the deliverable SHA-256 digest to Telegram from the trusted task API; the bearer session token is never sent to Telegram. NairaTag records task progress against the wallet; its existing task payout flow attributes the verified USDC payout to `assigned_agent_tag` after review and on-chain verification. Agent work does not automatically spend funds or mark a reward paid.

Circle email sign-in supports task start and submission through the account session. The Circle session must be current and its wallet must match the task wallet. Circle submissions are account-authorized rather than wallet-message-signed; wallet users continue to sign the action and exact deliverable digest.

## Runtime setup

Run `opendots` as a persistent service on Node 24 or newer, bind `HOST=0.0.0.0` behind HTTPS, and mount a durable volume for `data/tenants`. It serves the OpenDots-derived React UI and API from one origin. Keep Vercel for the existing NairaDots portal; do not deploy this SQLite runtime as a Vercel function. Set the portal's `VITE_NAIRADOTS_AGENT_URL` to the deployed workspace origin so its **My Agents** entry opens the runtime.

Configure the server from `opendots/.env.example`. Required values include:

- `ARC_SESSION_SECRET`: same signing secret used by the NairaTag Arc API; server-side only, minimum 32 characters.
- `VITE_CIRCLE_APP_ID`: public Circle user-controlled wallet app id, available to the workspace browser build.
- `NAIRATAG_CIRCLE_API`: server-side proxy target for the existing Circle email OTP API.
- `NAIRADOTS_TENANT_DATA_DIR`: durable tenant database directory.
- `INTELLIGENCE_API_KEY` and model credentials required by OpenDots.
- `NAIRATAG_ARC_API` and `VITE_NAIRATAG_ARC_API`, normally `https://nairatag.ng/api/arc`.

The existing portal environment and Vercel rewrites are not the OpenDots runtime deployment. Configure a same-origin host or a reverse proxy for the persistent service before exposing it publicly. Keep the tenant data volume attached across deployments.

## Database change

Apply `supabase/migrations/202610240001_nairadots_agent_idempotency.sql` in the NairaTag Supabase project before enabling self-serve agent creation. Existing Arc agent registry and task earnings migrations must also be present.

## Remaining release work

- Deploy the runtime with the shared session secret and persistent tenant storage.
- Apply the idempotency migration and confirm required existing Arc registry/task migrations are applied in production.
- Configure and verify a per-owner managed Slack channel flow if inbound Slack conversations are required; the current shared channel configuration is intentionally not loaded in multi-user mode. MCP and connected-app credentials are scoped to each owner's workspace and Dot.
- Run wallet, workspace-isolation, scheduled-task restart, computer/app connection, and reward attribution checks in the deployment environment before launch.
