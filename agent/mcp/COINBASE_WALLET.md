# Coinbase Wallet MCP Integration

This workspace connects two separate MCP servers:

- `nairatag`: live identity, claim, profile, payment, and Chain 901 tools.
- `base-mcp`: Coinbase Wallet MCP at `https://mcp.base.org` for Base wallet detection, approvals, and Base transactions.

## Wallet flow

1. Ask Coinbase Wallet MCP for the connected wallet with `get_wallets`.
2. Use NairaTag `start_claim_flow` or `prepare_profile_update` to produce unsigned calldata.
3. Keep Chain 901 calldata on the local manager because Coinbase Wallet MCP does not support this local RPC.
4. For the verified Celo Sepolia deployment, map the prepared response to Coinbase Wallet MCP `send_calls`:

```json
{
  "chain": "celo-sepolia",
  "calls": [
    {
      "to": "0x...",
      "value": "0x0",
      "data": "0x..."
    }
  ]
}
```

The NairaTag `prepare_claim` and `start_claim_flow` tools now return this `walletCall` payload directly for `celoSepolia`.

5. Show the returned approval URL to the user.
6. Poll `get_request_status` until Coinbase reports the request as confirmed.
7. Pass the resulting transaction hash to the appropriate NairaTag confirmation tool only when the transaction targeted a verified NairaTag deployment.

## Current boundary

NairaTag claims and profile writes target Chain 901 or the verified Celo Sepolia deployment selected by the agent. Celo Mainnet remains unavailable. Celo Sepolia writes require Coinbase Wallet approval on `celo-sepolia` and the deployed addresses in `deployments/nairatag-celo-sepolia.json`.

The first Coinbase Wallet MCP use requires the user to authorize the connection. Every write still requires user approval; no private key is exposed to this repository or its MCP server.

## AgentKit versus Wallet MCP

These are separate Coinbase products and must not be treated as interchangeable:

- Wallet MCP (`https://mcp.base.org`) is the current approval-mediated path for this workspace. Use `get_wallets` for detection, semantic `send` for transfers, semantic `swap` for supported mainnet swaps, and `send_calls` only for verified protocol calldata. Writes return an approval URL and request ID; poll `get_request_status` before reporting confirmation.
- AgentKit (`@coinbase/agentkit`) is a server-side agent framework with CDP wallet providers and action providers. It requires CDP credentials and its default wallet actions do not automatically provide Wallet MCP-style human approval, spending caps, or destination allowlists. Those controls must be implemented by the application or framework middleware.

The web agent in this repository currently prepares MCP intents and NairaTag calldata; it does not hold a CDP wallet secret and must not claim to have broadcast an action until the Wallet MCP or an explicitly configured AgentKit execution backend returns confirmation.

## Official references

- https://docs.cdp.coinbase.com/get-started/build-with-ai/base-mcp
- https://docs.cdp.coinbase.com/coinbase-for-agents/wallet-mcp/references/install.md