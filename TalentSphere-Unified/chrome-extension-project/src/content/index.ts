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

const normalizeText = (value?: string | null) => (value || '').replace(/\s+/g, ' ').trim();

const pickText = (selectors: string[]) => {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    const text = normalizeText(element?.innerText || element?.textContent);
    if (text) {
      return text;
    }
  }

  return '';
};

const getMetaContent = (name: string) => {
  const element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`);
  return normalizeText(element?.content);
};

const stripPortalSuffix = (value: string) =>
  normalizeText(value)
    .replace(/\s*\|\s*(LinkedIn|Indeed|Glassdoor).*$/i, '')
    .replace(/\s+-\s*(LinkedIn|Indeed|Glassdoor).*$/i, '');

const parseTitle = (title: string) => {
  const cleaned = stripPortalSuffix(title);
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

const buildScanMetadata = (): PageScanMetadata => {
  const source = window.location.hostname.replace(/^www\./, '');
  const title = getMetaContent('og:title') || document.title;
  const parsedTitle = parseTitle(title);
  const role = stripPortalSuffix(pickText(ROLE_SELECTORS) || parsedTitle.role);
  const companyText = stripPortalSuffix(pickText(COMPANY_SELECTORS));
  const siteName = getMetaContent('og:site_name');
  const company = companyText || parsedTitle.company || (/linkedin|indeed|glassdoor/i.test(source) ? '' : siteName);
  const description = pickText(DESCRIPTION_SELECTORS) || getMetaContent('description') || getMetaContent('og:description');
  const confidence: DraftConfidence = role && company ? 'high' : role || company ? 'medium' : 'low';

  return {
    status: 'success',
    role,
    company,
    url: window.location.href,
    source,
    description: normalizeText(description).slice(0, 600),
    rawTitle: document.title,
    confidence
  };
};

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
