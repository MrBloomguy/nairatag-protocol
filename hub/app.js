/**
 * NairaTag Hub — Main Application Script
 * Chain 901 (TagProtocol)
 * Includes Integrated Manager, AMM Swap, Launchpad, and Ecosystem Explorer
 */

// Fallback configuration (updated dynamically from /config/v1-addresses.json)
let CONFIG = {
  chainId: 901,
  rpc: 'http://127.0.0.1:9545',
  contracts: {
    MockCNGN: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
    Registry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    Resolver: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    PaymentRequest: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    AMMFactory: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
    Router: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
    TokenFactory: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
    Launchpad: '0x9A676e781A523b5d0C0e43731313A708CB607508'
  },
  tokens: {
    cNGN: {
      address: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
      symbol: 'cNGN',
      name: 'cNGN (TagProtocol Testnet)',
      decimals: 18
    },
    ASAKE: {
      address: '0x32467b43BFa67273FC7dDda0999Ee9A12F2AaA08',
      symbol: 'ASAKE',
      name: 'ASAKE Token',
      decimals: 18,
      handle: '₦asake'
    },
    BISI: {
      address: '0x4ABEaCA4b05d8fA4CED09D26aD28Ea298E8afaC8',
      symbol: 'BISI',
      name: 'BISI Token',
      decimals: 18,
      handle: '₦bisi'
    },
    KEMI: {
      address: '0x4AE5AF759E17599107c1C688bfaCF6131C376D51',
      symbol: 'KEMI',
      name: 'Kemi Token',
      decimals: 18,
      handle: '₦kemi'
    }
  },
  pairs: {
    cNGN_ASAKE: '0x752d1B1091b236F77Ecd8d746F93db9712D04979',
    cNGN_BISI: '0xFbE58FaF272863F4e7F5b232BC674E0Af2B16778',
    cNGN_KEMI: '0xC5025e963a1CBA5b08bE9DBC75FbeF532f694d6E'
  }
};

// Standard Anvil test private keys
const DEV_ACCOUNTS = {
  dev1: {
    name: 'Dev Account 1',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    key: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  },
  dev2: {
    name: 'Dev Account 2',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    key: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
  }
};

// Contract ABIs
const ABIS = {
  ERC20: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 value)'
  ],
  MockCNGN: [
    'function faucet(uint256 amount)',
    'function balanceOf(address owner) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ],
  Registry: [
    'function claim(string tag, address resolver) external returns (bytes32)',
    'function resolve(string tag) external view returns (address)',
    'function exists(bytes32 node) external view returns (bool)',
    'function owner(bytes32 node) external view returns (address)',
    'function ownerOf(bytes32 node) external view returns (address)',
    'function resolver(bytes32 node) external view returns (address)',
    'function resolverOf(bytes32 node) external view returns (address)',
    'function transfer(bytes32 node, address newOwner) external',
    'function release(bytes32 node) external',
    'function setResolver(bytes32 node, address resolver) external',
    'event TagClaimed(bytes32 indexed node, address indexed owner, address resolver, string tag)',
    'event TagReleased(bytes32 indexed node, address indexed previousOwner)',
    'event Transfer(bytes32 indexed node, address indexed newOwner)'
  ],
  Resolver: [
    'function addr(bytes32 node) external view returns (address)',
    'function setAddr(bytes32 node, address addr) external',
    'function text(bytes32 node, string key) external view returns (string)',
    'function setText(bytes32 node, string key, string value) external',
    'function paymentEndpoint(bytes32 node) external view returns (string)',
    'function setPaymentEndpoint(bytes32 node, string endpoint) external',
    'function name(bytes32 node) external view returns (string)',
    'function setName(bytes32 node, string name) external',
    'function setNameForAddr(address addr, string tag) external',
    'function reverseNode(address addr) external pure returns (bytes32)',
    'event AddrChanged(bytes32 indexed node, address a)',
    'event TextChanged(bytes32 indexed node, string indexed indexedKey, string key)'
  ],
  Router: [
    'function factory() view returns (address)',
    'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)',
    'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity)'
  ],
  Launchpad: [
    'function launch(string handle, string tokenName, string tokenSymbol, uint256 totalSupply, address pairToken, uint256 launchTokenAmt, uint256 pairTokenAmt) returns (address token, address pair)',
    'event TokenLaunched(address indexed token, address indexed pair, string handle, address launcher)'
  ],
  AMMFactory: [
    'function allPairsLength() view returns (uint256)',
    'function allPairs(uint256 index) view returns (address)',
    'function getPair(address tokenA, address tokenB) view returns (address)',
    'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)'
  ],
  Pair: [
    'function token0() view returns (address)',
    'function token1() view returns (address)',
    'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function totalSupply() view returns (uint256)',
    'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'
  ],
  HypWarp: [
    'function transferRemote(uint32 destination, bytes32 recipient, uint256 amount) payable returns (bytes32 messageId)',
    'function quoteGasPayment(uint32 destinationDomain) view returns (uint256 fee)',
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)'
  ],
  DopplerLaunchpad: [
    'function createLaunch(string handle, string name, string symbol, address numeraire) external returns (address token, address initializer)',
    'function executeMigration(address token) external returns (uint256 liquidity)',
    'function allLaunchesLength() external view returns (uint256)',
    'function allLaunches(uint256 index) external view returns (address)',
    'function tokenInitializer(address token) external view returns (address)',
    'function tokenTag(address token) external view returns (string)',
    'event LaunchCreated(address indexed token, address indexed initializer, string tag, address indexed numeraire)',
    'event LaunchMigrated(address indexed token, address indexed pool, uint256 liquidity)'
  ],
  AirlockInitializer: [
    'function getCurrentPrice() view returns (uint256)',
    'function cumulativeCNGNRaised() view returns (uint256)',
    'function cumulativeTokensSold() view returns (uint256)',
    'function state() view returns (uint8)',
    'function buy(uint256 cngnAmount, uint256 minTokensOut) external returns (uint256 tokensOut)',
    'function sell(uint256 tokenAmount, uint256 minCNGNOut) external returns (uint256 cngnOut)',
    'function userTokensBought(address) view returns (uint256)',
    'function userCNGNSpent(address) view returns (uint256)',
    'function claimRefund() external returns (uint256 refundAmount)',
    'event Buy(address indexed buyer, uint256 cngnIn, uint256 tokensOut, uint256 currentPrice)',
    'event Graduated(uint256 totalCNGN, uint256 totalTokens)'
  ],
  ImmutableLocker: [
    'function locks(address pool) view returns (address pool, uint256 lpAmount, uint256 unlockTimestamp, bool isPermanent)',
    'event LPLocked(address indexed pool, uint256 amount, uint256 unlockTimestamp, bool isPermanent)'
  ]
};

// Global State
let provider = null;
let currentSigner = null;
let currentAddress = null;
let currentMode = 'dev1';
let latestBlock = 0;
let recentSwaps = [];
let quoteTimeout = null;
let claimDebounceTimer = null;
let currentlyClaimingTag = '';
let swapResolvedRecipient = null;
let swapResolvedHandle = null;

// Normalization & Validation Helper Functions
function normalizeTag(input) {
  if (!input) return '';
  let str = input.trim().toLowerCase();
  if (str.startsWith('₦')) str = str.slice(1);
  if (str.startsWith('ng:')) str = str.slice(3);
  return str;
}

function computeNamehash(canonicalTag) {
  if (!canonicalTag) return ethers.ZeroHash;
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalTag));
}

function validateTagSyntax(tag) {
  if (!tag || tag.length === 0) return { valid: false, error: 'Tag cannot be empty' };
  if (tag.length < 3) return { valid: false, error: 'Too short (min 3 characters)' };
  if (tag.length > 32) return { valid: false, error: 'Too long (max 32 characters)' };
  if (!/^[a-z0-9_]+$/.test(tag)) return { valid: false, error: 'Only lowercase letters, numbers, and underscore allowed' };
  if (tag.startsWith('_') || tag.endsWith('_')) return { valid: false, error: 'Cannot start or end with underscore' };
  if (tag.includes('__')) return { valid: false, error: 'Cannot contain consecutive underscores' };
  return { valid: true };
}

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
  await loadAddressesConfig();
  initTabs();
  initManagerSubnav();
  initExplorerSubnav();
  await initAccount();
  setupEventListeners();
  startNetworkPoller();
  
  // Initial manager inputs state
  onClaimInputChanged();
  loadManageHandleData();
  executePublicResolve();
  initSendToTag();
  refreshActivityFeed();
  refreshEcosystem();


  // Handle URL hash routing (e.g. #swap, #manager)
  handleHashRouting();
  handleClaimLinkParams();
});

function handleClaimLinkParams() {
  const params = new URLSearchParams(window.location.search);
  const claim = params.get('claim');
  if (!claim) return;

  if (typeof switchToApp === 'function') switchToApp('tab-manager');
  window.setTimeout(() => {
    const claimButton = document.getElementById('btn-sub-claim');
    if (claimButton) claimButton.click();
    const input = document.getElementById('claimTagInput');
    if (input) {
      input.value = normalizeTag(claim);
      onClaimInputChanged();
    }
  }, 0);
}

function handleHashRouting() {
  const hash = window.location.hash.toLowerCase();
  const tabMap = {
    '#swap': 'btn-tab-swap',
    '#launchpad': 'btn-tab-launchpad',
    '#explorer': 'btn-tab-explorer',
    '#manager': 'btn-tab-manager',
    '#identity': 'btn-tab-manager'
  };
  const btnId = tabMap[hash];
  if (btnId) {
    if (typeof switchToApp === 'function') switchToApp();
    const btn = document.getElementById(btnId);
    if (btn) btn.click();
  }
}


// Load config from v1-addresses.json if available
async function loadAddressesConfig() {
  try {
    const res = await fetch('/config/v1-addresses.json');
    if (res.ok) {
      const data = await res.json();
      CONFIG = { ...CONFIG, ...data };
      console.log('Loaded live deployment config:', CONFIG);
    }
  } catch (e) {
    console.warn('Using embedded fallback config:', e);
  }

  try {
    const wRes = await fetch('/bridge/hyperlane/deployments/warp-addresses.json');
    if (wRes.ok) {
      CONFIG.warp = await wRes.json();
      console.log('Loaded live Warp Route config:', CONFIG.warp);
    }
  } catch (e) {}

  try {
    const aRes = await fetch('/bridge/hyperlane/deployments/addresses.json');
    if (aRes.ok) {
      CONFIG.hyperlane = await aRes.json();
      console.log('Loaded live Hyperlane core config:', CONFIG.hyperlane);
    }
  } catch (e) {}
}

// Top-Level Tab Switching
function initTabs() {
  const tabs = document.querySelectorAll('.app-tab-bar .tab-btn[data-tab]');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state on ALL tab-btns with data-tab (handles any duplicates)
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      // Mark all buttons with this data-tab as active
      const targetId = btn.getAttribute('data-tab');
      document.querySelectorAll(`.tab-btn[data-tab="${targetId}"]`).forEach(b => b.classList.add('active'));
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');

      // Scroll content to top when switching tabs
      const mc = document.querySelector('#page-app .main-content');
      if (mc) mc.scrollTop = 0;

      if (targetId === 'tab-explorer') {
        refreshEcosystem();
      } else if (targetId === 'tab-swap') {
        updateBalances();
        fetchQuote();
      } else if (targetId === 'tab-launchpad') {
        refreshDopplerLaunches();
      }
    });
  });
}


