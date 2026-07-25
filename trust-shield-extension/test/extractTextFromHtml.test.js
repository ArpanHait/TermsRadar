const { describe, it } = require('node:test');
const assert = require('node:assert');

// Mock chrome global before requiring background.js
global.chrome = {
  downloads: { onDeterminingFilename: { addListener: () => {} } },
  runtime: { onMessage: { addListener: () => {} } },
  webNavigation: { onCommitted: { addListener: () => {} } },
  storage: { local: { get: async () => ({}) } }
};

const { extractTextFromHtml } = require('../background.js');

describe('extractTextFromHtml utility function', () => {
  it('should return empty string for null, undefined, or empty input', () => {
    assert.strictEqual(extractTextFromHtml(''), '');
    assert.strictEqual(extractTextFromHtml(null), '');
    assert.strictEqual(extractTextFromHtml(undefined), '');
  });

  it('should strip script tags and their contents', () => {
    const html = '<html><body><h1>Header</h1><script>console.log("secret script");</script><p>Terms body text</p></body></html>';
    const text = extractTextFromHtml(html);
    assert.strictEqual(text.includes('console.log'), false);
    assert.strictEqual(text.includes('Header'), true);
    assert.strictEqual(text.includes('Terms body text'), true);
  });

  it('should strip style tags and their contents', () => {
    const html = '<html><body><style>body { color: red; }</style><p>Agreement content</p></body></html>';
    const text = extractTextFromHtml(html);
    assert.strictEqual(text.includes('color: red'), false);
    assert.strictEqual(text.includes('Agreement content'), true);
  });

  it('should strip HTML comments', () => {
    const html = '<div><!-- Secret comment -->Public terms</div>';
    const text = extractTextFromHtml(html);
    assert.strictEqual(text.includes('Secret comment'), false);
    assert.strictEqual(text.includes('Public terms'), true);
  });

  it('should extract text inside <body> tag when present', () => {
    const html = '<html><head><title>Page Title</title></head><body><p>Body terms content</p></body></html>';
    const text = extractTextFromHtml(html);
    assert.strictEqual(text, 'Body terms content');
  });

  it('should decode common HTML entities', () => {
    const html = '<p>Terms &amp; Conditions &lt;v1.0&gt; &quot;User&#39;s Agreement&quot; &nbsp;</p>';
    const text = extractTextFromHtml(html);
    assert.strictEqual(text, 'Terms & Conditions <v1.0> "User\'s Agreement"');
  });

  it('should cap the output to 15,000 characters', () => {
    const longString = 'a'.repeat(20000);
    const html = `<body><p>${longString}</p></body>`;
    const text = extractTextFromHtml(html);
    assert.strictEqual(text.length, 15000);
  });
});
