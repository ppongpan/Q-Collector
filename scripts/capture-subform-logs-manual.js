/**
 * Manual Sub-Form Navigation Log Capture
 *
 * INSTRUCTIONS:
 * 1. Make sure you're already logged into http://localhost:3000 in your browser
 * 2. Open the browser's DevTools console (F12)
 * 3. Copy and paste this entire script into the console
 * 4. The script will navigate automatically and capture logs
 *
 * Or run with Playwright assuming you're already logged in from browser storage
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  // Use existing browser context with storage
  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:3000',
          localStorage: [
            // You need to manually add your tokens here after logging in once
            // Check localStorage in browser DevTools to get these values
            { name: 'q-collector-auth-token', value: 'YOUR_TOKEN_HERE' },
            { name: 'q-collector-refresh-token', value: 'YOUR_REFRESH_TOKEN_HERE' },
            { name: 'user', value: 'YOUR_USER_JSON_HERE' }
          ]
        }
      ]
    }
  });

  const page = await context.newPage();

  // Capture ALL console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });

    // Print relevant logs in real-time
    if (
      text.includes('🔍') ||
      text.includes('🎯') ||
      text.includes('✅') ||
      text.includes('renderSubFormDetail') ||
      text.includes('Sub-form') ||
      text.includes('allSubSubmissionsCount') ||
      text.includes('currentSubSubmissionId') ||
      text.includes('currentIndex') ||
      text.includes('hasPrevious') ||
      text.includes('hasNext') ||
      text.includes('sub.id')
    ) {
      console.log(`\n🔍 [${msg.type()}] ${text}`);
    }
  });

  try {
    console.log('\n=== Starting Navigation ===\n');

    // Navigate to home
    console.log('1. Navigating to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   Current URL:', page.url());

    // Check if logged in
    if (page.url().includes('/login')) {
      console.log('\n❌ ERROR: Not logged in!');
      console.log('Please log in manually first, or update the storageState in this script.');
      await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\login-required.png' });
      return;
    }

    // Navigate to a form with sub-forms (you may need to change the form ID)
    console.log('\n2. Looking for forms...');
    await page.goto('http://localhost:3000/forms', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Get first form link
    const formLinks = await page.locator('a[href*="/form/"]').all();
    console.log(`   Found ${formLinks.length} form links`);

    if (formLinks.length === 0) {
      console.log('\n❌ No forms found!');
      return;
    }

    // Click first form
    const firstFormHref = await formLinks[0].getAttribute('href');
    console.log(`\n3. Clicking first form: ${firstFormHref}`);
    await formLinks[0].click();
    await page.waitForTimeout(3000);

    // Navigate to submissions
    const formId = firstFormHref.match(/\/form\/([^\/]+)/)?.[1];
    console.log(`\n4. Navigating to submissions for form: ${formId}`);
    await page.goto(`http://localhost:3000/form/${formId}/submissions`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Click first submission
    const submissionRows = await page.locator('tbody tr').all();
    console.log(`   Found ${submissionRows.length} submissions`);

    if (submissionRows.length === 0) {
      console.log('\n❌ No submissions found!');
      return;
    }

    console.log('\n5. Clicking first submission...');
    await submissionRows[0].click();
    await page.waitForTimeout(3000);

    // Scroll to find sub-form sections
    console.log('\n6. Looking for sub-form sections...');
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000);

    // Look for clickable sub-form rows
    const subFormRows = await page.locator('table tbody tr[class*="cursor-pointer"]').all();
    console.log(`   Found ${subFormRows.length} clickable sub-form rows`);

    if (subFormRows.length === 0) {
      console.log('\n⚠️ No sub-form submissions found in this submission.');
      console.log('Try a different form or submission that has sub-forms with data.');
      return;
    }

    console.log('\n7. === CLICKING SUB-FORM ROW ===');
    await subFormRows[0].click();
    await page.waitForTimeout(5000);

    console.log('\n8. Waiting for navigation logs...');
    await page.waitForTimeout(3000);

    console.log('\n=== DONE ===\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\error-screenshot.png' });
  }

  // Filter and save logs
  const relevantLogs = logs.filter(log =>
    log.text.includes('🔍') ||
    log.text.includes('🎯') ||
    log.text.includes('✅') ||
    log.text.includes('renderSubFormDetail') ||
    log.text.includes('allSubSubmissionsCount') ||
    log.text.includes('currentSubSubmissionId') ||
    log.text.includes('currentIndex') ||
    log.text.includes('hasPrevious') ||
    log.text.includes('hasNext') ||
    log.text.includes('sub.id') ||
    log.text.includes('Sub-form navigation')
  );

  console.log('\n=== RELEVANT CONSOLE LOGS ===');
  relevantLogs.forEach(log => {
    console.log(`[${log.type}] ${log.text}`);
  });

  // Save to file
  const fs = require('fs');
  fs.writeFileSync(
    'C:\\Users\\Pongpan\\Documents\\24Sep25\\subform-logs-manual.json',
    JSON.stringify({ relevant: relevantLogs, all: logs }, null, 2)
  );

  console.log('\n✅ Logs saved to subform-logs-manual.json');
  console.log('\nBrowser will stay open. Press Ctrl+C to close.');
  await page.waitForTimeout(300000); // 5 minutes

  await browser.close();
})();
