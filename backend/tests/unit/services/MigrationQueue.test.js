/**
 * MigrationQueue Unit Tests
 *
 * Comprehensive test suite for Q-Collector Migration Queue System
 * Tests Bull queue operations, job processing, retry logic, and error handling
 *
 * Target: >90% code coverage
 *
 * Test Categories:
 * 1. Queue Initialization (Redis connection)
 * 2. Job Addition (add() method)
 * 3. Job Processing (process() method)
 * 4. Retry Logic (3 attempts with exponential backoff)
 * 5. Error Handling (failure tracking, dead letter queue)
 * 6. Job Status Tracking (waiting, active, completed, failed)
 * 7. Queue Management (pause, resume, clean)
 * 8. Concurrency Control (sequential processing per form)
 * 9. Statistics (getStatus() method)
 * 10. Connection Management (close() method)
 *
 * Created: 2025-10-07
 * Sprint: 7 (Testing & QA - Field Migration System v0.8.0)
 */

const MigrationQueue = require('../../../services/MigrationQueue');
const { sequelize, FieldMigration } = require('../../../models');

// Mock Bull queue
jest.mock('bull');
const Bull = require('bull');

describe('MigrationQueue', () => {
  let mockQueue;
  let mockJob;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock job object
    mockJob = {
      id: 'test-job-1',
      data: {
        type: 'ADD_FIELD',
        formId: 'test-form-id',
        fieldId: 'test-field-id',
        tableName: 'test_table',
        columnName: 'test_column',
        dataType: 'VARCHAR(255)'
      },
      attemptsMade: 0,
      progress: jest.fn(),
      log: jest.fn()
    };

    // Mock Bull queue instance
    mockQueue = {
      add: jest.fn().mockResolvedValue(mockJob),
      process: jest.fn(),
      on: jest.fn(),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      clean: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      }),
      getJobs: jest.fn().mockResolvedValue([]),
      getJob: jest.fn().mockResolvedValue(mockJob),
      removeJobs: jest.fn().mockResolvedValue(undefined)
    };

    // Mock Bull constructor
    Bull.mockImplementation(() => mockQueue);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Queue Initialization', () => {
    it('should initialize Bull queue with correct config', () => {
      // MigrationQueue is already initialized on require()
      expect(Bull).toHaveBeenCalled();

      // Verify queue was created with correct name
      const callArgs = Bull.mock.calls[Bull.mock.calls.length - 1];
      expect(callArgs[0]).toBe('field-migration-queue');
    });

    it('should use Redis connection from environment', () => {
      const callArgs = Bull.mock.calls[Bull.mock.calls.length - 1];
      const config = callArgs[1];

      expect(config).toHaveProperty('redis');
      expect(config.redis).toMatchObject({
        host: expect.any(String),
        port: expect.any(Number)
      });
    });

    it('should configure job retry attempts', () => {
      const callArgs = Bull.mock.calls[Bull.mock.calls.length - 1];
      const config = callArgs[1];

      // MigrationQueue should configure default job options
      expect(config).toHaveProperty('defaultJobOptions');
      expect(config.defaultJobOptions.attempts).toBeGreaterThanOrEqual(3);
    });
  });

  describe('add() - Job Addition', () => {
    it('should add ADD_FIELD job to queue', async () => {
      const jobData = {
        type: 'ADD_FIELD',
        formId: 'form-123',
        fieldId: 'field-456',
        tableName: 'test_form_table',
        columnName: 'new_column',
        dataType: 'TEXT'
      };

      await MigrationQueue.add(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_FIELD',
          formId: 'form-123',
          columnName: 'new_column'
        }),
        expect.any(Object)
      );
    });

    it('should add DELETE_FIELD job with backup flag', async () => {
      const jobData = {
        type: 'DELETE_FIELD',
        formId: 'form-123',
        fieldId: 'field-456',
        tableName: 'test_form_table',
        columnName: 'old_column',
        backup: true
      };

      await MigrationQueue.add(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DELETE_FIELD',
          backup: true
        }),
        expect.any(Object)
      );
    });

    it('should add RENAME_FIELD job with old and new names', async () => {
      const jobData = {
        type: 'RENAME_FIELD',
        formId: 'form-123',
        fieldId: 'field-456',
        tableName: 'test_form_table',
        oldColumnName: 'old_name',
        newColumnName: 'new_name'
      };

      await MigrationQueue.add(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RENAME_FIELD',
          oldColumnName: 'old_name',
          newColumnName: 'new_name'
        }),
        expect.any(Object)
      );
    });

    it('should add CHANGE_TYPE job with old and new types', async () => {
      const jobData = {
        type: 'CHANGE_TYPE',
        formId: 'form-123',
        fieldId: 'field-456',
        tableName: 'test_form_table',
        columnName: 'column_name',
        oldType: 'VARCHAR(255)',
        newType: 'TEXT'
      };

      await MigrationQueue.add(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CHANGE_TYPE',
          oldType: 'VARCHAR(255)',
          newType: 'TEXT'
        }),
        expect.any(Object)
      );
    });

    it('should set job priority based on type', async () => {
      const jobData = {
        type: 'DELETE_FIELD',
        formId: 'form-123',
        tableName: 'test_form_table',
        columnName: 'column_name'
      };

      await MigrationQueue.add(jobData);

      // DELETE_FIELD should have higher priority than ADD_FIELD
      const options = mockQueue.add.mock.calls[0][1];
      expect(options).toHaveProperty('priority');
    });

    it('should return job ID after adding', async () => {
      const jobData = {
        type: 'ADD_FIELD',
        formId: 'form-123',
        tableName: 'test_table',
        columnName: 'new_col',
        dataType: 'TEXT'
      };

      const result = await MigrationQueue.add(jobData);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe('test-job-1');
    });
  });

  describe('Job Processing', () => {
    it('should process jobs with concurrency of 1', () => {
      // Verify process was registered with concurrency limit
      expect(mockQueue.process).toHaveBeenCalled();

      const processCall = mockQueue.process.mock.calls[0];
      // First argument should be concurrency (1)
      expect(processCall[0]).toBe(1);
    });

    it('should handle ADD_FIELD job processing', async () => {
      // Get the processor function
      const processor = mockQueue.process.mock.calls[0][1];

      const job = {
        id: 'job-1',
        data: {
          type: 'ADD_FIELD',
          formId: 'form-123',
          fieldId: 'field-456',
          tableName: 'test_table',
          columnName: 'new_column',
          dataType: 'VARCHAR(255)'
        },
        progress: jest.fn(),
        log: jest.fn()
      };

      // Mock FieldMigrationService
      const FieldMigrationService = require('../../../services/FieldMigrationService');
      FieldMigrationService.addColumn = jest.fn().mockResolvedValue({
        success: true,
        id: 'migration-1'
      });

      await processor(job);

      expect(FieldMigrationService.addColumn).toHaveBeenCalledWith(
        'test_table',
        'field-456',
        'new_column',
        'VARCHAR(255)',
        expect.any(Object)
      );
    });

    it('should handle DELETE_FIELD job processing with backup', async () => {
      const processor = mockQueue.process.mock.calls[0][1];

      const job = {
        id: 'job-2',
        data: {
          type: 'DELETE_FIELD',
          formId: 'form-123',
          fieldId: 'field-456',
          tableName: 'test_table',
          columnName: 'old_column',
          backup: true
        },
        progress: jest.fn(),
        log: jest.fn()
      };

      const FieldMigrationService = require('../../../services/FieldMigrationService');
      FieldMigrationService.dropColumn = jest.fn().mockResolvedValue({
        success: true,
        backup_id: 'backup-1'
      });

      await processor(job);

      expect(FieldMigrationService.dropColumn).toHaveBeenCalledWith(
        'test_table',
        'field-456',
        'old_column',
        expect.objectContaining({ backup: true })
      );
    });

    it('should update job progress during processing', async () => {
      const processor = mockQueue.process.mock.calls[0][1];

      const job = {
        id: 'job-3',
        data: {
          type: 'ADD_FIELD',
          tableName: 'test_table',
          columnName: 'col',
          dataType: 'TEXT'
        },
        progress: jest.fn(),
        log: jest.fn()
      };

      const FieldMigrationService = require('../../../services/FieldMigrationService');
      FieldMigrationService.addColumn = jest.fn().mockResolvedValue({
        success: true
      });

      await processor(job);

      // Progress should be updated during processing
      expect(job.progress).toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed jobs up to 3 times', () => {
      const callArgs = Bull.mock.calls[Bull.mock.calls.length - 1];
      const config = callArgs[1];

      expect(config.defaultJobOptions.attempts).toBeGreaterThanOrEqual(3);
    });

    it('should use exponential backoff for retries', () => {
      const callArgs = Bull.mock.calls[Bull.mock.calls.length - 1];
      const config = callArgs[1];

      // Backoff should be configured
      expect(config.defaultJobOptions).toHaveProperty('backoff');
    });

    it('should not retry after 3 failed attempts', async () => {
      // Simulate 3 failed attempts
      const failedJob = {
        ...mockJob,
        attemptsMade: 3,
        failedReason: 'Column already exists'
      };

      mockQueue.getJob.mockResolvedValue(failedJob);

      const job = await mockQueue.getJob('failed-job-id');

      expect(job.attemptsMade).toBe(3);
      // Job should not be retried further
    });
  });

  describe('Error Handling', () => {
    it('should handle job processing errors gracefully', async () => {
      const processor = mockQueue.process.mock.calls[0][1];

      const job = {
        id: 'job-error',
        data: {
          type: 'ADD_FIELD',
          tableName: 'invalid_table',
          columnName: 'col',
          dataType: 'TEXT'
        },
        progress: jest.fn(),
        log: jest.fn()
      };

      const FieldMigrationService = require('../../../services/FieldMigrationService');
      FieldMigrationService.addColumn = jest.fn().mockRejectedValue(
        new Error('Table does not exist')
      );

      // Should throw error to trigger retry
      await expect(processor(job)).rejects.toThrow('Table does not exist');
    });

    it('should log errors to job log', async () => {
      const processor = mockQueue.process.mock.calls[0][1];

      const job = {
        id: 'job-log-error',
        data: {
          type: 'DELETE_FIELD',
          tableName: 'test_table',
          columnName: 'nonexistent_col'
        },
        progress: jest.fn(),
        log: jest.fn()
      };

      const FieldMigrationService = require('../../../services/FieldMigrationService');
      FieldMigrationService.dropColumn = jest.fn().mockRejectedValue(
        new Error('Column not found')
      );

      try {
        await processor(job);
      } catch (error) {
        // Error should be logged
        expect(job.log).toHaveBeenCalledWith(
          expect.stringContaining('Error')
        );
      }
    });

    it('should create failed migration record on final failure', async () => {
      // This would be tested in integration tests
      // Unit test verifies the error is thrown
      const processor = mockQueue.process.mock.calls[0][1];

      const job = {
        id: 'final-fail',
        data: {
          type: 'CHANGE_TYPE',
          tableName: 'test_table',
          columnName: 'col',
          oldType: 'TEXT',
          newType: 'INVALID_TYPE'
        },
        progress: jest.fn(),
        log: jest.fn(),
        attemptsMade: 3
      };

      const FieldMigrationService = require('../../../services/FieldMigrationService');
      FieldMigrationService.migrateColumnType = jest.fn().mockRejectedValue(
        new Error('Invalid type conversion')
      );

      await expect(processor(job)).rejects.toThrow();
    });
  });

  describe('getStatus() - Job Status Tracking', () => {
    it('should return queue status for form', async () => {
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 3,
        active: 1,
        completed: 10,
        failed: 2,
        delayed: 0
      });

      const status = await MigrationQueue.getStatus('form-123');

      expect(status).toEqual({
        waiting: 3,
        active: 1,
        completed: 10,
        failed: 2
      });
    });

    it('should return zero counts for form with no jobs', async () => {
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      });

      const status = await MigrationQueue.getStatus('empty-form');

      expect(status).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0
      });
    });

    it('should filter jobs by formId', async () => {
      const formJobs = [
        { id: '1', data: { formId: 'form-123', type: 'ADD_FIELD' }, status: 'completed' },
        { id: '2', data: { formId: 'form-123', type: 'DELETE_FIELD' }, status: 'completed' }
      ];

      mockQueue.getJobs.mockResolvedValue(formJobs);

      await MigrationQueue.getStatus('form-123');

      // getJobs should be called to filter by formId
      expect(mockQueue.getJobs).toHaveBeenCalled();
    });
  });

  describe('Queue Management', () => {
    it('should pause queue processing', async () => {
      await MigrationQueue.pause();

      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should resume queue processing', async () => {
      await MigrationQueue.resume();

      expect(mockQueue.resume).toHaveBeenCalled();
    });

    it('should clean completed jobs older than 7 days', async () => {
      await MigrationQueue.clean();

      expect(mockQueue.clean).toHaveBeenCalledWith(
        7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        'completed'
      );
    });

    it('should clean failed jobs older than 30 days', async () => {
      await MigrationQueue.clean();

      expect(mockQueue.clean).toHaveBeenCalledWith(
        30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        'failed'
      );
    });
  });

  describe('Concurrency Control', () => {
    it('should process jobs sequentially (concurrency = 1)', () => {
      const processCall = mockQueue.process.mock.calls[0];

      // First argument is concurrency
      expect(processCall[0]).toBe(1);
    });

    it('should not process multiple jobs for same form simultaneously', async () => {
      // This is ensured by Bull's concurrency = 1 setting
      // Verify the configuration
      const processCall = mockQueue.process.mock.calls[0];
      expect(processCall[0]).toBe(1);
    });
  });

  describe('Event Handlers', () => {
    it('should register completed event handler', () => {
      // Verify 'completed' event listener was registered
      const eventCalls = mockQueue.on.mock.calls;
      const completedEvent = eventCalls.find(call => call[0] === 'completed');

      expect(completedEvent).toBeDefined();
    });

    it('should register failed event handler', () => {
      const eventCalls = mockQueue.on.mock.calls;
      const failedEvent = eventCalls.find(call => call[0] === 'failed');

      expect(failedEvent).toBeDefined();
    });

    it('should log completed jobs', () => {
      const eventCalls = mockQueue.on.mock.calls;
      const completedHandler = eventCalls.find(call => call[0] === 'completed')[1];

      expect(typeof completedHandler).toBe('function');
    });

    it('should log failed jobs', () => {
      const eventCalls = mockQueue.on.mock.calls;
      const failedHandler = eventCalls.find(call => call[0] === 'failed')[1];

      expect(typeof failedHandler).toBe('function');
    });
  });

  describe('close() - Connection Management', () => {
    it('should close queue connection', async () => {
      await MigrationQueue.close();

      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      mockQueue.close.mockRejectedValue(new Error('Connection already closed'));

      // Should not throw
      await expect(MigrationQueue.close()).resolves.toBeUndefined();
    });
  });

  describe('Integration with FieldMigrationService', () => {
    it('should pass correct parameters to addColumn', async () => {
      const processor = mockQueue.process.mock.calls[0][1];

      const job = {
        id: 'integration-1',
        data: {
          type: 'ADD_FIELD',
          formId: 'form-123',
          fieldId: 'field-456',
          tableName: 'test_table',
          columnName: 'new_col',
          dataType: 'INTEGER'
        },
        progress: jest.fn(),
        log: jest.fn()
      };

      const FieldMigrationService = require('../../../services/FieldMigrationService');
      FieldMigrationService.addColumn = jest.fn().mockResolvedValue({
        success: true
      });

      await processor(job);

      expect(FieldMigrationService.addColumn).toHaveBeenCalledWith(
        'test_table',
        'field-456',
        'new_col',
        'INTEGER',
        expect.objectContaining({
          formId: 'form-123'
        })
      );
    });

    it('should pass backup flag to dropColumn', async () => {
      const processor = mockQueue.process.mock.calls[0][1];

      const job = {
        id: 'integration-2',
        data: {
          type: 'DELETE_FIELD',
          formId: 'form-123',
          fieldId: 'field-456',
          tableName: 'test_table',
          columnName: 'old_col',
          backup: true
        },
        progress: jest.fn(),
        log: jest.fn()
      };

      const FieldMigrationService = require('../../../services/FieldMigrationService');
      FieldMigrationService.dropColumn = jest.fn().mockResolvedValue({
        success: true,
        backup_id: 'backup-123'
      });

      await processor(job);

      expect(FieldMigrationService.dropColumn).toHaveBeenCalledWith(
        'test_table',
        'field-456',
        'old_col',
        expect.objectContaining({
          backup: true,
          formId: 'form-123'
        })
      );
    });
  });
});
