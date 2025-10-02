/**
 * Theme Configuration for Q-Collector Application
 *
 * Defines available themes and their metadata.
 * Used by ThemeService and ThemeContext for theme management.
 *
 * @version 0.6.0
 * @since 2025-10-01
 */

/**
 * Available themes configuration
 * @type {Object.<string, {id: string, name: string, description: string, isDefault: boolean, available: boolean}>}
 */
export const themes = {
  glass: {
    id: 'glass',
    name: 'ธีมกระจกส้มนีออน',
    description: 'ดีไซน์กระจกโมเดิร์นพร้อมเอฟเฟกต์เรืองแสงสีส้ม สวยงามและทันสมัย',
    isDefault: true,
    available: true
  },
  minimal: {
    id: 'minimal',
    name: 'ธีมมินิมอล',
    description: 'ดีไซน์เรียบง่าย โหลดเร็ว เน้นประสิทธิภาพการใช้งาน',
    isDefault: false,
    available: true // v0.6.0 - Ready for testing
  },
  liquid: {
    id: 'liquid',
    name: 'ธีมกระจกลิควิด',
    description: 'ดีไซน์ iOS 26 สไตล์ Liquid Glass สีฟ้าเงางาม พร้อมแอนิเมชั่นลื่นไหล 60fps',
    isDefault: false,
    available: true // v0.6.3 - iOS 26 Liquid Glass Theme (Cyan/Blue)
  }
};

/**
 * Default theme identifier
 * @type {string}
 */
export const DEFAULT_THEME = 'glass';

/**
 * Get theme configuration by ID
 * @param {string} id - Theme identifier
 * @returns {Object|null} Theme configuration object or null if not found
 */
export const getThemeById = (id) => {
  return themes[id] || null;
};

/**
 * Get all available themes as an array
 * @returns {Array<Object>} Array of theme configuration objects
 */
export const getAllThemes = () => {
  return Object.values(themes);
};

/**
 * Get only available themes (available: true)
 * @returns {Array<Object>} Array of available theme configuration objects
 */
export const getAvailableThemes = () => {
  return Object.values(themes).filter(theme => theme.available);
};

/**
 * Check if a theme is available for use
 * @param {string} id - Theme identifier
 * @returns {boolean} True if theme is available, false otherwise
 */
export const isThemeAvailable = (id) => {
  return themes[id]?.available || false;
};

/**
 * Check if a theme ID is valid
 * @param {string} id - Theme identifier to validate
 * @returns {boolean} True if theme exists, false otherwise
 */
export const isValidTheme = (id) => {
  return id && themes.hasOwnProperty(id);
};

/**
 * Get theme IDs as an array
 * @returns {Array<string>} Array of theme identifiers
 */
export const getThemeIds = () => {
  return Object.keys(themes);
};
