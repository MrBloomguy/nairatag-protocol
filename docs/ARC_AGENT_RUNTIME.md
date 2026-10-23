# Arc Agent Registry and Tool Runtime

## Identity and capability are separate

The platform registry owns first-party agent tags such as `chowdeck`, `ride`,
`music`, `dev`, `designer`, `food`, and `escrow`. These are platform identities
and are not ERC-8004 registrations by themselves. An agent is marked on-chain
verified only when both an ERC-8004 agent ID and registry address are stored
after an on-chain check.

An agent may have a working chat identity while provider tools remain unavailable.
Only tools with `availability = enabled` and a matching server-side executor are
callable. `planned` and `blocked` tools are catalog entries, not promises that an
external operation works. The language model never receives provider secrets or
unrestricted wallet access.

## Storage

The Arc migration `202610200002_arc_agent_registry.sql` adds:

- `arc_agents`: first-party, user, and partner identities; ownership, runtime,
  public discovery, lifecycle status, and separately tracked ERC-8004 evidence.
- `arc_agent_tools`: typed input schemas, risk class, provider, availability,
  and an internal executor key. Database data cannot name an arbitrary URL or
  cause the server to execute arbitrary code.
- `arc_agent_integrations`: private MCP connection records, including encrypted
  credentials and connection health. `arc_agent_tools.runtime_config` stores the
  remote MCP tool name and stays server-only under RLS.

The seed records list the seven current platform agents and proposed tool
contracts. Provider-specific tools remain planned until an authorized provider,
server adapter, user permissions, and operational controls are in place.

## Registry API

- `GET /api/arc-agents` returns public Arc agents and their tool availability.
- `GET /api/arc-agents?tag=chowdeck` resolves one agent identity.
- `POST /api/arc-agents` provisions a platform-owned private draft with Bearer
  authorization from the server-only `ARC_AGENT_ADMIN_TOKEN`, or with a wallet
  signature from a wallet listed in `ARC_AGENT_ADMIN_WALLETS`. Wallet-signed
  lifecycle actions validate, publish, suspend, reactivate, and retire identities.
- MCP agent drafts accept a Streamable HTTP endpoint and optional bearer/API-key
  credential. The server requires HTTPS and public DNS addresses, blocks redirects,
  encrypts credentials with AES-256-GCM, then tests initialization and lists tools.
  Tools stay private; only advertised tools marked `readOnlyHint` can be enabled
  after an administrator reviews the description and input schema.
- MCP calls are rechecked against the current public/active agent, enabled tool,
  read-only risk, endpoint, and unchanged live schema before execution. Tool inputs
  and results are bounded; credentials and raw MCP arguments/results are omitted
  from durable run events. MCP writes, OAuth, local stdio, and financial actions
  remain unavailable.
- The response distinguishes `identity.type: platform` from `identity.type:
  erc8004`; it never infers ERC-8004 verification from a display name or tag.
- Provider tools still require reviewed server-side executor changes and access
  credentials. The public API and model cannot select arbitrary code or URLs.

Production requires `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, and
`ARC_MCP_ENCRYPTION_KEY` (a base64-encoded random 32-byte key, generated and stored
only in the backend deployment environment). Keep the key stable to decrypt saved
credentials; rotate it only with a credential re-encryption migration.
Set `ARC_AGENT_ADMIN_WALLETS` to a comma-separated allowlist of admin EOA
addresses before using the wallet-signed provisioning form. `ARC_RPC_URL` may
override the Arc Testnet RPC; it defaults to `https://rpc.testnet.arc.io`.

## Runtime contract

The runtime exposes typed, allowlisted adapters rather than model-generated URLs
or SQL:

1. Authenticate the user and resolve the requested tag from this registry.
2. Load only that agent's `enabled` tools and validate arguments against their
   JSON schemas on the server.
3. Classify each operation by risk. Read-only tools can run within scoped
   authorization. Reversible writes require user review. External commitments and
   financial actions require an approval bound to the exact quote, amount,
   provider, wallet, and one-time nonce.
4. Persist the run, tool calls, approvals, provider references, and state changes
   before returning a completion claim.
5. Verify external state from the provider or chain. A model response, timeout,
   or transaction hash alone does not prove an order, ride, payment, or escrow is
   complete.

Runs should have durable states such as `queued`, `planning`, `awaiting_approval`,
`executing`, `reconciling`, `succeeded`, `failed`, and `cancelled`. Provider
operations need provider-supported idempotency, bounded retries, cancellation,
and reconciliation. An ambiguous timeout remains `reconciling`; it must not be
retried with a new idempotency key or presented as success.

## Provider readiness

- **Food / Chowdeck:** the available public Chowdeck API documentation is
  merchant-oriented. Do not assume it grants access to the consumer marketplace
  or third-party ordering. Obtain the appropriate access and confirm the exact
  order, quote, payment, tracking, cancellation, and webhook semantics first.
  See [Chowdeck merchant API onboarding](https://chowdeck-api.readme.io/docs/getting-started)
  and [order management](https://chowdeck-api.readme.io/docs/receiving-managing-orders).
- **Ride:** provider booking APIs can require privileged production approval and
  user location/OAuth scopes. A quote or booking tool stays unavailable until
  access for NairaTag is granted. Uber documents ride-request access as
  privileged in production ([API tutorial](https://developer.uber.com/docs/riders/ride-requests/tutorials/api/curl)).
- **Music:** catalog and playlist APIs need user OAuth authorization. Playback
  features have additional provider scopes and account requirements. See
  [Spotify authorization](https://developer.spotify.com/documentation/web-api/concepts/authorization)
  and [playlist creation](https://developer.spotify.com/documentation/web-api/reference/create-playlist).
- **Developer audit:** source analysis needs an isolated, resource-limited worker
  and reproducible scanner evidence. An LLM-only review is not a completed audit.
- **Design:** generation must return a stored, downloadable artifact from a
  configured provider.
- **Food benefits:** keep this distinct from food ordering; it needs a real
  program, eligibility source, and redemption provider.
- **Escrow:** treat this as NairaTag-native financial infrastructure. Do not
  expose release actions until the contract, dispute policy, and approval gates
  are deployed and verified.

## Initial rollout

The Arc chat runtime supports native read tools for NairaTag resolution, Arc task
listing, and capability discovery, plus reviewed MCP read-only tools. Gemini may
call only tools marked enabled for the selected agent. Calls are validated and
recorded in `arc_agent_run_events`; MCP payloads are redacted from those events.
The same signed chat path serves text and voice transcripts.

1. Apply `202610210001_arc_agent_identity_lifecycle.sql` and
   `202610210002_arc_mcp_agent_runtime.sql`, set the backend encryption key, and
   deploy the Arc-only registry and chat routes.
2. Configure a public HTTPS MCP endpoint and credentials in the `/admin` form;
   review discovered capabilities before validation and publication.
3. Add provider OAuth, quotes, and exact-approval records before commerce writes.
4. Add durable asynchronous workers and reconciliation before production writes.

The registry migration, API, and routing are Arc-only. Do not route these tools
through the legacy Celo agent API.
