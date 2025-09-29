/**
 * Test File System Functionality
 * ทดสอบการทำงานของระบบจัดการไฟล์
 */

// Import FileService for testing
import FileService from './src/services/FileService.js';

// Test data
const testCases = [
  {
    name: 'Test Storage Stats',
    test: () => {
      console.log('=== Storage Stats ===');
      const stats = FileService.getStorageStats();
      console.log('Storage Statistics:', stats);
      console.log('Files stored:', stats?.fileCount || 0);
      console.log('Images stored:', stats?.imageCount || 0);
      console.log('Storage used:', stats?.storageUsedPercent?.toFixed(2) || 0, '%');
      return true;
    }
  },
  {
    name: 'Test File Creation (Simulation)',
    test: () => {
      console.log('\n=== File Creation Test ===');

      // Create mock file data
      const mockFileData = {
        id: 'test_file_001',
        name: 'test-image.jpg',
        type: 'image/jpeg',
        size: 102400, // 100KB
        originalSize: 204800, // 200KB original
        compressedSize: 102400,
        data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        fieldId: 'test_field',
        submissionId: 'test_submission',
        uploadedAt: new Date().toISOString(),
        isImage: true
      };

      // Simulate storing file
      try {
        FileService.storeFileInfo(mockFileData);
        console.log('✅ Mock file stored successfully');

        // Test retrieval
        const retrieved = FileService.getFile('test_file_001');
        if (retrieved && retrieved.name === 'test-image.jpg') {
          console.log('✅ File retrieval successful');
          return true;
        } else {
          console.log('❌ File retrieval failed');
          return false;
        }
      } catch (error) {
        console.log('❌ File storage failed:', error.message);
        return false;
      }
    }
  },
  {
    name: 'Test File Listing',
    test: () => {
      console.log('\n=== File Listing Test ===');

      const submissionFiles = FileService.getSubmissionFiles('test_submission');
      console.log('Files in test submission:', submissionFiles.length);

      const fieldFiles = FileService.getFieldFiles('test_field', 'test_submission');
      console.log('Files in test field:', fieldFiles.length);

      if (submissionFiles.length > 0) {
        console.log('✅ File listing working');
        console.log('Sample file:', {
          id: submissionFiles[0].id,
          name: submissionFiles[0].name,
          size: submissionFiles[0].size
        });
        return true;
      } else {
        console.log('❌ No files found in listing');
        return false;
      }
    }
  },
  {
    name: 'Test File Deletion',
    test: () => {
      console.log('\n=== File Deletion Test ===');

      const success = FileService.deleteFile('test_file_001');
      if (success) {
        console.log('✅ File deletion successful');

        // Verify deletion
        const retrieved = FileService.getFile('test_file_001');
        if (!retrieved) {
          console.log('✅ File properly removed');
          return true;
        } else {
          console.log('❌ File still exists after deletion');
          return false;
        }
      } else {
        console.log('❌ File deletion failed');
        return false;
      }
    }
  },
  {
    name: 'Test Helper Functions',
    test: () => {
      console.log('\n=== Helper Functions Test ===');

      // Test file type detection
      const isImage = FileService.isImageFile('image/jpeg');
      console.log('Image type detection:', isImage ? '✅' : '❌');

      const isNotImage = !FileService.isImageFile('text/plain');
      console.log('Non-image type detection:', isNotImage ? '✅' : '❌');

      // Test storage stats
      const stats = FileService.getStorageStats();
      console.log('Storage stats available:', stats ? '✅' : '❌');

      return isImage && isNotImage && stats;
    }
  }
];

// Run all tests
console.log('🧪 Starting File System Tests...\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  try {
    console.log(`Test ${index + 1}/${totalTests}: ${testCase.name}`);
    const result = testCase.test();
    if (result) {
      passedTests++;
      console.log(`✅ PASSED\n`);
    } else {
      console.log(`❌ FAILED\n`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`);
  }
});

console.log('=== Test Summary ===');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! File system is working correctly.');
} else {
  console.log('⚠️ Some tests failed. Please check the implementation.');
}

export default {
  testCases,
  runTests: () => {
    testCases.forEach(test => test.test());
  }
};