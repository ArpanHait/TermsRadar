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

let cachedBackendUrl = null;

/**
 * Formats and normalizes worker backend URL string.
 */
function formatBackendUrl(rawUrl) {
  let url = (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') 
    ? rawUrl.trim() 
    : CONFIG.WORKER_BACKEND_URL;
  url = url.replace(/\/$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

/**
 * Resets the in-memory backend URL cache.
 */
function invalidateBackendUrlCache() {
  cachedBackendUrl = null;
}

/**
 * Utility to get configured backend URL with in-memory caching.
 */
async function getBackendUrl(forceRefresh = false) {
  if (!forceRefresh && cachedBackendUrl !== null) {
    return cachedBackendUrl;
  }
  try {
    const result = await chrome.storage.local.get(['customWorkerUrl']);
    cachedBackendUrl = formatBackendUrl(result.customWorkerUrl);
  } catch (err) {
    console.error('[TermsRadar] Failed to read storage worker URL:', err);
    cachedBackendUrl = formatBackendUrl(CONFIG.WORKER_BACKEND_URL);
  }
  return cachedBackendUrl;
}

// Invalidate in-memory URL cache when storage changes
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.customWorkerUrl) {
      invalidateBackendUrlCache();
    }
  });
}

/**
 * Safely & efficiently extracts plain text from an HTML payload without DOM dependency
 * or catastrophic regex backtracking (optimized for Service Worker execution).
 */
function extractTextFromHtml(html) {
  if (!html) return '';

  let text = html;

  // Extract body content if present to skip large header metadata
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    text = bodyMatch[1];
  }

  // Fast non-greedy replacements for script, style, and HTML comments
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');

  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text.replace(/&nbsp;/gi, ' ')
             .replace(/&amp;/gi, '&')
             .replace(/&lt;/gi, '<')
             .replace(/&gt;/gi, '>')
             .replace(/&quot;/gi, '"')
             .replace(/&#39;/g, "'");

  // Normalize whitespace and limit payload size
  return text.replace(/\s+/g, ' ').trim().slice(0, 15000);
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

// Pre-computed 256-byte hex lookup table to eliminate intermediate string allocations
const HEX_TABLE = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

/**
 * Calculates SHA-256 hash of a Blob / ArrayBuffer using Web Crypto API.
 */
async function calculateSha256(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const bytes = new Uint8Array(hashBuffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += HEX_TABLE[bytes[i]];
  }
  return hex;
}

/**
 * Sends a security barrier overlay message to a target Chrome tab.
 */
async function notifySecurityBarrier(tabId, title, message, canResume = false, downloadId = null) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'SHOW_SECURITY_BARRIER',
      title,
      message,
      canResume,
      downloadId
    });
  } catch (err) {
    // Suppress tab delivery errors if tab is closed
  }
}

/**
 * Scans a risky file download payload using Web Crypto SHA-256 and Cloudflare Worker API.
 */
async function scanRiskyDownload(downloadItem) {
  try {
    // Pause download while hashing and verifying
    chrome.downloads.pause(downloadItem.id);

    if (!downloadItem.url || (!downloadItem.url.startsWith('http://') && !downloadItem.url.startsWith('https://'))) {
      return;
    }

    const response = await fetch(downloadItem.url, { method: 'GET', headers: { Range: 'bytes=0-5242880' } });
    const arrayBuffer = await response.arrayBuffer();
    const sha256Hash = await calculateSha256(arrayBuffer);

    const backendUrl = await getBackendUrl();
    const scanRes = await fetch(`${backendUrl}/scan-download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256: sha256Hash, filename: downloadItem.filename })
    });

    const scanData = await scanRes.json();
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTabId = activeTab?.id;

    if (scanData.isMalicious) {
      chrome.downloads.cancel(downloadItem.id);
      updateStats('threatsBlocked');

      const safeFilename = formatBackendUrl(downloadItem.filename).replace(/^[a-z]+:\/\//i, '');
      const safeDetail = extractTextFromHtml(scanData.threatDetail || 'VirusTotal flagged this binary hash as dangerous malware.');
      await notifySecurityBarrier(
        activeTabId,
        'CRITICAL THREAT BLOCKED: Malicious Download Detected',
        `TermsRadar blocked <strong>${safeFilename}</strong>.<br><br><strong>Threat Detail:</strong> ${safeDetail}`,
        false
      );
    } else if (scanData.rateLimited) {
      await notifySecurityBarrier(
        activeTabId,
        'Malware Scanning Queue Busy',
        CONFIG.RATE_LIMIT_FALLBACK_TEXT,
        true,
        downloadItem.id
      );
    } else {
      chrome.downloads.resume(downloadItem.id);
      updateStats('downloadsVerified');
    }
  } catch (err) {
    console.error('[TermsRadar] Error scanning download:', err);
    chrome.downloads.resume(downloadItem.id);
  }
}

/**
 * Handles incoming file download determination events.
 */
async function handleDownloadScan(downloadItem, suggest) {
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
    await scanRiskyDownload(downloadItem);
  }

  suggest({ filename: downloadItem.filename });
}

// ============================================================================
// 1. REAL-TIME DOWNLOAD SCANNER
// ============================================================================
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  handleDownloadScan(downloadItem, suggest);
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
          let hostname = '';
          try {
            hostname = new URL(details.url).hostname;
          } catch (e) {
            hostname = details.url;
          }
          const safeHostname = extractTextFromHtml(hostname);
          const safeDetail = extractTextFromHtml(checkData.threatDetail || 'Flagged by Safe Browsing databases.');
          chrome.tabs.sendMessage(details.tabId, {
            action: 'SHOW_SECURITY_BARRIER',
            title: 'DANGEROUS WEBSITE BLOCKED: Phishing & Malicious Domain Warning',
            message: `TermsRadar detected potential fraud/phishing on <strong>${safeHostname}</strong>.<br><br><strong>Details:</strong> ${safeDetail}`,
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
            // Extract plain text using optimized helper without DOM or heavy regex backtracking
            termsText = extractTextFromHtml(htmlText);
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

// CommonJS export block for unit testing
if (typeof exports !== 'undefined') {
  exports.getBackendUrl = getBackendUrl;
  exports.extractTextFromHtml = extractTextFromHtml;
  exports.invalidateBackendUrlCache = invalidateBackendUrlCache;
  exports.calculateSha256 = calculateSha256;
  exports.handleDownloadScan = handleDownloadScan;
  exports.notifySecurityBarrier = notifySecurityBarrier;
  exports.updateStats = updateStats;
  exports.CONFIG = CONFIG;
}
