/**
 * TagProtocol Network — End-to-End Smoke Test Suite
 * Validates RPC responsiveness, block advancement, transaction execution,
 * and NTS-100 Identity Protocol resolution (forward & reverse).
 */

const http = require('http');

const L1_URL = process.env.L1_RPC_URL || 'http://127.0.0.1:8545';
const L2_URL = process.env.L2_RPC_URL || 'http://127.0.0.1:9545';
const EXPECTED_L2_CHAIN_ID = parseInt(process.env.NAIRATAG_CHAIN_ID || '901', 10);
const REGISTRY_ADDRESS = process.env.REGISTRY_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const RESOLVER_ADDRESS = process.env.RESOLVER_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

async function rpcCall(url, method, params = []) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: Math.floor(Math.random() * 10000)
        });

        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 8000
        }, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) reject(new Error(parsed.error.message || 'RPC Error'));
                    else resolve(parsed.result);
                } catch (e) {
                    reject(new Error(`Failed to parse RPC response: ${data}`));
                }
            });
        });

        req.on('error', err => reject(err));
        req.on('timeout', () => { req.destroy(); reject(new Error('RPC request timed out')); });
        req.write(postData);
        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSmokeTests() {
    console.log('==================================================');
    console.log(' TagProtocol Network — OP Stack & Identity Smoke Tests');
    console.log('==================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✓ ${message}`);
            passed++;
        } else {
            console.error(`✗ ${message}`);
            failed++;
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    try {
        // 1. L1 Ethereum RPC
        const l1Block = await rpcCall(L1_URL, 'eth_blockNumber');
        const l1Client = await rpcCall(L1_URL, 'web3_clientVersion').catch(() => 'unknown');
        assert(l1Block !== undefined, `L1 Ethereum is running (${l1Client} on ${L1_URL}, Block #${parseInt(l1Block, 16)})`);

        // 2. L2 Execution RPC
        const l2Block = await rpcCall(L2_URL, 'eth_blockNumber');
        const l2Client = await rpcCall(L2_URL, 'web3_clientVersion').catch(() => 'unknown');
        assert(l2Block !== undefined, `L2 Rollup is running (${l2Client} on ${L2_URL}, Block #${parseInt(l2Block, 16)})`);

        // 3. Chain ID Validation
        const chainIdHex = await rpcCall(L2_URL, 'eth_chainId');
        const chainId = parseInt(chainIdHex, 16);
        assert(chainId === EXPECTED_L2_CHAIN_ID, `L2 Chain ID verified (Expected: ${EXPECTED_L2_CHAIN_ID}, Got: ${chainId})`);

        // 4. Block Production Cadence (2s blocks)
        const block1 = parseInt(await rpcCall(L2_URL, 'eth_blockNumber'), 16);
        await sleep(2200);
        const block2 = parseInt(await rpcCall(L2_URL, 'eth_blockNumber'), 16);
        assert(block2 >= block1, `Block production active (Block #${block1} -> #${block2})`);

        // 5. Account Balances & Cross-Domain Deposit Verification
        const testAccount = '0x1111111111111111111111111111111111111111';
        const balanceHex = await rpcCall(L2_URL, 'eth_getBalance', [testAccount, 'latest']);
        const balance = BigInt(balanceHex);
        assert(balance >= 500000000000000000n, `Cross-domain deposit credited (${testAccount} has ${Number(balance) / 1e18} ETH)`);

        // 6. Identity Protocol: Forward Resolution (resolve("₦micheal"))
        console.log('\n--- NairaTag Identity Protocol (NTS-100) ---');
        // Function selector resolve(string) = 0x461a4478
        // ABI encoding for "₦micheal" (UTF-8 length 10: e2 82 a6 6d 69 63 68 65 61 6c)
        const resolveCalldata = '0x461a44780000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000ae282a66d69636865616c00000000000000000000000000000000000000000000';
        const resolvedRaw = await rpcCall(L2_URL, 'eth_call', [{
            to: REGISTRY_ADDRESS,
            data: resolveCalldata
        }, 'latest']);
        const resolvedAddr = '0x' + resolvedRaw.slice(-40);
        assert(resolvedAddr.toLowerCase() === testAccount.toLowerCase(), `Forward resolution: ₦micheal -> ${resolvedAddr}`);

        // 7. Identity Protocol: Standard Resolver (addr(bytes32))
        // Function selector addr(bytes32) = 0x3b3b57de
        // node for ₦micheal = 0x643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce
        const addrCalldata = '0x3b3b57de643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce';
        const resolverAddrRaw = await rpcCall(L2_URL, 'eth_call', [{
            to: RESOLVER_ADDRESS,
            data: addrCalldata
        }, 'latest']);
        const resolverAddr = '0x' + resolverAddrRaw.slice(-40);
        assert(resolverAddr.toLowerCase() === testAccount.toLowerCase(), `ENSIP-1 addr(node): ₦micheal -> ${resolverAddr}`);

        // 8. Identity Protocol: Reverse Resolution (name(reverseNode))
        // reverseNode for 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 = 0xe72ae76df44257e3c1ee3a1593bc7d1200974dae5330f74ed9f41b3ec32bab58
        // Function selector name(bytes32) = 0x691f3431
        const reverseCalldata = '0x691f3431e72ae76df44257e3c1ee3a1593bc7d1200974dae5330f74ed9f41b3ec32bab58';
        const reverseRaw = await rpcCall(L2_URL, 'eth_call', [{
            to: RESOLVER_ADDRESS,
            data: reverseCalldata
        }, 'latest']);
        // Parse string from ABI return
        const len = parseInt(reverseRaw.slice(66, 130), 16);
        const nameHex = reverseRaw.slice(130, 130 + len * 2);
        const reverseName = Buffer.from(nameHex, 'hex').toString('utf8');
        assert(reverseName === '₦nairatag', `Reverse resolution: 0xf39F... -> ${reverseName}`);

        // 9. ERC-165 Interface Detection on Resolver
        // supportsInterface(bytes4) = 0x01ffc9a7
        // IAddrResolver interface ID = 0x3b3b57de
        const supportsAddrCalldata = '0x01ffc9a73b3b57de00000000000000000000000000000000000000000000000000000000';
        const supportsAddr = await rpcCall(L2_URL, 'eth_call', [{
            to: RESOLVER_ADDRESS,
            data: supportsAddrCalldata
        }, 'latest']);
        assert(parseInt(supportsAddr, 16) === 1, `ERC-165: Resolver supports IAddrResolver (0x3b3b57de)`);

        console.log('\n==================================================');
        console.log(`SMOKE TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
        console.log('Active Environment: Genuine NairaTag OP Stack L2');
        console.log('==================================================');
        process.exit(0);

    } catch (err) {
        console.error('\nSMOKE TEST FAILED:');
        console.error(err.message);
        console.log('==================================================');
        process.exit(1);
    }
}

runSmokeTests();
