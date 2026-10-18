/**
 * @file index.js
 * @package @nairatag/wagmi
 * @description Thin Wagmi / React hooks layer for NairaTag Identity Protocol (NTS-100 / NTS-101).
 * Built directly on top of @nairatag/viem.
 *
 * Guaranteed Axiom:
 * Resolution RPC != Transaction RPC
 * Allows dApps running on Base, Ethereum, Arbitrum, etc. to seamlessly
 * resolve ₦ handles via read-only calls to TagProtocol.
 */

const {
  createNairaTagResolver,
  classifyRecipientInput,
  isNairaTag,
  normalizeTag,
  formatDisplayTag,
  namehash,
  reverseNode,
  DEFAULT_DISCOVERY,
  nairatagDevnet,
} = require('@nairatag/viem');

/**
 * Shared resolver cache to prevent redundant client instantiation
 */
let defaultResolver = null;

function getDefaultResolver() {
  if (!defaultResolver) {
    defaultResolver = createNairaTagResolver();
  }
  return defaultResolver;
}

/**
 * Low-level resolution runner with React-like hook lifecycle semantics.
 * Works seamlessly in both standard React hook environments and vanilla JS/TS runtimes.
 */
async function resolveAddress({
  name,
  coinType = 60,
  rpcUrl,
  registryAddress,
  resolverAddress,
  client,
}) {
  if (!name || typeof name !== 'string') {
    return { data: null, error: null, isSuccess: false };
  }

  const resolver = (rpcUrl || registryAddress || resolverAddress || client)
    ? createNairaTagResolver({ rpcUrl, registryAddress, resolverAddress, client })
    : getDefaultResolver();

  try {
    const address = await resolver.resolveName(name, { coinType });
    return { data: address, error: null, isSuccess: !!address };
  } catch (err) {
    return { data: null, error: err, isSuccess: false };
  }
}

/**
 * Reverse resolution runner with mandatory mutual anti-spoofing verification.
 */
async function resolveReverse({
  address,
  rpcUrl,
  registryAddress,
  resolverAddress,
  client,
}) {
  if (!address || typeof address !== 'string') {
    return { data: null, error: null, isSuccess: false };
  }

  const resolver = (rpcUrl || registryAddress || resolverAddress || client)
    ? createNairaTagResolver({ rpcUrl, registryAddress, resolverAddress, client })
    : getDefaultResolver();

  try {
    const verifiedHandle = await resolver.lookupAddress(address);
    return { data: verifiedHandle, error: null, isSuccess: !!verifiedHandle };
  } catch (err) {
    return { data: null, error: err, isSuccess: false };
  }
}

/**
 * React Hook: useNairaTagAddress
 * Resolves a ₦handle to an EIP-55 checksummed EVM address.
 *
 * @param {Object} options
 * @param {string} options.name - e.g. "₦micheal"
 * @param {number} [options.coinType] - EIP-2304 / SLIP-0044 coin type (default: 60)
 * @param {string} [options.rpcUrl] - Override TagProtocol RPC
 * @param {boolean} [options.enabled=true]
 */
function useNairaTagAddress({
  name,
  coinType = 60,
  rpcUrl,
  registryAddress,
  resolverAddress,
  client,
  enabled = true,
} = {}) {
  // If React is present in runtime, stateful execution occurs
  const isReact = typeof useState !== 'undefined' && typeof useEffect !== 'undefined';

  if (!isReact) {
    // Non-React fallback wrapper for SSR / node environments
    return {
      resolve: () => resolveAddress({ name, coinType, rpcUrl, registryAddress, resolverAddress, client }),
      isNairaTag: isNairaTag(name),
    };
  }

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !name || !isNairaTag(name)) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    resolveAddress({ name, coinType, rpcUrl, registryAddress, resolverAddress, client })
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setError(res.error);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setData(null);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [name, coinType, rpcUrl, registryAddress, resolverAddress, client, enabled]);

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    isSuccess: !!data,
  };
}

/**
 * React Hook: useNairaTagReverse
 * Resolves an EVM address to its verified ₦handle using the bidirectional anti-spoofing rule.
 *
 * @param {Object} options
 * @param {`0x${string}`} options.address - Address to inspect
 * @param {boolean} [options.enabled=true]
 */
function useNairaTagReverse({
  address,
  rpcUrl,
  registryAddress,
  resolverAddress,
  client,
  enabled = true,
} = {}) {
  const isReact = typeof useState !== 'undefined' && typeof useEffect !== 'undefined';

  if (!isReact) {
    return {
      resolve: () => resolveReverse({ address, rpcUrl, registryAddress, resolverAddress, client }),
    };
  }

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !address) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);

    resolveReverse({ address, rpcUrl, registryAddress, resolverAddress, client })
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setError(res.error);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setData(null);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [address, rpcUrl, registryAddress, resolverAddress, client, enabled]);

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    isSuccess: !!data,
  };
}

/**
 * React Hook: useNairaTagRecord
 * Retrieves a text record (e.g. avatar, description) for a ₦handle.
 */
function useNairaTagRecord({
  name,
  key,
  rpcUrl,
  registryAddress,
  resolverAddress,
  client,
  enabled = true,
} = {}) {
  const isReact = typeof useState !== 'undefined' && typeof useEffect !== 'undefined';

  if (!isReact) {
    return {
      resolve: async () => {
        const resolver = (rpcUrl || registryAddress || resolverAddress || client)
          ? createNairaTagResolver({ rpcUrl, registryAddress, resolverAddress, client })
          : getDefaultResolver();
        return resolver.getTextRecord(name, key);
      },
    };
  }

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !name || !key || !isNairaTag(name)) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    const resolver = (rpcUrl || registryAddress || resolverAddress || client)
      ? createNairaTagResolver({ rpcUrl, registryAddress, resolverAddress, client })
      : getDefaultResolver();

    resolver.getTextRecord(name, key)
      .then((val) => {
        if (!active) return;
        setData(val);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [name, key, rpcUrl, registryAddress, resolverAddress, client, enabled]);

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    isSuccess: !!data,
  };
}

module.exports = {
  // Hooks
  useNairaTagAddress,
  useNairaTagReverse,
  useNairaTagRecord,
  resolveAddress,
  resolveReverse,

  // Re-exports from @nairatag/viem
  createNairaTagResolver,
  classifyRecipientInput,
  isNairaTag,
  normalizeTag,
  formatDisplayTag,
  namehash,
  reverseNode,
  DEFAULT_DISCOVERY,
  nairatagDevnet,
};
