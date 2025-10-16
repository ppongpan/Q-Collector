# Token Refresh System Analysis - v0.7.9-dev

**Date:** 2025-10-11
**Status:** = Root Cause Analysis Complete

## Problem Report

**User Report:**
> "app 5H@4I2D'I!10%1!25H+I2 login AuthContext.jsx:109 Auto token refresh failed: Error: #82@I2*9H#0C+!H"

**Symptoms:**
- Apps left open return to login page unexpectedly
- Console shows: `AuthContext.jsx:109 Auto token refresh failed: Error: #82@I2*9H#0C+!H`
- Followed by: `api/v1/auth/logout:1 Failed to load resource: 401 (Unauthorized)`
- Users forced to re-login even though session should last 7 days

## Root Cause Analysis

### Issue #1: Narrow Refresh Window (5 Minutes)

**File:** `src/utils/tokenManager.js` (Lines 233-238)

```javascript
export function shouldRefreshToken() {
  const token = getAccessToken();
  if (!token) return false;

  const expiresIn = getTokenExpiresIn(token);
  return expiresIn > 0 && expiresIn < 300; // Less than 5 minutes  PROBLEM!
}
```

**Configuration:**
- JWT access token expires: **15 minutes**
- Auto-refresh interval: **60 seconds**
- Refresh window: **5 minutes** (300 seconds)

**Timeline of Failure:**

| Time | Token Lifetime | `shouldRefreshToken()` | Action |
|------|----------------|------------------------|--------|
| 10:00 | 15 min | `false` (900 sec > 300) | No action |
| 10:05 | 10 min | `false` (600 sec > 300) | No action |
| 10:10 | 5 min |  `true` (300 sec = 300) | **Refresh triggered** |
| 10:11 | 4 min |  `true` (240 sec < 300) | Refresh (if previous failed) |
| 10:12 | 3 min |  `true` (180 sec < 300) | Refresh (if previous failed) |
| 10:13 | 2 min |  `true` (120 sec < 300) | Refresh (if previous failed) |
| 10:14 | 1 min |  `true` (60 sec < 300) | Refresh (if previous failed) |
| 10:15 | 0 sec | Token expired | **Forced logout** |

**Problem:**
- Refresh only starts with 5 minutes left
- If refresh fails (network hiccup, backend busy), user gets logged out
- No retry mechanism
- No grace period if token still valid

### Issue #2: Aggressive Logout on Refresh Failure

**File:** `src/contexts/AuthContext.jsx` (Lines 102-113)

```javascript
const interval = setInterval(async () => {
  if (AuthService.shouldRefresh()) {
    try {
      await AuthService.refreshToken();
      const updatedUser = AuthService.getStoredUser();
      setUser(updatedUser);
    } catch (error) {
      console.error('Auto token refresh failed:', error); //  User sees this
      // Logout on refresh failure  CRITICAL: Immediate logout!
      await logout();
    }
  }
}, 60000); // Check every minute
```

**Problems:**
1. **No retry mechanism** - Single failure = immediate logout
2. **No token validity check** - Logs out even if token has 4 minutes left
3. **Too aggressive** - Network hiccups cause unnecessary logouts
4. **No user feedback** - Silent logout to login page

**Better Approach:**
- Try 2-3 times with backoff before giving up
- Only logout if token is **actually expired**
- Show warning to user: "Session expiring soon, please save your work"

### Issue #3: Logout API 401 Error (Secondary Issue)

**File:** `src/services/AuthService.js` (Lines 165-176, 182-210)

**The Flow:**
```
1. refreshToken() fails (Line 196)
   “
2. tokenManager.clearTokens() called in catch block
   “
3. Error thrown to AuthContext
   “
4. AuthContext calls logout()
   “
5. logout() tries ApiClient.post('/auth/logout')
   “
6. ApiClient injects Authorization header from localStorage
   “
7. But tokens were cleared in step 2!
   “
8. Result: 401 Unauthorized
```

**Code Evidence:**

`refreshToken()` (Lines 194-198):
```javascript
} catch (error) {
  // Clear tokens on refresh failure
  tokenManager.clearTokens(); //  Clears tokens BEFORE throwing
  const message = parseApiError(error);
  throw new Error(message); //  Throws to AuthContext
}
```

`logout()` (Lines 167-176):
```javascript
async logout() {
  try {
    // Call logout endpoint to invalidate token on server
    await ApiClient.post(API_ENDPOINTS.auth.logout); //  401 because no token!
  } catch (error) {
    console.warn('Logout API call failed:', error);
    // Continue with local logout even if API fails
  } finally {
    // Always clear local tokens
    tokenManager.clearTokens(); //  Already cleared!
  }
}
```

**Impact:**
- Not critical (tokens already cleared)
- But creates confusing error message in console
- Should handle this gracefully

## Proposed Solutions

### Solution #1: Expand Refresh Window (10 Minutes)

**Change:** `tokenManager.js` Line 238

