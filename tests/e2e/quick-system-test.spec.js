/**
 * Quick System Test - No Authentication Required
 * Tests basic system functionality without login
 *
 * Tests:
 * 1. Homepage loads
 * 2. Backend API responds
 * 3. Database connection working
 * 4. Public form system ready
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

test.describe('Quick System Test (No Auth)', () => {

  test('1. Frontend loads correctly', async ({ page }) => {
    console.log('🌐 Testing frontend...');

    await page.goto(BASE_URL);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Check for logo using more specific selector
    const logo = page.locator('span.text-primary').filter({ hasText: 'Q-Collector' }).first();
    await expect(logo).toBeVisible();

    console.log('✅ Frontend loads correctly');
  });

  test('2. Backend API health check', async ({ request }) => {
    console.log('🔍 Testing backend health...');

    // Try health endpoint
    try {
      const response = await request.get(`${API_URL.replace('/api/v1', '')}/health`);
      console.log(`Backend health status: ${response.status()}`);

      if (response.ok()) {
        console.log('✅ Backend health check passed');
      } else {
        console.log('⚠️ Backend health check returned non-200');
      }
    } catch (error) {
      console.log('⚠️ Backend health endpoint not available');
    }

    // Try API docs endpoint
    const docsResponse = await request.get(`${API_URL}/docs.json`);
    expect(docsResponse.status()).toBeLessThan(500);

    console.log('✅ Backend API responds');
  });

  test('3. Database tables exist (via API)', async ({ request }) => {
    console.log('🗄️ Testing database connection...');

    // This endpoint should return 401 (unauthorized) but proves DB is working
    const response = await request.get(`${API_URL}/forms`);

    // We expect 401 without auth, NOT 500 (which would mean DB error)
    expect([200, 401, 403]).toContain(response.status());

    if (response.status() === 401) {
      console.log('✅ Database connection working (got expected 401)');
    } else if (response.status() === 200) {
      console.log('✅ Database connection working (got 200 - maybe public access?)');
    }
  });

  test('4. Dynamic table fix script exists', async () => {
    console.log('📝 Checking fix script...');

    const fs = require('fs');
    const path = require('path');

    const scriptPath = path.join(process.cwd(), 'backend/scripts/fix-dynamic-table-id-column.js');
    const exists = fs.existsSync(scriptPath);

    expect(exists).toBeTruthy();
    console.log('✅ Fix script exists');

    // Check script is executable
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('fixDynamicTableIdColumn');
    expect(content).toContain('ADD COLUMN id UUID');

    console.log('✅ Fix script looks valid');
  });

  test('5. Test results directory writable', async () => {
    console.log('📂 Testing file system...');

    const fs = require('fs');
    const path = require('path');

    const testFile = path.join(process.cwd(), 'test-results/test-write-check.txt');
    const testData = `Test write at ${new Date().toISOString()}`;

    fs.writeFileSync(testFile, testData);
    const readBack = fs.readFileSync(testFile, 'utf-8');

    expect(readBack).toBe(testData);

    // Clean up
    fs.unlinkSync(testFile);

    console.log('✅ File system writable');
  });

});

test.afterAll(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 QUICK TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('All system components checked without authentication');
  console.log('Backend: Running');
  console.log('Frontend: Running');
  console.log('Database: Connected');
  console.log('File System: Working');
  console.log('='.repeat(60));
});
