const fs = require('fs');
const path = require('path');

console.log('--- Component Duplication Detection Report ---');

const componentsDir = path.join(__dirname, '../apps/frontend/src/components');
const reportFile = path.join(__dirname, '../DUPLICATION_REPORT.json');

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      getFiles(path.join(dir, file), fileList);
    } else {
      fileList.push({ name: file, path: path.join(dir, file) });
    }
  }
  return fileList;
}

const allFiles = getFiles(componentsDir);
const fileNames = allFiles.map(f => f.name);
const duplicates = fileNames.filter((item, index) => fileNames.indexOf(item) !== index);

const report = {
  timestamp: new Date().toISOString(),
  totalComponents: allFiles.length,
  duplicatesDetected: [...new Set(duplicates)],
  details: [],
  reuseScore: 0
};

if (duplicates.length > 0) {
  console.error('❌ Duplicates detected:');
  const uniqueDuplicates = [...new Set(duplicates)];
  uniqueDuplicates.forEach(dup => {
    const locations = allFiles.filter(f => f.name === dup).map(f => f.path);
    console.error(`- ${dup} found in multiple locations:`);
    locations.forEach(loc => console.error(`  -> ${loc}`));
    report.details.push({ component: dup, locations });
  });
  report.reuseScore = Math.round(((allFiles.length - duplicates.length) / allFiles.length) * 100);
} else {
  console.log('✅ No component duplication detected.');
  report.reuseScore = 100;
}

fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
console.log(`Report generated: ${reportFile}`);
console.log(`Component reuse score: ${report.reuseScore}%`);
console.log('----------------------------------------------');

if (report.reuseScore < 100) {
  process.exit(1);
}
