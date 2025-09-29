// Test number formatting utility
import {
  formatNumberDisplay,
  parseNumberInput,
  isValidNumber,
  formatNumberByContext
} from './src/utils/numberFormatter.js';

// Test cases
const testCases = [
  { input: '1234567', expected: '1,234,567' },
  { input: '1234.56', expected: '1,234.56' },
  { input: '-9876543', expected: '-9,876,543' },
  { input: '1000', expected: '1,000' },
  { input: '100', expected: '100' },
  { input: '1234.5678', expected: '1,234.5678' },
  { input: '', expected: '' },
  { input: 'abc', expected: 'abc' },
  { input: '0', expected: '0' }
];

console.log('Testing Number Formatting Utility');
console.log('==================================');

testCases.forEach((testCase, index) => {
  const result = formatNumberDisplay(testCase.input);
  const passed = result === testCase.expected;

  console.log(`Test ${index + 1}: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Input: "${testCase.input}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got: "${result}"`);
  console.log('');
});

// Test parse function
console.log('Testing Parse Function');
console.log('======================');

const parseTests = [
  { input: '1,234,567', expected: '1234567' },
  { input: '1,234.56', expected: '1234.56' },
  { input: '-9,876,543', expected: '-9876543' },
  { input: '1000', expected: '1000' }
];

parseTests.forEach((testCase, index) => {
  const result = parseNumberInput(testCase.input);
  const passed = result === testCase.expected;

  console.log(`Parse Test ${index + 1}: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Input: "${testCase.input}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got: "${result}"`);
  console.log('');
});

// Test validity function
console.log('Testing Validity Function');
console.log('=========================');

const validityTests = [
  { input: '1234567', expected: true },
  { input: '1,234,567', expected: true },
  { input: '1234.56', expected: true },
  { input: '-1234', expected: true },
  { input: '', expected: false },
  { input: 'abc', expected: false },
  { input: null, expected: false },
  { input: undefined, expected: false }
];

validityTests.forEach((testCase, index) => {
  const result = isValidNumber(testCase.input);
  const passed = result === testCase.expected;

  console.log(`Validity Test ${index + 1}: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Input: "${testCase.input}"`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Got: ${result}`);
  console.log('');
});