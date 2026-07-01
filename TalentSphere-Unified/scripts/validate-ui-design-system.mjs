import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const sourceRoots = [
  'apps/frontend/src',
  'chrome-extension-project/src',
];

const scannedExtensions = new Set(['.css', '.html', '.ts', '.tsx']);
const ignoredDirectories = new Set(['dist', 'node_modules']);

const rules = [
  {
    id: 'legacy-theme-token',
    description: 'Old Aurora/neon/glass theme tokens must not return to source UI.',
    patterns: [
      /\bAurora-card\b/,
      /\bbg-Aurora[-\w/]*/,
      /\btext-electric\b/,
      /\bbg-electric\b/,
      /\bbg-prismatic-gradient\b/,
      /\bbg-primary-gradient\b/,
      /\bborder-glass[-\w/]*/,
      /\btext-primary-indigo\b/,
      /\btext-on-surface[-\w/]*/,
      /\bfont-display\b/,
    ],
  },
  {
    id: 'decorative-gradient',
    description: 'Use token-backed surfaces instead of decorative gradients.',
    patterns: [
      /\bbg-gradient[-\w:/[\]]*/,
      /\btext-gradient\b/,
      /linear-gradient\(/,
    ],
  },
  {
    id: 'oversized-radius-or-shadow',
    description: 'Cards and controls should stay at 8px radius unless explicitly designed otherwise.',
    patterns: [
      /\brounded-(xl|2xl|3xl)\b/,
      /\brounded-\[/,
      /\bshadow-2xl\b/,
    ],
  },
  {
    id: 'letter-spacing',
    description: 'Letter spacing must remain normal across compact UI surfaces.',
    patterns: [
      /\btracking-(tight|tighter|wide|wider|widest)\b/,
      /\btracking-\[/,
      /letter-spacing\s*:(?!\s*(?:0|normal)(?:\s*;|\s*!important|\s*$))/,
      /letterSpacing/,
    ],
  },
  {
    id: 'hardcoded-black-white-tailwind',
    description: 'Use semantic foreground, overlay, or extension tokens instead of hard-coded black/white utilities.',
    patterns: [
      /\bbg-white\b/,
      /\btext-white\b/,
      /\bbg-black\b/,
      /\btext-black\b/,
      /\bhover:bg-white\b/,
      /\bhover:bg-black\b/,
    ],
  },
];

const relativeToRepo = (absolutePath) => path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/');

const walk = (root) => {
  const results = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (ignoredDirectories.has(entry.name)) continue;
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && scannedExtensions.has(path.extname(entry.name))) {
        results.push(entryPath);
      }
    }
  }

  return results.sort();
};

const sourceFiles = sourceRoots.flatMap((sourceRoot) => {
  const absoluteRoot = path.join(repoRoot, sourceRoot);
  if (!fs.existsSync(absoluteRoot)) {
    console.error(`ui design-system validation failed: source root is missing: ${sourceRoot}`);
    process.exitCode = 1;
    return [];
  }
  return walk(absoluteRoot);
});

