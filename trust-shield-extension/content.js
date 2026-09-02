/**
 * TermsRadar Content Script
 * Autonomously detects registration forms and Terms & Conditions / Privacy links,
 * extracts agreement text, sends to background worker for Gemini AI evaluation,
 * and dynamically renders UI badges.
 */

(function () {
  'use strict';

  // Prevent multiple executions in same frame
  if (window.hasTermsRadarLoaded) return;
  window.hasTermsRadarLoaded = true;

  const CONFIG = {
    TERMS_LINK_REGEX: /(terms|privacy|tos|condition|legal|agreement|user-agreement)/i,
    SIGNUP_INDICATORS: /(sign\s*up|register|create\s*account|join|agree)/i
  };

  /**
   * Finds the primary Terms / Privacy / Legal link on the page efficiently
   * using TreeWalker for early-exit traversal (avoids querySelectorAll allocation).
   */
  function findPrimaryTermsLink() {
    // Fast path 1: CSS attribute selector for common URL patterns (single query)
    const fastLink = document.querySelector('a[href*="terms" i], a[href*="privacy" i], a[href*="tos" i], a[href*="legal" i], a[href*="agreement" i]');
    if (fastLink) return fastLink;

    // Fast path 2: TreeWalker for iterative traversal with true early exit
    // Only visits nodes until a match is found, no full NodeList allocation
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (node.tagName !== 'A' || !node.hasAttribute('href')) {
            return NodeFilter.FILTER_SKIP;
          }
          const href = node.getAttribute('href') || '';
          const text = node.textContent || '';
          return (CONFIG.TERMS_LINK_REGEX.test(href) || CONFIG.TERMS_LINK_REGEX.test(text))
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
      }
    );

    return walker.nextNode(); // Returns first matching <a> or null
  }

  /**
   * Finds the primary registration or terms agreement checkbox with early exit
   * using TreeWalker (avoids querySelectorAll allocation, stops at first match).
   */
  function findPrimaryTermsCheckbox() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (node.tagName !== 'INPUT' || node.type !== 'checkbox') {
            return NodeFilter.FILTER_SKIP;
          }
          const parentText = node.parentElement ? node.parentElement.textContent : '';
          return (CONFIG.SIGNUP_INDICATORS.test(parentText) || CONFIG.TERMS_LINK_REGEX.test(parentText))
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
      }
    );
    return walker.nextNode(); // Returns first matching checkbox or null
  }

  /**
   * Scans DOM for registration forms, checkboxes, and T&C links.
   */
  async function scanPageForTerms() {
    const primaryLink = findPrimaryTermsLink();
    if (!primaryLink) return;

    const primaryCheckbox = findPrimaryTermsCheckbox();
    const targetAnchorOrCheckbox = primaryCheckbox || primaryLink;
    const targetUrl = primaryLink.href;

    // Request background service worker to fetch and audit terms
    chrome.runtime.sendMessage(
      {
        action: 'ANALYZE_TC',
        payload: {
          url: targetUrl,
          pageTitle: document.title
        }
      },
      response => {
        if (chrome.runtime.lastError) {
          console.warn('[TermsRadar] Communication error:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success && response.data) {
          if (window.TermsRadarUI) {
            window.TermsRadarUI.injectShieldBadge(targetAnchorOrCheckbox, response.data);
          }
        }
      }
    );
  }

  // Listen for security threat overlays dispatched from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SHOW_SECURITY_BARRIER') {
      if (window.TermsRadarUI) {
        window.TermsRadarUI.renderSecurityBarrierOverlay(
          message.title,
          message.message,
          message.canResume ? () => {
            chrome.runtime.sendMessage({ action: 'RESUME_DOWNLOAD', downloadId: message.downloadId });
          } : null
        );
      }
      sendResponse({ acknowledged: true });
    }
  });

  // Run scan when DOM is settled
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanPageForTerms);
  } else {
    scanPageForTerms();
  }
})();
