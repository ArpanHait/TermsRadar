<div align="center">

# 🛡️ TermsRadar Trust Shield
### Autonomous AI Legal Terms Auditor & Real-Time Security Shield for Google Chrome

[![Chrome Extension Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020.svg?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Google Gemini 1.5 Flash](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-8E75B2.style=for-the-badge?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Tests Passed](https://img.shields.io/badge/Unit%20Tests-65%20Passing-10B981.svg?style=for-the-badge)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-007ACC.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>TermsRadar</b> automatically audits lengthy Terms of Service agreements, privacy policies, and registration forms in real-time using Google Gemini 1.5 Flash AI, intercepts dangerous binary downloads via SHA-256 VirusTotal hashing, and blocks phishing domains before you browse.
</p>

</div>

---

## 🌟 Key Features

* **🤖 Autonomous AI T&C Auditing**: Instantly scans signup forms and legal links, assigning clear letter risk grades (**A**, **B**, **C**, **D**, **F**) and summarizing predatory clauses (arbitration, data selling, unilateral changes).
* **🛡️ Real-Time Download Malware Shield**: Intercepts executable downloads, computes Web Crypto SHA-256 hashes on-the-fly, and verifies file safety against 70+ antivirus engines via VirusTotal API v3.
* **🌐 Phishing & Scam Domain Interception**: Checks navigation URLs against Google Safe Browsing API v4, displaying full-screen security barriers on dangerous or fraudulent websites.
* **⚡ Serverless Edge Performance**: Powered by Cloudflare Workers and Cloudflare KV caching (`tc:<hash>`, `vt:<sha256>`, `sb:<domain>`) to deliver sub-50ms cached security audits.
* **🔒 Privacy & Anti-XSS Architecture**: Shadow DOM style encapsulation prevents webpage CSS leakage. Input sanitization and Gemini `systemInstruction` prompt isolation prevent prompt injection attacks.
* **📊 Modern Dashboard & Statistics**: Built-in dark-mode popup dashboard tracking audited documents, blocked threats, and verified safe downloads.

---

## 🏗️ System Architecture

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

## 📁 Repository Structure

```text
TermsRadar/
├── trust-shield-extension/           # Chrome Extension (Manifest V3)
│   ├── manifest.json                 # Permissions, host matchers, declarativeNetRequest
│   ├── background.js                 # Service worker, SHA-256 download interceptor, domain check
│   ├── content.js                    # Autonomous DOM registration form & T&C scanner
│   ├── ui-helpers.js                 # Encapsulated Shadow DOM alert banners & grade pills
│   ├── popup.html                    # Extension dashboard popup UI
│   ├── popup.js                      # Popup metrics renderer & backend configuration
│   ├── icons/                        # Extension icon assets (16px, 48px, 128px)
│   └── test/                         # Extension unit test suite (27 passing tests)
│       ├── calculateSha256.test.js
│       ├── extractTextFromHtml.test.js
│       ├── getBackendUrl.test.js
│       ├── handleDownloadScan.test.js
│       └── updateStats.test.js
│
└── cloudflare-worker-backend/        # Cloudflare Serverless Worker Backend
    ├── wrangler.toml                 # Worker configuration & TRUST_SHIELD_KV binding
    ├── package.json                  # Dependencies & test runner
    ├── src/
    │   └── index.js                  # ROUTE_MAP router, Gemini AI, VirusTotal & Safe Browsing
    └── test/                         # Backend unit test suite (38 passing tests)
        ├── geminiFallback.test.js
        ├── getCorsHeaders.test.js
        ├── handleAnalyzeTc.test.js
        ├── handleCheckDomain.test.js
        ├── handleScanDownload.test.js
        ├── hashString.test.js
        ├── kvHelpers.test.js
        ├── router.test.js
        └── sanitizePromptInput.test.js
```

---

## 🚀 Quick Start & Installation

### 1. Cloudflare Worker Backend Deployment

1. Navigate to `cloudflare-worker-backend/`:
   ```bash
   cd cloudflare-worker-backend
   ```

2. Install dependencies and log in to Cloudflare:
   ```bash
   npm install
   npx wrangler login
   ```

3. Create the Cloudflare KV namespace for caching:
   ```bash
   npx wrangler kv:namespace create TRUST_SHIELD_KV
   ```
   *Copy the output `id` into `wrangler.toml` under `kv_namespaces`.*

4. Store API secrets in your worker environment:
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put VIRUSTOTAL_API_KEY
   npx wrangler secret put SAFE_BROWSING_API_KEY
   ```

5. Deploy the serverless worker to live edge network:
   ```bash
   npx wrangler deploy
   ```

---

### 2. Chrome Extension Setup

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked** and select the extension folder:
   `TermsRadar/trust-shield-extension`
4. Click the **TermsRadar** icon in your browser toolbar to view the live dashboard and set your custom Worker URL if needed.

---

## 🧪 Running Unit Tests

TermsRadar includes a comprehensive suite of **65 automated unit tests** built with Node.js test runner (`node --test`).

### Run Extension Unit Tests
```bash
cd trust-shield-extension
npm test
```

### Run Cloudflare Worker Unit Tests
```bash
cd cloudflare-worker-backend
npm test
```

---

## ⚙️ Environment Variables & Config

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Worker Secret | Google Gemini 1.5 Flash API Key for legal T&C analysis. |
| `VIRUSTOTAL_API_KEY` | Worker Secret | VirusTotal API v3 key for SHA-256 malware hash verification. |
| `SAFE_BROWSING_API_KEY` | Worker Secret | Google Safe Browsing API v4 key for domain risk auditing. |
| `ALLOWED_ORIGINS` | Worker Env | Optional comma-separated list of allowed CORS origins. |
| `customWorkerUrl` | Extension Storage | Optional user override URL for backend worker gateway. |

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
