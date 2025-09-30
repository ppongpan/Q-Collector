/**
 * Models Integration Tests
 * Test model associations and interactions
 */

const { createMockSequelize } = require('../mocks/database.mock');

describe('Models Integration', () => {
  let sequelize;
  let models;

  beforeAll(() => {
    sequelize = createMockSequelize();

    // Load all models
    const UserModel = require('../../models/User');
    const FormModel = require('../../models/Form');
    const SubmissionModel = require('../../models/Submission');
    const SubmissionDataModel = require('../../models/SubmissionData');
    const FieldModel = require('../../models/Field');
    const SubFormModel = require('../../models/SubForm');

    models = {
      User: UserModel(sequelize, sequelize.Sequelize.DataTypes),
      Form: FormModel(sequelize, sequelize.Sequelize.DataTypes),
      Submission: SubmissionModel(sequelize, sequelize.Sequelize.DataTypes),
      SubmissionData: SubmissionDataModel(sequelize, sequelize.Sequelize.DataTypes),
      Field: FieldModel(sequelize, sequelize.Sequelize.DataTypes),
      SubForm: SubFormModel(sequelize, sequelize.Sequelize.DataTypes),
    };

    // Setup associations
    Object.values(models).forEach(model => {
      if (model.associate) {
        model.associate(models);
      }
    });
  });

  describe('Model Associations', () => {
    it('should have all models defined', () => {
      expect(models.User).toBeDefined();
      expect(models.Form).toBeDefined();
      expect(models.Submission).toBeDefined();
      expect(models.SubmissionData).toBeDefined();
      expect(models.Field).toBeDefined();
      expect(models.SubForm).toBeDefined();
    });

    it('should set up User associations', () => {
      expect(models.User.hasMany).toHaveBeenCalled();
      expect(models.User.associate).toHaveBeenCalledWith(models);
    });

    it('should set up Form associations', () => {
      expect(models.Form.hasMany).toHaveBeenCalled();
      expect(models.Form.belongsTo).toHaveBeenCalled();
      expect(models.Form.associate).toHaveBeenCalledWith(models);
    });

    it('should set up Submission associations', () => {
      expect(models.Submission.hasMany).toHaveBeenCalled();
      expect(models.Submission.belongsTo).toHaveBeenCalled();
      expect(models.Submission.associate).toHaveBeenCalledWith(models);
    });

    it('should set up SubmissionData associations', () => {
      expect(models.SubmissionData.belongsTo).toHaveBeenCalled();
      expect(models.SubmissionData.associate).toHaveBeenCalledWith(models);
    });
  });

  describe('Model Scopes', () => {
    it('should have User scopes', () => {
      expect(models.User.addScope).toHaveBeenCalled();
    });

    it('should have Form scopes', () => {
      expect(models.Form.addScope).toHaveBeenCalled();
    });

    it('should have Submission scopes', () => {
      expect(models.Submission.addScope).toHaveBeenCalled();
    });

    it('should have SubmissionData scopes', () => {
      expect(models.SubmissionData.addScope).toHaveBeenCalled();
    });
  });

  describe('Model Methods', () => {
    it('should have User class methods', () => {
      expect(models.User.findByIdentifier).toBeDefined();
      expect(models.User.findByRole).toBeDefined();
    });

    it('should have Form class methods', () => {
      expect(models.Form.findByRole).toBeDefined();
      expect(models.Form.findWithSubmissionCounts).toBeDefined();
    });

    it('should have Submission class methods', () => {
      expect(models.Submission.findByStatus).toBeDefined();
      expect(models.Submission.findByFormPaginated).toBeDefined();
      expect(models.Submission.getStatistics).toBeDefined();
    });

    it('should have SubmissionData class methods', () => {
      expect(models.SubmissionData.isSensitiveField).toBeDefined();
      expect(models.SubmissionData.createWithEncryption).toBeDefined();
      expect(models.SubmissionData.getValueType).toBeDefined();
    });
  });
});