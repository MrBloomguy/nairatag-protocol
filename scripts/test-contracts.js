/**
 * NairaTag Contract Unit & Normalization Test Runner (Node.js fallback / CI)
 */

const assert = require('assert');

function normalizeTag(rawTag) {
    if (!rawTag || typeof rawTag !== 'string') {
        throw new Error('Invalid tag input');
    }

    let raw = rawTag.trim();
    // Strip leading Unicode ₦
    if (raw.startsWith('₦')) {
        raw = raw.slice(1);
    } else if (raw.startsWith('N-') || raw.startsWith('n-') || raw.startsWith('N$') || raw.startsWith('n$')) {
        raw = raw.slice(2);
    }

    const canonical = raw.toLowerCase();
    if (canonical.length < 3 || canonical.length > 32) {
        throw new Error(`Invalid tag length: ${canonical.length}`);
    }

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(canonical)) {
        throw new Error(`Invalid tag characters in '${canonical}'`);
    }

    return canonical;
}

console.log('Running NairaTag Identity normalization & collision tests...');

// 1. Normalization tests
assert.strictEqual(normalizeTag('₦micheal'), 'micheal');
assert.strictEqual(normalizeTag('MICHEAL'), 'micheal');
assert.strictEqual(normalizeTag('Micheal'), 'micheal');
assert.strictEqual(normalizeTag('₦MICHEAL'), 'micheal');
assert.strictEqual(normalizeTag('micheal-123'), 'micheal-123');
console.log('  ✓ Normalization rules pass (₦micheal, Micheal, MICHEAL -> micheal)');

// 2. Collision test
const tagMap = new Map();
function claim(raw, owner) {
    const canonical = normalizeTag(raw);
    if (tagMap.has(canonical)) {
        throw new Error(`TagAlreadyClaimed: ${canonical}`);
    }
    tagMap.set(canonical, { owner, canonical });
    return canonical;
}

claim('₦micheal', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
assert.throws(() => claim('Micheal', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'), /TagAlreadyClaimed/);
assert.throws(() => claim('MICHEAL', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'), /TagAlreadyClaimed/);
console.log('  ✓ Collision prevention verified: case & symbol variations map to same identity');

// 3. Length validations
assert.throws(() => normalizeTag('ab'), /Invalid tag length/);
assert.throws(() => normalizeTag('a'.repeat(33)), /Invalid tag length/);
assert.throws(() => normalizeTag('-tag-'), /Invalid tag characters/);
console.log('  ✓ Boundary and character validations pass (min: 3, max: 32, no leading/trailing hyphens)');

console.log('All contract unit tests passed successfully!');
