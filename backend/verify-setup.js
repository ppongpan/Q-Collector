/**
 * Backend Setup Verification Script
 * Verifies that all services are configured correctly
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('Q-Collector Backend Setup Verification');
console.log('='.repeat(60));
console.log('');

let errors = 0;
let warnings = 0;

/**
 * Check if file exists
 */
function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description}`);
    return true;
  } else {
    console.log(`❌ ${description}`);
    errors++;
    return false;
  }
}

/**
 * Check if directory exists
 */
function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    console.log(`✅ ${description}`);
    return true;
  } else {
    console.log(`❌ ${description}`);
    errors++;
    return false;
  }
}

/**
 * Check environment variables
 */
function checkEnvironment() {
  console.log('\n📋 Checking Environment Variables...');
  console.log('-'.repeat(60));

  require('dotenv').config();

  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
  ];

  let allPresent = true;

  requiredVars.forEach((varName) => {
    if (process.env[varName]) {
      console.log(`✅ ${varName} is set`);

      // Check if default values are being used
      if (varName === 'JWT_SECRET' && process.env[varName].includes('change_this')) {
        console.log(`⚠️  ${varName} is using default value - CHANGE IN PRODUCTION!`);
        warnings++;
      }
      if (varName === 'ENCRYPTION_KEY' && process.env[varName] === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
        console.log(`⚠️  ${varName} is using default value - CHANGE IN PRODUCTION!`);
        warnings++;
      }
    } else {
      console.log(`❌ ${varName} is NOT set`);
      errors++;
      allPresent = false;
    }
  });

  return allPresent;
}

/**
 * Main verification
 */
async function verify() {
  console.log('📁 Checking File Structure...');
  console.log('-'.repeat(60));

  // Check core files
  checkFile('package.json', 'package.json exists');
  checkFile('.env', '.env file exists');
  checkFile('.env.example', '.env.example exists');
  checkFile('.eslintrc.js', '.eslintrc.js exists');
  checkFile('.gitignore', '.gitignore exists');
  checkFile('Dockerfile', 'Dockerfile exists');
  checkFile('README.md', 'README.md exists');

  // Check API files
  console.log('');
  checkFile('api/server.js', 'API server entry point exists');
  checkFile('api/app.js', 'Express app configuration exists');

  // Check config files
  console.log('');
  checkFile('config/app.config.js', 'App configuration exists');
  checkFile('config/database.config.js', 'Database configuration exists');
  checkFile('config/redis.config.js', 'Redis configuration exists');
  checkFile('config/minio.config.js', 'MinIO configuration exists');

  // Check middleware
  console.log('');
  checkFile('middleware/error.middleware.js', 'Error middleware exists');
  checkFile('middleware/logging.middleware.js', 'Logging middleware exists');

  // Check utils
  console.log('');
  checkFile('utils/logger.util.js', 'Logger utility exists');

  // Check Docker files
  console.log('');
  checkFile('docker/postgres/init.sql', 'PostgreSQL init script exists');
  checkFile('docker/nginx/nginx.conf', 'Nginx configuration exists');

  // Check directories
  console.log('');
  checkDirectory('models', 'models/ directory exists');
  checkDirectory('services', 'services/ directory exists');
  checkDirectory('migrations', 'migrations/ directory exists');
  checkDirectory('seeders', 'seeders/ directory exists');
  checkDirectory('tests', 'tests/ directory exists');

  // Check environment
  checkEnvironment();

  // Check node_modules
  console.log('\n📦 Checking Dependencies...');
  console.log('-'.repeat(60));
  if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.log('✅ node_modules directory exists');
    console.log('ℹ️  Run `npm install` if you see missing dependency errors');
  } else {
    console.log('⚠️  node_modules directory does NOT exist');
    console.log('ℹ️  Run `npm install` to install dependencies');
    warnings++;
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Verification Summary');
  console.log('='.repeat(60));

  if (errors === 0 && warnings === 0) {
    console.log('✅ All checks passed! Backend is ready.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run `npm install` to install dependencies');
    console.log('2. Start services: `docker-compose up -d postgres redis minio`');
    console.log('3. Start API: `npm run dev`');
    console.log('4. Test API: `curl http://localhost:5000/health`');
  } else {
    if (errors > 0) {
      console.log(`❌ Found ${errors} error(s)`);
    }
    if (warnings > 0) {
      console.log(`⚠️  Found ${warnings} warning(s)`);
    }
    console.log('');
    console.log('Please fix the issues above before proceeding.');
  }

  console.log('='.repeat(60));
  console.log('');

  process.exit(errors > 0 ? 1 : 0);
}

// Run verification
verify().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});