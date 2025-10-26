import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useToast } from '../ui/toast';
import { Upload, X, Copy, RefreshCw, Download, AlertTriangle } from 'lucide-react';

/**
 * PublicLinkSettings Component
 *
 * Comprehensive component for managing public form link settings including:
 * - Enable/disable public access
 * - Custom slug configuration
 * - Security token management
 * - Banner image upload
 * - Expiration and submission limits
 * - QR code generation
 *
 * @component
 * @param {Object} props
 * @param {string} props.formId - The ID of the form
 * @param {Object} props.initialSettings - Initial settings for the public link
 * @param {Function} props.onSave - Callback when settings are saved
 * @param {Function} props.onCancel - Callback when user cancels
 */
const PublicLinkSettings = ({
  formId,
  initialSettings = {},
  onSave,
  onCancel
}) => {
  // Toast hook
  const toast = useToast();

  // State management
  const [enabled, setEnabled] = useState(initialSettings.enabled || false);
  const [slug, setSlug] = useState(initialSettings.slug || '');
  const [token, setToken] = useState(initialSettings.token || '');
  const [banner, setBanner] = useState(initialSettings.banner || null);
  const [expiresAt, setExpiresAt] = useState(initialSettings.expiresAt || '');
  const [maxSubmissions, setMaxSubmissions] = useState(initialSettings.maxSubmissions || '');
  const [submissionCount, setSubmissionCount] = useState(initialSettings.submissionCount || 0);
  const [createdAt, setCreatedAt] = useState(initialSettings.createdAt || new Date().toISOString());

  // Sync state with initialSettings when they change
  useEffect(() => {
    setEnabled(initialSettings.enabled || false);
    setSlug(initialSettings.slug || '');
    setToken(initialSettings.token || '');
    setBanner(initialSettings.banner || null);
    setExpiresAt(initialSettings.expiresAt || '');
    setMaxSubmissions(initialSettings.maxSubmissions || '');
    setSubmissionCount(initialSettings.submissionCount || 0);
    setCreatedAt(initialSettings.createdAt || new Date().toISOString());
  }, [initialSettings]);

  // UI state
  const [slugError, setSlugError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // Base URL for public links
  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/public/forms/${slug}`;

  /**
   * Validates slug format
   * - 3-50 characters
   * - Lowercase alphanumeric + hyphens only
   * - No consecutive hyphens
   * - Cannot start or end with hyphen
   */
  const validateSlug = useCallback((value) => {
    if (!value) {
      return 'Slug is required';
    }
    if (value.length < 3) {
      return 'Slug must be at least 3 characters';
    }
    if (value.length > 50) {
      return 'Slug must be less than 50 characters';
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      return 'Slug can only contain lowercase letters, numbers, and hyphens';
    }
    if (/--/.test(value)) {
      return 'Slug cannot contain consecutive hyphens';
    }
    if (value.startsWith('-') || value.endsWith('-')) {
      return 'Slug cannot start or end with a hyphen';
    }
    return '';
  }, []);

  /**
   * Auto-generate slug from form title on initial load
   */
  useEffect(() => {
    if (!initialSettings.slug && initialSettings.formTitle) {
      const generatedSlug = initialSettings.formTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .substring(0, 50);
      setSlug(generatedSlug);
    }
  }, [initialSettings.slug, initialSettings.formTitle]);

  /**
   * Handle slug change with validation
   */
  const handleSlugChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSlug(value);
    const error = validateSlug(value);
    setSlugError(error);
  };

  /**
   * Handle enable/disable toggle
   */
  const handleToggle = (checked) => {
    if (!checked && enabled) {
      // Show confirmation dialog when disabling
      setShowDisableDialog(true);
    } else {
      setEnabled(checked);
    }
  };

  /**
   * Confirm disable action
   */
  const confirmDisable = () => {
    setEnabled(false);
    setShowDisableDialog(false);
    toast.success('Public link disabled');
  };

  /**
   * Copy URL to clipboard
   */
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Public URL copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  /**
   * Copy token to clipboard
   */
  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success('Security token copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy token');
    }
  };

  /**
   * Generate new random token
   */
  const generateToken = () => {
    const chars = 'abcdef0123456789';
    let newToken = '';
    for (let i = 0; i < 32; i++) {
      newToken += chars[Math.floor(Math.random() * chars.length)];
    }
    return newToken;
  };

  /**
   * Handle token regeneration
   */
  const handleRegenerateToken = () => {
    setShowRegenerateDialog(true);
  };

  /**
   * Confirm token regeneration
   */
  const confirmRegenerateToken = () => {
    const newToken = generateToken();
    setToken(newToken);
    setShowRegenerateDialog(false);
    toast.success('Security token regenerated');
  };

  /**
   * Handle banner file upload
   */
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only JPG and PNG images are allowed');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fieldName', 'banner');

      // TODO: Replace with actual MinIO upload endpoint
      // For now, create a temporary URL for preview
      const tempUrl = URL.createObjectURL(file);

      setBanner({
        url: tempUrl,
        alt: file.name
      });

      toast.success('Banner uploaded successfully');
    } catch (error) {
      console.error('Banner upload error:', error);
      toast.error('Failed to upload banner');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Remove banner image
   */
  const removeBanner = () => {
    if (banner?.url && banner.url.startsWith('blob:')) {
      URL.revokeObjectURL(banner.url);
    }
    setBanner(null);
    toast.success('Banner removed');
  };

  /**
   * Download QR code as PNG
   */
  const downloadQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (!canvas) return;

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().getTime();
      link.download = `qr-${slug}-${timestamp}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('QR code downloaded');
    });
  };

  /**
   * Validate all settings before save
   */
  const isValid = () => {
    if (!enabled) return true; // No validation needed when disabled
    if (slugError) return false;
    if (!slug) return false;
    if (!token) return false;
    return true;
  };

  /**
   * Handle save action
   */
  const handleSave = async () => {
    if (!isValid()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);

    try {
      const settings = {
        enabled,
        slug: slug.trim(),
        token,
        banner,
        expiresAt: expiresAt || null,
        maxSubmissions: maxSubmissions ? parseInt(maxSubmissions) : null,
      };

      await onSave(settings);
      toast.success('Public link settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    // Clean up any blob URLs
    if (banner?.url && banner.url.startsWith('blob:')) {
      URL.revokeObjectURL(banner.url);
    }
    onCancel();
  };

  /**
   * Initialize token if not present
   */
  useEffect(() => {
    if (!token && enabled) {
      setToken(generateToken());
    }
  }, [enabled, token]);

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Public Link Settings</CardTitle>
            <CardDescription>
              Allow anonymous users to submit this form via a public URL
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            aria-label="Enable public link"
          />
        </CardHeader>

        {enabled && (
          <CardContent className="space-y-6">
            {/* Slug Section */}
            <div className="space-y-2">
              <Label htmlFor="slug">Public URL</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="slug"
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="customer-feedback"
                    className={slugError ? 'border-red-500' : ''}
                    aria-invalid={!!slugError}
                    aria-describedby={slugError ? 'slug-error' : 'slug-preview'}
                  />
                  {slugError && (
                    <p id="slug-error" className="text-sm text-red-500 mt-1">
                      {slugError}
                    </p>
                  )}
                </div>
                <Button
                  onClick={copyUrl}
                  variant="outline"
                  disabled={!!slugError || !slug}
                  aria-label="Copy public URL"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
              </div>
              <p id="slug-preview" className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                {baseUrl}/public/forms/<span className="text-orange-500">{slug || '...'}</span>
              </p>
            </div>

            {/* Token Section */}
            <div className="space-y-2">
              <Label htmlFor="token">Security Token</Label>
              <div className="flex gap-2">
                <Input
                  id="token"
                  value={token}
                  readOnly
                  className="font-mono text-sm"
                  aria-label="Security token"
                />
                <Button
                  onClick={copyToken}
                  variant="outline"
                  aria-label="Copy security token"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleRegenerateToken}
                  variant="destructive"
                  aria-label="Regenerate security token"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This token is required for all public submissions
              </p>
            </div>

            {/* Banner Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="banner">Banner Image (Optional)</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Maximum 2MB, JPG or PNG format
              </p>

              {!banner ? (
                <div className="relative">
                  <input
                    id="banner"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleBannerUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="banner"
                    className={`
                      flex flex-col items-center justify-center
                      w-full h-32 border-2 border-dashed rounded-lg
                      cursor-pointer transition-colors
                      ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-orange-500'}
                    `}
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      {isUploading ? 'Uploading...' : 'Click to upload banner image'}
                    </p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={banner.url}
                    alt={banner.alt}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    onClick={removeBanner}
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    aria-label="Remove banner"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Optional Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  aria-label="Link expiration date"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave empty for no expiration
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-submissions">Max Submissions (Optional)</Label>
                <Input
                  id="max-submissions"
                  type="number"
                  min="1"
                  value={maxSubmissions}
                  onChange={(e) => setMaxSubmissions(e.target.value)}
                  placeholder="Unlimited"
                  aria-label="Maximum number of submissions"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave empty for unlimited
                </p>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="space-y-2">
              <Label>QR Code</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Share this QR code for easy mobile access
              </p>
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="bg-white p-2 rounded">
                  <QRCodeCanvas
                    id="qr-code-canvas"
                    value={publicUrl}
                    size={150}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-mono break-all">{publicUrl}</p>
                  <Button
                    onClick={downloadQR}
                    variant="outline"
                    size="sm"
                    aria-label="Download QR code"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {submissionCount !== undefined && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-lg">Statistics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Total Submissions
                    </p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {submissionCount}
                    </p>
                  </div>
                  {maxSubmissions && (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Remaining Slots
                      </p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {Math.max(0, maxSubmissions - submissionCount)}
                      </p>
                    </div>
                  )}
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Link Created
                    </p>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      {new Date(createdAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isValid() || isSaving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Disable Public Link?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disable public access to this form. Users will no longer
              be able to submit using the public URL. You can re-enable it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisable}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Disable Public Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Token Confirmation Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Regenerate Security Token?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current public link and generate a new security token.
              Any existing links or QR codes will stop working immediately. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRegenerateToken}
              className="bg-red-500 hover:bg-red-600"
            >
              Regenerate Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PublicLinkSettings;
