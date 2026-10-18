const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { createPublicClient, http } = require('viem');
const { LiFiBridgeAdapter } = require('../../sdk/src/lifi');
const { createTagService } = require('../../bots/nairatag-claim/src/tag-service');
const { createNotificationStore } = require('../../bots/nairatag-claim/src/notification-store');
const { createPhoneResolverService } = require('../../bots/nairatag-claim/src/phone-resolver-service');
const { createPointsService } = require('../../bots/nairatag-claim/src/points-service');
const { createMarketplaceService } = require('../../bots/nairatag-claim/src/marketplace-service');
const { createChowdeckService } = require('../../bots/nairatag-claim/src/chowdeck-service');
const { createOjaLMService } = require('../../bots/nairatag-claim/src/ojalm-service');
const { createMuseSparkAgent } = require('../../bots/nairatag-claim/src/muse-spark');
const celoSepoliaDeployment = require('../../deployments/nairatag-celo-sepolia.json');
const { defaultWalletFactory } = require('../../sdk/src/wallet/AgentWalletFactory');
const { defaultTaskEngine } = require('../../sdk/src/wallet/tasks');
const { defaultActivityStore } = require('../../sdk/src/wallet/activity');

const fs = require('node:fs');
const path = require('node:path');

function loadEnvFile() {
  const filePath = path.join(__dirname, '../../bots/nairatag-claim/.env');
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

loadEnvFile();

const service = createTagService(process.env);
const celoSepoliaService = createTagService({
  ...process.env,
  TAGPROTOCOL_RPC_URL: celoSepoliaDeployment.rpcUrl,
  TAGPROTOCOL_CHAIN_ID: String(celoSepoliaDeployment.chainId),
  NAIRATAG_REGISTRY_ADDRESS: celoSepoliaDeployment.contracts.registry,
  NAIRATAG_RESOLVER_ADDRESS: celoSepoliaDeployment.contracts.resolver,
  NAIRATAG_PAYMENT_REQUEST_ADDRESS: celoSepoliaDeployment.contracts.paymentRequest,
  PUBLIC_CLAIM_URL: process.env.PUBLIC_CLAIM_URL || 'http://127.0.0.1:8088/hub/index.html',
});
const storePath = path.resolve(process.env.NOTIFICATION_DB_PATH || path.join(__dirname, '../../bots/nairatag-claim/data/notifications.sqlite'));
const store = createNotificationStore(storePath);
const phoneService = createPhoneResolverService({ notificationStore: store, tagService: service });
const points = createPointsService({ notificationStore: store });
const marketplace = createMarketplaceService({ notificationStore: store, tagService: service });
const chowdeck = createChowdeckService({ notificationStore: store });
const ojalm = createOjaLMService();
const museSpark = createMuseSparkAgent({
  tagService: service,
  phoneResolverService: phoneService,
  pointsService: points,
  marketplaceService: marketplace,
  chowdeckService: chowdeck,
  ojalmService: ojalm
});

const server = new McpServer({
  name: 'nairatag-agent',
  version: '0.2.0',
});
const lifi = new LiFiBridgeAdapter();

function result(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function failure(error) {
  return { isError: true, content: [{ type: 'text', text: error.message }] };
}

function networkService(network) {
  if (network === 'celoSepolia' || network === 'celo' || network === 'baseSepolia') return celoSepoliaService;
  if (network === 'nairatag') return service;
  return celoSepoliaService;
}

function walletCallFor(network, prepared) {
  return {
    chain: 'celo-sepolia',
    chainId: 11142220,
    calls: [{ to: prepared.contract, value: '0x0', data: prepared.calldata }],
    approvalRequired: true,
    approvalProvider: 'Celo Wallet MCP',
  };
}

async function notifyClaimBot(claim) {
  const botUrl = process.env.CLAIM_BOT_URL || 'http://127.0.0.1:8787';
  const response = await fetch(`${botUrl}/claim-confirmed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(claim),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || `Claim bot notification failed: ${response.status}`);
  return body.notification;
}

async function notifyWalletAction(action) {
  const botUrl = process.env.CLAIM_BOT_URL || 'http://127.0.0.1:8787';
  const response = await fetch(`${botUrl}/api/agent/notify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(action),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || `Wallet action notification failed: ${response.status}`);
  return body;
}

function walletChain(chain) {
  const normalized = String(chain || '').replace('_', '-');
  const configs = {
    'celo-sepolia': { id: 11142220, name: 'Celo Sepolia', rpc: process.env.CELO_SEPOLIA_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org', explorer: 'https://celo-sepolia.blockscout.com' },
    celo: { id: 42220, name: 'Celo', rpc: process.env.CELO_RPC_URL || 'https://forno.celo.org', explorer: 'https://celoscan.io' },
  };
  const config = configs[normalized] || configs['celo-sepolia'];
  return config;
}

async function call(read) {
  try {
    return result(await read());
  } catch (error) {
    return failure(error);
  }
}

server.tool(
  'check_tag',
  'Check whether a NairaTag handle is available on the live registry.',
  { handle: z.string().min(1) },
  ({ handle }) => call(() => service.checkAvailability(handle)),
);

server.tool(
  'find_available_handle',
  'Check candidate NairaTag handles in order and return the first available handle. The agent should ask the user for candidates or a naming theme before calling this tool.',
  { candidates: z.array(z.string().min(1)).min(1).max(20) },
  ({ candidates }) => call(async () => {
    for (const candidate of candidates) {
      try {
        const availability = await service.checkAvailability(candidate);
        if (availability.available) return { ...availability, checked: candidates };
      } catch (error) {
        return { error: error.message, candidate };
      }
    }
    return { available: false, checked: candidates, message: 'No candidate handle is available.' };
  }),
);

server.tool(
  'resolve_tag',
  'Resolve a NairaTag handle to its current EVM address.',
  { handle: z.string().min(1) },
  ({ handle }) => call(() => service.resolveTag(handle)),
);

server.tool(
  'resolve_tag_chain_address',
  'Resolve an explicit multicoin NairaTag resolver record. The coin type must be supplied by the caller and must not be inferred from a chain name.',
  { handle: z.string().min(1), coinType: z.string().regex(/^[0-9]+$/) },
  ({ handle, coinType }) => call(() => service.resolveChainAddress(handle, coinType)),
);

server.tool(
  'get_tag_owner',
  'Read the current on-chain owner of a NairaTag handle.',
  { handle: z.string().min(1) },
  ({ handle }) => call(() => service.getOwner(handle)),
);

server.tool(
  'get_tag_profile',
  'Read the owner, resolver, address, description, and payment endpoint for a NairaTag handle.',
  { handle: z.string().min(1) },
  ({ handle }) => call(() => service.getProfile(handle)),
);

server.tool(
  'reverse_resolve_address',
  'Resolve an EVM address back to a verified NairaTag handle.',
  { address: z.string().min(1) },
  ({ address }) => call(() => service.reverseResolve(address)),
);

server.tool(
  'prepare_tag_payment',
  'Resolve a NairaTag to its current wallet address and prepare a Wallet MCP send request. The agent must call get_wallets first, then call Wallet MCP send and wait for approval before reporting success.',
  { handle: z.string().min(1), amount: z.string().min(1), asset: z.string().min(1).default('cNGN'), chain: z.enum(['celo', 'celo-sepolia']).default('celo-sepolia') },
  ({ handle, amount, asset, chain }) => call(async () => {
    const resolved = await service.resolveTag(handle);
    if (!resolved?.resolvedAddress) throw new Error(`${handle} could not be resolved to a wallet address.`);
    return {
      stage: 'READY_FOR_WALLET_MCP_SEND',
      tag: resolved.handle || handle,
      recipient: resolved.resolvedAddress,
      mcp: { tool: 'send', arguments: { recipient: resolved.resolvedAddress, amount, asset, chain } },
      approval: { required: true, next: 'Call Wallet MCP send, show approvalUrl, then poll get_request_status.' },
    };
  }),
);

server.tool(
  'prepare_wallet_send',
  'Validate a direct wallet transfer and return the exact Wallet MCP send arguments. This tool never signs or broadcasts.',
  { recipient: z.string().min(1), amount: z.string().min(1), asset: z.string().min(1), chain: z.enum(['celo', 'celo-sepolia']).default('celo-sepolia') },
  ({ recipient, amount, asset, chain }) => call(() => ({
    stage: 'READY_FOR_WALLET_MCP_SEND',
    mcp: { tool: 'send', arguments: { recipient, amount, asset, chain } },
    approval: { required: true, next: 'Call Wallet MCP send, show approvalUrl, then poll get_request_status.' },
  })),
);

server.tool(
  'prepare_wallet_swap',
  'Return Wallet MCP swap arguments for a supported mainnet chain. Wallet MCP does not support testnet swaps.',
  { fromAsset: z.string().min(1), toAsset: z.string().min(1), amount: z.string().min(1), chain: z.enum(['celo', 'celo-sepolia']).default('celo-sepolia') },
  ({ fromAsset, toAsset, amount, chain }) => call(() => ({
    stage: 'READY_FOR_WALLET_MCP_SWAP',
    mcp: { tool: 'swap', arguments: { fromAsset, toAsset, amount, chain } },
    approval: { required: true, next: 'Call Wallet MCP swap, show approvalUrl, then poll get_request_status.' },
  })),
);

server.tool(
  'prepare_tag_bridge',
  'Resolve a source and destination NairaTag, validate that the connected wallet owns the source tag, request a real LI.FI quote, and return an unsigned Wallet MCP send_calls payload. This tool never signs or broadcasts.',
  { sourceTag: z.string().min(1), destinationTag: z.string().min(1), walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), sourceChainId: z.number().int(), destinationChainId: z.number().int(), destinationCoinType: z.string().regex(/^[0-9]+$/), fromToken: z.string().regex(/^0x[0-9a-fA-F]{40}$/), toToken: z.string().regex(/^0x[0-9a-fA-F]{40}$/), amount: z.string().regex(/^[0-9]+$/), slippage: z.number().positive().max(0.5).default(0.005) },
  ({ sourceTag, destinationTag, walletAddress, sourceChainId, destinationChainId, destinationCoinType, fromToken, toToken, amount, slippage }) => call(async () => {
    const source = await service.resolveTag(sourceTag);
    const destination = await service.resolveChainAddress(destinationTag, destinationCoinType);
    if (!source.resolvedAddress) throw new Error(`${source.display} has no resolved source address.`);
    if (!destination.resolvedAddress) throw new Error(`${destination.display} has no resolved destination address.`);
    if (source.resolvedAddress.toLowerCase() !== walletAddress.toLowerCase()) throw new Error(`Connected wallet does not own ${source.display}.`);
    const quote = await lifi.quote({ sourceChainId, destinationChainId, fromToken, toToken, amount, fromAddress: walletAddress, toAddress: destination.resolvedAddress, slippage });
    const prepared = await lifi.initiate(quote);
    return {
      stage: 'READY_FOR_WALLET_MCP_SEND_CALLS',
      sourceTag: source.display,
      destinationTag: destination.display,
      sourceAddress: source.resolvedAddress,
      destinationAddress: destination.resolvedAddress,
      quote,
      walletCall: prepared.walletCall,
      approval: { required: true, next: 'Call Wallet MCP send_calls, show approvalUrl, then poll get_request_status.' },
    };
  }),
);

server.tool(
  'get_tag_bridge_status',
  'Query LI.FI for source and destination settlement status after Wallet MCP confirms the source transaction.',
  { transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), sourceChainId: z.number().int(), destinationChainId: z.number().int(), bridge: z.string().optional() },
  ({ transactionHash, sourceChainId, destinationChainId, bridge }) => call(() => lifi.getStatus({ transactionHash, sourceChainId, destinationChainId, bridge })),
);

server.tool(
  'confirm_tag_bridge',
  'After Wallet MCP confirms the source transaction, query LI.FI and notify Telegram only when the destination settlement is DONE.',
  { walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), sourceTag: z.string().min(1), destinationTag: z.string().min(1), sourceChainId: z.number().int(), destinationChainId: z.number().int(), bridge: z.string().optional() },
  ({ walletAddress, transactionHash, sourceTag, destinationTag, sourceChainId, destinationChainId, bridge }) => call(async () => {
    const status = await lifi.getStatus({ transactionHash, sourceChainId, destinationChainId, bridge });
    if (!status.completed) return { ...status, notification: { sent: false, reason: 'Destination settlement is still processing.' } };
    const destinationUrl = status.destinationTransactionHash ? `https://li.fi/tx/${status.destinationTransactionHash}` : null;
    const notification = await notifyWalletAction({ walletAddress, message: [`✅ Tag-to-tag bridge complete`, `${sourceTag} → ${destinationTag}`, `Provider: LI.FI`, `Source transaction: ${transactionHash}`, ...(status.destinationTransactionHash ? [`Destination transaction: ${status.destinationTransactionHash}`] : []), ...(destinationUrl ? [`Bridge status: ${destinationUrl}`] : [])].join('\n') });
    return { ...status, sourceTag, destinationTag, notification };
  }),
);

