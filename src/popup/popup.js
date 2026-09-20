/**
 * FormFriend — Popup Script
 * Updated to read/write from profile.self and support structured names.
 */
(function () {
  'use strict';
  
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

  function renderProfileSummary(profile) {
    const self = profile.self || {};
    if (Object.keys(self).length === 0) return;
    const lines = [];
    const fullName = [self.firstName, self.middleName, self.lastName].filter(Boolean).join(' ');
    if (fullName) lines.push(`<strong>${fullName}</strong>`);
    if (self.email) lines.push(self.email);
    if (self.phone) lines.push(self.phone);
    if (self.college) lines.push(self.college);
    profileSummaryEl.innerHTML = lines.join('<br>');
  }

  function populateForm(profile) {
    const self = profile.self || {};
    dynamicFieldsContainer.innerHTML = '';
    
    for (const field of STANDARD_FIELDS) {
      const input = document.getElementById(`pf-${field}`);
      if (input && self[field] !== undefined) {
        if (input.type === 'checkbox') {
          input.checked = self[field] === true || self[field] === 'true' || self[field] === 'yes';
        } else {
          input.value = self[field];
        }
      }
    }

    for (const [key, value] of Object.entries(self)) {
      if (!STANDARD_FIELDS.includes(key) && key !== 'fullName') {
        const div = document.createElement('div');
        div.className = 'ff-form-group';
        const label = document.createElement('label');
        label.htmlFor = `pf-dyn-${key}`;
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
    const self = {};
    for (const field of STANDARD_FIELDS) {
      const input = document.getElementById(`pf-${field}`);
      if (input) {
        if (input.type === 'checkbox') self[field] = input.checked;
        else self[field] = input.value.trim();
      }
    }
    const dynamicInputs = document.querySelectorAll('.dynamic-field');
    for (const input of dynamicInputs) {
      self[input.dataset.key] = input.value.trim();
    }
    return { self };
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
    const hasProfile = await FormFriendProfile.hasProfile();
    if (!hasProfile) {
      showView('noProfile');
      return;
    }
    const profile = await FormFriendProfile.getProfile();
    try {
      const tabState = await sendToContentScript({ type: 'GET_TAB_STATE' });
      if (tabState.status === 'scanning') { showView('scanning'); return; }
      if (tabState.status === 'mapped') { fieldCountEl.textContent = tabState.fieldCount || '?'; showView('mapped'); return; }
      if (tabState.status === 'filled') { showView('filled'); return; }
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
    const profile = await FormFriendProfile.getProfile();
    populateForm(profile);
    document.getElementById('btn-delete-profile').hidden = false;
    showView('profileForm');
  });

  document.getElementById('btn-cancel-profile').addEventListener('click', async () => {
    const hasProfile = await FormFriendProfile.hasProfile();
    if (hasProfile) {
      renderProfileSummary(await FormFriendProfile.getProfile());
      showView('profileReady');
    } else {
      showView('noProfile');
    }
  });

  profileFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const profile = readForm();
    if (!profile.self.firstName || !profile.self.lastName || !profile.self.email) {
      alert('First Name, Last Name, and email are required.');
      return;
    }
    await FormFriendProfile.saveProfile(profile);
    renderProfileSummary(profile);
    showView('profileReady');
  });

  document.getElementById('btn-delete-profile').addEventListener('click', async () => {
    if (confirm('Delete your FormFriend profile?')) {
      await FormFriendProfile.deleteProfile();
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

  document.getElementById('btn-reset').addEventListener('click', async () => {
    await sendToContentScript({ type: 'RESET_STATE' });
    init();
  });

  init();
})();
