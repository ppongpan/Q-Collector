import React from 'react';
import { cn } from '../../utils/cn';
import FileService from '../../services/FileService.js';

// File type detection utility
const getFileType = (fileName) => {
  if (!fileName) return 'generic';

  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    case 'xls':
    case 'xlsx':
      return 'excel';
    case 'txt':
      return 'text';
    case 'zip':
    case 'rar':
    case '7z':
      return 'archive';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
      return 'image';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return 'video';
    case 'mp3':
    case 'wav':
    case 'flac':
      return 'audio';
    default:
      return 'generic';
  }
};

// File type icons mapping
const getFileIcon = (fileType) => {
  switch (fileType) {
    case 'pdf':
      return '📄';
    case 'word':
      return '📝';
    case 'excel':
      return '📊';
    case 'text':
      return '📃';
    case 'archive':
      return '📦';
    case 'image':
      return '🖼️';
    case 'video':
      return '🎥';
    case 'audio':
      return '🎵';
    default:
      return '📁';
  }
};

// Format file size utility
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);

  return `${size} ${sizes[i]}`;
};

// Single file display component
const FileItem = ({ file, onClick, className }) => {
  const fileName = typeof file === 'string' ? file : file?.name || file?.fileName || 'Unknown file';
  const fileSize = file?.size || file?.fileSize || 0;
  const fileUrl = file?.url || file?.fileUrl;

  const fileType = getFileType(fileName);
  const icon = getFileIcon(fileType);
  const formattedSize = formatFileSize(fileSize);

  const handleClick = () => {
    if (onClick) {
      onClick(file);
    } else if (fileUrl) {
      // Open file in new tab if URL is available
      window.open(fileUrl, '_blank');
    } else if (file && file.id) {
      // Try to download using FileService
      console.log('FileItem click download:', file);
      const success = FileService.downloadFile(file.id);
      console.log('Download result:', success);
      if (!success) {
        console.warn('Failed to download file:', file);
      }
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-200",
        "hover:bg-background/70 hover:border-orange-300/50 hover:shadow-md",
        onClick || fileUrl ? "cursor-pointer" : "cursor-default",
        className
      )}
      onClick={handleClick}
    >
      {/* File Icon */}
      <div className="flex-shrink-0 text-2xl">
        {icon}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium text-foreground">
          {fileName}
        </div>
        {formattedSize && (
          <div className="text-xs text-muted-foreground">
            {formattedSize}
          </div>
        )}
      </div>

      {/* Download button */}
      {(onClick || fileUrl || (file && file.id)) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (file && file.id) {
              console.log('Download button clicked:', file);
              const success = FileService.downloadFile(file.id);
              console.log('Download result:', success);
              if (!success) {
                console.warn('Failed to download file:', file);
              }
            } else if (onClick) {
              onClick(file);
            } else if (fileUrl) {
              window.open(fileUrl, '_blank');
            }
          }}
          className="flex-shrink-0 p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-all duration-200"
          title="ดาวน์โหลดไฟล์"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

// Multiple files display component
const FileList = ({ files, onFileClick, className, maxDisplay = 5 }) => {
  if (!files || files.length === 0) {
    return (
      <div className="text-[12px] text-muted-foreground italic">
        ไม่มีไฟล์
      </div>
    );
  }

  const displayFiles = files.slice(0, maxDisplay);
  const remainingCount = files.length - maxDisplay;

  return (
    <div className={cn("space-y-2", className)}>
      {displayFiles.map((file, index) => (
        <FileItem
          key={index}
          file={file}
          onClick={onFileClick || ((file) => {
            if (file && file.id) {
              console.log('FileList item download:', file);
              const success = FileService.downloadFile(file.id);
              console.log('Download result:', success);
              if (!success) {
                console.warn('Failed to download file:', file);
              }
            }
          })}
        />
      ))}

      {remainingCount > 0 && (
        <div className="text-xs text-muted-foreground text-center py-2 border border-border/30 rounded-lg bg-muted/20">
          และอีก {remainingCount} ไฟล์
        </div>
      )}
    </div>
  );
};

