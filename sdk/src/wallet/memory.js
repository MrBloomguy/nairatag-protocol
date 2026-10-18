/**
 * @file memory.js
 * @description Persistent Agent Memory & Context Engine for NairaTag Identities.
 * Stores relationships, aliases, preferences, and entity knowledge attached to a NairaTag identity.
 */

class AgentMemory {
  constructor(options = {}) {
    this.agentTag = options.agentTag || '₦default';
    this.relationships = new Map(Object.entries(options.initialRelationships || {
      'mum': '₦mama',
      'mama': '₦mama',
      'mom': '₦mama',
      'mother': '₦mama',
      'dad': '₦papa',
      'papa': '₦papa',
      'father': '₦papa'
    }));

    this.preferences = new Map(Object.entries(options.initialPreferences || {
      'currency': 'cNGN',
      'defaultFeeRail': 'cNGN',
      'settlementNetwork': 'celo',
      'electricityProvider': 'Ikeja Electric',
      'electricityMeter': '0419283746'
    }));

    this.notes = new Map();
    this.conversationContext = {
      travelMode: false,
      activePlans: []
    };
  }

  /**
   * Set or update a relationship alias (e.g. "Mama" -> "₦MAMA")
   */
  learnRelationship(alias, tag, description = '') {
    const cleanAlias = String(alias || '').trim().toLowerCase();
    const cleanTag = String(tag || '').trim();
    const displayTag = cleanTag.startsWith('₦') ? cleanTag : `₦${cleanTag}`;
    this.relationships.set(cleanAlias, displayTag);
    if (description) {
      this.notes.set(`rel_${cleanAlias}`, description);
    }
    return {
      alias: cleanAlias,
      tag: displayTag,
      description
    };
  }

  /**
   * Resolve an alias or name to a NairaTag handle
   */
  resolveContact(nameOrAlias) {
    if (!nameOrAlias) return null;
    const clean = String(nameOrAlias).trim().toLowerCase();
    if (clean.startsWith('₦')) return clean;
    if (this.relationships.has(clean)) {
      return this.relationships.get(clean);
    }
    return null;
  }

  /**
   * Set user preference (e.g. currency: "cNGN")
   */
  setPreference(key, value) {
    const cleanKey = String(key || '').trim().toLowerCase();
    this.preferences.set(cleanKey, value);
    return { key: cleanKey, value };
  }

  /**
   * Get user preference with optional fallback
   */
  getPreference(key, fallback = null) {
    const cleanKey = String(key || '').trim().toLowerCase();
    return this.preferences.has(cleanKey) ? this.preferences.get(cleanKey) : fallback;
  }

  /**
   * Store note or context
   */
  setNote(key, note) {
    this.notes.set(String(key).toLowerCase(), note);
  }

  getNote(key) {
    return this.notes.get(String(key).toLowerCase()) || null;
  }

  /**
   * Update active context state
   */
  setContext(key, value) {
    this.conversationContext[key] = value;
  }

  getContext(key) {
    return this.conversationContext[key];
  }

  /**
   * Return structured memory dump for identity inspection
   */
  getMemorySnapshot() {
    return {
      agentTag: this.agentTag,
      relationships: Object.fromEntries(this.relationships.entries()),
      preferences: Object.fromEntries(this.preferences.entries()),
      notes: Object.fromEntries(this.notes.entries()),
      context: { ...this.conversationContext }
    };
  }
}

const defaultAgentMemory = new AgentMemory();

module.exports = {
  AgentMemory,
  defaultAgentMemory
};
