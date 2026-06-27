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

for (const filePath of sourceFiles) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
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
