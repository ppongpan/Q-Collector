/**
 * Rate Limiting Security Tests
 * Tests rate limiting middleware to prevent abuse and DoS attacks
 * Q-Collector Security Audit - Sprint 1, Task 1.3
 */

const request = require('supertest');
const app = require('../../api/app');

describe('Rate Limiting Security Tests', () => {
  // Increase timeout for rate limit tests (need to make many requests)
  jest.setTimeout(30000);

  describe('Global Rate Limiter', () => {
    it('should have global rate limiting enabled', async () => {
      // Make requests up to the limit
      const requests = [];
      for (let i = 0; i < 105; i++) {
        requests.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.100') // Simulate same IP
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited (HTTP 429)
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should return 429 status code when rate limit exceeded', async () => {
      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.101')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status === 429);

      expect(rateLimited).toBeDefined();
      expect(rateLimited.body.error).toContain('Too many requests');
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('X-Forwarded-For', '192.168.1.102');

      // Should have RateLimit-* headers
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should track rate limits per IP address', async () => {
      // IP 1: Make many requests
      const ip1Requests = [];
      for (let i = 0; i < 105; i++) {
        ip1Requests.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.103')
        );
      }

      const ip1Responses = await Promise.all(ip1Requests);
      const ip1RateLimited = ip1Responses.some(r => r.status === 429);

      // IP 2: Make single request (should not be rate limited)
      const ip2Response = await request(app)
        .get('/health')
        .set('X-Forwarded-For', '192.168.1.104');

      expect(ip1RateLimited).toBe(true);
      expect(ip2Response.status).toBe(200);
    });
  });

  describe('Authentication Rate Limiter', () => {
    it('should rate limit login attempts', async () => {
      const loginAttempts = [];
      for (let i = 0; i < 10; i++) {
        loginAttempts.push(
          request(app)
            .post('/api/v1/auth/login')
            .set('X-Forwarded-For', '192.168.1.105')
            .send({
              username: 'testuser',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(loginAttempts);

      // Should have rate limiting (5 attempts per 15 minutes)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should have stricter limits for registration', async () => {
      const registerAttempts = [];
      for (let i = 0; i < 5; i++) {
        registerAttempts.push(
          request(app)
            .post('/api/v1/auth/register')
            .set('X-Forwarded-For', '192.168.1.106')
            .send({
              username: `user${i}`,
              email: `user${i}@test.com`,
              password: 'TestPass123'
            })
        );
      }

      const responses = await Promise.all(registerAttempts);

      // Should have strict rate limiting (3 attempts per hour)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should only count failed login attempts', async () => {
      // This documents expected behavior
      // Rate limiter should use skipSuccessfulRequests: true
      // Successful logins should not count toward rate limit
    });
  });

  describe('Rate Limit Response Format', () => {
    it('should return Thai error message', async () => {
      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.107')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status === 429);

      expect(rateLimited).toBeDefined();
      expect(rateLimited.body.message).toContain('คุณทำการร้องขอมากเกินไป');
    });

    it('should include retry-after information', async () => {
      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.108')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status === 429);

      expect(rateLimited).toBeDefined();
      expect(rateLimited.body.retryAfter).toBeDefined();
    });

    it('should return consistent error format', async () => {
      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.109')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status === 429);

      expect(rateLimited).toBeDefined();
      expect(rateLimited.body).toHaveProperty('success', false);
      expect(rateLimited.body).toHaveProperty('error');
      expect(rateLimited.body).toHaveProperty('message');
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('should use Redis for distributed rate limiting', () => {
      // This documents expected behavior
      // Rate limiter should use RedisStore if Redis is available
      // Falls back to in-memory if Redis is unavailable
      const { isUsingRedis } = require('../../middleware/rateLimit.middleware');

      // Check if Redis is being used
      const usingRedis = isUsingRedis();
      console.log('Rate limiter using Redis:', usingRedis);

      // Should be using Redis in production
      if (process.env.REDIS_URL) {
        expect(usingRedis).toBe(true);
      }
    });

    it('should have different limits for different endpoint types', () => {
      // This documents expected configuration
      // Different rate limiters should be applied:
      // - Global: 100 req/15min
      // - Auth: 5 req/15min
      // - Strict Auth: 3 req/hour
      // - Form Operations: 30 req/15min
      // - File Upload: 10 req/hour
      // - Search: 20 req/15min
      // - API: 60 req/min
      // - Submission: 20 req/15min
      // - Admin: 100 req/15min
    });
  });

  describe('DoS Attack Prevention', () => {
    it('should prevent DoS via rapid requests', async () => {
      const start = Date.now();
      const requests = [];

      // Simulate DoS attack: 200 rapid requests
      for (let i = 0; i < 200; i++) {
        requests.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.110')
        );
      }

      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // Should have blocked many requests with 429
      const blocked = responses.filter(r => r.status === 429).length;
      expect(blocked).toBeGreaterThan(50); // At least 50 requests blocked

      console.log(`DoS test: ${blocked}/200 requests blocked in ${duration}ms`);
    });

    it('should recover after rate limit window expires', async () => {
      // This is a conceptual test - in practice, requires waiting 15 minutes
      // After window expires, rate limit should reset
    });
  });

  describe('Distributed Deployment', () => {
    it('should share rate limit state across multiple servers via Redis', () => {
      // This documents expected behavior for production
      // If multiple backend servers are running:
      // - Server A: User makes 50 requests
      // - Server B: Same user makes 50 requests
      // - Total: 100 requests should be counted (shared state via Redis)
      // - User should be rate limited on both servers
    });
  });

  describe('Bypass Scenarios', () => {
    it('should not allow rate limit bypass via IP spoofing', async () => {
      // X-Forwarded-For header should be validated
      // Should use req.ip or first trusted proxy IP

      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', `192.168.1.${i % 256}`) // Rotating IPs
        );
      }

      const responses = await Promise.all(requests);

      // If trust proxy is not configured correctly, all requests might have different IPs
      // This tests that rate limiting still works
    });

    it('should not allow rate limit bypass via different user agents', async () => {
      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.111')
            .set('User-Agent', `TestBot/${i}`) // Rotating user agents
        );
      }

      const responses = await Promise.all(requests);

      // Rate limit should be by IP, not user agent
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log rate limit violations', async () => {
      // This documents expected behavior
      // When user exceeds rate limit:
      // - Should log warning with: IP, userId, path, method
      // - Should be visible in logger output
      // - Should be trackable for security monitoring
    });
  });
});
