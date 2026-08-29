/**
 * Unified extension message passing helper.
 * Reports unavailable chrome.runtime channels explicitly in web browser previews.
 * Enhanced with retry logic and promise rejections for enterprise readiness.
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export const extMessaging = {
  async sendMessage(message: { action: string; payload?: any }, retryCount = 0): Promise<any> {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      return new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[extMessaging] Error sending message:', chrome.runtime.lastError.message);
              // Handle "receiving end does not exist" gracefully with retries
              if (chrome.runtime.lastError.message?.includes('receiving end does not exist') && retryCount < MAX_RETRIES) {
                console.log(`[extMessaging] Retrying message (${retryCount + 1}/${MAX_RETRIES})...`);
                setTimeout(() => {
                  resolve(this.sendMessage(message, retryCount + 1));
                }, RETRY_DELAY_MS);
              } else {
                reject(chrome.runtime.lastError);
              }
            } else {
              resolve(response);
            }
          });
        } catch (err) {
          console.error('[extMessaging] Critical exception during sendMessage:', err);
          reject(err);
        }
      });
    } else {
      // Web previews cannot inspect the active browser tab or reach a Manifest V3 service worker.
      return new Promise((resolve) => {
        console.log('[Web Preview Messaging] Runtime unavailable for message:', message);
        
        const event = new CustomEvent('talentsphere-extension-msg', { detail: message });
        window.dispatchEvent(event);

        setTimeout(() => {
          if (message.action === 'analyze_page') {
            resolve({
              status: 'error',
              error: 'Page scanning requires the Chrome extension runtime.'
            });
          } else if (message.action === 'ping') {
            resolve({
              status: 'unavailable',
              error: 'Chrome extension runtime is unavailable in this web preview.'
            });
          } else {
            resolve({
              status: 'unavailable',
              error: 'Chrome extension runtime is unavailable in this web preview.'
            });
          }
        }, 150);
      });
    }
  },

  onMessage(callback: (message: any, sendResponse: (response: any) => void) => void): () => void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      const listener = (message: any, _sender: any, sendResponse: any) => {
        try {
          callback(message, sendResponse);
          return true; // Keep channel open for async response
        } catch (err) {
          console.error('[extMessaging] Error in message listener callback:', err);
          sendResponse({ status: 'error', error: String(err) });
          return false;
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    } else {
      // Web previews can observe local events, but they do not provide a real background response path.
      const webListener = (event: Event) => {
        try {
          const customEvent = event as CustomEvent;
          console.log('[Web Preview Messaging] Received local message event:', customEvent.detail);
          callback(customEvent.detail, (response) => {
            console.log('[Web Preview Messaging] Ignored local response without chrome.runtime:', response);
          });
        } catch (err) {
          console.error('[Web Preview Messaging] Error in local message listener:', err);
        }
      };
      window.addEventListener('talentsphere-extension-msg', webListener);
      return () => window.removeEventListener('talentsphere-extension-msg', webListener);
    }
  }
};
