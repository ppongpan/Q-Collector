/**
 * Image Loading Queue Service
 * Manages image loading with priority queue, batching, and request cancellation
 *
 * Features:
 * - Priority queue (visible images first)
 * - Concurrency control (max 3 concurrent requests)
 * - Request debouncing (cancel pending on navigation)
 * - AbortController for cancellable requests
 *
 * Part of Progressive Image Loading System v0.7.30
 */

class ImageLoadingQueue {
  constructor() {
    this.queue = [];
    this.active = new Map(); // fileId -> AbortController
    this.maxConcurrent = 3;
    this.processing = false;
  }

  /**
   * Add image to loading queue
   * @param {string} fileId - File UUID
   * @param {Function} loadFn - Function to load the image (receives AbortSignal)
   * @param {string} priority - 'high' | 'normal' | 'low'
   */
  enqueue(fileId, loadFn, priority = 'normal') {
    // Don't add duplicates
    const existing = this.queue.find(item => item.fileId === fileId);
    if (existing) {
      // Update priority if higher
      if (this.getPriorityValue(priority) > this.getPriorityValue(existing.priority)) {
        existing.priority = priority;
        this.sortQueue();
      }
      return;
    }

    // Add to queue
    this.queue.push({
      fileId,
      loadFn,
      priority,
      timestamp: Date.now()
    });

    // Sort by priority
    this.sortQueue();

    // Start processing
    this.processQueue();
  }

  /**
   * Cancel all pending requests (on navigation)
   */
  cancelAll() {
    console.log('🛑 [ImageLoadingQueue] Cancelling all pending requests');

    // Clear queue
    this.queue = [];

    // Abort all active requests
    this.active.forEach((controller, fileId) => {
      console.log(`   Aborting request for file: ${fileId.substring(0, 8)}`);
      controller.abort();
    });
    this.active.clear();

    this.processing = false;
  }

  /**
   * Cancel specific file loading
   * @param {string} fileId - File UUID
   */
  cancel(fileId) {
    // Remove from queue
    this.queue = this.queue.filter(item => item.fileId !== fileId);

    // Abort if active
    const controller = this.active.get(fileId);
    if (controller) {
      controller.abort();
      this.active.delete(fileId);
    }
  }

  /**
   * Process the queue (internal)
   */
  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.active.size < this.maxConcurrent) {
      const item = this.queue.shift();

      // Create AbortController for this request
      const controller = new AbortController();
      this.active.set(item.fileId, controller);

      // Execute load function
      (async () => {
        try {
          await item.loadFn(controller.signal);
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log(`⏹️  [ImageLoadingQueue] Request aborted: ${item.fileId.substring(0, 8)}`);
          } else {
            console.error(`❌ [ImageLoadingQueue] Load failed: ${item.fileId.substring(0, 8)}`, error);
          }
        } finally {
          this.active.delete(item.fileId);
          // Continue processing queue
          this.processQueue();
        }
      })();
    }

    if (this.queue.length === 0 && this.active.size === 0) {
      this.processing = false;
    }
  }

  /**
   * Sort queue by priority
   */
  sortQueue() {
    this.queue.sort((a, b) => {
      const priorityDiff = this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      // If same priority, older requests first
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Get numeric value for priority
   * @param {string} priority - Priority level
   * @returns {number} - Numeric value
   */
  getPriorityValue(priority) {
    const values = {
      'high': 3,
      'normal': 2,
      'low': 1
    };
    return values[priority] || 2;
  }

  /**
   * Get queue status for debugging
   * @returns {Object} - Status info
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeCount: this.active.size,
      processing: this.processing,
      queuedFiles: this.queue.map(item => ({
        fileId: item.fileId.substring(0, 8),
        priority: item.priority,
        age: Date.now() - item.timestamp
      })),
      activeFiles: Array.from(this.active.keys()).map(id => id.substring(0, 8))
    };
  }
}

// Export singleton instance
export default new ImageLoadingQueue();
