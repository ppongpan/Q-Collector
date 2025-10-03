/**
 * Translation Model
 * Caches Thai→English translations for fast lookup
 * Part of 3-tier translation system
 */

module.exports = (sequelize, DataTypes) => {
  const Translation = sequelize.define('Translation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    thai_text: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      comment: 'Original Thai text',
    },
    english_text: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Translated English text',
    },
    source: {
      type: DataTypes.ENUM('dictionary', 'api', 'manual'),
      defaultValue: 'api',
      allowNull: false,
      comment: 'Source of translation',
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Confidence score 0.00-1.00',
    },
    used_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of times used',
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time retrieved',
    },
  }, {
    tableName: 'translation_cache',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['thai_text'], unique: true },
      { fields: ['source'] },
      { fields: ['last_used_at'] },
      { fields: ['used_count'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Mark translation as used
   * @returns {Promise<Translation>}
   */
  Translation.prototype.markAsUsed = async function() {
    this.used_count += 1;
    this.last_used_at = new Date();
    return await this.save();
  };

  /**
   * Check if translation is stale (not used in 30 days)
   * @returns {boolean}
   */
  Translation.prototype.isStale = function() {
    if (!this.last_used_at) return false;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.last_used_at < thirtyDaysAgo;
  };

  /**
   * Get human-readable source name
   * @returns {string}
   */
  Translation.prototype.getSourceLabel = function() {
    const sourceLabels = {
      dictionary: 'Dictionary',
      api: 'MyMemory API',
      manual: 'Manual Entry',
    };
    return sourceLabels[this.source] || this.source;
  };

  /**
   * Class Methods
   */

  /**
   * Find translation by Thai text
   * @param {string} thaiText - Thai text to lookup
   * @returns {Promise<Translation|null>}
   */
  Translation.findByThaiText = async function(thaiText) {
    if (!thaiText) return null;

    const translation = await Translation.findOne({
      where: { thai_text: thaiText.trim() },
    });

    if (translation) {
      // Mark as used asynchronously (don't wait)
      translation.markAsUsed().catch(() => {});
    }

    return translation;
  };

  /**
   * Save new translation to cache
   * @param {Object} data - Translation data
   * @returns {Promise<Translation>}
   */
  Translation.saveTranslation = async function(data) {
    const {
      thaiText,
      englishText,
      source = 'api',
      confidence = null,
    } = data;

    // Try to find existing translation
    let translation = await Translation.findOne({
      where: { thai_text: thaiText.trim() },
    });

    if (translation) {
      // Update existing
      translation.english_text = englishText;
      translation.source = source;
      translation.confidence = confidence;
      await translation.markAsUsed();
      return translation;
    }

    // Create new
    return await Translation.create({
      thai_text: thaiText.trim(),
      english_text: englishText,
      source,
      confidence,
      used_count: 1,
      last_used_at: new Date(),
    });
  };

  /**
   * Get most used translations
   * @param {number} limit - Number of results
   * @returns {Promise<Translation[]>}
   */
  Translation.getMostUsed = async function(limit = 50) {
    return await Translation.findAll({
      order: [['used_count', 'DESC']],
      limit,
    });
  };

  /**
   * Get recently used translations
   * @param {number} limit - Number of results
   * @returns {Promise<Translation[]>}
   */
  Translation.getRecentlyUsed = async function(limit = 50) {
    return await Translation.findAll({
      where: {
        last_used_at: {
          [sequelize.Sequelize.Op.ne]: null,
        },
      },
      order: [['last_used_at', 'DESC']],
      limit,
    });
  };

  /**
   * Get statistics
   * @returns {Promise<Object>}
   */
  Translation.getStatistics = async function() {
    const total = await Translation.count();

    const bySource = await Translation.findAll({
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['source'],
      raw: true,
    });

    const totalUsageCount = await Translation.sum('used_count');

    const result = {
      totalTranslations: total,
      totalUsageCount: totalUsageCount || 0,
      bySource: {},
    };

    bySource.forEach((stat) => {
      result.bySource[stat.source] = parseInt(stat.count);
    });

    return result;
  };

  /**
   * Clean stale translations (not used in 90 days)
   * @param {number} daysUnused - Days of inactivity
   * @returns {Promise<number>}
   */
  Translation.cleanStaleTranslations = async function(daysUnused = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysUnused);

    const deleted = await Translation.destroy({
      where: {
        last_used_at: {
          [sequelize.Sequelize.Op.lt]: cutoffDate,
        },
      },
    });

    return deleted;
  };

  /**
   * Scopes for common queries
   */
  Translation.addScope('dictionary', {
    where: { source: 'dictionary' },
  });

  Translation.addScope('api', {
    where: { source: 'api' },
  });

  Translation.addScope('manual', {
    where: { source: 'manual' },
  });

  Translation.addScope('mostUsed', {
    order: [['used_count', 'DESC']],
    limit: 50,
  });

  Translation.addScope('recentlyUsed', {
    where: {
      last_used_at: {
        [sequelize.Sequelize.Op.ne]: null,
      },
    },
    order: [['last_used_at', 'DESC']],
    limit: 50,
  });

  return Translation;
};
