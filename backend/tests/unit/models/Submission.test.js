/**
 * Submission Model Unit Tests
 * Test Submission model functionality without database
 */

const { createMockSequelize } = require('../../mocks/database.mock');
const { TestDataGenerator } = require('../../helpers');
const fixtures = require('../../fixtures');

describe('Submission Model', () => {
  let sequelize;
  let Submission;

  beforeAll(() => {
    sequelize = createMockSequelize();
    const SubmissionModel = require('../../../models/Submission');
    Submission = SubmissionModel(sequelize, sequelize.Sequelize.DataTypes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Model Definition', () => {
    it('should be defined', () => {
      expect(Submission).toBeDefined();
      expect(Submission.modelName).toBe('Submission');
    });

    it('should have required fields', () => {
      const attributes = Submission.attributes;
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('form_id');
      expect(attributes).toHaveProperty('submitted_by');
      expect(attributes).toHaveProperty('status');
      expect(attributes).toHaveProperty('ip_address');
      expect(attributes).toHaveProperty('user_agent');
      expect(attributes).toHaveProperty('metadata');
      expect(attributes).toHaveProperty('submitted_at');
    });
  });

  describe('create()', () => {
    it('should create submission', async () => {
      const submissionData = {
        ...fixtures.submissions.basic,
        form_id: TestDataGenerator.randomUUID(),
      };

      const submission = await Submission.create(submissionData);

      expect(submission).toBeDefined();
      expect(submission.status).toBe('submitted');
    });

    it('should set default status', async () => {
      const data = {
        form_id: TestDataGenerator.randomUUID(),
        ip_address: '127.0.0.1',
      };

      const submission = await Submission.create(data);

      expect(submission.status).toBe('submitted');
    });

    it('should create with all status types', async () => {
      const statuses = ['draft', 'submitted', 'approved', 'rejected', 'archived'];

      for (const status of statuses) {
        const data = {
          ...fixtures.submissions.basic,
          form_id: TestDataGenerator.randomUUID(),
          status,
        };

        const submission = await Submission.create(data);
        expect(submission.status).toBe(status);
      }
    });
  });

  describe('getFullSubmission()', () => {
    it('should fetch submission with relationships', async () => {
      const submissionId = TestDataGenerator.randomUUID();
      const mockSubmission = {
        id: submissionId,
        form: {},
        submissionData: [],
        files: [],
        submitter: {},
      };

      Submission.findByPk = jest.fn().mockResolvedValue(mockSubmission);

      const submission = Submission.build({ id: submissionId });
      const full = await submission.getFullSubmission();

      expect(Submission.findByPk).toHaveBeenCalledWith(
        submissionId,
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
    });
  });

  describe('updateStatus()', () => {
    it('should update status and create audit log', async () => {
      const submission = Submission.build({
        ...fixtures.submissions.basic,
        status: 'submitted',
      });
      submission.save = jest.fn().mockResolvedValue(submission);

      sequelize.models = {
        AuditLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      const userId = TestDataGenerator.randomUUID();
      await submission.updateStatus('approved', userId);

      expect(submission.status).toBe('approved');
      expect(submission.save).toHaveBeenCalled();
      expect(sequelize.models.AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action: 'update',
          entity_type: 'submission',
          old_value: { status: 'submitted' },
          new_value: { status: 'approved' },
        })
      );
    });
  });

  describe('getFormattedData()', () => {
    it('should return formatted submission data', async () => {
      const submission = Submission.build({
        id: TestDataGenerator.randomUUID(),
      });

      sequelize.models = {
        SubmissionData: {
          findAll: jest.fn().mockResolvedValue([
            {
              field: { title: 'Name' },
              getDecryptedValue: jest.fn().mockReturnValue('John Doe'),
            },
            {
              field: { title: 'Email' },
              getDecryptedValue: jest.fn().mockReturnValue('john@example.com'),
            },
          ]),
        },
        Field: {},
      };

      const formatted = await submission.getFormattedData();

      expect(formatted).toEqual({
        Name: 'John Doe',
        Email: 'john@example.com',
      });
    });
  });

  describe('canEdit()', () => {
    it('should allow edit for draft status', () => {
      const submission = Submission.build(fixtures.submissions.draft);
      expect(submission.canEdit()).toBe(true);
    });

    it('should allow edit for submitted status', () => {
      const submission = Submission.build(fixtures.submissions.basic);
      expect(submission.canEdit()).toBe(true);
    });

    it('should not allow edit for approved status', () => {
      const submission = Submission.build(fixtures.submissions.approved);
      expect(submission.canEdit()).toBe(false);
    });

    it('should not allow edit for rejected status', () => {
      const submission = Submission.build(fixtures.submissions.rejected);
      expect(submission.canEdit()).toBe(false);
    });
  });

  describe('canReview()', () => {
    it('should allow review for submitted status', () => {
      const submission = Submission.build(fixtures.submissions.basic);
      expect(submission.canReview()).toBe(true);
    });

    it('should not allow review for draft', () => {
      const submission = Submission.build(fixtures.submissions.draft);
      expect(submission.canReview()).toBe(false);
    });

    it('should not allow review for already approved', () => {
      const submission = Submission.build(fixtures.submissions.approved);
      expect(submission.canReview()).toBe(false);
    });
  });

  describe('findByStatus()', () => {
    it('should find submissions by status', async () => {
      const submissions = [
        Submission.build(fixtures.submissions.basic),
        Submission.build(fixtures.submissions.basic),
      ];

      Submission.findAll = jest.fn().mockResolvedValue(submissions);

      const result = await Submission.findByStatus('submitted');

      expect(Submission.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'submitted' },
        })
      );
    });
  });

  describe('findByFormPaginated()', () => {
    it('should return paginated submissions', async () => {
      const formId = TestDataGenerator.randomUUID();
      const mockResult = {
        count: 50,
        rows: [Submission.build(fixtures.submissions.basic)],
      };

      Submission.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      const result = await Submission.findByFormPaginated(formId, {
        page: 1,
        limit: 20,
      });

      expect(result).toHaveProperty('submissions');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should filter by status', async () => {
      const formId = TestDataGenerator.randomUUID();
      Submission.findAndCountAll = jest.fn().mockResolvedValue({ count: 0, rows: [] });

      await Submission.findByFormPaginated(formId, { status: 'approved' });

      expect(Submission.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'approved',
          }),
        })
      );
    });
  });

  describe('getStatistics()', () => {
    it('should return submission statistics', async () => {
      const formId = TestDataGenerator.randomUUID();
      const mockStats = [
        { status: 'draft', count: '5' },
        { status: 'submitted', count: '10' },
        { status: 'approved', count: '8' },
      ];

      Submission.findAll = jest.fn().mockResolvedValue(mockStats);

      const stats = await Submission.getStatistics(formId);

      expect(stats.total).toBe(23);
      expect(stats.draft).toBe(5);
      expect(stats.submitted).toBe(10);
      expect(stats.approved).toBe(8);
    });
  });

  describe('Associations', () => {
    it('should define associations', () => {
      const mockModels = {
        Form: {},
        User: {},
        SubmissionData: {},
        File: {},
      };

      Submission.associate(mockModels);

      expect(Submission.belongsTo).toHaveBeenCalled();
      expect(Submission.hasMany).toHaveBeenCalled();
    });
  });

  describe('Scopes', () => {
    it('should have status scopes', () => {
      expect(Submission.addScope).toHaveBeenCalledWith('submitted', expect.any(Object));
      expect(Submission.addScope).toHaveBeenCalledWith('draft', expect.any(Object));
      expect(Submission.addScope).toHaveBeenCalledWith('approved', expect.any(Object));
      expect(Submission.addScope).toHaveBeenCalledWith('rejected', expect.any(Object));
    });

    it('should have recent scope', () => {
      expect(Submission.addScope).toHaveBeenCalledWith(
        'recent',
        expect.objectContaining({
          limit: 10,
        })
      );
    });
  });
});