import {
  migrateExtensionStorageSnapshot,
  summarizeExtensionStorageMigration,
  type ExtensionStorageMigrationPatch,
  type ExtensionStorageSnapshot
} from './storageMigrations';

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
        throw err;
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

const hasChromeLocalStorage = () => (
  typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
);

const readChromeStorageSnapshot = async (): Promise<ExtensionStorageSnapshot> => new Promise((resolve, reject) => {
  try {
    chrome.storage.local.get(null, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result || {});
    });
  } catch (err) {
    reject(err);
  }
});

const readWebStorageSnapshot = (): ExtensionStorageSnapshot => {
  const snapshot: ExtensionStorageSnapshot = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    const value = localStorage.getItem(key);
    try {
      snapshot[key] = value ? JSON.parse(value) : value;
    } catch {
      snapshot[key] = value;
    }
  }

  return snapshot;
};

const applyChromeStoragePatch = async (patch: ExtensionStorageMigrationPatch) => new Promise<void>((resolve, reject) => {
  try {
    const applySet = () => {
      if (Object.keys(patch.set).length === 0) {
        resolve();
        return;
      }

      chrome.storage.local.set(patch.set, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    };

    if (patch.remove.length > 0) {
      chrome.storage.local.remove(patch.remove, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        applySet();
      });
      return;
    }

    applySet();
  } catch (err) {
    reject(err);
  }
});

const applyWebStoragePatch = (patch: ExtensionStorageMigrationPatch) => {
  for (const key of patch.remove) {
    localStorage.removeItem(key);
  }

  for (const [key, value] of Object.entries(patch.set)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const migrateExtensionStorage = async (nowIso = new Date().toISOString()) => {
  const snapshot = hasChromeLocalStorage()
    ? await readChromeStorageSnapshot()
    : readWebStorageSnapshot();
  const patch = migrateExtensionStorageSnapshot(snapshot, nowIso);

  if (patch.changed) {
    if (hasChromeLocalStorage()) {
      await applyChromeStoragePatch(patch);
    } else {
      applyWebStoragePatch(patch);
    }
  }

  return summarizeExtensionStorageMigration(patch);
};
