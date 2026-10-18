/**
 * @file scripts/hyperlane-relayer.js
 * @description Real-time relayer service between Chain 902 and Chain 901.
 * Observes Dispatch events from Chain 902 Mailbox and executes delivery (process) on Chain 901 Mailbox.
 */

const fs = require('fs');
const path = require('path');
const {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseAbiItem
} = require('../packages/viem/node_modules/viem');
const { privateKeyToAccount } = require('../packages/viem/node_modules/viem/accounts');

const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const relayerAccount = privateKeyToAccount(DEPLOYER_KEY);

const client902 = createPublicClient({ transport: http('http://127.0.0.1:9546') });
const client901 = createPublicClient({ transport: http('http://127.0.0.1:9545') });
const wallet901 = createWalletClient({ account: relayerAccount, transport: http('http://127.0.0.1:9545') });

const ADDRESSES_PATH = path.join(__dirname, '../bridge/hyperlane/deployments/addresses.json');

const DISPATCH_EVENT = parseAbiItem(
  'event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes message)'
);

const MAILBOX_ABI = parseAbi([
  'function process(bytes calldata metadata, bytes calldata message) payable',
  'function delivered(bytes32 messageId) view returns (bool)'
]);

async function main() {
  if (!fs.existsSync(ADDRESSES_PATH)) {
    console.error('Addresses file not found. Deploy bridge first.');
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(ADDRESSES_PATH, 'utf8'));
  const mailbox902 = addresses.chain902.mailbox;
  const mailbox901 = addresses.nairatag901.mailbox;

  console.log('================================================================');
  console.log(' NairaTag Hyperlane Relayer Service Active');
  console.log(` Listening on Chain 902 Mailbox: ${mailbox902}`);
  console.log(` Forwarding to Chain 901 Mailbox: ${mailbox901}`);
  console.log('================================================================\n');

  let lastBlock = 0n;

  const poll = async () => {
    try {
      const currentBlock = await client902.getBlockNumber();
      if (lastBlock === 0n) {
        lastBlock = currentBlock > 10n ? currentBlock - 10n : 0n;
      }

      if (currentBlock >= lastBlock) {
        const logs = await client902.getLogs({
          address: mailbox902,
          event: DISPATCH_EVENT,
          fromBlock: lastBlock,
          toBlock: currentBlock
        });

        for (const log of logs) {
          const { destination, message } = log.args;
          if (destination === 901) {
            console.log(`\n[Relayer] >>> Intercepted cross-chain dispatch to Chain 901`);
            console.log(`[Relayer] Tx Hash (Chain 902): ${log.transactionHash}`);

            try {
              const txHash = await wallet901.writeContract({
                address: mailbox901,
                abi: MAILBOX_ABI,
                functionName: 'process',
                args: ['0x', message]
              });

              console.log(`[Relayer] Processing delivery on Chain 901...`);
              const receipt = await client901.waitForTransactionReceipt({ hash: txHash });
              console.log(`[Relayer] ✓ Message Delivered on Chain 901!`);
              console.log(`[Relayer] Delivery Tx: ${txHash} (Block #${receipt.blockNumber})\n`);
            } catch (err) {
              if (err.message && err.message.includes('Already delivered')) {
                // message already delivered, ignore
              } else {
                console.error('[Relayer] Delivery error:', err.shortMessage || err.message);
              }
            }
          }
        }
        lastBlock = currentBlock + 1n;
      }
    } catch (err) {
      // console.error('[Relayer] Poll error:', err.message);
    }
  };

  // Poll every 500ms
  setInterval(poll, 500);
}

main().catch(err => {
  console.error('Relayer fatal error:', err);
  process.exit(1);
});
