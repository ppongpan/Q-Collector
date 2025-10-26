# PublicLinkSettings Component

A comprehensive React component for managing public form link settings in the Q-Collector application.

## Overview

The `PublicLinkSettings` component provides a complete UI for administrators to configure public access to forms, including custom URLs, security tokens, branding, and access controls.

## Features

### Core Functionality
- ✅ **Enable/Disable Toggle** - Quick on/off switch with confirmation dialog
- ✅ **Custom Slug Editor** - User-friendly URL customization with validation
- ✅ **Security Token** - 32-character hex token with copy and regenerate
- ✅ **Banner Upload** - Custom branding image (2MB max, JPG/PNG)
- ✅ **Expiration Date** - Optional link expiration
- ✅ **Submission Limits** - Optional maximum submission count
- ✅ **QR Code** - Auto-generated QR code with download capability
- ✅ **Statistics** - Real-time submission tracking

### User Experience
- ✅ **Real-time Validation** - Instant feedback on slug format
- ✅ **Clipboard Integration** - One-click copy for URL and token
- ✅ **Confirmation Dialogs** - Prevents accidental destructive actions
- ✅ **Loading States** - Visual feedback during async operations
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Mobile Responsive** - Works on all screen sizes
- ✅ **Dark Mode** - Full dark mode support
- ✅ **Accessibility** - ARIA labels and keyboard navigation

## Installation

### Dependencies

The component requires the following packages:

```bash
npm install qrcode.react @radix-ui/react-alert-dialog @radix-ui/react-label @radix-ui/react-switch
```

All dependencies are already included in Q-Collector's package.json.

## Usage

### Basic Example

```jsx
import PublicLinkSettings from './components/form-builder/PublicLinkSettings';

function FormBuilder({ formId }) {
  const [publicLinkSettings, setPublicLinkSettings] = useState({
    enabled: false,
    slug: '',
    token: '',
    // ... other settings
  });

  const handleSave = async (settings) => {
    const response = await fetch(`/api/v1/forms/${formId}/public-link`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    const data = await response.json();
    setPublicLinkSettings(data);
  };

  const handleCancel = () => {
    console.log('Settings cancelled');
  };

  return (
    <PublicLinkSettings
      formId={formId}
      initialSettings={publicLinkSettings}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `formId` | string | Yes | The ID of the form |
| `initialSettings` | object | No | Initial settings object (see below) |
| `onSave` | function | Yes | Callback when settings are saved |
| `onCancel` | function | Yes | Callback when user cancels |

### InitialSettings Object

```typescript
interface PublicLinkSettings {
  enabled: boolean;              // Whether public link is enabled
  slug: string;                  // URL slug (3-50 chars)
  token: string;                 // 32-char hex security token
  banner?: {                     // Optional banner image
    url: string;
    alt: string;
  };
  expiresAt?: string;            // ISO 8601 datetime
  maxSubmissions?: number;       // Maximum allowed submissions
  submissionCount?: number;      // Current submission count (read-only)
  createdAt?: string;            // ISO 8601 datetime (read-only)
  formTitle?: string;            // Form title for auto-slug generation
}
```

### Example Initial Settings

```javascript
const initialSettings = {
  enabled: true,
  slug: 'customer-feedback-2025',
  token: 'a1b2c3d4e5f6789012345678901234567890abcd',
  banner: {
    url: 'https://example.com/banner.jpg',
    alt: 'Company Logo'
  },
  expiresAt: '2025-12-31T23:59:59Z',
  maxSubmissions: 1000,
  submissionCount: 235,
  createdAt: '2025-10-01T00:00:00Z',
  formTitle: 'แบบสำรวจความพึงพอใจลูกค้า'
};
```

## Features in Detail

### 1. Enable/Disable Toggle

- Switch component at the top-right of the card
- Disabling shows confirmation dialog
- Settings panel only visible when enabled

**Confirmation Dialog Text:**
> "This will immediately disable public access to this form. Users will no longer be able to submit using the public URL. You can re-enable it at any time."

### 2. Slug Editor

**Validation Rules:**
- 3-50 characters
- Lowercase alphanumeric + hyphens only
- No consecutive hyphens
- Cannot start or end with hyphen

**Auto-generation:**
- If `initialSettings.slug` is empty but `formTitle` is provided
- Converts Thai/English title to URL-safe slug
- Example: "แบบฟอร์มทดสอบ PDPA" → "pdpa"

**Real-time Feedback:**
- Red border and error message for invalid slugs
- Preview URL updates as you type

### 3. Security Token

**Features:**
- Read-only 32-character hex token
- Copy to clipboard button
- Regenerate button (destructive action)

**Regeneration Warning:**
> "This will invalidate the current public link and generate a new security token. Any existing links or QR codes will stop working immediately. This action cannot be undone."

**Token Format:**
- 32 characters
- Hexadecimal (0-9, a-f)
- Example: `a1b2c3d4e5f67890abcdef1234567890`

### 4. Banner Upload

**Specifications:**
- Maximum file size: 2MB
- Allowed formats: JPG, PNG
- Upload area with drag-and-drop (future enhancement)
- Preview thumbnail (w-full, h-32, object-cover)
- Remove button on thumbnail

**Integration:**
- File upload creates temporary blob URL for preview
- Actual upload should integrate with MinIO via FileService
- Banner URL should be persisted in database

### 5. Expiration Date

**Features:**
- Optional datetime-local input
- Leave empty for no expiration
- Stores as ISO 8601 string

**Backend Logic (Not Included):**
- Check expiration before accepting submissions
- Return 410 Gone if expired

### 6. Max Submissions

**Features:**
- Optional number input
- Leave empty for unlimited
- Minimum value: 1

**Backend Logic (Not Included):**
- Check count before accepting submission
- Return 429 Too Many Requests if limit reached

### 7. QR Code

**Features:**
- Auto-generated from public URL
- 150x150px with high error correction (level H)
- Includes margin for better scanning
- Download as PNG button

**Download Naming:**
- Format: `qr-{slug}-{timestamp}.png`
- Example: `qr-customer-feedback-1729843200000.png`

### 8. Statistics Display

**Metrics:**
- Total Submissions (blue card)
- Remaining Slots (green card, only if maxSubmissions set)
- Link Created (orange card, Thai date format)

**Formatting:**
- Numbers: Large (3xl), bold
- Date: Thai locale with full month name
- Responsive grid (1 column mobile, 3 columns desktop)

## Validation

### Slug Validation

The component validates slugs with the following regex:

```javascript
// Valid characters: lowercase alphanumeric + hyphens
/^[a-z0-9-]+$/