```javascript
// L BEFORE: 5-minute window
return expiresIn > 0 && expiresIn < 300; // Less than 5 minutes

//  AFTER: 10-minute window
return expiresIn > 0 && expiresIn < 600; // Less than 10 minutes
```

**Benefits:**
- More time for retry attempts (10 minutes vs 5 minutes)
- Reduces probability of token expiring during retry
- With 60-second interval: ~10 retry opportunities instead of ~5

### Solution #2: Add Retry Logic with Exponential Backoff

**Change:** `AuthContext.jsx` Lines 102-117

```javascript
const interval = setInterval(async () => {
  if (AuthService.shouldRefresh()) {
    const maxRetries = 3;
    let retryCount = 0;
    let refreshSuccess = false;

    while (retryCount < maxRetries && !refreshSuccess) {
      try {
        await AuthService.refreshToken();
        const updatedUser = AuthService.getStoredUser();
        setUser(updatedUser);
        refreshSuccess = true;
        console.info(`Token refreshed successfully (attempt ${retryCount + 1})`);
      } catch (error) {
        retryCount++;
        console.warn(`Token refresh attempt ${retryCount} failed:`, error.message);

        // Only logout if:
        // 1. All retries exhausted AND
        // 2. Token is actually expired
        if (retryCount >= maxRetries) {
          const token = AuthService.getAccessToken();
          const isExpired = !token || AuthService.isTokenExpired(token);

          if (isExpired) {
            console.error('Token expired - logging out');
            await logout();
          } else {
            console.warn('Token still valid - will retry next interval');
          }
        } else {
          // Wait before retry (exponential backoff: 2s, 4s, 8s)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }
  }
}, 60000); // Check every minute
```

**Benefits:**
- 3 retry attempts before giving up
- Exponential backoff: 2s ’ 4s ’ 8s delays
- Only logs out if token **actually expired**
- Better handling of temporary network issues

### Solution #3: Fix Logout Token Handling

**Change:** `AuthService.js` Lines 165-176

```javascript
async logout() {
  try {
    //  FIX: Only call API if we have a valid token
    const token = tokenManager.getAccessToken();
    if (token) {
      // Call logout endpoint to invalidate token on server
      await ApiClient.post(API_ENDPOINTS.auth.logout);
    } else {
      console.info('Logout: No token to invalidate (already cleared)');
    }
  } catch (error) {
    // Don't warn on 401 - expected if token already cleared
    if (error.response?.status !== 401) {
      console.warn('Logout API call failed:', error);
    }
    // Continue with local logout even if API fails
  } finally {
    // Always clear local tokens
    tokenManager.clearTokens();
  }
}
```

**Benefits:**
- Avoids 401 error when tokens already cleared
- Cleaner console output
- Better user experience

### Solution #4: Add User Warning (Optional Enhancement)

**Change:** Add toast notification in `AuthContext.jsx`

```javascript
// Show warning when token expires in less than 2 minutes
if (expiresIn > 0 && expiresIn < 120 && !warningShown) {
  console.warn('  Session expiring soon - please save your work');
  // TODO: Show toast notification to user
  setWarningShown(true);
}
```

**Benefits:**
- User gets warning before forced logout
- Time to save work before session ends
- Better UX than silent logout

## Recommended Implementation Order

1. **Fix #1 (5 min ’ 10 min window)** - Simple, immediate improvement
2. **Fix #3 (Logout token check)** - Simple, fixes console errors
3. **Fix #2 (Retry logic)** - More complex, but most impactful
4. **Fix #4 (User warning)** - Optional enhancement for better UX

## Testing Plan

1. **Test Token Refresh Success**
   - Login ’ Wait 5 minutes ’ Verify refresh occurs ’ No logout
2. **Test Network Failure Retry**
   - Login ’ Disable network during refresh window ’ Re-enable ’ Verify retry ’ No logout
3. **Test Actual Token Expiration**
   - Login ’ Wait 15+ minutes (full expiration) ’ Verify logout occurs
4. **Test Logout Flow**
   - Logout with valid token ’ No 401 error
   - Logout after token cleared ’ No 401 error

## Impact Assessment

**Before Fixes:**
- L Token refresh window: 5 minutes
- L No retry mechanism
- L Single network hiccup = forced logout
- L Confusing 401 errors in console
- L Users re-login multiple times per day

**After Fixes:**
-  Token refresh window: 10 minutes
-  3 retry attempts with backoff
-  Graceful handling of network issues
-  Clean console output
-  Users stay logged in for full 7 days (unless actual expiration)

## Files to Modify

1. `src/utils/tokenManager.js` (Line 238) - Expand refresh window
2. `src/contexts/AuthContext.jsx` (Lines 102-117) - Add retry logic
3. `src/services/AuthService.js` (Lines 165-176) - Fix logout token handling

**Total:** 3 files
**Lines Changed:** ~50 lines
**Breaking Changes:** None (fully backward compatible)

---

**Next Steps:** Implement fixes in order (1 ’ 3 ’ 2 ’ 4)
