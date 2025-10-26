# PublicLinkSettings Integration Checklist

Quick reference guide for integrating the PublicLinkSettings component into your form builder.

## Prerequisites

### 1. Dependencies Installed ✅
```bash
npm install qrcode.react @radix-ui/react-alert-dialog
```

All dependencies are already installed in the project.

### 2. Required UI Components ✅
- [x] `src/components/ui/card.jsx`
- [x] `src/components/ui/label.jsx`
- [x] `src/components/ui/input.jsx`
- [x] `src/components/ui/button.jsx`
- [x] `src/components/ui/switch.jsx`
- [x] `src/components/ui/alert-dialog.jsx`

All components have been created.

## Frontend Integration Steps

### Step 1: Import Component
```jsx
// In your Form Builder component (e.g., EnhancedFormBuilder.jsx)
import PublicLinkSettings from './form-builder/PublicLinkSettings';
```

### Step 2: Add State Management
```jsx
// Add to your form builder state
const [showPublicLinkSettings, setShowPublicLinkSettings] = useState(false);
const [publicLinkSettings, setPublicLinkSettings] = useState({
  enabled: false,
  slug: '',
  token: '',
  banner: null,
  expiresAt: null,
  maxSubmissions: null,
  submissionCount: 0,
  createdAt: new Date().toISOString()
});
```

### Step 3: Load Settings (when form exists)
```jsx
useEffect(() => {
  if (formId) {
    loadPublicLinkSettings();
  }
}, [formId]);

const loadPublicLinkSettings = async () => {
  try {
    const response = await fetch(`/api/v1/forms/${formId}/public-link`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      setPublicLinkSettings(data);
    }
  } catch (error) {
    console.error('Failed to load public link settings:', error);
  }
};
```

### Step 4: Implement Save Handler
```jsx
const handleSavePublicLink = async (settings) => {
  try {
    const response = await fetch(`/api/v1/forms/${formId}/public-link`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save settings');
    }

    const data = await response.json();
    setPublicLinkSettings(data);
    setShowPublicLinkSettings(false);
  } catch (error) {
    console.error('Save error:', error);
    throw error; // Component will show toast
  }
};
```

### Step 5: Add to UI
```jsx
// Add a button in your form builder toolbar
<Button
  onClick={() => setShowPublicLinkSettings(true)}
  variant="outline"
>
  🔗 Public Link
</Button>

// Add the settings panel (modal or inline)
{showPublicLinkSettings && (
  <PublicLinkSettings
    formId={formId}
    initialSettings={{
      ...publicLinkSettings,
      formTitle: form.title // For auto-slug generation
    }}
    onSave={handleSavePublicLink}
    onCancel={() => setShowPublicLinkSettings(false)}
  />
)}
```

## Backend Implementation Steps

### Step 1: Database Migration

