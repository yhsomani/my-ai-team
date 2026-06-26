/**
 * Background Service Worker (Manifest V3)
 * Enhanced with proper lifecycle events and robust error boundaries.
 */

import {
  DEFAULT_JOB_STATUS,
  JOB_SCAN_DRAFT_STORAGE_KEY,
  type JobScanDraft,
  type PageScanMetadata
} from '../lib/jobTypes';
import {
  categorizeExtensionError,
  recordExtensionOperationalEvent,
  sourceCategoryFromHost,
  textLengthBand
} from '../lib/operationalAnalytics';

console.log('[Background Service Worker] Active and listening...');

const normalizeText = (value?: string | null) => (value || '').replace(/\s+/g, ' ').trim();

const hostFromUrl = (url?: string) => {
  if (!url) {
    return '';
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const parseTitle = (title?: string) => {
  const cleaned = normalizeText(title);
  const atParts = cleaned.split(/\s+at\s+/i);

  if (atParts.length >= 2) {
    return {
      role: normalizeText(atParts[0]),
      company: normalizeText(atParts.slice(1).join(' at ').split(/\s(?:-|\|)\s/)[0])
    };
  }

  const splitParts = cleaned.split(/\s(?:-|\|)\s/).map(normalizeText).filter(Boolean);

  return {
    role: splitParts[0] || cleaned,
    company: splitParts.length > 1 ? splitParts[1] : ''
  };
};

const getActiveTab = () =>
  new Promise<chrome.tabs.Tab | undefined>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn('[Background Service Worker] Could not query active tab:', chrome.runtime.lastError.message);
        void recordExtensionOperationalEvent({
          area: 'background',
          event: 'active_tab_query_failed',
          metadata: {
            error_category: categorizeExtensionError(chrome.runtime.lastError.message)
          }
        });
        resolve(undefined);
        return;
      }

      resolve(tabs[0]);
    });
  });

const scrapeActiveTab = (tabId: number) =>
  new Promise<PageScanMetadata | undefined>((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'scrape_job_metadata' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Background Service Worker] Content scrape unavailable:', chrome.runtime.lastError.message);
        void recordExtensionOperationalEvent({
          area: 'page_scan',
          event: 'content_scrape_unavailable',
          metadata: {
            content_scrape_available: false,
            error_category: categorizeExtensionError(chrome.runtime.lastError.message)
          }
        });
        resolve(undefined);
        return;
      }

      if (response?.status === 'success') {
        void recordExtensionOperationalEvent({
          area: 'page_scan',
          event: 'content_scrape_succeeded',
          metadata: {
            content_scrape_available: true,
            role_present: Boolean(response.role),
            company_present: Boolean(response.company),
            posting_url_present: Boolean(response.url),
            source_category: sourceCategoryFromHost(response.source),
            metadata_confidence: response.confidence,
            description_length_band: textLengthBand(response.description)
          }
        });
        resolve(response as PageScanMetadata);
        return;
      }

      resolve(undefined);
    });
  });

const persistDraft = (draft: JobScanDraft) =>
  new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ [JOB_SCAN_DRAFT_STORAGE_KEY]: draft }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });

const buildDraft = (metadata: PageScanMetadata | undefined, tab: chrome.tabs.Tab | undefined): JobScanDraft => {
  const url = normalizeText(metadata?.url || tab?.url || '');
  const source = normalizeText(metadata?.source || hostFromUrl(url) || 'active-tab');
  const parsedTitle = parseTitle(metadata?.rawTitle || tab?.title);
  const description = normalizeText(metadata?.description);
  const role = normalizeText(metadata?.role) || parsedTitle.role || 'Current page';
  const company = normalizeText(metadata?.company) || parsedTitle.company;
  const notes = description ? `Scanned page excerpt: ${description.slice(0, 320)}` : '';
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `scan-${Date.now()}`;

  return {
    id,
    company,
    role,
    status: DEFAULT_JOB_STATUS,
    url,
    source,
    notes,
    scannedAt: new Date().toISOString(),
    confidence: metadata?.confidence || (company && role ? 'medium' : 'low'),
    rawTitle: metadata?.rawTitle || tab?.title
  };
};

const analyzeActivePage = async () => {
  void recordExtensionOperationalEvent({
    area: 'page_scan',
    event: 'background_scan_started',
    metadata: {
      message_action: 'analyze_page'
    }
  });

  const tab = await getActiveTab();

  if (!tab?.id) {
    void recordExtensionOperationalEvent({
      area: 'page_scan',
      event: 'background_scan_failed',
      metadata: {
        active_tab_available: false,
        error_category: 'active_tab_unavailable'
      }
    });
    return { status: 'error', error: 'No active tab is available to scan.' };
  }

  const metadata = await scrapeActiveTab(tab.id);
  const draft = buildDraft(metadata, tab);
  await persistDraft(draft);
  void recordExtensionOperationalEvent({
    area: 'page_scan',
    event: 'background_draft_persisted',
    metadata: {
      active_tab_available: true,
      scrape_available: Boolean(metadata),
      draft_confidence: draft.confidence,
      draft_status: draft.status,
      source_category: sourceCategoryFromHost(draft.source),
      role_present: Boolean(draft.role),
      company_present: Boolean(draft.company),
      posting_url_present: Boolean(draft.url),
      details_present: Boolean(draft.notes),
      description_length_band: textLengthBand(draft.notes)
    }
  });

  return {
    status: 'success',
    summary: `Drafted ${draft.role}${draft.company ? ` at ${draft.company}` : ''} for review.`,
    draft
  };
};

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
        void recordExtensionOperationalEvent({
          area: 'background',
          event: 'message_handled',
          metadata: {
            message_action: 'ping',
            response_status: 'active'
          }
        });
        sendResponse({ status: 'active', timestamp: Date.now() });
      } else if (message.action === 'analyze_page') {
        analyzeActivePage()
          .then(sendResponse)
          .catch((err) => {
            console.error('[Background Service Worker] Page analysis failed:', err);
            void recordExtensionOperationalEvent({
              area: 'page_scan',
              event: 'background_scan_failed',
              metadata: {
                error_category: categorizeExtensionError(err)
              }
            });
            sendResponse({ status: 'error', error: String(err) });
          });
      } else {
        console.warn('[Background Service Worker] Unhandled message action:', message.action);
        void recordExtensionOperationalEvent({
          area: 'background',
          event: 'message_unhandled',
          metadata: {
            message_action: String(message.action || 'missing_action'),
            response_status: 'unhandled'
          }
        });
        sendResponse({ status: 'unhandled' });
      }
    } catch (err) {
      console.error('[Background Service Worker] Exception while handling message:', err);
      void recordExtensionOperationalEvent({
        area: 'background',
        event: 'message_failed',
        metadata: {
          message_action: String(message?.action || 'missing_action'),
          error_category: categorizeExtensionError(err)
        }
      });
      sendResponse({ status: 'error', error: String(err) });
    }
    
    return true; // Keeps messaging port open for async handling
  });
}
