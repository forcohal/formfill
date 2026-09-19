/**
 * FormFriend — Backend API Integration (Privacy-Safe)
 *
 * Sends ONLY structural/anonymised form metadata to the backend.
 * NEVER sends actual profile values (name, DOB, phone, email, etc.)
 *
 * The backend returns field mappings, which the autofill engine
 * then resolves against the LOCAL profile.
 */

// eslint-disable-next-line no-var
var FormFriendAPI = (function () {
  'use strict';

  // TODO: Replace with actual API Gateway URL when Team B provides it
  const API_BASE_URL = 'https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/prod';

  // Fields that are NEVER allowed in outgoing requests
  const PII_FIELDS = [
    'fullName', 'name', 'email', 'phone', 'mobile',
    'dateOfBirth', 'dob', 'college', 'department',
    'semester', 'address', 'password'
  ];

  /**
   * Privacy guard: strips any PII values that may have accidentally
   * been included in the request payload.
   *
   * @param {Object} payload  The request body
   * @returns {Object}  Sanitised payload
   */
  function sanitizePayload(payload) {
    const sanitized = JSON.parse(JSON.stringify(payload)); // deep clone

    // Check top-level keys
    for (const key of PII_FIELDS) {
      if (sanitized[key] !== undefined) {
        console.warn(`[FormFriend][API] BLOCKED PII field "${key}" from being sent to backend.`);
        delete sanitized[key];
      }
    }

    // Check inside fields array
    if (Array.isArray(sanitized.fields)) {
      for (const field of sanitized.fields) {
        // Remove any "value" key — we should never send actual values
        if (field.value !== undefined) {
          console.warn(`[FormFriend][API] BLOCKED field value from being sent to backend.`);
          delete field.value;
        }
      }
    }

    return sanitized;
  }

  /**
   * Send form structure to the backend for mapping.
   *
   * @param {string} domain         e.g. "example.com"
   * @param {string} formFingerprint  Hash of form structure
   * @param {Array}  fields         Structural field info (no values!)
   * @returns {Promise<Object>}     Backend mapping response
   */
  async function getMappingFromBackend(domain, formFingerprint, fields) {
    const payload = sanitizePayload({
      domain,
      formFingerprint,
      fields: fields.map(f => ({
        fieldId: f.fieldId,
        name: f.name || '',
        id: f.id || '',
        label: f.label || '',
        placeholder: f.placeholder || '',
        type: f.type || 'text',
        section: f.section || ''
      }))
    });

    try {
      const response = await fetch(`${API_BASE_URL}/analyze-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('[FormFriend][API] Backend unavailable:', error.message);
      return null; // Graceful fallback — the extension works without the backend
    }
  }

  /**
   * Check if the backend is reachable.
   * @returns {Promise<boolean>}
   */
  async function isBackendAvailable() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Public API
  return {
    getMappingFromBackend,
    isBackendAvailable,
    sanitizePayload  // Exported for testing
  };
})();