const violations = [];
const definedCssVariables = new Set();
const hardcodedHexColorPattern = /(?<!&)#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const hardcodedFunctionalColorPattern = /\b(?:rgba?|hsla?)\(\s*[-+]?(?:\d|\.)/i;
const explicitColorTokenBlockStartPatterns = [
  /\bconst\s+printableResumeTokens\s*=\s*{/,
];
const skeletonLayoutClassPattern = /(?:^|\s)(?:[a-z0-9-]+:)*(?:h|min-h|size|aspect)-[^\s"'`{}]+/;
const skeletonInlineLayoutPattern = /\b(?:height|minHeight|aspectRatio)\s*:/;
const skeletonStaticClassPattern = /className\s*=\s*(["'`])([\s\S]*?)\1/;
const emptyStateDescriptionPattern = /\bdescription\s*=/;

const isAllowedHardcodedColorLine = (filePath, line, isInsideExplicitTokenBlock) => {
  if (isInsideExplicitTokenBlock) return true;

  return path.extname(filePath) === '.css'
    && /--[A-Za-z0-9_-]+\s*:/.test(line);
};

const extractCssBlock = (content, selector) => {
  const selectorIndex = content.indexOf(selector);
  if (selectorIndex === -1) return '';

  const blockStart = content.indexOf('{', selectorIndex);
  if (blockStart === -1) return '';

  let depth = 0;
  for (let index = blockStart; index < content.length; index += 1) {
    const character = content[index];

    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;

    if (depth === 0) {
      return content.slice(blockStart + 1, index);
    }
  }

  return '';
};

const parseCssVariableBlock = (block) => {
  const tokens = new Map();
  const matcher = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = matcher.exec(block)) !== null) {
    tokens.set(match[1], match[2].trim());
  }

  return tokens;
};

const tokenLineNumber = (content, tokenName) => {
  const index = content.indexOf(tokenName);
  if (index === -1) return 1;
  return content.slice(0, index).split(/\r?\n/).length;
};

const lineNumberAt = (content, characterIndex) => (
  content.slice(0, characterIndex).split(/\r?\n/).length
);

const findSelfClosingJsxTags = (content, tagName) => {
  const tags = [];
  const opening = `<${tagName}`;
  let searchIndex = 0;

  while (searchIndex < content.length) {
    const start = content.indexOf(opening, searchIndex);
    if (start === -1) break;

    let braceDepth = 0;
    let quote = null;
    let end = -1;

    for (let index = start + opening.length; index < content.length; index += 1) {
      const character = content[index];
      const previous = content[index - 1];

      if (quote) {
        if (character === quote && previous !== '\\') {
          quote = null;
        }
        continue;
      }

      if (character === '"' || character === "'" || character === '`') {
        quote = character;
        continue;
      }

      if (character === '{') {
        braceDepth += 1;
        continue;
      }

      if (character === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        continue;
      }

      if (braceDepth === 0 && character === '/' && content[index + 1] === '>') {
        end = index + 2;
        break;
      }
    }

    if (end === -1) {
      searchIndex = start + opening.length;
      continue;
    }

    tags.push({
      index: start,
      attributes: content.slice(start + opening.length, end - 2),
      source: content.slice(start, end),
    });
    searchIndex = end;
  }

  return tags;
};

const parseHexRgb = (value) => {
  const match = value.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return null;

  return [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
};

const relativeLuminance = (value) => {
  const rgb = parseHexRgb(value);
  if (!rgb) return null;

  const [red, green, blue] = rgb.map((channel) => (
    channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (foreground, background) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);

  if (foregroundLuminance === null || backgroundLuminance === null) return null;

  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const validateTokenContrast = ({
  filePath,
  content,
  tokens,
  context,
  foregroundTokens,
  backgroundTokens,
  minimumRatio = 4.5,
}) => {
  for (const foregroundToken of foregroundTokens) {
    for (const backgroundToken of backgroundTokens) {
      const foreground = tokens.get(foregroundToken);
      const background = tokens.get(backgroundToken);
      const ratio = foreground && background ? contrastRatio(foreground, background) : null;

      if (ratio === null || ratio < minimumRatio) {
        violations.push({
          file: relativeToRepo(filePath),
          line: tokenLineNumber(content, foregroundToken),
          rule: 'token-contrast',
          description: `Core ${context} token ${foregroundToken} must keep at least ${minimumRatio}:1 contrast against ${backgroundToken}.`,
          content: `${foregroundToken}: ${foreground || 'missing'}; ${backgroundToken}: ${background || 'missing'}; ratio: ${ratio === null ? 'unavailable' : ratio.toFixed(2)}`,
        });
      }
    }
  }
};

for (const filePath of sourceFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const definitionMatcher = /(--[A-Za-z0-9_-]+)\s*:/g;
  let match;

  while ((match = definitionMatcher.exec(content)) !== null) {
    definedCssVariables.add(match[1]);
  }
}

for (const filePath of sourceFiles) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  let isInsideExplicitTokenBlock = false;

  lines.forEach((line, index) => {
    if (explicitColorTokenBlockStartPatterns.some((pattern) => pattern.test(line))) {
      isInsideExplicitTokenBlock = true;
    }

    for (const rule of rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(line)) {
          violations.push({
            file: relativeToRepo(filePath),
            line: index + 1,
            rule: rule.id,
            description: rule.description,
            content: line.trim(),
          });
          return;
        }
      }
    }

    if (
      hardcodedHexColorPattern.test(line)
      && !isAllowedHardcodedColorLine(filePath, line, isInsideExplicitTokenBlock)
    ) {
      violations.push({
        file: relativeToRepo(filePath),
        line: index + 1,
        rule: 'hardcoded-hex-color',
        description: 'Use design tokens or an explicit export-token block instead of ad hoc hard-coded color literals.',
        content: line.trim(),
      });
      return;
    }

    if (
      hardcodedFunctionalColorPattern.test(line)
      && !isAllowedHardcodedColorLine(filePath, line, isInsideExplicitTokenBlock)
    ) {
      violations.push({
        file: relativeToRepo(filePath),
        line: index + 1,
        rule: 'hardcoded-functional-color',
        description: 'Use design tokens or an explicit export-token block instead of ad hoc rgb/hsl color literals.',
        content: line.trim(),
      });
      return;
    }

    const referenceMatcher = /var\((--[A-Za-z0-9_-]+)/g;
    let referenceMatch;

    while ((referenceMatch = referenceMatcher.exec(line)) !== null) {
      const tokenName = referenceMatch[1];

      if (!definedCssVariables.has(tokenName)) {
        violations.push({
          file: relativeToRepo(filePath),
          line: index + 1,
          rule: 'undefined-css-variable',
          description: 'Every design token reference must resolve to a token defined in the app or extension CSS source.',
          content: line.trim(),
        });
        return;
      }
    }

    if (isInsideExplicitTokenBlock && /\}\s+as\s+const;/.test(line)) {
      isInsideExplicitTokenBlock = false;
    }
  });
}

for (const filePath of sourceFiles) {
  if (path.extname(filePath) !== '.tsx') continue;

  const content = fs.readFileSync(filePath, 'utf8');

  for (const skeletonTag of findSelfClosingJsxTags(content, 'Skeleton')) {
    const attributes = skeletonTag.attributes;
    const classMatch = attributes.match(skeletonStaticClassPattern);
    const className = classMatch?.[2] ?? '';

    if (
      !skeletonLayoutClassPattern.test(className)
      && !skeletonInlineLayoutPattern.test(attributes)
    ) {
      violations.push({
        file: relativeToRepo(filePath),
        line: lineNumberAt(content, skeletonTag.index),
        rule: 'skeleton-layout-dimensions',
        description: 'Shared Skeleton placeholders must reserve final layout space with an explicit height, min-height, size, aspect ratio, or equivalent inline style.',
        content: skeletonTag.source.split(/\r?\n/)[0].trim(),
      });
    }
  }
}

for (const filePath of sourceFiles) {
  if (path.extname(filePath) !== '.tsx') continue;

  const content = fs.readFileSync(filePath, 'utf8');

  for (const emptyStateTag of findSelfClosingJsxTags(content, 'EmptyState')) {
    const attributes = emptyStateTag.attributes;
    if (!emptyStateDescriptionPattern.test(attributes)) {
      violations.push({
        file: relativeToRepo(filePath),
        line: lineNumberAt(content, emptyStateTag.index),
        rule: 'empty-state-description',
        description: 'Shared EmptyState usages must include a description so no-data states explain what is absent or what to do next.',
        content: emptyStateTag.source.split(/\r?\n/)[0].trim(),
      });
    }
  }
}

const frontendTokenPath = path.join(repoRoot, 'apps/frontend/src/index.css');
const extensionTokenPath = path.join(repoRoot, 'chrome-extension-project/src/index.css');

if (fs.existsSync(frontendTokenPath)) {
  const content = fs.readFileSync(frontendTokenPath, 'utf8');
  const lightTokens = parseCssVariableBlock(extractCssBlock(content, ':root'));
  const darkTokens = new Map([
    ...lightTokens,
    ...parseCssVariableBlock(extractCssBlock(content, '.dark')),
  ]);
  const appForegroundTokens = [
    '--text-primary',
    '--text-secondary',
    '--text-muted',
    '--accent',
    '--success',
    '--warning',
    '--destructive',
  ];
  const appSurfaceTokens = [
    '--bg-primary',
    '--bg-canvas',
    '--bg-secondary',
    '--bg-elevated',
    '--bg-panel',
    '--bg-inset',
  ];

  validateTokenContrast({
    filePath: frontendTokenPath,
    content,
    tokens: lightTokens,
    context: 'light app',
    foregroundTokens: appForegroundTokens,
    backgroundTokens: appSurfaceTokens,
  });
  validateTokenContrast({
    filePath: frontendTokenPath,
    content,
    tokens: darkTokens,
    context: 'dark app',
    foregroundTokens: appForegroundTokens,
    backgroundTokens: appSurfaceTokens,
  });
  validateTokenContrast({
    filePath: frontendTokenPath,
    content,
    tokens: lightTokens,
    context: 'light app accent foreground',
    foregroundTokens: ['--accent-foreground'],
    backgroundTokens: ['--accent', '--accent-hover'],
  });
  validateTokenContrast({
    filePath: frontendTokenPath,
    content,
    tokens: darkTokens,
    context: 'dark app accent foreground',
    foregroundTokens: ['--accent-foreground'],
    backgroundTokens: ['--accent', '--accent-hover'],
  });
}

if (fs.existsSync(extensionTokenPath)) {
  const content = fs.readFileSync(extensionTokenPath, 'utf8');
  const tokens = parseCssVariableBlock(extractCssBlock(content, ':root'));
  const extensionForegroundTokens = [
    '--ext-text',
    '--ext-text-secondary',
    '--ext-text-muted',
    '--ext-accent',
    '--ext-accent-strong',
    '--ext-success',
    '--ext-warning',
    '--ext-danger',
  ];
  const extensionSurfaceTokens = [
    '--ext-bg',
    '--ext-surface',
    '--ext-surface-muted',
    '--ext-surface-inset',
  ];

  validateTokenContrast({
    filePath: extensionTokenPath,
    content,
    tokens,
    context: 'extension',
    foregroundTokens: extensionForegroundTokens,
    backgroundTokens: extensionSurfaceTokens,
  });
  validateTokenContrast({
    filePath: extensionTokenPath,
    content,
    tokens,
    context: 'extension accent foreground',
    foregroundTokens: ['--ext-on-accent'],
    backgroundTokens: ['--ext-accent', '--ext-accent-strong'],
  });
}

if (violations.length > 0) {
  console.error(`ui design-system validation failed with ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.description}`);
    console.error(`  ${violation.content}`);
  }
  process.exit(1);
}

console.log(`ui design-system validation passed (${sourceFiles.length} source files scanned)`);
