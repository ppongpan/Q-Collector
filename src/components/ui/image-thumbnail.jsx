/**
 * Image Thumbnail Component with Modal View
 * รองรับ responsive design และ modal สำหรับดูรูปเต็มขนาด
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import FileService from '../../services/FileService';

const ImageThumbnail = ({
  file,
  className,
  size = 'md',
  showFileName = true,
  onClick
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Size variants with better mobile responsiveness
  const sizeClasses = {
    sm: 'w-14 h-14 sm:w-16 sm:h-16',
    md: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32',
    lg: 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36',
    xl: 'w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40'
  };

  const handleThumbnailClick = () => {
    if (onClick) {
      onClick(file);
    } else {
      setShowModal(true);
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    console.log('ImageThumbnail download:', file);
    if (file && file.id) {
      const success = FileService.downloadFile(file.id);
      console.log('Download result:', success);
      if (!success) {
        console.warn('Failed to download file:', file);
      }
    } else {
      console.warn('Invalid file object for download:', file);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const ImageContent = ({ isModal = false }) => {
    const [localImageLoaded, setLocalImageLoaded] = React.useState(false);
    const [localImageError, setLocalImageError] = React.useState(false);

    const fileData = FileService.getFile(file.id);

    if (!fileData || !fileData.data) {
      return (
        <div className="w-full h-full bg-muted/40 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }

    if (localImageError) {
      return null; // Let the error state in parent handle this
    }

    return (
      <img
        src={fileData.data}
        alt={file.name}
        className={cn(
          'object-cover rounded-lg transition-all duration-300',
          isModal ? 'max-w-full max-h-full' : 'w-full h-full',
          !localImageLoaded && 'opacity-0'
        )}
        onLoad={() => {
          setLocalImageLoaded(true);
          setImageLoaded(true);
        }}
        onError={() => {
          setLocalImageError(true);
          setImageError(true);
        }}
        loading="lazy"
      />
    );
  };

  return (
    <>
      {/* Thumbnail */}
      <div className={cn('group relative', className)}>
        <div
          className={cn(
            'relative overflow-hidden rounded-lg border-2 border-border/40 bg-background/50',
            'cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
            'transition-all duration-300 hover:scale-105',
            sizeClasses[size]
          )}
          onClick={handleThumbnailClick}
        >
          {/* Loading Skeleton */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-muted/40 animate-pulse rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Image */}
          <ImageContent />

          {/* Error State - Only show if ImageContent has an error */}
          {imageError && (
            <div className="absolute inset-0 w-full h-full bg-muted/40 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-muted-foreground">ไม่สามารถโหลดภาพได้</div>
              </div>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModal(true);
                }}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                title="ดูรูปเต็มขนาด"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                title="ดาวน์โหลด"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* File Name and Size */}
        {showFileName && (
          <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
            <div className="text-xs font-medium text-foreground truncate" title={file.name}>
              {file.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </div>
            {file.uploadedAt && (
              <div className="text-xs text-muted-foreground">
                {new Date(file.uploadedAt).toLocaleDateString('th-TH')}
              </div>
            )}
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-7xl max-h-full bg-background dark:bg-gray-900 backdrop-blur-md rounded-xl border border-border dark:border-gray-600/50 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white truncate">{file.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-300">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{file.type}</span>
                    {file.uploadedAt && (
                      <span>{new Date(file.uploadedAt).toLocaleString('th-TH')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="p-2 text-gray-300 hover:text-orange-400 transition-colors"
                    title="ดาวน์โหลด"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                    title="ปิด"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 max-h-[80vh] overflow-auto flex items-center justify-center">
                <ImageContent isModal={true} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const FilePreview = ({
  file,
  className,
  size = 'md',
  showInfo = true,
  onClick
}) => {
  const handleDownload = (e) => {
    e.stopPropagation();
    console.log('FilePreview download:', file);
    if (file && file.id) {
      const success = FileService.downloadFile(file.id);
      console.log('Download result:', success);
      if (!success) {
        console.warn('Failed to download file:', file);
      }
    } else {
      console.warn('Invalid file object for download:', file);
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
  const sizeClasses = {
    sm: 'w-14 h-14 sm:w-16 sm:h-16',
    md: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32',
    lg: 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36',
    xl: 'w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40'
  };

  return (
    <div className={cn('group relative', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border-2 border-border/40 bg-background/50',
          'cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
          'transition-all duration-300 hover:scale-105',
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

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
          <button
            onClick={handleDownload}
            className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
            title="ดาวน์โหลด"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* File Info */}
      {showInfo && (
        <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
          <div className="text-xs font-medium text-foreground truncate" title={file.name}>
            {file.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </div>
          {file.uploadedAt && (
            <div className="text-xs text-muted-foreground">
              {new Date(file.uploadedAt).toLocaleDateString('th-TH')}
            </div>
          )}
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
              onClick={() => FileService.downloadFile(file.id)}
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