const fs = require('fs');
const path = require('path');

/**
 * LocalStorage Usage Scanner
 *
 * Scans entire src/ directory for localStorage usage patterns:
 * - Direct localStorage calls (getItem, setItem, removeItem, clear)
 * - DataService imports and method calls
 * - Other storage mechanisms
 *
 * Outputs JSON report with file paths, line numbers, and context
 */

const SRC_DIR = path.resolve(__dirname, '../../src');
const OUTPUT_FILE = path.resolve(__dirname, '../../reports/localstorage-audit-report.json');

// Patterns to search for
const PATTERNS = {
  localStorage: {
    getItem: /localStorage\.getItem/g,
    setItem: /localStorage\.setItem/g,
    removeItem: /localStorage\.removeItem/g,
    clear: /localStorage\.clear/g,
    direct: /localStorage\[/g // localStorage['key'] or localStorage["key"]
  },
  dataService: {
    import: /import.*dataService.*from/gi,
    call: /dataService\.\w+\(/g
  },
  sessionStorage: {
    getItem: /sessionStorage\.getItem/g,
    setItem: /sessionStorage\.setItem/g,
    removeItem: /sessionStorage\.removeItem/g,
    clear: /sessionStorage\.clear/g
  }
};

// File extensions to scan
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Directories to skip
const SKIP_DIRS = ['node_modules', 'build', 'dist', '.git', 'coverage'];

/**
 * Get all files recursively from a directory
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip excluded directories
      if (!SKIP_DIRS.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      // Only include files with specified extensions
      const ext = path.extname(file);
      if (EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Extract function or component name from context
 */
function extractContextName(lines, lineIndex) {
  // Look backwards for function/component definition
  for (let i = lineIndex; i >= Math.max(0, lineIndex - 20); i--) {
    const line = lines[i];

    // Match function declarations
    const funcMatch = line.match(/(?:function|const|let|var)\s+(\w+)/);
    if (funcMatch) {
      return funcMatch[1];
    }

    // Match arrow functions
    const arrowMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
    if (arrowMatch) {
      return arrowMatch[1];
    }

    // Match export default
    const exportMatch = line.match(/export\s+default\s+(?:function\s+)?(\w+)/);
    if (exportMatch) {
      return exportMatch[1];
    }
  }

  return 'Unknown';
}

/**
 * Scan a single file for patterns
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(SRC_DIR, filePath);
  const matches = [];

  // Scan each pattern category
  Object.entries(PATTERNS).forEach(([category, patterns]) => {
    Object.entries(patterns).forEach(([type, regex]) => {
      lines.forEach((line, lineIndex) => {
        const lineMatches = line.matchAll(regex);
        for (const match of lineMatches) {
          const contextName = extractContextName(lines, lineIndex);

          matches.push({
            category,
            type,
            file: relativePath,
            line: lineIndex + 1,
            context: contextName,
            snippet: line.trim(),
            matchText: match[0]
          });
        }
      });
    });
  });

  return matches;
}

/**
 * Main scan function
 */
function scanLocalStorageUsage() {
  console.log('🔍 Starting LocalStorage Usage Scan...\n');
  console.log('═'.repeat(80));

  const startTime = Date.now();
  const allFiles = getAllFiles(SRC_DIR);

  console.log(`📁 Found ${allFiles.length} files to scan\n`);

  const allMatches = [];
  let filesWithMatches = 0;

  allFiles.forEach((filePath, index) => {
    const matches = scanFile(filePath);
    if (matches.length > 0) {
      allMatches.push(...matches);
      filesWithMatches++;
    }

    // Progress indicator
    if ((index + 1) % 10 === 0) {
      process.stdout.write(`\rScanning... ${index + 1}/${allFiles.length}`);
    }
  });

  console.log(`\n\n✅ Scan complete!\n`);
  console.log('═'.repeat(80));

  // Generate statistics
  const stats = {
    totalFiles: allFiles.length,
    filesWithMatches,
    totalMatches: allMatches.length,
    byCategory: {},
    byType: {},
    byFile: {}
  };

  // Count by category
  allMatches.forEach(match => {
    stats.byCategory[match.category] = (stats.byCategory[match.category] || 0) + 1;

    const typeKey = `${match.category}.${match.type}`;
    stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1;

    stats.byFile[match.file] = (stats.byFile[match.file] || 0) + 1;
  });

  // Generate report
  const report = {
    scanDate: new Date().toISOString(),
    stats,
    matches: allMatches,
    summary: generateSummary(stats, allMatches)
  };

  // Ensure reports directory exists
  const reportsDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Write report to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  // Print summary to console
  printSummary(stats, allMatches);

  const endTime = Date.now();
  console.log(`\n⏱️  Scan completed in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  console.log(`📄 Report saved to: ${path.relative(process.cwd(), OUTPUT_FILE)}\n`);

  return report;
}

/**
 * Generate summary text
 */
function generateSummary(stats, matches) {
  const lines = [];

  lines.push('# LocalStorage Usage Audit Summary');
  lines.push('');
  lines.push(`**Scan Date:** ${new Date().toISOString()}`);
  lines.push(`**Total Files Scanned:** ${stats.totalFiles}`);
  lines.push(`**Files with Matches:** ${stats.filesWithMatches}`);
  lines.push(`**Total Matches:** ${stats.totalMatches}`);
  lines.push('');

  lines.push('## Breakdown by Category:');
  Object.entries(stats.byCategory).forEach(([category, count]) => {
    lines.push(`- ${category}: ${count} occurrences`);
  });
  lines.push('');

  lines.push('## Breakdown by Type:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    lines.push(`- ${type}: ${count} occurrences`);
  });
  lines.push('');

  lines.push('## Top 10 Files with Most Matches:');
  const sortedFiles = Object.entries(stats.byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  sortedFiles.forEach(([file, count], index) => {
    lines.push(`${index + 1}. ${file} (${count} matches)`);
  });

  return lines.join('\n');
}

/**
 * Print summary to console
 */
function printSummary(stats, matches) {
  console.log('\n📊 SCAN RESULTS:\n');
  console.log(`Total Files Scanned: ${stats.totalFiles}`);
  console.log(`Files with Matches: ${stats.filesWithMatches}`);
  console.log(`Total Matches: ${stats.totalMatches}\n`);

  console.log('🔴 Breakdown by Category:');
  Object.entries(stats.byCategory).forEach(([category, count]) => {
    const icon = category === 'localStorage' ? '🔴' : category === 'dataService' ? '🟠' : '🟡';
    console.log(`  ${icon} ${category}: ${count} occurrences`);
  });

  console.log('\n📁 Top 10 Files with Most Matches:');
  const sortedFiles = Object.entries(stats.byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  sortedFiles.forEach(([file, count], index) => {
    console.log(`  ${index + 1}. ${file} (${count} matches)`);
  });

  console.log('\n🔍 Sample Matches:');
  const samples = matches.slice(0, 5);
  samples.forEach((match, index) => {
    console.log(`\n  ${index + 1}. ${match.file}:${match.line}`);
    console.log(`     Category: ${match.category}.${match.type}`);
    console.log(`     Context: ${match.context}()`);
    console.log(`     Code: ${match.snippet}`);
  });

  if (matches.length > 5) {
    console.log(`\n  ... and ${matches.length - 5} more matches`);
  }
}

// Run scan if called directly
if (require.main === module) {
  try {
    scanLocalStorageUsage();
  } catch (error) {
    console.error('❌ Error during scan:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { scanLocalStorageUsage };
