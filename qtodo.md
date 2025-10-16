# Q-Collector Development TODO

---

# 🚀 PRIORITY: Progressive Image Loading & Performance Optimization v0.8.0

**Role**: CTO - Enterprise Architecture & Performance Engineering
**Priority**: 🔴 **CRITICAL** - Performance & User Experience
**Status**: 🎯 **ARCHITECTURE COMPLETE** → Ready for Implementation
**Timeline**: 2-3 Weeks (Sprint 8-9)
**Date**: 2025-10-16
**User Impact**: EXTREME HIGH - Support 10+ images without performance degradation

---

## 📋 Executive Summary - Business Problem

### Current System Limitations (v0.7.29)

**Critical Performance Issues:**
1. **All images load simultaneously** - No prioritization, 10+ images = 10+ concurrent HTTP requests
2. **Full-resolution images load first** - No progressive loading (low→high quality)
3. **No lazy loading** - All images load even if off-screen
4. **Rapid navigation causes overload** - Users switching pages quickly = duplicate requests + wasted bandwidth
5. **No caching strategy** - Same images re-downloaded on every page switch
6. **Mobile data waste** - Full resolution on 360px screens

**Real-World Impact:**
- **User with 15 images**: 15 × 2MB = 30MB download = 10-15 seconds on 4G
- **Rapid navigation** (3 pages in 5 seconds): 45MB wasted bandwidth
- **Browser memory leak**: Blob URLs not cleaned up = memory grows unbounded
- **Poor mobile UX**: Blank screens, jerky scrolling, battery drain

---

## 🎯 Solution Architecture - Enterprise Progressive Loading System

### Phase 1: Image Thumbnail Generation (Backend - Week 1)

**Objective**: Generate 3 quality levels per image automatically

#### Backend Image Processing Service

**Location**: `backend/services/ImageProcessingService.js`

```javascript
/**
 * Image Processing Service v0.8.0
 * Generates 3 quality levels using Sharp library
 *
 * Quality Levels:
 * 1. Blur Preview (10KB, 20x20px) - Instant display
 * 2. Thumbnail (50-100KB, 400px) - Fast loading
 * 3. Full Resolution (Original) - On-demand
 */

const sharp = require('sharp');
const path = require('path');

class ImageProcessingService {

  /**
   * Generate all 3 quality levels
   * Called automatically during file upload
   */
  async generateImageVariants(originalFilePath, fileId) {
    const variants = {
      blur: null,    // Base64 data URL for inline embedding
      thumbnail: null,  // MinIO path
      full: originalFilePath  // Original file
    };

    try {
      const image = sharp(originalFilePath);
      const metadata = await image.metadata();

      // 1. Blur Preview - Ultra-low quality placeholder (10KB)
      // Used for instant display while higher quality loads
      const blurBuffer = await sharp(originalFilePath)
        .resize(20, 20, {
          fit: 'cover',
          position: 'centre'
        })
        .blur(2)  // Intentional blur for smooth UX
        .jpeg({ quality: 60, progressive: false })
        .toBuffer();

      // Convert to base64 data URL for inline embedding (no HTTP request!)
      variants.blur = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`;

      // 2. Thumbnail - Optimized quality (50-100KB)
      // Used for grid view and detail view before full resolution
      const thumbnailPath = this.getThumbnailPath(fileId);
      await sharp(originalFilePath)
        .resize(400, null, {  // 400px width, maintain aspect ratio
          fit: 'inside',
          withoutEnlargement: true  // Don't upscale small images
        })
        .jpeg({ quality: 80, progressive: true })  // Progressive JPEG
        .toFile(thumbnailPath);

      variants.thumbnail = thumbnailPath;

      // 3. Full Resolution - Original file (no processing)
      // Only loaded on-demand when user clicks "zoom"

      return variants;

    } catch (error) {
      console.error('❌ Image variant generation failed:', error);
      return { blur: null, thumbnail: null, full: originalFilePath };
    }
  }

  getThumbnailPath(fileId) {
    return path.join(process.env.MINIO_TEMP_DIR, `${fileId}_thumb.jpg`);
  }

  /**
   * Upload all variants to MinIO
   * Store paths in database
   */
  async uploadVariantsToMinIO(fileId, variants) {
    const uploadedPaths = {
      blur_data_url: variants.blur,  // Stored as TEXT in DB
      thumbnail_path: null,
      full_path: null
    };

    // Upload thumbnail to MinIO
    if (variants.thumbnail) {
      uploadedPaths.thumbnail_path = await minioService.uploadFile(
        variants.thumbnail,
        `thumbnails/${fileId}_thumb.jpg`
      );
    }

    // Full resolution already in MinIO (original upload)
    uploadedPaths.full_path = variants.full;

    return uploadedPaths;
  }
}

module.exports = new ImageProcessingService();
```

#### Database Schema Update

**Migration**: `backend/migrations/YYYYMMDD-add-image-variants.js`

```sql
-- Add columns to files table for image variants
ALTER TABLE files
ADD COLUMN blur_preview TEXT,           -- Base64 data URL (inline)
ADD COLUMN thumbnail_path VARCHAR(500), -- MinIO path
ADD COLUMN full_path VARCHAR(500);      -- Original MinIO path
```

**Model Update**: `backend/models/File.js`

```javascript
{
  blur_preview: DataTypes.TEXT,        // Base64 inline image
  thumbnail_path: DataTypes.STRING(500),
  full_path: DataTypes.STRING(500)
}
```

---

### Phase 2: Progressive Loading Frontend (Week 1-2)

**Objective**: Load images in 3 stages - Blur → Thumbnail → Full Resolution

#### Updated ImageThumbnail Component

**Location**: `src/components/ui/image-thumbnail.jsx`

```javascript
/**
 * ImageThumbnail v0.8.0 - Progressive Loading
 *
 * Loading Stages:
 * Stage 1 (0ms): Blur preview (base64, 10KB) - INSTANT
 * Stage 2 (200ms): Thumbnail (authenticated blob, 50-100KB) - FAST
 * Stage 3 (on-demand): Full resolution (only when user clicks zoom)
 */

