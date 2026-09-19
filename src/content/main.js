/**
 * FormFriend — Content Script Orchestrator
 *
 * Coordinates the entire flow including new safety rules:
 *   scan -> prompt for unknown person -> prompt for missing info -> review grouped -> fill -> mismatch
 */

var FormFriendMain = (function () {
  'use strict';

  let currentMapping = null;
  let currentFields = null;

  function notifyBackground(type, data = {}) {
    try {
      chrome.runtime.sendMessage({ type, ...data });
    } catch (e) {}
  }

  function doScan() {
    console.log('[FormFriend] Starting scan...');
    notifyBackground('FORM_DETECTED');

    const result = FormFriendScannerStub.scanAndMap();
    currentFields = result.fields;
    currentMapping = result.mapping;

    notifyBackground('MAPPING_READY', { mapping: currentMapping });
    return { ok: true, fieldCount: currentFields.length, mappedCount: currentMapping.length };
  }

  async function doReviewAndFill() {
    if (!currentMapping || currentMapping.length === 0) {
      doScan();
      if (!currentMapping || currentMapping.length === 0) {
        return { ok: false, error: 'No fields could be mapped' };
      }
    }

    const profile = await FormFriendProfile.getProfile();
    if (!profile) {
      return { ok: false, error: 'No profile found. Please create one first.' };
    }

    const resolvedFields = [];
    
    // Resolve each mapped field
    for (const entry of currentMapping) {
      const element = FormFriendFieldRegistry.getElement(entry.fieldId);
      if (!element) continue;
      
      const label = FormFriendScannerStub.extractLabel(element) || entry.profileField;
      let person = entry.person;

      // 1. Unknown Person Flow
      if (person === 'unknown') {
        const decision = await FormFriendReviewUI.showUnknownPersonPrompt(label, '');
        if (decision === 'skip') continue;
        person = decision;
        entry.person = person; // Update mapping for mismatch detector later
      }

      let value = undefined;

      // 2. Profile Value Resolution
      if (person === 'self') {
        if (entry.profileField === 'fullName') {
          const f = profile.firstName || '';
          const m = profile.middleName || '';
          const l = profile.lastName || '';
          value = [f, m, l].filter(Boolean).join(' ');
          if (!value) value = undefined;
        } else {
          value = profile[entry.profileField];
        }

        // Missing Info Flow for Self
        if (!value) {
          const result = await FormFriendReviewUI.showMissingInfoPrompt(label, 'your profile', false);
          if (result.action === 'skip') continue;
          value = result.value;
          if (result.action === 'save' && value) {
            profile[entry.profileField] = value;
            await FormFriendProfile.updateProfile({ [entry.profileField]: value });
          }
        }
      } else {
        // Third-party Information Flow
        // We DO NOT auto-fill this from the user's personal profile.
        const result = await FormFriendReviewUI.showMissingInfoPrompt(label, `${person}'s information`, true);
        if (result.action === 'skip') continue;
        value = result.value;
      }

      if (value) {
        resolvedFields.push({
          fieldId: entry.fieldId,
          profileField: entry.profileField,
          person: person,
          value: value,
          label: label
        });
      }
    }

    if (resolvedFields.length === 0) return { ok: false, error: 'No fields to fill' };

    // 3. Grouped Review UI
    const decision = await FormFriendReviewUI.showGrouped(resolvedFields);
    if (decision === 'cancel') return { ok: true, filled: false, reason: 'User cancelled' };

    // 4. Autofill
    const results = FormFriendAutofill.fillResolvedFields(resolvedFields);
    notifyBackground('FILL_COMPLETE');

    setTimeout(() => {
      doMismatchCheck();
    }, 500);

    return { ok: true, filled: true, results };
  }

  async function doMismatchCheck() {
    if (!currentMapping || currentMapping.length === 0) return { ok: false, error: 'No mapping available' };

    const profile = await FormFriendProfile.getProfile();
    if (!profile) return { ok: false, error: 'No profile found' };

    const allResults = FormFriendMismatchDetector.detectMismatches(currentMapping, profile);
    const warnings = FormFriendMismatchDetector.getWarnings(allResults);

    if (warnings.length > 0) {
      notifyBackground('MISMATCHES_FOUND', { mismatches: warnings });
      await FormFriendMismatchUI.show(warnings);
      return { ok: true, mismatches: warnings };
    }

    return { ok: true, mismatches: [] };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'START_SCAN':
        sendResponse(doScan());
        break;
      case 'START_REVIEW':
        doReviewAndFill().then(sendResponse);
        return true;
      case 'CHECK_MISMATCHES':
        doMismatchCheck().then(sendResponse);
        return true;
      case 'RESET_STATE':
        currentMapping = null;
        currentFields = null;
        FormFriendFieldRegistry.clearRegistry();
        sendResponse({ ok: true });
        break;
    }
  });

  return {
    scan: doScan,
    reviewAndFill: doReviewAndFill,
    checkMismatches: doMismatchCheck,
    getMapping: () => currentMapping,
    getFields: () => currentFields
  };
})();
