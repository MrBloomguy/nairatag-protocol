/**
 * @file index.js
 * @description Main Entrypoint for @celotags/protocol.
 *
 * Open Identity, Discovery, Coordination, and Economic Infrastructure for AI Agents Across Africa.
 */

export {
  SUPPORTED_NAMESPACES,
  GLOBAL_RESERVED_HANDLES,
  NamespaceRegistry,
  validateNamespaceDefinition,
  ASSET_VERIFICATION_STATUS,
  NAMESPACE_LIFECYCLE_STATUS,
  getNamespaceConfig
} from './namespaces/NamespaceConfig.js';

export {
  CanonicalIdentifier
} from './namespaces/CanonicalIdentifier.js';

// Identity Registry
export {
  IdentityRecord,
  IDENTITY_TYPES,
  IDENTITY_STATUSES
} from './registry/IdentityRecord.js';

export {
  CeloTagsRegistry
} from './registry/CeloTagsRegistry.js';

// Agentic Resolver & Capabilities
export {
  CapabilityManifest,
  CAPABILITY_CATEGORIES,
  AUTH_REQUIREMENTS
} from './resolver/CapabilityManifest.js';

export {
  AgentProfile,
  VERIFICATION_LEVELS,
  AGENT_CATEGORIES
} from './resolver/AgentProfile.js';

export {
  CeloTagsResolver
} from './resolver/CeloTagsResolver.js';

// Security & Permissions ("Identity is not Authority")
export {
  PermissionGrant,
  PERMITTED_ACTIONS
} from './permissions/PermissionGrant.js';

export {
  PermissionManager
} from './permissions/PermissionManager.js';

export {
  ClaimSignatureVerifier,
  CLAIM_AUTHORIZATION_TYPES,
  DEFAULT_CELOTAGS_EIP712_DOMAIN
} from './security/ClaimSignatureVerifier.js';

export {
  EndpointAttestationManager,
  ATTESTATION_STATUSES
} from './security/EndpointAttestationManager.js';

// Celo-First Execution & CIP-64 Gas Abstraction
export {
  CELO_NETWORKS,
  getCeloConfig,
  validateFeeCurrency,
  verifyFeeCurrencyLive,
  buildCip64Tx
} from './adapters/CeloAdapter.js';

// Autonomous Escrow & Settlement
export {
  CeloTagsEscrowClient,
  ESCROW_TASK_STATUSES
} from './escrow/CeloTagsEscrowClient.js';

// AI Agent Framework Adapters (ElizaOS & LangChain)
export {
  ElizaOSPlugin
} from './adapters/ElizaOSPlugin.js';

export {
  CeloTagsResolveTool,
  CeloTagsDiscoveryTool,
  CeloTagsEscrowTool
} from './adapters/LangChainTools.js';
