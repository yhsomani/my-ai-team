/**
 * Unified extension message passing helper.
 * Simulates standard chrome.runtime message channels in web browser environments.
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
      // Simulate messaging in web environment via CustomEvent
      return new Promise((resolve) => {
        console.log('[Mock Messaging] Sending message:', message);
        
        // Dispatch custom event to simulate content/background listeners
        const event = new CustomEvent('talentsphere-extension-msg', { detail: message });
        window.dispatchEvent(event);

        // Mock a slow background response based on action type
        setTimeout(() => {
          if (message.action === 'analyze_page') {
            resolve({ status: 'success', summary: 'Parsed job details on mock page: Software Engineer at Google.' });
          } else if (message.action === 'optimize_resume') {
            resolve({ 
              status: 'success', 
              suggestions: [
                'Add "Tailwind CSS responsive alignment" to resume skills.',
                'Quantify your backend optimizations by mentioning the 40% memory latency savings.',
                'Emphasize your Spring Boot microservice security architectural designs.'
              ] 
            });
          } else {
            resolve({ status: 'received', message: 'Handled in background worker thread.' });
          }
        }, 800);
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
      // Simulate on web environment
      const webListener = (event: Event) => {
        try {
          const customEvent = event as CustomEvent;
          console.log('[Mock Messaging] Received message event:', customEvent.detail);
          callback(customEvent.detail, (response) => {
            console.log('[Mock Messaging] Mock sending response:', response);
          });
        } catch (err) {
          console.error('[Mock Messaging] Error in simulated web listener:', err);
        }
      };
      window.addEventListener('talentsphere-extension-msg', webListener);
      return () => window.removeEventListener('talentsphere-extension-msg', webListener);
    }
  }
};