server.tool(
  'confirm_wallet_action',
  'After Wallet MCP get_request_status reports a confirmed write, verify the transaction receipt on the requested chain and queue a Telegram result for the linked wallet. Never call this before Wallet MCP approval is confirmed.',
  { walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), action: z.enum(['send', 'swap', 'tag-payment', 'send_calls']), chain: z.enum(['celo', 'celo-sepolia']).default('celo-sepolia'), summary: z.string().min(1) },
  ({ walletAddress, transactionHash, action, chain, summary }) => call(async () => {
    const config = walletChain(chain);
    const client = createPublicClient({ chain: { id: config.id, name: config.name, nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 }, rpcUrls: { default: { http: [config.rpc] } } }, transport: http(config.rpc) });
    const receipt = await client.getTransactionReceipt({ hash: transactionHash });
    if (receipt.status !== 'success') throw new Error(`Wallet action transaction reverted: ${transactionHash}`);
    const notification = await notifyWalletAction({ walletAddress, message: [`✅ Wallet action confirmed`, `Action: ${action}`, `Network: ${config.name}`, summary, `Transaction: ${transactionHash}`, `Scan: ${config.explorer}/tx/${transactionHash}`].join('\n') });
    return { status: 'confirmed', action, chain, transactionHash, blockNumber: Number(receipt.blockNumber), explorerUrl: `${config.explorer}/tx/${transactionHash}`, notification };
  }),
);

