import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCachedKv, setCachedKv } from '../src/index.js';

describe('getCachedKv and setCachedKv utility functions', () => {
  it('should return null when env or TRUST_SHIELD_KV is missing', async () => {
    const data1 = await getCachedKv(null, 'key');
    const data2 = await getCachedKv({}, 'key');
    assert.strictEqual(data1, null);
    assert.strictEqual(data2, null);
  });

  it('should get JSON value from TRUST_SHIELD_KV when available', async () => {
    const mockEnv = {
      TRUST_SHIELD_KV: {
        get: async (key, options) => {
          assert.strictEqual(key, 'test:123');
          assert.strictEqual(options.type, 'json');
          return { grade: 'A', score: 95 };
        }
      }
    };

    const data = await getCachedKv(mockEnv, 'test:123');
    assert.deepStrictEqual(data, { grade: 'A', score: 95 });
  });

  it('should put JSON stringified value into TRUST_SHIELD_KV with expirationTtl', async () => {
    let putKey = null;
    let putVal = null;
    let putOpts = null;

    const mockEnv = {
      TRUST_SHIELD_KV: {
        put: async (key, val, opts) => {
          putKey = key;
          putVal = val;
          putOpts = opts;
        }
      }
    };

    const payload = { sha256: 'abc', isMalicious: false };
    await setCachedKv(mockEnv, 'vt:abc', payload, 3600);

    assert.strictEqual(putKey, 'vt:abc');
    assert.strictEqual(putVal, JSON.stringify(payload));
    assert.deepStrictEqual(putOpts, { expirationTtl: 3600 });
  });

  it('should handle KV errors gracefully without throwing', async () => {
    const errorEnv = {
      TRUST_SHIELD_KV: {
        get: async () => { throw new Error('KV Read Error'); },
        put: async () => { throw new Error('KV Write Error'); }
      }
    };

    const getRes = await getCachedKv(errorEnv, 'fail_key');
    assert.strictEqual(getRes, null);

    await assert.doesNotReject(async () => {
      await setCachedKv(errorEnv, 'fail_key', { a: 1 });
    });
  });
});
