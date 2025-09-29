/**
 * Seeder: Demo Users
 * Creates sample users for testing (admin, manager, user accounts)
 */

'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(12);

    // Helper function to hash password
    const hashPassword = async (password) => {
      return await bcrypt.hash(password, salt);
    };

    const users = [
      {
        id: uuidv4(),
        username: 'admin',
        email: 'admin@qcollector.local',
        password_hash: await hashPassword('Admin@123'),
        full_name_enc: null, // Will be encrypted by model hooks in real usage
        role: 'admin',
        phone_enc: null,
        is_active: true,
        last_login_at: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        username: 'manager1',
        email: 'manager1@qcollector.local',
        password_hash: await hashPassword('Manager@123'),
        full_name_enc: null,
        role: 'manager',
        phone_enc: null,
        is_active: true,
        last_login_at: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        username: 'manager2',
        email: 'manager2@qcollector.local',
        password_hash: await hashPassword('Manager@123'),
        full_name_enc: null,
        role: 'manager',
        phone_enc: null,
        is_active: true,
        last_login_at: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        username: 'user1',
        email: 'user1@qcollector.local',
        password_hash: await hashPassword('User@123'),
        full_name_enc: null,
        role: 'user',
        phone_enc: null,
        is_active: true,
        last_login_at: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        username: 'user2',
        email: 'user2@qcollector.local',
        password_hash: await hashPassword('User@123'),
        full_name_enc: null,
        role: 'user',
        phone_enc: null,
        is_active: true,
        last_login_at: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        username: 'viewer1',
        email: 'viewer1@qcollector.local',
        password_hash: await hashPassword('Viewer@123'),
        full_name_enc: null,
        role: 'viewer',
        phone_enc: null,
        is_active: true,
        last_login_at: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await queryInterface.bulkInsert('users', users, {});

    console.log('\n=== Demo Users Created ===');
    console.log('Admin: admin@qcollector.local / Admin@123');
    console.log('Manager1: manager1@qcollector.local / Manager@123');
    console.log('Manager2: manager2@qcollector.local / Manager@123');
    console.log('User1: user1@qcollector.local / User@123');
    console.log('User2: user2@qcollector.local / User@123');
    console.log('Viewer1: viewer1@qcollector.local / Viewer@123');
    console.log('==========================\n');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: {
        [Sequelize.Op.in]: [
          'admin@qcollector.local',
          'manager1@qcollector.local',
          'manager2@qcollector.local',
          'user1@qcollector.local',
          'user2@qcollector.local',
          'viewer1@qcollector.local',
        ],
      },
    }, {});
  },
};