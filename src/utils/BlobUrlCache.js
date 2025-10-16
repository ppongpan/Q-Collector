/**
 * Blob URL Cache with LRU Eviction
 * Manages blob URLs with automatic cleanup to prevent memory leaks
 *
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - Size-based eviction (max 50MB)
 * - Automatic cleanup on eviction
 * - Access tracking for usage statistics
 *
 * Part of Progressive Image Loading System v0.7.30
 */

class BlobUrlCache {
  constructor(maxSizeBytes = 50 * 1024 * 1024) { // 50MB default
    this.cache = new Map(); // fileId -> { blobUrl, size, lastAccessed }
    this.maxSize = maxSizeBytes;
    this.currentSize = 0;
  }

  /**
   * Set blob URL in cache
   * @param {string} fileId - File UUID
   * @param {string} blobUrl - Blob URL
   * @param {number} size - File size in bytes
   */
  set(fileId, blobUrl, size) {
    // If already exists, revoke old URL first
    if (this.cache.has(fileId)) {
      const existing = this.cache.get(fileId);
      URL.revokeObjectURL(existing.blobUrl);
      this.currentSize -= existing.size;
    }

    // Add to cache
    this.cache.set(fileId, {
      blobUrl,
      size,
      lastAccessed: Date.now()
    });
    this.currentSize += size;

    console.log(`💾 [BlobUrlCache] Cached ${fileId.substring(0, 8)}: ${Math.round(size / 1024)}KB (total: ${Math.round(this.currentSize / 1024 / 1024)}MB / ${Math.round(this.maxSize / 1024 / 1024)}MB)`);

    // Evict if over limit
    this.evictIfNeeded();
  }

  /**
   * Get blob URL from cache
   * @param {string} fileId - File UUID
   * @returns {string|null} - Blob URL or null if not found
   */
  get(fileId) {
    const entry = this.cache.get(fileId);
    if (!entry) return null;

    // Update last accessed time
    entry.lastAccessed = Date.now();
    return entry.blobUrl;
  }

  /**
   * Check if file is in cache
   * @param {string} fileId - File UUID
   * @returns {boolean}
   */
  has(fileId) {
    return this.cache.has(fileId);
  }

  /**
   * Remove blob URL from cache
   * @param {string} fileId - File UUID
   */
  remove(fileId) {
    const entry = this.cache.get(fileId);
    if (entry) {
      URL.revokeObjectURL(entry.blobUrl);
      this.currentSize -= entry.size;
      this.cache.delete(fileId);
      console.log(`🗑️  [BlobUrlCache] Removed ${fileId.substring(0, 8)}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    console.log(`🧹 [BlobUrlCache] Clearing cache (${this.cache.size} entries, ${Math.round(this.currentSize / 1024 / 1024)}MB)`);

    // Revoke all blob URLs
    this.cache.forEach((entry, fileId) => {
      URL.revokeObjectURL(entry.blobUrl);
    });

    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Evict least recently used entries if over size limit
   */
  evictIfNeeded() {
    if (this.currentSize <= this.maxSize) return;

    console.log(`⚠️  [BlobUrlCache] Cache size exceeded (${Math.round(this.currentSize / 1024 / 1024)}MB > ${Math.round(this.maxSize / 1024 / 1024)}MB), evicting LRU entries...`);

    // Sort by last accessed (oldest first)
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      return a[1].lastAccessed - b[1].lastAccessed;
    });

    // Evict oldest entries until under limit
    let evicted = 0;
    for (const [fileId, entry] of entries) {
      if (this.currentSize <= this.maxSize * 0.8) break; // Target 80% of max

      URL.revokeObjectURL(entry.blobUrl);
      this.cache.delete(fileId);
      this.currentSize -= entry.size;
      evicted++;

      console.log(`   Evicted: ${fileId.substring(0, 8)} (${Math.round(entry.size / 1024)}KB, last used ${Math.round((Date.now() - entry.lastAccessed) / 1000)}s ago)`);
    }

    console.log(`✅ [BlobUrlCache] Evicted ${evicted} entries, new size: ${Math.round(this.currentSize / 1024 / 1024)}MB`);
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());

    return {
      entryCount: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.currentSize / this.maxSize) * 100),
      averageSize: entries.length > 0 ? Math.round(this.currentSize / entries.length) : 0,
      oldestEntry: entries.length > 0
        ? Math.round((now - Math.min(...entries.map(e => e.lastAccessed))) / 1000)
        : 0,
      newestEntry: entries.length > 0
        ? Math.round((now - Math.max(...entries.map(e => e.lastAccessed))) / 1000)
        : 0
    };
  }

  /**
   * Print cache status to console
   */
  printStatus() {
    const stats = this.getStats();
    console.log('📊 [BlobUrlCache] Status:');
    console.log(`   Entries: ${stats.entryCount}`);
    console.log(`   Size: ${Math.round(stats.currentSize / 1024 / 1024)}MB / ${Math.round(stats.maxSize / 1024 / 1024)}MB (${stats.utilizationPercent}%)`);
    console.log(`   Average size: ${Math.round(stats.averageSize / 1024)}KB`);
    console.log(`   Age range: ${stats.newestEntry}s - ${stats.oldestEntry}s`);
  }
}

// Export singleton instance
export default new BlobUrlCache();
