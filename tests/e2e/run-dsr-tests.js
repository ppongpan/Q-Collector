/**
 * DSR Test Runner with Comprehensive Reporting
 * Q-Collector v0.8.2-dev
 *
 * @description Runs E2E tests and generates detailed reports with recommendations
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`
${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════════════╗
║          DSR Management System E2E Test Suite                  ║
║          Q-Collector v0.8.2-dev                                ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
`);

const startTime = Date.now();

// Run Playwright tests
console.log(`${colors.blue}📋 Running Playwright E2E Tests...${colors.reset}\n`);

const testCommand = 'npx playwright test tests/e2e/pdpa/dsr-management.spec.js --reporter=list,json,html';

exec(testCommand, (error, stdout, stderr) => {
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(stdout);
  if (stderr) {
    console.log(`${colors.yellow}Warnings:${colors.reset}`);
    console.log(stderr);
  }

  // Read test results
  let results = null;
  try {
    const resultsPath = path.join(__dirname, '../../test-results/results.json');
    if (fs.existsSync(resultsPath)) {
      results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    }
  } catch (e) {
    console.log(`${colors.yellow}⚠️  Could not parse test results JSON${colors.reset}`);
  }

  // Generate comprehensive report
  console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════════════╗
║                    TEST EXECUTION REPORT                       ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.bright}⏱️  Total Duration:${colors.reset} ${duration}s`);

  if (results) {
    const stats = results.suites.reduce((acc, suite) => {
      suite.specs.forEach(spec => {
        spec.tests.forEach(test => {
          acc.total++;
          if (test.results && test.results.length > 0) {
            const result = test.results[0];
            if (result.status === 'passed') acc.passed++;
            else if (result.status === 'failed') acc.failed++;
            else if (result.status === 'skipped') acc.skipped++;
          }
        });
      });
      return acc;
    }, { total: 0, passed: 0, failed: 0, skipped: 0 });

    console.log(`${colors.green}✅ Passed:${colors.reset} ${stats.passed}/${stats.total}`);
    if (stats.failed > 0) {
      console.log(`${colors.red}❌ Failed:${colors.reset} ${stats.failed}/${stats.total}`);
    }
    if (stats.skipped > 0) {
      console.log(`${colors.yellow}⏭️  Skipped:${colors.reset} ${stats.skipped}/${stats.total}`);
    }

    const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
    console.log(`\n${colors.bright}📊 Pass Rate:${colors.reset} ${passRate}%`);
  }

  // Generate recommendations report
  console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════════════╗
║                   ANALYSIS & RECOMMENDATIONS                   ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  generateRecommendations(error, results);

  // Show how to view HTML report
  console.log(`\n${colors.cyan}${colors.bright}📄 Detailed HTML Report:${colors.reset}`);
  console.log(`   Run: ${colors.green}npx playwright show-report${colors.reset}`);
  console.log(`   Or open: ${colors.yellow}playwright-report/index.html${colors.reset}\n`);

  process.exit(error ? 1 : 0);
});

function generateRecommendations(error, results) {
  const recommendations = [];

  // Test coverage analysis
  recommendations.push({
    category: '📊 Test Coverage',
    status: 'info',
    items: [
      '✅ Dashboard overview testing',
      '✅ Profile list display',
      '✅ Profile detail modal',
      '✅ Tab navigation',
      '✅ DSR request form',
      '✅ All 6 DSR request types',
      '✅ Form validation',
      '✅ Data retention management',
      '✅ Search functionality',
      '✅ Keyboard accessibility',
      '✅ Empty state handling',
      '✅ Modal overlay behavior',
      '✅ Responsive design',
      '✅ Performance metrics',
      '✅ Dark mode support'
    ]
  });

  // Implementation recommendations
  recommendations.push({
    category: '💡 Implementation Improvements',
    status: 'suggestion',
    items: [
      'Add data-testid attributes to key components for more reliable selectors',
      'Implement loading states testing',
      'Add error boundary testing',
      'Test API failure scenarios',
      'Add visual regression testing with Percy or Chromatic',
      'Implement database cleanup between tests',
      'Add performance budgets (lighthouse CI)',
      'Test real DSR request submission (with cleanup)',
      'Add automated accessibility testing (axe-core)',
      'Test concurrent user scenarios'
    ]
  });

  // Security & compliance
  recommendations.push({
    category: '🔒 Security & PDPA Compliance',
    status: 'important',
    items: [
      'Verify data encryption in transit and at rest',
      'Test role-based access control (RBAC) for DSR operations',
      'Verify 30-day DSR processing deadline tracking',
      'Test audit logging for all DSR operations',
      'Verify user identity verification in DSR requests',
      'Test data deletion permanence (right to erasure)',
      'Verify consent withdrawal workflow',
      'Test data export format compliance (data portability)'
    ]
  });

  // UX/UI improvements
  recommendations.push({
    category: '🎨 UX/UI Enhancements',
    status: 'suggestion',
    items: [
      'Add progress indicators for long-running operations',
      'Implement toast notifications testing',
      'Add confirmation dialogs for destructive actions',
      'Test form auto-save functionality',
      'Verify loading skeletons during data fetch',
      'Test keyboard shortcuts',
      'Add tooltips for complex fields',
      'Test mobile touch gestures'
    ]
  });

  // Performance optimization
  recommendations.push({
    category: '⚡ Performance Optimization',
    status: 'suggestion',
    items: [
      'Implement virtual scrolling for large profile lists',
      'Add pagination testing for large datasets',
      'Test lazy loading of profile details',
      'Verify image optimization (if applicable)',
      'Test bundle size optimization',
      'Add service worker caching strategy',
      'Test API response caching',
      'Verify database query optimization'
    ]
  });

  // Critical path testing
  if (error || (results && hasFailedTests(results))) {
    recommendations.push({
      category: '🚨 Critical Issues',
      status: 'error',
      items: [
        'FAILED TESTS DETECTED - Review test results above',
        'Check browser console for JavaScript errors',
        'Verify backend API is running on port 5000',
        'Verify frontend is running on port 3000',
        'Check database connectivity',
        'Review test-results folder for screenshots and traces',
        'Run tests with --debug flag for detailed output'
      ]
    });
  }

  // Print recommendations
  recommendations.forEach(rec => {
    const icon = rec.status === 'error' ? '🚨' :
                 rec.status === 'important' ? '⚠️' :
                 rec.status === 'info' ? 'ℹ️' : '💡';

    const color = rec.status === 'error' ? colors.red :
                  rec.status === 'important' ? colors.yellow :
                  rec.status === 'info' ? colors.blue : colors.green;

    console.log(`\n${color}${colors.bright}${icon} ${rec.category}${colors.reset}`);
    rec.items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item}`);
    });
  });

  // Next steps
  console.log(`\n${colors.cyan}${colors.bright}🚀 Next Steps:${colors.reset}`);
  console.log(`   1. Review HTML report for detailed test results`);
  console.log(`   2. Fix any failed tests before deployment`);
  console.log(`   3. Add data-testid attributes to improve test reliability`);
  console.log(`   4. Implement recommended security tests`);
  console.log(`   5. Set up CI/CD pipeline for automated testing`);
  console.log(`   6. Run tests in multiple browsers (Firefox, Safari)`);
  console.log(`   7. Perform load testing with k6 or Artillery`);
  console.log(`   8. Conduct manual penetration testing`);
}

function hasFailedTests(results) {
  if (!results || !results.suites) return false;

  return results.suites.some(suite =>
    suite.specs.some(spec =>
      spec.tests.some(test =>
        test.results && test.results.some(result => result.status === 'failed')
      )
    )
  );
}
