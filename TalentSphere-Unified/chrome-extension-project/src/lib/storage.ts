/**
 * Dual-mode storage helper
 * Automatically falls back to standard browser localStorage when Chrome Extension Storage is unavailable.
 * Enhanced with try-catch and logging for enterprise readiness.
 */
export const extStorage = {
  async get(key: string): Promise<any> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError) {
              console.error('[extStorage] Error getting key:', key, chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve(result[key]);
            }
          });
        } catch (err) {
          console.error('[extStorage] Exception during get:', err);
          reject(err);
        }
      });
    } else {
      try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : undefined;
      } catch (e) {
        console.warn('[extStorage] Error parsing local storage for key:', key, e);
        return localStorage.getItem(key);
      }
    }
  },

  async set(key: string, value: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
              console.error('[extStorage] Error setting key:', key, chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (err) {
          console.error('[extStorage] Exception during set:', err);
          reject(err);
        }
      });
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.error('[extStorage] Error setting local storage for key:', key, err);
      }
    }
  },

  async remove(key: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
              console.error('[extStorage] Error removing key:', key, chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (err) {
          console.error('[extStorage] Exception during remove:', err);
          reject(err);
        }
      });
    } else {
      localStorage.removeItem(key);
    }
  },

  async clear(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
              console.error('[extStorage] Error clearing storage:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (err) {
          console.error('[extStorage] Exception during clear:', err);
          reject(err);
        }
      });
    } else {
      localStorage.clear();
    }
  }
};
