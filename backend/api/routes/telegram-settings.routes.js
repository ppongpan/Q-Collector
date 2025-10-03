/**
 * Telegram Settings Routes
 * Super Admin only - Manage global Telegram configuration
 */

const express = require('express');
const router = express.Router();
const { TelegramSettings } = require('../../models');
const { authenticate, requireSuperAdmin } = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger.util');

/**
 * @route   GET /api/v1/telegram-settings
 * @desc    Get current Telegram settings
 * @access  Super Admin only
 */
router.get('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const settings = await TelegramSettings.getCurrentSettings();

    // Don't expose full bot token in response
    const safeSettings = {
      id: settings.id,
      bot_token: settings.bot_token ? `***${settings.bot_token.slice(-10)}` : '',
      group_id: settings.group_id,
      enabled: settings.enabled,
      updated_by: settings.updated_by,
      updated_at: settings.updated_at,
      // Include flags for frontend
      has_token: !!settings.bot_token,
      has_group_id: !!settings.group_id,
    };

    res.json({
      success: true,
      settings: safeSettings,
    });
  } catch (error) {
    logger.error('Get Telegram settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Telegram settings',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/v1/telegram-settings
 * @desc    Update Telegram settings
 * @access  Super Admin only
 */
router.put('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { bot_token, group_id, enabled } = req.body;
    const userId = req.user.id;

    const updates = {};

    if (bot_token !== undefined) {
      updates.bot_token = bot_token;
    }

    if (group_id !== undefined) {
      updates.group_id = group_id;
    }

    if (enabled !== undefined) {
      updates.enabled = enabled;
    }

    const settings = await TelegramSettings.updateSettings(updates, userId);

    logger.info(`Telegram settings updated by user ${req.user.username}`);

    // Don't expose full bot token in response
    const safeSettings = {
      id: settings.id,
      bot_token: settings.bot_token ? `***${settings.bot_token.slice(-10)}` : '',
      group_id: settings.group_id,
      enabled: settings.enabled,
      updated_by: settings.updated_by,
      updated_at: settings.updated_at,
      has_token: !!settings.bot_token,
      has_group_id: !!settings.group_id,
    };

    res.json({
      success: true,
      message: 'Telegram settings updated successfully',
      settings: safeSettings,
    });
  } catch (error) {
    logger.error('Update Telegram settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Telegram settings',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/telegram-settings/test
 * @desc    Test Telegram connection
 * @access  Super Admin only
 */
router.post('/test', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const result = await TelegramSettings.testConnection();

    if (result.success) {
      logger.info(`Telegram connection test successful by user ${req.user.username}`);
    } else {
      logger.warn(`Telegram connection test failed: ${result.message}`);
    }

    res.json(result);
  } catch (error) {
    logger.error('Telegram connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message,
    });
  }
});

module.exports = router;