Create migration file: `migrations/YYYYMMDDHHMMSS-create-form-public-links.js`

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('form_public_links', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      form_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      token: {
        type: Sequelize.CHAR(32),
        allowNull: false
      },
      banner_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      banner_alt: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      max_submissions: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      submission_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('form_public_links', ['slug'], {
      unique: true,
      name: 'idx_form_public_links_slug'
    });

    await queryInterface.addIndex('form_public_links', ['form_id'], {
      name: 'idx_form_public_links_form_id'
    });

    await queryInterface.addIndex('form_public_links', ['enabled'], {
      name: 'idx_form_public_links_enabled',
      where: { enabled: true }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('form_public_links');
  }
};
```

### Step 2: Sequelize Model

Create: `backend/models/FormPublicLink.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const FormPublicLink = sequelize.define('FormPublicLink', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    formId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'form_id'
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/,
        notEmpty: true,
        len: [3, 50],
        noConsecutiveHyphens(value) {
          if (/--/.test(value)) {
            throw new Error('Slug cannot contain consecutive hyphens');
          }
        },
        noLeadingTrailingHyphen(value) {
          if (value.startsWith('-') || value.endsWith('-')) {
            throw new Error('Slug cannot start or end with hyphen');
          }
        }
      }
    },
    token: {
      type: DataTypes.CHAR(32),
      allowNull: false,
      validate: {
        is: /^[a-f0-9]{32}$/
      }
    },
    bannerUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'banner_url'
    },
    bannerAlt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'banner_alt'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    maxSubmissions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_submissions',
      validate: {
        min: 1
      }
    },
    submissionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'submission_count'
    }
  }, {
    tableName: 'form_public_links',
    underscored: true,
    timestamps: true
  });

  FormPublicLink.associate = (models) => {
    FormPublicLink.belongsTo(models.Form, {
      foreignKey: 'form_id',
      as: 'form'
    });
  };

  return FormPublicLink;
};
```

### Step 3: API Routes

Add to: `backend/api/routes/form.routes.js`

```javascript
// Get public link settings
router.get('/:formId/public-link',
  authMiddleware,
  async (req, res) => {
    try {
      const { formId } = req.params;
      const { FormPublicLink } = require('../../models');

      // Check user has permission to view form
      const form = await Form.findByPk(formId);
      if (!form) {
        return res.status(404).json({ message: 'Form not found' });
      }

      // Check permissions (implement based on your RBAC)
      // if (!canUserEditForm(req.user, form)) {
      //   return res.status(403).json({ message: 'Forbidden' });
      // }

      let publicLink = await FormPublicLink.findOne({
        where: { form_id: formId }
      });

      if (!publicLink) {
        // Create default settings
        publicLink = await FormPublicLink.create({
          form_id: formId,
          enabled: false,
          slug: form.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50),
          token: generateToken()
        });
      }

      res.json(publicLink.toJSON());
    } catch (error) {
      console.error('Get public link error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Update public link settings
router.put('/:formId/public-link',
  authMiddleware,
  [
    body('enabled').isBoolean(),
    body('slug').isLength({ min: 3, max: 50 }).matches(/^[a-z0-9-]+$/),
    body('token').isLength({ min: 32, max: 32 }).matches(/^[a-f0-9]{32}$/),
    body('expiresAt').optional({ nullable: true }).isISO8601(),
    body('maxSubmissions').optional({ nullable: true }).isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { formId } = req.params;
      const { FormPublicLink } = require('../../models');

      // Check permissions
      const form = await Form.findByPk(formId);
      if (!form) {
        return res.status(404).json({ message: 'Form not found' });
      }

      // Check slug uniqueness (excluding current form)
      const existingSlug = await FormPublicLink.findOne({
        where: {
          slug: req.body.slug,
          form_id: { [Op.ne]: formId }
        }
      });

      if (existingSlug) {
        return res.status(400).json({
          message: `ชื่อ URL "${req.body.slug}" มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น`
        });
      }

      // Update or create
      const [publicLink, created] = await FormPublicLink.upsert({
        form_id: formId,
        enabled: req.body.enabled,
        slug: req.body.slug,
        token: req.body.token,
        banner_url: req.body.banner?.url || null,
        banner_alt: req.body.banner?.alt || null,
        expires_at: req.body.expiresAt || null,
        max_submissions: req.body.maxSubmissions || null
      }, {
        returning: true
      });

      res.json(publicLink.toJSON());
    } catch (error) {
      console.error('Update public link error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Helper function to generate token
function generateToken() {
  const chars = 'abcdef0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}
```

### Step 4: Public Submission Endpoint

Add to: `backend/api/routes/public.routes.js` (new file)

```javascript
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { FormPublicLink, Form, Submission } = require('../../models');

// Get public form
router.get('/forms/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { token } = req.query;

    const publicLink = await FormPublicLink.findOne({
      where: { slug, enabled: true },
      include: [{ model: Form, as: 'form' }]
    });

    if (!publicLink) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Verify token
    if (publicLink.token !== token) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Check expiration
    if (publicLink.expiresAt && new Date() > new Date(publicLink.expiresAt)) {
      return res.status(410).json({ message: 'Form has expired' });
    }

    // Check submission limit
    if (publicLink.maxSubmissions &&
        publicLink.submissionCount >= publicLink.maxSubmissions) {
      return res.status(429).json({ message: 'Submission limit reached' });
    }

    res.json({
      form: publicLink.form,
      banner: publicLink.bannerUrl ? {
        url: publicLink.bannerUrl,
        alt: publicLink.bannerAlt
      } : null
    });
  } catch (error) {
    console.error('Get public form error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Submit to public form
router.post('/forms/:slug/submit',
  [
    body('token').isLength({ min: 32, max: 32 }),
    body('data').isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { slug } = req.params;
      const { token, data } = req.body;

      const publicLink = await FormPublicLink.findOne({
        where: { slug, enabled: true },
        include: [{ model: Form, as: 'form' }]
      });

      if (!publicLink || publicLink.token !== token) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Check expiration
      if (publicLink.expiresAt && new Date() > new Date(publicLink.expiresAt)) {
        return res.status(410).json({ message: 'Form has expired' });
      }

      // Check submission limit
      if (publicLink.maxSubmissions &&
          publicLink.submissionCount >= publicLink.maxSubmissions) {
        return res.status(429).json({ message: 'Submission limit reached' });
      }

      // Create submission (anonymous)
      const submission = await Submission.create({
        form_id: publicLink.formId,
        submitted_by: null, // Anonymous
        data: data,
        submitted_at: new Date()
      });

      // Increment submission count
      await publicLink.increment('submission_count');

      res.status(201).json({
        message: 'Submission received',
        submissionId: submission.id
      });
    } catch (error) {
      console.error('Public submission error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
```

## Testing Checklist

### Frontend Tests
- [ ] Component renders without errors
- [ ] Enable/disable toggle works
- [ ] Slug validation shows errors
- [ ] Copy buttons work (URL, token)
- [ ] Token regeneration works
- [ ] Banner upload validates correctly
- [ ] QR code generates and downloads
- [ ] Statistics display correctly
- [ ] Save button works
- [ ] Cancel button works
- [ ] Toast notifications appear

### Backend Tests
- [ ] Migration runs successfully
- [ ] Model validates slug format
- [ ] API endpoints return correct data
- [ ] Slug uniqueness enforced
- [ ] Token validation works
- [ ] Expiration check works
- [ ] Submission limit works
- [ ] Anonymous submissions created

### Integration Tests
- [ ] Settings save to database
- [ ] Settings load correctly
- [ ] Public URL is accessible
- [ ] Public submissions work
- [ ] Counter increments correctly
- [ ] Limits enforced correctly

## Deployment Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Database Migration**
   ```bash
   npx sequelize-cli db:migrate
   ```

3. **Register Model**
   Add to `backend/models/index.js`:
   ```javascript
   const FormPublicLink = require('./FormPublicLink');
   // ... in models object:
   FormPublicLink: FormPublicLink(sequelize, Sequelize.DataTypes),
   ```

4. **Register Routes**
   Add to `backend/api/server.js`:
   ```javascript
   const publicRoutes = require('./routes/public.routes');
   app.use('/api/v1/public', publicRoutes);
   ```

5. **Test in Development**
   ```bash
   npm start
   ```

6. **Build for Production**
   ```bash
   npm run build
   ```

## Troubleshooting

### Issue: Component not rendering
**Solution**: Check console for import errors, verify all UI components exist

### Issue: Slug validation too strict
**Solution**: Modify `validateSlug()` function in component

### Issue: QR code not generating
**Solution**: Verify qrcode.react is installed, check canvas support

### Issue: Copy to clipboard fails
**Solution**: Ensure HTTPS or localhost (Clipboard API requirement)

### Issue: Database migration fails
**Solution**: Check PostgreSQL version, verify constraint syntax

### Issue: Slug already exists error
**Solution**: Backend must check uniqueness excluding current form

## Quick Reference

### Component Props
```typescript
formId: string
initialSettings?: PublicLinkSettings
onSave: (settings) => Promise<void>
onCancel: () => void
```

### API Endpoints
```
GET    /api/v1/forms/:formId/public-link
PUT    /api/v1/forms/:formId/public-link
GET    /api/v1/public/forms/:slug?token=xxx
POST   /api/v1/public/forms/:slug/submit
```

### Required Permissions
- View form settings: `canViewForm`
- Edit form settings: `canEditForm`
- Submit to public form: None (anonymous)

## Support

- **Documentation**: `README-PublicLinkSettings.md`
- **Visual Guide**: `COMPONENT-STRUCTURE.txt`
- **Example Code**: `PublicLinkSettingsExample.jsx`
- **Implementation**: `PUBLIC-LINK-SETTINGS-IMPLEMENTATION.md`

## Version

Component Version: v1.0.0
Q-Collector Version: v0.9.0-dev
Last Updated: 2025-10-26
