const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
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
    console.log(`[${msg.type()}] ${text}`);
  });

  try {
    // Navigate to the application
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if we're on login page by URL
    const currentUrl = page.url();
    console.log('Initial URL:', currentUrl);
    const isLoginPage = currentUrl.includes('/login');

    if (isLoginPage) {
      console.log('Login page detected, logging in...');

      // Fill username
      const usernameInput = page.locator('input[name="username"]');
      await usernameInput.waitFor({ state: 'visible' });
      await usernameInput.fill('pongpanp');
      await page.waitForTimeout(500);

      // Fill password
      const passwordInput = page.locator('input[name="password"]');
      await passwordInput.waitFor({ state: 'visible' });
      await passwordInput.fill('Gfvtmiu613');
      await page.waitForTimeout(500);

      // Take screenshot before login
      await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-before-login.png' });

      // Click submit button
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Wait for navigation
      await page.waitForURL('http://localhost:3000/**', { timeout: 10000 });
      await page.waitForTimeout(3000);

      console.log('Login completed, current URL:', page.url());
      await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-after-login.png' });
    }

    // Wait for the main page to load
    await page.waitForTimeout(3000);

    // Get the current URL after login
    const afterLoginUrl = page.url();
    console.log('Current URL after login:', afterLoginUrl);

    // Take a screenshot
    await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-step1-home.png' });

    // Try to find any forms by looking at the page content
    const pageContent = await page.content();
    console.log('Page has forms:', pageContent.includes('form'));

    // Look for any buttons or links that might lead to forms
    const allLinks = await page.locator('a').all();
    console.log(`Found ${allLinks.length} total links`);

    // Get all hrefs
    const hrefs = [];
    for (const link of allLinks.slice(0, 20)) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      if (href) {
        hrefs.push({ href, text: text?.trim() });
      }
    }
    console.log('First 20 links:', JSON.stringify(hrefs, null, 2));

    // Try to navigate directly to forms list
    console.log('\nNavigating to forms list...');
    await page.goto('http://localhost:3000/forms', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-step2-forms.png' });

    // Look for form cards or links
    const formCards = await page.locator('[class*="card"], [class*="form-item"]').all();
    console.log(`Found ${formCards.length} form cards`);

    // Click on first form if available
    if (formCards.length > 0) {
      console.log('Clicking on first form card...');
      await formCards[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-step3-form-detail.png' });

      const formDetailUrl = page.url();
      console.log('Form detail URL:', formDetailUrl);

      // Extract form ID from URL
      const formIdMatch = formDetailUrl.match(/\/form\/([^\/\?]+)/);
      if (formIdMatch) {
        const formId = formIdMatch[1];
        console.log('Form ID:', formId);

        // Navigate to submissions
        console.log('\nNavigating to submissions...');
        await page.goto(`http://localhost:3000/form/${formId}/submissions`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-step4-submissions.png' });

        // Look for submission rows
        const submissionRows = await page.locator('tbody tr, [role="row"]').all();
        console.log(`Found ${submissionRows.length} submission rows`);

        if (submissionRows.length > 0) {
          // Click on first submission
          console.log('Clicking on first submission...');
          await submissionRows[0].click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-step5-submission-detail.png' });

          const submissionUrl = page.url();
          console.log('Submission detail URL:', submissionUrl);

          // Look for sub-form sections
          console.log('\nLooking for sub-form sections...');

          // Scroll down to see more content
          await page.evaluate(() => window.scrollBy(0, 500));
          await page.waitForTimeout(2000);

          // Look for sub-form tables or sections
          const subFormTables = await page.locator('table').all();
          console.log(`Found ${subFormTables.length} tables on page`);

          // Look for clickable rows in tables
          const clickableRows = await page.locator('table tbody tr[class*="cursor-pointer"]').all();
          console.log(`Found ${clickableRows.length} clickable table rows`);

          if (clickableRows.length > 0) {
            console.log('\n=== CLICKING ON SUB-FORM ROW ===');
            await clickableRows[0].click();
            await page.waitForTimeout(5000);
            await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-step6-subform-detail.png' });

            // Wait for navigation logs
            console.log('\n=== Waiting for console logs ===');
            await page.waitForTimeout(3000);
          } else {
            console.log('No clickable sub-form rows found');
          }
        }
      }
    }

  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-error.png' });
  }

  // Filter and print relevant logs
  console.log('\n=== FILTERED CONSOLE LOGS (Sub-form Navigation) ===');
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

  console.log(JSON.stringify(relevantLogs, null, 2));

  // Save all logs to file
  const fs = require('fs');
  fs.writeFileSync(
    'C:\\Users\\Pongpan\\Documents\\24Sep25\\subform-console-logs-v2.json',
    JSON.stringify(logs, null, 2)
  );
  console.log('\n=== All logs saved to subform-console-logs-v2.json ===');

  // Keep browser open for inspection
  console.log('\nBrowser will stay open for 60 seconds. Press Ctrl+C to close earlier.');
  await page.waitForTimeout(60000);

  await browser.close();
})();
