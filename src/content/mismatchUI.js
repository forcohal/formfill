/**
 * FormFriend — Mismatch UI
 * Updated with 'Go Back' navigation.
 */
var FormFriendMismatchUI = (function () {
  'use strict';
  let overlayHost = null;

  function createHost() {
    hide();
    overlayHost = document.createElement('div');
    overlayHost.className = 'ff-overlay-host';
    const shadow = overlayHost.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    // Re-using styles from reviewUI
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .ff-review-card {
        background: #ffffff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        width: 480px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #1a1a2e; animation: ff-slideIn 0.25s ease-out;
      }
      @keyframes ff-slideIn { from { opacity: 0; transform: translateY(-20px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .ff-header { padding: 20px 24px 16px; border-bottom: 1px solid #eee; background: #fff3e0; }
      .ff-header h2 { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; color: #ef6c00; }
      .ff-body-scroll { flex: 1; overflow-y: auto; padding: 16px 24px; }
      .ff-mismatch-item { background: #fafafa; border-radius: 8px; border: 1px solid #eee; padding: 12px; margin-bottom: 12px; }
      .ff-mismatch-item:last-child { margin-bottom: 0; }
      .ff-mismatch-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #333; }
      .ff-mismatch-row { display: flex; margin-bottom: 4px; font-size: 13px; }
      .ff-mismatch-row span:first-child { width: 80px; color: #666; font-weight: 600; }
      .ff-mismatch-row span:last-child { flex: 1; word-break: break-word; }
      .ff-mismatch-row.actual span:last-child { color: #c62828; font-weight: 600; }
      .ff-mismatch-row.expected span:last-child { color: #2e7d32; font-weight: 600; }
      .ff-mismatch-details { margin-top: 8px; font-size: 12px; color: #ef6c00; font-style: italic; }
      .ff-actions { padding: 16px 24px; border-top: 1px solid #eee; display: flex; justify-content: flex-start; }
      .ff-btn { padding: 10px 20px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; }
      .ff-btn-secondary { background: #f0f0f0; color: #333; }
    `;
    shadow.appendChild(style);
    document.body.appendChild(overlayHost);
    return shadow;
  }

  function hide() {
    if (overlayHost && overlayHost.parentNode) overlayHost.parentNode.removeChild(overlayHost);
    overlayHost = null;
  }

  function showWithBack(mismatches) {
    return new Promise((resolve) => {
      const shadow = createHost();
      const card = document.createElement('div');
      card.className = 'ff-review-card';
      
      let html = `
        <div class="ff-header">
          <h2>⚠ Mismatches Detected</h2>
          <div style="font-size: 13px; color: #666; margin-top: 4px;">FormFriend noticed discrepancies between the form and your profile.</div>
        </div>
        <div class="ff-body-scroll">
      `;
      
      for (const m of mismatches) {
        html += `
          <div class="ff-mismatch-item">
            <div class="ff-mismatch-title">${m.profileField}</div>
            <div class="ff-mismatch-row expected"><span>Profile:</span> <span>${m.expected}</span></div>
            <div class="ff-mismatch-row actual"><span>Form:</span> <span>${m.actual}</span></div>
            <div class="ff-mismatch-details">${m.details || ''}</div>
          </div>
        `;
      }
      
      html += `
        </div>
        <div class="ff-actions">
          <button id="btn-back" class="ff-btn ff-btn-secondary">← Go Back</button>
        </div>
      `;
      card.innerHTML = html;
      shadow.appendChild(card);
      shadow.getElementById('btn-back').onclick = () => { hide(); resolve(); };
    });
  }

  // Legacy API support
  function show(mismatches) { return showWithBack(mismatches); }

  return { show, showWithBack, hide };
})();
