/**
 * detect-duplication.js
 * A simple script to detect potential code duplication in the frontend codebase.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../src');

const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];
const MIN_LINE_COUNT = 5; // Minimum number of lines to consider for duplication

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (IGNORE_DIRS.includes(file)) return;
    
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

function analyzeDuplication() {
  console.log('--- Scanning for code duplication in:', rootDir, '---');
  const files = getAllFiles(rootDir);
  const fileContents = {};
  const chunks = {};

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Simple sliding window for chunks of lines
    for (let i = 0; i <= lines.length - MIN_LINE_COUNT; i++) {
      const chunk = lines.slice(i, i + MIN_LINE_COUNT).join('\n');
      if (!chunks[chunk]) {
        chunks[chunk] = [];
      }
      chunks[chunk].push({ file, startLine: i + 1 });
    }
  });

  const duplications = Object.entries(chunks).filter(([_, locations]) => locations.length > 1);

  if (duplications.length === 0) {
    console.log('No significant duplication detected.');
  } else {
    console.log(`Detected ${duplications.length} potential duplications (min ${MIN_LINE_COUNT} lines).`);
    
    // Sort by number of occurrences
    duplications.sort((a, b) => b[1].length - a[1].length);

    duplications.slice(0, 10).forEach(([chunk, locations], index) => {
      console.log(`\nDuplication #${index + 1} - Found in ${locations.length} places:`);
      locations.forEach(loc => {
        console.log(`  - ${path.relative(rootDir, loc.file)}:${loc.startLine}`);
      });
      console.log('Content preview:');
      console.log('  ' + chunk.split('\n')[0] + '...');
    });
  }
}

analyzeDuplication();
