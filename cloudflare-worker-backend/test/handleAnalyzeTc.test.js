import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import worker from '../src/index.js';

describe('handleAnalyzeTc route handler', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return 400 Bad Request if both url and textContent parameters are missing', async () => {
    const req = new Request('https://termsradar.workers.dev/analyze-tc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const res = await worker.fetch(req, {}, {});
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.error, 'Missing T&C payload parameters');
  });

  it('should return cached analysis from TRUST_SHIELD_KV if available', async () => {
    const mockKv = {
      get: async (key) => {
        if (key.startsWith('tc:')) {
          return { grade: 'B', score: 85, summary: 'Cached audit summary' };
        }
        return null;
      }
    };

    const req = new Request('https://termsradar.workers.dev/analyze-tc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://cached-example.com/terms' })
    });

    const res = await worker.fetch(req, { TRUST_SHIELD_KV: mockKv }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.grade, 'B');
    assert.strictEqual(data.score, 85);
    assert.strictEqual(data.cached, true);
  });

  it('should construct secure Gemini request payload and save output to KV with 7-day TTL', async () => {
    let sentEndpoint = null;
    let sentBody = null;
    let kvPutKey = null;
    let kvPutData = null;
    let kvPutTtl = null;

    globalThis.fetch = async (url, opts) => {
      sentEndpoint = url;
      sentBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    grade: 'F',
                    score: 20,
                    summary: 'Predatory terms detected.',
                    high_risk_clauses: ['Mandatory binding arbitration', 'Unilateral agreement changes'],
                    risk_categories: { arbitration: 'Critical' }
                  })
                }
              ]
            }
          }
        ]
      }), { status: 200 });
    };

    const mockKv = {
      get: async () => null,
      put: async (key, val, opts) => {
        kvPutKey = key;
        kvPutData = JSON.parse(val);
        kvPutTtl = opts.expirationTtl;
      }
    };

    const req = new Request('https://termsradar.workers.dev/analyze-tc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://predatory-site.com/terms', textContent: 'We reserve the right to alter agreement without notice.' })
    });

    const res = await worker.fetch(req, { GEMINI_API_KEY: 'test-gemini-key', TRUST_SHIELD_KV: mockKv }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.grade, 'F');
    assert.strictEqual(data.score, 20);

    // Verify Gemini API endpoint and payload structure
    assert.ok(sentEndpoint.includes('gemini-1.5-flash'));
    assert.ok(sentEndpoint.includes('key=test-gemini-key'));
    assert.ok(sentBody.systemInstruction);
    assert.ok(sentBody.contents[0].parts[0].text.includes('<document_text>'));

    // Verify KV put parameters
    assert.ok(kvPutKey.startsWith('tc:'));
    assert.strictEqual(kvPutData.grade, 'F');
    assert.strictEqual(kvPutTtl, 604800);
  });
});
