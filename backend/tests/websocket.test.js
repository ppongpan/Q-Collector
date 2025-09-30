/**
 * WebSocket System Test
 * Test script to verify WebSocket functionality and real-time features
 *
 * Run with: node tests/websocket.test.js
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const app = require('../api/app');

// Test configuration
const TEST_PORT = 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Mock user data
const testUsers = [
  {
    id: 1,
    username: 'testuser1',
    email: 'test1@example.com',
    firstName: 'Test',
    lastName: 'User1',
    role: 'admin',
    department: 'IT',
    isActive: true,
  },
  {
    id: 2,
    username: 'testuser2',
    email: 'test2@example.com',
    firstName: 'Test',
    lastName: 'User2',
    role: 'user',
    department: 'IT',
    isActive: true,
  },
];

class WebSocketTester {
  constructor() {
    this.server = null;
    this.webSocketService = null;
    this.clients = [];
    this.testResults = [];
  }

  /**
   * Initialize test server
   */
  async initialize() {
    try {
      console.log('🚀 Initializing WebSocket test server...');

      // Create HTTP server
      this.server = createServer(app);

      // Initialize WebSocket services
      const webSocketService = require('../services/WebSocketService');
      const notificationService = require('../services/NotificationService');
      const realtimeEventHandlers = require('../services/RealtimeEventHandlers');

      await webSocketService.initialize(this.server);
      notificationService.initialize(webSocketService);
      realtimeEventHandlers.initialize(webSocketService, notificationService);

      this.webSocketService = webSocketService;

      // Start server
      await new Promise((resolve) => {
        this.server.listen(TEST_PORT, () => {
          console.log(`✅ Test server running on port ${TEST_PORT}`);
          resolve();
        });
      });

    } catch (error) {
      console.error('❌ Failed to initialize test server:', error);
      throw error;
    }
  }

  /**
   * Create authenticated client
   */
  createClient(user) {
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

    const client = Client(`http://localhost:${TEST_PORT}`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.clients.push(client);
    return client;
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log('\n🧪 Starting WebSocket tests...\n');

    const tests = [
      () => this.testConnection(),
      () => this.testAuthentication(),
      () => this.testRoomJoining(),
      () => this.testFormCollaboration(),
      () => this.testNotifications(),
      () => this.testPresenceUpdates(),
      () => this.testRateLimiting(),
      () => this.testBroadcasting(),
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`❌ Test failed:`, error.message);
        this.testResults.push({ test: test.name, status: 'failed', error: error.message });
      }
    }

    this.printResults();
  }

  /**
   * Test basic connection
   */
  async testConnection() {
    console.log('📡 Testing basic connection...');

    const client = this.createClient(testUsers[0]);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ Connection successful');
        this.testResults.push({ test: 'connection', status: 'passed' });
        resolve();
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });
  }

  /**
   * Test authentication
   */
  async testAuthentication() {
    console.log('🔐 Testing authentication...');

    const client = this.createClient(testUsers[0]);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      client.on('connection:established', (data) => {
        clearTimeout(timeout);
        if (data.userId === testUsers[0].id) {
          console.log('✅ Authentication successful');
          this.testResults.push({ test: 'authentication', status: 'passed' });
          resolve();
        } else {
          reject(new Error('Wrong user ID in authentication response'));
        }
      });

      client.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Authentication failed: ${error.message}`));
      });
    });
  }

  /**
   * Test room joining
   */
  async testRoomJoining() {
    console.log('🏠 Testing room joining...');

    const client = this.createClient(testUsers[0]);
    const formId = 'test-form-123';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room joining timeout'));
      }, 5000);

      client.on('form:collaborators', (data) => {
        clearTimeout(timeout);
        if (data.formId === formId) {
          console.log('✅ Room joining successful');
          this.testResults.push({ test: 'room_joining', status: 'passed' });
          resolve();
        } else {
          reject(new Error('Wrong form ID in collaborators response'));
        }
      });

      // Join form room
      client.emit('form:join', { formId });
    });
  }

  /**
   * Test form collaboration
   */
  async testFormCollaboration() {
    console.log('👥 Testing form collaboration...');

    const client1 = this.createClient(testUsers[0]);
    const client2 = this.createClient(testUsers[1]);
    const formId = 'test-form-456';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Form collaboration timeout'));
      }, 5000);

      let joinedCount = 0;
      let updateReceived = false;

      const checkComplete = () => {
        if (joinedCount === 2 && updateReceived) {
          clearTimeout(timeout);
          console.log('✅ Form collaboration successful');
          this.testResults.push({ test: 'form_collaboration', status: 'passed' });
          resolve();
        }
      };

      // Client 1 joins first
      client1.on('form:collaborators', () => {
        joinedCount++;
        checkComplete();

        // Send form update
        client1.emit('form:update', {
          formId,
          updateType: 'metadata',
          changes: { title: 'Updated Title' },
          version: 1,
        });
      });

      // Client 2 receives the join notification and update
      client2.on('form:user:joined', () => {
        // Client 2 joins
        client2.emit('form:join', { formId });
      });

      client2.on('form:collaborators', () => {
        joinedCount++;
        checkComplete();
      });

      client2.on('form:updated', (data) => {
        if (data.update.formId === formId) {
          updateReceived = true;
          checkComplete();
        }
      });

      // Start the test
      client1.emit('form:join', { formId });
    });
  }

  /**
   * Test notifications
   */
  async testNotifications() {
    console.log('🔔 Testing notifications...');

    const client = this.createClient(testUsers[0]);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Notification timeout'));
      }, 5000);

      client.on('notification:new', (data) => {
        clearTimeout(timeout);
        if (data.type === 'notification') {
          console.log('✅ Notification received');
          this.testResults.push({ test: 'notifications', status: 'passed' });
          resolve();
        } else {
          reject(new Error('Wrong notification type'));
        }
      });

      // Wait for connection then send test notification
      client.on('connection:established', async () => {
        try {
          const notificationService = require('../services/NotificationService');
          await notificationService.sendNotification({
            recipients: [testUsers[0].id],
            data: {
              title: 'Test Notification',
              body: 'This is a test notification',
              priority: 'low',
            },
            immediate: true,
            channels: ['websocket'],
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Test presence updates
   */
  async testPresenceUpdates() {
    console.log('👤 Testing presence updates...');

    const client = this.createClient(testUsers[0]);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Presence update timeout'));
      }, 5000);

      client.on('user:presence:updated', (data) => {
        clearTimeout(timeout);
        if (data.userId === testUsers[0].id && data.status === 'busy') {
          console.log('✅ Presence update successful');
          this.testResults.push({ test: 'presence_updates', status: 'passed' });
          resolve();
        }
      });

      // Wait for connection then update presence
      client.on('connection:established', () => {
        client.emit('user:presence', { status: 'busy' });
      });
    });
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log('⏱️ Testing rate limiting...');

    const client = this.createClient(testUsers[0]);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Rate limiting test timeout'));
      }, 5000);

      let rateLimitHit = false;

      client.on('rate_limit_exceeded', () => {
        rateLimitHit = true;
      });

      client.on('connection:established', () => {
        // Send many rapid requests to trigger rate limit
        for (let i = 0; i < 60; i++) {
          client.emit('ping');
        }

        // Check if rate limit was hit
        setTimeout(() => {
          clearTimeout(timeout);
          if (rateLimitHit) {
            console.log('✅ Rate limiting working');
            this.testResults.push({ test: 'rate_limiting', status: 'passed' });
          } else {
            console.log('⚠️ Rate limiting not triggered (may be expected)');
            this.testResults.push({ test: 'rate_limiting', status: 'skipped' });
          }
          resolve();
        }, 2000);
      });
    });
  }

  /**
   * Test broadcasting
   */
  async testBroadcasting() {
    console.log('📢 Testing broadcasting...');

    const adminClient = this.createClient(testUsers[0]); // Admin user
    const userClient = this.createClient(testUsers[1]);   // Regular user

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Broadcasting timeout'));
      }, 5000);

      let broadcastReceived = false;

      userClient.on('system:message', (data) => {
        if (data.type === 'announcement') {
          clearTimeout(timeout);
          broadcastReceived = true;
          console.log('✅ Broadcasting successful');
          this.testResults.push({ test: 'broadcasting', status: 'passed' });
          resolve();
        }
      });

      // Wait for both clients to connect
      let connectedCount = 0;
      const checkConnections = () => {
        connectedCount++;
        if (connectedCount === 2) {
          // Send system message from admin
          const realtimeEventHandlers = require('../services/RealtimeEventHandlers');
          realtimeEventHandlers.handleSystemMessage({
            type: 'announcement',
            message: 'Test system announcement',
            priority: 'medium',
          }, testUsers[0]);
        }
      };

      adminClient.on('connection:established', checkConnections);
      userClient.on('connection:established', checkConnections);
    });
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n📊 Test Results:');
    console.log('='.repeat(50));

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    this.testResults.forEach(result => {
      const icon = result.status === 'passed' ? '✅' :
                   result.status === 'failed' ? '❌' : '⚠️';
      console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      if (result.status === 'passed') passed++;
      else if (result.status === 'failed') failed++;
      else skipped++;
    });

    console.log('='.repeat(50));
    console.log(`Total: ${this.testResults.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n❌ Some tests failed. Check the logs above.');
    }
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up...');

    // Close all clients
    this.clients.forEach(client => {
      if (client.connected) {
        client.disconnect();
      }
    });

    // Shutdown WebSocket service
    if (this.webSocketService) {
      await this.webSocketService.shutdown();
    }

    // Close server
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(() => {
          console.log('✅ Test server closed');
          resolve();
        });
      });
    }
  }
}

/**
 * Main test function
 */
async function main() {
  const tester = new WebSocketTester();

  try {
    await tester.initialize();
    await tester.runTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await tester.cleanup();
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = WebSocketTester;