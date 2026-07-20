import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hashString } from '../src/index.js';

describe('hashString utility function', () => {
  it('should compute correct SHA-256 hash for an empty string', async () => {
    const hash = await hashString('');
    const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    assert.strictEqual(hash, expected);
  });

  it('should compute correct SHA-256 hash for "hello world"', async () => {
    const hash = await hashString('hello world');
    const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
    assert.strictEqual(hash, expected);
  });

  it('should return a 64-character lowercase hexadecimal string', async () => {
    const hash = await hashString('https://example.com/terms');
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it('should be deterministic for identical inputs', async () => {
    const text = 'https://termsradar.org/privacy-policy';
    const hash1 = await hashString(text);
    const hash2 = await hashString(text);
    assert.strictEqual(hash1, hash2);
  });

  it('should produce distinct hashes for different inputs', async () => {
    const hash1 = await hashString('terms_version_1');
    const hash2 = await hashString('terms_version_2');
    assert.notStrictEqual(hash1, hash2);
  });

  it('should properly encode multi-byte UTF-8 characters', async () => {
    const hash = await hashString('🛡️ TermsRadar Security Audit 🔒');
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it('should work correctly with a mocked crypto.subtle implementation', async () => {
    const originalDigest = globalThis.crypto.subtle.digest;
    try {
      // Mock crypto.subtle.digest to return a fixed 32-byte ArrayBuffer
      const mockBuffer = new Uint8Array([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]).buffer;

      let calledAlgo = null;
      let calledData = null;

      globalThis.crypto.subtle.digest = async (algorithm, data) => {
        calledAlgo = algorithm;
        calledData = data;
        return mockBuffer;
      };

      const result = await hashString('test input');

      assert.strictEqual(calledAlgo, 'SHA-256');
      assert.ok(calledData instanceof Uint8Array);
      assert.strictEqual(result, '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
    } finally {
      globalThis.crypto.subtle.digest = originalDigest;
    }
  });
});
