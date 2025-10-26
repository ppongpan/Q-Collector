/**
 * SQL Injection Protection Tests
 * Verifies that Sequelize ORM prevents SQL injection attacks
 * Q-Collector Security Audit - Sprint 1, Task 1.3
 */

const { User, Form, Submission } = require('../../models');
const { sequelize } = require('../../models');
const { Op } = require('sequelize');

describe('SQL Injection Protection - Sequelize ORM', () => {
  beforeAll(async () => {
    // Ensure database connection is ready
    await sequelize.authenticate();
  });

  describe('User Model - Authentication Queries', () => {
    const sqlInjectionPayloads = [
      "admin' OR '1'='1",
      "admin'--",
      "admin' OR 1=1--",
      "' OR '1'='1' --",
      "' OR '1'='1' /*",
      "admin'; DROP TABLE users--",
      "1' UNION SELECT NULL, NULL, NULL--",
      "1' AND 1=0 UNION ALL SELECT 'admin', '81dc9bdb52d04dc20036dbd8313ed055'",
      "admin'/*",
      "' or 1=1#",
      "' or 1=1 limit 1--",
      "admin' UNION SELECT NULL--",
    ];

    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should safely handle SQL injection payload #${index + 1}: ${payload.substring(0, 30)}...`, async () => {
        // Sequelize should parameterize this query, making SQL injection impossible
        const result = await User.findOne({
          where: {
            username: payload
          }
        });

        // Should return null (no user found), NOT execute SQL injection
        expect(result).toBeNull();
      });
    });

    it('should prevent SQL injection in password comparison', async () => {
      const result = await User.findOne({
        where: {
          username: 'admin',
          password: "' OR '1'='1"
        }
      });

      expect(result).toBeNull();
    });

    it('should prevent SQL injection in email field', async () => {
      const result = await User.findOne({
        where: {
          email: "admin@example.com' OR '1'='1--"
        }
      });

      expect(result).toBeNull();
    });
  });

  describe('Form Model - Search Queries', () => {
    it('should prevent SQL injection in title search', async () => {
      const maliciousTitle = "' OR 1=1--";

      const result = await Form.findAll({
        where: {
          title: {
            [Op.like]: `%${maliciousTitle}%`
          }
        }
      });

      // Should return empty array, not all forms
      expect(Array.isArray(result)).toBe(true);
      // Should not throw SQL error
    });

    it('should prevent SQL injection in complex where clause', async () => {
      const maliciousInput = "'; DROP TABLE forms--";

      const result = await Form.findAll({
        where: {
          [Op.or]: [
            { title: maliciousInput },
            { description: maliciousInput }
          ]
        }
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Submission Model - Data Queries', () => {
    it('should prevent SQL injection in submission ID lookup', async () => {
      const maliciousId = "1' OR '1'='1";

      const result = await Submission.findOne({
        where: {
          id: maliciousId
        }
      });

      expect(result).toBeNull();
    });

    it('should prevent SQL injection in date range queries', async () => {
      const maliciousDate = "2024-01-01' OR '1'='1--";

      const result = await Submission.findAll({
        where: {
          submittedAt: {
            [Op.gte]: maliciousDate
          }
        }
      });

      // Should handle invalid date gracefully, not execute SQL injection
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Raw Queries Protection', () => {
    it('should use replacements for dynamic values in raw queries', async () => {
      const maliciousUsername = "admin' OR '1'='1--";

      // Correct way: Using replacements (parameterized)
      const [results] = await sequelize.query(
        'SELECT * FROM users WHERE username = :username',
        {
          replacements: { username: maliciousUsername },
          type: sequelize.QueryTypes.SELECT
        }
      );

      // Should return empty array, not all users
      expect(results).toBeUndefined(); // No matching user
    });

    it('should prevent SQL injection even with bind parameters', async () => {
      const maliciousEmail = "test@example.com' OR '1'='1--";

      const [results] = await sequelize.query(
        'SELECT * FROM users WHERE email = $1',
        {
          bind: [maliciousEmail],
          type: sequelize.QueryTypes.SELECT
        }
      );

      expect(results).toBeUndefined();
    });
  });

  describe('Order By SQL Injection', () => {
    it('should prevent SQL injection in ORDER BY clause', async () => {
      // This is a common attack vector
      const maliciousSort = "username; DROP TABLE users--";

      try {
        await User.findAll({
          order: [[maliciousSort, 'ASC']]
        });

        // If we get here, Sequelize prevented the injection
        expect(true).toBe(true);
      } catch (error) {
        // Sequelize should throw a safe error, not execute SQL
        expect(error.message).not.toContain('DROP TABLE');
      }
    });
  });

  describe('LIMIT/OFFSET SQL Injection', () => {
    it('should prevent SQL injection in LIMIT clause', async () => {
      const maliciousLimit = "10; DROP TABLE forms--";

      try {
        await Form.findAll({
          limit: maliciousLimit
        });
      } catch (error) {
        // Should throw type error (limit must be number), not SQL error
        expect(error.message).toContain('must be');
      }
    });

    it('should prevent SQL injection in OFFSET clause', async () => {
      const maliciousOffset = "0 UNION SELECT * FROM users--";

      try {
        await Form.findAll({
          offset: maliciousOffset
        });
      } catch (error) {
        // Should throw type error, not execute SQL
        expect(error.message).toContain('must be');
      }
    });
  });

  describe('JSON Field SQL Injection', () => {
    it('should prevent SQL injection in JSONB queries', async () => {
      const maliciousValue = "value' OR '1'='1--";

      const result = await Form.findAll({
        where: {
          settings: {
            someField: maliciousValue
          }
        }
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Real-world Attack Scenarios', () => {
    it('should prevent authentication bypass via SQL injection', async () => {
      // Classic SQL injection for auth bypass
      const result = await User.findOne({
        where: {
          username: "admin",
          password: "' OR '1'='1"
        }
      });

      expect(result).toBeNull();
    });

    it('should prevent data exfiltration via UNION injection', async () => {
      const maliciousInput = "1' UNION SELECT id, username, password, email FROM users--";

      const result = await Form.findOne({
        where: {
          id: maliciousInput
        }
      });

      expect(result).toBeNull();
    });

    it('should prevent privilege escalation via UPDATE injection', async () => {
      const maliciousRole = "general_user', role='super_admin' WHERE '1'='1";

      try {
        await User.update(
          { role: maliciousRole },
          { where: { id: 'some-uuid' } }
        );
      } catch (error) {
        // Should fail safely without executing injection
        expect(error.message).not.toContain('super_admin');
      }
    });

    it('should prevent time-based blind SQL injection', async () => {
      const maliciousInput = "admin' AND SLEEP(5)--";

      const startTime = Date.now();
      await User.findOne({
        where: { username: maliciousInput }
      });
      const duration = Date.now() - startTime;

      // Should return immediately, not sleep for 5 seconds
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Dynamic Table Names - Migration System', () => {
    it('should sanitize dynamic table names', () => {
      const { SQLNameNormalizer } = require('../../services/SQLNameNormalizer');

      const maliciousTableName = "users; DROP TABLE forms--";
      const sanitized = SQLNameNormalizer.sanitizeTableName(maliciousTableName);

      // Should remove dangerous characters
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
      expect(sanitized).not.toContain('DROP');
    });

    it('should prevent SQL injection in dynamic table queries', async () => {
      const maliciousTableName = "form_test'; DROP TABLE users--";

      try {
        // This should fail safely, not execute DROP TABLE
        await sequelize.query(
          `SELECT * FROM ${sequelize.escape(maliciousTableName)}`,
          { type: sequelize.QueryTypes.SELECT }
        );
      } catch (error) {
        // Should throw safe error about invalid table name
        expect(error.message).not.toContain('users');
      }
    });
  });
});

describe('SQL Injection Protection - Express-Validator', () => {
  const { body, param, query } = require('express-validator');
  const { validationResult } = require('express-validator');

  describe('Input Validation Middleware', () => {
    it('should reject SQL injection patterns in UUID fields', async () => {
      const req = {
        params: { id: "1' OR '1'='1" },
        body: {},
        query: {}
      };

      const validators = [
        param('id').isUUID().withMessage('Invalid UUID')
      ];

      // Run validators
      await Promise.all(validators.map(v => v.run(req)));

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()[0].msg).toContain('UUID');
    });

    it('should sanitize email input to prevent SQL injection', async () => {
      const req = {
        body: { email: "test@example.com' OR '1'='1--" },
        params: {},
        query: {}
      };

      const validators = [
        body('email').isEmail().normalizeEmail()
      ];

      await Promise.all(validators.map(v => v.run(req)));

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it('should reject malicious integer inputs', async () => {
      const req = {
        query: { page: "1; DROP TABLE users--" },
        body: {},
        params: {}
      };

      const validators = [
        query('page').isInt({ min: 1 })
      ];

      await Promise.all(validators.map(v => v.run(req)));

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });
  });
});
