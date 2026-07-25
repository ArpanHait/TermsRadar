# Walkthrough - TermsRadar Trust Shield & Autonomous T&C Analyzer

We have built and verified the production-ready **TermsRadar** Chrome Extension (Manifest V3) and **Cloudflare Serverless Worker Backend** with Cloudflare KV caching, dynamic CORS security, Web Crypto SHA-256 binary scanning, and 65 automated unit tests.

---

## Architecture Summary

```
+-----------------------------------------------------------------------------------+
|                              CHROME EXTENSION (MV3)                               |
|                                (trust-shield-extension/)                          |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |     content.js     |   |     background.js     |   |        popup.js        |  |
|  | (DOM Scraper & UI  |   | (Downloads Intercept, |   | (Dashboard & Config    |  |
|  |  Badge/Overlay)    |   |  Navigation Warning)  |   |  Storage Settings)     |  |
|  +---------+----------+   +-----------+-----------+   +-----------+------------+  |
+------------|--------------------------|---------------------------|---------------+
             |                          |                           |
             +--------------------------+---------------------------+
                                        | (HTTPS Fetch)
                                        v
+-----------------------------------------------------------------------------------+
|                        CLOUDFLARE SERVERLESS WORKER BACKEND                        |
|                            (cloudflare-worker-backend/)                           |
|                                                                                   |
|                   +------------------------------------------+                    |
|                   |           Cloudflare KV Cache            |                    |
|                   |  (tc:<hash>, vt:<sha256>, sb:<domain>)   |                    |
|                   +--------------------+---------------------+                    |
|                                        | Miss                                     |
|           +----------------------------+----------------------------+             |
|           v                            v                            v             |
|  +------------------+        +--------------------+       +--------------------+  |
|  | Google AI Studio |        |   VirusTotal API   |       | Google Safe        |  |
|  | Gemini 1.5 Flash |        |   (File Hashing)   |       | Browsing API       |  |
|  +------------------+        +--------------------+       +--------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## Performance & Security Enhancements

1. **In-Memory Service Worker Caching**:
   - Implemented `cachedBackendUrl` in `background.js` to eliminate redundant `chrome.storage.local.get` async I/O overhead on every network request.
   - Listens to `chrome.storage.onChanged` to invalidate the cache automatically when custom backend URLs are updated in popup settings.

2. **Ultra-Fast Zero-Allocation SHA-256 Hex Formatting**:
   - Replaced `Array.from(...).map(...).join('')` with a pre-computed 256-entry `HEX_TABLE` lookup array in `background.js` and `src/index.js`.
   - Achieves **0** intermediate array allocations and **0** runtime string padding calls during file hash scanning.

3. **DOM & XSS Security Hardening**:
   - Added `escapeHtml(str)` and `sanitizeHtml(html)` helpers to `TermsRadarUI`.
   - Refactored Shadow DOM rendering (`renderSecurityBarrierOverlay`) to build elements programmatically (`document.createElement`, `textContent`, `appendChild`), stripping `<script>`, `<iframe>`, inline `on*` event handlers, and `javascript:` URIs.

4. **Prompt Injection Defense**:
   - Restructured Gemini 1.5 Flash requests to use the REST API `systemInstruction` field, establishing instruction precedence over untrusted website content.
   - Wrapped extracted agreement text inside `<document_text>` boundary tags and added `sanitizePromptInput` to neutralize closing tag injection attempts.

5. **Serverless Backend Modularization**:
   - **Dynamic CORS**: Replaced static `*` CORS headers with `getCorsHeaders(request, env)`, supporting dynamic request origin matching and `env.ALLOWED_ORIGINS` whitelisting.
   - **Cloudflare KV Helpers**: Standardized `getCachedKv(env, key)` and `setCachedKv(env, key, value, ttl)` across all API route handlers.
   - **Route Table Dispatcher**: Replaced nested `if-else` path checking with an O(1) `ROUTE_MAP` dictionary.
   - **Modular Download Scanner**: Refactored `chrome.downloads.onDeterminingFilename` into single-responsibility functions (`handleDownloadScan`, `scanRiskyDownload`, `notifySecurityBarrier`).

---

## File Structure

- **`trust-shield-extension/`**
  - [manifest.json](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/manifest.json): Manifest V3 manifest with declarativeNetRequest, permissions, host permissions, and icon declarations.
  - [background.js](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/background.js): Background service worker featuring Web Crypto SHA-256 binary scanning, web navigation domain security auditing, in-memory URL caching, and export blocks for unit testing.
  - [content.js](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/content.js): Autonomous DOM scanner detecting registration forms and T&C links via attribute fast-paths and early-exit loops.
  - [ui-helpers.js](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/ui-helpers.js): Production Shadow DOM renderer for top-center fixed alert banners (5s lifespan), inline grade pills (10s lifespan), and blocking threat screens.
  - [popup.html](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/popup.html) & [popup.js](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/popup.js): Modern dark-mode dashboard displaying live scan metrics and custom Cloudflare Worker endpoint configuration.
  - **`test/`**:
    - `calculateSha256.test.js`: 6 unit tests for Web Crypto SHA-256 hashing.
    - `extractTextFromHtml.test.js`: 7 unit tests for linear non-greedy HTML tag/comment stripping and entity decoding.
    - `getBackendUrl.test.js`: 7 unit tests for URL normalization and in-memory storage caching.
    - `handleDownloadScan.test.js`: 2 unit tests for file extension fast-passing and download scan delegation.
    - `updateStats.test.js`: 5 unit tests for chrome.storage.local metrics updates.

- **`cloudflare-worker-backend/`**
  - [wrangler.toml](file:///c:/ALL%20CODE/TermsRadar/cloudflare-worker-backend/wrangler.toml): Cloudflare Worker configuration binding `TRUST_SHIELD_KV`.
  - [src/index.js](file:///c:/ALL%20CODE/TermsRadar/cloudflare-worker-backend/src/index.js): Serverless API gateway with `ROUTE_MAP` dispatch, `getCorsHeaders`, KV caching, Gemini 1.5 Flash `systemInstruction` prompt injection defense, VirusTotal API hash lookup, and Google Safe Browsing checking.
  - **`test/`**:
    - `geminiFallback.test.js`: 3 unit tests for Gemini API response parsing and fallback logic.
    - `getCorsHeaders.test.js`: 4 unit tests for dynamic CORS origin matching and environment whitelisting.
    - `handleAnalyzeTc.test.js`: 3 unit tests for T&C analysis route handling, Gemini payload formatting, and 7-day KV TTL.
    - `handleCheckDomain.test.js`: 4 unit tests for Google Safe Browsing domain auditing and KV caching.
    - `handleScanDownload.test.js`: 6 unit tests for VirusTotal SHA-256 malware scanning, 429 rate limit handling, and KV caching.
    - `hashString.test.js`: 7 unit tests for SHA-256 hashing.
    - `kvHelpers.test.js`: 4 unit tests for Cloudflare KV read/write helpers.
    - `router.test.js`: 3 unit tests for Worker `ROUTE_MAP` fetch dispatching.
    - `sanitizePromptInput.test.js`: 4 unit tests for prompt injection input sanitization.

---

## Verification & Test Results

### 1. Chrome Extension Unit Tests (`trust-shield-extension`)
Executed `npm test` in `trust-shield-extension/`:
```bash
ℹ tests 27
ℹ suites 5
ℹ pass 27
ℹ fail 0
ℹ duration_ms ~2500ms
```

### 2. Cloudflare Worker Backend Unit Tests (`cloudflare-worker-backend`)
Executed `npm test` in `cloudflare-worker-backend/`:
```bash
ℹ tests 38
ℹ suites 9
ℹ pass 38
ℹ fail 0
ℹ duration_ms ~650ms
```

**Total Automated Test Count**: **65 Passing Unit Tests**

---

## Deployment & Verification Instructions

### 1. Deploy Cloudflare Worker Backend
Navigate to `cloudflare-worker-backend/` and run Wrangler:

```bash
cd cloudflare-worker-backend

# 1. Login to Cloudflare
npx wrangler login

# 2. Create Cloudflare KV Namespace
npx wrangler kv:namespace create TRUST_SHIELD_KV

# Copy the KV ID output into wrangler.toml under `kv_namespaces`

# 3. Store API Key Secrets in Environment
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put VIRUSTOTAL_API_KEY
npx wrangler secret put SAFE_BROWSING_API_KEY

# 4. Deploy worker to live workers.dev domain
npx wrangler deploy
```

### 2. Install TermsRadar Extension in Chrome
1. Open Google Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the directory:
   `c:\ALL CODE\TermsRadar\trust-shield-extension`
4. Click the TermsRadar icon in the Chrome toolbar to open the live dashboard and configure your custom Cloudflare Worker URL.
