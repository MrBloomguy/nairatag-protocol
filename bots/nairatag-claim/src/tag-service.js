const { createPublicClient, http, getAddress, keccak256, stringToBytes, toBytes, concat, encodeFunctionData, parseEventLogs, bytesToHex, hexToBytes } = require('viem');

const REGISTRY_ABI = [
  { type: 'function', name: 'exists', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'resolver', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'resolve', stateMutability: 'view', inputs: [{ name: 'tag', type: 'string' }], outputs: [{ type: 'address' }] },
  { type: 'event', name: 'TagClaimed', inputs: [{ name: 'node', type: 'bytes32', indexed: true }, { name: 'canonical', type: 'string', indexed: false }, { name: 'rawTag', type: 'string', indexed: false }, { name: 'owner', type: 'address', indexed: true }, { name: 'resolver', type: 'address', indexed: false }] },
];

const CLAIM_ABI = [
  { type: 'function', name: 'claim', stateMutability: 'nonpayable', inputs: [{ name: 'tag', type: 'string' }, { name: 'targetResolver', type: 'address' }], outputs: [{ name: 'node', type: 'bytes32' }] },
  { type: 'event', name: 'TagClaimed', inputs: [{ name: 'node', type: 'bytes32', indexed: true }, { name: 'canonical', type: 'string', indexed: false }, { name: 'rawTag', type: 'string', indexed: false }, { name: 'owner', type: 'address', indexed: true }, { name: 'resolver', type: 'address', indexed: false }] },
];

const PROFILE_ABI = [
  { type: 'function', name: 'setAddr', stateMutability: 'nonpayable', inputs: [{ name: 'node', type: 'bytes32' }, { name: 'a', type: 'address' }], outputs: [] },
  { type: 'function', name: 'setAddr', stateMutability: 'nonpayable', inputs: [{ name: 'node', type: 'bytes32' }, { name: 'coinType', type: 'uint256' }, { name: 'a', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'setText', stateMutability: 'nonpayable', inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }, { name: 'value', type: 'string' }], outputs: [] },
  { type: 'function', name: 'setPaymentEndpoint', stateMutability: 'nonpayable', inputs: [{ name: 'node', type: 'bytes32' }, { name: 'endpoint', type: 'string' }], outputs: [] },
  { type: 'function', name: 'setNameForAddr', stateMutability: 'nonpayable', inputs: [{ name: 'account', type: 'address' }, { name: 'primaryTag', type: 'string' }], outputs: [] },
  { type: 'event', name: 'AddrChanged', inputs: [{ name: 'node', type: 'bytes32', indexed: true }, { name: 'a', type: 'address', indexed: false }] },
  { type: 'event', name: 'TextChanged', inputs: [{ name: 'node', type: 'bytes32', indexed: true }, { name: 'indexedKey', type: 'string', indexed: false }, { name: 'key', type: 'string', indexed: false }, { name: 'value', type: 'string', indexed: false }] },
  { type: 'event', name: 'PaymentEndpointChanged', inputs: [{ name: 'node', type: 'bytes32', indexed: true }, { name: 'endpoint', type: 'string', indexed: false }] },
  { type: 'event', name: 'NameChanged', inputs: [{ name: 'node', type: 'bytes32', indexed: true }, { name: 'name', type: 'string', indexed: false }] },
];

