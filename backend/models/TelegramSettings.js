/**
 * TelegramSettings Model
 * Stores global Telegram Bot configuration
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TelegramSettings = sequelize.define(
    'TelegramSettings',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      bot_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'bot_token',
        comment: 'Telegram Bot Token',
      },
      group_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'group_id',
        comment: 'Telegram Group/Channel ID',
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Enable/Disable Telegram notifications globally',
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'updated_by',
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      tableName: 'telegram_settings',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  TelegramSettings.associate = (models) => {
    TelegramSettings.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater',
    });
  };

  /**
   * Get current Telegram settings (singleton pattern)
   */
  TelegramSettings.getCurrentSettings = async function () {
    let settings = await this.findOne();

    // Create default settings if none exist
    if (!settings) {
      settings = await this.create({
        bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
        group_id: process.env.TELEGRAM_GROUP_ID || '',
        enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_GROUP_ID),
      });
    }

    return settings;
  };

  /**
   * Update Telegram settings
   */
  TelegramSettings.updateSettings = async function (updates, userId) {
    const settings = await this.getCurrentSettings();

    await settings.update({
      ...updates,
      updated_by: userId,
    });

    return settings;
  };

  /**
   * Test Telegram connection
   */
  TelegramSettings.testConnection = async function () {
    const settings = await this.getCurrentSettings();

    if (!settings.bot_token || !settings.group_id) {
      return {
        success: false,
        message: 'Bot token or group ID not configured',
      };
    }

    try {
      const axios = require('axios');
      const telegramAPI = `https://api.telegram.org/bot${settings.bot_token}`;

      // Test bot connectivity
      const botInfo = await axios.get(`${telegramAPI}/getMe`);

      if (!botInfo.data.ok) {
        return {
          success: false,
          message: 'Invalid bot token',
        };
      }

      // Test send message
      await axios.post(`${telegramAPI}/sendMessage`, {
        chat_id: settings.group_id,
        text: '✅ Telegram connection test successful!',
      });

      return {
        success: true,
        message: 'Connection test successful',
        botName: botInfo.data.result.username,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection test failed',
      };
    }
  };

  return TelegramSettings;
};
