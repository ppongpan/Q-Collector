/**
 * Image Thumbnail Component with Modal View
 * รองรับ responsive design และ modal สำหรับดูรูปเต็มขนาด
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import fileServiceAPI from '../../services/FileService.api';
import API_CONFIG, { getFileStreamURL } from '../../config/api.config';

// ✅ FIX v0.7.17: Wrap entire component with React.memo to prevent unnecessary re-renders
const ImageThumbnail = React.memo(({
  file,
  blobUrl,  // ✅ NEW: รับ authenticated blob URL จาก parent (optional)
  className,
  size = 'md',
  showFileName = true,
  onClick,
  onDownload,  // ✅ FIX v0.7.12: Accept onDownload prop from parent for mobile toast support
  adaptive = false  // ✅ FIX v0.7.23: Enable adaptive sizing based on image orientation
}) => {
  // ✅ CRITICAL FIX: ถ้ามี blobUrl แล้ว ให้ถือว่าโหลดเสร็จ (ป้องกันการกระพริบ)
  const [imageLoaded, setImageLoaded] = useState(!!blobUrl);
  const [imageError, setImageError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // ✅ NEW: Track download state
  const [imageOrientation, setImageOrientation] = useState(null); // ✅ FIX v0.7.24: null until detected (prevents default landscape)

  // Size variants with better mobile responsiveness
  // ✅ MOBILE FIX: Increased base sizes by 40% for better visibility on small screens
  const sizeClasses = {
    sm: 'w-20 h-20 sm:w-24 sm:h-24',                    // 80px → 96px mobile (+40%)
    md: 'w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36',   // 112px → 128px → 144px (+40%)
    lg: 'w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40',   // 128px → 144px → 160px (+40%)
    xl: 'w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44'    // 144px → 160px → 176px (+40%)
  };

  const handleThumbnailClick = () => {
    if (onClick) {
      onClick(file);
    } else {
      // ✅ MOBILE FIX: บน mobile กดที่ thumbnail ไม่ทำอะไร (ป้องกันการกระพริบ)
      // ให้กดที่ชื่อไฟล์แทน เพื่อ download
      const isMobile = window.innerWidth < 768; // md breakpoint
      if (isMobile) {
        // Do nothing on mobile - let user click on filename instead
        return;
      } else {
        // Desktop: open modal
        setShowModal(true);
      }
    }
  };

  const handleDownload = async (e) => {
    // ✅ CRITICAL FIX: ต้อง stop event ทุกกรณี เพื่อป้องกัน navigation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // ✅ FIX v0.7.12: Use parent's onDownload if provided (has mobile toast support)
    if (onDownload) {
      console.log('📥 Using parent download handler with toast support');
      return onDownload(file);
    }

    console.log('📥 ImageThumbnail download clicked:', file);

    if (!file || !file.id) {
      console.error('❌ Invalid file object for download (no file ID):', file);
      return;
    }

    // ✅ NEW: Set downloading state to show loading overlay
    setIsDownloading(true);

    try {
      // ✅ FIX V3: Use authenticated fetch + blob download
      const downloadUrl = `${API_CONFIG.baseURL}/files/${file.id}/download`;
      console.log('📥 Fetching file from:', downloadUrl);

      // Get auth token
      const token = localStorage.getItem('q-collector-auth-token');

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Get blob and create download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name || 'download';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      window.URL.revokeObjectURL(blobUrl);

      console.log('✅ Download complete:', file.name);
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('ไม่สามารถดาวน์โหลดไฟล์ได้: ' + error.message);
    } finally {
      // ✅ NEW: Clear downloading state after download completes or fails
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ✅ FIX v0.7.17: Define ImageContent as stable component (no local state, no useMemo)
  // All state is managed at parent level to prevent re-creation
  const ImageContent = ({ isModal = false }) => {
    // ✅ MOBILE FIX: Use authenticated blob URL if provided (best for mobile)
    // Priority: blobUrl (authenticated) > presignedUrl (may fail) > API stream (fallback)
    const imageUrl = blobUrl || file.presignedUrl || getFileStreamURL(file.id);

    // ✅ CRITICAL FIX: แสดง placeholder icon แทน error overlay
    if (!imageUrl || imageError) {
      return (
        <div className="w-full h-full bg-muted/20 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }

    return (
      <>
        {/* ✅ CRITICAL FIX: ถ้ามี blobUrl แล้ว ไม่ต้องแสดง loading spinner เลย */}
        {/* Loading spinner จะแสดงเฉพาะเมื่อ: 1) อยู่ใน modal, 2) ยังโหลดไม่เสร็จ, 3) ไม่มี blobUrl */}
        {isModal && !blobUrl && !imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sm text-white/80">กำลังโหลดภาพ...</div>
            </div>
          </div>
        )}
        <img
          src={imageUrl}
          alt={file.name}
          className={cn(
            'rounded-lg',
            // ✅ FIX v0.7.29-v7: Remove w-full h-full to prevent expansion
            // Let parent container size dictate image display
            (isModal || adaptive) ? 'object-contain' : 'object-cover w-full h-full',
            // ✅ FIX v0.7.17: Always show image (no opacity transitions that cause flicker)
            'opacity-100'
          )}
          onLoad={(e) => {
            setImageLoaded(true);
            // ✅ FIX v0.7.23: Detect image orientation for modal OR adaptive mode
            if (isModal || adaptive) {
              const img = e.target;
              const aspectRatio = img.naturalWidth / img.naturalHeight;
              // 16:9 = 1.78, if < 1 = portrait, if >= 1 = landscape
              setImageOrientation(aspectRatio < 1 ? 'portrait' : 'landscape');
            }
          }}
          onError={() => {
            setImageError(true);
          }}
          loading="lazy"
        />
      </>
    );
  };

  return (
    <>
      {/* Thumbnail Container - Balanced layout with proper spacing */}
      {/* ✅ FIX v0.7.29-v5: Remove w-full to prevent expansion on desktop */}
      <div className={cn(
        'group relative flex flex-col items-center md:flex-row md:items-start',
        'gap-2 md:gap-4',  // เพิ่ม gap บน desktop เป็น 16px
        'p-2 md:p-3',  // เพิ่ม padding เพื่อให้ดูสมดุล
        'rounded-lg md:bg-muted/5',  // พื้นหลังเบา ๆ บน desktop
        // ✅ FIX v0.7.29-v5: No w-full, let image size dictate container width
        'max-w-fit',  // Always fit-content to prevent expansion
        className
      )}>
        <div
          className={cn(
            'relative overflow-hidden rounded-lg border-2 border-border/40 bg-background/50',
            'md:cursor-pointer flex-shrink-0',  // ✅ FIX v0.7.29-v9: cursor-pointer only on desktop
            // ✅ FIX v0.7.12: MOBILE - No hover effects (user request: no effects on mobile)
            // Desktop only: hover effects
            'md:hover:border-primary/50 md:hover:shadow-lg md:hover:shadow-primary/10',
            'md:transition-all md:duration-300 md:hover:scale-105',
            // ✅ FIX v0.7.29-v6: Fixed sizing at 390px/240px for all screen sizes
            // No viewport-based sizing to prevent expansion
            adaptive ? (
              imageOrientation === 'landscape' ? [
                'w-[390px]',  // ✅ Fixed 390px for all screens (no expansion)
                'aspect-video',  // 16:9 ratio
                'max-h-[60vh]'  // Prevent overflow
              ] : imageOrientation === 'portrait' ? [
                'w-[240px]',  // ✅ Fixed 240px for all screens (compact portrait)
                'max-h-[35vh]',
                'h-auto'
              ] : [
                // Default to portrait size until orientation detected
                'w-[240px]',  // ✅ Fixed 240px for all screens
                'max-h-[35vh]',
                'h-auto'
              ]
            ) : sizeClasses[size]  // Use fixed size when adaptive=false
          )}
          onClick={handleThumbnailClick}
        >
          {/* ✅ FIX v0.7.12: NO Loading Skeleton on mobile (user request: images must display at all times) */}
          {/* Loading Skeleton - Desktop only, not on mobile */}
          {!blobUrl && !imageLoaded && !imageError && (
            <div className="hidden md:flex absolute inset-0 bg-muted/40 animate-pulse rounded-lg items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Image */}
          <ImageContent />

          {/* ✅ CRITICAL FIX: ลบ Error State overlay ที่ซ้อนทับภาพ */}
          {/* Error handling is now done inside ImageContent with fallback icon */}

          {/* ✅ NEW: Loading Overlay - Show when downloading */}
          {isDownloading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs sm:text-sm text-white font-medium px-3 py-1 bg-black/40 rounded-full">
                  กำลังโหลดไฟล์...
                </div>
              </div>
            </div>
          )}

          {/* ✅ FIX v0.7.12: Action Buttons - Desktop only (user request: no effects on mobile) */}
          {/* Mobile: No overlay buttons - user clicks filename to download */}
          {/* Desktop: Show buttons on hover */}
          <div className={cn(
            "hidden md:flex absolute inset-0 rounded-lg items-center justify-center transition-all duration-300",
            "pointer-events-none",  // ✅ ทำให้ div นี้กดไม่ได้ แต่ปุ่มข้างในกดได้
            "opacity-0",
            // Desktop: แสดงเมื่อ hover
            "md:group-hover:bg-black/40 md:group-hover:opacity-100"
          )}>
            <div className="flex items-center gap-3 pointer-events-auto">
              {/* ✅ FIX v0.7.22: Preview Button - Enlarged icon with brighter colors */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowModal(true);
                }}
                className={cn(
                  "rounded-full transition-all duration-300",
                  "bg-orange-500/80 hover:bg-orange-500",
                  "hover:scale-110",  // Scale up 110% on hover
                  "p-3",  // Increased padding from p-2 to p-3
                  "active:scale-95",  // Touch feedback
                  "shadow-lg hover:shadow-orange-500/50"  // Glow effect
                )}
                title="ดูรูปเต็มขนาด"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              {/* ✅ FIX v0.7.22: Download Button - Enlarged icon with brighter colors */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDownload(e);
                }}
                className={cn(
                  "rounded-full transition-all duration-300",
                  "bg-blue-500/80 hover:bg-blue-500",
                  "hover:scale-110",  // Scale up 110% on hover
                  "p-3",  // Increased padding from p-2 to p-3
                  "active:scale-95",  // Touch feedback
                  "shadow-lg hover:shadow-blue-500/50"  // Glow effect
                )}
                title="ดาวน์โหลด"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* File Info - Mobile: centered below, Desktop: right side with details */}
        {/* ✅ BALANCED LAYOUT: ชื่อ+ขนาดไฟล์บน desktop, เฉพาะชื่อบน mobile */}
        {showFileName && (
          <div className="flex-1 text-center md:text-left min-w-0 md:px-2">
            {/* ✅ FIX v0.7.22: Mobile - Orange color to indicate clickability */}
            {/* ✅ FIX v0.7.29-v8: Mobile tooltip shows "คลิกเพื่อดาวน์โหลด" */}
            <div
              className={cn(
                "text-xs sm:text-sm md:text-base font-medium truncate transition-colors",
                // Mobile: สีส้มเพื่อบ่งบอกว่าคลิกได้
                "text-orange-500 md:text-foreground",
                "cursor-pointer md:cursor-default",
                "hover:underline md:hover:no-underline",
                "active:text-orange-600"  // Touch feedback on mobile
              )}
              title={window.innerWidth < 768 ? "คลิกเพื่อดาวน์โหลด" : file.name}
              onClick={(e) => {
                // ✅ Only trigger download on mobile
                const isMobile = window.innerWidth < 768;
                if (isMobile) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDownload(e);
                }
              }}
            >
              {file.name}
            </div>
            {/* ✅ DESKTOP ONLY: แสดงขนาดไฟล์บน desktop เท่านั้น */}
            <div className="hidden md:block text-sm text-muted-foreground mt-1">
              {formatFileSize(file.size)}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl lg:max-w-6xl xl:max-w-7xl max-h-full bg-gray-900/95 backdrop-blur-lg rounded-xl border border-gray-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white truncate">{file.name}</h2>
                  {/* ✅ USER REQUEST: Removed file size, type, and date/time from modal header */}
                </div>
                <div className="flex items-center gap-2">
                  {/* Download Button - Mobile touch-friendly */}
                  {/* ✅ MOBILE FIX: 48px touch target, 24px icon on mobile */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownload(e);
                    }}
                    className={cn(
                      "text-gray-300 hover:text-orange-400 transition-colors rounded",
                      "p-3 sm:p-2",  // 48px mobile, 32px desktop
                      "active:scale-95"  // Touch feedback
                    )}
                    title="ดาวน์โหลด"
                  >
                    <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  {/* Close Button - Mobile touch-friendly */}
                  <button
                    onClick={() => setShowModal(false)}
                    className={cn(
                      "text-gray-300 hover:text-red-400 transition-colors rounded",
                      "p-3 sm:p-2",  // 48px mobile, 32px desktop
                      "active:scale-95"  // Touch feedback
                    )}
                    title="ปิด"
                  >
                    <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              {/* ✅ FIX v0.7.23: Adaptive aspect ratio container */}
              {/* Landscape (16:9): Full width display, max-h-[80vh] */}
              {/* Portrait: 50vw width, max-h-[85vh] to show full height */}
              <div className="relative p-4 overflow-auto flex items-center justify-center">
                {/* ✅ Image container with adaptive sizing based on orientation */}
                <div className={cn(
                  "relative flex items-center justify-center",
                  // ✅ Landscape: Full width (95vw max), 16:9 ratio
                  imageOrientation === 'landscape' && [
                    "w-full max-w-[95vw]",
                    "aspect-video",  // 16:9 ratio
                    "max-h-[80vh]"
                  ],
                  // ✅ Portrait: 50vw width, full height display
                  imageOrientation === 'portrait' && [
                    "w-[50vw]",  // 50% of viewport width
                    "max-h-[85vh]",  // Allow tall images
                    "h-auto"  // Auto height to fit image
                  ]
                )}>
                  <ImageContent isModal={true} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}, (prevProps, nextProps) => {
  // ✅ FIX v0.7.17: Custom comparison - only re-render if these props change
  return (
    prevProps.file.id === nextProps.file.id &&
    prevProps.blobUrl === nextProps.blobUrl &&
    prevProps.size === nextProps.size &&
    prevProps.showFileName === nextProps.showFileName &&
    prevProps.className === nextProps.className &&
    prevProps.adaptive === nextProps.adaptive  // ✅ FIX v0.7.23: Compare adaptive prop
    // ✅ NOTE: onClick and onDownload are functions, skip comparison (always stable from parent)
  );
});

