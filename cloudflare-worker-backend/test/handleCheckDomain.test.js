import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import worker from '../src/index.js';

describe('handleCheckDomain route handler', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return isUnsafe: false for empty or missing URL parameter', async () => {
    const req = new Request('https://termsradar.workers.dev/check-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const res = await worker.fetch(req, {}, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.isUnsafe, false);
  });

  it('should return isUnsafe: false when SAFE_BROWSING_API_KEY is not configured', async () => {
    const req = new Request('https://termsradar.workers.dev/check-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://safe-example.com' })
    });

    const res = await worker.fetch(req, {}, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.domain, 'safe-example.com');
    assert.strictEqual(data.isUnsafe, false);
  });

  it('should return isUnsafe: true when Google Safe Browsing API flags a threat match', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        matches: [
          { threatType: 'MALWARE' }
        ]
      }), { status: 200 });
    };

    const req = new Request('https://termsradar.workers.dev/check-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://malicious-phishing-site.com/login' })
    });

    const res = await worker.fetch(req, { SAFE_BROWSING_API_KEY: 'test-sb-key' }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.domain, 'malicious-phishing-site.com');
    assert.strictEqual(data.isUnsafe, true);
    assert.ok(data.threatDetail.includes('MALWARE'));
  });

  it('should return cached domain check result from KV when present', async () => {
    const mockKv = {
      get: async (key) => {
        if (key === 'sb:cached-phishing.com') {
          return { domain: 'cached-phishing.com', isUnsafe: true, threatDetail: 'Cached Threat' };
        }
        return null;
      }
    };

    const req = new Request('https://termsradar.workers.dev/check-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://cached-phishing.com' })
    });

    const res = await worker.fetch(req, { TRUST_SHIELD_KV: mockKv }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.domain, 'cached-phishing.com');
    assert.strictEqual(data.isUnsafe, true);
    assert.strictEqual(data.cached, true);
  });
});
