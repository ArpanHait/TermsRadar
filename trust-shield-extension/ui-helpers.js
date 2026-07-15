/**
 * TermsRadar UI Helpers Module
 * Provides isolated Shadow DOM based UI components for badges, hover risk breakdowns, and threat alert overlays.
 */

const TermsRadarUI = {
  /**
   * Returns a risk color theme based on the letter grade or score.
   */
  getGradeTheme(grade) {
    const uppercaseGrade = (grade || 'C').toUpperCase();
    switch (uppercaseGrade) {
      case 'A':
        return { color: '#10b981', bg: '#ecfdf5', border: '#059669', emoji: '🟢', label: 'Low Risk' };
      case 'B':
        return { color: '#3b82f6', bg: '#eff6ff', border: '#2563eb', emoji: '🟢', label: 'Safe' };
      case 'C':
        return { color: '#f59e0b', bg: '#fffbeb', border: '#d97706', emoji: '🟡', label: 'Medium Risk' };
      case 'D':
        return { color: '#f97316', bg: '#fff7ed', border: '#ea580c', emoji: '🟠', label: 'High Risk' };
      case 'F':
      default:
        return { color: '#ef4444', bg: '#fef2f2', border: '#dc2626', emoji: '🔴', label: 'Critical Risk' };
    }
  },

  /**
   * Injects an inline color-coded shield badge near a terms checkbox or link.
   */
  injectShieldBadge(targetElement, analysisData) {
    if (!targetElement || targetElement.getAttribute('data-termsradar-injected') === 'true') {
      return;
    }
    targetElement.setAttribute('data-termsradar-injected', 'true');

    const theme = this.getGradeTheme(analysisData.grade);

    // Host container
    const container = document.createElement('span');
    container.className = 'termsradar-badge-host';
    container.style.cssText = 'display: inline-flex; align-items: center; margin-left: 8px; vertical-align: middle; position: relative; font-family: system-ui, -apple-system, sans-serif; cursor: pointer; z-index: 999999;';

    // Shadow DOM root for complete CSS encapsulation
    const shadow = container.attachShadow({ mode: 'open' });

    const badgeStyle = `
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 8px;
        border-radius: 12px;
        background: ${theme.bg};
        border: 1px solid ${theme.border};
        color: ${theme.color};
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        user-select: none;
      }
      .badge:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .card {
        display: none;
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        width: 320px;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 14px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.3);
        font-size: 13px;
        line-height: 1.5;
        z-index: 1000000;
        text-align: left;
      }
      .card.visible {
        display: block;
        animation: fadeIn 0.2s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, 6px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid #334155;
      }
      .grade-pill {
        background: ${theme.color};
        color: #ffffff;
        font-weight: bold;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 12px;
      }
      .title {
        font-weight: 700;
        color: #f1f5f9;
        font-size: 14px;
      }
      .summary {
        color: #cbd5e1;
        margin-bottom: 10px;
        font-size: 12px;
      }
      .clause-list {
        margin: 0;
        padding-left: 18px;
        color: #fca5a5;
        font-size: 11px;
      }
      .clause-list li {
        margin-bottom: 4px;
      }
      .footer {
        margin-top: 10px;
        font-size: 10px;
        color: #64748b;
        text-align: right;
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = badgeStyle;

    const badgeEl = document.createElement('div');
    badgeEl.className = 'badge';
    badgeEl.innerHTML = `<span>${theme.emoji}</span><span>TermsRadar: Grade ${analysisData.grade || 'C'}</span>`;

    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    
    const clausesHtml = (analysisData.high_risk_clauses || [])
      .map(clause => `<li>${clause}</li>`)
      .join('');

    cardEl.innerHTML = `
      <div class="card-header">
        <span class="title">TermsRadar Audit</span>
        <span class="grade-pill">${theme.label} (${analysisData.grade || 'C'})</span>
      </div>
      <div class="summary">${analysisData.summary || 'AI analysis completed for terms agreement.'}</div>
      ${clausesHtml ? `<strong style="color:#ef4444; font-size:11px;">Flagged Clauses:</strong><ul class="clause-list">${clausesHtml}</ul>` : ''}
      <div class="footer">Verified by Cloudflare Serverless & Gemini 1.5</div>
    `;

    shadow.appendChild(styleEl);
    shadow.appendChild(badgeEl);
    shadow.appendChild(cardEl);

    // Hover toggle
    badgeEl.addEventListener('mouseenter', () => cardEl.classList.add('visible'));
    badgeEl.addEventListener('mouseleave', () => cardEl.classList.remove('visible'));

    // Insert after target element
    if (targetElement.nextSibling) {
      targetElement.parentNode.insertBefore(container, targetElement.nextSibling);
    } else {
      targetElement.parentNode.appendChild(container);
    }
  },

  /**
   * Renders a full screen security warning overlay for unsafe downloads or phishing sites.
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
    box.innerHTML = `
      <div class="icon">🛡️</div>
      <h2>${title}</h2>
      <p>${message}</p>
      <div class="actions">
        <button class="btn-primary" id="btn-close">Close Overlay</button>
        ${canResumeCallback ? '<button class="btn-secondary" id="btn-resume">Resume at Own Risk</button>' : ''}
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(box);

    shadow.querySelector('#btn-close').addEventListener('click', () => overlay.remove());
    if (canResumeCallback) {
      shadow.querySelector('#btn-resume').addEventListener('click', () => {
        overlay.remove();
        canResumeCallback();
      });
    }

    document.body.appendChild(overlay);
  }
};

// Make accessible to content scripts
if (typeof window !== 'undefined') {
  window.TermsRadarUI = TermsRadarUI;
}