// No consecutive hyphens
/--/

// Cannot start or end with hyphen
value.startsWith('-') || value.endsWith('-')
```

**Error Messages:**
- "Slug is required"
- "Slug must be at least 3 characters"
- "Slug must be less than 50 characters"
- "Slug can only contain lowercase letters, numbers, and hyphens"
- "Slug cannot contain consecutive hyphens"
- "Slug cannot start or end with a hyphen"

### Form Validation

The save button is disabled when:
- Slug has validation errors
- Slug is empty
- Token is empty (when enabled)

## Toast Notifications

The component uses `react-hot-toast` for user feedback:

**Success Messages:**
- "Public link disabled"
- "Public URL copied to clipboard"
- "Security token copied to clipboard"
- "Security token regenerated"
- "Banner uploaded successfully"
- "Banner removed"
- "QR code downloaded"
- "Public link settings saved successfully"

**Error Messages:**
- "Failed to copy URL"
- "Failed to copy token"
- "Only JPG and PNG images are allowed"
- "Image must be less than 2MB"
- "Failed to upload banner"
- "Please fix validation errors before saving"
- Custom error from onSave callback

## Accessibility

### ARIA Labels

```jsx
<Switch aria-label="Enable public link" />
<Input aria-label="Public URL slug" />
<Input aria-label="Security token" />
<Button aria-label="Copy public URL" />
<Button aria-label="Copy security token" />
<Button aria-label="Regenerate security token" />
<Input aria-label="Link expiration date" />
<Input aria-label="Maximum number of submissions" />
<Button aria-label="Download QR code" />
<Button aria-label="Remove banner" />
```

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Tab order follows visual layout
- Enter/Space to activate buttons
- Escape to close dialogs

### Screen Readers

- Descriptive labels for all inputs
- Error messages announced on validation
- State changes announced (enabled/disabled)
- Button purposes clearly described

## Integration with Backend

### API Endpoint Structure

```javascript
// GET /api/v1/forms/:formId/public-link
// Response:
{
  "enabled": true,
  "slug": "customer-feedback",
  "token": "abc123...",
  "banner": { "url": "...", "alt": "..." },
  "expiresAt": "2025-12-31T23:59:59Z",
  "maxSubmissions": 1000,
  "submissionCount": 235,
  "createdAt": "2025-10-01T00:00:00Z"
}

