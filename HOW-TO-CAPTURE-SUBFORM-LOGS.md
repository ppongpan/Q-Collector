# How to Capture Sub-Form Navigation Console Logs

## Quick Start (Browser Console Method) - RECOMMENDED

### Step 1: Login
1. Open http://localhost:3000 in your browser
2. Login with credentials: `pongpanp` / `Gfvtmiu613`
3. Complete 2FA verification if required

### Step 2: Navigate to a Form with Sub-Forms
1. Go to the Forms list
2. Find a form that has sub-forms (forms with nested data tables)
3. Click on "Submissions" for that form
4. Click on any submission that has sub-form data

### Step 3: Setup Log Capture
1. Press `F12` to open DevTools
2. Go to the `Console` tab
3. Open the file: `C:\Users\Pongpan\Documents\24Sep25\BROWSER-CONSOLE-SCRIPT.js`
4. Copy the ENTIRE contents of that file
5. Paste into the browser console
6. Press `Enter` to run the script

You should see:
```
=== SUB-FORM LOG CAPTURE STARTED ===
✅ Log capture is now active!
Available commands:
  - showLogs()
  - downloadLogs()
  - clearLogs()
  - stopCapture()

👉 Now navigate to a sub-form and click on a row!
```

### Step 4: Trigger Sub-Form Navigation
1. Scroll down on the submission detail page to find sub-form tables
2. Click on any sub-form row (they should be clickable/hoverable)
3. This will open the sub-form detail modal/page
4. Wait 2-3 seconds for all logs to appear

### Step 5: View Captured Logs
In the console, type:
```javascript
showLogs()
```

This will display all relevant logs containing:
- 🔍 Debug markers
- 🎯 Target markers
- ✅ Success markers
- renderSubFormDetail function calls
- allSubSubmissionsCount values
- currentSubSubmissionId values
- currentIndex calculations
- hasPrevious/hasNext boolean values
- sub.id comparisons

### Step 6: Download Logs as JSON
```javascript
downloadLogs()
```

This will download a JSON file with all captured logs.

---

## What to Look For

The logs should show:

### 1. Sub-Form Data Loading
```
🔍 renderSubFormDetail - allSubSubmissionsCount: 5
🔍 renderSubFormDetail - currentSubSubmissionId: "abc-123-def" (type: string)
```

### 2. Index Calculation
```
🔍 renderSubFormDetail - currentIndex: 2
🔍 Comparing sub.id "abc-123-def" === currentSubSubmissionId "abc-123-def"
```

### 3. Navigation State
```
🎯 renderSubFormDetail - hasPrevious: true
🎯 renderSubFormDetail - hasNext: true
```

### 4. Issues to Check
- Is `currentSubSubmissionId` a string or UUID object?
- Is the comparison `sub.id === currentSubSubmissionId` working?
- Is `currentIndex` being found correctly?
- Are `hasPrevious` and `hasNext` calculated correctly?

---

## Alternative: Playwright Method (Automated)

If you want to automate this, you'll need to:

### Option 1: Get Authentication Tokens Manually

1. Login to http://localhost:3000 manually
2. Open DevTools → Application → Local Storage → http://localhost:3000
3. Copy these values:
   - `q-collector-auth-token`
   - `q-collector-refresh-token`
   - `user`

4. Edit `C:\Users\Pongpan\Documents\24Sep25\scripts\capture-subform-logs-manual.js`
5. Replace the `YOUR_TOKEN_HERE` placeholders with your actual tokens
6. Run:
   ```bash
   node scripts/capture-subform-logs-manual.js
   ```

### Option 2: Use Playwright with Saved Storage State

1. Login manually once
2. Save the browser state:
   ```javascript
   await context.storageState({ path: 'auth-state.json' });
   ```
3. Load the state in future runs:
   ```javascript
   const context = await browser.newContext({ storageState: 'auth-state.json' });
   ```

---

## Troubleshooting

### No Logs Appearing?
- Make sure the form has sub-forms with actual data
- Check that you clicked on a clickable sub-form row (cursor should change to pointer)
- Verify the console script is still running (type `window.capturedLogs` - should return an array)

### Script Not Working?
- Refresh the page and re-paste the script
- Make sure you copied the ENTIRE script from BROWSER-CONSOLE-SCRIPT.js
- Check for any JavaScript errors in the console

### Can't Find Forms with Sub-Forms?
- Create a test form with sub-forms if needed
- Sub-forms are tables with clickable rows showing nested data
- Look for tables with `cursor-pointer` class on rows

---

## Expected Output Format

The downloaded JSON will look like:
```json
[
  {
    "type": "log",
    "message": "🔍 renderSubFormDetail - allSubSubmissionsCount: 5",
    "timestamp": "2025-10-11T06:25:30.123Z"
  },
  {
    "type": "log",
    "message": "🔍 renderSubFormDetail - currentSubSubmissionId: \"abc-123-def\" (type: string)",
    "timestamp": "2025-10-11T06:25:30.125Z"
  },
  {
    "type": "log",
    "message": "🔍 renderSubFormDetail - currentIndex: 2",
    "timestamp": "2025-10-11T06:25:30.127Z"
  },
  {
    "type": "log",
    "message": "🎯 renderSubFormDetail - hasPrevious: true",
    "timestamp": "2025-10-11T06:25:30.128Z"
  },
  {
    "type": "log",
    "message": "🎯 renderSubFormDetail - hasNext: true",
    "timestamp": "2025-10-11T06:25:30.129Z"
  }
]
```

---

## Questions to Answer

After capturing the logs, please provide:

1. What is the value of `allSubSubmissionsCount`?
2. What is the value and TYPE of `currentSubSubmissionId`?
3. What is the value of `currentIndex`?
4. Are `hasPrevious` and `hasNext` calculated correctly?
5. Are there any comparison logs showing `sub.id` vs `currentSubSubmissionId`?
6. Is the comparison returning `true` or `false`?

---

## Files Created

- `C:\Users\Pongpan\Documents\24Sep25\BROWSER-CONSOLE-SCRIPT.js` - Browser console script (RECOMMENDED)
- `C:\Users\Pongpan\Documents\24Sep25\scripts\capture-subform-logs-manual.js` - Playwright with manual tokens
- `C:\Users\Pongpan\Documents\24Sep25\scripts\capture-subform-logs-v2.js` - Playwright automated (requires no 2FA)
- `C:\Users\Pongpan\Documents\24Sep25\HOW-TO-CAPTURE-SUBFORM-LOGS.md` - This guide
