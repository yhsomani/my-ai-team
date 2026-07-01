import { expect, test, type Page } from '@playwright/test';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';
import {
  defaultRouteAuditRestFixtures,
  routeAuditCases,
  type RouteAuditCase,
} from './helpers/routeAudit';

const expectScreenIsUsable = async (page: Page, routeCase: RouteAuditCase, pageErrors: string[]) => {
  await expect(page.getByRole('heading', { name: routeCase.heading }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/\bundefined\b/i);
  expect(pageErrors).toEqual([]);

  const layout = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentScrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    const offenders = Array.from(document.querySelectorAll('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const text = (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        const className = typeof (element as HTMLElement).className === 'string'
          ? (element as HTMLElement).className
          : '';

        return {
          tag: element.tagName.toLowerCase(),
          className,
          text,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          display: style.display,
          visibility: style.visibility,
          position: style.position,
        };
      })
      .filter((item) => (
        item.width > 0
        && item.display !== 'none'
        && item.visibility !== 'hidden'
        && item.position !== 'fixed'
        && item.right > viewportWidth + 2
      ))
      .slice(0, 5);

    const interactiveTextSelector = [
      'button',
      'a[href]',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="menuitem"]',
    ].join(',');

    const clippedInteractiveText = Array.from(document.querySelectorAll(interactiveTextSelector))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const text = (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        const className = typeof (element as HTMLElement).className === 'string'
          ? (element as HTMLElement).className
          : '';
        const visuallyHidden = className.split(/\s+/).includes('sr-only')
          || (
            rect.width <= 1
            && rect.height <= 1
            && style.overflowX === 'hidden'
            && style.overflowY === 'hidden'
          );

        return {
          tag: element.tagName.toLowerCase(),
          className,
          text,
          visuallyHidden,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          clientWidth: (element as HTMLElement).clientWidth,
          scrollWidth: (element as HTMLElement).scrollWidth,
          clientHeight: (element as HTMLElement).clientHeight,
          scrollHeight: (element as HTMLElement).scrollHeight,
          display: style.display,
          visibility: style.visibility,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
        };
      })
      .filter((item) => (
        item.width > 0
        && item.height > 0
        && item.display !== 'none'
        && item.visibility !== 'hidden'
        && !item.visuallyHidden
        && /[A-Za-z0-9]/.test(item.text)
        && (
          (item.scrollWidth > item.clientWidth + 2 && item.overflowX !== 'visible')
          || (item.scrollHeight > item.clientHeight + 4 && item.overflowY !== 'visible')
        )
      ))
      .slice(0, 5);

    const namedByText = (element: Element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (!labelledBy) return '';

      return labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ')
        .trim();
    };

    const accessibleName = (element: Element) => (
      element.getAttribute('aria-label')?.trim()
      || namedByText(element)
      || element.getAttribute('title')?.trim()
      || ''
    );

    const smallIconOnlyControls = Array.from(document.querySelectorAll(interactiveTextSelector))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
        const name = accessibleName(element);
        const className = typeof (element as HTMLElement).className === 'string'
          ? (element as HTMLElement).className
          : '';

        return {
          tag: element.tagName.toLowerCase(),
          className,
          name,
          text,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          display: style.display,
          visibility: style.visibility,
        };
      })
      .filter((item) => (
        item.width > 0
        && item.height > 0
        && item.display !== 'none'
        && item.visibility !== 'hidden'
        && item.name.length > 0
        && !/[A-Za-z0-9]/.test(item.text)
        && (item.width < 32 || item.height < 32)
      ))
      .slice(0, 5);

    const iconOnlyControlsWithoutFocusStyle = Array.from(document.querySelectorAll(interactiveTextSelector))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
        const name = accessibleName(element);
        const className = typeof (element as HTMLElement).className === 'string'
          ? (element as HTMLElement).className
          : '';

        return {
          tag: element.tagName.toLowerCase(),
          className,
          name,
          text,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          display: style.display,
          visibility: style.visibility,
        };
      })
      .filter((item) => (
        item.width > 0
        && item.height > 0
        && item.display !== 'none'
        && item.visibility !== 'hidden'
        && item.name.length > 0
        && !/[A-Za-z0-9]/.test(item.text)
        && !/(^|\s)(focus|focus-visible):/.test(item.className)
      ))
      .slice(0, 5);

    return {
      viewportWidth,
      documentScrollWidth,
      offenders,
      clippedInteractiveText,
      smallIconOnlyControls,
      iconOnlyControlsWithoutFocusStyle,
    };
  });

  expect(layout.documentScrollWidth, JSON.stringify(layout.offenders, null, 2))
    .toBeLessThanOrEqual(layout.viewportWidth + 2);
  expect(layout.clippedInteractiveText).toEqual([]);
  expect(layout.smallIconOnlyControls).toEqual([]);
  expect(layout.iconOnlyControlsWithoutFocusStyle).toEqual([]);
};

test.describe('visual layout audit', () => {
  for (const routeCase of routeAuditCases) {
    for (const viewport of routeCase.viewports) {
      test(`${routeCase.name} at ${routeCase.path} renders a usable ${viewport.name} layout`, async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await installNetworkStubs(page, { rest: defaultRouteAuditRestFixtures });
        await installE2EAuth(page, routeCase.roles);

        await page.goto(routeCase.path);

        await expectScreenIsUsable(page, routeCase, pageErrors);
      });
    }
  }
});