server.tool(
  'create_claim_link',
  'Create a non-custodial NairaTag manager link for a handle. The user must approve any transaction with their own wallet.',
  { handle: z.string().min(1) },
  ({ handle }) => call(async () => {
    const availability = await service.checkAvailability(handle);
    return availability.available
      ? { ...availability, claimUrl: service.claimUrl(availability.handle) }
      : availability;
  }),
);

server.tool(
  'get_network_status',
  'Report the canonical NairaTag resolution network and the verified status of Celo Sepolia testnet.',
  {},
  () => result({
    resolution: 'celo-sepolia',
    primaryExecution: {
      network: 'celoSepolia',
      chainId: 11142220,
      name: 'Celo Sepolia Testnet',
      primaryAsset: 'CELO',
      supportedTokens: ['CELO', 'cNGN', 'USDC'],
      contracts: celoSepoliaDeployment.contracts,
      rpcUrl: celoSepoliaDeployment.rpcUrl,
      blockExplorer: 'https://celo-sepolia.blockscout.com'
    },
    transactionNetworks: {
      celoSepolia: { chainId: 11142220, supported: true, status: 'PRIMARY_ACTIVE', contracts: celoSepoliaDeployment.contracts },
      celo: { chainId: 42220, supported: false, status: 'MAINNET_UPSTREAM' },
      nairatag: { chainId: 901, supported: false, status: 'LEGACY_LOCAL' },
    },
  }),
);

