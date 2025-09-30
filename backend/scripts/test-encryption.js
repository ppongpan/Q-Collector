#!/usr/bin/env node
/**
 * Test Encryption Utility
 * Manual test script for encryption/decryption functionality
 */

const crypto = require('crypto');

// Set encryption key if not already set
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}

const encryption = require('../utils/encryption.util');

console.log('=== Encryption Utility Test ===\n');

// Test 1: Basic Encryption/Decryption
console.log('Test 1: Basic Encryption/Decryption');
try {
  const plainText = 'Hello, World!';
  console.log(`Original: ${plainText}`);

  const encrypted = encryption.encrypt(plainText);
  console.log(`Encrypted IV: ${encrypted.iv.substring(0, 16)}...`);
  console.log(`Encrypted Data: ${encrypted.encryptedData.substring(0, 32)}...`);
  console.log(`Auth Tag: ${encrypted.authTag.substring(0, 16)}...`);

  const decrypted = encryption.decrypt(encrypted);
  console.log(`Decrypted: ${decrypted}`);

  if (plainText === decrypted) {
    console.log('✓ Test 1 PASSED\n');
  } else {
    console.log('✗ Test 1 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 1 FAILED: ${error.message}\n`);
}

// Test 2: Thai Language Support
console.log('Test 2: Thai Language Support');
try {
  const thaiText = 'ทดสอบระบบเข้ารหัส';
  console.log(`Original: ${thaiText}`);

  const encrypted = encryption.encrypt(thaiText);
  const decrypted = encryption.decrypt(encrypted);
  console.log(`Decrypted: ${decrypted}`);

  if (thaiText === decrypted) {
    console.log('✓ Test 2 PASSED\n');
  } else {
    console.log('✗ Test 2 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 2 FAILED: ${error.message}\n`);
}

// Test 3: Special Characters
console.log('Test 3: Special Characters');
try {
  const specialText = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
  console.log(`Original: ${specialText}`);

  const encrypted = encryption.encrypt(specialText);
  const decrypted = encryption.decrypt(encrypted);
  console.log(`Decrypted: ${decrypted}`);

  if (specialText === decrypted) {
    console.log('✓ Test 3 PASSED\n');
  } else {
    console.log('✗ Test 3 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 3 FAILED: ${error.message}\n`);
}

// Test 4: Long Text
console.log('Test 4: Long Text');
try {
  const longText = 'A'.repeat(10000);
  console.log(`Original length: ${longText.length} characters`);

  const encrypted = encryption.encrypt(longText);
  const decrypted = encryption.decrypt(encrypted);
  console.log(`Decrypted length: ${decrypted.length} characters`);

  if (longText === decrypted) {
    console.log('✓ Test 4 PASSED\n');
  } else {
    console.log('✗ Test 4 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 4 FAILED: ${error.message}\n`);
}

// Test 5: Multiple Encryption (Different IVs)
console.log('Test 5: Multiple Encryption (Different IVs)');
try {
  const text = 'Same text, different encryptions';

  const encrypted1 = encryption.encrypt(text);
  const encrypted2 = encryption.encrypt(text);

  if (encrypted1.iv !== encrypted2.iv && encrypted1.encryptedData !== encrypted2.encryptedData) {
    console.log('IVs are different: ✓');
    console.log('Encrypted data is different: ✓');

    const decrypted1 = encryption.decrypt(encrypted1);
    const decrypted2 = encryption.decrypt(encrypted2);

    if (decrypted1 === text && decrypted2 === text) {
      console.log('Both decrypt correctly: ✓');
      console.log('✓ Test 5 PASSED\n');
    } else {
      console.log('✗ Test 5 FAILED (decryption mismatch)\n');
    }
  } else {
    console.log('✗ Test 5 FAILED (IVs should be different)\n');
  }
} catch (error) {
  console.log(`✗ Test 5 FAILED: ${error.message}\n`);
}

// Test 6: Hash Function
console.log('Test 6: Hash Function');
try {
  const text = 'Password123';
  const hash1 = encryption.hash(text);
  const hash2 = encryption.hash(text);

  console.log(`Hash: ${hash1.substring(0, 32)}...`);

  if (hash1 === hash2) {
    console.log('Consistent hashing: ✓');
  }

  const differentHash = encryption.hash('Password124');
  if (hash1 !== differentHash) {
    console.log('Different inputs produce different hashes: ✓');
    console.log('✓ Test 6 PASSED\n');
  } else {
    console.log('✗ Test 6 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 6 FAILED: ${error.message}\n`);
}

// Test 7: Generate Encryption Key
console.log('Test 7: Generate Encryption Key');
try {
  const key = encryption.generateEncryptionKey();
  console.log(`Generated Key: ${key.substring(0, 32)}...`);

  if (encryption.isValidEncryptionKey(key)) {
    console.log('Key is valid: ✓');
    console.log('✓ Test 7 PASSED\n');
  } else {
    console.log('✗ Test 7 FAILED (invalid key format)\n');
  }
} catch (error) {
  console.log(`✗ Test 7 FAILED: ${error.message}\n`);
}

// Test 8: Checksum Generation and Verification
console.log('Test 8: Checksum Generation and Verification');
try {
  const data = Buffer.from('Test data for checksum');
  const checksum = encryption.generateChecksum(data);

  console.log(`Checksum: ${checksum}`);

  const isValid = encryption.verifyChecksum(data, checksum);
  if (isValid) {
    console.log('Checksum verification: ✓');
  }

  const tamperedData = Buffer.from('Tampered data');
  const isInvalid = !encryption.verifyChecksum(tamperedData, checksum);
  if (isInvalid) {
    console.log('Tampered data detected: ✓');
    console.log('✓ Test 8 PASSED\n');
  } else {
    console.log('✗ Test 8 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 8 FAILED: ${error.message}\n`);
}

// Test 9: JSON Serialization
console.log('Test 9: JSON Serialization (Database Storage Simulation)');
try {
  const text = 'Data to store in database';
  const encrypted = encryption.encrypt(text);

  // Simulate storing in database
  const jsonString = JSON.stringify(encrypted);
  console.log(`JSON: ${jsonString.substring(0, 80)}...`);

  // Simulate retrieving from database
  const parsed = JSON.parse(jsonString);
  const decrypted = encryption.decrypt(parsed);

  if (text === decrypted) {
    console.log('✓ Test 9 PASSED\n');
  } else {
    console.log('✗ Test 9 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 9 FAILED: ${error.message}\n`);
}

// Test 10: Built-in Test
console.log('Test 10: Built-in Encryption Test');
try {
  const result = encryption.testEncryption();
  if (result) {
    console.log('✓ Test 10 PASSED\n');
  } else {
    console.log('✗ Test 10 FAILED\n');
  }
} catch (error) {
  console.log(`✗ Test 10 FAILED: ${error.message}\n`);
}

console.log('=== Encryption Test Complete ===');