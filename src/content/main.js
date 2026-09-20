/**
 * FormFriend — Content Script Orchestrator
 * Updated with robust conflict resolution, unknown options handling, and explicit profile saving UI responses.
 */
var FormFriendMain = (function () {
  'use strict';
  let currentMapping = null;
  let currentFields = null;

  function notifyBackground(type, data = {}) { try { chrome.runtime.sendMessage({ type, ...data }); } catch (e) {} }

  function doScan() {
    notifyBackground('FORM_DETECTED');
    const result = FormFriendScannerStub.scanAndMap();
    currentFields = result.fields;
    currentMapping = result.mapping;
    notifyBackground('MAPPING_READY', { mapping: currentMapping });
    return { ok: true, fieldCount: currentFields.length, mappedCount: currentMapping.length };
  }

  async function resolveMappingWithProfile(mapping) {
    const profile = await FormFriendProfile.getProfile();
    const missing = [];
    const resolved = [];

    for (const entry of mapping) {
      if (entry.person === 'unknown') {
        const decision = await FormFriendReviewUI.showUnknownPersonPrompt(entry.label || entry.profileField, '');
        if (decision === 'skip') continue;
        entry.person = decision;
      }
      
      const personData = profile[entry.person] || {};
      let val = personData[entry.profileField];
      
      if (entry.profileField === 'fullName') {
        val = [personData.firstName, personData.middleName, personData.lastName].filter(Boolean).join(' ') || undefined;
      }

      if (!val) {
        missing.push(entry);
        continue;
      }

      // We have a value, check if it matches select/radio options
      if ((entry.controlType === 'select' || entry.controlType === 'radio') && entry.options && entry.options.length > 0) {
        const matched = FormFriendAutofill.findMatchingOption(val, entry.options);
        if (!matched) {
            entry.resolutionReason = 'options_mismatch';
            entry.originalValue = val;
            missing.push(entry);
            continue;
        }
      }

      // We have a date, check if the format is completely ambiguous
      if (entry.profileField === 'dateOfBirth' && entry.dateFormat === 'unknown' && entry.controlType !== 'segmented-date') {
          entry.resolutionReason = 'date_format_unknown';
          entry.originalValue = val;
          missing.push(entry);
          continue;
      }

      resolved.push({ ...entry, value: val, label: entry.label || entry.profileField });
    }
    return { missing, resolved };
  }

  async function doReviewAndFill() {
    if (!currentMapping) doScan();
    if (!currentMapping || currentMapping.length === 0) return { ok: false, error: 'No fields' };

    let { missing, resolved } = await resolveMappingWithProfile(currentMapping);

    if (missing.length > 0) {
      const uiResponse = await FormFriendReviewUI.showMissingInfoScreen(missing);
      if (!uiResponse) return { ok: true, reason: 'cancelled missing info' };

      const updatesByPerson = {};
      for (const m of missing) {
        const val = uiResponse.results[m.fieldId];
        if (val) {
            if (m.resolutionReason === 'date_format_unknown') {
                m.forcedDateFormat = val;
                m.value = m.originalValue; // Keep the core value as YYYY-MM-DD internally
            } else {
                m.value = val;
                // Only save real values to profile, not temporary format choices or option mismatches
                if (uiResponse.saveToProfile && m.resolutionReason !== 'options_mismatch' && m.resolutionReason !== 'date_format_unknown') {
                    if (!updatesByPerson[m.person]) updatesByPerson[m.person] = {};
                    updatesByPerson[m.person][m.profileField] = val;
                }
            }
            resolved.push({ ...m, label: m.label || m.profileField });
        }
      }
      
      if (uiResponse.saveToProfile && Object.keys(updatesByPerson).length > 0) {
          await FormFriendProfile.updateProfile(updatesByPerson);
      }
    }

    if (resolved.length === 0) return { ok: false, error: 'No fields to fill' };

    const mismatches = FormFriendMismatchDetector.detectMismatches(resolved);

    while (true) {
      const action = await FormFriendReviewUI.showGrouped(resolved, mismatches.length);
      if (action === 'cancel') return { ok: true, filled: false };
      if (action === 'mismatches') {
        await FormFriendMismatchUI.showWithBack(mismatches);
        continue;
      }
      if (action === 'fill') break;
    }

    const results = FormFriendAutofill.fillResolvedFields(resolved);
    notifyBackground('FILL_COMPLETE');
    return { ok: true, filled: true, results };
  }

  async function doMismatchCheck() { return { ok: true, mismatches: [] }; }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'START_SCAN': sendResponse(doScan()); break;
      case 'START_REVIEW': doReviewAndFill().then(sendResponse); return true;
      case 'CHECK_MISMATCHES': doMismatchCheck().then(sendResponse); return true;
      case 'RESET_STATE': currentMapping = null; currentFields = null; FormFriendFieldRegistry.clearRegistry(); sendResponse({ ok: true }); break;
    }
  });

  return { scan: doScan, reviewAndFill: doReviewAndFill, checkMismatches: doMismatchCheck };
})();
