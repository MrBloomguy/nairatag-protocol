/**
 * @file CapabilityManifest.js
 * @description Standard Machine-Readable Capability Manifest Schema for CeloTags AI Agents.
 *
 * Implements CeloTags Master Prompt Section 5.4, 5.5, and 17.3:
 * - Machine-readable capability directory so applications and Agents can discover skills by task.
 * - Input/Output validation schemas.
 * - Transparent cost and timeout declarations.
 */

export const CAPABILITY_CATEGORIES = [
  'finance',
  'research',
  'logistics',
  'dev',
  'design',
  'commerce',
  'ops'
];

export const AUTH_REQUIREMENTS = [
  'none',
  'signed_a2a',
  'bearer_token',
  'eip712_auth'
];

export class CapabilityManifest {
  /**
   * @param {Object} data
   * @param {string} data.id - Unique capability slug (e.g. "finance.p2p.cngn_send")
   * @param {string} data.name - Human-readable name
   * @param {string} data.description - Clear description of task executed
   * @param {string} data.category - One of CAPABILITY_CATEGORIES
   * @param {Object} [data.inputs] - JSON Schema for required parameters
   * @param {Object} [data.outputs] - JSON Schema for returned results
   * @param {string} [data.endpoint] - Execution URI (HTTPS, A2A, or MCP)
   * @param {string} [data.auth] - One of AUTH_REQUIREMENTS
   * @param {Array<string>} [data.requiredPermissions] - Permitted scopes required
   * @param {Object} [data.pricing] - { amount: 500, currency: "cNGN" }
   * @param {number} [data.timeoutMs=30000] - Execution timeout
   * @param {Array<string>} [data.regions] - Supported ISO country codes
   * @param {string} [data.version="1.0.0"] - Semantic version
   */
  constructor(data) {
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('CapabilityManifest requires a string "id"');
    }
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('CapabilityManifest requires a string "name"');
    }
    if (!data.category || !CAPABILITY_CATEGORIES.includes(data.category)) {
      throw new Error(`CapabilityManifest category must be one of: ${CAPABILITY_CATEGORIES.join(', ')}`);
    }

    this.id = data.id.toLowerCase().trim();
    this.name = data.name.trim();
    this.description = data.description || '';
    this.category = data.category;
    this.inputs = data.inputs || { type: 'object' };
    this.outputs = data.outputs || { type: 'object' };
    this.endpoint = data.endpoint || null;
    this.auth = data.auth || 'signed_a2a';
    this.requiredPermissions = Array.isArray(data.requiredPermissions) ? data.requiredPermissions : [];
    this.pricing = data.pricing || { amount: 0, currency: 'cNGN' };
    this.timeoutMs = Number(data.timeoutMs) || 30000;
    this.regions = Array.isArray(data.regions) ? data.regions : ['*'];
    this.version = data.version || '1.0.0';
  }

  /**
   * Matches this capability against search criteria.
   *
   * @param {Object} query - { category, region, query }
   * @returns {boolean}
   */
  matches(query = {}) {
    if (query.category && query.category !== this.category) {
      return false;
    }
    if (query.region && !this.regions.includes('*') && !this.regions.includes(query.region.toUpperCase())) {
      return false;
    }
    if (query.query) {
      const q = String(query.query).toLowerCase();
      const match = this.id.includes(q) || this.name.toLowerCase().includes(q) || this.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      inputs: this.inputs,
      outputs: this.outputs,
      endpoint: this.endpoint,
      auth: this.auth,
      requiredPermissions: this.requiredPermissions,
      pricing: this.pricing,
      timeoutMs: this.timeoutMs,
      regions: this.regions,
      version: this.version
    };
  }
}