const FilePreview = ({
  file,
  className,
  size = 'md',
  showInfo = true,
  onClick
}) => {
  const handleDownload = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('📥 FilePreview download clicked:', file);

    if (!file || !file.id) {
      console.error('❌ Invalid file object for download (no file ID):', file);
      return;
    }

    try {
      // ✅ FIX V3: Use authenticated fetch + blob download
      const downloadUrl = `${API_CONFIG.baseURL}/files/${file.id}/download`;
      console.log('📥 Fetching file from:', downloadUrl);

      const token = localStorage.getItem('q-collector-auth-token');

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name || 'download';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);

      console.log('✅ Download complete:', file.name);
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('ไม่สามารถดาวน์โหลดไฟล์ได้: ' + error.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Size variants for file preview with better mobile responsiveness
  // ✅ MOBILE FIX: Match ImageThumbnail sizes (increased by 40% for mobile)
  const sizeClasses = {
    sm: 'w-20 h-20 sm:w-24 sm:h-24',                    // 80px → 96px mobile (+40%)
    md: 'w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36',   // 112px → 128px → 144px (+40%)
    lg: 'w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40',   // 128px → 144px → 160px (+40%)
    xl: 'w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44'    // 144px → 160px → 176px (+40%)
  };

  return (
    <div className={cn('group relative', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border-2 border-border/40 bg-background/50',
          'cursor-pointer',
          // ✅ MOBILE UX: Disable hover effects on mobile to prevent flashing
          'md:hover:border-primary/50 md:hover:shadow-lg md:hover:shadow-primary/10',
          'md:transition-all md:duration-300 md:hover:scale-105',
          'flex items-center justify-center',
          sizeClasses[size]
        )}
        onClick={onClick}
      >
        {/* File Icon */}
        <div className="text-center">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-muted-foreground mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="text-xs text-muted-foreground">
            {file.type ? file.type.split('/')[1]?.toUpperCase() || 'FILE' : 'FILE'}
          </div>
        </div>

        {/* Action Button - Show on hover (desktop) */}
        {/* ✅ CRITICAL FIX: ใช้ pointer-events-none */}
        <div className={cn(
          "absolute inset-0 rounded-lg flex items-center justify-center transition-all duration-300",
          "pointer-events-none",  // ✅ ทำให้กด onClick ของ parent ได้
          // Mobile: ซ่อนไว้
          "opacity-0",
          // Desktop: แสดงเมื่อ hover
          "md:group-hover:bg-black/40 md:group-hover:opacity-100"
        )}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDownload(e);
            }}
            className={cn(
              "rounded-full text-white transition-colors pointer-events-auto",
              "bg-white/30 hover:bg-white/50",
              "p-3 sm:p-2",  // 48px mobile, 32px desktop
              "active:scale-95"  // Touch feedback
            )}
            title="ดาวน์โหลด"
          >
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* File Info - Name Only */}
      {/* ✅ USER REQUEST: Removed file size and date/time */}
      {showInfo && (
        <div className="mt-2 text-center">
          <div className="text-xs font-medium text-foreground truncate" title={file.name}>
            {file.name}
          </div>
        </div>
      )}
    </div>
  );
};

