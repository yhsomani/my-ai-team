/**
 * Content Script
 */

import type { DraftConfidence, PageScanMetadata } from '../lib/jobTypes';

console.log('[Content Script] Injected and scanning active viewport...');

const ROLE_SELECTORS = [
  '[data-testid="job-title"]',
  '.job-details-jobs-unified-top-card__job-title',
  '.top-card-layout__title',
  '.jobsearch-JobInfoHeader-title',
  'h1'
];

const COMPANY_SELECTORS = [
  '[data-testid="company-name"]',
  '.job-details-jobs-unified-top-card__company-name a',
  '.job-details-jobs-unified-top-card__company-name',
  '.topcard__org-name-link',
  '.jobsearch-InlineCompanyRating div:first-child',
  '[class*="company"] a',
  '[class*="company"]'
];

const DESCRIPTION_SELECTORS = [
  '#job-details',
  '.jobs-description__content',
  '[data-testid="jobDescriptionText"]',
  '.jobsearch-jobDescriptionText',
  '[class*="description"]'
];

export interface PageScanSource {
  hostname: string;
  href: string;
  title: string;
  queryText: (selectors: string[]) => string;
  metaContent: (name: string) => string;
}

export const normalizeScanText = (value?: string | null) => (value || '').replace(/\s+/g, ' ').trim();

const pickText = (selectors: string[]) => {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    const text = normalizeScanText(element?.innerText || element?.textContent);
    if (text) {
      return text;
    }
  }

  return '';
};

const getMetaContent = (name: string) => {
  const element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`);
  return normalizeScanText(element?.content);
};

export const stripPortalSuffix = (value: string) =>
  normalizeScanText(value)
    .replace(/\s*\|\s*(LinkedIn|Indeed|Glassdoor).*$/i, '')
    .replace(/\s+-\s*(LinkedIn|Indeed|Glassdoor).*$/i, '');

export const parseScanTitle = (title: string) => {
  const cleaned = stripPortalSuffix(title);
  const atParts = cleaned.split(/\s+at\s+/i);

  if (atParts.length >= 2) {
    return {
      role: normalizeScanText(atParts[0]),
      company: normalizeScanText(atParts.slice(1).join(' at ').split(/\s(?:-|\|)\s/)[0])
    };
  }

  const splitParts = cleaned.split(/\s(?:-|\|)\s/).map(normalizeScanText).filter(Boolean);

  return {
    role: splitParts[0] || cleaned,
    company: splitParts.length > 1 ? splitParts[1] : ''
  };
};

export const buildScanMetadataFromPage = (page: PageScanSource): PageScanMetadata => {
  const source = page.hostname.replace(/^www\./, '');
  const title = page.metaContent('og:title') || page.title;
  const parsedTitle = parseScanTitle(title);
  const role = stripPortalSuffix(page.queryText(ROLE_SELECTORS) || parsedTitle.role);
  const companyText = stripPortalSuffix(page.queryText(COMPANY_SELECTORS));
  const siteName = page.metaContent('og:site_name');
  const company = companyText || parsedTitle.company || (/linkedin|indeed|glassdoor/i.test(source) ? '' : siteName);
  const description = page.queryText(DESCRIPTION_SELECTORS) || page.metaContent('description') || page.metaContent('og:description');
  const confidence: DraftConfidence = role && company ? 'high' : role || company ? 'medium' : 'low';

  return {
    status: 'success',
    role,
    company,
    url: page.href,
    source,
    description: normalizeScanText(description).slice(0, 600),
    rawTitle: page.title,
    confidence
  };
};

const buildScanMetadata = (): PageScanMetadata => buildScanMetadataFromPage({
  hostname: window.location.hostname,
  href: window.location.href,
  title: document.title,
  queryText: pickText,
  metaContent: getMetaContent,
});

// Register listeners for DOM inquiries
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      if (message.action === 'scrape_job_metadata') {
        sendResponse(buildScanMetadata());
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
