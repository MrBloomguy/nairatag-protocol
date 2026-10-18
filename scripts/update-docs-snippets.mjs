import fs from 'node:fs';

let content = fs.readFileSync('hub/docs.html', 'utf8');

const oldRpc = `      rpc: \`# NairaTag Chain 901 Configuration (OP Stack)
Network Name:      NairaTag Sovereign Rollup
RPC URL:           http://127.0.0.1:9545
Chain ID:          901
Currency Symbol:   cNGN (18 Decimals)
Block Explorer:    /scanner/index.html
Average Gas Fee:   < 0.01 cNGN (~$0.00001 USD)\`,`;

const newRpc = `      rpc: \`# NairaTag Active Network: Celo Sepolia Testnet
Network Name:      Celo Sepolia Testnet
RPC URL:           https://forno.celo-sepolia.celo-testnet.org
Chain ID:          11142220
Currency Symbol:   CELO (Gas) / cNGN (Settlement)
Block Explorer:    https://celo-sepolia.blockscout.com
Registry Contract: 0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0
Resolver Contract: 0x293EA56588b8abac78Bab6241466ad8C30bB955A\`,`;

content = content.replace(oldRpc.replace(/\r?\n/g, '\r\n'), newRpc.replace(/\n/g, '\r\n'));
if (!content.includes('0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0')) {
  content = content.replace(oldRpc.replace(/\r?\n/g, '\n'), newRpc);
}

content = content.replaceAll(
  'const provider = new ethers.JsonRpcProvider("http://127.0.0.1:9545", 901);',
  'const provider = new ethers.JsonRpcProvider("https://forno.celo-sepolia.celo-testnet.org", 11142220);'
);

content = content.replaceAll(
  'const REGISTRY_ADDR = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";',
  'const REGISTRY_ADDR = "0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0";'
);

content = content.replaceAll(
  'address: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",',
  'address: "0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0",'
);

content = content.replace(
  /export const nairatagChain = \{[\s\S]*?rpcUrls: \{ default: \{ http: \["http:\/\/127\.0\.0\.1:9545"\] \} \}\r?\n\};/,
  `export const celoSepolia = {
  id: 11142220,
  name: "Celo Sepolia Testnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] } }
};`
);

content = content.replaceAll('chain: nairatagChain,', 'chain: celoSepolia,');

fs.writeFileSync('hub/docs.html', content, 'utf8');
console.log('Successfully updated hub/docs.html snippets to Celo Sepolia!');
