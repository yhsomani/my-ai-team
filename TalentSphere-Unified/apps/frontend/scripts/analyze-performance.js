/**
 * analyze-performance.js
 * A simple script to analyze the performance characteristics of the frontend source code.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../src');

const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];
const LARGE_FILE_THRESHOLD = 5000; // 5KB threshold for warning
const HUGE_FILE_THRESHOLD = 15000; // 15KB threshold for urgent review

async function getAllFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    if (IGNORE_DIRS.includes(entry.name)) return [];
    
    const filePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return getAllFiles(filePath);
    } else {
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
        return [filePath];
      }
      return [];
    }
  }));

  return files.flat();
}

async function analyzePerformance() {
  console.log('--- Analyzing Frontend Performance (Code Size and Structure) ---');
  const files = await getAllFiles(rootDir);

  const fileStats = await Promise.all(files.map(async (file) => {
    const [stats, content] = await Promise.all([
      fs.stat(file),
      fs.readFile(file, 'utf8')
    ]);
    const lines = content.split('\n').length;
    
    return {
      file: path.relative(rootDir, file),
      size: stats.size,
      lines: lines,
      imports: (content.match(/^import /gm) || []).length
    };
  }));

  // Sort by size
  fileStats.sort((a, b) => b.size - a.size);

  console.log('\nTop 10 Largest Files:');
  fileStats.slice(0, 10).forEach(stat => {
    let warning = '';
    if (stat.size > HUGE_FILE_THRESHOLD) warning = ' !!! REVIEW URGENTLY !!!';
    else if (stat.size > LARGE_FILE_THRESHOLD) warning = ' ! Consider Refactoring !';

    console.log(`  - ${stat.file}: ${(stat.size / 1024).toFixed(2)} KB (${stat.lines} lines, ${stat.imports} imports)${warning}`);
  });

  // Analyze potential bottlenecks
  console.log('\nPotential Bottlenecks:');
  
  const heavyDependencies = fileStats.filter(s => s.imports > 15);
  if (heavyDependencies.length > 0) {
    console.log(`  - Files with high import counts (>15): ${heavyDependencies.length}`);
    heavyDependencies.slice(0, 5).forEach(s => console.log(`    * ${s.file}`));
  }

  const largeFiles = fileStats.filter(s => s.size > LARGE_FILE_THRESHOLD);
  console.log(`  - Total large files (>5KB): ${largeFiles.length}`);

  const averageSize = fileStats.reduce((acc, s) => acc + s.size, 0) / fileStats.length;
  console.log(`  - Average file size: ${(averageSize / 1024).toFixed(2)} KB`);
}

analyzePerformance().catch(err => {
  console.error('Error during performance analysis:', err);
  process.exit(1);
});