// Manager Sub-navigation
function initManagerSubnav() {
  const subBtns = document.querySelectorAll('.subnav-btn');
  subBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.manager-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-sub');
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');

      if (targetId === 'mgr-activity') {
        refreshActivityFeed();
      }
    });
  });
}

// Wallet & Account Management
async function initAccount() {
  provider = new ethers.JsonRpcProvider(CONFIG.rpc);
  const selector = document.getElementById('account-selector');
  selector.addEventListener('change', async (e) => {
    currentMode = e.target.value;
    await setupSigner();
    await updateBalances();
  });

  await setupSigner();
  await updateBalances();
}

async function setupSigner() {
  try {
    if (currentMode === 'browser' && window.ethereum) {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send('eth_requestAccounts', []);
      currentSigner = await browserProvider.getSigner();
      currentAddress = await currentSigner.getAddress();
      provider = browserProvider;
    } else {
      provider = new ethers.JsonRpcProvider(CONFIG.rpc);
      const dev = DEV_ACCOUNTS[currentMode] || DEV_ACCOUNTS.dev1;
      currentSigner = new ethers.Wallet(dev.key, provider);
      currentAddress = dev.address;
    }

    const shortAddr = `${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}`;
    document.getElementById('wallet-addr-text').textContent = shortAddr;
  } catch (err) {
    console.error('Error setting up signer:', err);
    showToast('Wallet setup: ' + err.message, 'error');
  }
}

// Update token balances in Swap UI
async function updateBalances() {
  if (!currentAddress || !provider) return;

  try {
    const fromSymbol = document.getElementById('swap-from-select').value;
    const toSymbol = document.getElementById('swap-to-select').value;

    const fromToken = CONFIG.tokens[fromSymbol];
    const toToken = CONFIG.tokens[toSymbol];

    if (fromToken) {
      const c = new ethers.Contract(fromToken.address, ABIS.ERC20, provider);
      const b = await c.balanceOf(currentAddress);
      document.getElementById('from-token-balance').textContent = `Balance: ${formatBalance(b, fromToken.decimals)}`;
    }

    if (toToken) {
      const c = new ethers.Contract(toToken.address, ABIS.ERC20, provider);
      const b = await c.balanceOf(currentAddress);
      document.getElementById('to-token-balance').textContent = `Balance: ${formatBalance(b, toToken.decimals)}`;
    }
  } catch (e) {
    console.error('Error updating balances:', e);
  }
}

function formatBalance(amount, decimals = 18) {
  const formatted = ethers.formatUnits(amount, decimals);
  const parts = formatted.split('.');
  if (parts.length > 1) {
    return `${parts[0]}.${parts[1].slice(0, 4)}`;
  }
  return formatted;
}

// Event Listeners Setup
function setupEventListeners() {
  // Faucet
  document.getElementById('faucet-btn').addEventListener('click', handleFaucet);

  // ==================== MANAGER: CLAIM ====================
  const claimInput = document.getElementById('claimTagInput');
  claimInput.addEventListener('input', onClaimInputChanged);

  document.querySelectorAll('#mgr-claim .chip-tag').forEach(chip => {
    chip.addEventListener('click', () => {
      claimInput.value = chip.getAttribute('data-tag');
      onClaimInputChanged();
    });
  });

  document.getElementById('btnCheckAvail').addEventListener('click', checkHandleAvailability);
  document.getElementById('btnClaimAction').addEventListener('click', startClaimModalFlow);

  // Stepper modal buttons
  document.getElementById('btnCloseClaimModal').addEventListener('click', closeClaimModal);
  document.getElementById('btnDismissClaimModal').addEventListener('click', closeClaimModal);
  document.getElementById('btnJumpToManage').addEventListener('click', jumpToManageAfterClaim);

  // ==================== MANAGER: MANAGE RECORDS ====================
  const manageInput = document.getElementById('manageTagInput');
  manageInput.addEventListener('change', loadManageHandleData);

  document.querySelectorAll('#mgr-records .chip-tag').forEach(chip => {
    chip.addEventListener('click', () => {
      manageInput.value = chip.getAttribute('data-managetag');
      loadManageHandleData();
    });
  });

  document.getElementById('btnFetchManage').addEventListener('click', loadManageHandleData);
  document.getElementById('btnUpdateAddr').addEventListener('click', executeUpdateAddress);
  document.getElementById('btnUpdateProfile').addEventListener('click', executeUpdateProfile);
  document.getElementById('btnUpdateEndpoint').addEventListener('click', executeUpdateEndpoint);
  document.getElementById('btnSetReverse').addEventListener('click', executeSetReverse);
  document.getElementById('btnTransfer').addEventListener('click', executeTransfer);
  document.getElementById('btnRelease').addEventListener('click', executeRelease);

  // ==================== MANAGER: PUBLIC RESOLVER ====================
  const resolveInput = document.getElementById('resolveInput');
  document.querySelectorAll('#mgr-resolve .chip-tag').forEach(chip => {
    chip.addEventListener('click', () => {
      resolveInput.value = chip.getAttribute('data-resolvetag');
      executePublicResolve();
    });
  });
  document.getElementById('btnResolveAction').addEventListener('click', executePublicResolve);

  // ==================== MANAGER: ACTIVITY ====================
  document.getElementById('btnRefreshActivity').addEventListener('click', refreshActivityFeed);

  // ==================== SWAP TAB ====================
  const fromInput = document.getElementById('swap-from-amount');
  const fromSelect = document.getElementById('swap-from-select');
  const toSelect = document.getElementById('swap-to-select');

  fromInput.addEventListener('input', scheduleQuote);
  fromSelect.addEventListener('change', () => {
    updateBalances();
    scheduleQuote();
  });
  toSelect.addEventListener('change', () => {
    updateBalances();
    scheduleQuote();
  });

  document.getElementById('swap-flip-btn').addEventListener('click', () => {
    const fromVal = fromSelect.value;
    const toVal = toSelect.value;
    fromSelect.value = toVal;
    toSelect.value = fromVal;
    updateBalances();
    scheduleQuote();
  });

  document.querySelectorAll('.quick-pct-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pct = parseInt(btn.getAttribute('data-pct'), 10);
      const fromSymbol = fromSelect.value;
      const fromToken = CONFIG.tokens[fromSymbol];
      if (!fromToken) return;

      const c = new ethers.Contract(fromToken.address, ABIS.ERC20, provider);
      const bal = await c.balanceOf(currentAddress);
      const amount = (bal * BigInt(pct)) / 100n;
      fromInput.value = ethers.formatUnits(amount, fromToken.decimals);
      scheduleQuote();
    });
  });

  document.getElementById('swap-action-btn').addEventListener('click', handleSwapAction);

  // Swap Mode Toggle (Native vs Bridge)
  const btnModeNative = document.getElementById('btn-swap-mode-native');
  const btnModeBridge = document.getElementById('btn-swap-mode-bridge');
  const paneNative = document.getElementById('pane-swap-native');
  const paneBridge = document.getElementById('pane-swap-bridge');
  if (btnModeNative && btnModeBridge) {
    btnModeNative.addEventListener('click', () => {
      btnModeNative.classList.add('active');
      btnModeBridge.classList.remove('active');
      if (paneNative) paneNative.style.display = 'block';
      if (paneBridge) paneBridge.style.display = 'none';
    });
    btnModeBridge.addEventListener('click', () => {
      btnModeBridge.classList.add('active');
      btnModeNative.classList.remove('active');
      if (paneNative) paneNative.style.display = 'none';
      if (paneBridge) paneBridge.style.display = 'block';
      updateBridgeSourceBalance();
    });
  }

  // Bridge Execution Button
  const btnExecBridge = document.getElementById('btn-execute-bridge');
  if (btnExecBridge) {
    btnExecBridge.addEventListener('click', handleBridgeAndSwap);
  }

  // Bridge Recipient Tag Input
  const bridgeRecipInput = document.getElementById('bridge-recipient-tag');
  if (bridgeRecipInput) {
    bridgeRecipInput.addEventListener('input', () => {
      resolveBridgeRecipient();
    });
  }

  // Swap Recipient Resolution
  const swapRecipientTag = document.getElementById('swapRecipientTag');
  let swapRecipientDebounce = null;
  if (swapRecipientTag) {
    swapRecipientTag.addEventListener('input', () => {
      clearTimeout(swapRecipientDebounce);
      swapRecipientDebounce = setTimeout(resolveSwapRecipient, 250);
    });
  }

  document.querySelectorAll('[data-swapchip]').forEach(chip => {
    chip.addEventListener('click', () => {
      if (swapRecipientTag) {
        swapRecipientTag.value = chip.getAttribute('data-swapchip');
        resolveSwapRecipient();
      }
    });
  });


  // ==================== LAUNCHPAD TAB ====================
  document.getElementById('launch-name').addEventListener('input', updateLaunchPreview);
  document.getElementById('launch-symbol').addEventListener('input', updateLaunchPreview);
  document.getElementById('launch-handle').addEventListener('input', updateLaunchPreview);
  document.getElementById('launch-supply').addEventListener('input', updateLaunchPreview);
  document.getElementById('launch-cngn-seed').addEventListener('input', updateLaunchPreview);
  document.getElementById('launch-token-seed').addEventListener('input', updateLaunchPreview);
  document.getElementById('launch-submit-btn').addEventListener('click', handleLaunchToken);

  // ==================== EXPLORER TAB ====================
  document.getElementById('refresh-activity-btn').addEventListener('click', refreshEcosystem);

  // Modal close
  document.getElementById('modal-close-btn').addEventListener('click', () => {
    document.getElementById('tx-modal').classList.remove('active');
  });
}

// -------------------------------------------------------------
// FAUCET
// -------------------------------------------------------------
async function handleFaucet() {
  try {
    showToast('Requesting 1,000 test-cNGN from faucet...', 'info');
    const cngn = new ethers.Contract(CONFIG.contracts.MockCNGN, ABIS.MockCNGN, currentSigner);
    const amount = ethers.parseEther('1000');
    const tx = await cngn.faucet(amount);
    showToast(`Faucet tx sent: ${tx.hash.slice(0, 10)}...`, 'info');
    await tx.wait();

    showToast('✓ Received 1,000 cNGN successfully!', 'success');
    fireConfetti();
    await updateBalances();
  } catch (err) {
    console.error('Faucet failed:', err);
    showToast('Faucet error: ' + (err.reason || err.message), 'error');
  }
}

// =============================================================
// MANAGER: CLAIM HANDLE LOGIC & STEPPER
// =============================================================
function onClaimInputChanged() {
  const input = document.getElementById('claimTagInput').value;
  const canonical = normalizeTag(input);
  const box = document.getElementById('claimInputBox');
  const feedback = document.getElementById('claimInputFeedback');
  const display = document.getElementById('claimCanonicalDisplay');
  const namehashDisplay = document.getElementById('claimNamehashDisplay');
  const btnClaim = document.getElementById('btnClaimAction');

  display.textContent = `₦${canonical}`;

  const check = validateTagSyntax(canonical);
  if (!check.valid) {
    box.classList.add('error');
    feedback.textContent = `⚠️ ${check.error}`;
    feedback.style.color = 'var(--red)';
    namehashDisplay.textContent = 'Invalid handle';
    btnClaim.disabled = true;
    document.getElementById('claimAvailabilityResult').style.display = 'none';
    return;
  }

  box.classList.remove('error');
  feedback.textContent = `✓ Valid format (${canonical.length} chars)`;
  feedback.style.color = 'var(--primary)';
  namehashDisplay.textContent = computeNamehash(canonical);

  // Debounce live availability check
  clearTimeout(claimDebounceTimer);
  claimDebounceTimer = setTimeout(async () => {
    await checkHandleAvailability();
  }, 350);
}

