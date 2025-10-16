/**
 * ====================================================================
 * SUB-FORM NAVIGATION LOG CAPTURE SCRIPT
 * ====================================================================
 *
 * INSTRUCTIONS:
 * 1. Log into http://localhost:3000 manually (with 2FA if needed)
 * 2. Navigate to a form that HAS sub-forms with submissions
 * 3. Open a submission detail page that shows sub-form data
 * 4. Click on a sub-form row to open the sub-form detail modal/page
 * 5. Open browser DevTools (F12) → Console tab
 * 6. Copy and paste this ENTIRE script into the console
 * 7. Press Enter to run
 * 8. The script will capture and display all relevant logs
 *
 * ====================================================================
 */

(function() {
  console.log('\n%c=== SUB-FORM LOG CAPTURE STARTED ===', 'color: #f97316; font-size: 16px; font-weight: bold;');
  console.log('%cInstructions:', 'color: #10b981; font-weight: bold;');
  console.log('1. This script will intercept console.log calls');
  console.log('2. Navigate and click on sub-form rows as normal');
  console.log('3. All logs will be captured in the background');
  console.log('4. Type showLogs() in console to see captured logs');
  console.log('5. Type downloadLogs() to download as JSON file\n');

  // Storage for captured logs
  window.capturedLogs = [];

  // Save original console methods
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  // Create wrapper function
  function captureLog(type, args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    // Store log
    window.capturedLogs.push({
      type,
      message,
      timestamp,
      args
    });

    // Call original method
    return message;
  }

  // Override console methods
  console.log = function(...args) {
    const msg = captureLog('log', args);
    originalLog.apply(console, args);
    return msg;
  };

  console.warn = function(...args) {
    const msg = captureLog('warn', args);
    originalWarn.apply(console, args);
    return msg;
  };

  console.error = function(...args) {
    const msg = captureLog('error', args);
    originalError.apply(console, args);
    return msg;
  };

  console.info = function(...args) {
    const msg = captureLog('info', args);
    originalInfo.apply(console, args);
    return msg;
  };

  // Helper function to filter relevant logs
  window.getRelevantLogs = function() {
    return window.capturedLogs.filter(log => {
      const msg = log.message;
      return (
        msg.includes('🔍') ||
        msg.includes('🎯') ||
        msg.includes('✅') ||
        msg.includes('renderSubFormDetail') ||
        msg.includes('allSubSubmissionsCount') ||
        msg.includes('currentSubSubmissionId') ||
        msg.includes('currentIndex') ||
        msg.includes('hasPrevious') ||
        msg.includes('hasNext') ||
        msg.includes('sub.id') ||
        msg.includes('Sub-form navigation') ||
        msg.includes('Sub-form detail') ||
        msg.includes('navigation state')
      );
    };
  };

  // Helper function to show logs
  window.showLogs = function(onlyRelevant = true) {
    console.log('\n%c=== CAPTURED LOGS ===', 'color: #f97316; font-size: 14px; font-weight: bold;');

    const logsToShow = onlyRelevant ? window.getRelevantLogs() : window.capturedLogs;

    console.log(`%cTotal logs captured: ${window.capturedLogs.length}`, 'color: #10b981;');
    console.log(`%cRelevant logs: ${window.getRelevantLogs().length}`, 'color: #10b981;');
    console.log(`%cShowing: ${logsToShow.length} logs\n`, 'color: #10b981;');

    if (logsToShow.length === 0) {
      console.log('%c No relevant logs found. Make sure to click on a sub-form row!', 'color: #ef4444;');
      return;
    }

    logsToShow.forEach((log, index) => {
      const color = {
        log: '#3b82f6',
        warn: '#f59e0b',
        error: '#ef4444',
        info: '#10b981'
      }[log.type] || '#6b7280';

      console.log(`%c[${index + 1}] [${log.type.toUpperCase()}] ${log.timestamp}`, `color: ${color}; font-weight: bold;`);
      console.log(log.message);
      console.log('');
    });

    return logsToShow;
  };

  // Helper function to download logs as JSON
  window.downloadLogs = function(onlyRelevant = true) {
    const logsToDownload = onlyRelevant ? window.getRelevantLogs() : window.capturedLogs;

    const dataStr = JSON.stringify(logsToDownload, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `subform-logs-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    console.log(`%c✅ Downloaded ${logsToDownload.length} logs to ${exportFileDefaultName}`, 'color: #10b981; font-weight: bold;');
  };

  // Helper function to clear captured logs
  window.clearLogs = function() {
    window.capturedLogs = [];
    console.log('%c✅ Logs cleared', 'color: #10b981; font-weight: bold;');
  };

  // Helper function to restore original console
  window.stopCapture = function() {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    console.info = originalInfo;
    console.log('%c✅ Log capture stopped. Original console methods restored.', 'color: #10b981; font-weight: bold;');
  };

  console.log('%c✅ Log capture is now active!', 'color: #10b981; font-size: 14px; font-weight: bold;');
  console.log('%cAvailable commands:', 'color: #f97316; font-weight: bold;');
  console.log('  - showLogs()        → Display relevant logs');
  console.log('  - showLogs(false)   → Display all logs');
  console.log('  - downloadLogs()    → Download relevant logs as JSON');
  console.log('  - downloadLogs(false) → Download all logs as JSON');
  console.log('  - clearLogs()       → Clear captured logs');
  console.log('  - stopCapture()     → Stop capturing and restore console\n');

  console.log('%c👉 Now navigate to a sub-form and click on a row!', 'color: #f97316; font-size: 14px; font-weight: bold;\n');
})();
