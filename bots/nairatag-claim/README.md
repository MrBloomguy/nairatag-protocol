# NairaTag Claim Bot

A non-custodial claim assistant for Telegram and WhatsApp.

The bot checks NairaTag availability on TagProtocol and sends a link to the existing NairaTag manager. Users complete the claim with their own wallet; the bot never stores private keys.

## Run

```powershell
cd bots/nairatag-claim
npm install
Copy-Item .env.example .env
npm start
```

Set `TELEGRAM_BOT_TOKEN` for Telegram long polling. Set the WhatsApp Cloud API variables and expose `GET/POST /whatsapp/webhook` over HTTPS for WhatsApp webhooks.

Supported commands/messages:

- `/check femi`
- `/claim femi`
- `/tag femi`
- `check femi`
- `claim femi`
- `tag femi`
- `/tag@MyNairatagbot femi` (group chat)
- `/check celo-sepolia baseagent99`
- `/claim celo-sepolia baseagent99`
- `/link NT-XXXXXX`
- `/notifications on|off|direct|both`

Chain 901 claims open `hub/index.html?claim=femi#manager`, preselecting the claim pane. Celo Sepolia commands return the verified unsigned `send_calls` payload for Coinbase Wallet approval.

The web agent can create a one-time Telegram link code after a wallet is connected. Send that code to the bot with `/link`; verified claims for the linked wallet are queued for direct delivery. The bot watches `TagClaimed` events on both Chain 901 and Celo Sepolia, and includes the network and `₦tag` in each alert. The SQLite outbox retries failed messages after restarts. Set `NOTIFICATION_DB_PATH` to an absolute path in production and back up the database.

To add the bot to a group, allow group joining for `@MyNairatagbot` in BotFather. Privacy mode can remain enabled when members use explicit commands such as `/tag@MyNairatagbot femi`; disable privacy mode only if the bot must respond to ordinary non-command messages. Personal commands such as `/link` and `/notifications` remain private-chat-only.

## Production notes

- Use a public HTTPS URL for WhatsApp webhook delivery.
- Keep the RPC URL and registry address server-side.
- Add rate limiting and request logging before public deployment.
- Do not add a server-side private key unless custodial claims are explicitly designed, audited, and approved.
