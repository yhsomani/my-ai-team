import { expect, test, type Page } from '@playwright/test';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';
import {
  defaultRouteAuditRestFixtures,
  routeAuditCases,
  type RouteAuditCase,
} from './helpers/routeAudit';

type ContrastIssue = {
  ratio: number;
  requiredRatio: number;
  selector: string;
  text: string;
  foreground: string;
  background: string;
};

const getRouteContrastIssues = async (page: Page): Promise<ContrastIssue[]> => page.evaluate(() => {
  type Rgba = {
    r: number;
    g: number;
    b: number;
    a: number;
  };

  const issues: ContrastIssue[] = [];
  const rootElement = document.documentElement;
  const bodyElement = document.body;

  const parseColor = (value: string): Rgba | null => {
    const match = value.match(/^rgba?\(([^)]+)\)$/);
    if (!match) return null;

    const parts = match[1].split(',').map((part) => part.trim());
    if (parts.length < 3) return null;

    const parseChannel = (part: string) => Number.parseFloat(part);
    return {
      r: parseChannel(parts[0]),
      g: parseChannel(parts[1]),
      b: parseChannel(parts[2]),
      a: parts[3] === undefined ? 1 : Number.parseFloat(parts[3]),
    };
  };

  const blend = (foreground: Rgba, background: Rgba): Rgba => {
    const alpha = foreground.a + background.a * (1 - foreground.a);
    if (alpha === 0) return { r: 255, g: 255, b: 255, a: 1 };

    return {
      r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
      g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
      b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
      a: alpha,
    };
  };

  const toCssRgb = (color: Rgba) => `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;

  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const luminance = (color: Rgba) => (
    0.2126 * linearize(color.r)
    + 0.7152 * linearize(color.g)
    + 0.0722 * linearize(color.b)
  );

  const contrastRatio = (foreground: Rgba, background: Rgba) => {
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const isVisible = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0
      && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number.parseFloat(style.opacity || '1') >= 0.99;
  };

  const isDisabled = (element: Element) => (
    element.matches(':disabled, [aria-disabled="true"]')
      || Boolean(element.closest(':disabled, [aria-disabled="true"]'))
  );

  const textPreview = (element: Element) => (
    Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 90)
  );

  const selectorPreview = (element: Element) => {
    const id = element.id ? `#${element.id}` : '';
    const className = typeof (element as HTMLElement).className === 'string'
      ? (element as HTMLElement).className.trim().split(/\s+/).filter(Boolean).slice(0, 3).map((item) => `.${item}`).join('')
      : '';
    return `${element.tagName.toLowerCase()}${id}${className}`;
  };

  const effectiveBackground = (element: Element): Rgba => {
    const ancestors: Element[] = [];
    let current: Element | null = element;

    while (current) {
      ancestors.unshift(current);
      current = current.parentElement;
    }

    let background: Rgba = { r: 255, g: 255, b: 255, a: 1 };
    for (const ancestor of ancestors) {
      const parsed = parseColor(window.getComputedStyle(ancestor).backgroundColor);
      if (parsed && parsed.a > 0) {
        background = blend(parsed, background);
      }
    }

    return background;
  };

  const requiredContrastRatio = (style: CSSStyleDeclaration) => {
    const fontSize = Number.parseFloat(style.fontSize || '0');
    const fontWeight = Number.parseInt(style.fontWeight || '400', 10);
    const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    return isLargeText ? 3 : 4.5;
  };

  const bodyBackground = parseColor(window.getComputedStyle(bodyElement).backgroundColor)
    || parseColor(window.getComputedStyle(rootElement).backgroundColor)
    || { r: 255, g: 255, b: 255, a: 1 };
  const baselineBackground = bodyBackground.a > 0
    ? toCssRgb(blend(bodyBackground, { r: 255, g: 255, b: 255, a: 1 }))
    : 'rgb(255, 255, 255)';

  for (const element of Array.from(document.querySelectorAll('body *'))) {
    if (!isVisible(element) || isDisabled(element) || element.closest('[aria-hidden="true"]')) continue;

    const text = textPreview(element);
    if (!text || !/[A-Za-z0-9]/.test(text)) continue;

    const style = window.getComputedStyle(element);
    const foreground = parseColor(style.color);
    if (!foreground || foreground.a < 0.99) continue;

    const background = effectiveBackground(element);
    const ratio = contrastRatio(foreground, background);
    const requiredRatio = requiredContrastRatio(style);

    if (ratio + 0.01 < requiredRatio) {
      issues.push({
        ratio: Number(ratio.toFixed(2)),
        requiredRatio,
        selector: selectorPreview(element),
        text,
        foreground: toCssRgb(foreground),
        background: toCssRgb(background),
      });
    }
  }

  return issues
    .filter((issue) => issue.background !== baselineBackground || issue.ratio < issue.requiredRatio)
    .slice(0, 10);
});

const expectRouteHasReadableContrast = async (page: Page, routeCase: RouteAuditCase) => {
  await expect(page.getByRole('heading', { name: routeCase.heading }).first()).toBeVisible();

  const issues = await getRouteContrastIssues(page);
  expect(issues).toEqual([]);
};

test.describe('color contrast audit', () => {
  for (const routeCase of routeAuditCases) {
    for (const viewport of routeCase.viewports) {
      test(`${routeCase.name} at ${routeCase.path} has readable ${viewport.name} contrast`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await installNetworkStubs(page, { rest: defaultRouteAuditRestFixtures });
        await installE2EAuth(page, routeCase.roles);

        await page.goto(routeCase.path);

        await expectRouteHasReadableContrast(page, routeCase);
      });
    }
  }
});
