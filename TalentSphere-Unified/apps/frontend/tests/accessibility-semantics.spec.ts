import { expect, test, type Page } from '@playwright/test';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';
import {
  defaultRouteAuditRestFixtures,
  routeAuditCases,
  type RouteAuditCase,
} from './helpers/routeAudit';

type SemanticIssue = {
  issue: string;
  selector: string;
  text: string;
};

const getRouteSemanticIssues = async (page: Page): Promise<SemanticIssue[]> => page.evaluate(() => {
  const issues: SemanticIssue[] = [];

  const isVisible = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0
      && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden';
  };

  const textPreview = (element: Element) => (
    (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  );

  const selectorPreview = (element: Element) => {
    const id = element.id ? `#${element.id}` : '';
    const className = typeof (element as HTMLElement).className === 'string'
      ? (element as HTMLElement).className.trim().split(/\s+/).filter(Boolean).slice(0, 3).map((item) => `.${item}`).join('')
      : '';
    return `${element.tagName.toLowerCase()}${id}${className}`;
  };

  const labelledByText = (element: Element) => {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (!labelledBy) return '';

    return labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() || '')
      .filter(Boolean)
      .join(' ')
      .trim();
  };

  const labelElementText = (element: Element) => {
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
      return Array.from(element.labels || [])
        .map((label) => label.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ')
        .trim();
    }

    return '';
  };

  const accessibleName = (element: Element) => {
    const ariaLabel = element.getAttribute('aria-label')?.trim() || '';
    const labelled = labelledByText(element);
    const labelText = labelElementText(element);
    const title = element.getAttribute('title')?.trim() || '';
    const alt = element instanceof HTMLImageElement ? element.alt.trim() : '';
    const text = textPreview(element);

    return ariaLabel || labelled || labelText || title || alt || text;
  };

  const visibleMainLandmarks = Array.from(document.querySelectorAll('main, [role="main"]')).filter(isVisible);
  if (visibleMainLandmarks.length === 0) {
    issues.push({
      issue: 'screen is missing a visible main landmark',
      selector: 'main, [role="main"]',
      text: '',
    });
  }

  if (visibleMainLandmarks.length > 1) {
    for (const element of visibleMainLandmarks) {
      issues.push({
        issue: 'screen has multiple visible main landmarks',
        selector: selectorPreview(element),
        text: textPreview(element),
      });
    }
  }

  const visibleH1s = Array.from(document.querySelectorAll('h1')).filter(isVisible);
  if (visibleH1s.length === 0) {
    issues.push({
      issue: 'screen is missing a visible h1',
      selector: 'h1',
      text: '',
    });
  }

  if (visibleH1s.length > 1) {
    for (const element of visibleH1s) {
      issues.push({
        issue: 'screen has multiple visible h1 headings',
        selector: selectorPreview(element),
        text: textPreview(element),
      });
    }
  }

  const interactiveSelector = [
    'button',
    'a[href]',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="checkbox"]',
    '[role="switch"]',
    '[role="radio"]',
    '[role="combobox"]',
    '[role="textbox"]',
  ].join(',');

  for (const element of Array.from(document.querySelectorAll(interactiveSelector))) {
    if (!isVisible(element) || element.closest('[aria-hidden="true"]')) continue;

    const name = accessibleName(element);
    if (!name) {
      issues.push({
        issue: 'visible interactive element is missing an accessible name',
        selector: selectorPreview(element),
        text: textPreview(element),
      });
    }
  }

  const formControlSelector = 'input:not([type="hidden"]), select, textarea';
  for (const element of Array.from(document.querySelectorAll(formControlSelector))) {
    if (!isVisible(element) || element.closest('[aria-hidden="true"]')) continue;

    const name = accessibleName(element);
    const placeholder = element.getAttribute('placeholder')?.trim() || '';
    if (!name || name === placeholder) {
      issues.push({
        issue: 'visible form control is missing a programmatic label',
        selector: selectorPreview(element),
        text: placeholder,
      });
    }
  }

  const visibleNavigationLandmarks = Array.from(document.querySelectorAll('nav, [role="navigation"]')).filter(isVisible);
  if (visibleNavigationLandmarks.length > 1) {
    const navigationNames = new Map<string, Element[]>();

    for (const element of visibleNavigationLandmarks) {
      const name = accessibleName(element);

      if (!name) {
        issues.push({
          issue: 'multiple visible navigation landmarks require accessible names',
          selector: selectorPreview(element),
          text: textPreview(element),
        });
        continue;
      }

      const normalizedName = name.toLowerCase().replace(/\s+/g, ' ').trim();
      navigationNames.set(normalizedName, [
        ...(navigationNames.get(normalizedName) || []),
        element,
      ]);
    }

    for (const [name, elements] of navigationNames) {
      if (elements.length > 1) {
        for (const element of elements) {
          issues.push({
            issue: 'multiple visible navigation landmarks require unique accessible names',
            selector: selectorPreview(element),
            text: name,
          });
        }
      }
    }
  }

  for (const element of Array.from(document.querySelectorAll('[role="status"], [role="alert"]'))) {
    if (!isVisible(element) || element.closest('[aria-hidden="true"]')) continue;

    const name = accessibleName(element);
    if (!name) {
      issues.push({
        issue: 'visible feedback region is missing readable status or alert text',
        selector: selectorPreview(element),
        text: textPreview(element),
      });
    }
  }

  for (const image of Array.from(document.querySelectorAll('img'))) {
    if (!isVisible(image) || image.closest('[aria-hidden="true"]')) continue;

    const role = image.getAttribute('role');
    const decorative = role === 'presentation' || role === 'none';
    if (!decorative && !image.hasAttribute('alt')) {
      issues.push({
        issue: 'visible image is missing alt text or decorative role',
        selector: selectorPreview(image),
        text: textPreview(image),
      });
    }
  }

  return issues.slice(0, 10);
});

const expectRouteHasAccessibleSemantics = async (page: Page, routeCase: RouteAuditCase) => {
  await expect(page.getByRole('heading', { name: routeCase.heading }).first()).toBeVisible();
  await expect(page.getByRole('main', { name: routeCase.mainName })).toBeVisible();

  const issues = await getRouteSemanticIssues(page);
  expect(issues).toEqual([]);
};

test.describe('accessibility semantics audit', () => {
  for (const routeCase of routeAuditCases) {
    for (const viewport of routeCase.viewports) {
      test(`${routeCase.name} at ${routeCase.path} has accessible ${viewport.name} semantics`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await installNetworkStubs(page, { rest: defaultRouteAuditRestFixtures });
        await installE2EAuth(page, routeCase.roles);

        await page.goto(routeCase.path);

        await expectRouteHasAccessibleSemantics(page, routeCase);
      });
    }
  }
});
