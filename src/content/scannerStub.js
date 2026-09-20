/**
 * FormFriend — Scanner Stub
 * Updated with URL parsing, select option gathering, and unknown date format detection.
 */
var FormFriendScannerStub = (function () {
  'use strict';

  const LABEL_RULES = [
    { patterns: ['first name', 'given name', 'forename'], profileField: 'firstName' },
    { patterns: ['middle name', 'middle initial'], profileField: 'middleName' },
    { patterns: ['last name', 'surname', 'family name'], profileField: 'lastName' },
    { patterns: ['full name', 'name', 'applicant identity', 'your name', 'student name', 'candidate name'], profileField: 'fullName' },
    { patterns: ['email', 'e-mail', 'electronic mail', 'email address', 'mail'], profileField: 'email' },
    { patterns: ['alternate phone', 'alt phone'], profileField: 'alternatePhone' },
    { patterns: ['phone', 'mobile', 'telephone', 'contact number', 'reach me at', 'phone number', 'mobile number'], profileField: 'phone' },
    { patterns: ['date of birth', 'dob', 'birth date', 'birthday', 'birth information', 'born on'], profileField: 'dateOfBirth' },
    { patterns: ['age'], profileField: 'age' },
    { patterns: ['college', 'university', 'institution', 'school', 'institution attended'], profileField: 'college' },
    { patterns: ['department', 'dept', 'branch', 'discipline', 'major', 'field of study'], profileField: 'department' },
    { patterns: ['course', 'degree'], profileField: 'course' },
    { patterns: ['semester', 'sem', 'term', 'year of study', 'current semester'], profileField: 'semester' },
    { patterns: ['education', 'highest education', 'qualification'], profileField: 'education' },
    { patterns: ['passport', 'passport number', 'passport no'], profileField: 'passportNumber' },
    { patterns: ['aadhaar', 'aadhaar number', 'aadhar', 'aadhar no'], profileField: 'aadhaarNumber' },
    { patterns: ['blood group', 'blood type'], profileField: 'bloodGroup' },
    { patterns: ['linkedin', 'linkedin url', 'linkedin profile'], profileField: 'linkedinUrl' },
    { patterns: ['github', 'github url', 'github profile'], profileField: 'githubUrl' },
    { patterns: ['portfolio', 'portfolio url', 'portfolio link'], profileField: 'portfolioUrl' },
    { patterns: ['website', 'personal website', 'blog'], profileField: 'websiteUrl' },
    { patterns: ['occupation', 'profession', 'job'], profileField: 'occupation' },
    { patterns: ['nationality', 'citizenship'], profileField: 'nationality' },
    { patterns: ['address', 'present address', 'permanent address'], profileField: 'address' },
    { patterns: ['house number', 'flat number', 'building'], profileField: 'houseNumber' },
    { patterns: ['street', 'road', 'lane'], profileField: 'street' },
    { patterns: ['area', 'locality', 'sector'], profileField: 'area' },
    { patterns: ['village', 'town'], profileField: 'village' },
    { patterns: ['city'], profileField: 'city' },
    { patterns: ['district'], profileField: 'district' },
    { patterns: ['state', 'province'], profileField: 'state' },
    { patterns: ['pincode', 'pin code', 'zip', 'zipcode', 'postal code'], profileField: 'pincode' },
    { patterns: ['gender', 'sex', 'gender identity'], profileField: 'gender' },
    { patterns: ['marital status', 'civil status', 'relationship status'], profileField: 'maritalStatus' },
    { patterns: ['country', 'nation', 'country of residence'], profileField: 'country' },
    { patterns: ['student', 'are you a student', 'currently a student'], profileField: 'student' }
  ];

  const CONSENT_KEYWORDS = ['agree', 'terms', 'conditions', 'privacy', 'consent', 'marketing', 'certify', 'authorize', 'accept', 'acknowledge', 'i understand'];

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
    if (element.name) return element.name.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim();
    return '';
  }

  function extractGroupLabel(element) {
    const fieldset = element.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) return legend.textContent.trim();
    }
    const parentDiv = element.closest('div');
    if (parentDiv) {
      const header = parentDiv.querySelector('h1, h2, h3, h4, h5, h6, strong, label:not([for])');
      if (header && !header.contains(element)) return header.textContent.trim();
    }
    if (element.name) return element.name.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim();
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
      const txts = [];
      if (current.tagName === 'FIELDSET') {
        const legend = current.querySelector('legend');
        if (legend) txts.push(legend.textContent.toLowerCase());
      }
      if (current.tagName === 'SECTION' || current.className.toLowerCase().includes('section') || current.tagName === 'DIV') {
        const h = current.querySelector('h1, h2, h3, h4, h5, h6');
        if (h) txts.push(h.textContent.toLowerCase());
      }
      for (const txt of txts) {
        if (txt.includes('father')) return 'father';
        if (txt.includes('mother')) return 'mother';
        if (txt.includes('spouse')) return 'spouse';
        if (txt.includes('nominee')) return 'nominee';
        if (txt.includes('employer')) return 'employer';
        if (txt.includes('co-applicant') || txt.includes('coapplicant')) return 'coApplicant';
        if (txt.includes('parent') || txt.includes('guardian')) return 'parentGuardian';
        if (txt.includes('emergency')) return 'emergencyContact';
        if (txt.includes('relative')) return 'relative';
        if (txt.includes('applicant') || txt.includes('personal') || txt.includes('your') || txt.includes('self')) return 'self';
      }
      current = current.parentElement;
    }

    const txt = labelText.toLowerCase();
    if (txt.includes('father')) return 'father';
    if (txt.includes('mother')) return 'mother';
    if (txt.includes('spouse')) return 'spouse';
    if (txt.includes('nominee')) return 'nominee';
    if (txt.includes('employer')) return 'employer';
    if (txt.includes('co-applicant') || txt.includes('coapplicant')) return 'coApplicant';
    if (txt.includes('parent') || txt.includes('guardian')) return 'parentGuardian';
    if (txt.includes('emergency')) return 'emergencyContact';
    if (txt.includes('relative')) return 'relative';
    if (txt.includes('applicant') || txt.includes('your') || txt.includes('self')) return 'self';

    return 'unknown';
  }

  function scanAndMap() {
    FormFriendFieldRegistry.clearRegistry();

    const selectors = 'input, select, textarea';
    const elements = document.querySelectorAll(selectors);
    const fields = [];
    const mapping = [];
    const radioGroups = {};
    let index = 0;

    for (const element of elements) {
      const type = (element.type || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) continue;
      if (type === 'file' || element.accept) {
        console.log(`[FormFriend] Skipping file upload field.`);
        continue;
      }
      if (element.id.toLowerCase().includes('captcha') || element.name.toLowerCase().includes('captcha')) {
        console.log(`[FormFriend] Skipping captcha field.`);
        continue;
      }
      if (element.offsetParent === null && type !== 'hidden') {
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
      }

      const fieldId = `ff_${index++}`;
      if (type === 'radio') {
        const groupName = element.name || fieldId;
        if (!radioGroups[groupName]) radioGroups[groupName] = { elements: [], firstId: fieldId };
        radioGroups[groupName].elements.push(element);
        FormFriendFieldRegistry.registerField(fieldId, element);
        continue;
      }

      const label = extractLabel(element);
      FormFriendFieldRegistry.registerField(fieldId, element);
      fields.push({ fieldId, element, label, type: type || element.tagName.toLowerCase(), name: element.name || '', id: element.id || '', placeholder: element.placeholder || '' });

      if (isConsentCheckbox(label, element)) {
        console.log(`[FormFriend] Skipping legal/consent checkbox: "${label}"`);
        continue;
      }
      
      const match = matchLabel(label);
      if (match) {
        const person = determinePersonContext(element, label);
        let controlType = element.tagName.toLowerCase() === 'select' ? 'select' : type;
        
        let options = null;
        if (controlType === 'select') {
          options = Array.from(element.options).map(o => ({ value: o.value, text: o.text }));
        }

        let dateFormat = null;
        if (match.profileField === 'dateOfBirth' && element.tagName.toLowerCase() === 'input') {
           const str = (element.placeholder + ' ' + element.name + ' ' + label).toLowerCase();
           let part = null;
           if (/\\b(dd|day)\\b/.test(str)) part = 'dd';
           else if (/\\b(mm|month)\\b/.test(str)) part = 'mm';
           else if (/\\b(yyyy|year)\\b/.test(str)) part = 'yyyy';
           
           if (part) {
             mapping.push({ fieldId, profileField: match.profileField, controlType: 'segmented-date', datePart: part, person, confidence: match.confidence, label });
             continue;
           }

           if (type === 'text') {
             if (!str.includes('dd/mm/yyyy') && !str.includes('mm/dd/yyyy') && !str.includes('dd-mm-yyyy') && !str.includes('yyyy-mm-dd') && !str.includes('ddmmyyyy')) {
                dateFormat = 'unknown';
             }
           }
        }
        
        mapping.push({ fieldId, profileField: match.profileField, controlType, confidence: match.confidence, person, options, dateFormat, label });
      } else {
        // Not matched automatically. Push it to unknown so we can collect it.
        const person = determinePersonContext(element, label);
        const profileField = (element.name || label.replace(/\\s+/g, '')).substring(0, 30) || fieldId;
        
        let options = null;
        if (element.tagName.toLowerCase() === 'select') {
          options = Array.from(element.options).map(o => ({ value: o.value, text: o.text }));
        }

        mapping.push({
           fieldId,
           profileField: profileField,
           controlType: element.tagName.toLowerCase() === 'select' ? 'select' : type,
           confidence: 0,
           person,
           options,
           label: label || element.placeholder || element.name || 'Unknown Field',
           isUnknown: true
        });
      }
    }

    for (const [name, group] of Object.entries(radioGroups)) {
      const firstEl = group.elements[0];
      const groupLabel = extractGroupLabel(firstEl) || name;
      const match = matchLabel(groupLabel);
      
      const options = group.elements.map(e => {
         let optText = e.value;
         if (e.id) {
           const l = document.querySelector(`label[for="${e.id}"]`);
           if (l) optText = l.textContent.trim();
         }
         return { value: e.value, text: optText };
      });

      if (match) {
        mapping.push({ fieldId: group.firstId, profileField: match.profileField, controlType: 'radio', person: determinePersonContext(firstEl, groupLabel), confidence: match.confidence, options, label: groupLabel });
      } else {
        mapping.push({ fieldId: group.firstId, profileField: name, controlType: 'radio', person: determinePersonContext(firstEl, groupLabel), confidence: 0, options, label: groupLabel, isUnknown: true });
      }
    }

    return { fields, mapping };
  }

  function hasForm() { return document.querySelectorAll('form').length > 0 || document.querySelectorAll('input, select, textarea').length > 2; }
  return { scanAndMap, hasForm, extractLabel, extractGroupLabel, matchLabel, determinePersonContext };
})();
