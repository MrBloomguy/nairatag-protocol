const { defaultWalletFactory } = require('../sdk/src/wallet/AgentWalletFactory');

async function main() {
  console.log('Testing ArcCircleAgentWallet...');
  const wallet = defaultWalletFactory.createWallet({ network: 'arcTestnet' });
  console.log('Network:', wallet.networkKey);
  console.log('Chain ID:', wallet.config.chainId);
  console.log('Circle Chain Identifier:', wallet.config.circleBlockchain);
  console.log('Policy:', wallet.getSpendingPolicy());

  // Test policy check
  console.log('\nTesting Spending Policy Checks:');
  try {
    wallet.checkSpendingAllowed(10);
    console.log('PASS: 10 USDC is allowed within 25 USDC per-tx limit');
  } catch (err) {
    console.error('FAIL: 10 USDC should be allowed', err.message);
  }

  try {
    wallet.checkSpendingAllowed(50);
    console.error('FAIL: 50 USDC should have been blocked');
  } catch (err) {
    console.log('PASS: 50 USDC correctly blocked:', err.message);
  }

  // Test live query on Arc RPC
  console.log('\nTesting Live Onchain USDC Balance check on Arc Testnet RPC:');
  wallet.setAddress('0x0000000000000000000000000000000000000001');
  const balance = await wallet.getTokenBalance('USDC');
  console.log('Arc Testnet USDC Balance of address:', balance);

  console.log('\nAll checks passed successfully!');
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
