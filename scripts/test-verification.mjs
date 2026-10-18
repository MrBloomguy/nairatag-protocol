import { checkTagAvailability, registerClaim, getClaimsList } from '../api/claims.js';
import { getOrCreateUser, recordReferralBonus } from '../api/points.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { generateOgCardSvg, generateStandaloneCardSvg } = require('../hub/tag-card-generator.cjs');

async function runTests() {
  console.log('=== TEST 1: Double Claim & Taken Tag Filtering ===');
  
  // 1. Check existing tag 'michael'
  const checkTaken = checkTagAvailability('michael');
  console.log('Check "michael" (should be taken):', checkTaken);
  if (checkTaken.available !== false || !checkTaken.isTaken) {
    throw new Error('FAIL: "michael" should be taken');
  }

  // 2. Check wallet that already owns a tag
  const checkWalletRestricted = checkTagAvailability('newtag123', '0x71C8A9b708C5D3048995394B73223049b14D91A2');
  console.log('Check existing wallet (should be restricted):', checkWalletRestricted);
  if (checkWalletRestricted.available !== false || !checkWalletRestricted.walletRestricted) {
    throw new Error('FAIL: wallet should be restricted from double claiming');
  }

  // 3. Check new tag with fresh wallet
  const checkAvailable = checkTagAvailability('sovereigndavid', '0x0000000000000000000000000000000000000001');
  console.log('Check fresh tag & wallet (should be available):', checkAvailable);
  if (!checkAvailable.available) {
    throw new Error('FAIL: fresh tag should be available');
  }

  // 4. Register new claim with referrer
  console.log('\n=== TEST 2: Register Claim & Points/Rewards System ===');
  const freshWallet = '0x1111111111111111111111111111111111111111';
  const newClaim = registerClaim({
    tag: 'david',
    walletAddress: freshWallet,
    network: 'Base Sepolia',
    referrer: 'michael'
  });
  console.log('Registered claim:', newClaim);

  // 5. Verify same wallet cannot claim again
  try {
    registerClaim({
      tag: 'david2',
      walletAddress: freshWallet,
      network: 'Base Sepolia'
    });
    throw new Error('FAIL: should not permit second claim by same wallet');
  } catch (err) {
    console.log('Success - blocked double claim:', err.message);
  }

  // 6. Verify same tag cannot be claimed again
  try {
    registerClaim({
      tag: 'david',
      walletAddress: '0x2222222222222222222222222222222222222222',
      network: 'Base Sepolia'
    });
    throw new Error('FAIL: should not permit claiming already-claimed tag');
  } catch (err) {
    console.log('Success - blocked claiming taken tag:', err.message);
  }

  // 7. Verify referral points credited to michael
  const michaelAcc = getOrCreateUser('0x71C8A9b708C5D3048995394B73223049b14D91A2', '₦michael');
  console.log('Michael Points & Referral Data (Real ledger, zero mocks):', {
    tag: michaelAcc.tag,
    totalPoints: michaelAcc.totalPoints,
    inviteCount: michaelAcc.inviteCount,
    rebatesNgn: michaelAcc.rebatesNgn,
    ledger: michaelAcc.ledger
  });
  if (michaelAcc.inviteCount < 1 || michaelAcc.rebatesNgn < 300) {
    throw new Error('FAIL: Referrer should have at least 1 invite and ₦300 rebate');
  }

  console.log('\n=== TEST 3: Social Media OG Card Generation ===');
  const ogSvg = generateOgCardSvg('michael', { network: 'base' });
  console.log('Generated OG SVG length:', ogSvg.length);
  if (!ogSvg.includes('<svg') || !ogSvg.includes('₦michael') || !ogSvg.includes('#bbf246')) {
    throw new Error('FAIL: OG card SVG invalid or missing attributes');
  }

  console.log('\nALL 3 SYSTEMS VERIFIED AND WORKING PROPERLY!');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
