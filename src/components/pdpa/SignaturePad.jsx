/**
 * SignaturePad Component
 * Digital signature capture for PDPA consent verification
 *
 * @version v0.8.2-dev (Fixed: Mobile touch coordinate mismatch)
 * @date 2025-10-23
 */

import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignaturePad = ({
  value,
  onChange,
  onClear,
  label = 'ลายเซ็นดิจิทัล',
  sublabel = 'กรุณาเซ็นชื่อในกรอบเพื่อยืนยันตัวตน',
  required = false,
  disabled = false,
  width = 500,
  height = 200
}) => {
  const sigCanvas = useRef(null);
  const containerRef = useRef(null); // ✅ v0.8.2: Track container size
  const [isEmpty, setIsEmpty] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const loadedSignatureRef = useRef(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width, height }); // ✅ v0.8.2: Dynamic canvas size

  // ✅ v0.8.2: Dynamically adjust canvas dimensions based on container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth } = entry.contentRect;

        // Calculate canvas dimensions maintaining aspect ratio
        const aspectRatio = width / height;
        const maxWidth = Math.min(containerWidth, width); // Don't exceed original width
        const calculatedHeight = Math.round(maxWidth / aspectRatio);

        const newDimensions = {
          width: Math.round(maxWidth),
          height: calculatedHeight
        };

        // Only update if dimensions actually changed (avoid unnecessary re-renders)
        setCanvasDimensions(prev => {
          if (prev.width === newDimensions.width && prev.height === newDimensions.height) {
            return prev;
          }
          console.log('📐 Canvas dimensions updated:', newDimensions);
          return newDimensions;
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [width, height]);

  // Load existing signature if provided (only on initial mount)
  useEffect(() => {
    // ✅ FIX: Only load if value exists, canvas exists, and we haven't loaded this signature yet
    if (value && sigCanvas.current && value !== loadedSignatureRef.current && !isDrawing) {
      try {
        sigCanvas.current.clear(); // ✅ Clear canvas first
        sigCanvas.current.fromDataURL(value);
        setIsEmpty(false);
        loadedSignatureRef.current = value; // ✅ Mark this signature as loaded
        console.log('📥 Loaded existing signature');
      } catch (error) {
        console.error('Failed to load signature:', error);
      }
    }
  }, [value, isDrawing]);

  /**
   * Handle signature change (called when user draws)
   */
  const handleEnd = () => {
    setIsDrawing(false); // ✅ FIX: Mark drawing as finished
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureData = sigCanvas.current.toDataURL('image/png');
      setIsEmpty(false);
      loadedSignatureRef.current = signatureData; // ✅ FIX: Mark this as the current signature
      onChange && onChange(signatureData);
      console.log('✅ Signature captured:', signatureData.substring(0, 50) + '...');
    }
  };

  /**
   * Handle signature start (for debugging)
   */
  const handleBegin = () => {
    setIsDrawing(true); // ✅ FIX: Mark drawing as started
    console.log('🖊️ Started drawing signature');
  };

  /**
   * Clear signature
   */
  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
      setIsDrawing(false); // ✅ FIX: Reset drawing state
      loadedSignatureRef.current = null; // ✅ FIX: Reset loaded signature reference
      onChange && onChange(null);
      onClear && onClear();
      console.log('🗑️ Signature cleared');
    }
  };

  return (
    <div className="signature-pad-container">
      {/* Label */}
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {sublabel && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          {sublabel}
        </p>
      )}

      {/* Canvas Container - ✅ v0.8.2 FIX: Dynamic dimensions for touch accuracy */}
      <div className="flex justify-center w-full px-4">
        <div
          ref={containerRef}
          className="relative w-full"
          style={{ maxWidth: `${width}px` }}
        >
        {/* Canvas wrapper - dynamic sizing for 1:1 touch coordinate mapping */}
        <div
          className={`
            relative rounded-xl shadow-lg w-full
            ${!isEmpty ? 'ring-2 ring-orange-500 shadow-orange-200 dark:shadow-orange-900/30' : 'ring-2 ring-slate-300 dark:ring-slate-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'}
            transition-all duration-200
            overflow-hidden
          `}
          style={{
            aspectRatio: `${width} / ${height}`,
            maxWidth: '100%',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Empty State Hint */}
          {isEmpty && !disabled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <p className="text-slate-400 text-sm select-none">
                วาดลายเซ็นที่นี่
              </p>
            </div>
          )}

          {/* Signature Canvas - Dynamic internal dimensions match displayed size */}
          <SignatureCanvas
            ref={sigCanvas}
            penColor="#000000"
            backgroundColor="transparent"
            canvasProps={{
              width: canvasDimensions.width,
              height: canvasDimensions.height,
              style: {
                width: '100%',
                height: '100%',
                display: 'block',
                touchAction: 'none'
              }
            }}
            onBegin={handleBegin}
            onEnd={handleEnd}
            clearOnResize={false}
          />
        </div>

        {/* Clear Button - ✅ FIX: Move outside canvas container to prevent blocking */}
        {!disabled && !isEmpty && (
          <button
            type="button"
            onClick={handleClear}
            className="
              absolute -top-3 -right-3 z-30
              px-3 py-1.5 rounded-md
              bg-red-500 hover:bg-red-600
              text-white text-xs font-medium
              transition-colors duration-200
              shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              pointer-events-auto
            "
          >
            ล้าง
          </button>
        )}
        </div>
      </div>

      {/* Helper Text */}
      <div className="mt-2">
        {required && isEmpty && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            กรุณาเซ็นชื่อเพื่อยืนยันความยินยอม
          </p>
        )}

        {!isEmpty && (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            ลายเซ็นถูกบันทึกแล้ว
          </p>
        )}
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-slate-500">
          <div>Canvas: {canvasDimensions.width}x{canvasDimensions.height}px (max: {width}x{height}px)</div>
          <div>Empty: {isEmpty ? 'Yes' : 'No'}</div>
          <div>Disabled: {disabled ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
