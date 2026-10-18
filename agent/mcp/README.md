# NairaTag MCP Server

NairaTag identity, payment-preparation, and receipt-verification MCP tools for the live registry. Wallet execution remains delegated to Coinbase Wallet MCP at `https://mcp.base.org`; this server never stores a wallet secret or broadcasts a Wallet MCP action.

- RPC: `http://127.0.0.1:9545`
- Registry: `0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82`
- Resolver: `0x9A676e781A523b5d0C0e43731313A708CB607508`

## Run

```powershell
cd agent/mcp
npm install
npm start
```

Configure another deployment with `TAGPROTOCOL_RPC_URL`, `TAGPROTOCOL_CHAIN_ID`, `NAIRATAG_REGISTRY_ADDRESS`, and `NAIRATAG_RESOLVER_ADDRESS`.

## Tools

- `check_tag`
- `find_available_handle`
- `resolve_tag`
- `resolve_tag_chain_address`
- `get_tag_owner`
- `get_tag_profile`
- `reverse_resolve_address`
- `prepare_tag_payment`
- `prepare_wallet_send`
- `prepare_wallet_swap`
- `prepare_tag_bridge`
- `get_tag_bridge_status`
- `confirm_tag_bridge`
- `confirm_wallet_action`
- `create_claim_link`
- `get_network_status`
- `prepare_claim`
- `confirm_claim`
- `start_claim_flow`
- `prepare_profile_update`
- `prepare_payment_request`
- `prepare_payment`
- `confirm_payment`
- `confirm_payment_request`
- `confirm_profile_update`
- `prepare_base_address_record`

The read tools are read-only. `prepare_claim` only encodes and estimates a Chain 901 transaction. It refuses unsupported external claims, and refuses handles that are already registered. The user signs through the manager URL or their own wallet client. `confirm_claim` requires `USER_APPROVED`, waits for the receipt, verifies the matching `TagClaimed` event, and hands the verified claim to the running bot for deduplicated Telegram delivery.

## Agent flow

1. Call `get_network_status` and refuse unsupported Base execution.
2. Call `find_available_handle` when the user asks for a handle suggestion, then call `start_claim_flow`.
3. Call `start_claim_flow` with a requested handle and wallet address.
4. Show the returned chain, contract, calldata, gas estimate, and manager URL.
5. Ask the user to approve the transaction in their wallet.
6. After the wallet returns a hash, call `confirm_claim` with `confirmation: "USER_APPROVED"`.
7. Report the verified receipt, explorer URL, profile, reverse record, and notification result.

For profile management, call `prepare_profile_update` with the owner wallet. The user signs the returned calldata in the manager or wallet client; the agent never receives or stores a private key.

Payment tools currently support native Chain 901 payments. The deployed payment contract's ERC-20 branch does not perform `transferFrom`, so ERC-20 execution is deliberately refused until that contract is upgraded and redeployed safely.

## Wallet MCP execution flow

1. Call Wallet MCP `get_wallets` to detect the connected Coinbase Wallet or agent wallet and confirm the address.
2. Call `prepare_tag_payment` or `prepare_wallet_send` for a direct/tag transfer, or `prepare_wallet_swap` for a Base mainnet swap.
3. Call Wallet MCP `send` or `swap` using the returned `mcp.arguments`. Use `send_calls` only when a verified protocol integration returns concrete `{ to, value, data }` calldata.
4. Show the returned `approvalUrl` and `requestId` to the user.
5. Poll Wallet MCP `get_request_status(requestId)` until it is confirmed or rejected. Never report success from the preparation response.
6. For NairaTag contract actions, pass the confirmed transaction hash to the matching `confirm_*` tool. For ordinary wallet sends/swaps, call `confirm_wallet_action`; it verifies the receipt and queues the Telegram result.

For tag-to-tag bridging, call `prepare_tag_bridge` after Wallet MCP `get_wallets`. It resolves the source tag, resolves the destination tag through an explicit multicoin record (`destinationCoinType`), checks that the connected wallet matches the source tag, requests a LI.FI quote, and returns a `send_calls` payload. After the user approves and `get_request_status` confirms the source transaction, call `confirm_tag_bridge` until LI.FI reports destination status `DONE`; only then is the Telegram completion message queued.

`prepare_base_address_record` requires an explicitly verified coin type. The repository does not define one, so the agent must not infer it from a Base chain ID. The record is stored on Chain 901 and does not make Base claims or Base transactions available.

## VS Code MCP configuration

Add this server to `.vscode/mcp.json` in a client workspace:

```json
{
	"servers": {
		"nairatag": {
			"command": "node",
			"args": ["${workspaceFolder}/agent/mcp/server.js"]
		}
	}
}
```

## Verify

```powershell
npm run check
npm run smoke
```