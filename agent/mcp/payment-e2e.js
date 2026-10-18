const { createPublicClient, createWalletClient, http, parseEventLogs, getAddress } = require('../../bots/nairatag-claim/node_modules/viem');
const { privateKeyToAccount } = require('../../bots/nairatag-claim/node_modules/viem/accounts');

const chain = { id: 901, name: 'TagProtocol', nativeCurrency: { name: 'cNGN', symbol: 'cNGN', decimals: 18 }, rpcUrls: { default: { http: ['http://127.0.0.1:9545'] } } };
const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const publicClient = createPublicClient({ chain, transport: http('http://127.0.0.1:9545') });
const walletClient = createWalletClient({ account, chain, transport: http('http://127.0.0.1:9545') });
const address = getAddress('0x0B306BF915C4d645ff596e518fAf3F9669b97016');
const abi = [
  { type: 'function', name: 'createRequest', stateMutability: 'nonpayable', inputs: [{ name: 'tag', type: 'string' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'paymentRef', type: 'string' }], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'pay', stateMutability: 'payable', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [] },
  { type: 'event', name: 'PaymentRequestCreated', inputs: [{ name: 'id', type: 'bytes32', indexed: true }, { name: 'tag', type: 'string', indexed: false }, { name: 'token', type: 'address', indexed: false }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'paymentRef', type: 'string', indexed: false }] },
];
(async () => {
  const amount = 1000000000000n;
  const createHash = await walletClient.writeContract({ address, abi, functionName: 'createRequest', args: ['₦nairatag', '0x0000000000000000000000000000000000000000', amount, `agent-e2e-${Date.now()}`] });
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
  const events = parseEventLogs({ abi, eventName: 'PaymentRequestCreated', logs: createReceipt.logs });
  const requestId = events[0].args.id;
  const payHash = await walletClient.writeContract({ address, abi, functionName: 'pay', args: [requestId], value: amount });
  const payReceipt = await publicClient.waitForTransactionReceipt({ hash: payHash });
  console.log(JSON.stringify({ requestId, createHash, payHash, status: payReceipt.status, blockNumber: payReceipt.blockNumber.toString() }));
})().catch(error => { console.error(error); process.exit(1); });