server.tool(
  'get_celo_balance',
  'Read the verified cNGN, USDC, USDT, and CELO balances for an address or resolved NairaTag handle on Celo.',
  { handleOrAddress: z.string().min(1), network: z.enum(['celo', 'celoAlfajores']).default('celo') },
  ({ handleOrAddress, network }) => call(async () => {
    let targetAddress = handleOrAddress;
    if (handleOrAddress.startsWith('₦') || !handleOrAddress.startsWith('0x')) {
      const resolved = await service.resolveTag(handleOrAddress);
      if (!resolved?.resolvedAddress) throw new Error(`Could not resolve ${handleOrAddress} to a wallet address.`);
      targetAddress = resolved.resolvedAddress;
    }
    const wallet = defaultWalletFactory.createWallet({ network, address: targetAddress });
    const balances = await wallet.getAllBalances();
    return {
      target: handleOrAddress,
      address: targetAddress,
      network,
      balances
    };
  }),
);

server.tool(
  'send_celo_token',
  'Prepare or execute a cNGN, USDC, or USDT transfer on Celo. Automatically resolves destination NairaTag if provided.',
  { recipient: z.string().min(1), amount: z.string().min(1), token: z.enum(['cNGN', 'USDC', 'USDT', 'CELO']).default('cNGN'), network: z.enum(['celo', 'celoAlfajores']).default('celo') },
  ({ recipient, amount, token, network }) => call(async () => {
    let targetAddress = recipient;
    if (recipient.startsWith('₦') || !recipient.startsWith('0x')) {
      const resolved = await service.resolveTag(recipient);
      if (!resolved?.resolvedAddress) throw new Error(`Could not resolve recipient ${recipient} to a wallet address.`);
      targetAddress = resolved.resolvedAddress;
    }
    const wallet = defaultWalletFactory.createWallet({ network });
    const simulation = await wallet.simulateTransfer({ token, to: targetAddress, amount });
    return {
      stage: 'READY_FOR_CELO_EXECUTION',
      network,
      token,
      amount,
      recipient,
      recipientAddress: targetAddress,
      simulation,
      approvalRequired: true,
      note: 'Confirm via Celo Agent Wallet or connected MiniPay wallet client.'
    };
  }),
);

