/**
 * Database Mock
 * Mock Sequelize for testing without actual database
 */

const { TestDataGenerator } = require('../helpers');

/**
 * Mock Sequelize Model
 */
class MockModel {
  constructor(data = {}) {
    Object.assign(this, data);
    if (!this.id) {
      this.id = TestDataGenerator.randomUUID();
    }
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
    if (!this.updatedAt) {
      this.updatedAt = new Date();
    }
  }

  async save() {
    this.updatedAt = new Date();
    return this;
  }

  async reload() {
    return this;
  }

  async destroy() {
    return true;
  }

  changed(field) {
    return this._changed && this._changed.includes(field);
  }

  get(options) {
    if (options && options.plain) {
      return { ...this };
    }
    return this;
  }

  toJSON() {
    const obj = {};
    for (const key in this) {
      if (!key.startsWith('_') && typeof this[key] !== 'function') {
        obj[key] = this[key];
      }
    }
    return obj;
  }
}

/**
 * Create mock Sequelize instance
 */
function createMockSequelize() {
  const models = {};
  const instances = new Map();

  const mockSequelize = {
    // Sequelize static
    Sequelize: {
      Op: {
        or: Symbol('or'),
        and: Symbol('and'),
        eq: Symbol('eq'),
        ne: Symbol('ne'),
        gt: Symbol('gt'),
        gte: Symbol('gte'),
        lt: Symbol('lt'),
        lte: Symbol('lte'),
        like: Symbol('like'),
        notLike: Symbol('notLike'),
        in: Symbol('in'),
        notIn: Symbol('notIn'),
        between: Symbol('between'),
        contains: Symbol('contains'),
        not: Symbol('not'),
      },
      DataTypes: {
        UUID: 'UUID',
        UUIDV4: 'UUIDV4',
        STRING: (length) => `STRING(${length})`,
        TEXT: 'TEXT',
        INTEGER: 'INTEGER',
        BOOLEAN: 'BOOLEAN',
        DATE: 'DATE',
        NOW: 'NOW',
        ENUM: (...values) => `ENUM(${values.join(',')})`,
        JSONB: 'JSONB',
        INET: 'INET',
      },
    },

    // Models registry
    models,

    // Transaction support
    transaction: jest.fn(async (callback) => {
      const transaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      if (callback) {
        await callback(transaction);
      }
      return transaction;
    }),

    // Query methods
    query: jest.fn(),
    literal: jest.fn((sql) => sql),
    fn: jest.fn((fn, ...args) => `${fn}(${args.join(',')})`),
    col: jest.fn((col) => col),

    // Connection
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true),

    // Define model
    define: jest.fn((modelName, attributes, options) => {
      const ModelClass = class extends MockModel {
        static modelName = modelName;
        static attributes = attributes;
        static options = options;
      };

      // Add static methods
      ModelClass.findAll = jest.fn().mockResolvedValue([]);
      ModelClass.findOne = jest.fn().mockResolvedValue(null);
      ModelClass.findByPk = jest.fn().mockResolvedValue(null);
      ModelClass.findAndCountAll = jest.fn().mockResolvedValue({ count: 0, rows: [] });
      ModelClass.count = jest.fn().mockResolvedValue(0);
      ModelClass.create = jest.fn(async (data) => {
        const instance = new ModelClass(data);
        const storeKey = `${modelName}_${instance.id}`;
        instances.set(storeKey, instance);

        // Run beforeCreate hooks
        if (options.hooks && options.hooks.beforeCreate) {
          await options.hooks.beforeCreate(instance);
        }

        return instance;
      });
      ModelClass.bulkCreate = jest.fn(async (dataArray) => {
        return Promise.all(dataArray.map(data => ModelClass.create(data)));
      });
      ModelClass.update = jest.fn().mockResolvedValue([1, []]);
      ModelClass.destroy = jest.fn().mockResolvedValue(1);
      ModelClass.build = jest.fn((data) => new ModelClass(data));

      // Add scopes
      ModelClass.addScope = jest.fn();

      // Add associations
      ModelClass.associate = jest.fn();
      ModelClass.hasMany = jest.fn();
      ModelClass.hasOne = jest.fn();
      ModelClass.belongsTo = jest.fn();
      ModelClass.belongsToMany = jest.fn();

      models[modelName] = ModelClass;
      return ModelClass;
    }),
  };

  return mockSequelize;
}

/**
 * Create mock model instance with data
 */
function createMockInstance(ModelClass, data = {}) {
  return new ModelClass(data);
}

/**
 * Mock model factory for testing
 */
function createModelMock(modelName) {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findByPk: jest.fn().mockResolvedValue(null),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue(new MockModel()),
    bulkCreate: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue([1, []]),
    destroy: jest.fn().mockResolvedValue(1),
    build: jest.fn((data) => new MockModel(data)),
    addScope: jest.fn(),
    associate: jest.fn(),
    hasMany: jest.fn(),
    hasOne: jest.fn(),
    belongsTo: jest.fn(),
    belongsToMany: jest.fn(),
    modelName,
  };
}

/**
 * Reset all mocks
 */
function resetMocks(sequelize) {
  if (sequelize && sequelize.models) {
    Object.values(sequelize.models).forEach(model => {
      if (model.findAll) model.findAll.mockReset();
      if (model.findOne) model.findOne.mockReset();
      if (model.findByPk) model.findByPk.mockReset();
      if (model.create) model.create.mockReset();
      if (model.update) model.update.mockReset();
      if (model.destroy) model.destroy.mockReset();
    });
  }
}

module.exports = {
  MockModel,
  createMockSequelize,
  createMockInstance,
  createModelMock,
  resetMocks,
};