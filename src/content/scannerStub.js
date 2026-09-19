/**
 * FormFriend — Scanner Stub (simulates Person A's scanner)
 *
 * Updated to support radio groups, checkboxes, selects, and safety checks for legal consent.
 */

var FormFriendScannerStub = (function () {
  'use strict';

  const LABEL_RULES = [
    { patterns: ['first name', 'given name'], profileField: 'firstName' },
    { patterns: ['middle name'], profileField: 'middleName' },
    { patterns: ['last name', 'surname', 'family name'], profileField: 'lastName' },
    { patterns: ['full name', 'name', 'applicant identity', 'your name', 'student name', 'candidate name'], profileField: 'fullName' },
    { patterns: ['email', 'e-mail', 'electronic mail', 'email address', 'mail'], profileField: 'email' },
    { patterns: ['phone', 'mobile', 'telephone', 'contact number', 'reach me at', 'phone number', 'mobile number'], profileField: 'phone' },
    { patterns: ['date of birth', 'dob', 'birth date', 'birthday', 'birth information', 'born on'], profileField: 'dateOfBirth' },
    { patterns: ['college', 'university', 'institution', 'school', 'institution attended'], profileField: 'college' },
    { patterns: ['department', 'dept', 'branch', 'discipline', 'major', 'field of study'], profileField: 'department' },
    { patterns: ['semester', 'sem', 'term', 'year of study', 'current semester'], profileField: 'semester' },
    { patterns: ['passport', 'passport number', 'passport no'], profileField: 'passportNumber' },
    { patterns: ['aadhaar', 'aadhaar number', 'aadhar', 'aadhar no'], profileField: 'aadhaarNumber' },
    { patterns: ['blood group', 'blood type'], profileField: 'bloodGroup' },
    { patterns: ['linkedin', 'linkedin url', 'linkedin profile'], profileField: 'linkedinUrl' },
    { patterns: ['permanent address', 'address'], profileField: 'permanentAddress' },
    
    // Non-text controls
    { patterns: ['gender', 'sex', 'gender identity'], profileField: 'gender' },
    { patterns: ['marital status', 'civil status', 'relationship status'], profileField: 'maritalStatus' },
    { patterns: ['country', 'nation', 'country of residence'], profileField: 'country' },
    { patterns: ['student', 'are you a student', 'currently a student'], profileField: 'student' }
  ];

  const CONSENT_KEYWORDS = [
    'agree', 'terms', 'conditions', 'privacy', 'consent', 'marketing', 
    'certify', 'authorize', 'accept', 'acknowledge', 'i understand'
  ];

  function extractLabel(element) {
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent.trim();
    }

    const parentLabel = element.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true);
      const inputs = clone.querySelectorAll('input, select, textarea');
      inputs.forEach(i => i.remove());
      const text = clone.textContent.trim();
      if (text) return text;
    }

    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');

    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent.trim();
    }

    if (element.placeholder) return element.placeholder;

    if (element.name) {
      return element.name.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim();
    }

    return '';
  }

  function extractGroupLabel(element) {
    // For radio groups, look at fieldset legend
    const fieldset = element.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) return legend.textContent.trim();
    }
    // Check previous header or strong element in a container
    const parentDiv = element.closest('div');
    if (parentDiv) {
      const header = parentDiv.querySelector('h1, h2, h3, h4, h5, h6, strong, label:not([for])');
      if (header && !header.contains(element)) return header.textContent.trim();
    }
    // Fallback to name attribute
    if (element.name) {
      return element.name.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim();
    }
    return '';
  }

  function isConsentCheckbox(label, element) {
    if (element.type !== 'checkbox') return false;
    const txt = label.toLowerCase();
    return CONSENT_KEYWORDS.some(kw => txt.includes(kw));
  }

  function matchLabel(label) {
    const normalized = label.toLowerCase().trim();
    for (const rule of LABEL_RULES) {
      for (const pattern of rule.patterns) {
        if (normalized === pattern) return { profileField: rule.profileField, confidence: 0.98 };
        if (normalized.includes(pattern)) return { profileField: rule.profileField, confidence: 0.90 };
      }
    }
    return null;
  }

  function determinePersonContext(element, labelText) {
    let current = element;
    
    while (current && current !== document.body) {
      if (current.tagName === 'FIELDSET') {
        const legend = current.querySelector('legend');
        if (legend) {
          const txt = legend.textContent.toLowerCase();
          if (txt.includes('co-applicant') || txt.includes('coapplicant') || txt.includes('spouse')) return 'coApplicant';
          if (txt.includes('parent') || txt.includes('guardian') || txt.includes('mother') || txt.includes('father')) return 'parentGuardian';
          if (txt.includes('emergency')) return 'emergencyContact';
          if (txt.includes('applicant') || txt.includes('personal') || txt.includes('your details')) return 'self';
        }
      }
      
      if (current.tagName === 'SECTION' || current.className.toLowerCase().includes('section') || current.tagName === 'DIV') {
        const h = current.querySelector('h1, h2, h3, h4, h5, h6');
        if (h) {
          const txt = h.textContent.toLowerCase();
          if (txt.includes('co-applicant') || txt.includes('coapplicant') || txt.includes('spouse')) return 'coApplicant';
          if (txt.includes('parent') || txt.includes('guardian') || txt.includes('mother') || txt.includes('father')) return 'parentGuardian';
          if (txt.includes('emergency')) return 'emergencyContact';
          if (txt.includes('applicant') || txt.includes('personal') || txt.includes('your details')) return 'self';
        }
      }
      current = current.parentElement;
    }

    const txt = labelText.toLowerCase();
    if (txt.includes('co-applicant') || txt.includes('coapplicant')) return 'coApplicant';
    if (txt.includes('parent') || txt.includes('guardian') || txt.includes('father') || txt.includes('mother')) return 'parentGuardian';
    if (txt.includes('emergency')) return 'emergencyContact';
    if (txt.includes('applicant') || txt.includes('your')) return 'self';

    return 'unknown';
  }

  function scanAndMap() {
    FormFriendFieldRegistry.clearRegistry();

    const selectors = 'input, select, textarea';
    const elements = document.querySelectorAll(selectors);

    const fields = [];
    const mapping = [];
    const radioGroups = {}; // Track radio buttons by name
    let index = 0;

    for (const element of elements) {
      const type = (element.type || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'file', 'image', 'reset'].includes(type)) continue;

      if (element.offsetParent === null && type !== 'hidden') {
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
      }

      const fieldId = `ff_${index++}`;
      
      // Handle Radios: Collect them by group instead of mapping immediately
      if (type === 'radio') {
        const groupName = element.name || fieldId; // Use ID as fallback if no name
        if (!radioGroups[groupName]) {
          radioGroups[groupName] = { elements: [], firstId: fieldId };
        }
        radioGroups[groupName].elements.push(element);
        FormFriendFieldRegistry.registerField(fieldId, element);
        continue;
      }

      const label = extractLabel(element);
      FormFriendFieldRegistry.registerField(fieldId, element);

      fields.push({
        fieldId,
        element,
        label,
        type: type || element.tagName.toLowerCase(),
        name: element.name || '',
        id: element.id || '',
        placeholder: element.placeholder || ''
      });

      // Skip legal consent checkboxes completely to ensure safety
      if (isConsentCheckbox(label, element)) {
        console.log(`[FormFriend] Skipping legal/consent checkbox: "${label}"`);
        continue;
      }

      const match = matchLabel(label);
      if (match) {
        let controlType = element.tagName.toLowerCase() === 'select' ? 'select' : type;
        const person = determinePersonContext(element, label);
        mapping.push({
          fieldId,
          profileField: match.profileField,
          controlType: controlType,
          confidence: match.confidence,
          person: person
        });
      }
    }

    // Process collected radio groups
    for (const [name, group] of Object.entries(radioGroups)) {
      const firstEl = group.elements[0];
      const groupLabel = extractGroupLabel(firstEl) || name;
      
      const match = matchLabel(groupLabel);
      if (match) {
        mapping.push({
          fieldId: group.firstId, // Use first element's ID to anchor the group
          profileField: match.profileField,
          controlType: 'radio',
          person: determinePersonContext(firstEl, groupLabel),
          confidence: match.confidence
        });
      }
    }

    console.log(`[FormFriend][ScannerStub] Found ${fields.length} fields, mapped ${mapping.length}`);
    return { fields, mapping };
  }

  function hasForm() {
    return document.querySelectorAll('form').length > 0 ||
           document.querySelectorAll('input, select, textarea').length > 2;
  }

  return {
    scanAndMap,
    hasForm,
    extractLabel,
    extractGroupLabel,
    matchLabel,
    determinePersonContext
  };
})();
