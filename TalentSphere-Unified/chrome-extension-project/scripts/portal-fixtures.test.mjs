import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const extensionRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-extension-portal-fixtures-'));

const transpileSource = (relativePath) => {
  const sourcePath = path.join(extensionRoot, relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  }).outputText.replaceAll("from '../lib/jobTypes'", "from './jobTypes.mjs'");
  const outputPath = path.join(tempDir, path.basename(relativePath).replace(/\.ts$/, '.mjs'));
  fs.writeFileSync(outputPath, transpiled);
  return outputPath;
};

transpileSource('src/lib/jobTypes.ts');
const contentModulePath = transpileSource('src/content/index.ts');
const {
  buildScanMetadataFromPage,
} = await import(pathToFileURL(contentModulePath).href);

const decodeHtml = (value) => value
  .replaceAll('&amp;', '&')
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&#39;', "'")
  .replaceAll('&quot;', '"');

const stripTags = (value) => decodeHtml(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const firstElementByAttribute = (html, attribute, value) => {
  const pattern = new RegExp(`<([a-z0-9-]+)(?=[^>]*\\s${attribute}=["']${escapeRegExp(value)}["'])[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  return html.match(pattern)?.[2] || '';
};

const firstElementByClass = (html, className) => {
  const pattern = new RegExp(`<([a-z0-9-]+)(?=[^>]*\\sclass=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'])[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  return html.match(pattern)?.[2] || '';
};

const firstElementByClassContains = (html, partialClass) => {
  const pattern = new RegExp(`<([a-z0-9-]+)(?=[^>]*\\sclass=["'][^"']*${escapeRegExp(partialClass)}[^"']*["'])[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  return html.match(pattern)?.[2] || '';
};

const firstDescendant = (html, containerInnerHtml, tagName) => {
  if (!containerInnerHtml) return '';
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  return containerInnerHtml.match(pattern)?.[1] || '';
};

const firstElementByTag = (html, tagName) => {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  return html.match(pattern)?.[1] || '';
};

const firstElementById = (html, id) => firstElementByAttribute(html, 'id', id);

const textFromSelector = (html, selector) => {
  if (selector === '[data-testid="job-title"]') return stripTags(firstElementByAttribute(html, 'data-testid', 'job-title'));
  if (selector === '[data-testid="company-name"]') return stripTags(firstElementByAttribute(html, 'data-testid', 'company-name'));
  if (selector === '[data-testid="jobDescriptionText"]') return stripTags(firstElementByAttribute(html, 'data-testid', 'jobDescriptionText'));
  if (selector === '.job-details-jobs-unified-top-card__job-title') return stripTags(firstElementByClass(html, 'job-details-jobs-unified-top-card__job-title'));
  if (selector === '.job-details-jobs-unified-top-card__company-name a') return stripTags(firstDescendant(html, firstElementByClass(html, 'job-details-jobs-unified-top-card__company-name'), 'a'));
  if (selector === '.job-details-jobs-unified-top-card__company-name') return stripTags(firstElementByClass(html, 'job-details-jobs-unified-top-card__company-name'));
  if (selector === '.top-card-layout__title') return stripTags(firstElementByClass(html, 'top-card-layout__title'));
  if (selector === '.topcard__org-name-link') return stripTags(firstElementByClass(html, 'topcard__org-name-link'));
  if (selector === '.jobsearch-JobInfoHeader-title') return stripTags(firstElementByClass(html, 'jobsearch-JobInfoHeader-title'));
  if (selector === '.jobsearch-InlineCompanyRating div:first-child') return stripTags(firstDescendant(html, firstElementByClass(html, 'jobsearch-InlineCompanyRating'), 'div'));
  if (selector === '.jobsearch-jobDescriptionText') return stripTags(firstElementByClass(html, 'jobsearch-jobDescriptionText'));
  if (selector === '#job-details') return stripTags(firstElementById(html, 'job-details'));
  if (selector === '.jobs-description__content') return stripTags(firstElementByClass(html, 'jobs-description__content'));
  if (selector === '[class*="company"] a') return stripTags(firstDescendant(html, firstElementByClassContains(html, 'company'), 'a'));
  if (selector === '[class*="company"]') return stripTags(firstElementByClassContains(html, 'company'));
  if (selector === '[class*="description"]') return stripTags(firstElementByClassContains(html, 'description'));
  if (selector === 'h1') return stripTags(firstElementByTag(html, 'h1'));
  return '';
};

const metaFromFixture = (html, name) => {
  const pattern = new RegExp(`<meta\\s+(?=[^>]*(?:name|property)=["']${escapeRegExp(name)}["'])[^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  return decodeHtml(html.match(pattern)?.[1] || '').trim();
};

const buildFixturePage = ({ html, hostname, href, title }) => ({
  hostname,
  href,
  title,
  queryText(selectors) {
    for (const selector of selectors) {
      const text = textFromSelector(html, selector);
      if (text) return text;
    }
    return '';
  },
  metaContent(name) {
    return metaFromFixture(html, name);
  },
});

const fixtures = [
  {
    name: 'LinkedIn jobs unified top card',
    expected: {
      source: 'linkedin.com',
      role: 'Principal Backend Engineer',
      company: 'Acme Labs',
    },
    page: buildFixturePage({
      hostname: 'www.linkedin.com',
      href: 'https://www.linkedin.com/jobs/view/111',
      title: 'Principal Backend Engineer at Acme Labs | LinkedIn',
      html: `
        <main>
          <h1 class="job-details-jobs-unified-top-card__job-title">Principal Backend Engineer</h1>
          <div class="job-details-jobs-unified-top-card__company-name">
            <a href="/company/acme-labs">Acme Labs</a>
          </div>
          <section id="job-details">
            Build reliable candidate workflow systems with privacy-safe telemetry and clear release ownership.
          </section>
        </main>
      `,
    }),
  },
  {
    name: 'Indeed job info header',
    expected: {
      source: 'indeed.com',
      role: 'Senior Data Analyst',
      company: 'Northwind Analytics',
    },
    page: buildFixturePage({
      hostname: 'www.indeed.com',
      href: 'https://www.indeed.com/viewjob?jk=222',
      title: 'Senior Data Analyst - Northwind Analytics - Indeed',
      html: `
        <article>
          <h1 class="jobsearch-JobInfoHeader-title">Senior Data Analyst</h1>
          <div class="jobsearch-InlineCompanyRating">
            <div>Northwind Analytics</div>
            <div>4.2</div>
          </div>
          <div data-testid="jobDescriptionText">
            Own analytics datasets, publish stakeholder dashboards, and maintain query-quality checks.
          </div>
        </article>
      `,
    }),
  },
  {
    name: 'Glassdoor top card layout',
    expected: {
      source: 'glassdoor.com',
      role: 'Product Design Lead',
      company: 'BrightWorks Studio',
    },
    page: buildFixturePage({
      hostname: 'www.glassdoor.com',
      href: 'https://www.glassdoor.com/job-listing/333',
      title: 'Product Design Lead at BrightWorks Studio - Glassdoor',
      html: `
        <div>
          <h1 class="top-card-layout__title">Product Design Lead</h1>
          <a class="topcard__org-name-link" href="/Overview/Working-at-BrightWorks-Studio">
            BrightWorks Studio
          </a>
          <div class="jobDescriptionContent description">
            Lead design systems, accessibility reviews, and hiring manager workflows for a product team.
          </div>
        </div>
      `,
    }),
  },
];

for (const fixture of fixtures) {
  const metadata = buildScanMetadataFromPage(fixture.page);

  assert.equal(metadata.status, 'success', fixture.name);
  assert.equal(metadata.source, fixture.expected.source, fixture.name);
  assert.equal(metadata.role, fixture.expected.role, fixture.name);
  assert.equal(metadata.company, fixture.expected.company, fixture.name);
  assert.equal(metadata.url, fixture.page.href, fixture.name);
  assert.equal(metadata.confidence, 'high', fixture.name);
  assert.ok(metadata.description.length > 40, fixture.name);
  assert.equal(metadata.description.includes('<'), false, fixture.name);
  assert.equal(metadata.description.length <= 600, true, fixture.name);
}

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('portal fixture tests passed');
