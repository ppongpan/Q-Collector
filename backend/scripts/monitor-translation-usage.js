/**
 * MyMemory API Usage Monitor
 * Track daily usage and translation statistics
 */

const fs = require('fs');
const path = require('path');

// Usage log file
const usageLogFile = path.join(__dirname, '../logs/translation-usage.json');

// Ensure logs directory exists
const logsDir = path.dirname(usageLogFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Load usage statistics
 */
function loadUsage() {
  if (!fs.existsSync(usageLogFile)) {
    return {
      totalCalls: 0,
      totalCharacters: 0,
      dailyUsage: {},
      translations: []
    };
  }

  try {
    const data = fs.readFileSync(usageLogFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading usage log:', error.message);
    return {
      totalCalls: 0,
      totalCharacters: 0,
      dailyUsage: {},
      translations: []
    };
  }
}

/**
 * Save usage statistics
 */
function saveUsage(usage) {
  try {
    fs.writeFileSync(usageLogFile, JSON.stringify(usage, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving usage log:', error.message);
  }
}

/**
 * Log a translation
 */
function logTranslation(thaiText, englishText, quality, charCount) {
  const usage = loadUsage();
  const today = new Date().toISOString().split('T')[0];

  // Update totals
  usage.totalCalls++;
  usage.totalCharacters += charCount;

  // Update daily usage
  if (!usage.dailyUsage[today]) {
    usage.dailyUsage[today] = {
      calls: 0,
      characters: 0
    };
  }
  usage.dailyUsage[today].calls++;
  usage.dailyUsage[today].characters += charCount;

  // Add translation record (keep last 100)
  usage.translations.unshift({
    timestamp: new Date().toISOString(),
    thai: thaiText,
    english: englishText,
    quality: quality,
    characters: charCount
  });

  if (usage.translations.length > 100) {
    usage.translations = usage.translations.slice(0, 100);
  }

  saveUsage(usage);
}

/**
 * Display usage statistics
 */
function displayStats() {
  const usage = loadUsage();
  const today = new Date().toISOString().split('T')[0];

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         MyMemory API Usage Statistics                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Overall statistics
  console.log('📊 Overall Statistics:');
  console.log(`   Total API Calls: ${usage.totalCalls.toLocaleString()}`);
  console.log(`   Total Characters: ${usage.totalCharacters.toLocaleString()}\n`);

  // Today's usage
  const todayUsage = usage.dailyUsage[today] || { calls: 0, characters: 0 };
  console.log(`📅 Today's Usage (${today}):`);
  console.log(`   API Calls: ${todayUsage.calls}`);
  console.log(`   Characters: ${todayUsage.characters}`);
  console.log(`   Remaining (anonymous): ${5000 - todayUsage.characters} chars`);
  console.log(`   Remaining (with email): ${50000 - todayUsage.characters} chars\n`);

  // Daily usage trend (last 7 days)
  console.log('📈 Daily Usage Trend (Last 7 days):');
  const dates = Object.keys(usage.dailyUsage).sort().reverse().slice(0, 7);

  if (dates.length === 0) {
    console.log('   No usage data yet\n');
  } else {
    dates.forEach(date => {
      const daily = usage.dailyUsage[date];
      const bar = '█'.repeat(Math.floor(daily.calls / 2));
      console.log(`   ${date}: ${bar} ${daily.calls} calls (${daily.characters} chars)`);
    });
    console.log('');
  }

  // Recent translations
  console.log('🔤 Recent Translations (Last 10):');
  if (usage.translations.length === 0) {
    console.log('   No translations yet\n');
  } else {
    usage.translations.slice(0, 10).forEach((trans, index) => {
      const time = new Date(trans.timestamp).toLocaleTimeString();
      console.log(`   ${index + 1}. [${time}] "${trans.thai}"`);
      console.log(`      → "${trans.english}" (${trans.quality}, ${trans.characters} chars)\n`);
    });
  }

  // Quality distribution
  console.log('⭐ Translation Quality Distribution:');
  const qualityCounts = {
    excellent: 0,
    good: 0,
    fair: 0,
    machine: 0
  };

  usage.translations.forEach(trans => {
    if (qualityCounts[trans.quality] !== undefined) {
      qualityCounts[trans.quality]++;
    }
  });

  const total = usage.translations.length;
  if (total > 0) {
    Object.entries(qualityCounts).forEach(([quality, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / 2));
      console.log(`   ${quality.padEnd(10)}: ${bar} ${count} (${percentage}%)`);
    });
  } else {
    console.log('   No data yet');
  }
  console.log('');

  // Warnings
  if (todayUsage.characters > 4000) {
    console.log('⚠️  WARNING: Approaching anonymous daily limit (5,000 chars)');
    console.log('   Consider setting MYMEMORY_EMAIL env var for 50k limit\n');
  }

  if (todayUsage.characters > 45000) {
    console.log('⚠️  WARNING: Approaching email daily limit (50,000 chars)\n');
  }
}

/**
 * Reset daily stats (run at midnight)
 */
function resetDaily() {
  const usage = loadUsage();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Keep last 30 days only
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

  Object.keys(usage.dailyUsage).forEach(date => {
    if (date < cutoffDate) {
      delete usage.dailyUsage[date];
    }
  });

  saveUsage(usage);
  console.log(`✅ Cleaned up usage data older than ${cutoffDate}`);
}

/**
 * Export usage report
 */
function exportReport() {
  const usage = loadUsage();
  const reportFile = path.join(__dirname, '../logs/translation-report.txt');

  let report = 'MyMemory API Usage Report\n';
  report += '='.repeat(60) + '\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += `Total API Calls: ${usage.totalCalls}\n`;
  report += `Total Characters: ${usage.totalCharacters}\n\n`;

  report += 'Daily Usage:\n';
  Object.entries(usage.dailyUsage)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([date, data]) => {
      report += `  ${date}: ${data.calls} calls, ${data.characters} chars\n`;
    });

  fs.writeFileSync(reportFile, report, 'utf8');
  console.log(`✅ Report exported to: ${reportFile}`);
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'log':
    const thai = process.argv[3];
    const english = process.argv[4];
    const quality = process.argv[5] || 'good';
    const chars = thai ? thai.length : 0;
    if (thai && english) {
      logTranslation(thai, english, quality, chars);
      console.log('✅ Translation logged');
    } else {
      console.log('Usage: node monitor-translation-usage.js log "Thai text" "English text" [quality]');
    }
    break;

  case 'reset':
    resetDaily();
    break;

  case 'export':
    exportReport();
    break;

  case 'stats':
  default:
    displayStats();
    break;
}

// Export functions for use in other modules
module.exports = {
  logTranslation,
  displayStats,
  resetDaily,
  exportReport
};
