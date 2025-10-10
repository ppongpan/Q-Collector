/**
 * Initialize MinIO Bucket
 * Creates the qcollector bucket if it doesn't exist
 */

const { initializeMinIO, testMinIOConnection, config } = require('../config/minio.config');
const logger = require('../utils/logger.util');

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('MinIO Bucket Initialization');
    console.log('='.repeat(60));
    console.log('');

    console.log('Configuration:');
    console.log(`  Endpoint: ${config.endPoint}:${config.port}`);
    console.log(`  Bucket: ${config.bucket}`);
    console.log(`  Region: ${config.region}`);
    console.log(`  Use SSL: ${config.useSSL}`);
    console.log('');

    console.log('Step 1: Testing MinIO connection...');
    await testMinIOConnection();
    console.log('✅ MinIO connection successful');
    console.log('');

    console.log('Step 2: Initializing MinIO (creating bucket if needed)...');
    await initializeMinIO();
    console.log('✅ MinIO initialization complete');
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ MinIO bucket setup complete!');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ MinIO initialization failed');
    console.error('='.repeat(60));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Ensure MinIO is running: docker ps | findstr minio');
    console.error('2. Check MinIO endpoint is accessible: http://localhost:9000');
    console.error('3. Verify credentials in .env file');
    console.error('4. Check firewall settings');
    console.error('');
    process.exit(1);
  }
}

// Run the script
main();
