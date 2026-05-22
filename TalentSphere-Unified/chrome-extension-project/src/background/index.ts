/**
 * Background Service Worker (Manifest V3)
 * Enhanced with proper lifecycle events and robust error boundaries.
 */

console.log('[Background Service Worker] Active and listening...');

if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Listen for installation callback
  chrome.runtime.onInstalled.addListener((details) => {
    try {
      if (details.reason === 'install') {
        console.log('[Background Service Worker] TalentSphere Companion freshly installed.');
        // Initialize default storage states here if needed
      } else if (details.reason === 'update') {
        console.log('[Background Service Worker] Extension updated to new version.');
      }
    } catch (err) {
      console.error('[Background Service Worker] Error during onInstalled execution:', err);
    }
  });

  // Listener for message routing
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      console.log('[Background Service Worker] Message received:', message);

      if (message.action === 'ping') {
        sendResponse({ status: 'active', timestamp: Date.now() });
      } else if (message.action === 'analyze_page') {
        // Here we could inject a script or process data
        sendResponse({ status: 'success', summary: 'Parsed job details on mock page.' });
      } else {
        console.warn('[Background Service Worker] Unhandled message action:', message.action);
        sendResponse({ status: 'unhandled' });
      }
    } catch (err) {
      console.error('[Background Service Worker] Exception while handling message:', err);
      sendResponse({ status: 'error', error: String(err) });
    }
    
    return true; // Keeps messaging port open for async handling
  });
}