server.tool(
  'create_payment_task',
  'Register a recurring financial payment task on Celo (e.g. monthly cNGN remittance) with duplicate-execution locking.',
  { recipientTag: z.string().min(1), amount: z.string().min(1), asset: z.string().default('cNGN'), schedule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('MONTHLY') },
  ({ recipientTag, amount, asset, schedule }) => call(async () => {
    const task = defaultTaskEngine.createTask({
      recipientTag,
      amount,
      asset,
      schedule,
      network: 'celo'
    });
    return {
      status: 'TASK_CREATED',
      task
    };
  }),
);

server.tool(
  'list_payment_tasks',
  'List all active scheduled and recurring payment tasks for the NairaTag agent.',
  { agentId: z.string().optional().default('default') },
  ({ agentId }) => call(() => ({
    tasks: defaultTaskEngine.listTasks(agentId)
  })),
);

server.tool(
  'prepare_claim',
  'Policy-gated transaction preparation. Checks availability, routes to the verified Celo Sepolia deployment, encodes the real claim call, and requires explicit user wallet confirmation before signing.',
  { handle: z.string().min(1), network: z.enum(['celoSepolia', 'celo', 'nairatag']).default('celoSepolia'), account: z.string().optional() },
  ({ handle, network, account }) => call(async () => {
    const prepared = await networkService(network).prepareClaim(handle, account);
    return { ...prepared, claimUrl: null, walletCall: walletCallFor(network, prepared) };
  }),
);

server.tool(
  'confirm_claim',
  'After the user has approved and signed the prepared transaction with their own wallet, verify its receipt and matching TagClaimed event, then notify Telegram if configured.',
  { transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), handle: z.string().min(1), network: z.enum(['celoSepolia', 'celo', 'nairatag']).default('celoSepolia'), owner: z.string().optional(), confirmation: z.literal('USER_APPROVED') },
  ({ transactionHash, handle, network, owner, confirmation }) => call(async () => {
    if (confirmation !== 'USER_APPROVED') throw new Error('User confirmation is required before checking a claim transaction.');
    const selectedService = networkService(network);
    const verified = await selectedService.verifyClaimReceipt(transactionHash, handle, owner);
    const profile = await selectedService.getProfile(verified.handle);
    const reverse = await selectedService.reverseResolve(verified.owner);
    const explorerBase = 'https://celo-sepolia.blockscout.com';
    let notification;
    try {
      notification = await notifyClaimBot({
        canonical: verified.handle,
        owner: verified.owner,
        resolver: verified.resolver,
        transactionHash: verified.transactionHash,
        blockNumber: verified.blockNumber,
        logIndex: verified.logIndex,
      });
    } catch (error) {
      notification = { sent: false, error: error.message };
    }
    return {
      ...verified,
      explorerUrl: `${explorerBase}/tx/${verified.transactionHash}`,
      profile,
      reverse,
      notification,
    };
  }),
);

