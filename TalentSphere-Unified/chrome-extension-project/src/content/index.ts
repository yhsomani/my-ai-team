/**
 * Content Script
 */

console.log('[Content Script] Injected and scanning active viewport...');

// Register listeners for DOM inquiries
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      if (message.action === 'scrape_job_metadata') {
        const pageTitle = document.title;
        // Simulate matching standard job portals
        sendResponse({
          status: 'success',
          role: pageTitle || 'Software Engineer',
          company: 'Automated Portal Scan',
          url: window.location.href
        });
        return false; // Synchronous handler
      }
    } catch (err) {
      console.error('[Content Script] Error handling message:', err);
      sendResponse({ status: 'error', error: String(err) });
      return false;
    }
    
    // Return false for unhandled actions to notify Chrome that this listener does not respond,
    // avoiding the "message port closed before a response was received" console warning.
    return false;
  });
}