const ImageThumbnail = React.memo(({
  file,
  blobUrl,  // From parent
  className,
  size = 'md',
  showFileName = true,
  onClick,
  onDownload,
  adaptive = false
}) => {
  // 🎯 Progressive Loading State Machine
  const [loadingStage, setLoadingStage] = useState('blur');  // blur → thumbnail → full
  const [thumbnailBlobUrl, setThumbnailBlobUrl] = useState(null);
  const [fullBlobUrl, setFullBlobUrl] = useState(null);
  const [imageOrientation, setImageOrientation] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // 🔥 Stage 1: Blur Preview (Instant - 0ms)
  // Already have base64 data URL from backend → no HTTP request!
  const blurPreviewUrl = file.blur_preview;

  // 🔥 Stage 2: Load Thumbnail (200ms delay for intelligent batching)
  useEffect(() => {
    if (!file.thumbnail_path || thumbnailBlobUrl) return;

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem(API_CONFIG.token.storageKey);
        const thumbnailStreamUrl = getFileStreamURL(file.id, 'thumbnail');

        const response = await fetch(thumbnailStreamUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          setThumbnailBlobUrl(blobUrl);
          setLoadingStage('thumbnail');
        }
      } catch (error) {
        console.error('❌ Thumbnail load failed:', error);
        // Fallback to blur preview (graceful degradation)
      }
    }, 200);  // ✅ 200ms delay allows request batching

    return () => clearTimeout(timer);
  }, [file.id, file.thumbnail_path]);

  // 🔥 Stage 3: Load Full Resolution (Only when modal opens)
  const loadFullResolution = async () => {
    if (fullBlobUrl) return fullBlobUrl;

    try {
      const token = localStorage.getItem(API_CONFIG.token.storageKey);
      const fullStreamUrl = getFileStreamURL(file.id, 'full');

      const response = await fetch(fullStreamUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setFullBlobUrl(blobUrl);
        setLoadingStage('full');
        return blobUrl;
      }
    } catch (error) {
      console.error('❌ Full resolution load failed:', error);
      return thumbnailBlobUrl || blurPreviewUrl;  // Fallback
    }
  };

  // 🎯 Smart Image URL Selection
  const getCurrentImageUrl = (forModal = false) => {
    if (forModal) {
      // Modal: Show best available (full → thumbnail → blur)
      return fullBlobUrl || thumbnailBlobUrl || blurPreviewUrl;
    } else {
      // Thumbnail view: Show thumbnail or blur
      return thumbnailBlobUrl || blurPreviewUrl;
    }
  };

  const handleThumbnailClick = async () => {
    setShowModal(true);
    // ✅ Trigger full resolution load ONLY when modal opens
    if (!fullBlobUrl) {
      await loadFullResolution();
    }
  };

  // ✅ Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (thumbnailBlobUrl) URL.revokeObjectURL(thumbnailBlobUrl);
      if (fullBlobUrl) URL.revokeObjectURL(fullBlobUrl);
    };
  }, []);

  // Rest of component remains same...
  return (
    <>
      {/* Thumbnail Container */}
      <div className="relative">
        <img
          src={getCurrentImageUrl(false)}
          alt={file.name}
          className={cn(
            'rounded-lg object-cover',
            loadingStage === 'blur' && 'blur-sm',  // Visual cue
            'transition-all duration-300'
          )}
          onClick={handleThumbnailClick}
          loading="lazy"  // ✅ Native browser lazy loading
        />

        {/* Loading indicator during thumbnail load */}
        {loadingStage === 'blur' && (
          <div className="absolute bottom-2 right-2 bg-black/50 rounded-full px-2 py-1">
            <div className="text-xs text-white">โหลด...</div>
          </div>
        )}
      </div>

      {/* Modal with Full Resolution */}
      {showModal && (
        <motion.div className="fixed inset-0 z-50 bg-black/95">
          <img
            src={getCurrentImageUrl(true)}
            alt={file.name}
            className="w-full h-full object-contain"
          />

          {/* Loading indicator during full resolution load */}
          {!fullBlobUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/80 rounded-lg p-4">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"/>
                <div className="text-white mt-2">กำลังโหลดภาพคุณภาพสูง...</div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
});
```

---

### Phase 3: Intelligent Request Batching & Debouncing (Week 2)

**Objective**: Prevent request overload during rapid navigation

#### Image Loading Queue Manager

**Location**: `src/services/ImageLoadingQueue.js`

```javascript
/**
 * Image Loading Queue Manager v0.8.0
 *
 * Features:
 * 1. Request batching (group multiple images into single request)
 * 2. Priority queue (visible images load first)
 * 3. Debouncing (cancel pending requests on rapid navigation)
 * 4. Concurrency control (max 3 concurrent requests)
 */

class ImageLoadingQueue {
  constructor() {
    this.queue = [];  // Pending requests
    this.active = new Set();  // Currently loading
    this.maxConcurrent = 3;  // Max parallel requests
    this.navigationTimeout = null;
  }

  /**
   * Add image to loading queue with priority
   */
  enqueue(fileId, priority = 'normal') {
    // Check if already loading or queued
    if (this.active.has(fileId) || this.queue.some(item => item.fileId === fileId)) {
      return;
    }

    const priorities = { critical: 0, high: 1, normal: 2, low: 3 };
    this.queue.push({
      fileId,
      priority: priorities[priority] || 2,
      timestamp: Date.now()
    });

    // Sort by priority (critical first)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.timestamp - b.timestamp;  // FIFO for same priority
    });

    this.processQueue();
  }

  /**
   * Cancel all pending requests (called on navigation)
   */
  cancelPending() {
    console.log(`🚫 Cancelling ${this.queue.length} pending image requests`);
    this.queue = [];

    // Abort active requests
    this.active.forEach(abortController => {
      abortController.abort();
    });
    this.active.clear();
  }

  /**
   * Process queue with concurrency control
   */
  async processQueue() {
    while (this.queue.length > 0 && this.active.size < this.maxConcurrent) {
      const item = this.queue.shift();
      const abortController = new AbortController();
      this.active.add(abortController);

      try {
        await this.loadImage(item.fileId, abortController.signal);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`⏹️ Image load cancelled: ${item.fileId}`);
        } else {
          console.error(`❌ Image load failed: ${item.fileId}`, error);
        }
      } finally {
        this.active.delete(abortController);
        this.processQueue();  // Continue processing
      }
    }
  }

  async loadImage(fileId, signal) {
    const token = localStorage.getItem(API_CONFIG.token.storageKey);
    const url = getFileStreamURL(fileId, 'thumbnail');

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal  // ✅ Abortable request
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Notify parent component
    window.dispatchEvent(new CustomEvent('image-loaded', {
      detail: { fileId, blobUrl }
    }));

    return blobUrl;
  }

  /**
   * Debounce navigation - wait for user to "settle"
   */
  onNavigationStart() {
    clearTimeout(this.navigationTimeout);

    // Cancel immediately if user navigates quickly
    this.cancelPending();

    // Wait 300ms before starting new loads
    this.navigationTimeout = setTimeout(() => {
      console.log('✅ Navigation settled - resuming image loads');
    }, 300);
  }
}

