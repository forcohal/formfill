/**
 * FormFriend — Review-Before-Fill UI and Unified Prompts
 */
var FormFriendReviewUI = (function () {
  'use strict';
  let overlayHost = null;

  const SHADOW_CSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .ff-review-card {
      background: #ffffff; border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      width: 480px; max-height: 85vh;
      display: flex; flex-direction: column; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a2e; animation: ff-slideIn 0.25s ease-out;
    }
    @keyframes ff-slideIn { from { opacity: 0; transform: translateY(-20px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .ff-header { padding: 20px 24px 16px; border-bottom: 1px solid #eee; }
    .ff-header h2 { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .ff-header .ff-subtitle { font-size: 13px; color: #666; margin-top: 4px; line-height: 1.4; }
    .ff-body-scroll { flex: 1; overflow-y: auto; padding: 12px 24px; }
    .ff-section-title { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    .ff-section-title:first-child { margin-top: 0; }
    .ff-field-item { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; }
    .ff-field-icon { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; margin-top: 2px; }
    .ff-field-icon.ok { background: #e8f5e9; color: #2e7d32; }
    .ff-field-icon.warn { background: #fff3e0; color: #ef6c00; }
    .ff-field-body { flex: 1; min-width: 0; }
    .ff-field-label { font-size: 12px; font-weight: 600; color: #555; }
    .ff-field-value { font-size: 14px; color: #1a1a2e; margin-top: 2px; word-break: break-word; }
    .ff-field-value.needs-review { color: #ef6c00; font-style: italic; font-size: 13px; }
    .ff-actions { padding: 16px 24px; border-top: 1px solid #eee; display: flex; gap: 12px; justify-content: flex-end; }
    .ff-btn { padding: 10px 20px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
    .ff-btn:hover { transform: translateY(-1px); }
    .ff-btn-primary { background: #4361ee; color: white; }
    .ff-btn-secondary { background: #f0f0f0; color: #333; }
    .ff-btn-danger { background: #c62828; color: white; }
    .ff-btn-warning { background: #ef6c00; color: white; }
    .ff-input-group { margin-bottom: 16px; }
    .ff-input-label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #555; }
    .ff-input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
    .ff-btn-block { width: 100%; margin-bottom: 8px; justify-content: center; display: flex; }
  `;

  function createHost() {
    hide();
    overlayHost = document.createElement('div');
    overlayHost.className = 'ff-overlay-host';
    const shadow = overlayHost.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = SHADOW_CSS;
    shadow.appendChild(style);
    document.body.appendChild(overlayHost);
    return shadow;
  }

  function hide() {
    if (overlayHost && overlayHost.parentNode) overlayHost.parentNode.removeChild(overlayHost);
    overlayHost = null;
  }

  function formatPersonLabel(person) {
    if (person === 'self') return 'Your Information';
    if (person === 'coApplicant') return 'Co-Applicant Information';
    if (person === 'parentGuardian') return 'Parent/Guardian Information';
    if (person === 'father') return "Father's Information";
    if (person === 'mother') return "Mother's Information";
    if (person === 'spouse') return "Spouse's Information";
    if (person === 'nominee') return "Nominee Information";
    if (person === 'relative') return "Relative Information";
    if (person === 'emergencyContact') return 'Emergency Contact';
    if (person === 'employer') return 'Employer Information';
    return 'Unknown Context';
  }

  function showUnknownPersonPrompt(fieldLabel, contextText) {
    return new Promise((resolve) => {
      const shadow = createHost();
      const card = document.createElement('div');
      card.className = 'ff-review-card';
      card.innerHTML = `
        <div class="ff-header">
          <h2><span class="ff-logo">⚠️</span> Unsure Information</h2>
          <div class="ff-subtitle">FormFriend is unsure who this information belongs to based on the form context.</div>
        </div>
        <div class="ff-body-scroll">
          <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px;">
            <b>Field:</b> ${fieldLabel}
          </div>
          <p style="font-size: 13px; color: #555;">Who does this belong to?</p>
        </div>
        <div class="ff-actions" style="flex-direction: column; gap: 8px;">
          <button id="btn-self" class="ff-btn ff-btn-primary ff-btn-block">My Information</button>
          <button id="btn-father" class="ff-btn ff-btn-secondary ff-btn-block">Father</button>
          <button id="btn-mother" class="ff-btn ff-btn-secondary ff-btn-block">Mother</button>
          <button id="btn-spouse" class="ff-btn ff-btn-secondary ff-btn-block">Spouse</button>
          <button id="btn-skip" class="ff-btn ff-btn-danger ff-btn-block">Skip</button>
        </div>
      `;
      shadow.appendChild(card);
      shadow.getElementById('btn-self').onclick = () => { hide(); resolve('self'); };
      shadow.getElementById('btn-father').onclick = () => { hide(); resolve('father'); };
      shadow.getElementById('btn-mother').onclick = () => { hide(); resolve('mother'); };
      shadow.getElementById('btn-spouse').onclick = () => { hide(); resolve('spouse'); };
      shadow.getElementById('btn-skip').onclick = () => { hide(); resolve('skip'); };
    });
  }

  function showMissingInfoScreen(missingFields) {
    return new Promise((resolve) => {
      const shadow = createHost();
      const card = document.createElement('div');
      card.className = 'ff-review-card';
      
      const groups = {};
      missingFields.forEach(f => {
        if (!groups[f.person]) groups[f.person] = [];
        if (!groups[f.person].find(x => x.profileField === f.profileField)) {
          groups[f.person].push(f);
        }
      });

      let bodyHtml = '';
      for (const [person, fields] of Object.entries(groups)) {
        bodyHtml += `<div class="ff-section-title">${formatPersonLabel(person)}</div>`;
        for (const f of fields) {
            
          if (f.resolutionReason === 'date_format_unknown') {
            bodyHtml += `
              <div class="ff-input-group">
                <label class="ff-input-label">${f.label || f.profileField}</label>
                <div style="font-size: 11px; color: #ef6c00; margin-bottom: 4px;">Date format unclear. Profile: <strong>${f.originalValue}</strong>. Choose format:</div>
                <select class="ff-input ff-missing-input" data-field-id="${f.fieldId}">
                  <option value="">Select format...</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                </select>
              </div>
            `;
          } else if ((f.controlType === 'select' || f.controlType === 'radio') && f.options && f.options.length > 0) {
            let opts = '<option value="">Select...</option>';
            for (const o of f.options) opts += `<option value="${o.value}">${o.text || o.value}</option>`;
            bodyHtml += `
              <div class="ff-input-group">
                <label class="ff-input-label">${f.label || f.profileField}</label>
                ${f.resolutionReason === 'options_mismatch' ? `<div style="font-size: 11px; color: #ef6c00; margin-bottom: 4px;">Profile contains "<strong>${f.originalValue}</strong>", but it's not in the website's list. Please choose:</div>` : ''}
                <select class="ff-input ff-missing-input" data-field-id="${f.fieldId}">
                  ${opts}
                </select>
              </div>
            `;
          } else {
            bodyHtml += `
              <div class="ff-input-group">
                <label class="ff-input-label">${f.label || f.profileField}</label>
                <input type="text" class="ff-input ff-missing-input" data-field-id="${f.fieldId}" placeholder="Enter ${f.profileField}...">
              </div>
            `;
          }
        }
      }

      card.innerHTML = `
        <div class="ff-header">
          <h2><span class="ff-logo">🤝</span> FormFriend</h2>
          <div class="ff-subtitle">Additional Information Required</div>
        </div>
        <div class="ff-body-scroll">${bodyHtml}</div>
        <div class="ff-actions" style="flex-direction: column; gap: 12px;">
          <div style="display: flex; gap: 8px; align-items: center; font-size: 13px; padding: 0 4px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
            <input type="checkbox" id="cb-save-profile" checked style="width:16px;height:16px;">
            <label for="cb-save-profile" style="color: #333; font-weight: 500; cursor: pointer;">Save this information to your profile for future forms?</label>
          </div>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="btn-cancel" class="ff-btn ff-btn-secondary">Cancel</button>
            <button id="btn-save" class="ff-btn ff-btn-primary">Save Information & Continue</button>
          </div>
        </div>
      `;
      shadow.appendChild(card);

      shadow.getElementById('btn-cancel').onclick = () => { hide(); resolve(null); };
      shadow.getElementById('btn-save').onclick = () => {
        const inputs = shadow.querySelectorAll('.ff-missing-input');
        const results = {};
        for (const input of inputs) {
          if (input.value.trim()) results[input.dataset.fieldId] = input.value.trim();
        }
        const saveToProfile = shadow.getElementById('cb-save-profile').checked;
        hide(); resolve({ results, saveToProfile });
      };
    });
  }

  function showGrouped(resolvedFields, mismatchCount) {
    return new Promise((resolve) => {
      const shadow = createHost();
      const card = document.createElement('div');
      card.className = 'ff-review-card';

      const groups = {};
      resolvedFields.forEach(f => {
        if (!groups[f.person]) groups[f.person] = [];
        groups[f.person].push(f);
      });

      let listHtml = '';
      for (const [person, fields] of Object.entries(groups)) {
        listHtml += `<div class="ff-section-title">${formatPersonLabel(person)}</div>`;
        for (const f of fields) {
          const hasValue = f.value !== undefined && f.value !== '';
          listHtml += `
            <div class="ff-field-item">
              <div class="ff-field-icon ${hasValue ? 'ok' : 'warn'}">${hasValue ? '✓' : '⚠'}</div>
              <div class="ff-field-body">
                <div class="ff-field-label">${f.label || f.profileField}</div>
                <div class="ff-field-value ${!hasValue ? 'needs-review' : ''}">${hasValue ? f.value : 'Needs Information'}</div>
              </div>
            </div>
          `;
        }
      }

      card.innerHTML = `
        <div class="ff-header">
          <h2><span class="ff-logo">🤝</span> Review Before Fill</h2>
          <div class="ff-subtitle">Verify the information before FormFriend fills the page.</div>
        </div>
        <div class="ff-body-scroll">${listHtml}</div>
        <div class="ff-actions">
          <button id="btn-cancel" class="ff-btn ff-btn-secondary">Cancel</button>
          ${mismatchCount > 0 ? `<button id="btn-mismatch" class="ff-btn ff-btn-warning">Check Mismatches (${mismatchCount})</button>` : ''}
          <button id="btn-fill" class="ff-btn ff-btn-primary">Fill Form</button>
        </div>
      `;
      shadow.appendChild(card);

      shadow.getElementById('btn-cancel').onclick = () => { hide(); resolve('cancel'); };
      shadow.getElementById('btn-fill').onclick = () => { hide(); resolve('fill'); };
      const btnMis = shadow.getElementById('btn-mismatch');
      if (btnMis) {
        btnMis.onclick = () => { hide(); resolve('mismatches'); };
      }
    });
  }

  return { showGrouped, showMissingInfoScreen, showUnknownPersonPrompt, hide };
})();