// Gallery Grid Component for multiple files
const FileGallery = ({
  files = [],
  className,
  maxDisplay = 6,
  size = 'md',
  showFileNames = true
}) => {
  const displayFiles = files.slice(0, maxDisplay);
  const remainingCount = files.length - maxDisplay;


  if (files.length === 0) {
    return (
      <div className="text-center py-3 sm:py-4 text-muted-foreground text-sm">
        ไม่มีไฟล์
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 sm:space-y-3', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {displayFiles.map((file, index) => (
          file.isImage ? (
            <ImageThumbnail
              key={file.id || index}
              file={file}
              size={size}
              showFileName={showFileNames}
            />
          ) : (
            <FilePreview
              key={file.id || index}
              file={file}
              size={size}
              showInfo={showFileNames}
              onClick={async () => {
                if (!file.id) return;

                try {
                  // ✅ FIX V3: Use authenticated fetch + blob download
                  const downloadUrl = `${API_CONFIG.baseURL}/files/${file.id}/download`;
                  console.log('📥 Fetching file from:', downloadUrl);

                  const token = localStorage.getItem('q-collector-auth-token');

                  const response = await fetch(downloadUrl, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });

                  if (!response.ok) {
                    throw new Error(`Download failed: ${response.status}`);
                  }

                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);

                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = file.name || 'download';
                  link.style.display = 'none';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);

                  window.URL.revokeObjectURL(blobUrl);

                  console.log('✅ Download complete:', file.name);
                } catch (error) {
                  console.error('❌ Download failed:', error);
                  alert('ไม่สามารถดาวน์โหลดไฟล์ได้: ' + error.message);
                }
              }}
            />
          )
        ))}
      </div>

      {remainingCount > 0 && (
        <div className="text-center text-xs sm:text-sm text-muted-foreground">
          และอีก {remainingCount} ไฟล์
        </div>
      )}
    </div>
  );
};

export { ImageThumbnail, FilePreview, FileGallery };