import type { Address, Chain, PublicClient, Hex } from 'viem';

export interface NairaTagDiscoveryConfig {
  chainId: number;
  rpcUrl: string;
  registryAddress: Address;
  resolverAddress: Address;
}

export interface NairaTagResolverConfig {
  rpcUrl?: string;
  registryAddress?: Address;
  resolverAddress?: Address;
  client?: PublicClient;
}

export interface ResolveNameOptions {
  coinType?: number;
}

export interface NairaTagViemResolver {
  client: PublicClient;
  chainId: number;
  registryAddress: Address;
  resolverAddress: Address;

  classifyInput(input: string): 'evm_address' | 'ens' | 'nairatag' | 'invalid';
  isNairaTag(name: string): boolean;
  normalize(rawTag: string): string;
  formatDisplay(rawTag: string): string;
  namehash(rawTag: string): Hex;
  reverseNode(address: Address): Hex;

  resolveName(name: string, options?: ResolveNameOptions): Promise<Address | null>;
  lookupAddress(address: Address): Promise<string | null>;
  getTextRecord(name: string, key: string): Promise<string | null>;
  getPaymentEndpoint(name: string): Promise<string | null>;
  getOwner(name: string): Promise<Address | null>;
}

export declare const nairatagDevnet: Chain;
export declare const DEFAULT_DISCOVERY: NairaTagDiscoveryConfig;

export declare function createNairaTagResolver(config?: NairaTagResolverConfig): NairaTagViemResolver;
export declare function classifyRecipientInput(input: string): 'evm_address' | 'ens' | 'nairatag' | 'invalid';
export declare function isNairaTag(name: string): boolean;
export declare function normalizeTag(rawTag: string): string;
export declare function formatDisplayTag(rawTag: string): string;
export declare function namehash(rawTag: string): Hex;
export declare function reverseNode(address: Address): Hex;
export declare function validateDiscoveryManifest(
  manifest: unknown,
  options?: { allowLocalhost?: boolean }
): boolean;
