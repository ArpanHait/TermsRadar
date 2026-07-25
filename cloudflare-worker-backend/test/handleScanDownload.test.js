import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import worker from '../src/index.js';

describe('handleScanDownload route handler', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return 400 Bad Request if SHA-256 hash parameter is missing', async () => {
    const req = new Request('https://termsradar.workers.dev/scan-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'test.exe' })
    });

    const res = await worker.fetch(req, {}, {});
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.error, 'Missing SHA-256 hash');
  });

  it('should return isMalicious: false when VIRUSTOTAL_API_KEY is not configured', async () => {
    const req = new Request('https://termsradar.workers.dev/scan-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', filename: 'setup.exe' })
    });

    const res = await worker.fetch(req, {}, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.isMalicious, false);
    assert.ok(data.note.includes('VIRUSTOTAL_API_KEY not set'));
  });

  it('should return isMalicious: false for a clean VirusTotal scan result', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        data: {
          attributes: {
            last_analysis_stats: { malicious: 0, suspicious: 0, harmless: 70 }
          }
        }
      }), { status: 200 });
    };

    const req = new Request('https://termsradar.workers.dev/scan-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', filename: 'clean.zip' })
    });

    const res = await worker.fetch(req, { VIRUSTOTAL_API_KEY: 'test-vt-key' }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.isMalicious, false);
    assert.strictEqual(data.threatDetail, 'Binary hash scan completed clean.');
  });

  it('should return isMalicious: true when VirusTotal flags malicious engines', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        data: {
          attributes: {
            last_analysis_stats: { malicious: 5, suspicious: 1, harmless: 60 }
          }
        }
      }), { status: 200 });
    };

    const req = new Request('https://termsradar.workers.dev/scan-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff', filename: 'malware.exe' })
    });

    const res = await worker.fetch(req, { VIRUSTOTAL_API_KEY: 'test-vt-key' }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.isMalicious, true);
    assert.ok(data.threatDetail.includes('Flagged by 5 security engine(s)'));
  });

  it('should handle VirusTotal 429 Rate Limit response', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 });
    };

    const req = new Request('https://termsradar.workers.dev/scan-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256: '99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff', filename: 'heavy.bin' })
    });

    const res = await worker.fetch(req, { VIRUSTOTAL_API_KEY: 'test-vt-key' }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.isMalicious, false);
    assert.strictEqual(data.rateLimited, true);
    assert.strictEqual(data.status, 429);
  });

  it('should return cached scan result from TRUST_SHIELD_KV when present', async () => {
    const mockKv = {
      get: async (key) => {
        if (key === 'vt:cachedhash123') {
          return { sha256: 'cachedhash123', isMalicious: true, threatDetail: 'Cached Virus Alert' };
        }
        return null;
      }
    };

    const req = new Request('https://termsradar.workers.dev/scan-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256: 'cachedhash123', filename: 'cached_file.exe' })
    });

    const res = await worker.fetch(req, { TRUST_SHIELD_KV: mockKv }, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.isMalicious, true);
    assert.strictEqual(data.cached, true);
  });
});
