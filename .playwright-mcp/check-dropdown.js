const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to app
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: '.playwright-mcp/step1-home.png', fullPage: true });

    // Try to navigate to form builder
    // Look for "สร้างฟอร์ม" or "แก้ไข" button
    const createFormButton = await page.locator('text=สร้างฟอร์ม').or(page.locator('text=แก้ไข')).or(page.locator('text=เพิ่มฟอร์ม')).first();
    if (await createFormButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createFormButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '.playwright-mcp/step2-form-builder.png', fullPage: true });
    }

    // Try to add a field - look for add button
    const addFieldButton = await page.locator('[data-testid="add-field"]').or(
      page.locator('button:has-text("เพิ่มฟิลด์")')
    ).or(
      page.locator('button:has-text("+")')
    ).first();

    if (await addFieldButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addFieldButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '.playwright-mcp/step3-field-added.png', fullPage: true });
    }

    // Look for dropdown selector
    const dropdown = await page.locator('select.input-glass').first();
    if (await dropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Scroll to dropdown
      await dropdown.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Take screenshot before opening
      await page.screenshot({ path: '.playwright-mcp/step4-dropdown-closed.png', fullPage: true });

      // Click to open dropdown
      await dropdown.click();
      await page.waitForTimeout(500);

      // Take screenshot with dropdown open
      await page.screenshot({ path: '.playwright-mcp/step5-dropdown-open.png', fullPage: true });

      // Get computed styles
      const styles = await dropdown.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          backgroundImage: computed.backgroundImage
        };
      });

      // Get option styles
      const optionStyles = await page.evaluate(() => {
        const select = document.querySelector('select.input-glass');
        if (!select || !select.options[0]) return null;
        const computed = window.getComputedStyle(select.options[0]);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });

      console.log('SELECT STYLES:', JSON.stringify(styles, null, 2));
      console.log('OPTION STYLES:', JSON.stringify(optionStyles, null, 2));

      // Check dark mode
      const isDark = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ||
               document.body.classList.contains('dark');
      });
      console.log('DARK MODE:', isDark);
    }

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '.playwright-mcp/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();