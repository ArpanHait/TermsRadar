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
   * Scans DOM for registration forms, checkboxes, and T&C links.
   */
  async function scanPageForTerms() {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const termsLinks = links.filter(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent || '';
      return CONFIG.TERMS_LINK_REGEX.test(href) || CONFIG.TERMS_LINK_REGEX.test(text);
    });

    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(cb => {
      const parentText = cb.parentElement ? cb.parentElement.textContent : '';
      return CONFIG.SIGNUP_INDICATORS.test(parentText) || CONFIG.TERMS_LINK_REGEX.test(parentText);
    });

    // If matching terms links found
    if (termsLinks.length > 0) {
      const primaryLink = termsLinks[0];
      const targetAnchorOrCheckbox = checkboxes.length > 0 ? checkboxes[0] : primaryLink;
      
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
