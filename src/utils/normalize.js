/**
 * FormFriend — Normalize Utils
 * Updated date normalization and formatting.
 */
var FormFriendNormalize = (function () {
  'use strict';

  function normalizeText(str) {
    if (typeof str !== 'string') return '';
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function normalizeName(name) {
    let n = normalizeText(name);
    n = n.replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.)\s*/, '');
    return n;
  }

  function normalizeEmail(email) {
    return normalizeText(email);
  }

  function normalizePhone(phone) {
    if (typeof phone !== 'string') return '';
    let p = phone.replace(/[^\d+]/g, '');
    if (p.startsWith('+')) p = p.substring(1);
    return p;
  }

  function normalizeDate(dateStr) {
    if (!dateStr) return null;
    const s = dateStr.trim();
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts[0].length === 4) return s; // YYYY-MM-DD
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`; // DD-MM-YYYY
    }
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`; // DD/MM/YYYY
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
  }

  function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1,   // insertion
              matrix[i - 1][j] + 1    // deletion
            )
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  function similarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    return (longer.length - levenshteinDistance(longer, shorter)) / parseFloat(longer.length);
  }

  function getNormalizer(profileField) {
    const fieldLower = (profileField || '').toLowerCase();
    if (fieldLower.includes('name') || fieldLower === 'fullname') return normalizeName;
    if (fieldLower.includes('email')) return normalizeEmail;
    if (fieldLower.includes('phone') || fieldLower.includes('mobile')) return normalizePhone;
    if (fieldLower.includes('date') || fieldLower.includes('dob')) return normalizeDate;
    return normalizeText;
  }

  return {
    normalizeText,
    normalizeName,
    normalizeEmail,
    normalizePhone,
    normalizeDate,
    levenshteinDistance,
    similarity,
    getNormalizer
  };
})();