server.tool(
  'start_claim_flow',
  'Start the natural-language claim flow on Celo Sepolia. Use a candidate list to find an available handle, or a handle to prepare it. Always show the returned wallet handoff and ask the user to approve before calling confirm_claim.',
  { handle: z.string().min(1).optional(), candidates: z.array(z.string().min(1)).min(1).max(20).optional(), network: z.enum(['celoSepolia', 'celo', 'nairatag']).default('celoSepolia'), account: z.string().optional() },
  ({ handle, candidates, network, account }) => call(async () => {
    const selectedService = networkService(network);
    let selected = handle;
    if (!selected) {
      if (!candidates) throw new Error('Provide a handle or candidate handles so availability can be checked.');
      const available = await serverCallFindAvailable(candidates, selectedService);
      if (!available.available) return available;
      selected = available.handle;
    }
    const prepared = await selectedService.prepareClaim(selected, account);
    return { stage: 'AWAITING_USER_WALLET_APPROVAL', ...prepared, claimUrl: null, walletCall: walletCallFor(network, prepared) };
  }),
);

server.tool(
  'prepare_profile_update',
  'Prepare a wallet-signed identity profile update for the on-chain owner of a NairaTag handle.',
  { handle: z.string().min(1), field: z.enum(['address', 'description', 'paymentEndpoint', 'reverseName']), value: z.string().min(1), network: z.enum(['celoSepolia', 'celo', 'nairatag']).default('celoSepolia'), account: z.string().min(1) },
  ({ handle, field, value, network, account }) => call(() => networkService(network).prepareProfileUpdate(handle, field, value, account)),
);

server.tool(
  'prepare_payment_request',
  'Prepare a payment request on Celo Sepolia for a resolved NairaTag. Amount is an integer number of wei.',
  { handle: z.string().min(1), amount: z.string().regex(/^[0-9]+$/), paymentRef: z.string().min(1), network: z.enum(['celoSepolia', 'celo', 'nairatag']).default('celoSepolia'), account: z.string().optional() },
  ({ handle, amount, paymentRef, network, account }) => call(() => networkService(network).preparePaymentRequest(handle, amount, paymentRef, account)),
);

server.tool(
  'prepare_chain_address_record',
  'Prepare an owner-signed multi-chain resolver record. Requires an explicitly verified ENSIP-9/SLIP-0044 coin type.',
  { handle: z.string().min(1), network: z.enum(['celoSepolia', 'celo']).default('celoSepolia'), coinType: z.string().regex(/^[0-9]+$/), address: z.string().min(1), account: z.string().min(1) },
  ({ handle, network, coinType, address, account }) => call(() => service.prepareChainAddress(handle, network, coinType, address, account)),
);

server.tool(
  'prepare_payment',
  'Prepare a native payment for an existing request on Celo Sepolia.',
  { requestId: z.string().regex(/^0x[0-9a-fA-F]{64}$/), network: z.enum(['celoSepolia', 'celo', 'nairatag']).default('celoSepolia'), account: z.string().optional() },
  ({ requestId, network, account }) => call(() => networkService(network).preparePayment(requestId, account)),
);

server.tool(
  'confirm_payment',
  'Verify a user-signed native payment receipt on Celo Sepolia and notify the Telegram channel through the claim bot.',
  { transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), requestId: z.string().regex(/^0x[0-9a-fA-F]{64}$/), network: z.enum(['celoSepolia', 'celo', 'nairatag']).default('celoSepolia'), confirmation: z.literal('USER_APPROVED') },
  ({ transactionHash, requestId, network }) => call(async () => {
    const settled = await networkService(network).verifyPaymentReceipt(transactionHash, requestId);
    let notification = { sent: false, reason: 'Payment notification is not configured.' };
    try {
      notification = await notifyClaimBot({ canonical: `payment:${settled.requestId}`, owner: settled.payer, transactionHash: settled.transactionHash, blockNumber: settled.blockNumber, logIndex: 0 });
    } catch (error) {
      notification = { sent: false, error: error.message };
    }
    return { ...settled, notification };
  }),
);

server.tool(
  'confirm_payment_request',
  'Verify the user-signed payment-request creation receipt and return the real request ID needed for payment.',
  { transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), handle: z.string().min(1), network: z.enum(['nairatag', 'celoSepolia']).default('celoSepolia'), confirmation: z.literal('USER_APPROVED') },
  ({ transactionHash, handle, network }) => call(() => networkService(network).verifyPaymentRequestReceipt(transactionHash, handle)),
);

