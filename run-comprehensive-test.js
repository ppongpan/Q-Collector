/**
 * Comprehensive Test Runner
 * Runs full E2E test suite with proper setup and reporting
 *
 * Usage:
 *   node run-comprehensive-test.js
 *   node run-comprehensive-test.js --headed
 *   node run-comprehensive-test.js --debug
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  headed: process.argv.includes('--headed'),
  debug: process.argv.includes('--debug'),
  retries: process.argv.includes('--no-retry') ? 0 : 2,
  workers: process.argv.includes('--serial') ? 1 : 2,
  timeout: 60000,
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiURL: process.env.API_URL || 'http://localhost:5000/api/v1'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printBanner() {
  console.log('');
  log('═'.repeat(70), 'cyan');
  log('  Q-COLLECTOR COMPREHENSIVE TEST SUITE', 'bright');
  log('  Version: v0.9.0-dev', 'cyan');
  log('  Date: ' + new Date().toISOString(), 'cyan');
  log('═'.repeat(70), 'cyan');
  console.log('');
}

function printConfig() {
  log('📋 Test Configuration:', 'blue');
  log(`  • Mode: ${CONFIG.headed ? 'Headed' : 'Headless'}`, 'cyan');
  log(`  • Debug: ${CONFIG.debug ? 'Enabled' : 'Disabled'}`, 'cyan');
  log(`  • Retries: ${CONFIG.retries}`, 'cyan');
  log(`  • Workers: ${CONFIG.workers}`, 'cyan');
  log(`  • Timeout: ${CONFIG.timeout}ms`, 'cyan');
  log(`  • Base URL: ${CONFIG.baseURL}`, 'cyan');
  log(`  • API URL: ${CONFIG.apiURL}`, 'cyan');
  console.log('');
}

function checkPrerequisites() {
  log('🔍 Checking prerequisites...', 'yellow');

  // Check if servers are running
  const checks = [
    {
      name: 'Frontend Server',
      url: CONFIG.baseURL,
      port: 3000
    },
    {
      name: 'Backend Server',
      url: CONFIG.apiURL,
      port: 5000
    }
  ];

  let allGood = true;

  checks.forEach(check => {
    try {
      const result = execSync(`netstat -ano | findstr :${check.port}`, { encoding: 'utf-8' });
      if (result.includes('LISTENING')) {
        log(`  ✅ ${check.name} is running`, 'green');
      } else {
        log(`  ❌ ${check.name} is NOT running`, 'red');
        allGood = false;
      }
    } catch (error) {
      log(`  ❌ ${check.name} is NOT running`, 'red');
      allGood = false;
    }
  });

  console.log('');

  if (!allGood) {
    log('❌ Prerequisites not met. Please start all servers first.', 'red');
    log('   Backend: cd backend && npm start', 'yellow');
    log('   Frontend: npm start', 'yellow');
    process.exit(1);
  }

  log('✅ All prerequisites met', 'green');
  console.log('');
}

function createDirectories() {
  const dirs = [
    'tests/e2e/.auth',
    'tests/e2e/screenshots',
    'tests/e2e/reports',
    'test-results'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function runTests() {
  log('🚀 Starting test execution...', 'bright');
  console.log('');

  // Build Playwright command
  const args = [
    'npx playwright test',
    'tests/e2e/comprehensive-system-test.spec.js',
    CONFIG.headed ? '--headed' : '',
    CONFIG.debug ? '--debug' : '',
    `--retries=${CONFIG.retries}`,
    `--workers=${CONFIG.workers}`,
    `--timeout=${CONFIG.timeout}`,
    '--reporter=list,html',
    '--reporter-options=open=never'
  ].filter(Boolean).join(' ');

  log('📝 Command: ' + args, 'cyan');
  console.log('');

  try {
    execSync(args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        BASE_URL: CONFIG.baseURL,
        API_URL: CONFIG.apiURL,
        PWDEBUG: CONFIG.debug ? '1' : '0'
      }
    });

    return true;
  } catch (error) {
    return false;
  }
}

function printResults(success) {
  console.log('');
  log('═'.repeat(70), 'cyan');

  if (success) {
    log('  ✅ ALL TESTS PASSED', 'green');
  } else {
    log('  ❌ SOME TESTS FAILED', 'red');
  }

  log('═'.repeat(70), 'cyan');
  console.log('');

  // Print report location
  log('📊 Test Reports:', 'blue');
  log('  • HTML Report: playwright-report/index.html', 'cyan');
  log('  • JSON Results: comprehensive-test-results.json', 'cyan');
  log('  • Screenshots: tests/e2e/screenshots/', 'cyan');
  console.log('');

  // Print quick stats
  if (fs.existsSync('comprehensive-test-results.json')) {
    try {
      const results = JSON.parse(fs.readFileSync('comprehensive-test-results.json', 'utf-8'));
      log('📈 Quick Stats:', 'blue');
      log(`  • Test Form ID: ${results.testFormId || 'N/A'}`, 'cyan');
      log(`  • Submission ID: ${results.testSubmissionId || 'N/A'}`, 'cyan');
      log(`  • Public Slug: ${results.publicFormSlug || 'N/A'}`, 'cyan');
      log(`  • Timestamp: ${results.timestamp || 'N/A'}`, 'cyan');
      console.log('');
    } catch (error) {
      // Ignore parse errors
    }
  }

  // Print next steps
  if (success) {
    log('✅ Next Steps:', 'green');
    log('  1. View HTML report: npx playwright show-report', 'cyan');
    log('  2. Check test results in comprehensive-test-results.json', 'cyan');
    log('  3. Review screenshots if any tests took them', 'cyan');
  } else {
    log('⚠️  Next Steps:', 'yellow');
    log('  1. View HTML report: npx playwright show-report', 'cyan');
    log('  2. Check failed tests in the report', 'cyan');
    log('  3. Re-run with --headed to see what failed', 'cyan');
    log('  4. Check screenshots for visual debugging', 'cyan');
  }

  console.log('');
}

// Main execution
async function main() {
  try {
    printBanner();
    printConfig();
    checkPrerequisites();
    createDirectories();

    const startTime = Date.now();
    const success = runTests();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    printResults(success);

    log(`⏱️  Total duration: ${duration}s`, 'yellow');
    console.log('');

    process.exit(success ? 0 : 1);

  } catch (error) {
    log('❌ Fatal error:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run
main();
