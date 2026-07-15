/**
 * TermsRadar Popup Dashboard Manager
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statTc = document.getElementById('stat-tc');
  const statBlocked = document.getElementById('stat-blocked');
  const statDownloads = document.getElementById('stat-downloads');
  const workerUrlInput = document.getElementById('worker-url');
  const btnSave = document.getElementById('btn-save');
  const saveToast = document.getElementById('save-toast');

  const DEFAULT_WORKER_URL = 'https://trust-shield-backend.workers.dev';

  // Load stats and custom Worker URL settings
  try {
    const data = await chrome.storage.local.get(['stats', 'customWorkerUrl']);
    const stats = data.stats || { tcScanned: 0, threatsBlocked: 0, downloadsVerified: 0 };
    
    statTc.textContent = stats.tcScanned || 0;
    statBlocked.textContent = stats.threatsBlocked || 0;
    statDownloads.textContent = stats.downloadsVerified || 0;

    workerUrlInput.value = data.customWorkerUrl || DEFAULT_WORKER_URL;
  } catch (err) {
    console.error('[TermsRadar] Error loading popup dashboard data:', err);
  }

  // Save worker URL
  btnSave.addEventListener('click', async () => {
    const newUrl = workerUrlInput.value.trim();
    if (!newUrl) return;

    try {
      await chrome.storage.local.set({ customWorkerUrl: newUrl });
      saveToast.style.display = 'block';
      setTimeout(() => {
        saveToast.style.display = 'none';
      }, 2500);
    } catch (err) {
      console.error('[TermsRadar] Failed to save custom worker URL:', err);
    }
  });
});
