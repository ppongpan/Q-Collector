/**
 * Form Model Unit Tests
 * Test Form model functionality without database
 */

const { createMockSequelize } = require('../../mocks/database.mock');
const { TestDataGenerator } = require('../../helpers');
const fixtures = require('../../fixtures');

describe('Form Model', () => {
  let sequelize;
  let Form;

  beforeAll(() => {
    sequelize = createMockSequelize();
    const FormModel = require('../../../models/Form');
    Form = FormModel(sequelize, sequelize.Sequelize.DataTypes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Model Definition', () => {
    it('should be defined', () => {
      expect(Form).toBeDefined();
      expect(Form.modelName).toBe('Form');
    });

    it('should have required fields', () => {
      const attributes = Form.attributes;
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('title');
      expect(attributes).toHaveProperty('description');
      expect(attributes).toHaveProperty('roles_allowed');
      expect(attributes).toHaveProperty('settings');
      expect(attributes).toHaveProperty('is_active');
      expect(attributes).toHaveProperty('version');
    });
  });

  describe('create()', () => {
    it('should create form with basic fields', async () => {
      const formData = fixtures.forms.basic;
      const form = await Form.create(formData);

      expect(form).toBeDefined();
      expect(form.title).toBe(formData.title);
      expect(form.description).toBe(formData.description);
    });

    it('should set default values', async () => {
      const minimalData = {
        title: 'Minimal Form',
      };

      const form = await Form.create(minimalData);

      expect(form.roles_allowed).toEqual(['user']);
      expect(form.settings).toEqual({});
      expect(form.is_active).toBe(true);
      expect(form.version).toBe(1);
    });

    it('should create form with all roles', async () => {
      const formData = fixtures.forms.allRoles;
      const form = await Form.create(formData);

      expect(form.roles_allowed).toEqual(['admin', 'manager', 'user', 'viewer']);
    });

    it('should create form with complex settings', async () => {
      const formData = fixtures.forms.complex;
      const form = await Form.create(formData);

      expect(form.settings).toHaveProperty('telegram');
      expect(form.settings).toHaveProperty('validation');
      expect(form.settings).toHaveProperty('submissions');
    });
  });

  describe('canAccessByRole()', () => {
    it('should allow access for included role', () => {
      const form = Form.build(fixtures.forms.basic);
      expect(form.canAccessByRole('user')).toBe(true);
    });

    it('should deny access for excluded role', () => {
      const form = Form.build(fixtures.forms.basic);
      expect(form.canAccessByRole('admin')).toBe(false);
    });

    it('should always allow admin access', () => {
      const form = Form.build(fixtures.forms.basic);
      expect(form.canAccessByRole('admin')).toBe(true);
    });

    it('should handle multiple roles', () => {
      const form = Form.build(fixtures.forms.allRoles);
      expect(form.canAccessByRole('user')).toBe(true);
      expect(form.canAccessByRole('manager')).toBe(true);
      expect(form.canAccessByRole('viewer')).toBe(true);
    });

    it('should return false for invalid roles_allowed', () => {
      const form = Form.build({ ...fixtures.forms.basic, roles_allowed: null });
      expect(form.canAccessByRole('user')).toBe(false);
    });
  });

  describe('getFullForm()', () => {
    it('should fetch form with all relationships', async () => {
      const formId = TestDataGenerator.randomUUID();
      const mockForm = {
        id: formId,
        title: 'Test Form',
        fields: [],
        subForms: [],
        creator: { id: 'user123', username: 'testuser' },
      };

      Form.findByPk = jest.fn().mockResolvedValue(mockForm);

      const form = Form.build({ id: formId });
      const fullForm = await form.getFullForm();

      expect(Form.findByPk).toHaveBeenCalledWith(
        formId,
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
    });
  });

  describe('duplicate()', () => {
    it('should create duplicate form', async () => {
      const original = Form.build(fixtures.forms.basic);
      const newTitle = 'Duplicated Form';
      const userId = TestDataGenerator.randomUUID();

      sequelize.models = {
        Field: {
          findAll: jest.fn().mockResolvedValue([]),
        },
        SubForm: {
          findAll: jest.fn().mockResolvedValue([]),
        },
      };

      Form.create = jest.fn().mockResolvedValue(
        Form.build({ ...fixtures.forms.basic, title: newTitle })
      );

      const duplicate = await original.duplicate(newTitle, userId);

      expect(Form.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: newTitle,
          created_by: userId,
          is_active: false,
          version: 1,
        }),
        expect.any(Object)
      );
    });
  });

  describe('incrementVersion()', () => {
    it('should increment form version', async () => {
      const form = Form.build({ ...fixtures.forms.basic, version: 1 });
      form.save = jest.fn().mockResolvedValue(form);

      await form.incrementVersion();

      expect(form.version).toBe(2);
      expect(form.save).toHaveBeenCalled();
    });
  });

  describe('findByRole()', () => {
    it('should find active forms for user role', async () => {
      const forms = [
        Form.build(fixtures.forms.basic),
        Form.build(fixtures.forms.allRoles),
      ];

      Form.findAll = jest.fn().mockResolvedValue(forms);

      const result = await Form.findByRole('user');

      expect(result).toBeDefined();
      expect(Form.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
          }),
        })
      );
    });

    it('should return all forms for admin', async () => {
      Form.findAll = jest.fn().mockResolvedValue([]);

      await Form.findByRole('admin');

      expect(Form.findAll).toHaveBeenCalled();
    });
  });

  describe('findWithSubmissionCounts()', () => {
    it('should include submission counts', async () => {
      const forms = [
        { ...fixtures.forms.basic, submissionCount: 5 },
        { ...fixtures.forms.allRoles, submissionCount: 10 },
      ];

      Form.findAll = jest.fn().mockResolvedValue(forms);

      const result = await Form.findWithSubmissionCounts();

      expect(Form.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            include: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('Validation', () => {
    it('should validate title length', () => {
      const attributes = Form.attributes;
      expect(attributes.title.validate).toHaveProperty('len');
      expect(attributes.title.validate.len).toEqual([1, 255]);
    });

    it('should validate roles_allowed is array', () => {
      const attributes = Form.attributes;
      expect(attributes.roles_allowed.validate).toHaveProperty('isValidRoles');
    });

    it('should validate settings is object', () => {
      const attributes = Form.attributes;
      expect(attributes.settings.validate).toHaveProperty('isValidSettings');
    });

    it('should validate version minimum', () => {
      const attributes = Form.attributes;
      expect(attributes.version.validate).toHaveProperty('min');
      expect(attributes.version.validate.min).toBe(1);
    });
  });

  describe('Associations', () => {
    it('should have associate method', () => {
      expect(typeof Form.associate).toBe('function');
    });

    it('should define associations', () => {
      const mockModels = {
        User: {},
        Field: {},
        SubForm: {},
        Submission: {},
      };

      Form.associate(mockModels);

      expect(Form.belongsTo).toHaveBeenCalled();
      expect(Form.hasMany).toHaveBeenCalled();
    });
  });

  describe('Scopes', () => {
    it('should have active scope', () => {
      expect(Form.addScope).toHaveBeenCalledWith(
        'active',
        expect.objectContaining({
          where: { is_active: true },
        })
      );
    });

    it('should have full scope with all relationships', () => {
      expect(Form.addScope).toHaveBeenCalledWith(
        'full',
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
    });
  });
});