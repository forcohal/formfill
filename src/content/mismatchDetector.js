/**
 * FormFriend — Mismatch Detector
 * Updated to compare resolved fields against the DOM *before* filling.
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
    if (!profileValue || !formValue) return { type: 'unknown', severity: 'none', details: 'Missing value' };
    const pStr = String(profileValue);
    const fStr = String(formValue);
    if (pStr === fStr) return { type: 'match', severity: 'none' };
    
    const category = getFieldCategory(profileField);
    let comparison;
    switch (category) {
      case 'name': comparison = compareName(pStr, fStr); break;
      case 'email': comparison = compareEmail(pStr, fStr); break;
      case 'phone': comparison = comparePhone(pStr, fStr); break;
      case 'date': comparison = compareDate(pStr, fStr); break;
      default: comparison = compareGenericText(pStr, fStr); break;
    }
    return comparison;
  }

  function compareName(p, f) {
    const np = FormFriendNormalize.normalizeName(p);
    const nf = FormFriendNormalize.normalizeName(f);
    if (np === nf) return { type: 'format_difference', severity: 'none', details: 'Case difference' };
    const sim = FormFriendNormalize.similarity(np, nf);
    if (sim >= MATCH_SIMILARITY_THRESHOLD) return { type: 'format_difference', severity: 'low' };
    if (sim >= TYPO_SIMILARITY_THRESHOLD) return { type: 'possible_typo', severity: 'medium', details: 'Possible typo' };
    return { type: 'mismatch', severity: 'high', details: 'Names significantly different' };
  }
  function compareEmail(p, f) {
    if (FormFriendNormalize.normalizeEmail(p) === FormFriendNormalize.normalizeEmail(f)) return { type: 'format_difference', severity: 'none' };
    return { type: 'mismatch', severity: 'high', details: 'Email mismatch' };
  }
  function comparePhone(p, f) {
    const np = FormFriendNormalize.normalizePhone(p);
    const nf = FormFriendNormalize.normalizePhone(f);
    if (np === nf) return { type: 'format_difference', severity: 'none' };
    if (np.endsWith(nf) || nf.endsWith(np)) return { type: 'format_difference', severity: 'low', details: 'Country code difference' };
    return { type: 'mismatch', severity: 'high', details: 'Phone mismatch' };
  }
  function compareDate(p, f) {
    const np = FormFriendNormalize.normalizeDate(p);
    const nf = FormFriendNormalize.normalizeDate(f);
    if (np && nf && np === nf) return { type: 'format_difference', severity: 'none' };
    if (!np || !nf) return { type: 'unknown', severity: 'none' };
    return { type: 'mismatch', severity: 'high', details: 'Date mismatch' };
  }
  function compareGenericText(p, f) {
    const np = FormFriendNormalize.normalizeText(p);
    const nf = FormFriendNormalize.normalizeText(f);
    if (np === nf) return { type: 'format_difference', severity: 'none' };
    const sim = FormFriendNormalize.similarity(np, nf);
    if (sim >= TYPO_SIMILARITY_THRESHOLD) return { type: 'possible_typo', severity: 'medium' };
    return { type: 'mismatch', severity: 'high' };
  }

  function getDomValue(element) {
    const tag = element.tagName.toLowerCase();
    if (tag === 'select') {
      const opt = element.options[element.selectedIndex];
      return opt ? opt.text : element.value;
    }
    if (tag === 'input' && element.type === 'checkbox') return element.checked ? 'true' : 'false';
    if (tag === 'input' && element.type === 'radio') {
      const checked = document.querySelector(`input[name="${element.name}"]:checked`);
      return checked ? checked.value : '';
    }
    return element.value || '';
  }

  function detectMismatches(resolvedFields) {
    const results = [];
    for (const entry of resolvedFields) {
      // RULE: Only check self
      if (entry.person !== 'self') continue;

      const element = FormFriendFieldRegistry.getElement(entry.fieldId);
      if (!element) continue;

      const formValue = getDomValue(element);
      if (!formValue || !formValue.trim()) continue; // Field is empty in the form

      const comparison = compareField(entry.value, formValue, entry.profileField);
      
      if (comparison.type === 'possible_typo' || comparison.type === 'mismatch') {
        results.push({ fieldId: entry.fieldId, profileField: entry.profileField, expected: entry.value, actual: formValue, ...comparison });
      }
    }
    return results;
  }

  return { compareField, detectMismatches, getFieldCategory };
})();
