import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

let mockStorageData = {};
let setCallCount = 0;

// Mock chrome global before importing background.js
global.chrome = {
  downloads: { onDeterminingFilename: { addListener: () => {} } },
  runtime: { onMessage: { addListener: () => {} } },
  webNavigation: { onCommitted: { addListener: () => {} } },
  storage: {
    local: {
      get: async (keys) => {
        if (Array.isArray(keys)) {
          const res = {};
          keys.forEach(k => { res[k] = mockStorageData[k]; });
          return res;
        }
        return mockStorageData;
      },
      set: async (obj) => {
        setCallCount++;
        Object.assign(mockStorageData, obj);
      }
    }
  }
};

import { updateStats } from '../background.js';

describe('updateStats utility function', () => {
  beforeEach(() => {
    mockStorageData = {};
    setCallCount = 0;
  });

  it('should initialize default stats object and increment tcScanned when storage is empty', async () => {
    await updateStats('tcScanned');
    assert.strictEqual(setCallCount, 1);
    assert.deepStrictEqual(mockStorageData.stats, {
      tcScanned: 1,
      threatsBlocked: 0,
      downloadsVerified: 0
    });
  });

  it('should increment existing metric in stored stats', async () => {
    mockStorageData.stats = { tcScanned: 5, threatsBlocked: 2, downloadsVerified: 10 };
    await updateStats('threatsBlocked');
    assert.strictEqual(setCallCount, 1);
    assert.strictEqual(mockStorageData.stats.threatsBlocked, 3);
    assert.strictEqual(mockStorageData.stats.tcScanned, 5);
  });

  it('should increment downloadsVerified correctly', async () => {
    mockStorageData.stats = { tcScanned: 1, threatsBlocked: 0, downloadsVerified: 4 };
    await updateStats('downloadsVerified');
    assert.strictEqual(mockStorageData.stats.downloadsVerified, 5);
  });

  it('should ignore unrecognized metrics without mutating stats', async () => {
    mockStorageData.stats = { tcScanned: 2, threatsBlocked: 1, downloadsVerified: 3 };
    await updateStats('unknownMetric');
    assert.deepStrictEqual(mockStorageData.stats, { tcScanned: 2, threatsBlocked: 1, downloadsVerified: 3 });
  });

  it('should handle storage errors gracefully without throwing', async () => {
    const originalGet = global.chrome.storage.local.get;
    global.chrome.storage.local.get = async () => {
      throw new Error('Chrome storage unavailable');
    };

    await assert.doesNotReject(async () => {
      await updateStats('tcScanned');
    });

    global.chrome.storage.local.get = originalGet;
  });
});