async function checkHandleAvailability() {
  const input = document.getElementById('claimTagInput').value;
  const canonical = normalizeTag(input);
  const resContainer = document.getElementById('claimAvailabilityResult');
  const btnCheck = document.getElementById('btnCheckAvail');
  const btnClaim = document.getElementById('btnClaimAction');

  const check = validateTagSyntax(canonical);
  if (!check.valid) {
    resContainer.style.display = 'block';
    resContainer.innerHTML = `<span class="status-badge taken">✗ ${check.error}</span>`;
    btnClaim.disabled = true;
    return;
  }

  try {
    btnCheck.disabled = true;
    document.getElementById('btnCheckText').textContent = 'Checking...';

    const registry = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
    const node = computeNamehash(canonical);
    const exists = await registry.exists(node);

    resContainer.style.display = 'block';
    if (exists) {
      const owner = await registry.ownerOf(node);
      resContainer.innerHTML = `<span class="status-badge taken">✗ Taken — Owned by ${owner.slice(0, 8)}...${owner.slice(-6)}</span>`;
      btnClaim.disabled = true;
    } else {
      resContainer.innerHTML = `<span class="status-badge available">✓ Available to Claim on Chain 901</span>`;
      btnClaim.disabled = false;
    }
  } catch (err) {
    console.error(err);
    resContainer.style.display = 'block';
    resContainer.innerHTML = `<span class="status-badge unverified">⚠️ RPC Error checking availability</span>`;
  } finally {
    btnCheck.disabled = false;
    document.getElementById('btnCheckText').textContent = 'Check Availability';
  }
}

function startClaimModalFlow() {
  const input = document.getElementById('claimTagInput').value;
  const canonical = normalizeTag(input);
  currentlyClaimingTag = canonical;

  document.getElementById('modalTagTitle').textContent = `Claiming ₦${canonical}`;
  resetStepper();
  document.getElementById('claimModal').style.display = 'flex';
  executeStepperClaim(canonical);
}

function resetStepper() {
  for (let i = 1; i <= 6; i++) {
    const step = document.getElementById(`step${i}`);
    if(step) {
      step.className = 'step-row';
      step.querySelector('.step-icon').textContent = i;
    }
  }
  document.getElementById('modalSuccessActions').style.display = 'none';
  document.getElementById('modalErrorActions').style.display = 'none';
}

function updateStep(num, status, detailText) {
  const step = document.getElementById(`step${num}`);
  const icon = step.querySelector('.step-icon');
  const detail = document.getElementById(`step${num}Detail`);

  if (detailText) detail.textContent = detailText;

  if (status === 'active') {
    step.className = 'step-row active';
    icon.innerHTML = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid var(--primary);border-top-color:transparent;animation:spin 1s linear infinite;"></span>`;
  } else if (status === 'completed') {
    step.className = 'step-row completed';
    icon.textContent = '✓';
  } else if (status === 'error') {
    step.className = 'step-row error';
    icon.textContent = '✗';
  }
}

function closeClaimModal() {
  document.getElementById('claimModal').style.display = 'none';
}

function jumpToManageAfterClaim() {
  closeClaimModal();
  document.getElementById('manageTagInput').value = currentlyClaimingTag;
  document.getElementById('btn-sub-records').click();
  loadManageHandleData();
}

async function executeStepperClaim(canonical) {
  try {
    // Step 1: Normalization
    updateStep(1, 'active', 'Validating syntax...');
    await new Promise(r => setTimeout(r, 150));
    updateStep(1, 'completed', `Canonical tag: ₦${canonical}`);

    // Step 2: Query Availability
    updateStep(2, 'active', 'Querying Registry on Chain 901...');
    const registry = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
    const node = computeNamehash(canonical);
    const exists = await registry.exists(node);
    if (exists) {
      updateStep(2, 'error', 'Tag already taken on-chain!');
      throw new Error(`Tag ₦${canonical} has already been claimed.`);
    }
    updateStep(2, 'completed', 'Tag is free to claim!');

    // Step 3: Wallet Authorization
    updateStep(3, 'active', 'Signing transaction in wallet...');
    const regWrite = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, currentSigner);
    const tx = await regWrite.claim(`₦${canonical}`, CONFIG.contracts.Resolver);
    updateStep(3, 'completed', `Submitted: ${tx.hash.slice(0, 10)}...`);

    // Step 4: L2 Mining
    updateStep(4, 'active', 'Mining transaction on TagProtocol...');
    showToast(`Claiming ₦${canonical}. Waiting for block inclusion...`, 'info');
    const receipt = await tx.wait();
    updateStep(4, 'completed', `Mined in block #${receipt.blockNumber}`);

    // Step 5: Resolver Confirmation
    updateStep(5, 'completed', `Resolver bound: ${CONFIG.contracts.Resolver.slice(0, 10)}...`);

    // Step 6: Provision Sub-Wallet
    if (window.ethereum) {
      try {
        updateStep(6, 'active', 'Provisioning Sub-Wallet...');
        // Request CDP Sub Account creation
        const result = await window.ethereum.request({
          method: 'wallet_addSubAccount',
          params: [{
            version: "1",
            account: { type: "create" },
            keys: {
              type: "address",
              publicKey: currentAddress
            }
          }]
        });
        const subAccountAddress = result?.address || result?.accounts?.[0] || null;
        if (subAccountAddress) {
          updateStep(6, 'completed', `Wallet Ready: ${subAccountAddress.slice(0, 10)}...`);
          // Persist the Sub-Wallet mapping in localStorage for the MVP
          const mapping = {
            tagId: canonical,
            tagName: `₦${canonical}`,
            ownerAddress: currentAddress,
            subAccountAddress: subAccountAddress,
            chainId: await window.ethereum.request({method: 'eth_chainId'}),
            createdAt: new Date().toISOString()
          };
          let wallets = JSON.parse(localStorage.getItem('nairatag_sub_wallets') || '[]');
          // Remove old mapping if exists
          wallets = wallets.filter(w => w.tagId !== canonical);
          wallets.push(mapping);
          localStorage.setItem('nairatag_sub_wallets', JSON.stringify(wallets));
        } else {
          updateStep(6, 'completed', 'Sub-Wallet provider skipped');
        }
      } catch (err) {
        console.warn("Sub Account provisioning not supported by current wallet or failed:", err);
        updateStep(6, 'completed', 'Standard EOA Bound');
      }
    } else {
      updateStep(6, 'completed', 'Standard EOA Bound');
    }

    fireConfetti();

    // Update Receipt Card
    document.getElementById('claimTxState').textContent = '✓ Successfully Claimed on TagProtocol!';
    document.getElementById('claimTxState').style.color = 'var(--primary)';
    document.getElementById('claimTxHashDisplay').textContent = receipt.hash;
    document.getElementById('claimBlockDisplay').textContent = `#${receipt.blockNumber}`;
    document.getElementById('claimGasDisplay').textContent = `${receipt.gasUsed.toString()} gas`;

    const linkBox = document.getElementById('claimBlockscoutLinkBox');
    const link = document.getElementById('claimBlockscoutLink');
    link.href = `/scanner/index.html`;
    linkBox.style.display = 'block';

    showToast(`🎉 ₦${canonical} registered on Chain 901!`, 'success');
    document.getElementById('modalSuccessActions').style.display = 'flex';
    checkHandleAvailability();
    refreshActivityFeed();
  } catch (err) {
    console.error(err);
    showToast('Claim failed: ' + (err.reason || err.message), 'error');
    document.getElementById('modalErrorActions').style.display = 'block';
  }
}

// =============================================================
// MANAGER: MANAGE RECORDS & RESOLVER UPDATES
// =============================================================
async function loadManageHandleData() {
  const tag = normalizeTag(document.getElementById('manageTagInput').value);
  if (!tag) return;

  const btn = document.getElementById('btnFetchManage');
  const text = document.getElementById('btnFetchManageText');
  btn.disabled = true;
  text.textContent = 'Fetching Records...';

  const node = computeNamehash(tag);
  const registry = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
  const resolver = new ethers.Contract(CONFIG.contracts.Resolver, ABIS.Resolver, provider);

  try {
    const exists = await registry.exists(node);
    if (!exists) {
      document.getElementById('manageOwnerDisplay').textContent = 'Unregistered';
      document.getElementById('manageResolverDisplay').textContent = '—';
      document.getElementById('manageAuthBadge').innerHTML = `<span class="status-badge unverified">Handle Unclaimed</span>`;
      disableManageButtons(true);
      return;
    }

    const owner = await registry.ownerOf(node);
    const resAddr = await registry.resolverOf(node);

    document.getElementById('manageOwnerDisplay').textContent = `${owner.slice(0, 8)}...${owner.slice(-6)}`;
    document.getElementById('manageResolverDisplay').textContent = `${resAddr.slice(0, 8)}...${resAddr.slice(-6)}`;

    const isOwner = currentAddress && (owner.toLowerCase() === currentAddress.toLowerCase());
    if (isOwner) {
      document.getElementById('manageAuthBadge').innerHTML = `<span class="status-badge verified">✓ Authorized (You Own This Tag)</span>`;
      disableManageButtons(false);
    } else {
      document.getElementById('manageAuthBadge').innerHTML = `<span class="status-badge unverified">Read-Only (Owned by another account)</span>`;
      disableManageButtons(true);
    }

    // Load actual records
    try {
      const addr = await resolver.addr(node);
      document.getElementById('manageAddrInput').value = addr !== ethers.ZeroAddress ? addr : '';
    } catch (_) {}

    try {
      const avatar = await resolver.text(node, 'avatar');
      document.getElementById('manageAvatarInput').value = avatar || '';
    } catch (_) {}

    try {
      const desc = await resolver.text(node, 'description');
      document.getElementById('manageDescInput').value = desc || '';
    } catch (_) {}

    try {
      const tg = await resolver.text(node, 'telegram');
      document.getElementById('manageTelegramInput').value = tg || '';
    } catch (_) {}

    try {
      const ep = await resolver.paymentEndpoint(node);
      document.getElementById('manageEndpointInput').value = ep || '';
    } catch (_) {}

  } catch (err) {
    console.error('Error fetching manage data:', err);
  } finally {
    btn.disabled = false;
    text.textContent = 'Fetch On-Chain Records';
  }
}

function disableManageButtons(disabled) {
  document.getElementById('btnUpdateAddr').disabled = disabled;
  document.getElementById('btnUpdateProfile').disabled = disabled;
  document.getElementById('btnUpdateEndpoint').disabled = disabled;
  document.getElementById('btnSetReverse').disabled = disabled;
  document.getElementById('btnTransfer').disabled = disabled;
  document.getElementById('btnRelease').disabled = disabled;
}

