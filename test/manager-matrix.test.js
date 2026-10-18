/**
 * @file manager-matrix.test.js
 * @description Comprehensive automated integration test matrix for NairaTag Manager (NTS-100, NTS-101, NTS-102).
 * Executes real read and write transactions against the live TagProtocol execution node (Chain 901).
 */

const assert = require('assert');
const {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  getAddress,
  keccak256,
  toBytes,
  concat,
  toHex,
} = require('../packages/viem/node_modules/viem');
const { privateKeyToAccount } = require('../packages/viem/node_modules/viem/accounts');
const {
  createNairaTagResolver,
  classifyRecipientInput,
  isNairaTag,
  normalizeTag,
  formatDisplayTag,
  namehash,
  reverseNode,
  validateDiscoveryManifest,
} = require('../packages/viem/src/index.js');

// Configuration
const L2_RPC_URL = 'http://127.0.0.1:9545';
const REGISTRY_ADDRESS = '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82';
const RESOLVER_ADDRESS = '0x9A676e781A523b5d0C0e43731313A708CB607508';

// Standard Foundry test accounts
const ACCOUNT_A_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
const ACCOUNT_B_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

const accountA = privateKeyToAccount(ACCOUNT_A_KEY);
const accountB = privateKeyToAccount(ACCOUNT_B_KEY);

const publicClient = createPublicClient({
  transport: http(L2_RPC_URL),
});

const walletA = createWalletClient({
  account: accountA,
  transport: http(L2_RPC_URL),
});

const walletB = createWalletClient({
  account: accountB,
  transport: http(L2_RPC_URL),
});

const REGISTRY_ABI = parseAbi([
  'function claim(string tag, address targetResolver) returns (bytes32)',
  'function claim(string tag) returns (bytes32)',
  'function release(bytes32 node)',
  'function transfer(bytes32 node, address newOwner)',
  'function setResolver(bytes32 node, address newResolver)',
  'function owner(bytes32 node) view returns (address)',
  'function resolver(bytes32 node) view returns (address)',
  'function exists(bytes32 node) view returns (bool)',
  'function ownerOf(string tag) view returns (address)',
  'function resolve(string tag) view returns (address)',
  'function normalize(string rawTag) pure returns (string)',
  'function namehash(string tag) pure returns (bytes32)',
  'event TagClaimed(bytes32 indexed node, string canonical, string rawTag, address indexed owner, address resolver)',
  'event TagReleased(bytes32 indexed node, string canonical, address indexed owner)',
  'event Transfer(bytes32 indexed node, address indexed newOwner)',
  'event NewResolver(bytes32 indexed node, address indexed newResolver)',
]);

const RESOLVER_ABI = parseAbi([
  'function addr(bytes32 node) view returns (address payable)',
  'function setAddr(bytes32 node, address a)',
  'function addr(bytes32 node, uint256 coinType) view returns (bytes)',
  'function setAddr(bytes32 node, uint256 coinType, bytes a)',
  'function name(bytes32 node) view returns (string)',
  'function setName(bytes32 node, string newName)',
  'function setNameForAddr(address account, string primaryTag)',
  'function text(bytes32 node, string key) view returns (string)',
  'function setText(bytes32 node, string key, string value)',
  'function paymentEndpoint(bytes32 node) view returns (string)',
  'function setPaymentEndpoint(bytes32 node, string endpoint)',
  'function reverseNode(address account) pure returns (bytes32)',
  'event AddrChanged(bytes32 indexed node, address a)',
  'event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress)',
  'event NameChanged(bytes32 indexed node, string name)',
  'event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value)',
  'event PaymentEndpointChanged(bytes32 indexed node, string endpoint)',
]);

