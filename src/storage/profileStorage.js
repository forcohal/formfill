/**
 * FormFriend — Profile Storage
 * Updated to support nested persons (self, father, mother, coApplicant, etc.)
 */
var FormFriendProfile = (function () {
  'use strict';
  const STORAGE_KEY = 'formfriend_profile';

  function getProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        let p = result[STORAGE_KEY];
        // Migration: if it's flat, nest it under 'self'
        if (p && !p.self) {
          p = { self: p };
        }
        if (!p) p = { self: {} };
        resolve(p);
      });
    });
  }

  function saveProfile(profile) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: profile }, resolve);
    });
  }

  async function updateProfile(updatesByPerson) {
    const p = await getProfile();
    for (const [person, fields] of Object.entries(updatesByPerson)) {
      if (!p[person]) p[person] = {};
      Object.assign(p[person], fields);
    }
    await saveProfile(p);
    return p;
  }

  function deleteProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([STORAGE_KEY], resolve);
    });
  }

  async function hasProfile() {
    const p = await getProfile();
    return p && p.self && Object.keys(p.self).length > 0;
  }

  return { getProfile, saveProfile, updateProfile, deleteProfile, hasProfile };
})();