async function executeUpdateAddress() {
  const tag = normalizeTag(document.getElementById('manageTagInput').value);
  const targetAddr = document.getElementById('manageAddrInput').value.trim();

  if (!ethers.isAddress(targetAddr)) {
    showToast('Please enter a valid 0x address', 'error');
    return;
  }

  const btn = document.getElementById('btnUpdateAddr');
  const btnText = document.getElementById('btnUpdateAddrText');
  try {
    btn.disabled = true;
    btnText.textContent = 'Updating...';
    showToast(`Setting EVM address for ₦${tag}...`, 'info');

    const node = computeNamehash(tag);
    const resolver = new ethers.Contract(CONFIG.contracts.Resolver, ABIS.Resolver, currentSigner);
    const tx = await resolver.setAddr(node, targetAddr);
    await tx.wait();

    showToast('✓ EVM address updated on Chain 901!', 'success');
    fireConfetti();
    openTxModal(tx.hash, `Updated primary EVM address for ₦${tag}`);
    refreshActivityFeed();
  } catch (err) {
    console.error(err);
    showToast('Address update failed: ' + (err.reason || err.message), 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Update Primary Address';
  }
}

async function executeUpdateProfile() {
  const tag = normalizeTag(document.getElementById('manageTagInput').value);
  const avatar = document.getElementById('manageAvatarInput').value.trim();
  const desc = document.getElementById('manageDescInput').value.trim();
  const tg = document.getElementById('manageTelegramInput').value.trim();

  const btn = document.getElementById('btnUpdateProfile');
  const btnText = document.getElementById('btnUpdateProfileText');

  try {
    btn.disabled = true;
    btnText.textContent = 'Saving...';
    showToast(`Saving text records for ₦${tag}...`, 'info');

    const node = computeNamehash(tag);
    const resolver = new ethers.Contract(CONFIG.contracts.Resolver, ABIS.Resolver, currentSigner);

    if (avatar) {
      const tx1 = await resolver.setText(node, 'avatar', avatar);
      await tx1.wait();
    }
    if (desc) {
      const tx2 = await resolver.setText(node, 'description', desc);
      await tx2.wait();
    }
    if (tg) {
      const tx3 = await resolver.setText(node, 'telegram', tg);
      await tx3.wait();
    }

    showToast('✓ Text records saved on-chain!', 'success');
    fireConfetti();
    refreshActivityFeed();
  } catch (err) {
    console.error(err);
    showToast('Save failed: ' + (err.reason || err.message), 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Save Text Records';
  }
}

async function executeUpdateEndpoint() {
  const tag = normalizeTag(document.getElementById('manageTagInput').value);
  const ep = document.getElementById('manageEndpointInput').value.trim();

  const btn = document.getElementById('btnUpdateEndpoint');
  const btnText = document.getElementById('btnUpdateEndpointText');

  try {
    btn.disabled = true;
    btnText.textContent = 'Saving...';
    showToast(`Updating payment endpoint for ₦${tag}...`, 'info');

    const node = computeNamehash(tag);
    const resolver = new ethers.Contract(CONFIG.contracts.Resolver, ABIS.Resolver, currentSigner);
    const tx = await resolver.setPaymentEndpoint(node, ep);
    await tx.wait();

    showToast('✓ Payment endpoint updated on-chain!', 'success');
    fireConfetti();
    openTxModal(tx.hash, `Updated payment endpoint for ₦${tag}`);
    refreshActivityFeed();
  } catch (err) {
    console.error(err);
    showToast('Endpoint update failed: ' + (err.reason || err.message), 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Update Payment Endpoint';
  }
}

async function executeSetReverse() {
  const tag = normalizeTag(document.getElementById('manageTagInput').value);
  const btn = document.getElementById('btnSetReverse');
  const btnText = document.getElementById('btnSetReverseText');

  try {
    btn.disabled = true;
    btnText.textContent = 'Setting Primary Name...';
    showToast(`Setting ₦${tag} as primary identity for ${currentAddress.slice(0, 6)}...`, 'info');

    const resolver = new ethers.Contract(CONFIG.contracts.Resolver, ABIS.Resolver, currentSigner);
    const tx = await resolver.setNameForAddr(currentAddress, `₦${tag}`);
    await tx.wait();

    showToast(`✓ Primary identity set to ₦${tag}!`, 'success');
    fireConfetti();
    refreshActivityFeed();
  } catch (err) {
    console.error(err);
    showToast('Reverse lookup set failed: ' + (err.reason || err.message), 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Set as Primary NairaTag for Wallet';
  }
}

async function executeTransfer() {
  const tag = normalizeTag(document.getElementById('manageTagInput').value);
  const recipient = document.getElementById('transferRecipientInput').value.trim();

  if (!ethers.isAddress(recipient)) {
    showToast('Please enter a valid recipient 0x address', 'error');
    return;
  }

  const btn = document.getElementById('btnTransfer');
  const btnText = document.getElementById('btnTransferText');

  try {
    btn.disabled = true;
    btnText.textContent = 'Transferring...';
    showToast(`Transferring ₦${tag} to ${recipient.slice(0, 8)}...`, 'info');

    const node = computeNamehash(tag);
    const registry = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, currentSigner);
    const tx = await registry.transfer(node, recipient);
    await tx.wait();

    showToast(`✓ Ownership transferred to ${recipient.slice(0, 8)}...`, 'success');
    openTxModal(tx.hash, `Transferred ₦${tag} ownership`);
    loadManageHandleData();
    refreshActivityFeed();
  } catch (err) {
    console.error(err);
    showToast('Transfer failed: ' + (err.reason || err.message), 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Transfer Ownership';
  }
}

async function executeRelease() {
  const tag = normalizeTag(document.getElementById('manageTagInput').value);
  if (!confirm(`Are you sure you want to release ₦${tag}? Anyone will be able to claim it.`)) {
    return;
  }

  const btn = document.getElementById('btnRelease');
  const btnText = document.getElementById('btnReleaseText');

  try {
    btn.disabled = true;
    btnText.textContent = 'Releasing...';
    showToast(`Releasing ₦${tag} to public...`, 'info');

    const node = computeNamehash(tag);
    const registry = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, currentSigner);
    const tx = await registry.release(node);
    await tx.wait();

    showToast(`✓ Handle ₦${tag} released to public!`, 'success');
    openTxModal(tx.hash, `Released handle ₦${tag}`);
    loadManageHandleData();
    refreshActivityFeed();
  } catch (err) {
    console.error(err);
    showToast('Release failed: ' + (err.reason || err.message), 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Release Handle to Public';
  }
}

// =============================================================
// MANAGER: PUBLIC RESOLVER & VERIFIED TELEMETRY
// =============================================================
async function executePublicResolve() {
  const input = document.getElementById('resolveInput').value.trim();
  const canonical = normalizeTag(input);
  if (!canonical) return;

  const btn = document.getElementById('btnResolveAction');
  const btnText = document.getElementById('btnResolveText');

  try {
    btn.disabled = true;
    btnText.textContent = 'Resolving...';

    const node = computeNamehash(canonical);
    const registry = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
    const resolver = new ethers.Contract(CONFIG.contracts.Resolver, ABIS.Resolver, provider);

    const exists = await registry.exists(node);
    document.getElementById('resCanonicalTag').textContent = `₦${canonical}`;

    if (!exists) {
      document.getElementById('resTargetAddr').textContent = 'None — Tag Unclaimed';
      document.getElementById('resReverseName').textContent = '—';
      document.getElementById('resAntiSpoofStatus').innerHTML = `<span class="status-badge taken">Tag Not Registered</span>`;
      document.getElementById('resOwner').textContent = '—';
      document.getElementById('resAvatar').textContent = '—';
      document.getElementById('resDesc').textContent = '—';
      document.getElementById('resEndpoint').textContent = '—';
      return;
    }

    const owner = await registry.ownerOf(node);
    document.getElementById('resOwner').textContent = `${owner.slice(0, 8)}...${owner.slice(-6)}`;

    let targetAddr = ethers.ZeroAddress;
    try {
      targetAddr = await resolver.addr(node);
    } catch (_) {}

    document.getElementById('resTargetAddr').textContent = targetAddr !== ethers.ZeroAddress ? targetAddr : 'Not Set';

    // Reverse lookup
    let revName = '—';
    let isMutual = false;
    if (targetAddr !== ethers.ZeroAddress) {
      try {
        const revNode = await resolver.reverseNode(targetAddr);
        revName = await resolver.name(revNode);
        if (revName && normalizeTag(revName) === canonical) {
          isMutual = true;
        }
      } catch (_) {}
    }

    document.getElementById('resReverseName').textContent = revName || '—';
    if (isMutual) {
      document.getElementById('resAntiSpoofStatus').innerHTML = `<span class="status-badge verified">✓ Verified Mutual Assertion (Anti-Spoofing Passed)</span>`;
    } else {
      document.getElementById('resAntiSpoofStatus').innerHTML = `<span class="status-badge unverified">Forward only (Reverse unasserted)</span>`;
    }

    // Text & endpoint
    try {
      const avatar = await resolver.text(node, 'avatar');
      document.getElementById('resAvatar').textContent = avatar || 'None';
    } catch (_) { document.getElementById('resAvatar').textContent = 'None'; }

    try {
      const desc = await resolver.text(node, 'description');
      document.getElementById('resDesc').textContent = desc || 'None';
    } catch (_) { document.getElementById('resDesc').textContent = 'None'; }

    try {
      const ep = await resolver.paymentEndpoint(node);
      document.getElementById('resEndpoint').textContent = ep || 'None';
    } catch (_) { document.getElementById('resEndpoint').textContent = 'None'; }

  } catch (err) {
    console.error('Resolve error:', err);
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Execute Live Resolution';
  }
}

// =============================================================
// MANAGER: ACTIVITY FEED
// =============================================================
async function refreshActivityFeed() {
  const container = document.getElementById('activityContainer');
  if (!container || !provider) return;

  try {
    const b = await provider.getBlockNumber();
    const fromBlock = Math.max(0, b - 100);

    const reg = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
    const claimLogs = await reg.queryFilter(reg.filters.TagClaimed(), fromBlock, 'latest');
    const transferLogs = await reg.queryFilter(reg.filters.Transfer(), fromBlock, 'latest');

    const router = new ethers.Contract(CONFIG.contracts.Router, ABIS.Router, provider);
    const ammFactory = new ethers.Contract(CONFIG.contracts.AMMFactory, ABIS.AMMFactory, provider);

    const allEvents = [];

    claimLogs.forEach(l => {
      allEvents.push({
        type: 'CLAIM',
        title: `Tag Claimed: ${l.args[3] || 'Handle'}`,
        desc: `Registered by ${l.args[1].slice(0, 8)}...`,
        txHash: l.transactionHash,
        block: l.blockNumber
      });
    });

    transferLogs.forEach(l => {
      allEvents.push({
        type: 'TRANSFER',
        title: `Ownership Transfer`,
        desc: `New owner: ${l.args[1].slice(0, 8)}...`,
        txHash: l.transactionHash,
        block: l.blockNumber
      });
    });

    // Sort newest block first
    allEvents.sort((a, b) => b.block - a.block);

    if (allEvents.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 2rem;">No recent on-chain events detected in last 100 blocks.</div>`;
      return;
    }

    container.innerHTML = allEvents.slice(0, 15).map(e => `
      <div class="feed-item">
        <div class="feed-left">
          <span class="feed-tag ${e.type === 'CLAIM' ? 'feed-tag-claim' : 'feed-tag-transfer'}">${e.type}</span>
          <div>
            <div style="font-weight: 600; font-size: 0.88rem;">${e.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${e.desc} &bull; Block #${e.block}</div>
          </div>
        </div>
        <div class="feed-mono">
          <a href="/scanner/index.html" target="_blank" style="color: var(--cyan); font-size: 0.75rem;">
            ${e.txHash.slice(0, 10)}... ↗
          </a>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error refreshing activity:', err);
  }
}

// =============================================================
// SWAP TAB LOGIC
// =============================================================
function scheduleQuote() {
  if (quoteTimeout) clearTimeout(quoteTimeout);
  quoteTimeout = setTimeout(fetchQuote, 250);
}

async function fetchQuote() {
  const fromAmountStr = document.getElementById('swap-from-amount').value;
  const fromSymbol = document.getElementById('swap-from-select').value;
  const toSymbol = document.getElementById('swap-to-select').value;
  const actionBtn = document.getElementById('swap-action-btn');

  if (!fromAmountStr || parseFloat(fromAmountStr) <= 0) {
    document.getElementById('swap-to-amount').value = '';
    document.getElementById('swap-rate-val').textContent = '-';
    document.getElementById('swap-min-val').textContent = '0.00';
    actionBtn.textContent = 'Enter Amount';
    actionBtn.disabled = true;
    return;
  }

  if (fromSymbol === toSymbol) {
    document.getElementById('swap-to-amount').value = fromAmountStr;
    actionBtn.textContent = 'Select Different Tokens';
    actionBtn.disabled = true;
    return;
  }

  try {
    const fromToken = CONFIG.tokens[fromSymbol];
    const toToken = CONFIG.tokens[toSymbol];
    const cNGN = CONFIG.tokens.cNGN;

    const router = new ethers.Contract(CONFIG.contracts.Router, ABIS.Router, provider);
    const amountIn = ethers.parseUnits(fromAmountStr, fromToken.decimals);

    let path = [];
    if (fromToken.address.toLowerCase() === cNGN.address.toLowerCase() ||
        toToken.address.toLowerCase() === cNGN.address.toLowerCase()) {
      path = [fromToken.address, toToken.address];
      document.getElementById('swap-route-val').textContent = `Direct (${fromSymbol} → ${toSymbol})`;
    } else {
      path = [fromToken.address, cNGN.address, toToken.address];
      document.getElementById('swap-route-val').textContent = `Multi-hop (${fromSymbol} → cNGN → ${toSymbol})`;
    }

    const amounts = await router.getAmountsOut(amountIn, path);
    const amountOut = amounts[amounts.length - 1];
    const formattedOut = ethers.formatUnits(amountOut, toToken.decimals);

    document.getElementById('swap-to-amount').value = parseFloat(formattedOut).toFixed(4);

    const rate = parseFloat(formattedOut) / parseFloat(fromAmountStr);
    document.getElementById('swap-rate-val').textContent = `1 ${fromSymbol} = ${rate.toFixed(4)} ${toSymbol}`;

    const minReceived = (amountOut * 995n) / 1000n;
    document.getElementById('swap-min-val').textContent = `${parseFloat(ethers.formatUnits(minReceived, toToken.decimals)).toFixed(4)} ${toSymbol}`;

    const erc20 = new ethers.Contract(fromToken.address, ABIS.ERC20, currentSigner);
    const allowance = await erc20.allowance(currentAddress, CONFIG.contracts.Router);

    if (allowance < amountIn) {
      actionBtn.textContent = `Approve ${fromSymbol}`;
      actionBtn.disabled = false;
      actionBtn.dataset.action = 'approve';
    } else {
      actionBtn.textContent = `Swap ${fromSymbol} → ${toSymbol}`;
      actionBtn.disabled = false;
      actionBtn.dataset.action = 'swap';
    }

  } catch (e) {
    console.error('Quote failed:', e);
    document.getElementById('swap-to-amount').value = '';
    actionBtn.textContent = 'Insufficient Pool Liquidity';
    actionBtn.disabled = true;
  }
}

async function resolveSwapRecipient() {
  const input = document.getElementById('swapRecipientTag');
  const badge = document.getElementById('swapRecipientBadge');
  const feedback = document.getElementById('swapRecipientFeedback');
  const targetEl = document.getElementById('swap-delivery-target');

  if (!input || !badge || !feedback) return;
  const raw = input.value.trim();

  if (!raw) {
    swapResolvedRecipient = null;
    swapResolvedHandle = null;
    badge.textContent = '● Default: Connected Wallet';
    badge.style.color = 'var(--primary)';
    feedback.textContent = 'Funds will be routed directly to your connected wallet.';
    if (targetEl) targetEl.textContent = 'Your Wallet';
    return;
  }

  const clean = raw.replace(/^₦/, '').toLowerCase().trim();
  const full = `₦${clean}`;

  try {
    badge.textContent = `Resolving ${full}...`;
    badge.style.color = 'var(--cyan)';

    const reg = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
    const resolved = await reg.resolve(full);

    if (resolved && resolved !== ethers.ZeroAddress) {
      swapResolvedRecipient = resolved;
      swapResolvedHandle = full;
      badge.textContent = `● Validated (${resolved.slice(0, 6)}...${resolved.slice(-4)})`;
      badge.style.color = '#10b981';
      feedback.textContent = `Swapped tokens will be routed directly to ${full} (${resolved.slice(0, 8)}...) on Chain 901.`;
      if (targetEl) targetEl.textContent = `${full} (${resolved.slice(0, 6)}...)`;
    } else {
      swapResolvedRecipient = null;
      swapResolvedHandle = null;
      badge.textContent = `✕ Unregistered ₦Tag`;
      badge.style.color = '#ef4444';
      feedback.textContent = `Handle ${full} is not registered on-chain. Cannot route to this recipient.`;
      if (targetEl) targetEl.textContent = 'Unregistered Target (Reverts)';
    }
  } catch (err) {
    badge.textContent = '✕ Resolution Error';
    badge.style.color = '#ef4444';
  }
}

async function handleSwapAction() {
  const actionBtn = document.getElementById('swap-action-btn');
  const action = actionBtn.dataset.action;
  const fromSymbol = document.getElementById('swap-from-select').value;
  const toSymbol = document.getElementById('swap-to-select').value;
  const fromAmountStr = document.getElementById('swap-from-amount').value;

  const fromToken = CONFIG.tokens[fromSymbol];
  const toToken = CONFIG.tokens[toSymbol];
  const cNGN = CONFIG.tokens.cNGN;
  const amountIn = ethers.parseUnits(fromAmountStr, fromToken.decimals);

  if (action === 'approve') {
    try {
      actionBtn.disabled = true;
      actionBtn.textContent = `Approving ${fromSymbol}...`;
      showToast(`Approving Router to spend ${fromSymbol}...`, 'info');

      const erc20 = new ethers.Contract(fromToken.address, ABIS.ERC20, currentSigner);
      const tx = await erc20.approve(CONFIG.contracts.Router, ethers.MaxUint256);
      await tx.wait();

      showToast(`✓ Approved ${fromSymbol}! Now ready to swap.`, 'success');
      await fetchQuote();
    } catch (err) {
      console.error('Approve failed:', err);
      showToast('Approval failed: ' + (err.reason || err.message), 'error');
      actionBtn.disabled = false;
      actionBtn.textContent = `Approve ${fromSymbol}`;
    }
    return;
  }

  if (action === 'swap') {
    try {
      actionBtn.disabled = true;
      actionBtn.textContent = `Swapping...`;
      showToast(`Executing swap ${fromAmountStr} ${fromSymbol} → ${toSymbol}...`, 'info');

      let path = [];
      if (fromToken.address.toLowerCase() === cNGN.address.toLowerCase() ||
          toToken.address.toLowerCase() === cNGN.address.toLowerCase()) {
        path = [fromToken.address, toToken.address];
      } else {
        path = [fromToken.address, cNGN.address, toToken.address];
      }

      let targetRecipient = currentAddress;
      let deliveryDesc = 'Your Wallet';

      const rawRecipientInput = document.getElementById('swapRecipientTag')?.value.trim();
      if (rawRecipientInput) {
        if (!swapResolvedRecipient) {
          showToast('Please enter a valid, registered destination ₦Tag or leave blank for your wallet.', 'error');
          actionBtn.disabled = false;
          return;
        }
        targetRecipient = swapResolvedRecipient;
        deliveryDesc = `${swapResolvedHandle} (${targetRecipient.slice(0, 6)}...${targetRecipient.slice(-4)})`;
      }

      const tx = await router.swapExactTokensForTokens(
        amountIn,
        minOut,
        path,
        targetRecipient,
        deadline
      );

      const receipt = await tx.wait();
      showToast(`✓ Swapped ${fromAmountStr} ${fromSymbol} successfully! Delivered to ${deliveryDesc}`, 'success');
      fireConfetti();
      openTxModal(tx.hash, `Swapped ${fromAmountStr} ${fromSymbol} for ${toSymbol} → Delivered to ${deliveryDesc}`);

      addRecentSwap({
        fromSymbol,
        toSymbol,
        fromAmount: fromAmountStr,
        txHash: tx.hash,
        time: new Date().toLocaleTimeString()
      });

      await updateBalances();
      await fetchQuote();
      refreshEcosystem();
      refreshActivityFeed();
    } catch (err) {
      console.error('Swap failed:', err);
      showToast('Swap failed: ' + (err.reason || err.message), 'error');
      actionBtn.disabled = false;
      actionBtn.textContent = `Swap ${fromSymbol} → ${toSymbol}`;
    }
  }
}

function addRecentSwap(swap) {
  recentSwaps.unshift(swap);
  if (recentSwaps.length > 5) recentSwaps.pop();

  const container = document.getElementById('recent-swaps-list');
  container.innerHTML = recentSwaps.map(s => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(7,12,24,0.7); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
      <div>
        <span style="color: var(--primary); font-weight: 600;">${s.fromAmount} ${s.fromSymbol} → ${s.toSymbol}</span>
        <span style="color: var(--text-dim); font-size: 0.7rem; margin-left: 0.5rem;">${s.time}</span>
      </div>
      <a href="/scanner/index.html" target="_blank" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--cyan);">
        ${s.txHash.slice(0, 8)}...
      </a>
    </div>
  `).join('');
}

// =============================================================
// BRIDGE & SWAP EXECUTION (HYPERLANE WARP ROUTE)
// =============================================================
async function updateBridgeSourceBalance() {
  const el = document.getElementById('bridge-source-bal');
  if (!el) return;

  try {
    const provider902 = new ethers.JsonRpcProvider('http://127.0.0.1:9546');
    const cngn902Addr = CONFIG.warp?.chain902?.token || '0x5fbdb2315678afecb367f032d93f642f64180aa3';
    const cngn = new ethers.Contract(cngn902Addr, ABIS.ERC20, provider902);
    const dev = DEV_ACCOUNTS[currentMode] || DEV_ACCOUNTS.dev1;
    const bal = await cngn.balanceOf(dev.address);
    el.textContent = `Source Balance: ${parseFloat(ethers.formatEther(bal)).toLocaleString()} cNGN (Chain 902)`;
    el.style.color = '#10b981';
  } catch (err) {
    el.textContent = 'Source Balance: Connected to Chain 902';
    el.style.color = 'var(--text-muted)';
  }
}

async function resolveBridgeRecipient() {
  const input = document.getElementById('bridge-recipient-tag');
  const feedback = document.getElementById('bridge-recipient-feedback');
  if (!input || !feedback) return;

  const raw = input.value.trim();
  if (!raw) {
    feedback.textContent = '● Target: Connected Wallet';
    feedback.style.color = 'var(--primary)';
    return;
  }

  const clean = normalizeTag(raw);
  const full = `₦${clean}`;

  try {
    const reg = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
    const resolved = await reg.resolve(full);
    if (resolved && resolved !== ethers.ZeroAddress) {
      feedback.textContent = `● Resolved: ${full} (${resolved.slice(0, 6)}...${resolved.slice(-4)})`;
      feedback.style.color = '#10b981';
    } else {
      feedback.textContent = `✕ Unregistered ${full}`;
      feedback.style.color = '#ef4444';
    }
  } catch (e) {
    feedback.textContent = '✕ Error resolving handle';
    feedback.style.color = '#ef4444';
  }
}

function setBridgeStep(stepNumber, state, text) {
  const el = document.getElementById(`step-${stepNumber}-status`);
  if (!el) return;
  el.textContent = text;
  if (state === 'Processing') {
    el.className = 'status-badge unverified';
    el.style.background = 'rgba(234, 179, 8, 0.15)';
    el.style.color = '#b45309';
  } else if (state === 'Done') {
    el.className = 'status-badge available';
    el.style.background = 'rgba(16, 185, 129, 0.15)';
    el.style.color = '#10b981';
  } else if (state === 'Failed') {
    el.className = 'status-badge taken';
    el.style.background = 'rgba(239, 68, 68, 0.15)';
    el.style.color = '#ef4444';
  } else {
    el.className = 'status-badge';
    el.style.background = 'rgba(0,0,0,0.05)';
    el.style.color = 'var(--text-muted)';
  }
}

async function handleBridgeAndSwap() {
  const btn = document.getElementById('btn-execute-bridge');
  const amountStr = document.getElementById('bridge-amount-input').value;
  const destTokenSymbol = document.getElementById('bridge-dest-token').value;
  const recipientTagInput = document.getElementById('bridge-recipient-tag').value.trim();
  const overallStatus = document.getElementById('bridge-overall-status');

  if (!amountStr || parseFloat(amountStr) <= 0) {
    showToast('Please enter a valid amount to bridge', 'error');
    return;
  }

  const amount = ethers.parseEther(amountStr);

  try {
    btn.disabled = true;
    btn.textContent = 'Executing Bridge & Swap...';
    if (overallStatus) {
      overallStatus.textContent = 'In Progress';
      overallStatus.style.color = 'var(--cyan)';
    }

    // Reset step badges
    for (let i = 1; i <= 6; i++) setBridgeStep(i, 'Pending', 'Pending');

    // 0. Resolve recipient
    const canonicalTag = normalizeTag(recipientTagInput || 'asake');
    const fullTag = `₦${canonicalTag}`;
    const registry = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
    const resolvedTarget = await registry.resolve(fullTag);
    if (!resolvedTarget || resolvedTarget === ethers.ZeroAddress) {
      throw new Error(`Recipient ${fullTag} is not registered on Chain 901.`);
    }

    // Providers & signers
    const dev = DEV_ACCOUNTS[currentMode] || DEV_ACCOUNTS.dev1;
    const provider902 = new ethers.JsonRpcProvider('http://127.0.0.1:9546');
    const signer902 = new ethers.Wallet(dev.key, provider902);

    const warpCollateral902 = CONFIG.warp?.chain902?.router || '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0';
    const cngn902Addr = CONFIG.warp?.chain902?.token || '0x5fbdb2315678afecb367f032d93f642f64180aa3';
    const wcNGN901Addr = CONFIG.warp?.nairatag901?.router || '0x09635f643e140090a9a8dcd712ed6285858cebef';

    // STEP 1: Approve cNGN on Chain 902
    setBridgeStep(1, 'Processing', 'Approving...');
    showToast(`1/6: Approving Warp Collateral on Chain 902...`, 'info');
    const cngn902 = new ethers.Contract(cngn902Addr, ABIS.ERC20, signer902);
    const allowance = await cngn902.allowance(dev.address, warpCollateral902);
    if (allowance < amount) {
      const appTx = await cngn902.approve(warpCollateral902, ethers.MaxUint256);
      await appTx.wait();
      setBridgeStep(1, 'Done', `✓ Approved (${appTx.hash.slice(0, 8)}...)`);
    } else {
      setBridgeStep(1, 'Done', '✓ Pre-approved');
    }

    // STEP 2: Execute transferRemote on Chain 902
    setBridgeStep(2, 'Processing', 'Depositing...');
    showToast(`2/6: Depositing ${amountStr} cNGN to Hyperlane Warp...`, 'info');
    const warp902 = new ethers.Contract(warpCollateral902, ABIS.HypWarp, signer902);
    const recipientBytes32 = ethers.zeroPadValue(dev.address, 32);
    const fee = await warp902.quoteGasPayment(901).catch(() => 0n);

    const bridgeTx = await warp902.transferRemote(901, recipientBytes32, amount, { value: fee });
    const bridgeReceipt = await bridgeTx.wait();
    setBridgeStep(2, 'Done', `✓ Mined #${bridgeReceipt.blockNumber} (${bridgeTx.hash.slice(0, 8)}...)`);

    // STEP 3: Relayer attestation
    setBridgeStep(3, 'Processing', 'Relayer delivering...');
    showToast(`3/6: Waiting for Hyperlane relayer to deliver to Chain 901...`, 'info');
    const wcNGN901 = new ethers.Contract(wcNGN901Addr, ABIS.ERC20, provider);
    const balBefore = await wcNGN901.balanceOf(dev.address);

    let balAfter = balBefore;
    let waitCount = 0;
    while (balAfter <= balBefore && waitCount < 30) {
      await new Promise(r => setTimeout(r, 1000));
      balAfter = await wcNGN901.balanceOf(dev.address);
      waitCount++;
    }

    if (balAfter <= balBefore) {
      throw new Error('Relayer delivery timed out. Ensure hyperlane relayer service is running.');
    }
    setBridgeStep(3, 'Done', '✓ Delivered by Relayer');

    // STEP 4: Destination Receipt
    const receivedAmount = balAfter - balBefore;
    setBridgeStep(4, 'Done', `✓ Received +${parseFloat(ethers.formatEther(receivedAmount)).toFixed(2)} wcNGN`);

    // STEP 5: Native AMM Swap to target token (e.g. ASAKE)
    if (destTokenSymbol !== 'wcNGN') {
      setBridgeStep(5, 'Processing', `Swapping wcNGN → ${destTokenSymbol}...`);
      showToast(`5/6: Executing Native AMM Swap to ${destTokenSymbol}...`, 'info');

      const targetToken = CONFIG.tokens[destTokenSymbol];
      const router = new ethers.Contract(CONFIG.contracts.Router, ABIS.Router, currentSigner);

      // Approve router for wcNGN on Chain 901
      const wcNGNSigner = new ethers.Contract(wcNGN901Addr, ABIS.ERC20, currentSigner);
      const routerAllowance = await wcNGNSigner.allowance(dev.address, CONFIG.contracts.Router);
      if (routerAllowance < receivedAmount) {
        const routerApp = await wcNGNSigner.approve(CONFIG.contracts.Router, ethers.MaxUint256);
        await routerApp.wait();
      }

      const path = [wcNGN901Addr, targetToken.address];
      const amountsOut = await router.getAmountsOut(receivedAmount, path);
      const expectedTarget = amountsOut[1];
      const minOut = (expectedTarget * 980n) / 1000n; // 2% slippage tolerance
      const deadline = Math.floor(Date.now() / 1000) + 1200;

      const swapTx = await router.swapExactTokensForTokens(
        receivedAmount,
        minOut,
        path,
        resolvedTarget,
        deadline
      );
      const swapReceipt = await swapTx.wait();
      setBridgeStep(5, 'Done', `✓ Swapped #${swapReceipt.blockNumber} (${swapTx.hash.slice(0, 8)}...)`);

      // STEP 6: Settlement to ₦Tag
      setBridgeStep(6, 'Done', `✓ Delivered to ${fullTag}`);
      showToast(`🎉 Cross-chain bridge & swap complete! Delivered ${parseFloat(ethers.formatEther(expectedTarget)).toFixed(2)} ${destTokenSymbol} to ${fullTag}`, 'success');
      fireConfetti();
      openTxModal(swapTx.hash, `Bridge & Swap Complete: ${amountStr} cNGN (Chain 902) → ${parseFloat(ethers.formatEther(expectedTarget)).toFixed(2)} ${destTokenSymbol} (Chain 901) → Delivered to ${fullTag}`);
    } else {
      setBridgeStep(5, 'Done', '✓ Direct Bridge Route');
      setBridgeStep(6, 'Done', `✓ Retained as wcNGN`);
      showToast(`🎉 Cross-chain bridge complete! ${amountStr} wcNGN ready on Chain 901.`, 'success');
      fireConfetti();
      openTxModal(bridgeTx.hash, `Bridge Complete: ${amountStr} cNGN (Chain 902) → wcNGN (Chain 901)`);
    }

    if (overallStatus) {
      overallStatus.textContent = '✓ Completed';
      overallStatus.style.color = '#10b981';
    }

    await updateBridgeSourceBalance();
    await updateBalances();
    refreshActivityFeed();
    refreshEcosystem();

  } catch (err) {
    console.error('Bridge execution error:', err);
    showToast('Bridge error: ' + (err.reason || err.message), 'error');
    if (overallStatus) {
      overallStatus.textContent = 'Failed';
      overallStatus.style.color = '#ef4444';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = '🌉 Bridge & Swap to ₦asake';
  }
}

// =============================================================
// LAUNCHPAD TAB LOGIC (DOPPLER & AIRLOCK INTEGRATION)
// =============================================================
let currentLaunchMode = 'doppler';

function switchLaunchMode(mode) {
  currentLaunchMode = mode;
  const dopplerBtn = document.getElementById('mode-doppler-btn');
  const legacyBtn = document.getElementById('mode-legacy-btn');
  const dopplerBox = document.getElementById('doppler-details-box');
  const legacyFields = document.getElementById('legacy-seed-fields');
  const title = document.getElementById('launch-form-title');
  const subtitle = document.getElementById('launch-form-subtitle');
  const submitBtn = document.getElementById('launch-submit-btn');

  if (mode === 'doppler') {
    if (dopplerBtn) {
      dopplerBtn.style.background = 'var(--primary)';
      dopplerBtn.style.color = '#000';
    }
    if (legacyBtn) {
      legacyBtn.style.background = 'transparent';
      legacyBtn.style.color = 'var(--text-muted)';
    }
    if (dopplerBox) dopplerBox.style.display = 'block';
    if (legacyFields) legacyFields.style.display = 'none';
    if (title) title.textContent = '⚡ Doppler Fair Launchpad';
    if (subtitle) subtitle.textContent = 'Deploy Token + Bind Model B ₦Identity + Bootstrap Price on Bonding Curve with 0 Upfront Capital';
    if (submitBtn) {
      submitBtn.textContent = '🚀 Create Doppler Fair Launch (0 cNGN Required)';
      submitBtn.style.background = 'linear-gradient(135deg, #00da94, #00b8d9)';
    }
  } else {
    if (dopplerBtn) {
      dopplerBtn.style.background = 'transparent';
      dopplerBtn.style.color = 'var(--text-muted)';
    }
    if (legacyBtn) {
      legacyBtn.style.background = 'var(--gold)';
      legacyBtn.style.color = '#000';
    }
    if (dopplerBox) dopplerBox.style.display = 'none';
    if (legacyFields) legacyFields.style.display = 'block';
    if (title) title.textContent = '💧 Direct AMM Liquidity Launchpad';
    if (subtitle) subtitle.textContent = 'Deploy Token + Register ₦Handle + Create AMM Pool + Seed Liquidity in 1 Transaction';
    if (submitBtn) {
      submitBtn.textContent = '🚀 Launch Token on AMM (Deposit Required)';
      submitBtn.style.background = 'linear-gradient(135deg, #f0b429, #00da94)';
    }
  }

  updateLaunchPreview();
}

function updateLaunchPreview() {
  const name = document.getElementById('launch-name').value || 'Kemi Energy';
  const symbol = document.getElementById('launch-symbol').value || 'KEMI';
  let handle = document.getElementById('launch-handle').value || 'kemi';
  handle = handle.startsWith('₦') ? handle : '₦' + handle;

  const badgeEl = document.getElementById('preview-badge');
  const nameEl = document.getElementById('preview-name-text');
  const handleEl = document.getElementById('preview-handle-text');
  const modelEl = document.getElementById('preview-model-text');
  const priceEl = document.getElementById('preview-price-text');
  const mcapEl = document.getElementById('preview-mcap-text');
  const engineEl = document.getElementById('preview-engine-text');

  if (nameEl) nameEl.textContent = name;
  if (handleEl) handleEl.textContent = handle;
  if (badgeEl) badgeEl.textContent = (symbol.slice(0, 1) || 'K').toUpperCase();

  if (currentLaunchMode === 'doppler') {
    if (modelEl) modelEl.textContent = 'Doppler Bonding Curve';
    if (priceEl) priceEl.textContent = '0.00833 cNGN (P₀) → 0.02500 cNGN (P_f)';
    if (mcapEl) mcapEl.textContent = '10,000 cNGN Target';
    if (engineEl) engineEl.textContent = 'NairaTagDopplerLaunchpad';
  } else {
    const supply = parseFloat(document.getElementById('launch-supply').value || '1000000');
    const cngnSeed = parseFloat(document.getElementById('launch-cngn-seed').value || '5000');
    const tokenSeed = parseFloat(document.getElementById('launch-token-seed').value || '50000');
    const price = tokenSeed > 0 ? (cngnSeed / tokenSeed) : 0;
    const mcap = price * supply;

    if (modelEl) modelEl.textContent = 'Instant AMM Direct Seed';
    if (priceEl) priceEl.textContent = `${price.toFixed(4)} cNGN`;
    if (mcapEl) mcapEl.textContent = `${mcap.toLocaleString()} cNGN`;
    if (engineEl) engineEl.textContent = 'NairaTagLaunchpad (Legacy)';
  }
}

async function handleLaunchToken() {
  const name = document.getElementById('launch-name').value.trim();
  const symbol = document.getElementById('launch-symbol').value.trim().toUpperCase();
  let handle = document.getElementById('launch-handle').value.trim();
  const launchBtn = document.getElementById('launch-submit-btn');

  if (!name || !symbol || !handle) {
    showToast('Please fill in Name, Symbol, and Handle.', 'error');
    return;
  }

  handle = normalizeTag(handle);

  if (currentLaunchMode === 'doppler') {
    try {
      launchBtn.disabled = true;
      launchBtn.textContent = 'Deploying Doppler Launch on Chain 901...';
      showToast(`Initiating Doppler Fair Launch for ${symbol} on Chain 901...`, 'info');

      const dopplerLaunchpad = new ethers.Contract(
        CONFIG.contracts.DopplerLaunchpad,
        ABIS.DopplerLaunchpad,
        currentSigner
      );

      const tx = await dopplerLaunchpad.createLaunch(
        handle,
        name,
        symbol,
        CONFIG.contracts.MockCNGN
      );

      const receipt = await tx.wait();
      showToast(`🎉 ${symbol} successfully launched with Doppler bonding curve!`, 'success');
      fireConfetti();
      openTxModal(tx.hash, `Created Doppler Fair Launch for ${name} (₦${handle})`);

      let tokenAddr = null;
      let initializerAddr = null;
      for (const log of receipt.logs) {
        try {
          const parsed = dopplerLaunchpad.interface.parseLog(log);
          if (parsed && parsed.name === 'LaunchCreated') {
            tokenAddr = parsed.args.token;
            initializerAddr = parsed.args.initializer;
            break;
          }
        } catch (_) {}
      }

      if (tokenAddr) {
        CONFIG.tokens[symbol] = {
          address: tokenAddr,
          symbol,
          name,
          decimals: 18,
          handle: `₦${handle}`,
          initializer: initializerAddr,
          graduated: false
        };
        addTokenToSelects(symbol);
      }

      launchBtn.disabled = false;
      launchBtn.textContent = '🚀 Create Doppler Fair Launch (0 cNGN Required)';
      refreshDopplerLaunches();
      refreshEcosystem();
      refreshActivityFeed();
    } catch (err) {
      console.error('Doppler Launch failed:', err);
      showToast('Doppler Launch failed: ' + (err.reason || err.message), 'error');
      launchBtn.disabled = false;
      launchBtn.textContent = '🚀 Create Doppler Fair Launch (0 cNGN Required)';
    }
  } else {
    // Legacy AMM Direct Seed Flow
    const supplyStr = document.getElementById('launch-supply').value;
    const cngnSeedStr = document.getElementById('launch-cngn-seed').value;
    const tokenSeedStr = document.getElementById('launch-token-seed').value;

    try {
      launchBtn.disabled = true;
      launchBtn.textContent = 'Approving cNGN...';

      const cngnAmount = ethers.parseEther(cngnSeedStr);
      const tokenSupply = ethers.parseEther(supplyStr);
      const tokenSeedAmount = ethers.parseEther(tokenSeedStr);

      const cngn = new ethers.Contract(CONFIG.contracts.MockCNGN, ABIS.MockCNGN, currentSigner);
      showToast(`Approving ${cngnSeedStr} cNGN for Launchpad...`, 'info');
      const appTx = await cngn.approve(CONFIG.contracts.Launchpad, cngnAmount);
      await appTx.wait();

      launchBtn.textContent = 'Deploying & Seeding Pool...';
      showToast(`Launching ${symbol} on Chain 901...`, 'info');
      const launchpad = new ethers.Contract(CONFIG.contracts.Launchpad, ABIS.Launchpad, currentSigner);

      const tx = await launchpad.launch(
        handle,
        name,
        symbol,
        tokenSupply,
        CONFIG.contracts.MockCNGN,
        tokenSeedAmount,
        cngnAmount
      );

      const receipt = await tx.wait();
      showToast(`🎉 ${symbol} successfully launched!`, 'success');
      fireConfetti();
      openTxModal(tx.hash, `Launched ${name} (${symbol}) & created AMM pool`);

      let tokenAddr = null;
      let pairAddr = null;
      for (const log of receipt.logs) {
        try {
          const parsed = launchpad.interface.parseLog(log);
          if (parsed && parsed.name === 'TokenLaunched') {
            tokenAddr = parsed.args.token;
            pairAddr = parsed.args.pair;
            break;
          }
        } catch (_) {}
      }

      if (tokenAddr) {
        CONFIG.tokens[symbol] = {
          address: tokenAddr,
          symbol,
          name,
          decimals: 18,
          handle: `₦${handle}`
        };
        addTokenToSelects(symbol);
      }

      launchBtn.disabled = false;
      launchBtn.textContent = '🚀 Launch Token on AMM (Deposit Required)';
      refreshEcosystem();
      refreshActivityFeed();
    } catch (err) {
      console.error('Launch failed:', err);
      showToast('Launch failed: ' + (err.reason || err.message), 'error');
      launchBtn.disabled = false;
      launchBtn.textContent = '🚀 Launch Token on AMM (Deposit Required)';
    }
  }
}

function prefillSwapWithToken(symbol) {
  const toSelect = document.getElementById('swap-to-select');
  const fromSelect = document.getElementById('swap-from-select');
  if (fromSelect) fromSelect.value = 'cNGN';
  if (toSelect) {
    if (!toSelect.querySelector(`option[value="${symbol}"]`)) {
      addTokenToSelects(symbol);
    }
    toSelect.value = symbol;
  }
  const tabSwapBtn = document.getElementById('btn-tab-swap') || document.querySelector('[data-tab="tab-swap"]');
  if (tabSwapBtn) tabSwapBtn.click();
  calculateSwapQuote();
}

async function refreshDopplerLaunches() {
  if (!provider) return;
  const grid = document.getElementById('doppler-launches-grid');
  if (!grid) return;

  try {
    const doppler = new ethers.Contract(CONFIG.contracts.DopplerLaunchpad, ABIS.DopplerLaunchpad, provider);
    const count = await doppler.allLaunchesLength();
    console.log(`Found ${count} Doppler launches on Chain 901`);

    let html = '';
    for (let i = 0; i < Number(count); i++) {
      const tokenAddr = await doppler.allLaunches(i);
      const initializerAddr = await doppler.tokenInitializer(tokenAddr);
      const fullTag = await doppler.tokenTag(tokenAddr);

      const tokenContract = new ethers.Contract(tokenAddr, ABIS.Token, provider);
      let name = 'Unknown Token', symbol = 'TKN';
      try {
        name = await tokenContract.name();
        symbol = await tokenContract.symbol();
      } catch (_) {}

      const initContract = new ethers.Contract(initializerAddr, ABIS.AirlockInitializer, provider);
      let raised = 0, state = 0, price = 0.00833;
      try {
        const rWei = await initContract.cumulativeCNGNRaised();
        raised = parseFloat(ethers.formatEther(rWei));
        state = await initContract.state();
        const pWei = await initContract.getCurrentPrice();
        price = parseFloat(ethers.formatEther(pWei));
      } catch (_) {}

      const isGrad = (state === 1 || state === 2 || raised >= 10000);
      const pct = Math.min(100, (raised / 10000) * 100).toFixed(1);

      html += `
        <div class="card" style="background:rgba(13,20,38,0.85); border:1px solid ${isGrad ? 'rgba(0,218,148,0.3)' : 'var(--border)'}; box-shadow:${isGrad ? '0 0 20px rgba(0,218,148,0.08)' : 'none'};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, ${isGrad ? '#00da94, #00b8d9' : '#f0b429, #ff5f6d'}); color:#000; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.25rem;">
                ${isGrad ? '⚡' : '🚀'}
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:1.1rem; font-weight:700; color:var(--text-main);">${name}</span>
                  <span style="font-size:0.85rem; color:var(--text-muted);">(${symbol})</span>
                </div>
                <div style="font-size:0.85rem; color:var(--primary); font-family:var(--font-mono); font-weight:600;">${fullTag}</div>
              </div>
            </div>
            <span class="badge" style="background:${isGrad ? 'rgba(0,218,148,0.18)' : 'rgba(240,180,41,0.18)'}; color:${isGrad ? 'var(--primary)' : 'var(--gold)'}; border:1px solid ${isGrad ? 'rgba(0,218,148,0.4)' : 'rgba(240,180,41,0.4)'}; font-size:0.72rem; padding:4px 8px; border-radius:6px; font-weight:700;">
              ${isGrad ? '🟢 Graduated & Locked' : '🟡 Bonding Curve Active'}
            </span>
          </div>

          <div style="margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:5px;">
              <span>Bonding Curve Progress</span>
              <span style="color:${isGrad ? 'var(--primary)' : 'var(--gold)'}; font-weight:700;">${raised.toLocaleString()} / 10,000 cNGN (${pct}%)</span>
            </div>
            <div style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
              <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, #00da94, #00b8d9);"></div>
            </div>
          </div>

          <div style="background:rgba(0,0,0,0.25); border-radius:var(--radius-sm); padding:0.85rem; font-size:0.78rem; display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:1.15rem;">
            <div>
              <span style="color:var(--text-muted); display:block; font-size:0.7rem;">Price</span>
              <span style="font-family:var(--font-mono); font-weight:600; color:var(--primary);">${price.toFixed(5)} cNGN</span>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block; font-size:0.7rem;">LP Invariant</span>
              <span style="font-family:var(--font-mono); font-weight:600; color:var(--gold);">100% Locked</span>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block; font-size:0.7rem;">Node Ownership</span>
              <span style="font-family:var(--font-mono); font-weight:600; color:var(--primary);">Model B Token</span>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block; font-size:0.7rem;">Token Address</span>
              <span style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted);">${tokenAddr.slice(0, 6)}...${tokenAddr.slice(-4)}</span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            ${isGrad ? `
              <button class="btn-primary" style="background:linear-gradient(135deg, #00da94, #00b8d9); font-size:0.82rem; padding:0.6rem;" onclick="prefillSwapWithToken('${symbol}')">
                🔄 Swap on AMM
              </button>
            ` : `
              <button class="btn-primary" style="background:linear-gradient(135deg, #f0b429, #00da94); font-size:0.82rem; padding:0.6rem;" onclick="showToast('Curve active: buy via Doppler pool on Chain 901', 'info')">
                ⚡ Buy on Curve
              </button>
            `}
            <a href="/scanner/index.html#txs" target="_blank" class="btn-sm" style="background:rgba(255,255,255,0.06); border:1px solid var(--border); color:var(--text-main); display:flex; align-items:center; justify-content:center; text-decoration:none; font-size:0.82rem; border-radius:8px;">
              🔍 View on Scan
            </a>
          </div>
        </div>
      `;
    }

    if (html) grid.innerHTML = html;
  } catch (err) {
    console.warn('refreshDopplerLaunches error:', err);
  }
}

function addTokenToSelects(symbol) {
  const fromSelect = document.getElementById('swap-from-select');
  const toSelect = document.getElementById('swap-to-select');

  if (!fromSelect.querySelector(`option[value="${symbol}"]`)) {
    const opt1 = document.createElement('option');
    opt1.value = symbol;
    opt1.textContent = `₦${symbol}`;
    fromSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = symbol;
    opt2.textContent = `₦${symbol}`;
    toSelect.appendChild(opt2);
  }
}

// =============================================================
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
      if (!currentAddress) { deployerBal = '0.00'; continue; }
      const bal = await tc.balanceOf(currentAddress);
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


window.quickSelectSwap = function(symbol) {
  document.getElementById('btn-tab-swap').click();
  const toSelect = document.getElementById('swap-to-select');
  toSelect.value = symbol;
  updateBalances();
  scheduleQuote();
};

// Network Poller
function startNetworkPoller() {
  setInterval(async () => {
    try {
      if (!provider) return;
      const b = await provider.getBlockNumber();
      if (b !== latestBlock) {
        latestBlock = b;
        document.getElementById('chain-block-num').textContent = `Block #${b}`;
        document.getElementById('metric-block').textContent = `#${b}`;
      }
    } catch (_) {}
  }, 2000);
}

// UI Helpers
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> <div>${msg}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function openTxModal(hash, desc) {
  document.getElementById('modal-txhash').textContent = hash;
  document.getElementById('modal-desc').textContent = desc;
  document.getElementById('modal-view-scanner').href = `/scanner/index.html`;
  document.getElementById('tx-modal').classList.add('active');
}

function fireConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 75,
      spread: 65,
      origin: { y: 0.65 }
    });
  }
}

// ── SEND TO NAIRATAG IMPLEMENTATION ──────────────────────────────────────────
function initSendToTag() {
  const sendTagInput = document.getElementById('sendTagInput');
  const sendTokenSelect = document.getElementById('sendTokenSelect');
  const sendAmountInput = document.getElementById('sendAmountInput');
  const btnExecuteSend = document.getElementById('btnExecuteSend');
  const btnExecuteSendText = document.getElementById('btnExecuteSendText');
  const btnSendMax = document.getElementById('btnSendMax');
  const sendResolveStatus = document.getElementById('sendResolveStatus');
  const sendResolvedAddress = document.getElementById('sendResolvedAddress');
  const sendTokenBalance = document.getElementById('sendTokenBalance');
  const sendTagFeedback = document.getElementById('sendTagFeedback');

  if (!sendTagInput || !btnExecuteSend) return;

  let debounceTimer = null;

  async function resolveTargetTag() {
    const rawVal = sendTagInput.value.trim();
    if (!rawVal) {
      sendResolveStatus.textContent = '● Awaiting Tag';
      sendResolveStatus.style.color = 'var(--text-muted)';
      sendResolvedAddress.textContent = '—';
      sendTagFeedback.textContent = 'Enter handle to resolve recipient address';
      updateSendButtonLabel();
      return;
    }

    const clean = rawVal.replace(/^₦/, '').toLowerCase().trim();
    const full = `₦${clean}`;
    sendResolveStatus.textContent = 'Resolving on Chain 901...';
    sendResolveStatus.style.color = 'var(--cyan)';

    try {
      const reg = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
      const addr = await reg.resolve(full);

      if (addr && addr !== ethers.ZeroAddress) {
        sendResolveStatus.textContent = '● Verified On-Chain';
        sendResolveStatus.style.color = '#10b981';
        sendResolvedAddress.textContent = `${addr.slice(0, 8)}...${addr.slice(-6)}`;
        sendResolvedAddress.title = addr;
        sendTagFeedback.textContent = `Resolves to: ${addr}`;
        sendTagFeedback.style.color = '#10b981';
      } else {
        sendResolveStatus.textContent = '✕ Unclaimed Handle';
        sendResolveStatus.style.color = '#ef4444';
        sendResolvedAddress.textContent = 'Unregistered';
        sendTagFeedback.textContent = `Handle ${full} has not been claimed yet.`;
        sendTagFeedback.style.color = '#ef4444';
      }
    } catch (e) {
      sendResolveStatus.textContent = '✕ Error';
      sendResolveStatus.style.color = '#ef4444';
      sendResolvedAddress.textContent = 'Lookup Failed';
    }
    updateSendButtonLabel();
  }

  function updateSendButtonLabel() {
    const clean = sendTagInput.value.replace(/^₦/, '').toLowerCase().trim();
    const tokenSymbol = sendTokenSelect.value;
    btnExecuteSendText.textContent = `Send ${tokenSymbol} to ₦${clean || 'tag'}`;
  }

  async function updateSendBalance() {
    if (!currentAddress || !provider) return;
    try {
      const symbol = sendTokenSelect.value;
      const tok = CONFIG.tokens[symbol];
      if (!tok) {
        sendTokenBalance.textContent = 'Balance: 0.00';
        return;
      }
      const c = new ethers.Contract(tok.address, ABIS.ERC20, provider);
      const b = await c.balanceOf(currentAddress);
      sendTokenBalance.textContent = `Balance: ${formatBalance(b, tok.decimals)} ${symbol}`;
      sendTokenBalance.setAttribute('data-raw', b.toString());
    } catch (e) {
      console.warn('Failed to fetch send token balance:', e);
    }
  }
  window.updateSendBalance = updateSendBalance;

  sendTagInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(resolveTargetTag, 250);
  });

  sendTokenSelect.addEventListener('change', () => {
    updateSendButtonLabel();
    updateSendBalance();
  });

  btnSendMax.addEventListener('click', () => {
    const raw = sendTokenBalance.getAttribute('data-raw');
    const symbol = sendTokenSelect.value;
    const tok = CONFIG.tokens[symbol];
    if (raw && tok) {
      sendAmountInput.value = ethers.formatUnits(raw, tok.decimals);
    }
  });

  document.querySelectorAll('[data-sendtag]').forEach(chip => {
    chip.addEventListener('click', () => {
      sendTagInput.value = chip.getAttribute('data-sendtag');
      resolveTargetTag();
    });
  });

  btnExecuteSend.addEventListener('click', async () => {
    const rawTag = sendTagInput.value.trim();
    const amountVal = parseFloat(sendAmountInput.value);
    const symbol = sendTokenSelect.value;
    const tok = CONFIG.tokens[symbol];

    if (!rawTag) {
      showToast('Please enter a destination ₦Tag', 'error');
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Please enter a valid transfer amount', 'error');
      return;
    }
    if (!tok) {
      showToast(`Token ${symbol} configuration missing`, 'error');
      return;
    }

    const clean = rawTag.replace(/^₦/, '').toLowerCase().trim();
    const full = `₦${clean}`;

    try {
      btnExecuteSend.disabled = true;
      btnExecuteSendText.textContent = `Resolving ${full}...`;

      const reg = new ethers.Contract(CONFIG.contracts.Registry, ABIS.Registry, provider);
      const targetAddr = await reg.resolve(full);

      if (!targetAddr || targetAddr === ethers.ZeroAddress) {
        showToast(`Cannot transfer: ${full} is not registered on-chain`, 'error');
        btnExecuteSend.disabled = false;
        updateSendButtonLabel();
        return;
      }

      btnExecuteSendText.textContent = `Transferring ${amountVal} ${symbol}...`;
      document.getElementById('sendTxStatus').textContent = 'Broadcasting to Chain 901...';
      document.getElementById('sendTxStatus').style.color = 'var(--cyan)';

      const tokenContract = new ethers.Contract(tok.address, ABIS.ERC20, currentSigner);
      const parsedAmount = ethers.parseUnits(amountVal.toString(), tok.decimals);

      const tx = await tokenContract.transfer(targetAddr, parsedAmount);
      document.getElementById('sendTxHashDisplay').textContent = `${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`;
      document.getElementById('sendTxHashDisplay').title = tx.hash;
      document.getElementById('sendTxStatus').textContent = 'Sequencing...';

      const receipt = await tx.wait();

      document.getElementById('sendTxStatus').textContent = '● Mined (Confirmed)';
      document.getElementById('sendTxStatus').style.color = '#10b981';
      document.getElementById('sendBlockDisplay').textContent = `#${receipt.blockNumber}`;
      document.getElementById('sendGasDisplay').textContent = `${receipt.gasUsed.toString()} gas`;
      document.getElementById('sendReceiptRecipient').textContent = `${full} (${targetAddr.slice(0, 6)}...${targetAddr.slice(-4)})`;

      const linkBox = document.getElementById('sendExplorerLinkBox');
      const link = document.getElementById('sendExplorerLink');
      linkBox.style.display = 'block';
      link.href = `/scanner/index.html?tx=${tx.hash}`;

      showToast(`Successfully sent ${amountVal} ${symbol} to ${full}!`, 'success');
      fireConfetti();
      openTxModal(tx.hash, `Transfer ${amountVal} ${symbol} -> ${full}`);

      await updateSendBalance();
      await updateBalances();
      refreshActivityFeed();
    } catch (err) {
      console.error('Send error:', err);
      document.getElementById('sendTxStatus').textContent = '✕ Transaction Failed';
      document.getElementById('sendTxStatus').style.color = '#ef4444';
      showToast('Transfer failed: ' + (err.reason || err.message), 'error');
    } finally {
      btnExecuteSend.disabled = false;
      updateSendButtonLabel();
    }
  });

  resolveTargetTag();
  updateSendBalance();
}

