# 📖 TermsRadar — User & Operation Guide

Welcome to the **TermsRadar** User Guide! This document provides a complete step-by-step walkthrough on how to install, configure, and use the TermsRadar Chrome Extension to safeguard your privacy and security online.

## 🛡️ Introduction & Overview

**TermsRadar** is an intelligent browser security and consumer protection companion. As you browse the web, TermsRadar works silently in the background to:
- Read and summarize legal jargon (Terms of Service, Privacy Policies, EULAs) using Google Gemini AI.
- Flag dangerous clauses such as **mandatory arbitration, class action waivers, data selling, and unilateral agreement changes**.
- Inspect executable file downloads with real-time **SHA-256 Web Crypto hashing** and multi-engine antivirus verification.
- Intercept and block known **phishing and deceptive domains** before you enter your credentials.

---

## 🚀 Installation & Setup

### Method 1: Load in Google Chrome (Developer Mode)

You can install the TermsRadar extension directly in any Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Arc, Opera) in under 1 minute:

1. **Open the Extensions Page**:
   - In Google Chrome, navigate to `chrome://extensions` in your address bar.
   - Alternatively, click the **Three Dots Menu (⋮)** $\rightarrow$ **Extensions** $\rightarrow$ **Manage Extensions**.

2. **Enable Developer Mode**:
   - Look at the top-right corner of the Extensions page.
   - Toggle the **Developer mode** switch to **ON**.

3. **Load the Unpacked Extension**:
   - Click the **Load unpacked** button that appears in the top-left toolbar.
   - Select the `trust-shield-extension` folder inside this project repository:
     ```text
     TermsRadar/trust-shield-extension
     ```

4. **Pin TermsRadar to Toolbar**:
   - Click the **Puzzle Piece (Extensions)** icon in your Chrome toolbar.
   - Find **TermsRadar** and click the **Pin (📌)** icon to keep it visible.

---

### Method 2: Configuring Custom Worker Backend (Optional)

By default, TermsRadar connects to the configured serverless gateway. If you deployed your own private Cloudflare Worker backend:

1. Click the **TermsRadar icon** in your Chrome toolbar.
2. In the popup window, locate the **Cloudflare Worker URL** input box under settings.
3. Enter your custom Worker domain (e.g. `https://your-worker-name.workers.dev`).
4. Click **Save Settings**.
5. The extension will automatically test and cache the connection in memory.

---

## 🔍 Core Features & How to Use

### 1. Autonomous AI Terms of Service & Privacy Policy Auditing

When you visit any website containing registration forms, signup checkboxes, or Terms of Service / Privacy Policy links:

1. **Automatic Detection**:
   TermsRadar automatically discovers legal agreement links (`/terms`, `/privacy`, `/tos`, etc.) and registration consent checkboxes without requiring any manual clicks.

2. **Top-Center Audit Toast Card**:
   - A floating security card appears at the top-middle of the screen for **5 seconds**.
   - Displays the **Letter Grade (A–F)**, a concise **2-sentence plain-English summary**, and bulleted **Flagged Clauses** (e.g., *Mandatory Arbitration, Data Selling to Third Parties*).
   - **Hover-to-Pause**: Moving your cursor over the card pauses the timer so you can read comfortably.
   - Click the **✕** button to dismiss it immediately.

3. **Top-Middle Inline Pill Badge**:
   - A small pill badge (`🟢 TermsRadar: Grade A` or `🔴 TermsRadar: Grade F`) stays visible for **10 seconds**.
   - If you want to review the full analysis again, simply **click the pill badge** to re-open the audit card.

---

### 2. Real-Time Download Malware Scanner

When you start downloading any risky file format (`.exe`, `.msi`, `.dmg`, `.pkg`, `.zip`, `.iso`, `.bat`, etc.):

1. **Download Interception**:
   TermsRadar instantly pauses the download stream and computes its cryptographic **SHA-256 hash** using browser Web Crypto.

2. **Cloud Antivirus Scan**:
   The hash is cross-checked against 70+ antivirus engines via the VirusTotal security database.

3. **Scan Outcomes**:
   - **✅ Clean File**: The download automatically resumes and downloads normally.
   - **⛔ Malicious Binary Detected**: The download is immediately **cancelled**, and a full-screen Red Security Barrier alerts you with the exact malware threat details.
   - **⚠️ Scanning Queue Busy**: If the public scanning queue is rate-limited, an amber overlay appears allowing you to wait or click **"Resume at Own Risk"**.

---

### 3. Phishing & Malicious Website Blocking

When navigating to a new URL:
- TermsRadar checks the hostname against Google Safe Browsing intelligence.
- If a domain is flagged for **Social Engineering, Phishing, or Fraud**, a full-screen threat barrier is displayed, stopping malicious scripts before they execute.

---

### 4. Extension Popup Dashboard

Clicking the TermsRadar shield icon in your browser toolbar opens the live security dashboard:

- **📄 Legal Agreements Audited**: Total count of scanned Terms & Conditions policies.
- **🛡️ Malicious Threats Blocked**: Number of cancelled malware downloads & blocked phishing sites.
- **✅ Downloads Verified Clean**: Counter of safe files checked and verified.
- **⚙️ Worker Gateway Settings**: Field to test and update your serverless backend endpoint.

---

## 🏷️ Understanding Risk Grades & Badges

| Grade | Risk Level | Color Indicator | What It Means |
| :---: | :--- | :---: | :--- |
| **A** | **Low Risk / Excellent** | 🟢 Green | Clean, user-friendly terms. Transparent data retention, no forced arbitration, no data selling. |
| **B** | **Safe / Standard** | 🔵 Blue | Standard industry terms with reasonable data collection and standard user rights. |
| **C** | **Medium Risk** | 🟡 Yellow | Contains notable tracking, marketing sharing, or standard arbitration clauses. Review before agreeing. |
| **D** | **High Risk** | 🟠 Orange | Aggressive data harvesting, unilateral changes without notice, or strict class-action waivers. |
| **F** | **Critical Risk** | 🔴 Red | Predatory terms! Right to sell personal data, mandatory binding arbitration, or excessive liability waivers. |

---

## ❓ Frequently Asked Questions (FAQ) & Troubleshooting

### Q1: The extension is not showing an audit on a specific website. Why?
- Ensure the page contains a visible Terms of Service or Privacy Policy link (`/terms`, `/privacy`, `/tos`, etc.) or a signup form checkbox.
- If the page loaded before the extension was installed, simply refresh the browser tab (`F5` or `Ctrl + R`).

### Q2: Is my browsing history or personal data sent to any third party?
- **No.** TermsRadar only sends the public legal agreement text snippet or downloaded file SHA-256 hash to your Cloudflare Worker backend for scanning. No personal credentials, usernames, or browsing logs are ever stored or transmitted.

### Q3: How do I test malware download blocking safely?
- You can test download safety by downloading standard safe test files or benign utilities. Never execute real malware on your personal machine.

### Q4: How do I update or reload the extension after making changes?
1. Go to `chrome://extensions`.
2. Find **TermsRadar**.
3. Click the **Reload (↻)** icon on the extension card.

---

<div align="center">
  <b>TermsRadar</b> — Keeping you informed and protected across the modern web.
</div>