// Main file display component
const FileDisplay = ({
  value,
  onFileClick,
  className,
  variant = 'default',
  maxDisplay = 5
}) => {
  // Handle different value formats
  if (!value) {
    return (
      <div className="text-[12px] text-muted-foreground italic">
        ไม่มีไฟล์
      </div>
    );
  }

  // If value is a string (just filename)
  if (typeof value === 'string') {
    return (
      <FileItem
        file={value}
        onClick={onFileClick}
        className={className}
      />
    );
  }

  // If value is an array of files
  if (Array.isArray(value)) {
    return (
      <FileList
        files={value}
        onFileClick={onFileClick}
        className={className}
        maxDisplay={maxDisplay}
      />
    );
  }

  // If value is a single file object
  if (typeof value === 'object') {
    return (
      <FileItem
        file={value}
        onClick={onFileClick}
        className={className}
      />
    );
  }

  // Fallback for unknown format
  return (
    <div className="text-[12px] text-muted-foreground italic">
      รูปแบบไฟล์ไม่ถูกต้อง
    </div>
  );
};

// Compact file display for tables
const FileDisplayCompact = ({ value, maxDisplay = 3 }) => {
  if (!value) return '-';

  // Helper function to get file info from ID or object
  const getFileInfo = (fileIdOrObject) => {
    if (typeof fileIdOrObject === 'string') {
      // ถ้าเป็น string อาจจะเป็น file ID หรือชื่อไฟล์
      // ลองดึงไฟล์จาก FileService ก่อน
      const fileFromService = FileService.getFile(fileIdOrObject);
      if (fileFromService) {
        return {
          name: fileFromService.name,
          type: getFileType(fileFromService.name),
          icon: getFileIcon(getFileType(fileFromService.name))
        };
      }
      // ถ้าไม่พบใน FileService แสดงว่าเป็นชื่อไฟล์
      return {
        name: fileIdOrObject,
        type: getFileType(fileIdOrObject),
        icon: getFileIcon(getFileType(fileIdOrObject))
      };
    }

    if (typeof fileIdOrObject === 'object' && fileIdOrObject !== null) {
      const fileName = fileIdOrObject.name || fileIdOrObject.fileName || 'ไฟล์';
      return {
        name: fileName,
        type: getFileType(fileName),
        icon: getFileIcon(getFileType(fileName))
      };
    }

    return null;
  };

  // ถ้าเป็น string เดี่ยว
  if (typeof value === 'string') {
    const fileInfo = getFileInfo(value);
    if (!fileInfo) return '-';

    return (
      <div className="flex items-center gap-1">
        <span className="text-xs">{fileInfo.icon}</span>
        <span className="text-[10px] truncate max-w-[80px]" title={fileInfo.name}>
          {fileInfo.name}
        </span>
      </div>
    );
  }

  // ถ้าเป็น array
  if (Array.isArray(value)) {
    // แสดงไฟล์แรกแทนการแสดงจำนวนไฟล์
    const firstFileId = value[0];
    if (!firstFileId) return '-';

    const fileInfo = getFileInfo(firstFileId);
    if (!fileInfo) return '-';

    return (
      <div className="flex items-center gap-1">
        <span className="text-xs">{fileInfo.icon}</span>
        <span className="text-[10px] truncate max-w-[80px]" title={fileInfo.name}>
          {fileInfo.name}
        </span>
      </div>
    );
  }

  // ถ้าเป็น object เดี่ยว
  if (typeof value === 'object') {
    const fileInfo = getFileInfo(value);
    if (!fileInfo) return '-';

    return (
      <div className="flex items-center gap-1">
        <span className="text-xs">{fileInfo.icon}</span>
        <span className="text-[10px] truncate max-w-[80px]" title={fileInfo.name}>
          {fileInfo.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs">📁</span>
      <span className="text-[10px]">ไฟล์</span>
    </div>
  );
};

export { FileDisplay, FileDisplayCompact, FileItem, FileList };
export default FileDisplay;