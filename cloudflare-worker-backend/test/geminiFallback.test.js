import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import worker from '../src/index.js';

describe('Gemini API response parsing and fallback logic in handleAnalyzeTc', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return default fallback result when GEMINI_API_KEY is not configured', async () => {
    const req = new Request('https://termsradar.workers.dev/analyze-tc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', textContent: 'Sample agreement terms' })
    });

    const res = await worker.fetch(req, {}, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.grade, 'C');
    assert.strictEqual(data.score, 70);
    assert.ok(data.summary.includes('Automated policy scan completed'));
  });

  it('should parse valid JSON returned by Gemini API', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  grade: 'A',
                  score: 95,
                  summary: 'Excellent user agreement terms.',
                  high_risk_clauses: [],
                  risk_categories: { data_privacy: 'Low' }
                })
              }
            ]
          }
        }
      ]
    };

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockGeminiResponse), { status: 200 });
    };

    const req = new Request('https://termsradar.workers.dev/analyze-tc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', textContent: 'Fair privacy terms.' })
    });

    const res = await worker.fetch(req, { GEMINI_API_KEY: 'test-api-key' }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.grade, 'A');
    assert.strictEqual(data.score, 95);
  });

  it('should trigger catch fallback (Grade C, score 65) when Gemini returns malformed response', async () => {
    // Return malformed non-JSON response inside parts[0].text
    const mockMalformedResponse = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'INVALID_NON_JSON_RESPONSE_BODY_FROM_AI' }
            ]
          }
        }
      ]
    };

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockMalformedResponse), { status: 200 });
    };

    const req = new Request('https://termsradar.workers.dev/analyze-tc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', textContent: 'Complex text' })
    });

    const res = await worker.fetch(req, { GEMINI_API_KEY: 'test-api-key' }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.grade, 'C');
    assert.strictEqual(data.score, 65);
    assert.ok(data.summary.includes('Completed scanning document terms'));
  });
});
