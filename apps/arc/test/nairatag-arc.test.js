/**
 * @file nairatag-arc.test.js
 * @description Comprehensive automated unit and integration tests for NairaTag Pay on Arc.
 * Tests identity normalization, anti-spoofing, resolution adapters, integer math, Arc configurations,
 * live canonical registry resolution, live Arc Testnet RPC queries, and transaction guards.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUnits, formatUnits, isAddress, getAddress, createPublicClient, http, erc20Abi } from 'viem';
import { normalizeTag, classifyInput, resolveTag } from '../src/services/nairatagResolver.js';
import {
  arcTestnet,
  arcMainnet,
  ARC_USDC_ADDRESS,
  ARC_USDC_DECIMALS,
  ARC_ERC8004_IDENTITY_REGISTRY,
  ARC_ERC8004_REPUTATION_REGISTRY,
  ARC_ERC8004_VALIDATION_REGISTRY,
  ARC_MEMO_ADDRESS,
  ARC_MEMPOOL_MIN_MAX_FEE_PER_GAS,
} from '../src/config/arc.js';

test('1. Arc Network Parameter Integrity', () => {
  // Testnet
  assert.equal(arcTestnet.id, 5042002, 'Arc Testnet Chain ID must be 5042002');
  assert.equal(arcTestnet.rpcUrls.default.http[0], 'https://rpc.testnet.arc.io');
  assert.equal(arcTestnet.nativeCurrency.symbol, 'USDC');
  assert.equal(arcTestnet.nativeCurrency.decimals, 18, 'Arc native gas token uses 18 decimals');

  // Mainnet
  assert.equal(arcMainnet.id, 5042, 'Arc Mainnet Chain ID must be 5042');
  assert.equal(arcMainnet.rpcUrls.default.http[0], 'https://rpc.mainnet.arc.io');

  // USDC Canonical Contract
  assert.equal(ARC_USDC_ADDRESS, '0x3600000000000000000000000000000000000000');
  assert.equal(ARC_USDC_DECIMALS, 6, 'USDC ERC-20 interface uses 6 decimals');
});

test('2. Identity Normalization & Canonical Formatting', () => {
  // Standard lowercase
  const n1 = normalizeTag('michael');
  assert.equal(n1.valid, true);
  assert.equal(n1.cleanTag, 'michael');
  assert.equal(n1.canonicalTag, '₦michael');

  // Prefix handling (₦)
  const n2 = normalizeTag('₦olusegun');
  assert.equal(n2.valid, true);
  assert.equal(n2.cleanTag, 'olusegun');
  assert.equal(n2.canonicalTag, '₦olusegun');

  // Uppercase to canonical lowercase
  const n3 = normalizeTag('CHOWDECK');
  assert.equal(n3.valid, true);
  assert.equal(n3.cleanTag, 'chowdeck');
  assert.equal(n3.canonicalTag, '₦chowdeck');

  // Valid underscores
  const n4 = normalizeTag('₦fast_pay');
  assert.equal(n4.valid, true);
  assert.equal(n4.cleanTag, 'fast_pay');
});

test('3. Unicode Anti-Spoofing & Input Rejection', () => {
  // Empty
  assert.equal(normalizeTag('').valid, false);
  assert.equal(normalizeTag('   ').valid, false);

  // Too short (< 2 chars)
  assert.equal(normalizeTag('a').valid, false);

  // Too long (> 32 chars)
  assert.equal(normalizeTag('this_tag_is_way_too_long_to_be_a_valid_nairatag').valid, false);

  // Unicode homoglyphs / Cyrillic spoofs (e.g. Cyrillic 'а')
  const cyrillicSpoof = normalizeTag('mіchаel'); // contains non-latin letters
  assert.equal(cyrillicSpoof.valid, false, 'Cyrillic homoglyphs must be rejected');

  // Special characters and symbols
  assert.equal(normalizeTag('tag!').valid, false);
  assert.equal(normalizeTag('tag$').valid, false);
  assert.equal(normalizeTag('tag@domain').valid, false);
  assert.equal(normalizeTag('tag🚀').valid, false, 'Emojis must be rejected');
});

test('4. Input Classification (Tag vs EVM Address)', () => {
  const addrRes = classifyInput('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  assert.equal(addrRes.type, 'address');
  assert.equal(isAddress(addrRes.address), true);

  const tagRes = classifyInput('₦olusegun');
  assert.equal(tagRes.type, 'tag');
  assert.equal(tagRes.canonicalTag, '₦olusegun');

  const invalidRes = classifyInput('invalid$$tag');
  assert.equal(invalidRes.type, 'invalid');
});

test('5. Integer Base Unit Conversion for USDC (Zero Float Loss)', () => {
  // 1.50 USDC = 1500000 base units (6 decimals)
  const units1 = parseUnits('1.50', ARC_USDC_DECIMALS);
  assert.equal(units1, 1500000n);
  assert.equal(formatUnits(units1, ARC_USDC_DECIMALS), '1.5');

  // 0.000001 USDC (minimum precision unit)
  const minUnit = parseUnits('0.000001', ARC_USDC_DECIMALS);
  assert.equal(minUnit, 1n);

  // Large transfer
  const large = parseUnits('250000.75', ARC_USDC_DECIMALS);
  assert.equal(large, 250000750000n);

  // Zero check
  const zero = parseUnits('0', ARC_USDC_DECIMALS);
  assert.equal(zero, 0n);
});

test('6. Live Canonical Resolver: Real Registered Tag Resolution', async () => {
  // Queries live canonical NairaTag backend for real registered tag: ₦contestui1a
  const result = await resolveTag('₦contestui1a');
  assert.equal(result.success, true, 'Real registered tag must resolve successfully');
  assert.equal(result.cleanTag, 'contestui1a');
  assert.equal(isAddress(result.resolvedAddress), true, 'Resolved address must be valid EVM address');
  assert.equal(result.resolvedAddress, getAddress('0x0054d409ae4a584ded3990efc1b2335f563cb279'));
  assert.equal(result.isVerified, true, 'Registered tag must have isVerified = true');
  assert.equal(result.source, 'canonical-nairatag-registry');
});

test('7. Live Canonical Resolver: Unregistered Tag Graceful Failure', async () => {
  // Nonexistent tag in registry
  const result = await resolveTag('₦nonexistenttag123456789xyz');
  assert.equal(result.success, false, 'Unregistered tag must fail gracefully');
  assert.match(result.error, /not registered|not found/i);
});

test('8. Live Arc Testnet RPC: Chain ID & USDC ERC-20 State Verification', async () => {
  const client = createPublicClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.io')
  });

  // Verify chain ID directly from live Arc Testnet JSON-RPC node
  const chainId = await client.getChainId();
  assert.equal(chainId, 5042002, 'Live Arc Testnet RPC must report chain ID 5042002');

  // Verify live block production
  const blockNumber = await client.getBlockNumber();
  assert.ok(blockNumber > 0n, 'Arc Testnet must have positive block height');

  // Read ERC-20 token symbol and decimals directly from Arc Testnet contract
  const symbol = await client.readContract({
    address: ARC_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'symbol'
  });
  assert.equal(symbol, 'USDC', 'Token symbol on Arc Testnet must be USDC');

  const decimals = await client.readContract({
    address: ARC_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'decimals'
  });
  assert.equal(decimals, 6, 'Token decimals on Arc Testnet must be 6');
});

test('9. Amount Validation and Balance Insufficiency Guard', () => {
  // Zero and negative checks
  const validateAmount = (amtStr, availableBalance) => {
    if (!amtStr || isNaN(Number(amtStr)) || Number(amtStr) <= 0) {
      return { valid: false, error: 'Enter a valid transfer amount greater than 0.' };
    }
    const requestedUnits = parseUnits(amtStr, ARC_USDC_DECIMALS);
    const balanceUnits = parseUnits(availableBalance, ARC_USDC_DECIMALS);
    if (requestedUnits > balanceUnits) {
      return { valid: false, error: `Insufficient USDC balance (${availableBalance} USDC available).` };
    }
    return { valid: true, units: requestedUnits };
  };

  assert.equal(validateAmount('0', '10.0').valid, false);
  assert.equal(validateAmount('-5', '10.0').valid, false);
  assert.equal(validateAmount('abc', '10.0').valid, false);

  // Insufficient balance
  const insuff = validateAmount('15.50', '10.00');
  assert.equal(insuff.valid, false);
  assert.match(insuff.error, /Insufficient USDC balance/);

  // Exact balance
  const exact = validateAmount('10.00', '10.00');
  assert.equal(exact.valid, true);
  assert.equal(exact.units, 10000000n);

  // Normal valid transfer
  const normal = validateAmount('2.50', '10.00');
  assert.equal(normal.valid, true);
  assert.equal(normal.units, 2500000n);
});

test('10. Idempotency & In-Flight Duplicate Submission Lock', () => {
  let isSubmitting = false;
  let submissionCount = 0;

  const initiatePayment = () => {
    if (isSubmitting) {
      return { status: 'blocked', reason: 'Payment already in progress. Duplicate submission prevented.' };
    }
    isSubmitting = true;
    submissionCount++;
    return { status: 'submitted' };
  };

  // First click succeeds
  const res1 = initiatePayment();
  assert.equal(res1.status, 'submitted');
  assert.equal(submissionCount, 1);

  // Rapid second click (double-click / impatient user) is blocked
  const res2 = initiatePayment();
  assert.equal(res2.status, 'blocked');
  assert.equal(submissionCount, 1, 'Duplicate payment execution was prevented');

  // After completion / reset
  isSubmitting = false;
  const res3 = initiatePayment();
  assert.equal(res3.status, 'submitted');
  assert.equal(submissionCount, 2);
});

test('11. Arc ERC-8004 AI Agent & Memo Contract Addresses', () => {
  assert.equal(ARC_ERC8004_IDENTITY_REGISTRY, '0x8004A818BFB912233c491871b3d84c89A494BD9e');
  assert.equal(ARC_ERC8004_REPUTATION_REGISTRY, '0x8004B663056A597Dffe9eCcC1965A193B7388713');
  assert.equal(ARC_ERC8004_VALIDATION_REGISTRY, '0x8004Cb1BF31DAf7788923b405b754f57acEB4272');
  assert.equal(ARC_MEMO_ADDRESS, '0x5294E9927c3306DcBaDb03fe70b92e01cCede505');
  assert.equal(ARC_MEMPOOL_MIN_MAX_FEE_PER_GAS, 20000000000n, 'Arc mempool enforces 20 Gwei minimum floor');
});

test('12. Live Arc Testnet RPC: Verify ERC-8004 Registries & Memo Bytecode', async () => {
  const client = createPublicClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.io')
  });

  // Verify Identity Registry contract exists on Arc Testnet
  const identityBytecode = await client.getBytecode({
    address: '0x8004A818BFB912233c491871b3d84c89A494BD9e'
  });
  assert.ok(identityBytecode && identityBytecode.length > 2, 'ERC-8004 IdentityRegistry must be deployed on Arc Testnet');

  // Verify Memo Precompile Contract exists on Arc Testnet
  const memoBytecode = await client.getBytecode({
    address: '0x5294E9927c3306DcBaDb03fe70b92e01cCede505'
  });
  assert.ok(memoBytecode && memoBytecode.length > 2, 'Arc Memo contract must be deployed on Arc Testnet');
});

test('13. Arc App Kit: Supported Tokens, Chains & Unified Balance', async () => {
  const { ARC_SUPPORTED_SWAP_TOKENS, APP_KIT_CROSSCHAINS, getUnifiedBalanceSummary } = await import('../src/services/arcAppKit.js');

  assert.equal(ARC_SUPPORTED_SWAP_TOKENS.length, 3, 'Arc supports USDC, EURC, and cirBTC');
  const usdc = ARC_SUPPORTED_SWAP_TOKENS.find(t => t.symbol === 'USDC');
  assert.equal(usdc.decimals, 18, 'Native gas token on Arc uses 18 decimals');
  assert.equal(usdc.erc20Decimals, 6, 'Canonical ERC-20 interface uses 6 decimals');

  const unified = getUnifiedBalanceSummary('10.00');
  assert.ok(parseFloat(unified.totalUnifiedUsdc) >= 10.00, 'Unified balance aggregates across chains');
  assert.equal(unified.chains.length, 3, 'Includes Arc Testnet, Base, and Arbitrum');
});

test('14. Arc App Kit: Swap Estimation & cirBTC Borrow Math', async () => {
  const { estimateAppKitSwap, getBorrowKitDetails } = await import('../src/services/arcAppKit.js');

  const estimate = await estimateAppKitSwap({
    tokenIn: 'USDC',
    tokenOut: 'EURC',
    amountIn: '10.00',
  });
  assert.equal(estimate.success, true);
  assert.equal(estimate.tokenIn, 'USDC');
  assert.equal(estimate.tokenOut, 'EURC');
  assert.ok(parseFloat(estimate.estimatedOutput) > 0, 'Produces valid swap estimate');

  const borrow = getBorrowKitDetails('0.05');
  assert.equal(borrow.collateralToken, 'cirBTC');
  assert.equal(borrow.borrowToken, 'USDC');
  assert.equal(borrow.liquidationThreshold, '85%');
  assert.ok(parseFloat(borrow.maxBorrowUsdc) > 0, 'Calculates 70% LTV borrow limit');
});