// PUT /api/v1/forms/:formId/public-link
// Request body:
{
  "enabled": true,
  "slug": "new-slug",
  "token": "xyz789...",
  "banner": { "url": "...", "alt": "..." },
  "expiresAt": null,
  "maxSubmissions": null
}

// Response: Same as GET
```

### Database Schema Recommendation

```sql
CREATE TABLE form_public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  slug VARCHAR(50) NOT NULL UNIQUE,
  token CHAR(32) NOT NULL,
  banner_url TEXT,
  banner_alt TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_submissions INTEGER,
  submission_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT slug_no_consecutive_hyphens CHECK (slug !~ '--'),
  CONSTRAINT slug_no_leading_trailing_hyphen CHECK (
    slug !~ '^-' AND slug !~ '-$'
  )
);

CREATE INDEX idx_form_public_links_slug ON form_public_links(slug);
CREATE INDEX idx_form_public_links_form_id ON form_public_links(form_id);
CREATE INDEX idx_form_public_links_enabled ON form_public_links(enabled)
  WHERE enabled = true;
```

## Styling

### CSS Classes Used

The component uses Tailwind CSS with custom Q-Collector classes:

- `glass-container` - Glass morphism effect
- `blur-edge` - Subtle edge blur
- `focus-orange-neon` - Orange neon glow on focus
- `hover-orange-neon` - Orange neon glow on hover

### Dark Mode

All colors use Tailwind's dark mode variants:
- `bg-gray-50 dark:bg-gray-900`
- `text-gray-600 dark:text-gray-400`
- `border-gray-200 dark:border-gray-700`

## Testing Checklist

- [ ] Enable/disable toggle works
- [ ] Disable confirmation dialog appears
- [ ] Slug validation shows correct errors
- [ ] Auto-slug generation from form title
- [ ] Copy URL to clipboard works
- [ ] Copy token to clipboard works
- [ ] Token regeneration works
- [ ] Token regeneration confirmation dialog appears
- [ ] Banner upload validates file type
- [ ] Banner upload validates file size
- [ ] Banner preview displays correctly
- [ ] Banner removal works
- [ ] Expiration date picker works
- [ ] Max submissions input accepts numbers only
- [ ] QR code generates correctly
- [ ] QR code download works
- [ ] Statistics display correctly
- [ ] Save button disabled when invalid
- [ ] Save calls onSave with correct data
- [ ] Cancel calls onCancel
- [ ] Toast notifications appear
- [ ] Responsive on mobile
- [ ] Dark mode works
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes

## Troubleshooting

### QR Code not displaying

**Check:**
- `qrcode.react` package installed
- Canvas element has ID `qr-code-canvas`
- Public URL is valid

### Copy to clipboard not working

**Check:**
- HTTPS or localhost (clipboard API requires secure context)
- Browser permissions
- Toast notifications appear

### Banner upload fails

**Check:**
- File type is JPG or PNG
- File size is less than 2MB
- MinIO integration configured
- FileService available

### Slug validation too strict

**Solution:**
- Modify validation regex in `validateSlug()` function
- Update error messages accordingly
- Update database constraints to match

## Future Enhancements

- [ ] Drag-and-drop banner upload
- [ ] Banner image cropping/resizing
- [ ] QR code customization (colors, logo)
- [ ] Preview mode (open public URL in new tab)
- [ ] Analytics integration (track link clicks)
- [ ] Multiple QR code formats (SVG, PDF)
- [ ] Scheduled activation (future start date)
- [ ] Custom thank you message
- [ ] Redirect after submission
- [ ] Custom CSS for public form
- [ ] Password protection option
- [ ] Whitelist IP addresses

## License

Internal Use - Q-Collector Enterprise v0.9.0-dev

## Author

Created for the Public Form Link System v0.9.0-dev

## Last Updated

2025-10-26
