const { describe, it } = require('node:test');
const assert = require('node:assert');

// Mock chrome global before requiring background.js
global.chrome = {
  downloads: { onDeterminingFilename: { addListener: () => {} } },
  runtime: { onMessage: { addListener: () => {} } },
  webNavigation: { onCommitted: { addListener: () => {} } },
  storage: { local: { get: async () => ({}) } }
};

const { calculateSha256 } = require('../background.js');

describe('calculateSha256 utility function', () => {
  it('should compute correct SHA-256 hash for an empty ArrayBuffer', async () => {
    const emptyBuffer = new ArrayBuffer(0);
    const hash = await calculateSha256(emptyBuffer);
    const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    assert.strictEqual(hash, expected);
  });

  it('should compute correct SHA-256 hash for "hello world" ArrayBuffer', async () => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode('hello world').buffer;
    const hash = await calculateSha256(buffer);
    const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
    assert.strictEqual(hash, expected);
  });

  it('should return a 64-character lowercase hexadecimal string', async () => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode('TermsRadar Binary Payload Test').buffer;
    const hash = await calculateSha256(buffer);
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it('should produce identical hashes for identical ArrayBuffers', async () => {
    const encoder = new TextEncoder();
    const buf1 = encoder.encode('binary_content_v1').buffer;
    const buf2 = encoder.encode('binary_content_v1').buffer;
    const hash1 = await calculateSha256(buf1);
    const hash2 = await calculateSha256(buf2);
    assert.strictEqual(hash1, hash2);
  });

  it('should produce distinct hashes for different ArrayBuffers', async () => {
    const encoder = new TextEncoder();
    const buf1 = encoder.encode('file1.exe').buffer;
    const buf2 = encoder.encode('file2.exe').buffer;
    const hash1 = await calculateSha256(buf1);
    const hash2 = await calculateSha256(buf2);
    assert.notStrictEqual(hash1, hash2);
  });

  it('should work correctly with a mocked crypto.subtle implementation', async () => {
    const originalDigest = global.crypto.subtle.digest;
    try {
      const mockBuffer = new Uint8Array([
        0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11,
        0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19,
        0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21,
        0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29
      ]).buffer;

      let calledAlgo = null;

      global.crypto.subtle.digest = async (algorithm, data) => {
        calledAlgo = algorithm;
        return mockBuffer;
      };

      const result = await calculateSha256(new ArrayBuffer(10));

      assert.strictEqual(calledAlgo, 'SHA-256');
      assert.strictEqual(result, '0a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20212223242526272829');
    } finally {
      global.crypto.subtle.digest = originalDigest;
    }
  });
});
