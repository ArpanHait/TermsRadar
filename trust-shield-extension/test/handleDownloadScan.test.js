import { describe, it } from 'node:test';
import assert from 'node:assert';

// Mock chrome global before importing background.js
global.chrome = {
  downloads: {
    onDeterminingFilename: { addListener: () => {} },
    pause: () => {},
    resume: () => {},
    cancel: () => {}
  },
  runtime: { onMessage: { addListener: () => {} } },
  webNavigation: { onCommitted: { addListener: () => {} } },
  storage: {
    local: {
      get: async () => ({}),
      set: async () => {}
    }
  },
  tabs: {
    query: async () => [{ id: 101 }],
    sendMessage: async () => ({})
  }
};

import { handleDownloadScan, CONFIG } from '../background.js';

describe('handleDownloadScan utility function', () => {
  it('should immediately suggest safe files without pausing download', async () => {
    let suggestedFilename = null;
    const downloadItem = { id: 1, filename: 'report.pdf' };
    const suggest = (opts) => { suggestedFilename = opts.filename; };

    await handleDownloadScan(downloadItem, suggest);
    assert.strictEqual(suggestedFilename, 'report.pdf');
  });

  it('should process risky file formats and trigger suggestion', async () => {
    let suggestedFilename = null;
    const downloadItem = { id: 2, filename: 'installer.exe', url: 'https://example.com/installer.exe' };
    const suggest = (opts) => { suggestedFilename = opts.filename; };

    await handleDownloadScan(downloadItem, suggest);
    assert.strictEqual(suggestedFilename, 'installer.exe');
  });
});
