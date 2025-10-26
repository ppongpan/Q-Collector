import React, { useState } from 'react';
import PublicLinkSettings from './PublicLinkSettings';
import { toast } from 'react-hot-toast';

/**
 * Example usage of PublicLinkSettings component
 *
 * This demonstrates how to integrate the component with your Form Builder
 */
const PublicLinkSettingsExample = () => {
  const [showSettings, setShowSettings] = useState(false);

  // Example initial settings (would come from your API)
  const initialSettings = {
    enabled: true,
    slug: 'customer-feedback-2025',
    token: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    banner: null,
    expiresAt: '',
    maxSubmissions: 100,
    submissionCount: 23,
    createdAt: '2025-10-25T10:00:00Z',
    formTitle: 'แบบสำรวจความพึงพอใจลูกค้า' // Used for auto-slug generation
  };

  /**
   * Handle save - would call your API endpoint
   */
  const handleSave = async (settings) => {
    try {
      console.log('Saving settings:', settings);

      // TODO: Replace with actual API call
      // Example:
      // const response = await fetch(`/api/v1/forms/${formId}/public-link`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });
      //
      // if (!response.ok) throw new Error('Failed to save');

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Public link settings saved successfully!');
      setShowSettings(false);
    } catch (error) {
      console.error('Save error:', error);
      throw new Error('Failed to save public link settings');
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setShowSettings(false);
    toast('Changes discarded', { icon: 'ℹ️' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Public Link Settings Demo
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Example integration of the PublicLinkSettings component
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            {showSettings ? 'Hide' : 'Show'} Settings
          </button>
        </div>

        {showSettings && (
          <PublicLinkSettings
            formId="example-form-id"
            initialSettings={initialSettings}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {!showSettings && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Click "Show Settings" to see the component
            </p>
          </div>
        )}

        {/* Integration Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Integration Instructions
          </h2>
          <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <strong>1. Import the component:</strong>
              <pre className="bg-blue-100 dark:bg-blue-900 p-3 rounded mt-2 overflow-x-auto">
{`import PublicLinkSettings from './components/form-builder/PublicLinkSettings';`}
              </pre>
            </div>
            <div>
              <strong>2. Add to your Form Builder UI:</strong>
              <pre className="bg-blue-100 dark:bg-blue-900 p-3 rounded mt-2 overflow-x-auto">
{`<PublicLinkSettings
  formId={form.id}
  initialSettings={form.publicLinkSettings}
  onSave={handleSavePublicLink}
  onCancel={handleCancelPublicLink}
/>`}
              </pre>
            </div>
            <div>
              <strong>3. Implement the save handler:</strong>
              <pre className="bg-blue-100 dark:bg-blue-900 p-3 rounded mt-2 overflow-x-auto">
{`const handleSavePublicLink = async (settings) => {
  const response = await fetch(\`/api/v1/forms/\${formId}/public-link\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error('Failed to save');
};`}
              </pre>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">
            Component Features
          </h2>
          <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
            <li>✅ Enable/disable toggle with confirmation dialog</li>
            <li>✅ Custom slug editor with real-time validation</li>
            <li>✅ Security token display and regeneration</li>
            <li>✅ Banner image upload (2MB max, JPG/PNG)</li>
            <li>✅ Optional expiration date</li>
            <li>✅ Optional max submissions limit</li>
            <li>✅ QR code generation and download</li>
            <li>✅ Submission statistics display</li>
            <li>✅ Copy to clipboard (URL and token)</li>
            <li>✅ Mobile-responsive design</li>
            <li>✅ Dark mode support</li>
            <li>✅ Accessibility (ARIA labels, keyboard navigation)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PublicLinkSettingsExample;
