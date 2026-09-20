/**
 * FormFriend — Autofill Engine
 * Updated to handle forcedDateFormats and expose findMatchingOption.
 */
var FormFriendAutofill = (function () {
  'use strict';

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  const nativeCheckboxSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;

  function dispatchInputEvent(element) { element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true })); }
  function dispatchChangeEvent(element) { element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true })); }
  function dispatchBlurEvent(element) { element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: false, composed: true })); }
  function dispatchFocusEvent(element) { element.dispatchEvent(new Event('focus', { bubbles: true, cancelable: false, composed: true })); }

  function fillTextInput(element, value) {
    dispatchFocusEvent(element);
    if (nativeInputValueSetter) nativeInputValueSetter.call(element, value); else element.value = value;
    dispatchInputEvent(element); dispatchChangeEvent(element); dispatchBlurEvent(element);
  }

  function fillDateInput(element, value, controlType, datePart, forcedDateFormat) {
    dispatchFocusEvent(element);
    
    let formatted = value;
    
    if (controlType === 'segmented-date' && datePart && value.includes('-')) {
      const parts = value.split('-'); // 2007-05-22 -> [2007, 05, 22]
      if (parts.length === 3) {
        if (datePart === 'dd') formatted = parts[2];
        if (datePart === 'mm') formatted = parts[1];
        if (datePart === 'yyyy') formatted = parts[0];
      }
    } else {
      if (forcedDateFormat && value.includes('-')) {
        const [y, m, d] = value.split('-');
        if (forcedDateFormat === 'DD/MM/YYYY') formatted = `${d}/${m}/${y}`;
        else if (forcedDateFormat === 'MM/DD/YYYY') formatted = `${m}/${d}/${y}`;
        else if (forcedDateFormat === 'YYYY-MM-DD') formatted = `${y}-${m}-${d}`;
        else if (forcedDateFormat === 'DD-MM-YYYY') formatted = `${d}-${m}-${y}`;
      } else {
        const p = (element.placeholder || '').toLowerCase();
        if (value.includes('-')) {
          const [y, m, d] = value.split('-');
          if (p.includes('dd/mm/yyyy')) formatted = `${d}/${m}/${y}`;
          else if (p.includes('mm/dd/yyyy')) formatted = `${m}/${d}/${y}`;
          else if (p.includes('dd-mm-yyyy')) formatted = `${d}-${m}-${y}`;
          else if (element.type === 'date') formatted = `${y}-${m}-${d}`;
        }
      }
    }

    if (nativeInputValueSetter) nativeInputValueSetter.call(element, formatted);
    else element.value = formatted;
    
    dispatchInputEvent(element); dispatchChangeEvent(element); dispatchBlurEvent(element);
  }

  function fillTextarea(element, value) {
    dispatchFocusEvent(element);
    if (nativeTextareaValueSetter) nativeTextareaValueSetter.call(element, value); else element.value = value;
    dispatchInputEvent(element); dispatchChangeEvent(element); dispatchBlurEvent(element);
  }

  function findMatchingOption(value, options) {
    if (!value || !options) return null;
    const normalized = String(value).toLowerCase().trim();
    for (const opt of options) if (opt.value.toLowerCase().trim() === normalized) return opt;
    for (const opt of options) if (opt.text.toLowerCase().trim() === normalized) return opt;
    for (const opt of options) if (opt.text.toLowerCase().trim().includes(normalized) || normalized.includes(opt.text.toLowerCase().trim())) return opt;
    return null;
  }

  function fillSelect(element, value) {
    dispatchFocusEvent(element);
    const optionsArray = Array.from(element.options).map(o => ({ value: o.value, text: o.text }));
    const matchedOption = findMatchingOption(value, optionsArray);

    if (matchedOption) {
      if (nativeSelectValueSetter) nativeSelectValueSetter.call(element, matchedOption.value);
      else element.value = matchedOption.value;
      dispatchInputEvent(element); dispatchChangeEvent(element); dispatchBlurEvent(element);
      return true;
    }
    return false;
  }

  function fillCheckbox(element, value) {
    const shouldCheck = (value === true || value === 'true' || value === 'yes' || value === '1' || value === 1);
    if (element.checked !== shouldCheck) {
      dispatchFocusEvent(element);
      if (nativeCheckboxSetter) nativeCheckboxSetter.call(element, shouldCheck); else element.checked = shouldCheck;
      dispatchInputEvent(element); dispatchChangeEvent(element); dispatchBlurEvent(element);
    }
  }

  function fillRadio(element, value) {
    const name = element.name;
    if (!name) {
      if (nativeCheckboxSetter) nativeCheckboxSetter.call(element, true); else element.checked = true;
      dispatchInputEvent(element); dispatchChangeEvent(element); return;
    }
    const normalizedValue = String(value).toLowerCase().trim();
    const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
    let matchedRadio = null;
    
    for (const radio of radios) {
      if (radio.value.toLowerCase().trim() === normalizedValue) { matchedRadio = radio; break; }
    }
    if (!matchedRadio) {
      for (const radio of radios) {
        let labelText = '';
        if (radio.id) {
          const label = document.querySelector(`label[for="${radio.id}"]`);
          if (label) labelText = label.textContent.toLowerCase().trim();
        }
        if (!labelText) {
          const parentLabel = radio.closest('label');
          if (parentLabel) labelText = parentLabel.textContent.toLowerCase().trim();
        }
        if (labelText === normalizedValue || labelText.includes(normalizedValue)) { matchedRadio = radio; break; }
      }
    }

    if (matchedRadio && !matchedRadio.checked) {
      dispatchFocusEvent(matchedRadio);
      if (nativeCheckboxSetter) nativeCheckboxSetter.call(matchedRadio, true); else matchedRadio.checked = true;
      dispatchInputEvent(matchedRadio); dispatchChangeEvent(matchedRadio); dispatchBlurEvent(matchedRadio);
    }
  }

  function fillField(element, value, inputType, controlType, datePart, forcedDateFormat) {
    if (!element) return { success: false, error: 'Element is null' };
    if (value === undefined || value === null) return { success: false, error: 'Value is null' };

    try {
      const tag = element.tagName.toLowerCase();
      const type = inputType || element.type || 'text';

      if (tag === 'textarea') {
        fillTextarea(element, value);
      } else if (tag === 'select') {
        const matched = fillSelect(element, value);
        if (!matched) return { success: false, error: `No option for "${value}"` };
      } else if (tag === 'input') {
        if (controlType === 'segmented-date' || type === 'date' || forcedDateFormat) {
          fillDateInput(element, value, controlType, datePart, forcedDateFormat);
        } else {
          switch (type) {
            case 'checkbox': fillCheckbox(element, value); break;
            case 'radio': fillRadio(element, value); break;
            default: fillTextInput(element, value); break;
          }
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function fillResolvedFields(resolvedFields) {
    const results = { filled: [], skipped: [], errors: [] };
    for (const item of resolvedFields) {
      const { fieldId, value, profileField, controlType, datePart, forcedDateFormat } = item;
      const element = FormFriendFieldRegistry.getElement(fieldId);
      
      if (!element) { results.errors.push({ fieldId, error: 'DOM element not found' }); continue; }
      if (value === undefined || value === null || value === '') { results.skipped.push({ fieldId, reason: 'Empty value' }); continue; }

      const result = fillField(element, value, element.type, controlType, datePart, forcedDateFormat);
      if (result.success) results.filled.push({ fieldId, profileField, value });
      else results.errors.push({ fieldId, profileField, error: result.error });
    }
    return results;
  }

  return { fillField, fillResolvedFields, findMatchingOption };
})();