server.tool(
  'confirm_profile_update',
  'Verify a user-signed profile update receipt by its expected resolver event.',
  { transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), field: z.enum(['address', 'description', 'paymentEndpoint', 'reverseName']), network: z.enum(['nairatag', 'celoSepolia']).default('celoSepolia'), confirmation: z.literal('USER_APPROVED') },
  ({ transactionHash, field, network }) => call(() => networkService(network).verifyProfileUpdateReceipt(transactionHash, field)),
);

// 1. Phone Resolver Tools
server.tool(
  'resolve_phone',
  'Resolve a phone number (E.164 e.g. +234803XXXXXXX) to its canonical NairaTag and wallet address if discovery is enabled by the owner.',
  { phone: z.string().min(1) },
  ({ phone }) => call(() => phoneService.resolvePhone(phone)),
);

server.tool(
  'link_phone_resolver',
  'Link a phone number to a NairaTag with privacy and discovery toggles.',
  { phone: z.string().min(1), tag: z.string().min(1), walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), allowPhoneDiscovery: z.boolean().default(true), whatsappDiscovery: z.boolean().default(true), contactDiscovery: z.boolean().default(true) },
  ({ phone, tag, walletAddress, allowPhoneDiscovery, whatsappDiscovery, contactDiscovery }) => call(() => phoneService.linkPhone({ phone, tag, walletAddress, allowPhoneDiscovery, whatsappDiscovery, contactDiscovery })),
);

// 2. Points & Referral Tools
server.tool(
  'get_user_points',
  'Read the current NairaTag points balance, referral code, and recent rewards ledger for an account.',
  { walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/) },
  ({ walletAddress }) => call(() => points.getAccountSummary(walletAddress)),
);

server.tool(
  'award_claim_points',
  'Award +100 points for a completed ₦Tag claim, and +100 points to the referrer if a referral code was used.',
  { walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), tag: z.string().min(1), referralCode: z.string().optional() },
  ({ walletAddress, tag, referralCode }) => call(() => points.awardClaimPoints({ walletAddress, tag, referralCode })),
);

server.tool(
  'get_points_leaderboard',
  'Retrieve the top points leaderboard for NairaTag claimers and referrers.',
  { limit: z.number().int().optional().default(10) },
  ({ limit }) => call(() => points.getLeaderboard(limit)),
);

// 3. Tag Marketplace Tools (Buy / Sell / Swap)
server.tool(
  'get_marketplace_listings',
  'Browse secondary market listings for NairaTags (filtered by all, sale, or swap).',
  { filter: z.enum(['all', 'sale', 'swap']).default('all') },
  ({ filter }) => call(() => marketplace.getListings({ filter })),
);

server.tool(
  'get_marketplace_tag',
  'Check the lifecycle state of a NairaTag (AVAILABLE, CLAIMED, or LISTED) along with marketplace metadata.',
  { tag: z.string().min(1) },
  ({ tag }) => call(() => marketplace.getListing(tag)),
);

server.tool(
  'list_tag_marketplace',
  'List an owned NairaTag on the marketplace for sale or peer-to-peer swap.',
  { tag: z.string().min(1), owner: z.string().regex(/^0x[0-9a-fA-F]{40}$/), price: z.string().optional(), currency: z.string().default('ETH'), listingType: z.enum(['sale', 'swap', 'both']).default('sale'), swapTargetTag: z.string().optional(), extraAmount: z.string().optional() },
  ({ tag, owner, price, currency, listingType, swapTargetTag, extraAmount }) => call(() => marketplace.listTag({ tag, owner, price, currency, listingType, swapTargetTag, extraAmount })),
);

server.tool(
  'prepare_tag_buy',
  'Prepare the purchase of a listed NairaTag from the marketplace.',
  { tag: z.string().min(1), buyerAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/) },
  ({ tag, buyerAddress }) => call(() => marketplace.prepareBuy({ tag, buyerAddress })),
);

server.tool(
  'prepare_tag_swap',
  'Prepare an atomic or escrowed tag swap proposal between two NairaTags.',
  { myTag: z.string().min(1), targetTag: z.string().min(1), myAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), extraAmount: z.string().optional() },
  ({ myTag, targetTag, myAddress, extraAmount }) => call(() => marketplace.prepareSwap({ myTag, targetTag, myAddress, extraAmount })),
);

