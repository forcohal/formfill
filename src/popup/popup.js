/**
 * FormFriend — Popup Script
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'formfriend_profile';

  const views = {
    noProfile:    document.getElementById('state-no-profile'),
    profileReady: document.getElementById('state-profile-ready'),
    scanning:     document.getElementById('state-scanning'),
    mapped:       document.getElementById('state-mapped'),
    filled:       document.getElementById('state-filled'),
    mismatch:     document.getElementById('state-mismatch'),
    profileForm:  document.getElementById('state-profile-form')
  };

  const profileSummaryEl = document.getElementById('profile-summary');
  const fieldCountEl = document.getElementById('field-count');
  const mismatchCountEl = document.getElementById('mismatch-count');
  const profileFormEl = document.getElementById('profile-form');
  const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');

  const STANDARD_FIELDS = [
    'firstName', 'middleName', 'lastName', 'email', 'phone', 'dateOfBirth',
    'gender', 'maritalStatus', 'country', 'student',
    'college', 'department', 'semester'
  ];

  function showView(viewKey) {
    for (const [key, el] of Object.entries(views)) {
      el.hidden = key !== viewKey;
    }
  }

  function getProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || null);
      });
    });
  }

  function saveProfile(profile) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: profile }, resolve);
    });
  }

  function deleteProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([STORAGE_KEY], resolve);
    });
  }

  function renderProfileSummary(profile) {
    if (!profile) return;
    const lines = [];
    const fullName = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ');
    if (fullName) lines.push(`<strong>${fullName}</strong>`);
    if (profile.email) lines.push(profile.email);
    if (profile.phone) lines.push(profile.phone);
    if (profile.college) lines.push(profile.college);
    profileSummaryEl.innerHTML = lines.join('<br>');
  }

  function populateForm(profile) {
    dynamicFieldsContainer.innerHTML = '';
    
    // Standard fields
    for (const field of STANDARD_FIELDS) {
      const input = document.getElementById(`pf-${field}`);
      if (input && profile[field] !== undefined) {
        if (input.type === 'checkbox') {
          input.checked = profile[field] === true || profile[field] === 'true' || profile[field] === 'yes';
        } else {
          input.value = profile[field];
        }
      }
    }

    // Dynamic fields
    for (const [key, value] of Object.entries(profile)) {
      if (!STANDARD_FIELDS.includes(key) && key !== 'fullName') {
        const div = document.createElement('div');
        div.className = 'ff-form-group';
        
        const label = document.createElement('label');
        label.htmlFor = `pf-dyn-${key}`;
        // Convert camelCase to Title Case
        label.textContent = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `pf-dyn-${key}`;
        input.dataset.key = key;
        input.value = value;
        input.className = 'dynamic-field';
        
        div.appendChild(label);
        div.appendChild(input);
        dynamicFieldsContainer.appendChild(div);
      }
    }
  }

  function readForm() {
    const profile = {};
    for (const field of STANDARD_FIELDS) {
      const input = document.getElementById(`pf-${field}`);
      if (input) {
        if (input.type === 'checkbox') {
          profile[field] = input.checked;
        } else {
          profile[field] = input.value.trim();
        }
      }
    }
    const dynamicInputs = document.querySelectorAll('.dynamic-field');
    for (const input of dynamicInputs) {
      profile[input.dataset.key] = input.value.trim();
    }
    return profile;
  }

  function clearForm() {
    for (const field of STANDARD_FIELDS) {
      const input = document.getElementById(`pf-${field}`);
      if (input) {
        if (input.type === 'checkbox') input.checked = false;
        else input.value = '';
      }
    }
    dynamicFieldsContainer.innerHTML = '';
  }

  function sendToContentScript(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { ok: false });
      });
    });
  }

  async function init() {
    const profile = await getProfile();

    if (!profile) {
      showView('noProfile');
      return;
    }

    try {
      const tabState = await sendToContentScript({ type: 'GET_TAB_STATE' });
      switch (tabState.status) {
        case 'scanning':
          showView('scanning');
          return;
        case 'mapped':
          fieldCountEl.textContent = tabState.fieldCount || '?';
          showView('mapped');
          return;
        case 'filled':
          showView('filled');
          return;
        case 'mismatch':
          mismatchCountEl.textContent = tabState.mismatches ? tabState.mismatches.length : '?';
          showView('mismatch');
          return;
      }
    } catch (e) {}

    renderProfileSummary(profile);
    showView('profileReady');
  }

  document.getElementById('btn-create-profile').addEventListener('click', () => {
    clearForm();
    document.getElementById('btn-delete-profile').hidden = true;
    showView('profileForm');
  });

  document.getElementById('btn-edit-profile').addEventListener('click', async () => {
    const profile = await getProfile();
    if (profile) populateForm(profile);
    document.getElementById('btn-delete-profile').hidden = false;
    showView('profileForm');
  });

  document.getElementById('btn-cancel-profile').addEventListener('click', async () => {
    const profile = await getProfile();
    if (profile) {
      renderProfileSummary(profile);
      showView('profileReady');
    } else {
      showView('noProfile');
    }
  });

  profileFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const profile = readForm();
    if (!profile.firstName || !profile.lastName || !profile.email) {
      alert('First Name, Last Name, and email are required.');
      return;
    }
    await saveProfile(profile);
    renderProfileSummary(profile);
    showView('profileReady');
  });

  document.getElementById('btn-delete-profile').addEventListener('click', async () => {
    if (confirm('Delete your FormFriend profile?')) {
      await deleteProfile();
      clearForm();
      showView('noProfile');
    }
  });

  document.getElementById('btn-scan-form').addEventListener('click', async () => {
    showView('scanning');
    const response = await sendToContentScript({ type: 'START_SCAN' });
    if (response && response.fieldCount) {
      fieldCountEl.textContent = response.fieldCount;
      showView('mapped');
    } else if (response && response.error) {
      alert(response.error);
      showView('profileReady');
    }
  });

  document.getElementById('btn-review-fill').addEventListener('click', async () => {
    const response = await sendToContentScript({ type: 'START_REVIEW' });
    if (response && response.filled) {
      showView('filled');
    }
    window.close();
  });

  document.getElementById('btn-check-mismatches').addEventListener('click', async () => {
    const response = await sendToContentScript({ type: 'CHECK_MISMATCHES' });
    if (response && response.mismatches && response.mismatches.length > 0) {
      mismatchCountEl.textContent = response.mismatches.length;
      showView('mismatch');
    } else {
      alert('No mismatches found! ✓');
    }
  });

  document.getElementById('btn-review-mismatches').addEventListener('click', async () => {
    await sendToContentScript({ type: 'CHECK_MISMATCHES' });
    window.close();
  });

  document.getElementById('btn-reset').addEventListener('click', async () => {
    await sendToContentScript({ type: 'RESET_STATE' });
    const profile = await getProfile();
    if (profile) {
      renderProfileSummary(profile);
      showView('profileReady');
    } else {
      showView('noProfile');
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STATE_UPDATE') {
      if (message.status === 'filled') showView('filled');
      if (message.status === 'mismatch') {
        mismatchCountEl.textContent = message.count || '?';
        showView('mismatch');
      }
    }
  });

  init();
})();
