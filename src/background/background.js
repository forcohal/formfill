/**
 * FormFriend — Background Service Worker (Manifest V3)
 *
 * Handles message passing between popup and content scripts.
 * Manages extension-wide state coordination.
 */

// ---------------------------------------------------------------------------
// Extension state (lives in the service worker; survives across popup opens)
// ---------------------------------------------------------------------------
const extensionState = {
  // Per-tab state: tabId → { status, mapping, mismatches }
  tabs: {}
};

function getTabState(tabId) {
  if (!extensionState.tabs[tabId]) {
    extensionState.tabs[tabId] = {
      status: 'idle', // idle | scanning | mapped | reviewing | filled | mismatch
      mapping: null,
      mismatches: null,
      fieldCount: 0
    };
  }
  return extensionState.tabs[tabId];
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : message.tabId;

  switch (message.type) {

    // --- Content script → Background: status updates -----------------------
    case 'FORM_DETECTED': {
      const state = getTabState(tabId);
      state.status = 'scanning';
      sendResponse({ ok: true });
      break;
    }

    case 'MAPPING_READY': {
      const state = getTabState(tabId);
      state.status = 'mapped';
      state.mapping = message.mapping;
      state.fieldCount = message.mapping ? message.mapping.length : 0;
      sendResponse({ ok: true });
      break;
    }

    case 'FILL_COMPLETE': {
      const state = getTabState(tabId);
      state.status = 'filled';
      sendResponse({ ok: true });
      break;
    }

    case 'MISMATCHES_FOUND': {
      const state = getTabState(tabId);
      state.status = 'mismatch';
      state.mismatches = message.mismatches;
      sendResponse({ ok: true });
      break;
    }

    // --- Popup → Background: queries --------------------------------------
    case 'GET_TAB_STATE': {
      if (!tabId) {
        // Popup doesn't know tabId; query the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            sendResponse(getTabState(tabs[0].id));
          } else {
            sendResponse({ status: 'idle' });
          }
        });
        return true; // async sendResponse
      }
      sendResponse(getTabState(tabId));
      break;
    }

    // --- Popup → Content script: relay commands ----------------------------
    case 'START_SCAN':
    case 'START_FILL':
    case 'START_REVIEW':
    case 'CHECK_MISMATCHES': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
            sendResponse(response || { ok: true });
          });
        } else {
          sendResponse({ ok: false, error: 'No active tab' });
        }
      });
      return true; // async sendResponse
    }

    // --- Reset state -------------------------------------------------------
    case 'RESET_STATE': {
      if (tabId) {
        delete extensionState.tabs[tabId];
      }
      sendResponse({ ok: true });
      break;
    }

    default:
      sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
  }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete extensionState.tabs[tabId];
});

// Clean up when a tab navigates to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    delete extensionState.tabs[tabId];
  }
});

console.log('[FormFriend] Background service worker loaded.');
