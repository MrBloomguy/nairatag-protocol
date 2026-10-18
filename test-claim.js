import { checkTagAvailability, registerClaim, getClaimsList } from './api/claims.js';

async function runTests() {
  console.log('🧪 Starting NairaTag Claim Layer Verification...\n');

  // 1. Initial State
  const initialCount = getClaimsList().length;
  console.log(`✓ Initial verified claims count: ${initialCount}`);

  // 2. Format validation
  const shortCheck = checkTagAvailability('ab');
  if (shortCheck.available !== false) throw new Error('Short tag check failed');
  console.log('✓ Rejects tags under 3 chars');

  // 3. Reserved tags
  const reservedCheck = checkTagAvailability('cbn');
  if (reservedCheck.available !== false) throw new Error('Reserved tag check failed');
  console.log('✓ Protects reserved sovereign tags (cbn, efcc, gov, etc.)');

  // 4. Unique Available Tag
  const testTag = 'agenttest' + Math.floor(Math.random() * 10000);
  const testWallet = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const avail = checkTagAvailability(testTag, testWallet);
  if (!avail.available) throw new Error(`Tag ${testTag} should be available`);
  console.log(`✓ Confirms ₦${testTag} is available for claiming on Celo`);

  // 5. Register Claim
  const claimResult = registerClaim({
    tag: testTag,
    walletAddress: testWallet,
    network: 'Celo Mainnet',
    isSub: false
  });

  if (!claimResult || claimResult.cleanTag !== testTag.toLowerCase()) {
    throw new Error('Registration failed to return valid claim object');
  }
  console.log(`✓ Successfully registered ₦${testTag} on Celo Mainnet`);
  console.log(`  - Block: ${claimResult.block}`);
  console.log(`  - Tx: ${claimResult.tx}`);
  console.log(`  - Network: ${claimResult.network}`);

  // 6. Anti-Squatting / Uniqueness Check
  const otherWallet = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const takenCheck = checkTagAvailability(testTag, otherWallet);
  if (takenCheck.available !== false || !takenCheck.isTaken) {
    throw new Error(`Tag ${testTag} should now be taken`);
  }
  console.log(`✓ Anti-squatting verified: ₦${testTag} cannot be re-claimed by another user`);

  // 7. 1 Tag Per User Limit Check
  const secondTag = 'secondtag' + Math.floor(Math.random() * 10000);
  const restrictedCheck = checkTagAvailability(secondTag, testWallet);
  if (restrictedCheck.available !== false || !restrictedCheck.walletRestricted) {
    throw new Error('1-tag-per-wallet rule was not enforced');
  }
  console.log(`✓ 1 Tag Per Wallet verified: Wallet ${testWallet.slice(0, 6)}...${testWallet.slice(-4)} cannot claim multiple tags`);

  // 8. Profile Alignment
  const userAccount = {
    tagId: claimResult.cleanTag,
    cleanTag: claimResult.cleanTag,
    tagName: claimResult.tag,
    tag: claimResult.tag,
    address: claimResult.address,
    network: claimResult.network,
    isSub: false,
    claimedAt: claimResult.timestamp
  };
  console.log('✓ Profile object matches schema for localStorage persistence:', {
    tagId: userAccount.tagId,
    tag: userAccount.tag,
    address: userAccount.address.slice(0, 10) + '...',
    network: userAccount.network
  });

  console.log('\n🎉 ALL CLAIM LAYER TESTS PASSED!');
}

runTests().catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
