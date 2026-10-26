const { createPublicClient, http, parseAbi } = require('viem');

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.io')
});

const REGISTRY_ADDRESS = '0x034f64b644988406ded382ebabb5c981bd19684a';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const MEMO_ADDRESS = '0x5294E9927c3306DcBaDb03fe70b92e01cCede505';

const REGISTRY_ABI = parseAbi([
  'function ownerOf(string tag) view returns (address)',
  'function primaryTagOf(address user) view returns (bytes32)'
]);

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)'
]);

async function checkArc() {
  console.log('--- Connecting to Arc Testnet (Chain ID 5042002) ---');
  const blockNumber = await client.getBlockNumber();
  console.log('✓ Arc Testnet current block:', blockNumber.toString());

  const [name, symbol, decimals] = await Promise.all([
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'name' }),
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'symbol' }),
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'decimals' })
  ]);
  console.log('✓ Arc USDC Contract:', { address: USDC_ADDRESS, name, symbol, decimals });

  // Test tag resolution on registry
  const testTags = ['arc', 'bloom', 'nairatag', 'segun', 'test', 'demo', 'alice', 'bob'];
  console.log('\n--- Checking Onchain NairaTag Registry Resolution ---');
  for (const tag of testTags) {
    try {
      const owner = await client.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'ownerOf',
        args: [tag]
      });
      const isClaimed = owner !== '0x0000000000000000000000000000000000000000';
      console.log(`Tag [₦${tag.toUpperCase()}]: ${isClaimed ? 'CLAIMED by ' + owner : 'AVAILABLE'}`);
    } catch (e) {
      console.log(`Tag [₦${tag.toUpperCase()}]: error ->`, e.shortMessage || e.message);
    }
  }
}

checkArc().catch(err => console.error('Error:', err));
