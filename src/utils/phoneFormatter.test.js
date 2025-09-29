/**
 * Test cases for phone number formatting
 * This file can be used to verify phone number formatting works correctly
 */

import {
  cleanPhoneNumber,
  isValidThaiPhone,
  formatPhoneDisplay,
  createTelLink,
  shouldFormatAsPhone,
  createPhoneLink
} from './phoneFormatter.js';

// Test data
const testCases = [
  // Valid Thai mobile numbers
  { input: '0812345678', expected: '081-234-5678', tel: '+66812345678' },
  { input: '081-234-5678', expected: '081-234-5678', tel: '+66812345678' },
  { input: '081 234 5678', expected: '081-234-5678', tel: '+66812345678' },
  { input: '0981234567', expected: '098-123-4567', tel: '+66981234567' },
  { input: '+66812345678', expected: '+66 81-234-5678', tel: '+66812345678' },

  // Edge cases
  { input: '0871234567', expected: '087-123-4567', tel: '+66871234567' },
  { input: '0621234567', expected: '062-123-4567', tel: '+66621234567' },

  // Invalid cases
  { input: '1234567', expected: '1234567', tel: '1234567' },
  { input: '', expected: '', tel: '' },
  { input: null, expected: null, tel: '' },
  { input: 'abc', expected: 'abc', tel: '' },
];

// Run tests (for manual verification)
export const runPhoneFormatterTests = () => {
  console.log('📞 Phone Formatter Tests');
  console.log('========================');

  testCases.forEach((testCase, index) => {
    const { input, expected, tel } = testCase;

    console.log(`\nTest ${index + 1}: "${input}"`);
    console.log('-------------------');

    // Test cleanPhoneNumber
    const cleaned = cleanPhoneNumber(input);
    console.log(`Cleaned: "${cleaned}"`);

    // Test isValidThaiPhone
    const isValid = isValidThaiPhone(input);
    console.log(`Valid: ${isValid}`);

    // Test formatPhoneDisplay
    const formatted = formatPhoneDisplay(input);
    console.log(`Formatted: "${formatted}"`);

    // Test createTelLink
    const telLink = createTelLink(input);
    console.log(`Tel link: "${telLink}"`);

    // Test shouldFormatAsPhone
    const shouldFormat = shouldFormatAsPhone(input, 'phone');
    console.log(`Should format: ${shouldFormat}`);

    // Test createPhoneLink
    const phoneProps = createPhoneLink(input);
    console.log(`Clickable: ${phoneProps.isClickable}`);
    console.log(`Display: "${phoneProps.display}"`);

    // Status
    const formatStatus = formatted === expected ? '✅' : '❌';
    const telStatus = telLink === tel ? '✅' : '❌';
    console.log(`Format test: ${formatStatus} (expected: "${expected}")`);
    console.log(`Tel test: ${telStatus} (expected: "${tel}")`);
  });

  console.log('\n🎯 Test Summary');
  console.log('================');
  console.log('All tests completed. Check individual results above.');
  console.log('✅ = Pass, ❌ = Fail');

  return true;
};

// Demo HTML output for testing in browser
export const generateTestHTML = () => {
  const html = `
    <div style="font-family: Arial, sans-serif; margin: 20px;">
      <h2>📞 Phone Number Formatting Test</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th>Input</th>
            <th>Formatted Display</th>
            <th>Tel Link</th>
            <th>Is Valid</th>
            <th>Test Result</th>
          </tr>
        </thead>
        <tbody>
          ${testCases.map((testCase, index) => {
            const { input, expected } = testCase;
            const formatted = formatPhoneDisplay(input);
            const telLink = createTelLink(input);
            const isValid = isValidThaiPhone(input);
            const phoneProps = createPhoneLink(input);

            return `
              <tr>
                <td><code>"${input}"</code></td>
                <td>
                  ${phoneProps.isClickable ?
                    `<a href="${phoneProps.telLink}" style="color: #f97316; text-decoration: none;">
                      📞 ${phoneProps.display}
                    </a>` :
                    phoneProps.display
                  }
                </td>
                <td><code>${telLink}</code></td>
                <td>${isValid ? '✅' : '❌'}</td>
                <td>${formatted === expected ? '✅ Pass' : '❌ Fail'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <h3>📱 Mobile Testing Instructions</h3>
      <ol>
        <li>Open this page on a mobile device</li>
        <li>Tap on any phone number link above</li>
        <li>Verify that the phone dialer opens with the correct number</li>
        <li>Check that the format displays correctly</li>
      </ol>

      <h3>🎨 Design Integration</h3>
      <p>Phone numbers are formatted with:</p>
      <ul>
        <li>📞 Phone icon for visual recognition</li>
        <li>Orange theme color (#f97316) for consistency</li>
        <li>Hover effects for interactivity</li>
        <li>Accessibility attributes for screen readers</li>
        <li>Touch-friendly sizing for mobile devices</li>
      </ul>
    </div>
  `;

  return html;
};

// Export for use in components
export { testCases };