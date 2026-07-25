/**
 * TermsRadar UI Helpers Module
 * Fully production-ready isolated Shadow DOM user interface renderer.
 * Provides top-center auto-dismissing security alerts, inline badges, and blocking threat overlays.
 */

const TermsRadarUI = {
  /**
   * Safely escapes HTML special characters to prevent XSS attacks.
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Returns risk theme styling tokens based on the letter grade.
   */
  getGradeTheme(grade) {
    const uppercaseGrade = (grade || 'C').toUpperCase();
    switch (uppercaseGrade) {
      case 'A':
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: '#059669', emoji: '🟢', label: 'Low Risk' };
      case 'B':
        return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: '#2563eb', emoji: '🟢', label: 'Safe' };
      case 'C':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: '#d97706', emoji: '🟡', label: 'Medium Risk' };
      case 'D':
        return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: '#ea580c', emoji: '🟠', label: 'High Risk' };
      case 'F':
      default:
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: '#dc2626', emoji: '🔴', label: 'Critical Risk' };
    }
  },

  /**
   * Displays a top-center fixed, auto-dismissing floating alert banner (4.5s lifespan).
   */
  renderTopCenterToastCard(analysisData) {
    // Prevent duplicate active toast cards
    const existingToast = document.getElementById('termsradar-toast-host');
    if (existingToast) {
      existingToast.remove();
    }

    const theme = this.getGradeTheme(analysisData.grade);

    // Primary Modal Host Container with explicit fixed viewport metrics
    const host = document.createElement('div');
    host.id = 'termsradar-toast-host';
    host.style.cssText = `
      position: fixed !important;
      top: 24px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      margin: 0 !important;
      padding: 0 !important;
      width: auto !important;
      height: auto !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      pointer-events: auto !important;
    `;

    // Shadow DOM Encapsulation root
    const shadow = host.attachShadow({ mode: 'open' });

    // Clean and sanitize summary text to remove any technical dev instructions
    let cleanSummary = (analysisData.summary || 'AI security audit completed for legal agreement.')
      .replace(/\s*\([^)]*(?:GEMINI|API_KEY|Cloudflare|configure)[^)]*\)/gi, '')
      .trim();

    const safeGrade = this.escapeHtml(analysisData.grade || 'C');
    const safeLabel = this.escapeHtml(theme.label);
    const safeSummary = this.escapeHtml(cleanSummary);

    const clausesList = (analysisData.high_risk_clauses || [])
      .map(clause => `<li>${this.escapeHtml(clause)}</li>`)
      .join('');

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      :host {
        all: initial;
      }
      .card-wrapper {
        position: relative;
        width: 460px;
        max-width: 92vw;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid ${theme.border};
        border-radius: 14px;
        padding: 16px 20px;
        box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.75), 0 0 15px ${theme.bg};
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        font-size: 13px;
        line-height: 1.5;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        box-sizing: border-box;
      }
      .card-wrapper.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .card-wrapper.dismissing {
        opacity: 0;
        transform: translateY(-16px);
        transition: opacity 0.3s cubic-bezier(0.7, 0, 0.84, 0), transform 0.3s cubic-bezier(0.7, 0, 0.84, 0);
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #334155;
      }
      .title-group {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 14px;
        color: #f1f5f9;
      }
      .grade-pill {
        background: ${theme.color};
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 10px;
        border-radius: 12px;
        letter-spacing: 0.5px;
      }
      .close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 20px;
        cursor: pointer;
        line-height: 1;
        padding: 0 4px;
        margin-left: 8px;
        transition: color 0.2s;
      }
      .close-btn:hover {
        color: #ffffff;
      }
      .summary-text {
        color: #cbd5e1;
        margin-bottom: 10px;
        font-size: 12.5px;
      }
      .clause-container {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        padding: 10px 14px;
        margin-top: 8px;
      }
      .clause-header {
        color: #f87171;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .clause-ul {
        margin: 0;
        padding-left: 18px;
        color: #fca5a5;
        font-size: 11px;
      }
      .clause-ul li {
        margin-bottom: 3px;
      }
      .timer-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: ${theme.color};
        border-bottom-left-radius: 14px;
        border-bottom-right-radius: 14px;
        width: 100%;
        animation: countdown 5000ms linear forwards;
      }
      @keyframes countdown {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;

    const cardEl = document.createElement('div');
    cardEl.className = 'card-wrapper';
    cardEl.innerHTML = `
      <div class="card-header">
        <div class="title-group">
          <span>${theme.emoji}</span>
          <span>TermsRadar Audit</span>
        </div>
        <div style="display:flex; align-items:center;">
          <span class="grade-pill">${safeLabel} (${safeGrade})</span>
          <button class="close-btn" id="btn-dismiss" title="Dismiss">×</button>
        </div>
      </div>
      <div class="summary-text">${safeSummary}</div>
      ${clausesList ? `
        <div class="clause-container">
          <div class="clause-header">⚠️ Flagged Clauses</div>
          <ul class="clause-ul">${clausesList}</ul>
        </div>
      ` : ''}
      <div class="timer-bar" id="timer-bar"></div>
    `;

    shadow.appendChild(styleEl);
    shadow.appendChild(cardEl);
    document.body.appendChild(host);

    // Trigger entrance animation frame
    requestAnimationFrame(() => {
      cardEl.classList.add('visible');
    });

    // Dismissal function
    let isDismissed = false;
    const triggerDismissal = () => {
      if (isDismissed) return;
      isDismissed = true;
      cardEl.classList.remove('visible');
      cardEl.classList.add('dismissing');
      setTimeout(() => {
        if (host.parentNode) {
          host.remove();
        }
      }, 300);
    };

    // Main popup stays in Top-Middle for 5 seconds (5000ms)
    let autoDismissTimer = setTimeout(triggerDismissal, 5000);

    // Interactive close button
    shadow.querySelector('#btn-dismiss').addEventListener('click', () => {
      clearTimeout(autoDismissTimer);
      triggerDismissal();
    });

    // Pause countdown timer on cursor hover so user isn't rushed while reading
    const timerBar = cardEl.querySelector('#timer-bar');
    cardEl.addEventListener('mouseenter', () => {
      clearTimeout(autoDismissTimer);
      if (timerBar) timerBar.style.animationPlayState = 'paused';
    });

    cardEl.addEventListener('mouseleave', () => {
      autoDismissTimer = setTimeout(triggerDismissal, 2000);
      if (timerBar) timerBar.style.animationPlayState = 'running';
    });
  },

  /**
   * Injects shield badge & triggers the top-center toast card notification.
   */
  injectShieldBadge(targetElement, analysisData) {
    // Automatically render top-center floating alert notification card
    this.renderTopCenterToastCard(analysisData);

    const existingBadge = document.getElementById('termsradar-pill-host');
    if (existingBadge) {
      existingBadge.remove();
    }

    const theme = this.getGradeTheme(analysisData.grade);

    // Primary Container fixed explicitly at viewport top-center
    const container = document.createElement('div');
    container.id = 'termsradar-pill-host';
    container.style.cssText = `
      position: fixed !important;
      top: 16px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      pointer-events: auto !important;
    `;

    const shadow = container.attachShadow({ mode: 'open' });

    const badgeStyle = `
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 14px;
        border-radius: 20px;
        background: #0f172a;
        border: 1px solid ${theme.border};
        color: ${theme.color};
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.4s ease-out, transform 0.2s ease-in-out;
        box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 0 10px ${theme.bg};
        backdrop-filter: blur(10px);
        user-select: none;
        opacity: 1;
      }
      .badge.fade-out {
        opacity: 0;
        transform: translateY(-8px);
      }
      .badge:hover {
        transform: scale(1.06);
        box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.6);
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = badgeStyle;

    const safeGrade = this.escapeHtml(analysisData.grade || 'C');

    const badgeEl = document.createElement('div');
    badgeEl.className = 'badge';
    badgeEl.innerHTML = `<span>${theme.emoji}</span><span>TermsRadar: Grade ${safeGrade}</span>`;

    shadow.appendChild(styleEl);
    shadow.appendChild(badgeEl);

    badgeEl.addEventListener('click', () => {
      this.renderTopCenterToastCard(analysisData);
    });

    // Secondary pill badge auto-dismisses after 10 seconds (10000ms)
    setTimeout(() => {
      badgeEl.classList.add('fade-out');
      setTimeout(() => {
        if (container.parentNode) {
          container.remove();
        }
      }, 400);
    }, 10000);

    document.body.appendChild(container);
  },

  /**
   * Disallows script tags, iframes, event handlers, and inline scripts in message payloads.
   */
  sanitizeHtml(html) {
    if (!html) return '';
    return String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript:/gi, '');
  },

  /**
   * Renders a full screen security barrier warning overlay for unsafe downloads or phishing sites.
   */
  renderSecurityBarrierOverlay(title, message, canResumeCallback) {
    const existing = document.getElementById('termsradar-security-barrier');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'termsradar-security-barrier';
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); z-index: 2147483647; display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; padding: 20px;';

    const shadow = overlay.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .box {
        background: #1e293b;
        border: 1px solid #ef4444;
        box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.25);
        border-radius: 16px;
        padding: 32px;
        max-width: 540px;
        width: 100%;
        text-align: center;
        color: #f8fafc;
      }
      .icon {
        font-size: 56px;
        margin-bottom: 16px;
      }
      h2 {
        color: #f87171;
        font-size: 24px;
        margin: 0 0 12px 0;
      }
      p {
        color: #cbd5e1;
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 24px;
      }
      .actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      .btn-primary {
        background: #dc2626;
        color: #ffffff;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn-primary:hover {
        background: #b91c1c;
      }
      .btn-secondary {
        background: #334155;
        color: #cbd5e1;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
      }
      .btn-secondary:hover {
        background: #475569;
      }
    `;

    const box = document.createElement('div');
    box.className = 'box';

    const iconEl = document.createElement('div');
    iconEl.className = 'icon';
    iconEl.textContent = '🛡️';

    const h2El = document.createElement('h2');
    h2El.textContent = title || 'Security Warning';

    const pEl = document.createElement('p');
    pEl.innerHTML = this.sanitizeHtml(message);

    const actionsEl = document.createElement('div');
    actionsEl.className = 'actions';

    const btnClose = document.createElement('button');
    btnClose.className = 'btn-primary';
    btnClose.id = 'btn-close';
    btnClose.textContent = 'Close Overlay';
    btnClose.addEventListener('click', () => overlay.remove());
    actionsEl.appendChild(btnClose);

    if (canResumeCallback) {
      const btnResume = document.createElement('button');
      btnResume.className = 'btn-secondary';
      btnResume.id = 'btn-resume';
      btnResume.textContent = 'Resume at Own Risk';
      btnResume.addEventListener('click', () => {
        overlay.remove();
        canResumeCallback();
      });
      actionsEl.appendChild(btnResume);
    }

    box.appendChild(iconEl);
    box.appendChild(h2El);
    box.appendChild(pEl);
    box.appendChild(actionsEl);

    shadow.appendChild(style);
    shadow.appendChild(box);

    document.body.appendChild(overlay);
  }
};

// Make accessible to content scripts
if (typeof window !== 'undefined') {
  window.TermsRadarUI = TermsRadarUI;
}
