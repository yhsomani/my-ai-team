import { useState, useEffect, useRef } from 'react';
import { extStorage } from '../lib/storage';

export type ChromeStorageOperation = 'load' | 'save';

export interface ChromeStorageIssue {
  key: string;
  operation: ChromeStorageOperation;
  occurredAt: string;
}

/**
 * Custom React hook to sync state reactively with storage (extension or web local storage).
 * Upgraded with cross-context reactive synchronization and race-condition-free functional setters.
 */
export function useChromeStorage<T>(
  key: string,
  initialValue: T
): [T, (val: T | ((curr: T) => T)) => Promise<void>, boolean, ChromeStorageIssue | null] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [storageIssue, setStorageIssue] = useState<ChromeStorageIssue | null>(null);

  // Maintain a ref to the latest state to avoid closure stale-state issues in functional updates
  const stateRef = useRef<T>(storedValue);
  const initialValueRef = useRef<T>(initialValue);

  useEffect(() => {
    stateRef.current = storedValue;
  }, [storedValue]);

  // Initial load
  useEffect(() => {
    async function loadStored() {
      try {
        const val = await extStorage.get(key);
        if (val !== undefined) {
          setStoredValue(val);
        }
        setStorageIssue(null);
      } catch (err) {
        console.error(`[useChromeStorage] Error loading key "${key}":`, err);
        setStorageIssue({
          key,
          operation: 'load',
          occurredAt: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    }
    loadStored();
  }, [key]);

  // Storage listener for reactive synchronization across different contexts (popup / options page)
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const handleStorageChange = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string
      ) => {
        if (areaName === 'local' && changes[key]) {
          const newValue = changes[key].newValue;
          setStoredValue(newValue === undefined ? initialValueRef.current : newValue);
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    } else {
      // Sync cross-tab/context localstorage modifications in standard web mode
      const handleWebStorageChange = (e: StorageEvent) => {
        if (e.key === key && e.newValue !== null) {
          try {
            setStoredValue(JSON.parse(e.newValue));
          } catch {
            setStoredValue(e.newValue as any);
          }
        }
      };
      window.addEventListener('storage', handleWebStorageChange);
      return () => {
        window.removeEventListener('storage', handleWebStorageChange);
      };
    }
  }, [key]);

  const setValue = async (value: T | ((curr: T) => T)) => {
    try {
      // Use stateRef.current to make functional state setters bulletproof against stale closures
      const valueToStore = value instanceof Function ? value(stateRef.current) : value;
      setStoredValue(valueToStore);
      await extStorage.set(key, valueToStore);
      setStorageIssue(null);
    } catch (err) {
      console.error(`[useChromeStorage] Error saving key "${key}":`, err);
      setStorageIssue({
        key,
        operation: 'save',
        occurredAt: new Date().toISOString()
      });
    }
  };

  return [storedValue, setValue, loading, storageIssue];
}
