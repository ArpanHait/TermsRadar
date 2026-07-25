const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Mock chrome global before requiring background.js
global.chrome = {
  downloads: { onDeterminingFilename: { addListener: () => {} } },
  runtime: { onMessage: { addListener: () => {} } },
  webNavigation: { onCommitted: { addListener: () => {} } },
  storage: { local: { get: async () => ({}) } }
};

const { getBackendUrl, invalidateBackendUrlCache, CONFIG } = require('../background.js');

describe('getBackendUrl utility function', () => {
  let originalChromeStorage;

  beforeEach(() => {
    originalChromeStorage = global.chrome.storage.local.get;
    if (invalidateBackendUrlCache) invalidateBackendUrlCache();
  });

  afterEach(() => {
    global.chrome.storage.local.get = originalChromeStorage;
  });

  it('should return default CONFIG.WORKER_BACKEND_URL when storage is empty', async () => {
    global.chrome.storage.local.get = async () => ({});
    const url = await getBackendUrl();
    assert.strictEqual(url, CONFIG.WORKER_BACKEND_URL.replace(/\/$/, ''));
  });

  it('should return custom worker URL from storage when configured', async () => {
    const customUrl = 'https://custom-backend.workers.dev';
    global.chrome.storage.local.get = async (keys) => {
      assert.deepStrictEqual(keys, ['customWorkerUrl']);
      return { customWorkerUrl: customUrl };
    };
    const url = await getBackendUrl();
    assert.strictEqual(url, customUrl);
  });

  it('should strip trailing slashes from custom worker URL', async () => {
    global.chrome.storage.local.get = async () => ({
      customWorkerUrl: 'https://my-worker.workers.dev/'
    });
    const url = await getBackendUrl();
    assert.strictEqual(url, 'https://my-worker.workers.dev');
  });

  it('should automatically prepend https:// if protocol is missing', async () => {
    global.chrome.storage.local.get = async () => ({
      customWorkerUrl: 'my-worker.workers.dev'
    });
    const url = await getBackendUrl();
    assert.strictEqual(url, 'https://my-worker.workers.dev');
  });

  it('should fall back to default CONFIG.WORKER_BACKEND_URL if stored value is whitespace', async () => {
    global.chrome.storage.local.get = async () => ({
      customWorkerUrl: '   '
    });
    const url = await getBackendUrl();
    assert.strictEqual(url, CONFIG.WORKER_BACKEND_URL.replace(/\/$/, ''));
  });

  it('should handle storage errors gracefully and return default URL', async () => {
    global.chrome.storage.local.get = async () => {
      throw new Error('Chrome storage read failed');
    };
    const url = await getBackendUrl();
    assert.strictEqual(url, CONFIG.WORKER_BACKEND_URL.replace(/\/$/, ''));
  });

  it('should use in-memory cache on subsequent calls without reading storage repeatedly', async () => {
    let storageReadCount = 0;
    global.chrome.storage.local.get = async () => {
      storageReadCount++;
      return { customWorkerUrl: 'https://cached-worker.workers.dev' };
    };

    const firstCall = await getBackendUrl();
    const secondCall = await getBackendUrl();
    const thirdCall = await getBackendUrl();

    assert.strictEqual(firstCall, 'https://cached-worker.workers.dev');
    assert.strictEqual(secondCall, 'https://cached-worker.workers.dev');
    assert.strictEqual(thirdCall, 'https://cached-worker.workers.dev');
    assert.strictEqual(storageReadCount, 1);
  });
});
