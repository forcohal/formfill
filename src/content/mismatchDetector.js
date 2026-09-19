/**
 * FormFriend — Mismatch Detector
 *
 * Updated to respect field ownership (only detect mismatches for 'self').
 */

var FormFriendMismatchDetector = (function () {
  'use strict';

  const TYPO_SIMILARITY_THRESHOLD = 0.75;
  const MATCH_SIMILARITY_THRESHOLD = 0.95;

  function getFieldCategory(profileField) {
    const f = (profileField || '').toLowerCase();
    if (f.includes('name') || f === 'fullname') return 'name';
    if (f.includes('email')) return 'email';
    if (f.includes('phone') || f.includes('mobile')) return 'phone';
    if (f.includes('date') || f.includes('dob')) return 'date';
    return 'text';
  }

  function compareField(profileValue, formValue, profileField) {
    if (!profileValue) return { type: 'unknown', severity: 'none', details: 'No profile value' };
    if (!formValue) return { type: 'unknown', severity: 'none', details: 'Form field is empty' };

    const pStr = String(profileValue);
    const fStr = String(formValue);

    if (pStr === fStr) return { type: 'match', severity: 'none' };

    const category = getFieldCategory(profileField);
    switch (category) {
      case 'name': return compareName(pStr, fStr);
      case 'email': return compareEmail(pStr, fStr);
      case 'phone': return comparePhone(pStr, fStr);
      case 'date': return compareDate(pStr, fStr);
      default: return compareGenericText(pStr, fStr);
    }
  }

  function compareName(profile, form) {
    const np = FormFriendNormalize.normalizeName(profile);
    const nf = FormFriendNormalize.normalizeName(form);
    if (np === nf) return { type: 'format_difference', severity: 'none', details: 'Case/whitespace difference only' };
    const sim = FormFriendNormalize.similarity(np, nf);
    if (sim >= MATCH_SIMILARITY_THRESHOLD) return { type: 'format_difference', severity: 'low', details: `Similarity: ${(sim * 100).toFixed(0)}%` };
    if (sim >= TYPO_SIMILARITY_THRESHOLD) return { type: 'possible_typo', severity: 'medium', details: `Similarity: ${(sim * 100).toFixed(0)}% — possible typo` };
    return { type: 'mismatch', severity: 'high', details: `Similarity: ${(sim * 100).toFixed(0)}% — names are significantly different` };
  }

  function compareEmail(profile, form) {
    const np = FormFriendNormalize.normalizeEmail(profile);
    const nf = FormFriendNormalize.normalizeEmail(form);
    if (np === nf) return { type: 'format_difference', severity: 'none', details: 'Case difference only' };
    return { type: 'mismatch', severity: 'high', details: 'Email addresses do not match' };
  }

  function comparePhone(profile, form) {
    const np = FormFriendNormalize.normalizePhone(profile);
    const nf = FormFriendNormalize.normalizePhone(form);
    if (np === nf) return { type: 'format_difference', severity: 'none', details: 'Formatting difference only' };
    if (np.endsWith(nf) || nf.endsWith(np)) return { type: 'format_difference', severity: 'low', details: 'Possible country code difference' };
    return { type: 'mismatch', severity: 'high', details: 'Phone numbers do not match' };
  }

  function compareDate(profile, form) {
    const np = FormFriendNormalize.normalizeDate(profile);
    const nf = FormFriendNormalize.normalizeDate(form);
    if (!np || !nf) {
      if (FormFriendNormalize.normalizeText(profile) === FormFriendNormalize.normalizeText(form)) return { type: 'match', severity: 'none' };
      return { type: 'unknown', severity: 'medium', details: 'Could not parse date for comparison' };
    }
    if (np === nf) return { type: 'format_difference', severity: 'none', details: 'Same date, different format' };
    return { type: 'mismatch', severity: 'high', details: 'Dates do not match' };
  }

  function compareGenericText(profile, form) {
    const np = FormFriendNormalize.normalizeText(profile);
    const nf = FormFriendNormalize.normalizeText(form);
    if (np === nf) return { type: 'format_difference', severity: 'none', details: 'Whitespace/case difference only' };
    const sim = FormFriendNormalize.similarity(np, nf);
    if (sim >= MATCH_SIMILARITY_THRESHOLD) return { type: 'format_difference', severity: 'low', details: `Similarity: ${(sim * 100).toFixed(0)}%` };
    if (sim >= TYPO_SIMILARITY_THRESHOLD) return { type: 'possible_typo', severity: 'medium', details: `Similarity: ${(sim * 100).toFixed(0)}%` };
    return { type: 'mismatch', severity: 'high', details: `Similarity: ${(sim * 100).toFixed(0)}%` };
  }

  function detectMismatches(mapping, profile) {
    const results = [];
    if (!Array.isArray(mapping) || !profile) return results;

    for (const entry of mapping) {
      // RULE: Do not detect mismatches for someone else's info
      if (entry.person && entry.person !== 'self') continue;

      const { fieldId, profileField } = entry;

      let profileValue = undefined;
      if (profileField === 'fullName') {
        const f = profile.firstName || '';
        const m = profile.middleName || '';
        const l = profile.lastName || '';
        profileValue = [f, m, l].filter(Boolean).join(' ');
      } else {
        profileValue = profile[profileField];
      }

      if (!profileValue) continue;

      const element = FormFriendFieldRegistry.getElement(fieldId);
      if (!element) continue;

      let formValue = '';
      const tag = element.tagName.toLowerCase();
      if (tag === 'select') {
        const selectedOption = element.options[element.selectedIndex];
        formValue = selectedOption ? selectedOption.text : element.value;
      } else if (tag === 'input' && element.type === 'checkbox') {
        formValue = element.checked ? 'true' : 'false';
      } else if (tag === 'input' && element.type === 'radio') {
        const checked = document.querySelector(`input[name="${element.name}"]:checked`);
        formValue = checked ? checked.value : '';
      } else {
        formValue = element.value || '';
      }

      if (!formValue) continue;

      const comparison = compareField(profileValue, formValue, profileField);

      results.push({
        fieldId,
        profileField,
        expected: String(profileValue),
        actual: String(formValue),
        ...comparison
      });
    }

    return results;
  }

  function getWarnings(results) {
    return results.filter(r => r.type === 'possible_typo' || r.type === 'mismatch' || r.type === 'unknown');
  }

  return { compareField, detectMismatches, getWarnings, getFieldCategory };
})();
