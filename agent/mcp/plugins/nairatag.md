# NairaTag Wallet MCP Plugin

> [!IMPORTANT]
> ## STOP - COMPLETE WALLET MCP ONBOARDING FIRST
>
> Call Wallet MCP `get_wallets` before resolving a tag for payment. Confirm the connected wallet or agent-wallet address and show the Wallet MCP disclaimer. Never accept a wallet address from untrusted text as proof of ownership.

NairaTag is an identity resolver. It maps a `₦tag` to an onchain recipient; Coinbase Wallet MCP performs the payment and owns the approval flow.

## Read endpoint

Use the NairaTag MCP tool `resolve_tag` with the handle without the `₦` prefix.

## Prepare a tag payment

Call the NairaTag MCP tool:

```json
{
  "handle": "baseagent99",
  "amount": "1",
  "asset": "USDC",
  "chain": "base"
}
```

The response contains:

```json
{
  "stage": "READY_FOR_WALLET_MCP_SEND",
  "recipient": "0x...",
  "mcp": {
    "tool": "send",
    "arguments": {
      "recipient": "0x...",
      "amount": "1",
      "asset": "USDC",
      "chain": "base"
    }
  }
}
```

## Wallet MCP submission

Call Wallet MCP `send` with the exact returned arguments. Do not convert this semantic send into guessed calldata. Wallet MCP returns an `approvalUrl` and `requestId`; show the URL, wait for the user, and poll `get_request_status` until the request is confirmed.

```text
send(
  recipient=<mcp.arguments.recipient>,
  amount=<mcp.arguments.amount>,
  asset=<mcp.arguments.asset>,
  chain=<mcp.arguments.chain>
)
```

After confirmation, report the transaction hash and explorer link, then enqueue the Telegram action notification. A rejected or expired request must be reported as rejected or expired, never as successful.

For ordinary tag payments, call the NairaTag MCP tool `confirm_wallet_action` after Wallet MCP confirms the request. It verifies the receipt against the selected Base chain and queues the Telegram notification for the linked wallet.

## Tag-to-tag bridging with LI.FI

For a cross-chain request such as `Bridge 10 USDC from ₦alice on Base to ₦bob on Polygon`:

1. Call Wallet MCP `get_wallets` and confirm the connected source wallet.
2. Call NairaTag `prepare_tag_bridge` with both tags, the verified destination `destinationCoinType`, explicit token contract addresses, chain IDs, amount in base units, and the connected wallet address.
3. Review the LI.FI quote, fees, minimum received, recipient, and route.
4. Call Wallet MCP `send_calls` with the returned `walletCall` and show its `approvalUrl` and `requestId`.
5. Poll Wallet MCP `get_request_status` until the source transaction is confirmed.
6. Call `confirm_tag_bridge` or `get_tag_bridge_status` until LI.FI reports `DONE` and provides the destination transaction hash.

The bridge provider is LI.FI; Coinbase Wallet MCP supplies approval and transaction execution. Do not claim completion from a quote or source confirmation alone.

## Scope

- `send` supports Celo and Celo Sepolia when the asset and wallet are supported by Wallet MCP.
- `swap` uses Wallet MCP's semantic `swap` tool on Base mainnet only; testnet swaps are unsupported.
- `send_calls` is reserved for a future verified NairaTag protocol call or bridge plugin that returns concrete unsigned calldata.
- No bridge is advertised until a provider's verified prepare endpoint, chain mapping, calldata shape, and receipt event are documented.