/**
 * TermsRadar Service Worker Background Script (Manifest V3)
 * Handles real-time download interception, SHA-256 hashing, web navigation security audits,
 * and Cloudflare Serverless Worker API communications.
 */

// ============================================================================
// GLOBAL CONFIGURATION BLOCK
// Swap live Cloudflare Worker URL or endpoint parameters here.
// ============================================================================
const CONFIG = {
  WORKER_BACKEND_URL: 'https://termsradar.arpanhait2006.workers.dev', // Replace with your live workers.dev URL
  SAFE_FILE_EXTENSIONS: ['mp4', 'mkv', 'avi', 'mov', 'mp3', 'wav', 'png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'pdf', 'txt', 'csv', 'docx', 'xlsx'],
  RISKY_FILE_EXTENSIONS: ['exe', 'zip', 'msi', 'dmg', 'bat', 'vbs', 'ps1', 'iso', 'apk', 'crx', 'rar', '7z', 'jar', 'cmd', 'scr'],
  RATE_LIMIT_FALLBACK_TEXT: "File download securely paused. Cloud malware scanning queue is currently busy. TermsRadar is actively verifying safety—please wait a few seconds, or click to resume at your own risk."
};

/**
 * Utility to get configured backend URL from storage or fallback to default.
 */
async function getBackendUrl() {
  let url = CONFIG.WORKER_BACKEND_URL;
  try {
    const result = await chrome.storage.local.get(['customWorkerUrl']);
    if (result.customWorkerUrl && result.customWorkerUrl.trim() !== '') {
      url = result.customWorkerUrl.trim();
    }
  } catch (err) {
    console.error('[TermsRadar] Failed to read storage worker URL:', err);
  }
  url = url.replace(/\/$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

/**
 * Updates stats in chrome.storage.local for popup dashboard.
 */
async function updateStats(metric) {
  try {
    const data = await chrome.storage.local.get(['stats']);
    const stats = data.stats || { tcScanned: 0, threatsBlocked: 0, downloadsVerified: 0 };
    if (metric in stats) {
      stats[metric]++;
    }
    await chrome.storage.local.set({ stats });
  } catch (err) {
    console.error('[TermsRadar] Error updating stats:', err);
  }
}

/**
 * Calculates SHA-256 hash of a Blob / ArrayBuffer using Web Crypto API.
 */
async function calculateSha256(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// 1. REAL-TIME DOWNLOAD SCANNER
// ============================================================================
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  (async () => {
    const filename = downloadItem.filename || '';
    const ext = filename.split('.').pop().toLowerCase();

    // Fast-pass safe extensions
    if (CONFIG.SAFE_FILE_EXTENSIONS.includes(ext)) {
      suggest({ filename: downloadItem.filename });
      updateStats('downloadsVerified');
      return;
    }

    // Check if risky file format requiring SHA-256 virus hash scan
    if (CONFIG.RISKY_FILE_EXTENSIONS.includes(ext) || ext === filename.toLowerCase()) {
      try {
        // Pause download while hashing and verifying
        chrome.downloads.pause(downloadItem.id);

        // Fetch payload chunk to compute SHA-256 hash if valid HTTP/HTTPS download link
        if (!downloadItem.url || (!downloadItem.url.startsWith('http://') && !downloadItem.url.startsWith('https://'))) {
          suggest({ filename: downloadItem.filename });
          return;
        }

        const response = await fetch(downloadItem.url, { method: 'GET', headers: { Range: 'bytes=0-5242880' } }); // Read first 5MB or full payload
        const arrayBuffer = await response.arrayBuffer();
        const sha256Hash = await calculateSha256(arrayBuffer);

        const backendUrl = await getBackendUrl();
        const scanRes = await fetch(`${backendUrl}/scan-download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha256: sha256Hash, filename: downloadItem.filename })
        });

        const scanData = await scanRes.json();

        if (scanData.isMalicious) {
          // Permanently cancel malicious download
          chrome.downloads.cancel(downloadItem.id);
          updateStats('threatsBlocked');

          // Notify user via active tab
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab && activeTab.id) {
            chrome.tabs.sendMessage(activeTab.id, {
              action: 'SHOW_SECURITY_BARRIER',
              title: 'CRITICAL THREAT BLOCKED: Malicious Download Detected',
              message: `TermsRadar blocked <strong>${downloadItem.filename}</strong>.<br><br><strong>Threat Detail:</strong> ${scanData.threatDetail || 'VirusTotal flagged this binary hash as dangerous malware.'}`,
              canResume: false
            }).catch(() => {});
          }
        } else if (scanData.rateLimited) {
          // Handle VirusTotal API 429 Rate Limit
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab && activeTab.id) {
            chrome.tabs.sendMessage(activeTab.id, {
              action: 'SHOW_SECURITY_BARRIER',
              title: 'Malware Scanning Queue Busy',
              message: CONFIG.RATE_LIMIT_FALLBACK_TEXT,
              canResume: true,
              downloadId: downloadItem.id
            }).catch(() => {});
          }
        } else {
          // Download verified clean
          chrome.downloads.resume(downloadItem.id);
          updateStats('downloadsVerified');
        }
      } catch (err) {
        console.error('[TermsRadar] Error scanning download:', err);
        // Fallback: resume download on unexpected scanning error to avoid permanently hanging safe downloads
        chrome.downloads.resume(downloadItem.id);
      }
    }

    suggest({ filename: downloadItem.filename });
  })();

  return true; // Keep asynchronous channel open for suggest()
});

// Resuming download from rate limit warning overlay
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'RESUME_DOWNLOAD' && message.downloadId) {
    chrome.downloads.resume(message.downloadId);
    sendResponse({ success: true });
  }
});

// ============================================================================
// 2. PHISHING & WEBSITE VERIFICATION (NAVIGATION INTERCEPTION)
// ============================================================================
if (typeof chrome !== 'undefined' && chrome.webNavigation?.onCommitted) {
  chrome.webNavigation.onCommitted.addListener(details => {
    // Filter out sub-frames, non-http(s) pages, and chrome internal URLs
    if (details.frameId !== 0 || !details.url || (!details.url.startsWith('http://') && !details.url.startsWith('https://'))) {
      return;
    }

    (async () => {
      try {
        const backendUrl = await getBackendUrl();
        const checkRes = await fetch(`${backendUrl}/check-domain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: details.url })
        });

        const checkData = await checkRes.json();
        if (checkData && checkData.isUnsafe) {
          updateStats('threatsBlocked');
          chrome.tabs.sendMessage(details.tabId, {
            action: 'SHOW_SECURITY_BARRIER',
            title: 'DANGEROUS WEBSITE BLOCKED: Phishing & Malicious Domain Warning',
            message: `TermsRadar detected potential fraud/phishing on <strong>${new URL(details.url).hostname}</strong>.<br><br><strong>Details:</strong> ${checkData.threatDetail || 'Flagged by Safe Browsing databases.'}`,
            canResume: false
          }).catch(() => {});
        }
      } catch (err) {
        console.error('[TermsRadar] Domain check error:', err);
      }
    })();
  });
}

// ============================================================================
// 3. T&C ANALYSIS DISPATCHER
// ============================================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ANALYZE_TC') {
    (async () => {
      try {
        const { url } = message.payload;
        let termsText = '';

        // Asynchronously fetch terms page content if valid absolute HTTP/HTTPS URL
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          try {
            const fetchRes = await fetch(url, { method: 'GET' });
            const htmlText = await fetchRes.text();
            // Basic text extraction stripping HTML tags
            termsText = htmlText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .slice(0, 15000); // 15k character payload limit for optimum prompt processing
          } catch (fetchErr) {
            console.warn('[TermsRadar] Could not fetch terms body directly, sending URL snippet:', fetchErr);
          }
        }

        const backendUrl = await getBackendUrl();
        const auditRes = await fetch(`${backendUrl}/analyze-tc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, textContent: termsText })
        });

        const auditData = await auditRes.json();
        updateStats('tcScanned');
        sendResponse({ success: true, data: auditData });
      } catch (err) {
        console.error('[TermsRadar] Error analyzing T&C:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // Asynchronous response channel
  }
});
