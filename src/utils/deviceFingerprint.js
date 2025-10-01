import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise = null;

/**
 * Get device fingerprint using FingerprintJS
 * @returns {Promise<string>} Device fingerprint ID
 */
export async function getDeviceFingerprint() {
  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }

    const fp = await fpPromise;
    const result = await fp.get();

    return result.visitorId;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to a simple fingerprint if FingerprintJS fails
    return generateFallbackFingerprint();
  }
}

/**
 * Get detailed device information
 * @returns {Promise<Object>} Device information object
 */
export async function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const language = navigator.language;

  // Extract browser name from user agent
  let browserInfo = 'Unknown Browser';
  if (userAgent.includes('Chrome')) browserInfo = 'Chrome';
  else if (userAgent.includes('Firefox')) browserInfo = 'Firefox';
  else if (userAgent.includes('Safari')) browserInfo = 'Safari';
  else if (userAgent.includes('Edge')) browserInfo = 'Edge';

  // Extract OS info
  let osInfo = 'Unknown OS';
  if (userAgent.includes('Windows')) osInfo = 'Windows';
  else if (userAgent.includes('Mac')) osInfo = 'macOS';
  else if (userAgent.includes('Linux')) osInfo = 'Linux';
  else if (userAgent.includes('Android')) osInfo = 'Android';
  else if (userAgent.includes('iOS')) osInfo = 'iOS';

  return {
    deviceName: `${osInfo} - ${browserInfo}`,
    userAgent,
    platform,
    language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: window.screen.colorDepth,
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
  };
}

/**
 * Generate fallback fingerprint if FingerprintJS fails
 * @returns {string} Fallback fingerprint
 */
function generateFallbackFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    window.screen.colorDepth,
    window.screen.width + 'x' + window.screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    canvas.toDataURL()
  ].join('###');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return 'fallback_' + Math.abs(hash).toString(36);
}