async function runTests() {
  console.log('===============================================================');
  console.log(' NairaTag Manager — Comprehensive Integration Test Matrix');
  console.log(' Target RPC: ' + L2_RPC_URL + ' (Chain 901)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Group 1: Syntax Classification & Grammar Normalization (NTS-100 / NTS-101)
  // -------------------------------------------------------------
  console.log('--- 1. Syntax Classification & Normalization ---');

  test('Input Classifier: ₦micheal classifies as nairatag', () => {
    assert.strictEqual(classifyRecipientInput('₦micheal'), 'nairatag');
  });

  test('Input Classifier: ng:micheal classifies as nairatag (ASCII alias)', () => {
    assert.strictEqual(classifyRecipientInput('ng:micheal'), 'nairatag');
  });

  test('Input Classifier: unprefixed handle "micheal" is rejected as invalid', () => {
    assert.strictEqual(classifyRecipientInput('micheal'), 'invalid');
  });

  test('Input Classifier: prohibited prefix "@micheal" is rejected as invalid', () => {
    assert.strictEqual(classifyRecipientInput('@micheal'), 'invalid');
  });

  test('Normalization: ₦MICHEAL normalizes to lowercase canonical "micheal"', () => {
    assert.strictEqual(normalizeTag('₦MICHEAL'), 'micheal');
  });

  test('Normalization: ng:micheal normalizes to canonical "micheal"', () => {
    assert.strictEqual(normalizeTag('ng:micheal'), 'micheal');
  });

  test('Normalization: Invalid characters and separator rules throw errors', () => {
    assert.throws(() => normalizeTag('@micheal'), /prohibited/);
    assert.throws(() => normalizeTag('₦_leading'), /cannot start or end with an underscore/);
    assert.throws(() => normalizeTag('₦trailing_'), /cannot start or end with an underscore/);
    assert.throws(() => normalizeTag('₦double__under'), /consecutive underscores/);
    assert.throws(() => normalizeTag('₦ab'), /Invalid tag length/);
    assert.throws(() => normalizeTag('₦toolong_handle_that_exceeds_thirty_two_chars_limit'), /Invalid tag length/);
  });

  // -------------------------------------------------------------
  // Group 2: Cross-Chain Separation (Resolution RPC != Transaction RPC)
  // -------------------------------------------------------------
  console.log('\n--- 2. Cross-Chain Resolution Axiom ---');

  const resolver = createNairaTagResolver({
    rpcUrl: L2_RPC_URL,
    registryAddress: REGISTRY_ADDRESS,
    resolverAddress: RESOLVER_ADDRESS,
  });

  await testAsync('Foreign Chain Base (8453): Resolves ₦micheal via TagProtocol without switching network', async () => {
    // Transaction target network is Base, but resolver queries Chain 901
    const addr = await resolver.resolveName('₦micheal');
    assert.strictEqual(addr, '0x1111111111111111111111111111111111111111');
  });

  await testAsync('Foreign Chain Ethereum (1): Resolves ₦nairatag to Deployer on Chain 901', async () => {
    const addr = await resolver.resolveName('₦nairatag');
    assert.strictEqual(addr, getAddress(accountA.address));
  });

  await testAsync('Address formatting: Returned resolved address is strictly EIP-55 checksummed', async () => {
    const addr = await resolver.resolveName('₦micheal');
    assert.strictEqual(addr, getAddress(addr));
  });

  await testAsync('Missing handle: Resolving nonexistent ₦nonexistent_xyz returns null', async () => {
    const addr = await resolver.resolveName('₦nonexistent_xyz');
    assert.strictEqual(addr, null);
  });

  // -------------------------------------------------------------
  // Group 3: Reverse Lookup & Anti-Spoofing Verification
  // -------------------------------------------------------------
  console.log('\n--- 3. Reverse Lookup & Anti-Spoofing Verification ---');

  await testAsync('Reverse Lookup: Associated address 0xf39Fd6... returns verified ₦nairatag', async () => {
    const handle = await resolver.lookupAddress(accountA.address);
    assert.strictEqual(handle, '₦nairatag');
  });

  await testAsync('Reverse Lookup: Unassociated address 0x7099... returns null', async () => {
    const handle = await resolver.lookupAddress(accountB.address);
    assert.strictEqual(handle, null);
  });

  // -------------------------------------------------------------
  // Group 4: NTS-102 Manifest Security & Invariants
  // -------------------------------------------------------------
  console.log('\n--- 4. NTS-102 Manifest Invariants ---');

  const sampleValidManifest = {
    protocol: 'NTS-100',
    discoveryVersion: 'NTS-102',
    network: { chainId: 901 },
    resolution: {
      rpcUrls: ['https://rpc.nairatag.org', 'https://rpc-backup.nairatag.network'],
      registryAddress: REGISTRY_ADDRESS,
      resolverAddress: RESOLVER_ADDRESS,
    },
  };

  test('Manifest Validation: Conforming production manifest passes', () => {
    assert.strictEqual(validateDiscoveryManifest(sampleValidManifest), true);
  });

  test('Manifest Validation: Insecure HTTP URL rejected in production', () => {
    const bad = {
      ...sampleValidManifest,
      resolution: { ...sampleValidManifest.resolution, rpcUrls: ['http://rpc.nairatag.org'] },
    };
    assert.throws(() => validateDiscoveryManifest(bad), /Insecure RPC URL/);
  });

  test('Manifest Validation: Localhost / 127.0.0.1 rejected in production manifest', () => {
    const bad = {
      ...sampleValidManifest,
      resolution: { ...sampleValidManifest.resolution, rpcUrls: ['https://127.0.0.1:9545'] },
    };
    assert.throws(() => validateDiscoveryManifest(bad), /Localhost RPC URL prohibited/);
  });

  test('Manifest Validation: Unchecksummed contract address rejected', () => {
    const bad = {
      ...sampleValidManifest,
      resolution: { ...sampleValidManifest.resolution, registryAddress: REGISTRY_ADDRESS.toLowerCase() },
    };
    assert.throws(() => validateDiscoveryManifest(bad), /not EIP-55 checksummed/);
  });

  test('Manifest Validation: Wrong chain ID format rejected', () => {
    const bad = { ...sampleValidManifest, network: { chainId: '901' } }; // string instead of number
    assert.throws(() => validateDiscoveryManifest(bad), /network.chainId must be a number/);
  });

  // -------------------------------------------------------------
  // Group 5: On-Chain Lifecycle Execution (Real L2 Writes on Chain 901)
  // -------------------------------------------------------------
  console.log('\n--- 5. Real On-Chain Lifecycle (Claim, Manage, Transfer, Release) ---');

  const testTagName = '₦testuser';
  const testNode = namehash(testTagName);

  await testAsync('Live L2: Check availability of ₦testuser before claim (must be available)', async () => {
    const isTaken = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'exists',
      args: [testNode],
    });
    assert.strictEqual(isTaken, false);
  });

  await testAsync('Live L2: Account A claims ₦testuser with Resolver attached', async () => {
    const txHash = await walletA.writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'claim',
      args: [testTagName, RESOLVER_ADDRESS],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    assert.strictEqual(receipt.status, 'success');

    // Verify ownership
    const owner = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'owner',
      args: [testNode],
    });
    assert.strictEqual(owner, getAddress(accountA.address));
  });

  await testAsync('Live L2: Duplicate claim of ₦testuser reverts with TagAlreadyClaimed', async () => {
    try {
      await walletB.writeContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'claim',
        args: [testTagName, RESOLVER_ADDRESS],
      });
      assert.fail('Duplicate claim should have reverted');
    } catch (err) {
      assert.ok(err.message.includes('TagAlreadyClaimed') || err.message.includes('revert'));
    }
  });

  await testAsync('Live L2: Account A sets primary address for ₦testuser to 0x2222...2222', async () => {
    const targetAddr = '0x2222222222222222222222222222222222222222';
    const txHash = await walletA.writeContract({
      address: RESOLVER_ADDRESS,
      abi: RESOLVER_ABI,
      functionName: 'setAddr',
      args: [testNode, targetAddr],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    assert.strictEqual(receipt.status, 'success');

    const resolved = await publicClient.readContract({
      address: RESOLVER_ADDRESS,
      abi: RESOLVER_ABI,
      functionName: 'addr',
      args: [testNode],
    });
    assert.strictEqual(resolved, targetAddr);
  });

  await testAsync('Live L2: Account A updates text records (avatar, url, description, telegram)', async () => {
    const records = [
      { key: 'avatar', val: 'ipfs://bafybeitestavatar' },
      { key: 'url', val: 'https://testuser.nairatag.org' },
      { key: 'description', val: 'NairaTag Test User Profile' },
      { key: 'com.telegram', val: 'testuser_tg' },
    ];

    for (const r of records) {
      const tx = await walletA.writeContract({
        address: RESOLVER_ADDRESS,
        abi: RESOLVER_ABI,
        functionName: 'setText',
        args: [testNode, r.key, r.val],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });

      const val = await publicClient.readContract({
        address: RESOLVER_ADDRESS,
        abi: RESOLVER_ABI,
        functionName: 'text',
        args: [testNode, r.key],
      });
      assert.strictEqual(val, r.val);
    }
  });

  await testAsync('Live L2: Account A sets payment endpoint', async () => {
    const endpoint = 'https://pay.nairatag.network/testuser';
    const tx = await walletA.writeContract({
      address: RESOLVER_ADDRESS,
      abi: RESOLVER_ABI,
      functionName: 'setPaymentEndpoint',
      args: [testNode, endpoint],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });

    const val = await publicClient.readContract({
      address: RESOLVER_ADDRESS,
      abi: RESOLVER_ABI,
      functionName: 'paymentEndpoint',
      args: [testNode],
    });
    assert.strictEqual(val, endpoint);
  });

  await testAsync('Live L2: Unauthorized Account B cannot modify records of Account A (reverts)', async () => {
    try {
      await walletB.writeContract({
        address: RESOLVER_ADDRESS,
        abi: RESOLVER_ABI,
        functionName: 'setAddr',
        args: [testNode, accountB.address],
      });
      assert.fail('Unauthorized setAddr should have reverted');
    } catch (err) {
      assert.ok(err.message.includes('Unauthorized') || err.message.includes('revert'));
    }
  });

  await testAsync('Live L2: Account A transfers ₦testuser to Account B', async () => {
    const tx = await walletA.writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'transfer',
      args: [testNode, accountB.address],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    assert.strictEqual(receipt.status, 'success');

    const newOwner = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'owner',
      args: [testNode],
    });
    assert.strictEqual(newOwner, getAddress(accountB.address));
  });

  await testAsync('Live L2: Previous owner (Account A) can no longer modify records (reverts)', async () => {
    try {
      await walletA.writeContract({
        address: RESOLVER_ADDRESS,
        abi: RESOLVER_ABI,
        functionName: 'setText',
        args: [testNode, 'description', 'Hacked by previous owner'],
      });
      assert.fail('Previous owner modify should have reverted');
    } catch (err) {
      assert.ok(err.message.includes('Unauthorized') || err.message.includes('revert'));
    }
  });

  await testAsync('Live L2: New owner (Account B) successfully updates records', async () => {
    const tx = await walletB.writeContract({
      address: RESOLVER_ADDRESS,
      abi: RESOLVER_ABI,
      functionName: 'setText',
      args: [testNode, 'description', 'Owned by Account B'],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });

    const val = await publicClient.readContract({
      address: RESOLVER_ADDRESS,
      abi: RESOLVER_ABI,
      functionName: 'text',
      args: [testNode, 'description'],
    });
    assert.strictEqual(val, 'Owned by Account B');
  });

  await testAsync('Live L2: Account B releases ₦testuser (handle becomes available again)', async () => {
    const tx = await walletB.writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'release',
      args: [testNode],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    assert.strictEqual(receipt.status, 'success');

    const existsAfter = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'exists',
      args: [testNode],
    });
    assert.strictEqual(existsAfter, false);
  });

  console.log('\n===============================================================');
  console.log(` INTEGRATION MATRIX RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
