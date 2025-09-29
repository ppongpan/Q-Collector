/**
 * User Model
 * Manages user accounts with encrypted personal data
 */

const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/encryption.util');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        isAlphanumeric: true,
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    full_name_enc: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted full name',
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'user', 'viewer'),
      allowNull: false,
      defaultValue: 'user',
    },
    phone_enc: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted phone number',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['email'] },
      { fields: ['username'] },
      { fields: ['role'] },
      { fields: ['is_active'] },
    ],
    hooks: {
      /**
       * Hash password before creating user
       */
      beforeCreate: async (user) => {
        if (user.password_hash) {
          const salt = await bcrypt.genSalt(12);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }

        // Encrypt sensitive fields
        if (user.full_name) {
          user.full_name_enc = JSON.stringify(encrypt(user.full_name));
        }
        if (user.phone) {
          user.phone_enc = JSON.stringify(encrypt(user.phone));
        }
      },

      /**
       * Hash password before updating user (if password changed)
       */
      beforeUpdate: async (user) => {
        if (user.changed('password_hash')) {
          const salt = await bcrypt.genSalt(12);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }

        // Re-encrypt sensitive fields if changed
        if (user.changed('full_name')) {
          user.full_name_enc = JSON.stringify(encrypt(user.full_name));
        }
        if (user.changed('phone')) {
          user.phone_enc = JSON.stringify(encrypt(user.phone));
        }
      },
    },
  });

  /**
   * Instance Methods
   */

  /**
   * Validate password against hash
   * @param {string} password - Plain text password
   * @returns {Promise<boolean>}
   */
  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
  };

  /**
   * Get decrypted full name
   * @returns {string|null}
   */
  User.prototype.getFullName = function() {
    if (!this.full_name_enc) return null;
    try {
      const encryptedData = JSON.parse(this.full_name_enc);
      return decrypt(encryptedData);
    } catch (error) {
      console.error('Error decrypting full name:', error);
      return null;
    }
  };

  /**
   * Get decrypted phone number
   * @returns {string|null}
   */
  User.prototype.getPhone = function() {
    if (!this.phone_enc) return null;
    try {
      const encryptedData = JSON.parse(this.phone_enc);
      return decrypt(encryptedData);
    } catch (error) {
      console.error('Error decrypting phone:', error);
      return null;
    }
  };

  /**
   * Convert to JSON and hide sensitive data
   * @returns {Object}
   */
  User.prototype.toJSON = function() {
    const values = { ...this.get() };

    // Remove sensitive fields
    delete values.password_hash;
    delete values.full_name_enc;
    delete values.phone_enc;

    // Add decrypted fields if available
    if (this.full_name_enc) {
      values.full_name = this.getFullName();
    }
    if (this.phone_enc) {
      values.phone = this.getPhone();
    }

    return values;
  };

  /**
   * Get safe user data for token payload
   * @returns {Object}
   */
  User.prototype.getTokenPayload = function() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
    };
  };

  /**
   * Class Methods
   */

  /**
   * Find user by email or username
   * @param {string} identifier - Email or username
   * @returns {Promise<User|null>}
   */
  User.findByIdentifier = async function(identifier) {
    return await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email: identifier },
          { username: identifier },
        ],
      },
    });
  };

  /**
   * Find active users by role
   * @param {string} role - User role
   * @returns {Promise<User[]>}
   */
  User.findByRole = async function(role) {
    return await User.findAll({
      where: {
        role,
        is_active: true,
      },
      order: [['username', 'ASC']],
    });
  };

  /**
   * Model Associations
   */
  User.associate = (models) => {
    // User creates many Forms
    User.hasMany(models.Form, {
      foreignKey: 'created_by',
      as: 'forms',
      onDelete: 'SET NULL',
    });

    // User submits many Submissions
    User.hasMany(models.Submission, {
      foreignKey: 'submitted_by',
      as: 'submissions',
      onDelete: 'SET NULL',
    });

    // User uploads many Files
    User.hasMany(models.File, {
      foreignKey: 'uploaded_by',
      as: 'files',
      onDelete: 'SET NULL',
    });

    // User has many AuditLogs
    User.hasMany(models.AuditLog, {
      foreignKey: 'user_id',
      as: 'audit_logs',
      onDelete: 'SET NULL',
    });

    // User has many Sessions
    User.hasMany(models.Session, {
      foreignKey: 'user_id',
      as: 'sessions',
      onDelete: 'CASCADE',
    });
  };

  /**
   * Scopes for common queries
   */
  User.addScope('active', {
    where: { is_active: true },
  });

  User.addScope('admins', {
    where: { role: 'admin', is_active: true },
  });

  User.addScope('managers', {
    where: { role: 'manager', is_active: true },
  });

  User.addScope('withoutPassword', {
    attributes: { exclude: ['password_hash', 'full_name_enc', 'phone_enc'] },
  });

  return User;
};