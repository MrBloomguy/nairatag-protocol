import type { Address, Chain, Hex, PublicClient } from 'viem';
import type {
  NairaTagDiscoveryConfig,
  NairaTagResolverConfig,
  NairaTagViemResolver,
  ResolveNameOptions,
} from '@nairatag/viem';

export interface UseNairaTagAddressOptions {
  name?: string;
  coinType?: number;
  rpcUrl?: string;
  registryAddress?: Address;
  resolverAddress?: Address;
  client?: PublicClient;
  enabled?: boolean;
}

export interface UseNairaTagAddressResult {
  data: Address | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  resolve?: () => Promise<{ data: Address | null; error: Error | null; isSuccess: boolean }>;
  isNairaTag?: boolean;
}

export interface UseNairaTagReverseOptions {
  address?: Address;
  rpcUrl?: string;
  registryAddress?: Address;
  resolverAddress?: Address;
  client?: PublicClient;
  enabled?: boolean;
}

export interface UseNairaTagReverseResult {
  data: string | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  resolve?: () => Promise<{ data: string | null; error: Error | null; isSuccess: boolean }>;
}

export interface UseNairaTagRecordOptions {
  name?: string;
  key?: string;
  rpcUrl?: string;
  registryAddress?: Address;
  resolverAddress?: Address;
  client?: PublicClient;
  enabled?: boolean;
}

export interface UseNairaTagRecordResult {
  data: string | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  resolve?: () => Promise<string | null>;
}

export declare function useNairaTagAddress(options?: UseNairaTagAddressOptions): UseNairaTagAddressResult;
export declare function useNairaTagReverse(options?: UseNairaTagReverseOptions): UseNairaTagReverseResult;
export declare function useNairaTagRecord(options?: UseNairaTagRecordOptions): UseNairaTagRecordResult;

export declare function resolveAddress(options: UseNairaTagAddressOptions): Promise<{ data: Address | null; error: Error | null; isSuccess: boolean }>;
export declare function resolveReverse(options: UseNairaTagReverseOptions): Promise<{ data: string | null; error: Error | null; isSuccess: boolean }>;

export {
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
