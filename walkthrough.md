# Walkthrough - TermsRadar Trust Shield & Autonomous T&C Analyzer

We have successfully generated the production-ready **TermsRadar** Chrome Extension (Manifest V3) and **Cloudflare Serverless Worker Backend** with Cloudflare KV caching.

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

## File Structure Created

- **`trust-shield-extension/`**
  - [manifest.json](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/manifest.json): Manifest V3 manifest with declarativeNetRequest, permissions, and host permissions.
  - [background.js](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/background.js): Background service worker handling real-time download SHA-256 calculation, web navigation domain security checks, and message proxying. Includes a configurable `CONFIG.WORKER_BACKEND_URL` global block.
  - [content.js](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/content.js): Autonomous DOM scanner detecting registration forms and T&C links, requesting AI audits, and attaching risk badges.
  - [ui-helpers.js](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/ui-helpers.js): Encapsulated Shadow DOM renderer for color-coded risk badges (🔴, 🟡, 🟢), hover cards, and security warning screens.
  - [popup.html](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/popup.html) & [popup.js](file:///c:/ALL%20CODE/TermsRadar/trust-shield-extension/popup.js): Modern dark-mode dashboard showing live audit stats and worker endpoint configuration.

- **`cloudflare-worker-backend/`**
  - [wrangler.toml](file:///c:/ALL%20CODE/TermsRadar/cloudflare-worker-backend/wrangler.toml): Cloudflare Worker configuration binding `TRUST_SHIELD_KV`.
  - [src/index.js](file:///c:/ALL%20CODE/TermsRadar/cloudflare-worker-backend/src/index.js): Serverless API proxy with CORS headers, KV caching, Gemini 1.5 Flash API structured JSON output, VirusTotal API 429 rate limit fallback handler, and Safe Browsing check.

---

## Verification & Deployment Instructions

### 1. Deploy the Cloudflare Worker Backend
Navigate to `cloudflare-worker-backend/` and execute Wrangler commands:

```bash
cd cloudflare-worker-backend

# 1. Login to Cloudflare
npx wrangler login

# 2. Create the Cloudflare KV Namespace
npx wrangler kv:namespace create TRUST_SHIELD_KV

# Copy the KV ID output into your wrangler.toml file under `kv_namespaces`

# 3. Store API Key Secrets in Environment
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put VIRUSTOTAL_API_KEY
npx wrangler secret put SAFE_BROWSING_API_KEY

# 4. Deploy worker to live workers.dev domain
npx wrangler deploy
```

### 2. Install TermsRadar Extension in Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the directory:
   `c:\ALL CODE\TermsRadar\trust-shield-extension`
4. Click the TermsRadar icon in the extension toolbar to view the live dashboard or configure your custom Cloudflare Worker deployment URL.