server.tool(
  'prepare_tag_ownership_transfer',
  'Prepare an on-chain ownership transfer of a NairaTag in the canonical Registry.',
  { tag: z.string().min(1), newOwner: z.string().regex(/^0x[0-9a-fA-F]{40}$/), currentOwner: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional() },
  ({ tag, newOwner, currentOwner }) => call(() => marketplace.prepareOwnershipTransfer({ tag, newOwner, currentOwner })),
);

// 4. Chowdeck Food Delivery Tools
server.tool(
  'chowdeck_search_restaurants',
  'Search Chowdeck restaurants in Lagos/Nigeria by cuisine, name, or location.',
  { query: z.string().optional(), location: z.string().optional() },
  ({ query, location }) => call(() => chowdeck.searchRestaurants({ query, location })),
);

server.tool(
  'chowdeck_search_items',
  'Search Chowdeck meals across restaurants with price filters (e.g. lunch under ₦8,000).',
  { query: z.string().optional(), maxPrice: z.number().optional() },
  ({ query, maxPrice }) => call(() => chowdeck.searchItems({ query, maxPrice })),
);

server.tool(
  'chowdeck_get_menu',
  'Get full food and drink menu for a Chowdeck restaurant.',
  { restaurantId: z.string().min(1) },
  ({ restaurantId }) => call(() => chowdeck.getMenu(restaurantId)),
);

server.tool(
  'chowdeck_get_delivery_quote',
  'Get delivery fee and estimated delivery time for a restaurant and delivery address.',
  { restaurantId: z.string().min(1), deliveryAddress: z.string().default('Victoria Island, Lagos') },
  ({ restaurantId, deliveryAddress }) => call(() => chowdeck.getDeliveryQuote({ restaurantId, deliveryAddress })),
);

server.tool(
  'chowdeck_create_order',
  'Place a food order on Chowdeck paid through a NairaTag wallet identity.',
  { restaurantId: z.string().min(1), items: z.array(z.object({ id: z.string().optional(), name: z.string().optional(), quantity: z.number().default(1) })).min(1), deliveryAddress: z.string().min(1), paymentTag: z.string().min(1), walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/) },
  ({ restaurantId, items, deliveryAddress, paymentTag, walletAddress }) => call(() => chowdeck.createOrder({ restaurantId, items, deliveryAddress, paymentTag, walletAddress })),
);

server.tool(
  'chowdeck_track_order',
  'Track live preparation and delivery status of a Chowdeck order.',
  { orderId: z.string().min(1) },
  ({ orderId }) => call(() => chowdeck.trackOrder(orderId)),
);

// 5. OjaLM Nigerian Commerce Tools
server.tool(
  'ojalm_search_products',
  'Query Nigerian open-market and commercial benchmarks (Computer Village, Balogun, Alaba).',
  { query: z.string().min(1) },
  ({ query }) => call(() => ojalm.searchProducts(query)),
);

server.tool(
  'ojalm_compare_prices',
  'Compare prices for an item across Nigerian walk-in open markets and online retail stores.',
  { item: z.string().min(1) },
  ({ item }) => call(() => ojalm.comparePrices(item)),
);

server.tool(
  'ojalm_find_merchant',
  'Discover verified Nigerian merchants that accept direct NairaTag transfers.',
  { category: z.string().optional() },
  ({ category }) => call(() => ojalm.findMerchant(category)),
);

// 6. Gemini 2.5 Flash-Lite Agent Brain
server.tool(
  'muse_spark_reason',
  'Run the Gemini 2.5 Flash-Lite agent brain to reason, chain tools, and process natural language requests for commerce, food, phone resolution, points, and payments.',
  { prompt: z.string().min(1), wallet: z.string().optional(), tag: z.string().optional() },
  ({ prompt, wallet, tag }) => call(() => museSpark.processPrompt(prompt, { wallet, tag })),
);

async function serverCallFindAvailable(candidates, selectedService = service) {
  for (const candidate of candidates) {
    const availability = await selectedService.checkAvailability(candidate);
    if (availability.available) return { ...availability, checked: candidates };
  }
  return { available: false, checked: candidates, message: 'No candidate handle is available.' };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(error => {
  console.error('[nairatag-mcp]', error.message);
  process.exit(1);
});
