import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCorsHeaders } from '../src/index.js';

describe('getCorsHeaders utility function', () => {
  it('should dynamically echo request Origin header when set', () => {
    const mockReq = { headers: { get: (key) => key.toLowerCase() === 'origin' ? 'chrome-extension://abcdefghijklmop' : null } };
    
    const headers = getCorsHeaders(mockReq, {});
    assert.strictEqual(headers['Access-Control-Allow-Origin'], 'chrome-extension://abcdefghijklmop');
    assert.strictEqual(headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
  });

  it('should restrict to matching allowed origin when ALLOWED_ORIGINS env is set', () => {
    const env = { ALLOWED_ORIGINS: 'chrome-extension://my-extension-id, https://trusted-domain.com' };
    const mockReq = { headers: { get: (key) => key.toLowerCase() === 'origin' ? 'https://trusted-domain.com' : null } };
    
    const headers = getCorsHeaders(mockReq, env);
    assert.strictEqual(headers['Access-Control-Allow-Origin'], 'https://trusted-domain.com');
  });

  it('should fallback to first ALLOWED_ORIGIN if incoming origin is unlisted', () => {
    const env = { ALLOWED_ORIGINS: 'chrome-extension://my-extension-id, https://trusted-domain.com' };
    const mockReq = { headers: { get: (key) => key.toLowerCase() === 'origin' ? 'https://untrusted-site.com' : null } };
    
    const headers = getCorsHeaders(mockReq, env);
    assert.strictEqual(headers['Access-Control-Allow-Origin'], 'chrome-extension://my-extension-id');
  });

  it('should handle null/empty request gracefully', () => {
    const headers = getCorsHeaders(null, {});
    assert.strictEqual(headers['Access-Control-Allow-Origin'], '*');
  });
});
