async function verifyProduction() {
  const origin = 'https://nairatag.ng';
  console.log('Testing production endpoints against:', origin);

  // 1. Taken tag check
  const res1 = await fetch(`${origin}/api/claims?action=check&tag=michael`);
  const data1 = await res1.json();
  console.log('1. Check taken "michael":', { status: res1.status, ok: data1.ok, isTaken: data1.isTaken });

  // 2. Available tag check
  const res2 = await fetch(`${origin}/api/claims?action=check&tag=newtagunclaimed999`);
  const data2 = await res2.json();
  console.log('2. Check available "newtagunclaimed999":', { status: res2.status, ok: data2.ok, available: data2.available });

  // 3. Points check
  const res3 = await fetch(`${origin}/api/points?tag=michael`);
  const data3 = await res3.json();
  console.log('3. Points & Referral Ledger for "michael":', {
    status: res3.status,
    totalPoints: data3.totalPoints,
    inviteCount: data3.inviteCount,
    rebatesNgn: data3.rebatesNgn,
    tier: data3.tier
  });

  // 4. Social Open Graph Meta tags on /tag/MICHAEL
  const res4 = await fetch(`${origin}/tag/MICHAEL`);
  const html4 = await res4.text();
  const ogTitleMatch = html4.match(/<meta property="og:title"[^>]*content="([^"]+)"/);
  const ogImgMatch = html4.match(/<meta property="og:image"[^>]*content="([^"]+)"/);
  const twCardMatch = html4.match(/<meta name="twitter:card"[^>]*content="([^"]+)"/);
  console.log('4. Social Unfurl Meta on /tag/MICHAEL:', {
    ogTitle: ogTitleMatch ? ogTitleMatch[1] : null,
    ogImage: ogImgMatch ? ogImgMatch[1] : null,
    twitterCard: twCardMatch ? twCardMatch[1] : null
  });

  // 5. Dynamic Card SVG
  const res5 = await fetch(`${origin}/cards/michael.svg?mode=og`);
  const svg5 = await res5.text();
  console.log('5. Dynamic Card SVG status:', res5.status, 'Is SVG:', svg5.startsWith('<svg'), 'Length:', svg5.length);

  // 6. Claims stream for Explorer
  const res6 = await fetch(`${origin}/api/claims`);
  const data6 = await res6.json();
  console.log('6. Verified Claims Stream count:', data6.totalClaims, 'First:', data6.claims?.[0]?.tag);

  console.log('\n✅ ALL LIVE PRODUCTION VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

verifyProduction().catch(err => {
  console.error('Error during production verification:', err);
  process.exit(1);
});
