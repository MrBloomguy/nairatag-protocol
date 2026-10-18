import sys

EXPLORER_CODE = r'''// =============================================================
// EXPLORER TAB LOGIC
// =============================================================
function initExplorerSubnav() {
  const exBtns = document.querySelectorAll('[data-exsub]');
  exBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      exBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.explorer-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const paneId = btn.getAttribute('data-exsub');
      const pane = document.getElementById(paneId);
      if (pane) pane.classList.add('active');
      if (paneId === 'ex-swaps') refreshExplorerSwaps();
      else if (paneId === 'ex-transfers') refreshExplorerTransfers();
      else if (paneId === 'ex-pools') refreshExplorerPools();
      else if (paneId === 'ex-tags') refreshExplorerTags();
      else if (paneId === 'ex-tokens') refreshExplorerTokens();
    });
  });
}

async function refreshEcosystem() {
  if (!provider) return;
  try {
    const ammFactory = new ethers.Contract(CONFIG.contracts.AMMFactory, ABIS.AMMFactory, provider);
    const numPairs = await ammFactory.allPairsLength();
    document.getElementById('metric-pools').textContent = numPairs.toString();

    const pairsTable = document.getElementById('pairs-table-body');
    if (pairsTable) pairsTable.innerHTML = '';
    let totalTVLcNGN = 0;
    const pairData = [];

    for (let i = 0; i < Number(numPairs); i++) {
      const pairAddress = await ammFactory.allPairs(i);
      const pair = new ethers.Contract(pairAddress, ABIS.Pair, provider);
      const t0Addr = await pair.token0();
      const t1Addr = await pair.token1();
      const reserves = await pair.getReserves();
      const t0Contract = new ethers.Contract(t0Addr, ABIS.ERC20, provider);
      const t1Contract = new ethers.Contract(t1Addr, ABIS.ERC20, provider);
      const sym0 = await t0Contract.symbol();
      const sym1 = await t1Contract.symbol();
      const r0Fmt = parseFloat(ethers.formatEther(reserves[0])).toLocaleString(undefined, {maximumFractionDigits: 1});
      const r1Fmt = parseFloat(ethers.formatEther(reserves[1])).toLocaleString(undefined, {maximumFractionDigits: 1});
      if (sym0 === 'cNGN') totalTVLcNGN += parseFloat(ethers.formatEther(reserves[0])) * 2;
      if (sym1 === 'cNGN') totalTVLcNGN += parseFloat(ethers.formatEther(reserves[1])) * 2;
      pairData.push({ sym0, sym1, r0Fmt, r1Fmt, reserves, pairAddress });
      if (pairsTable) {
        const row = document.createElement('tr');
        row.innerHTML = `<td style="font-weight:600;">${sym0} / ${sym1}</td><td style="font-family:var(--font-mono);">${r0Fmt} ${sym0} + ${r1Fmt} ${sym1}</td><td><a href="/scanner/index.html" target="_blank" style="font-family:var(--font-mono);font-size:0.78rem;color:var(--primary);">${pairAddress.slice(0,8)}...↗</a></td>`;
        pairsTable.appendChild(row);
      }
    }
    document.getElementById('metric-tvl').textContent = `${Math.round(totalTVLcNGN).toLocaleString()} cNGN`;

    const tokensTable = document.getElementById('tokens-table-body');
    if (tokensTable) {
      tokensTable.innerHTML = '';
      for (const [, token] of Object.entries(CONFIG.tokens)) {
        let priceText = '1.00 cNGN';
        if (token.symbol !== 'cNGN') {
          try {
            const router = new ethers.Contract(CONFIG.contracts.Router, ABIS.Router, provider);
            const amounts = await router.getAmountsOut(ethers.parseEther('1'), [token.address, CONFIG.contracts.MockCNGN]);
            priceText = `${parseFloat(ethers.formatEther(amounts[1])).toFixed(4)} cNGN`;
          } catch (_) { priceText = 'No Pool'; }
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><div style="font-weight:600;">${token.name || token.symbol}</div><div style="font-size:0.72rem;color:var(--text-dim);font-family:var(--font-mono);">${token.address.slice(0,8)}...${token.address.slice(-6)}</div></td><td><span class="chain-badge">${token.symbol}</span></td><td style="font-family:var(--font-mono);">${priceText}</td><td><button class="quick-pct-btn" onclick="quickSelectSwap('${token.symbol}')">Swap</button></td>`;
        tokensTable.appendChild(tr);
      }
    }

    await refreshActivityFeed();
    const feed = document.getElementById('activity-feed-list');
    if (feed) feed.innerHTML = document.getElementById('activityContainer').innerHTML;

    const blockNum = await provider.getBlockNumber();
    const fromBlock = Math.max(0, blockNum - 200);
    let totalSwaps = 0, totalSends = 0;
    for (const pd of pairData) {
      try {
        const pair = new ethers.Contract(pd.pairAddress, ABIS.Pair, provider);
        const swapLogs = await pair.queryFilter(pair.filters.Swap(), fromBlock, 'latest');
        totalSwaps += swapLogs.length;
      } catch (_) {}
    }
    for (const [, token] of Object.entries(CONFIG.tokens)) {
      try {
        const tc = new ethers.Contract(token.address, ABIS.ERC20, provider);
        const xferLogs = await tc.queryFilter(tc.filters.Transfer(), fromBlock, 'latest');
        totalSends += xferLogs.length;
      } catch (_) {}
    }
    const msEl = document.getElementById('metric-swaps');
    const msndEl = document.getElementById('metric-sends');
    if (msEl) msEl.textContent = totalSwaps.toString();
    if (msndEl) msndEl.textContent = totalSends.toString();

    try {
      const reg = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
      const claimed = await reg.queryFilter(reg.filters.TagClaimed(), 0, 'latest');
      const mhEl = document.getElementById('metric-handles');
      if (mhEl) mhEl.textContent = claimed.length.toString();
    } catch (_) {}

  } catch (e) {
    console.error('Error refreshing ecosystem:', e);
  }
}

async function refreshExplorerSwaps() {
  const container = document.getElementById('explorer-swaps-list');
  if (!container || !provider) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:2rem;">Scanning Pair contracts...</div>';
  try {
    const ammFactory = new ethers.Contract(CONFIG.contracts.AMMFactory, ABIS.AMMFactory, provider);
    const numPairs = await ammFactory.allPairsLength();
    const blockNum = await provider.getBlockNumber();
    const fromBlock = Math.max(0, blockNum - 200);
    const allSwaps = [];
    for (let i = 0; i < Number(numPairs); i++) {
      const pairAddr = await ammFactory.allPairs(i);
      const pair = new ethers.Contract(pairAddr, ABIS.Pair, provider);
      const t0 = await pair.token0(), t1 = await pair.token1();
      const t0c = new ethers.Contract(t0, ABIS.ERC20, provider);
      const t1c = new ethers.Contract(t1, ABIS.ERC20, provider);
      const sym0 = await t0c.symbol(), sym1 = await t1c.symbol();
      const logs = await pair.queryFilter(pair.filters.Swap(), fromBlock, 'latest');
      for (const l of logs) {
        const a0In = parseFloat(ethers.formatEther(l.args.amount0In));
        const a1In = parseFloat(ethers.formatEther(l.args.amount1In));
        const a0Out = parseFloat(ethers.formatEther(l.args.amount0Out));
        const a1Out = parseFloat(ethers.formatEther(l.args.amount1Out));
        allSwaps.push({ fromSym: a0In > 0 ? sym0 : sym1, toSym: a0Out > 0 ? sym0 : sym1, amtIn: a0In > 0 ? a0In : a1In, amtOut: a0Out > 0 ? a0Out : a1Out, txHash: l.transactionHash, block: l.blockNumber, trader: l.args.to });
      }
    }
    allSwaps.sort((a, b) => b.block - a.block);
    const badge = document.getElementById('swap-count-badge');
    if (badge) badge.textContent = `${allSwaps.length} swaps`;
    if (!allSwaps.length) { container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:2rem;">No swaps in last 200 blocks. Try swapping in the Swap tab!</div>'; return; }
    container.innerHTML = allSwaps.slice(0,25).map(s => `<div class="feed-item"><div class="feed-left"><span class="feed-tag" style="background:rgba(122,69,229,0.12);color:var(--primary);">SWAP</span><div><div style="font-weight:700;font-size:0.9rem;">${s.amtIn.toFixed(4)} ${s.fromSym} &rarr; ${s.amtOut.toFixed(4)} ${s.toSym}</div><div style="font-size:0.72rem;color:var(--text-muted);">Trader: ${s.trader.slice(0,10)}... &bull; Block #${s.block}</div></div></div><div class="feed-mono"><a href="/scanner/index.html?tx=${s.txHash}" target="_blank" style="color:var(--primary);font-size:0.72rem;">${s.txHash.slice(0,10)}... ↗</a></div></div>`).join('');
  } catch (e) { container.innerHTML = `<div style="color:#ef4444;padding:1rem;">Error loading swaps: ${e.message}</div>`; }
}

async function refreshExplorerTransfers() {
  const container = document.getElementById('explorer-transfers-list');
  if (!container || !provider) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:2rem;">Scanning token contracts...</div>';
  try {
    const blockNum = await provider.getBlockNumber();
    const fromBlock = Math.max(0, blockNum - 200);
    const allTransfers = [];
    for (const [sym, token] of Object.entries(CONFIG.tokens)) {
      const tc = new ethers.Contract(token.address, ABIS.ERC20, provider);
      const logs = await tc.queryFilter(tc.filters.Transfer(), fromBlock, 'latest');
      for (const l of logs) allTransfers.push({ sym, from: l.args.from, to: l.args.to, amount: parseFloat(ethers.formatEther(l.args.value)), txHash: l.transactionHash, block: l.blockNumber });
    }
    allTransfers.sort((a, b) => b.block - a.block);
    const badge = document.getElementById('transfer-count-badge');
    if (badge) badge.textContent = `${allTransfers.length} transfers`;
    if (!allTransfers.length) { container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:2rem;">No transfers in last 200 blocks.</div>'; return; }
    container.innerHTML = allTransfers.slice(0,30).map(t => `<div class="feed-item"><div class="feed-left"><span class="feed-tag" style="background:rgba(16,185,129,0.12);color:#10b981;">TRANSFER</span><div><div style="font-weight:700;font-size:0.9rem;">${t.amount.toFixed(4)} <span class="chain-badge">${t.sym}</span></div><div style="font-size:0.72rem;color:var(--text-muted);">${t.from.slice(0,10)}... &rarr; ${t.to.slice(0,10)}... &bull; Block #${t.block}</div></div></div><div class="feed-mono"><a href="/scanner/index.html?tx=${t.txHash}" target="_blank" style="color:#10b981;font-size:0.72rem;">${t.txHash.slice(0,10)}... ↗</a></div></div>`).join('');
  } catch (e) { container.innerHTML = `<div style="color:#ef4444;padding:1rem;">Error: ${e.message}</div>`; }
}

async function refreshExplorerTokens() {
  const tbody = document.getElementById('tokens-detail-table-body');
  if (!tbody || !provider) return;
  tbody.innerHTML = '';
  for (const [sym, token] of Object.entries(CONFIG.tokens)) {
    let priceText = '1.00', deployerBal = '—';
    try {
      if (token.symbol !== 'cNGN') {
        const router = new ethers.Contract(CONFIG.contracts.Router, ABIS.Router, provider);
        const amounts = await router.getAmountsOut(ethers.parseEther('1'), [token.address, CONFIG.contracts.MockCNGN]);
        priceText = parseFloat(ethers.formatEther(amounts[1])).toFixed(4);
      }
    } catch (_) { priceText = 'No Pool'; }
    try {
      const tc = new ethers.Contract(token.address, ABIS.ERC20, provider);
      const bal = await tc.balanceOf(currentAddress || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      deployerBal = parseFloat(ethers.formatEther(bal)).toLocaleString(undefined, {maximumFractionDigits: 2});
    } catch (_) {}
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="font-weight:700;">${token.name || sym}</td><td><span class="chain-badge">${token.symbol}</span></td><td style="font-family:var(--font-mono);font-size:0.75rem;">${token.address}</td><td style="color:var(--primary);">${token.handle || ('₦'+sym.toLowerCase())}</td><td style="font-family:var(--font-mono);">${priceText} cNGN</td><td style="font-family:var(--font-mono);">${deployerBal}</td><td><button class="quick-pct-btn" onclick="quickSelectSwap('${token.symbol}')">Swap</button></td>`;
    tbody.appendChild(tr);
  }
}

async function refreshExplorerPools() {
  const tbody = document.getElementById('pools-detail-table-body');
  if (!tbody || !provider) return;
  tbody.innerHTML = '';
  try {
    const ammFactory = new ethers.Contract(CONFIG.contracts.AMMFactory, ABIS.AMMFactory, provider);
    const numPairs = await ammFactory.allPairsLength();
    for (let i = 0; i < Number(numPairs); i++) {
      const pairAddr = await ammFactory.allPairs(i);
      const pair = new ethers.Contract(pairAddr, ABIS.Pair, provider);
      const t0 = await pair.token0(), t1 = await pair.token1();
      const reserves = await pair.getReserves();
      const totalSupply = await pair.totalSupply();
      const t0c = new ethers.Contract(t0, ABIS.ERC20, provider);
      const t1c = new ethers.Contract(t1, ABIS.ERC20, provider);
      const sym0 = await t0c.symbol(), sym1 = await t1c.symbol();
      const r0 = parseFloat(ethers.formatEther(reserves[0])), r1 = parseFloat(ethers.formatEther(reserves[1]));
      const tvl = sym0 === 'cNGN' ? r0*2 : (sym1 === 'cNGN' ? r1*2 : 0);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="font-weight:700;">${sym0} / ${sym1}</td><td style="font-family:var(--font-mono);font-size:0.72rem;"><a href="/scanner/index.html" target="_blank" style="color:var(--primary);">${pairAddr}</a></td><td style="font-family:var(--font-mono);">${r0.toLocaleString(undefined,{maximumFractionDigits:2})} ${sym0}</td><td style="font-family:var(--font-mono);">${r1.toLocaleString(undefined,{maximumFractionDigits:2})} ${sym1}</td><td style="font-family:var(--font-mono);">${tvl>0?tvl.toLocaleString(undefined,{maximumFractionDigits:0})+' cNGN':'—'}</td><td style="font-family:var(--font-mono);">${parseFloat(ethers.formatEther(totalSupply)).toFixed(6)} LP</td>`;
      tbody.appendChild(tr);
    }
  } catch (e) { console.error('Error loading pools detail:', e); }
}

async function refreshExplorerTags() {
  const tbody = document.getElementById('tags-table-body');
  const feedContainer = document.getElementById('explorer-tags-list');
  if (!tbody || !provider) return;
  tbody.innerHTML = '';
  try {
    const reg = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
    const claimedLogs = await reg.queryFilter(reg.filters.TagClaimed(), 0, 'latest');
    for (const l of claimedLogs) {
      const tag = l.args[3] || l.args.tag || '₦?';
      const owner = l.args[1] || l.args.owner || '0x...';
      let resolvedAddr = '—';
      try { resolvedAddr = await reg.resolve(tag); if (resolvedAddr === ethers.ZeroAddress) resolvedAddr = '—'; } catch (_) {}
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="font-weight:700;color:var(--primary);">${tag}</td><td style="font-family:var(--font-mono);font-size:0.78rem;">${owner.slice(0,10)}...${owner.slice(-6)}</td><td style="font-family:var(--font-mono);font-size:0.78rem;">${resolvedAddr !== '—' ? resolvedAddr.slice(0,10)+'...'+resolvedAddr.slice(-6) : '—'}</td><td><span style="color:#10b981;font-size:0.78rem;font-weight:700;">● Active</span></td>`;
      tbody.appendChild(tr);
    }
    const allTagEvents = claimedLogs.map(l => ({ type: 'CLAIM', tag: l.args[3]||'₦?', owner: l.args[1]||'0x...', txHash: l.transactionHash, block: l.blockNumber }));
    const transferLogs = await reg.queryFilter(reg.filters.Transfer(), 0, 'latest');
    for (const l of transferLogs) allTagEvents.push({ type: 'TRANSFER', tag: '₦handle', owner: l.args[1]||'0x...', txHash: l.transactionHash, block: l.blockNumber });
    allTagEvents.sort((a, b) => b.block - a.block);
    if (feedContainer) {
      feedContainer.innerHTML = allTagEvents.slice(0,20).map(e => `<div class="feed-item"><div class="feed-left"><span class="feed-tag ${e.type==='CLAIM'?'feed-tag-claim':'feed-tag-transfer'}">${e.type}</span><div><div style="font-weight:700;font-size:0.9rem;">${e.tag}</div><div style="font-size:0.72rem;color:var(--text-muted);">${e.type==='CLAIM'?'Registered by':'New owner:'} ${e.owner.slice(0,10)}... &bull; Block #${e.block}</div></div></div><div class="feed-mono"><a href="/scanner/index.html?tx=${e.txHash}" target="_blank" style="color:var(--cyan);font-size:0.72rem;">${e.txHash.slice(0,10)}... ↗</a></div></div>`).join('') || '<div style="text-align:center;color:var(--text-dim);padding:2rem;">No ₦Tag events found.</div>';
    }
  } catch (e) {
    if (feedContainer) feedContainer.innerHTML = `<div style="color:#ef4444;padding:1rem;">Error: ${e.message}</div>`;
  }
}

'''

with open('hub/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '// =============================================================\n// EXPLORER TAB LOGIC\n// =============================================================\nasync function refreshEcosystem()'
end_marker = '\nwindow.quickSelectSwap = function'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('ERROR: markers not found', file=sys.stderr)
    sys.exit(1)

new_content = content[:start_idx] + EXPLORER_CODE + content[end_idx:]
with open('hub/app.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'Done. Old section: {end_idx - start_idx} bytes, New section: {len(EXPLORER_CODE)} bytes')
print(f'New file size: {len(new_content)} bytes')