export default new ImageLoadingQueue();
```

#### Integration with SubmissionDetail

**Location**: `src/components/SubmissionDetail.jsx` (lines 430-470)

```javascript
// ✅ ENHANCEMENT v0.8.0: Use Image Loading Queue
useEffect(() => {
  console.log('🔄 Navigation detected, cancelling pending image loads');

  // STEP 1: Cancel all pending image loads
  imageLoadingQueue.onNavigationStart();

  // STEP 2: Clear old images
  setImagesTransitioning(true);
  Object.keys(imageBlobUrlsRef.current).forEach(fileId => {
    const blobUrl = imageBlobUrlsRef.current[fileId];
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  });
  imageBlobUrlsRef.current = {};
  setImageBlobUrls({});
  setImageBlobUrlsVersion(prev => prev + 1);

  // STEP 3: Un-hide after navigation settles
  setTimeout(() => {
    setImagesTransitioning(false);
  }, 100);

}, [submissionId]);

// ✅ Listen for image-loaded events
useEffect(() => {
  const handleImageLoaded = (event) => {
    const { fileId, blobUrl } = event.detail;
    imageBlobUrlsRef.current[fileId] = blobUrl;
    setImageBlobUrls(prev => ({ ...prev, [fileId]: blobUrl }));
  };

  window.addEventListener('image-loaded', handleImageLoaded);
  return () => window.removeEventListener('image-loaded', handleImageLoaded);
}, []);
```

---

### Phase 4: Lazy Loading & Viewport Detection (Week 2)

**Objective**: Only load images that are visible on screen

#### Intersection Observer Implementation

**Location**: `src/components/SubmissionDetail.jsx` (FileFieldDisplay component)

```javascript
const FileFieldDisplay = React.memo(({ field, value, submissionId }) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  // ✅ Intersection Observer - Load only when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, enqueue image loads with priority
          files.forEach(file => {
            imageLoadingQueue.enqueue(file.id, 'high');
          });
          observer.disconnect();  // Load only once
        }
      },
      {
        rootMargin: '50px',  // Start loading 50px before entering viewport
        threshold: 0.1  // Trigger when 10% visible
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [files]);

  return (
    <div ref={containerRef}>
      {isVisible ? (
        // Render images only when visible
        files.map(file => (
          <ImageThumbnail key={file.id} file={file} />
        ))
      ) : (
        // Placeholder while off-screen
        <div className="min-h-[200px] bg-muted/20 rounded-lg">
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">
              ภาพจะโหลดเมื่อเลื่อนมาถึง...
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
```

---

### Phase 5: Memory Management & Cache Strategy (Week 3)

**Objective**: Prevent memory leaks and optimize cache usage

#### Blob URL Cache Manager

**Location**: `src/services/BlobUrlCache.js`

```javascript
/**
 * Blob URL Cache Manager v0.8.0
 *
 * Features:
 * 1. LRU cache (Least Recently Used eviction)
 * 2. Size-based eviction (max 50MB in memory)
 * 3. Automatic cleanup on navigation
 * 4. IndexedDB persistence for offline support
 */

class BlobUrlCache {
  constructor() {
    this.cache = new Map();  // fileId → { blobUrl, size, lastAccess }
    this.maxSize = 50 * 1024 * 1024;  // 50MB
    this.currentSize = 0;
  }

  set(fileId, blobUrl, size) {
    // Evict old entries if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    this.cache.set(fileId, {
      blobUrl,
      size,
      lastAccess: Date.now()
    });

    this.currentSize += size;
    console.log(`📦 Cache: ${fileId} (+${(size/1024).toFixed(1)}KB) | Total: ${(this.currentSize/1024/1024).toFixed(1)}MB`);
  }

  get(fileId) {
    const entry = this.cache.get(fileId);
    if (entry) {
      entry.lastAccess = Date.now();  // Update LRU
      return entry.blobUrl;
    }
    return null;
  }

  evictLRU() {
    let oldest = null;
    let oldestTime = Date.now();

    for (const [fileId, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldest = fileId;
        oldestTime = entry.lastAccess;
      }
    }

    if (oldest) {
      const entry = this.cache.get(oldest);
      URL.revokeObjectURL(entry.blobUrl);
      this.currentSize -= entry.size;
      this.cache.delete(oldest);
      console.log(`🗑️ Evicted: ${oldest} (-${(entry.size/1024).toFixed(1)}KB)`);
    }
  }

  clear() {
    for (const entry of this.cache.values()) {
      URL.revokeObjectURL(entry.blobUrl);
    }
    this.cache.clear();
    this.currentSize = 0;
    console.log('🧹 Cache cleared');
  }
}

export default new BlobUrlCache();
```

---

## 📊 Performance Metrics & Success Criteria

### Before (v0.7.29 - Current System)

**10 Images Scenario:**
- ❌ Initial Load Time: 8-12 seconds (all images load simultaneously)
- ❌ Network Requests: 10 concurrent requests (browser throttles to 6)
- ❌ Bandwidth: 20MB (full resolution × 10)
- ❌ Time to First Image: 2-4 seconds
- ❌ Memory Usage: 50-80MB (no cleanup)
- ❌ Rapid Navigation (3 pages): 30 wasted requests

### After (v0.8.0 - Progressive Loading System)

**10 Images Scenario:**
- ✅ Initial Display: **0ms** (blur previews inline, no HTTP!)
- ✅ First Thumbnail: 200-400ms (batched requests)
- ✅ All Thumbnails: 1-2 seconds (staged loading)
- ✅ Network Requests: 3 concurrent (intelligent batching)
- ✅ Bandwidth: 500KB initial (thumbnails only, 95% reduction!)
- ✅ Full Resolution: On-demand only (user clicks zoom)
- ✅ Memory Usage: <20MB (LRU cache eviction)
- ✅ Rapid Navigation: 0 wasted requests (debouncing + cancellation)

### KPIs

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Time to First Image** | 2-4s | 0ms | **Instant** |
| **Initial Bandwidth** | 20MB | 500KB | **95% reduction** |
| **Page Load Time (10 images)** | 8-12s | 1-2s | **80% faster** |
| **Memory Usage** | 50-80MB | <20MB | **70% reduction** |
| **Wasted Requests (rapid nav)** | 30+ | 0 | **100% eliminated** |
| **Mobile Data Usage** | High | Low | **95% reduction** |

---

## 🧪 Testing Strategy

### Unit Tests

**Location**: `src/services/__tests__/ImageLoadingQueue.test.js`

```javascript
describe('ImageLoadingQueue', () => {
  test('should batch requests with concurrency limit', async () => {
    const queue = new ImageLoadingQueue();

    // Enqueue 10 images
    for (let i = 0; i < 10; i++) {
      queue.enqueue(`file-${i}`, 'normal');
    }

    // Verify only 3 are active
    expect(queue.active.size).toBe(3);
  });

  test('should cancel pending requests on navigation', () => {
    const queue = new ImageLoadingQueue();
    queue.enqueue('file-1', 'normal');
    queue.enqueue('file-2', 'normal');

    queue.onNavigationStart();

    expect(queue.queue.length).toBe(0);
    expect(queue.active.size).toBe(0);
  });

  test('should prioritize critical images', () => {
    const queue = new ImageLoadingQueue();
    queue.enqueue('file-1', 'low');
    queue.enqueue('file-2', 'critical');
    queue.enqueue('file-3', 'normal');

    expect(queue.queue[0].fileId).toBe('file-2');  // Critical first
  });
});
```

### Integration Tests

**Scenario 1**: 15 images in SubmissionDetail
- ✅ Blur previews display instantly (0ms)
- ✅ Thumbnails load in batches (3 concurrent)
- ✅ Full resolution loads only in modal
- ✅ Memory stays under 20MB

**Scenario 2**: Rapid navigation (5 pages in 10 seconds)
- ✅ All pending requests cancelled
- ✅ No duplicate downloads
- ✅ Navigation feels smooth (no lag)

### Performance Testing

**Tools**: Lighthouse, Chrome DevTools Performance Profiler

**Targets**:
- ✅ Largest Contentful Paint (LCP): <1s
- ✅ Total Blocking Time (TBT): <100ms
- ✅ Cumulative Layout Shift (CLS): <0.1

---

## 📝 Files to Create/Modify

### Backend (Sprint 8 - Week 1)

1. ✅ `backend/services/ImageProcessingService.js` (NEW)
2. ✅ `backend/migrations/YYYYMMDD-add-image-variants.js` (NEW)
3. ✅ `backend/models/File.js` (MODIFY - add columns)
4. ✅ `backend/api/routes/file.routes.js` (MODIFY - add /stream/:quality endpoint)
5. ✅ `backend/services/FileService.js` (MODIFY - integrate image processing)

### Frontend (Sprint 8-9 - Week 1-3)

6. ✅ `src/components/ui/image-thumbnail.jsx` (MODIFY - progressive loading)
7. ✅ `src/services/ImageLoadingQueue.js` (NEW)
8. ✅ `src/services/BlobUrlCache.js` (NEW)
9. ✅ `src/components/SubmissionDetail.jsx` (MODIFY - integrate queue + cache)
10. ✅ `src/config/api.config.js` (MODIFY - add getFileStreamURL with quality param)

### Testing

11. ✅ `src/services/__tests__/ImageLoadingQueue.test.js` (NEW)
12. ✅ `src/services/__tests__/BlobUrlCache.test.js` (NEW)
13. ✅ `tests/e2e/progressive-image-loading.spec.js` (NEW - Playwright)

### Documentation

14. ✅ `docs/PROGRESSIVE-LOADING-GUIDE.md` (NEW)
15. ✅ `CLAUDE.md` (UPDATE - add v0.8.0 features)

---

## 🔧 Implementation Phases

### Sprint 8 - Week 1 (Backend Foundation)

**Day 1-2**: Image Processing Service
- Install Sharp library (`npm install sharp`)
- Implement `generateImageVariants()`
- Test with 10 sample images

**Day 3**: Database Migration
- Add columns to files table
- Update File model
- Migrate existing images (background job)

**Day 4-5**: API Endpoints
- Add `/files/:id/stream/:quality` endpoint
- Implement quality parameter (blur/thumbnail/full)
- Test authenticated streaming

**Deliverables**:
- ✅ All uploaded images auto-generate 3 variants
- ✅ API returns correct quality level
- ✅ Backward compatible with old system

---

### Sprint 8 - Week 2 (Frontend Core)

**Day 1-2**: Progressive ImageThumbnail
- Implement 3-stage loading (blur → thumbnail → full)
- Add loading indicators
- Test with 15 images

**Day 3**: Image Loading Queue
- Implement queue manager
- Add concurrency control
- Add navigation debouncing

**Day 4-5**: Integration
- Connect SubmissionDetail to queue
- Add Intersection Observer
- Test rapid navigation

**Deliverables**:
- ✅ Images load progressively (blur → thumbnail)
- ✅ No overload on rapid navigation
- ✅ Visible images load first

---

### Sprint 9 - Week 3 (Optimization & Testing)

**Day 1-2**: Blob URL Cache
- Implement LRU cache
- Add size-based eviction
- Memory profiling

**Day 3**: Performance Testing
- Lighthouse audits
- Load testing with 50+ images
- Mobile data measurement

**Day 4-5**: Polish & Documentation
- Edge case handling
- Error recovery
- User guide + API docs

**Deliverables**:
- ✅ Memory usage <20MB
- ✅ All performance targets met
- ✅ Comprehensive documentation

---

## ✅ Definition of Done

This feature is considered COMPLETE when:

1. ✅ **Backend**: All images auto-generate 3 quality levels on upload
2. ✅ **Frontend**: Images display in 3 stages (blur → thumbnail → full)
3. ✅ **Performance**: 10 images load in <2 seconds (vs 8-12s before)
4. ✅ **Memory**: Usage stays <20MB (vs 50-80MB before)
5. ✅ **Navigation**: Rapid switching causes 0 wasted requests
6. ✅ **Mobile**: 95% bandwidth reduction (thumbnails only)
7. ✅ **Testing**: 90% test coverage + Lighthouse score >90
8. ✅ **Documentation**: User guide + API docs complete

---

## 🎯 Business Impact

**User Experience**:
- ⚡ Instant visual feedback (blur previews at 0ms)
- ⚡ Smooth scrolling (lazy loading)
- ⚡ Fast navigation (no overload)
- ⚡ Mobile-friendly (95% data savings)

**System Performance**:
- 📊 80% faster page loads
- 📊 70% memory reduction
- 📊 100% elimination of wasted requests
- 📊 Infinite scalability (supports 100+ images)

**Cost Savings**:
- 💰 95% bandwidth reduction = lower CDN costs
- 💰 Better UX = higher user retention
- 💰 Reduced server load = lower infrastructure costs

---

**Ready to Implement** 🚀
**Timeline**: 3 Weeks (Sprint 8-9)
**Breaking Changes**: None (backward compatible)
**User Testing Required**: Yes (10+ images scenario)
**Rollback Plan**: Feature flag to revert to v0.7.29 behavior

---

# 🔴 URGENT: Navigation Arrows & Thumbnail Size Issues v0.7.27-dev

**Priority**: 🔴 **HIGH** - Navigation + UX Enhancement
**Status**: 🔍 **ROOT CAUSE ANALYSIS COMPLETE** → Ready for Implementation
**Timeline**: 1-2 Hours
**Date**: 2025-10-13
**User Impact**: HIGH - Cannot navigate between submissions + Portrait images too large

---

## 📋 User Problem Report (Thai)

**Original Report:**
> "ยังพบปัญหาลูกศรเลื่อนซ้ายขวาหายไป ยังเลื่อนซ้ายขวาไม่ได้ และขนาดภาพ thumbnail ทั้งบน pc และ mobile ของภาพแนวตั้งใหญ่เกินไป ให้ลดขนาดลง 50% วิเคราะห์ ตรวจหาวิธีแก้ไขที่ดีที่สุด ให้ครบถ้วน อ่านโครงสร้างไฟล์ที่เกี่ยวข้องทั้งหมดให้ดี วางแผนให้สมบูรณ์ แล้วเขียน @qtodo.md อย่างละเอียด ก่อนดำเนินการแก้ไข"

**English Translation:**
1. **Navigation Arrows Disappeared**: Cannot see or use left/right navigation arrows
2. **Portrait Thumbnails Too Large**: Images in portrait orientation are too big on both PC and mobile - need 50% size reduction

---

## 🔍 Root Cause Analysis - COMPLETE ✅

### Issue #1: Navigation Arrows Not Visible (CRITICAL)

**Investigation Timeline:**
- ✅ Checked FixedNavigationButtons component (lines 35-159)
- ✅ Verified component is called at line 1872-1878
- ✅ Found debug logging at lines 62-71
- ✅ Found desktop-only visibility: `hidden lg:flex` (lines 85, 125)

**KEY FINDING - The Problem:**
```javascript
// Lines 85, 125: Desktop-only visibility
className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 ..."
```

**What `hidden lg:flex` means:**
- `hidden` = Hidden on ALL screen sizes by default
- `lg:flex` = Only show on `lg` breakpoint and above (1024px+)
- **Result**: Arrows ONLY visible on screens ≥ 1024px wide

**Why This Is Wrong:**
- Tailwind `lg:` breakpoint = 1024px minimum
- Most laptops are 1366px - 1920px wide (arrows SHOULD work)
- User reported arrows "disappeared" → likely testing on laptop (should be visible)
- **Possible Causes:**
  1. Screen resolution < 1024px (unlikely for desktop testing)
  2. Browser zoom level affecting breakpoint detection
  3. CSS specificity issue with `hidden` overriding `lg:flex`
  4. Window width calculation not matching actual viewport

**Mobile Navigation (Lines 1791-1820):**
- ✅ Mobile arrows exist (inline, not portal)
- ✅ Uses `lg:hidden` (hidden on desktop, visible on mobile)
- ✅ Working correctly

**Root Cause Summary:**
The desktop navigation buttons (FixedNavigationButtons) rely on `lg:flex` which requires viewport width ≥ 1024px. User may be:
- Testing on window < 1024px
- Having browser zoom affecting breakpoint
- Experiencing CSS conflict with `hidden` utility

---

### Issue #2: Portrait Thumbnail Size Too Large (HIGH PRIORITY)

**Investigation Timeline:**
- ✅ Read image-thumbnail.jsx (lines 1-200)
- ✅ Found adaptive sizing logic (lines 210-226)
- ✅ Confirmed adaptive={true} in SubmissionDetail.jsx (line 960)
- ✅ Identified portrait sizing: `w-[15vw] md:w-[30vw]`

**Current Portrait Sizing:**
```javascript
// image-thumbnail.jsx Lines 216
imageOrientation === 'portrait' ? [
  'w-[15vw] md:w-[30vw]',  // ← CURRENT
  'max-h-[70vh]',
  'h-auto'
]
```

**Size Breakdown:**
| Screen Size | Current Width | User Wants (50% reduction) | Difference |
|-------------|---------------|---------------------------|------------|
| **Mobile** (<768px) | 15vw (~54px on 360px screen) | 7.5vw (~27px) | -50% |
| **Desktop** (≥768px) | 30vw (~432px on 1440px screen) | 15vw (~216px) | -50% |

**Why 50% Reduction:**
- User explicitly requested: "ให้ลดขนาดลง 50%"
- Portrait images take up too much horizontal space
- Makes layout cramped and harder to read field labels
- Desktop especially needs reduction (30vw = 1/3 of screen width!)

**Root Cause:**
Portrait images use `w-[15vw] md:w-[30vw]` which is too large for portrait orientation. Should be reduced to `w-[7.5vw] md:w-[15vw]` (50% reduction as requested).

---

## 🎯 Fix Strategy - COMPLETE PLAN

### Fix 1: Improve Navigation Button Visibility (30 minutes)

**File**: `src/components/SubmissionDetail.jsx` (Lines 85, 125)

**Problem**: `hidden lg:flex` may not work reliably across all desktop screen sizes

**Solution**: Change breakpoint from `lg:` (1024px) to `md:` (768px) for wider compatibility

**Before**:
```javascript
// Lines 85, 125
className="hidden lg:flex fixed left-6 ..."
```

**After**:
```javascript
// ✅ FIX v0.7.27: Change to md: breakpoint (768px) for better compatibility
className="hidden md:flex fixed left-6 ..."
```

**Why This Works:**
- `md:` breakpoint = 768px (tablets and up)
- Covers more devices (tablets + laptops + desktops)
- User testing on laptop (likely 1366px+) will see arrows
- Mobile still uses inline arrows (lg:hidden → md:hidden)

**Update Mobile Arrows Too:**
```javascript
// Lines 1791, 1809 - Update mobile arrow visibility
// Before: className="lg:hidden ..."
// After: className="md:hidden ..."
```

**Benefits:**
- ✅ Arrows visible on tablets (768px+) and desktops
- ✅ More reliable than lg: breakpoint
- ✅ Consistent with mobile arrow hiding (md:hidden)

---

### Fix 2: Reduce Portrait Thumbnail Size by 50% (15 minutes)

**File**: `src/components/ui/image-thumbnail.jsx` (Line 216)

**Problem**: Portrait images use `w-[15vw] md:w-[30vw]` which is too large

**Solution**: Reduce to `w-[7.5vw] md:w-[15vw]` (exactly 50% as requested)

**Before**:
```javascript
// Line 216
imageOrientation === 'portrait' ? [
  'w-[15vw] md:w-[30vw]',  // ❌ Too large!
  'max-h-[70vh]',
  'h-auto'
]
```

**After**:
```javascript
// ✅ FIX v0.7.27: Reduce portrait thumbnail size by 50%
imageOrientation === 'portrait' ? [
  'w-[7.5vw] md:w-[15vw]',  // ✅ 50% smaller
  'max-h-[70vh]',
  'h-auto'
]
```

**Size Comparison:**

| Screen Width | Before (Mobile) | After (Mobile) | Before (Desktop) | After (Desktop) |
|--------------|-----------------|----------------|------------------|-----------------|
| 360px (small phone) | 54px (15%) | 27px (7.5%) | N/A | N/A |
| 768px (tablet) | 115px (15%) | 58px (7.5%) | 230px (30%) | 115px (15%) |
| 1440px (laptop) | N/A | N/A | 432px (30%) | 216px (15%) |

**Why This Works:**
- Exactly 50% reduction as user requested
- Mobile: 15vw → 7.5vw (half)
- Desktop: 30vw → 15vw (half)
- Portrait images now match landscape proportions better
- More space for field labels and content

**Note**: Landscape images unchanged (still use `w-full aspect-video`)

---

## 🧪 Testing Checklist

### Test Case 1: Navigation Arrows Visible on Desktop ✅
**Steps**:
1. Open SubmissionDetail on laptop/desktop (screen ≥ 768px)
2. View a form with multiple submissions
3. **VERIFY**: Left/right navigation arrows appear on screen edges
4. **VERIFY**: Arrows are clickable and functional
5. **VERIFY**: Arrows have hover animations (glow, scale)

**Expected**:
- ✅ Arrows visible on screens ≥ 768px
- ✅ Arrows work for navigation
- ✅ Smooth animations on hover

---

### Test Case 2: Mobile Arrows Still Work ✅
**Steps**:
1. Open SubmissionDetail on mobile device (<768px)
2. View a form with multiple submissions
3. **VERIFY**: Desktop portal arrows hidden (md:hidden works)
4. **VERIFY**: Mobile inline arrows visible inside card
5. **VERIFY**: Swipe gestures still work

**Expected**:
- ✅ No desktop arrows on mobile
- ✅ Mobile arrows visible
- ✅ Swipe navigation works

---

### Test Case 3: Portrait Thumbnail Size Reduced ✅
**Steps**:
1. Open SubmissionDetail with portrait image field
2. View on mobile (360px screen)
3. Measure image width → should be ~27px (7.5vw)
4. View on desktop (1440px screen)
5. Measure image width → should be ~216px (15vw)

**Expected**:
- ✅ Mobile: ~27px width (7.5% of viewport)
- ✅ Desktop: ~216px width (15% of viewport)
- ✅ Images 50% smaller than before

---

### Test Case 4: Landscape Thumbnails Unchanged ✅
**Steps**:
1. View landscape image in SubmissionDetail
2. **VERIFY**: Image uses full width (w-full)
3. **VERIFY**: Maintains 16:9 aspect ratio
4. **VERIFY**: max-h-[60vh] constraint works

**Expected**:
- ✅ Landscape images unaffected
- ✅ Still use full width
- ✅ Proper aspect ratio

---

## 📊 Success Metrics

### Before Fix (Current State)
- ❌ Navigation arrows not visible (hidden lg:flex requires ≥1024px)
- ❌ Portrait thumbnails too large (15vw mobile, 30vw desktop)
- ❌ Layout cramped with large portrait images
- ❌ User cannot navigate between submissions easily

### After Fix (Target State)
- ✅ Navigation arrows visible on tablets+ (md: ≥768px)
- ✅ Portrait thumbnails 50% smaller (7.5vw mobile, 15vw desktop)
- ✅ More space for field labels and content
- ✅ Easy navigation between submissions

### Technical KPIs
- ✅ Arrows visible on screens ≥768px (not just ≥1024px)
- ✅ Portrait images exactly 50% smaller as requested
- ✅ No breaking changes to landscape images
- ✅ Mobile navigation unchanged (still works)

---

## 📝 Files to Modify

### File 1: `src/components/SubmissionDetail.jsx`
**Lines to Modify**: 85, 125, 1791, 1809
**Changes**:
- Change `hidden lg:flex` → `hidden md:flex` (desktop arrows)
- Change `lg:hidden` → `md:hidden` (mobile arrows)

**Lines Changed**: 4 lines total

---

### File 2: `src/components/ui/image-thumbnail.jsx`
**Lines to Modify**: 216
**Changes**:
- Change `'w-[15vw] md:w-[30vw]'` → `'w-[7.5vw] md:w-[15vw]'`

**Lines Changed**: 1 line total

---

## 🔧 Code Diff Preview

### Change 1: Navigation Breakpoint
**Before**:
```javascript
// Lines 85, 125
className="hidden lg:flex fixed left-6 ..."  // ❌ 1024px minimum
```

**After**:
```javascript
// ✅ FIX v0.7.27: Change to md: breakpoint for wider compatibility
className="hidden md:flex fixed left-6 ..."  // ✅ 768px minimum
```

---

### Change 2: Portrait Thumbnail Size
**Before**:
```javascript
// Line 216
'w-[15vw] md:w-[30vw]',  // ❌ Too large
```

**After**:
```javascript
// ✅ FIX v0.7.27: Reduce portrait size by 50%
'w-[7.5vw] md:w-[15vw]',  // ✅ 50% smaller
```

---

## ✅ Definition of Done

This issue is considered FIXED when:

1. ✅ **Navigation Arrows Visible**: Desktop arrows appear on screens ≥768px (tablets+)
2. ✅ **Arrows Functional**: Left/right navigation works smoothly
3. ✅ **Mobile Unchanged**: Mobile inline arrows still work
4. ✅ **Portrait Size Reduced**: Portrait images exactly 50% smaller
5. ✅ **Landscape Unchanged**: Landscape images unaffected
6. ✅ **No Regressions**: All existing features work
7. ✅ **User Confirmed**: User tests and confirms both issues resolved

---

**Ready to Implement** 🚀
**Estimated Time**: 45 minutes total
**Breaking Changes**: None
**User Testing Required**: Yes (confirm arrows visible + size acceptable)

---

# 🚨 CRITICAL: FormSubmissionList Flickering v0.7.11-dev

**Priority**: 🔴 CRITICAL
**Status**: Ready for Implementation
**Timeline**: 1-2 Hours
**User Impact**: HIGH - Table flickers, API hanging

## Problems

1. **Infinite useEffect Loop** - `toast` dependency causes infinite re-renders
2. **Full-Screen Loading** - Blank screen causes flicker
3. **Loading Check** - Table appears/disappears rapidly

## Root Causes

**File**: `src/components/FormSubmissionList.jsx`

- **Line 116**: `}, [formId, toast]);` - `toast` recreated every render
- **Lines 776-794**: Full-screen loading page returns `null`
- **Line 864**: `{loading ? null : ...}` - Hides table during loading

## Fixes

### Fix 1: Remove toast from dependencies (Line 116)
```javascript
// Before: }, [formId, toast]);
// After: }, [formId]);
```

### Fix 2: Remove loading page (Lines 776-794)
```javascript
// Keep error state only when !loading
if (!form && !loading) {
  return <ErrorState />;
}
return null; // Still loading
```

### Fix 3: Fix table conditional (Line 864)
```javascript
// Before: {loading ? null : filteredSubmissions.length > 0 ? ...
// After: {!loading && filteredSubmissions.length > 0 ? ...
```

## Testing

1. ✅ Single API call per page load
2. ✅ No screen flicker
3. ✅ Table stays visible
4. ✅ Clean console

---

# 🚨 CRITICAL: Thumbnail Disappearing v0.7.10-dev

**Priority**: 🔴 CRITICAL
**Status**: Ready for Implementation
**Timeline**: 2-3 Hours

## Problems

1. **Thumbnails disappear** when clicked
2. **Container collapses** - fields shift up
3. **No mobile toast** for downloads

## Root Causes

**File**: `src/components/SubmissionDetail.jsx`

- **Lines 650-701**: `}, [files, field.title]);` - Re-runs on array reference change
- **Lines 709-713**: No `min-height` - container collapses
- **No toast implementation** for mobile

## Fixes

### Fix 1: Stable blob URL dependency
```javascript
const fileIds = files ? files.map(f => f.id).join(',') : '';
useEffect(() => {
  // Only load if don't have blob URL
  if (file.isImage && !imageBlobUrls[file.id]) {
    // Load blob URL
  }
}, [fileIds]); // Only file IDs
```

### Fix 2: Add min-height
```javascript
<div className={cn(
  'w-full border rounded-lg p-4',
  'min-h-[200px]' // Prevents collapse
)}>
```

### Fix 3: Mobile toast
```javascript
const handleFileDownload = async (file) => {
  if (window.innerWidth < 768) {
    toast.loading('กำลังเตรียมดาวน์โหลด...', { id: file.id });
  }
  // Download logic...
  if (window.innerWidth < 768) {
    toast.success('ดาวน์โหลดสำเร็จ!', { id: file.id });
  }
};
```

## Testing

1. ✅ Thumbnails never disappear
2. ✅ Container height stable (200px min)
3. ✅ Fields don't shift
4. ✅ Mobile toast works

---

# 🏗️ Dynamic Field Migration System v0.8.0

**Status**: Sprint 1-6 Complete (75%)
**Timeline**: 10 Weeks total
**Progress**: Development sprints finished

## Completed Sprints

- ✅ Sprint 1: Database Schema (2 tables, 2 models)
- ✅ Sprint 2: Migration Service (7 methods, 90% coverage)
- ✅ Sprint 3: FormService Integration (95%)
- ✅ Sprint 4: REST API (8 endpoints, 92% coverage)
- ✅ Sprint 5: Frontend UI (preview, status, non-breaking)
- ✅ Sprint 6: Scripts & Utilities (5 scripts ready)

## Latest v0.7.6-dev

- ✅ File display fix (UUID serialization bug)
- ✅ Database cleanup (clear-all-test-data.js)
- ✅ Modal opacity (95%)
- ✅ Smart token redirect

## Next: Sprint 7 (Testing & QA)

---

**Last Updated**: 2025-10-16
**Version**: v0.8.0-progressive-loading-plan
