const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🔍') || text.includes('🎯') || text.includes('✅') ||
        text.includes('renderSubFormDetail') || text.includes('Sub-form') ||
        text.includes('allSubSubmissionsCount') || text.includes('currentSubSubmissionId') ||
        text.includes('currentIndex') || text.includes('hasPrevious') || text.includes('hasNext')) {
      logs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      console.log(`[${msg.type()}] ${text}`);
    }
  });

  try {
    // Navigate to the application
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if login is needed
    const isLoginPage = await page.locator('input[name="identifier"]').isVisible().catch(() => false);

    if (isLoginPage) {
      console.log('Login page detected, logging in...');
      await page.fill('input[name="identifier"]', 'pongpanp');
      await page.fill('input[name="password"]', 'Gfvtmiu613');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    // Wait for the main page to load
    await page.waitForTimeout(5000);

    // Take a screenshot to see what we have
    await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-home.png' });
    console.log('Screenshot saved to screenshot-home.png');

    // Try different selectors to find forms
    console.log('Looking for forms with sub-forms...');

    // Option 1: Direct form links
    let formLinks = await page.locator('a[href*="/form/"]').all();
    console.log(`Found ${formLinks.length} form links via href`);

    // Option 2: Look for any clickable items that might be forms
    if (formLinks.length === 0) {
      formLinks = await page.locator('[class*="card"], [class*="form"]').locator('a').all();
      console.log(`Found ${formLinks.length} form links via card/form class`);
    }

    // Option 3: Look for navigation menu
    if (formLinks.length === 0) {
      const navItems = await page.locator('nav a, [role="navigation"] a').all();
      console.log(`Found ${navItems.length} navigation items`);

      // Try clicking on "Forms" or similar menu item
      for (const navItem of navItems) {
        const text = await navItem.textContent();
        console.log(`Nav item: ${text}`);
        if (text && (text.includes('Form') || text.includes('ฟอร์ม'))) {
          console.log(`Clicking on nav item: ${text}`);
          await navItem.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'C:\\Users\\Pongpan\\Documents\\24Sep25\\screenshot-after-nav.png' });

          // Now try to find forms again
          formLinks = await page.locator('a[href*="/form/"]').all();
          console.log(`Found ${formLinks.length} form links after navigation`);
          break;
        }
      }
    }

    console.log(`Total form links found: ${formLinks.length}`);

    // Click on the first form
    if (formLinks.length > 0) {
      console.log('Clicking on first form...');
      await formLinks[0].click();
      await page.waitForTimeout(3000);

      // Look for submissions link
      const submissionsLink = await page.locator('text=/Submissions|รายการข้อมูล/i').first();
      const isVisible = await submissionsLink.isVisible().catch(() => false);

      if (isVisible) {
        console.log('Clicking on submissions link...');
        await submissionsLink.click();
        await page.waitForTimeout(3000);

        // Look for submission rows
        const submissionRows = await page.locator('tr[class*="cursor-pointer"]').all();
        console.log(`Found ${submissionRows.length} submission rows`);

        if (submissionRows.length > 0) {
          console.log('Clicking on first submission...');
          await submissionRows[0].click();
          await page.waitForTimeout(3000);

          // Look for sub-form sections
          const subFormSections = await page.locator('text=/Sub-Form|แบบฟอร์มย่อย/i').all();
          console.log(`Found ${subFormSections.length} sub-form sections`);

          if (subFormSections.length > 0) {
            // Scroll to sub-form section
            await subFormSections[0].scrollIntoViewIfNeeded();
            await page.waitForTimeout(2000);

            // Look for sub-form submission rows
            const subFormRows = await page.locator('table tr[class*="cursor-pointer"]').all();
            console.log(`Found ${subFormRows.length} sub-form rows`);

            if (subFormRows.length > 0) {
              console.log('Clicking on first sub-form submission...');
              await subFormRows[0].click();
              await page.waitForTimeout(5000);

              // Wait for any console logs to appear
              console.log('\n=== Waiting for console logs ===');
              await page.waitForTimeout(3000);
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('Error during test:', error);
  }

  // Print all captured logs
  console.log('\n=== CAPTURED CONSOLE LOGS ===');
  console.log(JSON.stringify(logs, null, 2));

  // Save logs to file
  const fs = require('fs');
  fs.writeFileSync(
    'C:\\Users\\Pongpan\\Documents\\24Sep25\\subform-console-logs.json',
    JSON.stringify(logs, null, 2)
  );
  console.log('\n=== Logs saved to subform-console-logs.json ===');

  // Keep browser open for inspection
  console.log('\nBrowser will stay open. Press Ctrl+C to close.');
  await page.waitForTimeout(60000);

  await browser.close();
})();
