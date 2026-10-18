/**
 * Lightweight pure JavaScript Keccak-256 implementation (Ethereum standard).
 * Zero external dependencies. Works in Node.js and modern browsers.
 */

const RC = [
  0x00000001n, 0x00008082n, 0x8000808an, 0x80008000n,
  0x0000808bn, 0x00000001n, 0x80008001n, 0x80008008n,
  0x0000008an, 0x00000088n, 0x80008009n, 0x0000000an,
  0x8000808bn, 0x0000008bn, 0x80008089n, 0x80008003n,
  0x80008002n, 0x00000080n, 0x0000800an, 0x8000000an,
  0x80008081n, 0x80000000n, 0x00000001n, 0x80008008n
];

const ROTC = [
  0,  1, 62, 28, 27,
  36, 44,  6, 55, 20,
   3, 10, 43, 25, 39,
  41, 45, 15, 21,  8,
  18,  2, 61, 56, 14
];

const PILN = [
  10,  7, 11, 17, 18,
   3,  5, 16,  8, 21,
  24,  4, 15, 23, 19,
  13, 12,  2, 20, 14,
  22,  9,  6,  1
];

function rotl64(x, n) {
  const shift = BigInt(n);
  return ((x << shift) | (x >> (64n - shift))) & 0xffffffffffffffffn;
}

function keccakf(st) {
  for (let round = 0; round < 24; round++) {
    const bc = new BigUint64Array(5);
    for (let i = 0; i < 5; i++) {
      bc[i] = st[i] ^ st[i + 5] ^ st[i + 10] ^ st[i + 15] ^ st[i + 20];
    }

    for (let i = 0; i < 5; i++) {
      const t = bc[(i + 4) % 5] ^ rotl64(bc[(i + 1) % 5], 1);
      for (let j = 0; j < 25; j += 5) {
        st[j + i] ^= t;
      }
    }

    let t = st[1];
    for (let i = 0; i < 24; i++) {
      const j = PILN[i];
      const bc0 = st[j];
      st[j] = rotl64(t, ROTC[i + 1]);
      t = bc0;
    }

    for (let j = 0; j < 25; j += 5) {
      const s0 = st[j], s1 = st[j + 1], s2 = st[j + 2], s3 = st[j + 3], s4 = st[j + 4];
      st[j]     = s0 ^ (~s1 & s2);
      st[j + 1] = s1 ^ (~s2 & s3);
      st[j + 2] = s2 ^ (~s3 & s4);
      st[j + 3] = s3 ^ (~s4 & s0);
      st[j + 4] = s4 ^ (~s0 & s1);
    }

    st[0] ^= RC[round];
  }
}

/**
 * Computes Keccak-256 hash of a Uint8Array or Buffer.
 * @param {Uint8Array|Buffer} msg
 * @returns {Uint8Array} 32-byte hash
 */
function keccak256Bytes(msg) {
  const rate = 136; // 1088 bits / 8
  const st = new BigUint64Array(25);
  let pt = 0;

  for (let i = 0; i < msg.length; i++) {
    const wordIdx = Math.floor(pt / 8);
    const byteIdx = pt % 8;
    st[wordIdx] ^= BigInt(msg[i]) << BigInt(byteIdx * 8);
    pt++;
    if (pt === rate) {
      keccakf(st);
      pt = 0;
    }
  }

  // Ethereum Keccak-256 padding: 0x01 ... 0x80
  const wordIdx = Math.floor(pt / 8);
  const byteIdx = pt % 8;
  st[wordIdx] ^= 0x01n << BigInt(byteIdx * 8);

  const lastWordIdx = Math.floor((rate - 1) / 8);
  st[lastWordIdx] ^= 0x80n << 56n;

  keccakf(st);

  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    const v = st[i];
    for (let b = 0; b < 8; b++) {
      out[i * 8 + b] = Number((v >> BigInt(b * 8)) & 0xffn);
    }
  }
  return out;
}

/**
 * Computes Keccak-256 hash returning a 0x-prefixed hex string.
 * @param {string|Uint8Array|Buffer} input
 * @returns {string} 0x-prefixed 64-char hex string
 */
function keccak256(input) {
  let bytes;
  if (typeof input === 'string') {
    if (input.startsWith('0x') && input.length % 2 === 0) {
      // Hex string
      bytes = Buffer.from(input.slice(2), 'hex');
    } else {
      bytes = Buffer.from(input, 'utf8');
    }
  } else {
    bytes = input;
  }
  const hash = keccak256Bytes(bytes);
  return '0x' + Buffer.from(hash).toString('hex');
}

module.exports = {
  keccak256,
  keccak256Bytes
};
