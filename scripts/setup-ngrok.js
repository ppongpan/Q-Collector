#!/usr/bin/env node

/**
 * ngrok Setup Script for Q-Collector Mobile Testing
 *
 * This script automates the ngrok configuration process:
 * 1. Fetches current ngrok tunnels from API
 * 2. Updates .env files with ngrok URLs
 * 3. Provides instructions for restarting servers
 *
 * Version: v0.7.8-dev
 *
 * Usage:
 *   node scripts/setup-ngrok.js
 *
 * Prerequisites:
 *   - ngrok must be running with both frontend and backend tunnels
 *   - Run: ngrok start --all --config ngrok.yml
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✔${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✖${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

/**
 * Fetch ngrok tunnels from local API
 */
async function getNgrokTunnels() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4040,
      path: '/api/tunnels',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse ngrok API response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Failed to connect to ngrok API: ${error.message}`));
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('ngrok API request timeout'));
    });

    req.end();
  });
}

/**
 * Update .env file with new value
 */
function updateEnvFile(filePath, key, value) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Main setup function
 */
async function setup() {
  log.header('🚀 Q-Collector ngrok Setup v0.7.8-dev');

  try {
    // Step 1: Check if ngrok is running
    log.info('Checking ngrok status...');
    const tunnelsData = await getNgrokTunnels();

    if (!tunnelsData.tunnels || tunnelsData.tunnels.length === 0) {
      log.error('No ngrok tunnels found!');
      log.info('Please start ngrok first:');
      log.info('  ngrok start --all --config ngrok.yml');
      log.info('Or start tunnels individually:');
      log.info('  ngrok http 3000  (frontend)');
      log.info('  ngrok http 5000  (backend)');
      process.exit(1);
    }

    // Step 2: Find frontend and backend tunnels
    log.success(`Found ${tunnelsData.tunnels.length} ngrok tunnel(s)`);

    const frontendTunnel = tunnelsData.tunnels.find(
      (t) => t.config?.addr?.includes('3000') || t.config?.addr?.includes('localhost:3000')
    );

    const backendTunnel = tunnelsData.tunnels.find(
      (t) => t.config?.addr?.includes('5000') || t.config?.addr?.includes('localhost:5000')
    );

    if (!frontendTunnel && !backendTunnel) {
      log.error('Could not identify frontend (port 3000) or backend (port 5000) tunnels');
      log.info('Current tunnels:');
      tunnelsData.tunnels.forEach((t) => {
        log.info(`  - ${t.public_url} → ${t.config?.addr || 'unknown'}`);
      });
      process.exit(1);
    }

    // Step 3: Display found tunnels
    log.header('📡 Detected ngrok Tunnels');

    if (frontendTunnel) {
      log.success(`Frontend: ${frontendTunnel.public_url} → ${frontendTunnel.config.addr}`);
    } else {
      log.warning('Frontend tunnel not found (port 3000)');
    }

    if (backendTunnel) {
      log.success(`Backend:  ${backendTunnel.public_url} → ${backendTunnel.config.addr}`);
    } else {
      log.warning('Backend tunnel not found (port 5000)');
    }

    // Step 4: Update environment files
    log.header('📝 Updating Environment Files');

    const rootDir = path.resolve(__dirname, '..');
    const frontendEnvPath = path.join(rootDir, '.env');
    const backendEnvPath = path.join(rootDir, 'backend', '.env');

    // Update frontend .env
    if (backendTunnel) {
      const apiUrl = `${backendTunnel.public_url}/api/v1`;
      updateEnvFile(frontendEnvPath, 'REACT_APP_API_URL', apiUrl);
      log.success(`Updated frontend .env: REACT_APP_API_URL=${apiUrl}`);
    }

    if (frontendTunnel) {
      updateEnvFile(frontendEnvPath, 'CORS_ORIGIN', frontendTunnel.public_url);
      log.success(`Updated frontend .env: CORS_ORIGIN=${frontendTunnel.public_url}`);
    }

    // Update backend .env
    if (frontendTunnel) {
      updateEnvFile(backendEnvPath, 'CORS_ORIGIN', frontendTunnel.public_url);
      log.success(`Updated backend .env: CORS_ORIGIN=${frontendTunnel.public_url}`);
    }

    // Step 5: Instructions for next steps
    log.header('🔄 Next Steps');

    log.info('1. Restart your servers:');
    log.info('   Frontend: Ctrl+C, then: npm run dev');
    log.info('   Backend:  Ctrl+C, then: cd backend && npm run dev');
    log.info('');
    log.info('2. Test on mobile:');
    if (frontendTunnel) {
      log.success(`   Open: ${frontendTunnel.public_url}`);
      log.warning('   (You may see ngrok warning page - click "Visit Site")');
    }
    log.info('');
    log.success('Setup complete! ✅');

  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    log.info('');
    log.info('Troubleshooting:');
    log.info('  1. Make sure ngrok is running: http://localhost:4040');
    log.info('  2. Start ngrok: ngrok start --all --config ngrok.yml');
    log.info('  3. Check if ports 3000 and 5000 are correct');
    process.exit(1);
  }
}

// Run setup
setup();
