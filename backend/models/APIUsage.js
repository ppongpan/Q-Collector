/**
 * APIUsage Model
 * Tracks MyMemory Translation API usage for rate limiting
 * Daily limit: 1,000 requests
 */

module.exports = (sequelize, DataTypes) => {
  const APIUsage = sequelize.define('APIUsage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
      comment: 'Date in YYYY-MM-DD format',
    },
    request_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Total API requests made',
    },
    success_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Successful responses',
    },
    error_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Failed requests',
    },
    cache_hit_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Cache hits (avoided API call)',
    },
    dictionary_hit_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Dictionary hits (avoided API call)',
    },
  }, {
    tableName: 'translation_api_usage',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['date'], unique: true },
      { fields: ['created_at'] },
    ],
  });

  /**
   * Instance Methods
   */

  /**
   * Increment request count
   * @param {string} type - Type of increment: success, error
   * @returns {Promise<APIUsage>}
   */
  APIUsage.prototype.incrementRequest = async function(type = 'success') {
    this.request_count += 1;

    if (type === 'success') {
      this.success_count += 1;
    } else if (type === 'error') {
      this.error_count += 1;
    }

    return await this.save();
  };

  /**
   * Increment cache hit count
   * @returns {Promise<APIUsage>}
   */
  APIUsage.prototype.incrementCacheHit = async function() {
    this.cache_hit_count += 1;
    return await this.save();
  };

  /**
   * Increment dictionary hit count
   * @returns {Promise<APIUsage>}
   */
  APIUsage.prototype.incrementDictionaryHit = async function() {
    this.dictionary_hit_count += 1;
    return await this.save();
  };

  /**
   * Check if daily limit is reached
   * @param {number} limit - Daily limit (default 1000)
   * @returns {boolean}
   */
  APIUsage.prototype.isLimitReached = function(limit = 1000) {
    return this.request_count >= limit;
  };

  /**
   * Get usage percentage
   * @param {number} limit - Daily limit (default 1000)
   * @returns {number}
   */
  APIUsage.prototype.getUsagePercentage = function(limit = 1000) {
    return Math.round((this.request_count / limit) * 100);
  };

  /**
   * Get success rate
   * @returns {number}
   */
  APIUsage.prototype.getSuccessRate = function() {
    if (this.request_count === 0) return 0;
    return Math.round((this.success_count / this.request_count) * 100);
  };

  /**
   * Get total hits (cache + dictionary)
   * @returns {number}
   */
  APIUsage.prototype.getTotalHits = function() {
    return this.cache_hit_count + this.dictionary_hit_count;
  };

  /**
   * Class Methods
   */

  /**
   * Get or create today's usage record
   * @returns {Promise<APIUsage>}
   */
  APIUsage.getTodayUsage = async function() {
    const today = new Date().toISOString().split('T')[0];

    const [usage, created] = await APIUsage.findOrCreate({
      where: { date: today },
      defaults: {
        request_count: 0,
        success_count: 0,
        error_count: 0,
        cache_hit_count: 0,
        dictionary_hit_count: 0,
      },
    });

    return usage;
  };

  /**
   * Increment today's request count
   * @param {string} type - Type: success or error
   * @returns {Promise<APIUsage>}
   */
  APIUsage.incrementTodayRequest = async function(type = 'success') {
    const usage = await APIUsage.getTodayUsage();
    return await usage.incrementRequest(type);
  };

  /**
   * Increment today's cache hit count
   * @returns {Promise<APIUsage>}
   */
  APIUsage.incrementTodayCacheHit = async function() {
    const usage = await APIUsage.getTodayUsage();
    return await usage.incrementCacheHit();
  };

  /**
   * Increment today's dictionary hit count
   * @returns {Promise<APIUsage>}
   */
  APIUsage.incrementTodayDictionaryHit = async function() {
    const usage = await APIUsage.getTodayUsage();
    return await usage.incrementDictionaryHit();
  };

  /**
   * Check if today's limit is reached
   * @param {number} limit - Daily limit (default 1000)
   * @returns {Promise<boolean>}
   */
  APIUsage.isTodayLimitReached = async function(limit = 1000) {
    const usage = await APIUsage.getTodayUsage();
    return usage.isLimitReached(limit);
  };

  /**
   * Get usage for date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<APIUsage[]>}
   */
  APIUsage.getUsageByDateRange = async function(startDate, endDate) {
    return await APIUsage.findAll({
      where: {
        date: {
          [sequelize.Sequelize.Op.between]: [
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ],
        },
      },
      order: [['date', 'DESC']],
    });
  };

  /**
   * Get total statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  APIUsage.getStatistics = async function(options = {}) {
    const { startDate = null, endDate = null } = options;

    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[sequelize.Sequelize.Op.gte] = startDate.toISOString().split('T')[0];
      if (endDate) where.date[sequelize.Sequelize.Op.lte] = endDate.toISOString().split('T')[0];
    }

    const records = await APIUsage.findAll({ where, raw: true });

    const stats = {
      totalRequests: 0,
      totalSuccess: 0,
      totalErrors: 0,
      totalCacheHits: 0,
      totalDictionaryHits: 0,
      averageRequestsPerDay: 0,
      successRate: 0,
    };

    records.forEach((record) => {
      stats.totalRequests += record.request_count;
      stats.totalSuccess += record.success_count;
      stats.totalErrors += record.error_count;
      stats.totalCacheHits += record.cache_hit_count;
      stats.totalDictionaryHits += record.dictionary_hit_count;
    });

    if (records.length > 0) {
      stats.averageRequestsPerDay = Math.round(stats.totalRequests / records.length);
    }

    if (stats.totalRequests > 0) {
      stats.successRate = Math.round((stats.totalSuccess / stats.totalRequests) * 100);
    }

    return stats;
  };

  /**
   * Clean old usage records
   * @param {number} daysToKeep - Number of days to keep
   * @returns {Promise<number>}
   */
  APIUsage.cleanOldRecords = async function(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await APIUsage.destroy({
      where: {
        date: {
          [sequelize.Sequelize.Op.lt]: cutoffDate.toISOString().split('T')[0],
        },
      },
    });

    return deleted;
  };

  /**
   * Scopes for common queries
   */
  APIUsage.addScope('recent', {
    order: [['date', 'DESC']],
    limit: 30,
  });

  APIUsage.addScope('thisWeek', () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return {
      where: {
        date: {
          [sequelize.Sequelize.Op.gte]: weekAgo.toISOString().split('T')[0],
        },
      },
      order: [['date', 'DESC']],
    };
  });

  APIUsage.addScope('thisMonth', () => {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    return {
      where: {
        date: {
          [sequelize.Sequelize.Op.gte]: monthAgo.toISOString().split('T')[0],
        },
      },
      order: [['date', 'DESC']],
    };
  });

  return APIUsage;
};