const PAYMENT_ABI = [
  { type: 'function', name: 'createRequest', stateMutability: 'nonpayable', inputs: [{ name: 'tag', type: 'string' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'paymentRef', type: 'string' }], outputs: [{ name: 'id', type: 'bytes32' }] },
  { type: 'function', name: 'pay', stateMutability: 'payable', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'getRequest', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ name: 'request', type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'recipientTag', type: 'string' }, { name: 'recipientAddress', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'paymentRef', type: 'string' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint64' }] }] },
  { type: 'event', name: 'PaymentRequestCreated', inputs: [{ name: 'id', type: 'bytes32', indexed: true }, { name: 'tag', type: 'string', indexed: false }, { name: 'token', type: 'address', indexed: false }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'paymentRef', type: 'string', indexed: false }] },
  { type: 'event', name: 'PaymentSettled', inputs: [{ name: 'id', type: 'bytes32', indexed: true }, { name: 'payer', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
];

const RESOLVER_ABI = [
  { type: 'function', name: 'addr', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'addr', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }, { name: 'coinType', type: 'uint256' }], outputs: [{ type: 'bytes' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'text', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'paymentEndpoint', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'reverseNode', stateMutability: 'pure', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bytes32' }] },
];

function normalizeHandle(rawHandle) {
  const raw = String(rawHandle || '').trim().replace(/^₦/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(raw) || raw.startsWith('_') || raw.endsWith('_') || raw.includes('__')) {
    throw new Error('Use 3-32 lowercase letters, numbers, or single underscores.');
  }
  return raw;
}

function displayHandle(rawHandle) {
  return `₦${normalizeHandle(rawHandle)}`;
}

function namehash(rawHandle) {
  return keccak256(stringToBytes(normalizeHandle(rawHandle)));
}

function reverseNodeForAddress(address) {
  const clean = getAddress(address);
  const namespace = '0x11df080ac2434bfc6a41d7d54fdf1d3347cecce959d86d43a9b12ef7364dc224';
  return keccak256(concat([toBytes(namespace), toBytes(clean)]));
}

function createTagService(env = process.env) {
  const chainId = Number(env.TAGPROTOCOL_CHAIN_ID || 11142220);
  const rpcUrl = env.TAGPROTOCOL_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org';
  const registryAddress = getAddress(env.NAIRATAG_REGISTRY_ADDRESS || '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0');
  const resolverAddress = getAddress(env.NAIRATAG_RESOLVER_ADDRESS || '0x293EA56588b8abac78Bab6241466ad8C30bB955A');
  const paymentRequestAddress = getAddress(env.NAIRATAG_PAYMENT_REQUEST_ADDRESS || '0xb9a0250a6C0908fA01574a5416321096279c4d53');
  const publicClient = createPublicClient({ chain: { id: chainId, name: 'Celo Sepolia', nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } }, transport: http(rpcUrl) });

  async function getResolverNode(node) {
    return publicClient.readContract({ address: resolverAddress, abi: RESOLVER_ABI, functionName: 'addr', args: [node] });
  }

  async function getNameByAddress(address) {
    const node = reverseNodeForAddress(address);
    return publicClient.readContract({ address: resolverAddress, abi: RESOLVER_ABI, functionName: 'name', args: [node] });
  }

  return {
    publicClient,
    async getBlockNumber() {
      try {
        return await publicClient.getBlockNumber();
      } catch (err) {
        return null;
      }
    },
    async getBalance(address) {
      try {
        return await publicClient.getBalance({ address: getAddress(address) });
      } catch (err) {
        return 0n;
      }
    },
    normalizeHandle,
    displayHandle,
    namehash,
    reverseNodeForAddress,
    registryAddress,
    resolverAddress,
    paymentRequestAddress,
    async preparePaymentRequest(rawHandle, amount, paymentRef, account) {
      const handle = normalizeHandle(rawHandle);
      const resolved = await this.resolveTag(handle);
      const recipient = resolved.resolvedAddress || (account ? getAddress(account) : null);
      if (!recipient) throw new Error(`${resolved.display} has no registered payment address. Connect a wallet or register your ₦Tag first.`);
      const parsedAmount = BigInt(amount);
      if (parsedAmount <= 0n) throw new Error('Payment amount must be a positive integer in wei.');
      const request = { address: paymentRequestAddress, abi: PAYMENT_ABI, functionName: 'createRequest', args: [`₦${handle}`, '0x0000000000000000000000000000000000000000', parsedAmount, String(paymentRef)] };
      const gas = account ? await publicClient.estimateContractGas({ ...request, account: getAddress(account) }).catch(() => null) : null;
      return { handle, display: `₦${handle}`, chainId, contract: paymentRequestAddress, function: 'createRequest(string,address,uint256,string)', args: [`₦${handle}`, request.args[1], parsedAmount.toString(), request.args[3]], calldata: encodeFunctionData(request), gasEstimate: gas === null ? null : gas.toString(), token: '0x0000000000000000000000000000000000000000', amount: parsedAmount.toString(), confirmationRequired: true };
    },
    async preparePayment(requestId, account) {
      const id = requestId;
      const request = await publicClient.readContract({ address: paymentRequestAddress, abi: PAYMENT_ABI, functionName: 'getRequest', args: [id] });
      if (request.token !== '0x0000000000000000000000000000000000000000') throw new Error('ERC-20 payment execution is disabled until the deployed contract transfers tokens safely.');
      const call = { address: paymentRequestAddress, abi: PAYMENT_ABI, functionName: 'pay', args: [id], value: request.amount };
      const gas = account ? await publicClient.estimateContractGas({ ...call, account: getAddress(account) }) : null;
      return { chainId, contract: paymentRequestAddress, function: 'pay(bytes32)', args: [id], calldata: encodeFunctionData(call), value: request.amount.toString(), request: { id: request.id, recipientTag: request.recipientTag, recipientAddress: getAddress(request.recipientAddress), amount: request.amount.toString(), paymentRef: request.paymentRef, status: Number(request.status) }, gasEstimate: gas === null ? null : gas.toString(), confirmationRequired: true };
    },
    async verifyPaymentReceipt(transactionHash, requestId) {
      const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
      if (receipt.status !== 'success') throw new Error('Payment transaction reverted.');
      const events = parseEventLogs({ abi: PAYMENT_ABI, eventName: 'PaymentSettled', logs: receipt.logs });
      const event = events.find(log => !requestId || log.args.id.toLowerCase() === requestId.toLowerCase());
      if (!event) throw new Error('Receipt succeeded but no matching PaymentSettled event was found.');
      return { settled: true, requestId: event.args.id, payer: getAddress(event.args.payer), amount: event.args.amount.toString(), transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber.toString() };
    },
    async verifyPaymentRequestReceipt(transactionHash, expectedHandle) {
      const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
      if (receipt.status !== 'success') throw new Error('Payment request transaction reverted.');
      const events = parseEventLogs({ abi: PAYMENT_ABI, eventName: 'PaymentRequestCreated', logs: receipt.logs });
      const event = events.find(log => !expectedHandle || normalizeHandle(log.args.tag) === normalizeHandle(expectedHandle));
      if (!event) throw new Error('Receipt succeeded but no matching PaymentRequestCreated event was found.');
      return { created: true, requestId: event.args.id, tag: event.args.tag, token: getAddress(event.args.token), amount: event.args.amount.toString(), paymentRef: event.args.paymentRef, transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber.toString() };
    },
    async verifyProfileUpdateReceipt(transactionHash, field) {
      const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
      if (receipt.status !== 'success') throw new Error('Profile update transaction reverted.');
      const eventName = { address: 'AddrChanged', description: 'TextChanged', paymentEndpoint: 'PaymentEndpointChanged', reverseName: 'NameChanged' }[field];
      if (!eventName) throw new Error('Unknown profile field.');
      const events = parseEventLogs({ abi: PROFILE_ABI, eventName, logs: receipt.logs });
      if (!events.length) throw new Error(`Receipt succeeded but no matching ${eventName} event was found.`);
      return { updated: true, field, event: eventName, transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber.toString() };
    },
    async prepareProfileUpdate(rawHandle, field, value, account) {
      const handle = normalizeHandle(rawHandle);
      const ownerResult = await this.getOwner(handle);
      if (!ownerResult.owner) throw new Error(`${ownerResult.display} is not registered.`);
      if (!account || getAddress(account) !== ownerResult.owner) throw new Error(`Wallet ${account || '(missing)'} is not the owner of ${ownerResult.display}.`);
      const node = namehash(handle);
      let functionName;
      let args;
      let address = resolverAddress;
      if (field === 'address') {
        functionName = 'setAddr';
        args = [node, getAddress(value)];
      } else if (field === 'description') {
        functionName = 'setText';
        args = [node, 'description', String(value)];
      } else if (field === 'paymentEndpoint') {
        functionName = 'setPaymentEndpoint';
        args = [node, String(value)];
      } else if (field === 'reverseName') {
        functionName = 'setNameForAddr';
        args = [getAddress(account), `₦${handle}`];
      } else {
        throw new Error('Profile field must be address, description, paymentEndpoint, or reverseName.');
      }
      const request = { address, abi: PROFILE_ABI, functionName, args };
      const gas = await publicClient.estimateContractGas({ ...request, account: getAddress(account) });
      return {
        handle,
        display: `₦${handle}`,
        chainId,
        contract: address,
        function: functionName,
        args,
        calldata: encodeFunctionData(request),
        gasEstimate: gas.toString(),
        confirmationRequired: true,
      };
    },
    async prepareChainAddress(rawHandle, network, coinType, address, account) {
      const handle = normalizeHandle(rawHandle);
      const ownerResult = await this.getOwner(handle);
      if (!ownerResult.owner) throw new Error(`${ownerResult.display} is not registered.`);
      if (!account || getAddress(account) !== ownerResult.owner) throw new Error(`Wallet ${account || '(missing)'} is not the owner of ${ownerResult.display}.`);
      if (!['celoSepolia', 'celo', 'baseSepolia', 'base'].includes(network)) throw new Error('Unsupported network.');
      const parsedCoinType = BigInt(coinType);
      if (parsedCoinType < 1n) throw new Error('coinType must be a positive verified ENSIP-9/SLIP-0044 value.');
      const node = namehash(handle);
      const encodedAddress = bytesToHex(toBytes(getAddress(address)));
      const request = { address: resolverAddress, abi: PROFILE_ABI, functionName: 'setAddr', args: [node, parsedCoinType, encodedAddress] };
      const gas = await publicClient.estimateContractGas({ ...request, account: getAddress(account) });
      const targetChainId = network === 'celo' ? 42220 : 11142220;
      return { handle, display: `₦${handle}`, network, chainId: targetChainId, resolutionChainId: chainId, contract: resolverAddress, function: 'setAddr(bytes32,uint256,bytes)', args: [node, parsedCoinType.toString(), address], calldata: encodeFunctionData(request), gasEstimate: gas.toString(), note: 'Stores a multicoin resolver record on Celo.', confirmationRequired: true };
    },
    async prepareClaim(rawHandle, account) {
      const handle = normalizeHandle(rawHandle);
      const availability = await this.checkAvailability(handle);
      if (!availability.available) throw new Error(`${availability.display} is already registered on TagProtocol.`);
      const args = [`₦${handle}`, resolverAddress];
      const request = {
        address: registryAddress,
        abi: CLAIM_ABI,
        functionName: 'claim',
        args,
      };
      const gas = account ? await publicClient.estimateContractGas({ ...request, account: getAddress(account) }).catch(() => null) : null;
      return {
        handle,
        display: `₦${handle}`,
        chainId,
        contract: registryAddress,
        function: 'claim(string,address)',
        args,
        calldata: encodeFunctionData(request),
        gasEstimate: gas === null ? null : gas.toString(),
        resolver: resolverAddress,
        confirmationRequired: true,
        claimUrl: this.claimUrl(handle),
      };
    },
    async verifyClaimReceipt(transactionHash, expectedHandle, expectedOwner) {
      const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
      if (receipt.status !== 'success') throw new Error('Claim transaction reverted.');
      const events = parseEventLogs({ abi: CLAIM_ABI, eventName: 'TagClaimed', logs: receipt.logs });
      const event = events.find(log => {
        const canonical = log.args.canonical;
        const ownerMatches = !expectedOwner || getAddress(log.args.owner) === getAddress(expectedOwner);
        return (!expectedHandle || canonical === normalizeHandle(expectedHandle)) && ownerMatches;
      });
      if (!event) throw new Error('Receipt succeeded but no matching TagClaimed event was found.');
      return {
        confirmed: true,
        handle: event.args.canonical,
        display: `₦${event.args.canonical}`,
        owner: getAddress(event.args.owner),
        resolver: getAddress(event.args.resolver),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString(),
        logIndex: event.logIndex === undefined ? 0 : Number(event.logIndex),
      };
    },
    getNetworkInfo() {
      return {
        resolution: {
          name: 'NairaTag Network',
          chainId,
          rpcUrl,
          registryAddress,
          resolverAddress,
        },
        transactionNetworks: {
          nairatag: { chainId, supported: true },
          baseSepolia: { chainId: 84532, supported: false, status: 'COMING_SOON' },
          base: { chainId: 8453, supported: false, status: 'UNAVAILABLE' },
        },
      };
    },
    watchClaims(onClaim) {
      return publicClient.watchContractEvent({
        address: registryAddress,
        abi: REGISTRY_ABI,
        eventName: 'TagClaimed',
        poll: true,
        pollingInterval: 12000,
        onLogs: logs => logs.forEach(log => onClaim({
          canonical: log.args.canonical,
          rawTag: log.args.rawTag,
          owner: log.args.owner,
          resolver: log.args.resolver,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
        })),
        onError: error => {
          if (!String(error?.message || '').includes('filter not found')) {
            console.error('[claims]', error.message);
          }
        },
      });
    },
    claimUrl(rawHandle) {
      const base = env.PUBLIC_CLAIM_URL || 'https://nairatag.ng/claim';
      return `${base}?claim=${encodeURIComponent(normalizeHandle(rawHandle))}`;
    },
    async checkAvailability(rawHandle) {
      const handle = normalizeHandle(rawHandle);
      try {
        const registered = await publicClient.readContract({ address: registryAddress, abi: REGISTRY_ABI, functionName: 'exists', args: [namehash(handle)] });
        return { handle, display: `₦${handle}`, available: !registered };
      } catch (err) {
        return { handle, display: `₦${handle}`, available: true };
      }
    },
    async resolveTag(rawHandle) {
      const handle = normalizeHandle(rawHandle);
      const resolvedAddress = await publicClient.readContract({ address: registryAddress, abi: REGISTRY_ABI, functionName: 'resolve', args: [`₦${handle}`] });
      return {
        handle,
        display: `₦${handle}`,
        resolvedAddress: resolvedAddress && resolvedAddress !== '0x0000000000000000000000000000000000000000' ? getAddress(resolvedAddress) : null,
      };
    },
    async resolveChainAddress(rawHandle, coinType) {
      const handle = normalizeHandle(rawHandle);
      const parsedCoinType = BigInt(coinType);
      if (parsedCoinType < 1n) throw new Error('coinType must be a positive verified ENSIP-9/SLIP-0044 value.');
      const node = namehash(handle);
      const encoded = await publicClient.readContract({ address: resolverAddress, abi: RESOLVER_ABI, functionName: 'addr', args: [node, parsedCoinType] });
      const bytes = hexToBytes(encoded || '0x');
      return {
        handle,
        display: `₦${handle}`,
        coinType: parsedCoinType.toString(),
        resolvedAddress: bytes.length === 20 ? getAddress(bytesToHex(bytes)) : null,
      };
    },
    async getOwner(rawHandle) {
      const handle = normalizeHandle(rawHandle);
      const owner = await publicClient.readContract({ address: registryAddress, abi: REGISTRY_ABI, functionName: 'owner', args: [namehash(handle)] });
      return { handle, display: `₦${handle}`, owner: owner && owner !== '0x0000000000000000000000000000000000000000' ? getAddress(owner) : null };
    },
    async reverseResolve(address) {
      const resolvedHandle = await getNameByAddress(address);
      if (!resolvedHandle) return { address: getAddress(address), handle: null };
      const canonical = normalizeHandle(resolvedHandle);
      const forward = await getResolverNode(namehash(canonical));
      const matches = forward && forward !== '0x0000000000000000000000000000000000000000' && getAddress(forward) === getAddress(address);
      return { address: getAddress(address), handle: matches ? `₦${canonical}` : null };
    },
    async getProfile(rawHandle) {
      const handle = normalizeHandle(rawHandle);
      const node = namehash(handle);
      const [owner, resolverHandle, addrValue, textValue, endpointValue] = await Promise.all([
        publicClient.readContract({ address: registryAddress, abi: REGISTRY_ABI, functionName: 'owner', args: [node] }),
        publicClient.readContract({ address: registryAddress, abi: REGISTRY_ABI, functionName: 'resolver', args: [node] }),
        publicClient.readContract({ address: resolverAddress, abi: RESOLVER_ABI, functionName: 'addr', args: [node] }),
        publicClient.readContract({ address: resolverAddress, abi: RESOLVER_ABI, functionName: 'text', args: [node, 'description'] }),
        publicClient.readContract({ address: resolverAddress, abi: RESOLVER_ABI, functionName: 'paymentEndpoint', args: [node] })
      ]);
      return {
        handle,
        display: `₦${handle}`,
        owner: owner && owner !== '0x0000000000000000000000000000000000000000' ? getAddress(owner) : null,
        resolver: resolverHandle && resolverHandle !== '0x0000000000000000000000000000000000000000' ? getAddress(resolverHandle) : null,
        address: addrValue && addrValue !== '0x0000000000000000000000000000000000000000' ? getAddress(addrValue) : null,
        description: textValue || null,
        paymentEndpoint: endpointValue || null,
      };
    },
  };
}

module.exports = { createTagService, normalizeHandle, displayHandle, namehash, reverseNodeForAddress };

if (require.main === module) {
  const service = createTagService(process.env);
  const [, , command, rawValue] = process.argv;
  const action = (command || 'check').toLowerCase();

  (async () => {
    try {
      if (action === 'check') {
        const result = await service.checkAvailability(rawValue || 'nairatag');
        console.log(JSON.stringify(result, null, 2));
      } else if (action === 'resolve') {
        const result = await service.resolveTag(rawValue || 'nairatag');
        console.log(JSON.stringify(result, null, 2));
      } else if (action === 'owner') {
        const result = await service.getOwner(rawValue || 'nairatag');
        console.log(JSON.stringify(result, null, 2));
      } else if (action === 'profile') {
        const result = await service.getProfile(rawValue || 'nairatag');
        console.log(JSON.stringify(result, null, 2));
      } else if (action === 'reverse') {
        const result = await service.reverseResolve(rawValue || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(JSON.stringify({ error: 'Unknown action. Use: check|resolve|owner|profile|reverse', supported: ['check','resolve','owner','profile','reverse'] }, null, 2));
      }
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
