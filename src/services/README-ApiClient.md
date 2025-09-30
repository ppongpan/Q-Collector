# API Client Documentation

## Overview

The API Client infrastructure provides a robust, production-ready HTTP client for Q-Collector Frontend-Backend integration. Built on axios with advanced features like automatic token refresh, retry logic, and comprehensive error handling.

## Architecture

```
src/
├── config/
│   └── api.config.js        # Central API configuration
├── services/
│   └── ApiClient.js         # Axios client with interceptors
└── utils/
    └── apiHelpers.js        # Helper utilities
```

## Quick Start

### 1. Basic Usage

```javascript
import apiClient from './services/ApiClient';

// GET request
const forms = await apiClient.get('/api/forms');

// POST request
const newForm = await apiClient.post('/api/forms', {
  title: 'Survey Form',
  description: 'Customer feedback survey'
});

// PUT request
const updated = await apiClient.put('/api/forms/123', {
  title: 'Updated Title'
});

// DELETE request
await apiClient.delete('/api/forms/123');
```

### 2. File Upload with Progress

```javascript
import apiClient from './services/ApiClient';
import { createFormData } from './utils/apiHelpers';

// Single file upload
const formData = new FormData();
formData.append('file', fileObject);

const result = await apiClient.upload(
  '/api/files/upload',
  formData,
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);

// Multiple files with metadata
const data = {
  files: [file1, file2],
  formId: '123',
  fieldId: 'field_1'
};

const formData = createFormData(data);
const result = await apiClient.upload('/api/files/upload', formData);
```

### 3. Authentication

```javascript
import apiClient from './services/ApiClient';
import API_CONFIG from './config/api.config';

// Login
const response = await apiClient.post(API_CONFIG.endpoints.auth.login, {
  email: 'user@example.com',
  password: 'password123'
});

// Store tokens
apiClient.setToken(response.token);
apiClient.setRefreshToken(response.refreshToken);

// All subsequent requests will include the token automatically

// Logout
await apiClient.post(API_CONFIG.endpoints.auth.logout);
apiClient.clearAuth();
```

## Features

### 1. Automatic Token Management

- **Auto-inject tokens**: JWT token automatically added to all requests
- **Token refresh**: Automatically refreshes expired tokens
- **Token storage**: Tokens stored in localStorage with configurable keys

```javascript
// Tokens are managed automatically
// No need to manually add Authorization header

// Get current token
const token = apiClient.getToken();

// Set token manually (usually not needed)
apiClient.setToken('new-token');

// Clear all auth data
apiClient.clearAuth();
```

### 2. Retry Logic with Exponential Backoff

- **Automatic retries**: Failed requests automatically retried up to 3 times
- **Exponential backoff**: Delay increases exponentially (1s, 2s, 4s)
- **Retryable errors**: Network errors and 5xx status codes

```javascript
// Configuration in api.config.js
retry: {
  maxRetries: 3,
  retryDelay: 1000, // ms
  retryableStatuses: [408, 429, 500, 502, 503, 504],
}
```

### 3. Comprehensive Error Handling

```javascript
import { parseApiError, isNetworkError, isAuthError } from './utils/apiHelpers';

try {
  const data = await apiClient.get('/api/forms');
} catch (error) {
  // User-friendly error message (Thai)
  const message = parseApiError(error);
  console.error(message);

  // Check error type
  if (isNetworkError(error)) {
    // Handle network error
  } else if (isAuthError(error)) {
    // Handle auth error
  } else if (error.status === 404) {
    // Handle not found
  }
}
```

### 4. Request Cancellation

```javascript
// Create cancel token
const cancelToken = apiClient.createCancelToken();

// Make cancellable request
const promise = apiClient.get('/api/forms', {
  cancelToken: cancelToken.token
});

// Cancel request
cancelToken.cancel('Request cancelled by user');

// Check if error is cancellation
try {
  await promise;
} catch (error) {
  if (apiClient.isCancel(error)) {
    console.log('Request was cancelled');
  }
}
```

### 5. Query String Building

```javascript
import { buildQueryString } from './utils/apiHelpers';

// Build query string
const params = {
  page: 1,
  limit: 10,
  search: 'test',
  roles: ['admin', 'user'],
  filters: { status: 'active' }
};

const queryString = buildQueryString(params);
// Returns: "page=1&limit=10&search=test&roles[]=admin&roles[]=user&filters=%7B%22status%22%3A%22active%22%7D"

// Use with apiClient
const forms = await apiClient.get(`/api/forms?${queryString}`);
```

### 6. Date Formatting

```javascript
import { formatApiDate, parseApiDate, formatDisplayDate } from './utils/apiHelpers';

// Format date for API (ISO 8601)
const apiDate = formatApiDate(new Date());
// Returns: "2025-01-21T10:30:00.000Z"

// Parse API response date
const date = parseApiDate("2025-01-21T10:30:00.000Z");
// Returns: Date object

// Format for display (Thai format)
const display = formatDisplayDate(new Date());
// Returns: "21 ม.ค. 2568"
```

### 7. Input Validation

```javascript
import { isValidEmail, isValidThaiPhone } from './utils/apiHelpers';

// Validate email
if (!isValidEmail('user@example.com')) {
  // Show error
}

// Validate Thai phone number
if (!isValidThaiPhone('0812345678')) {
  // Show error
}
```

### 8. File Size Formatting

```javascript
import { formatFileSize } from './utils/apiHelpers';

const size = formatFileSize(1024000);
// Returns: "1000 KB"
```

### 9. Debounce & Throttle

```javascript
import { debounce, throttle } from './utils/apiHelpers';

// Debounce API calls (wait for user to stop typing)
const searchForms = debounce(async (query) => {
  const results = await apiClient.get(`/api/forms/search?q=${query}`);
  setResults(results);
}, 300);

// Throttle API calls (limit rate of calls)
const trackScroll = throttle(() => {
  apiClient.post('/api/analytics/scroll', { position: window.scrollY });
}, 1000);
```

## API Configuration

### Environment Variables

Create `.env` file with:

```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

### Endpoints Configuration

All API endpoints are centralized in `api.config.js`:

```javascript
import API_CONFIG from './config/api.config';

// Use predefined endpoints
const loginUrl = API_CONFIG.endpoints.auth.login;
const formUrl = API_CONFIG.endpoints.forms.byId('123');

// Or use custom endpoints
await apiClient.get('/api/custom-endpoint');
```

## Error Handling Best Practices

### 1. Component-Level Error Handling

```javascript
import { useState } from 'react';
import apiClient from './services/ApiClient';
import { parseApiError } from './utils/apiHelpers';

function FormList() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadForms = async () => {
    try {
      setLoading(true);
      setError(null);
      const forms = await apiClient.get('/api/forms');
      setForms(forms);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {loading && <div>Loading...</div>}
      {/* ... */}
    </div>
  );
}
```

### 2. Global Error Handling

```javascript
// In App.js or root component
import { useEffect } from 'react';
import apiClient from './services/ApiClient';

function App() {
  useEffect(() => {
    // Add global error handler
    const interceptor = apiClient.client.interceptors.response.use(
      response => response,
      error => {
        // Log to error tracking service
        if (window.Sentry) {
          window.Sentry.captureException(error);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.client.interceptors.response.eject(interceptor);
    };
  }, []);

  return <div>{/* ... */}</div>;
}
```

## Testing

### Mock API Client for Tests

```javascript
// __mocks__/ApiClient.js
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  upload: jest.fn(),
};

export default mockApiClient;
```

### Test Example

```javascript
import apiClient from './services/ApiClient';

jest.mock('./services/ApiClient');

describe('FormService', () => {
  it('should fetch forms', async () => {
    const mockForms = [{ id: '1', title: 'Test Form' }];
    apiClient.get.mockResolvedValue(mockForms);

    const forms = await FormService.getForms();

    expect(apiClient.get).toHaveBeenCalledWith('/api/forms');
    expect(forms).toEqual(mockForms);
  });
});
```

## Production Considerations

### 1. Environment-Specific Configuration

```javascript
// api.config.js
if (process.env.REACT_APP_ENV === 'production') {
  API_CONFIG.timeout = 60000;
  API_CONFIG.retry.maxRetries = 5;
}
```

### 2. Error Tracking

```javascript
// Add Sentry or similar error tracking
import * as Sentry from '@sentry/react';

// In interceptor
if (process.env.REACT_APP_ENV === 'production') {
  Sentry.captureException(error);
}
```

### 3. Request Logging

```javascript
// Disable in production
if (process.env.REACT_APP_ENV === 'development') {
  console.log('[API Request]', config);
}
```

## Common Patterns

### 1. Service Layer Pattern

```javascript
// services/FormService.js
import apiClient from './ApiClient';
import API_CONFIG from '../config/api.config';

class FormService {
  async getForms(params = {}) {
    const queryString = buildQueryString(params);
    return apiClient.get(`${API_CONFIG.endpoints.forms.base}?${queryString}`);
  }

  async getForm(id) {
    return apiClient.get(API_CONFIG.endpoints.forms.byId(id));
  }

  async createForm(data) {
    return apiClient.post(API_CONFIG.endpoints.forms.base, data);
  }

  async updateForm(id, data) {
    return apiClient.put(API_CONFIG.endpoints.forms.byId(id), data);
  }

  async deleteForm(id) {
    return apiClient.delete(API_CONFIG.endpoints.forms.byId(id));
  }

  async publishForm(id) {
    return apiClient.post(API_CONFIG.endpoints.forms.publish(id));
  }
}

export default new FormService();
```

### 2. Custom Hook Pattern

```javascript
// hooks/useApi.js
import { useState, useEffect } from 'react';
import { parseApiError } from '../utils/apiHelpers';

export function useApi(apiFunc, immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (...params) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunc(...params);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, []);

  return { data, loading, error, execute };
}

// Usage
function FormList() {
  const { data: forms, loading, error } = useApi(
    () => apiClient.get('/api/forms')
  );

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {forms && <FormTable forms={forms} />}
    </div>
  );
}
```

## Troubleshooting

### Issue: CORS errors

**Solution**: Ensure backend has correct CORS configuration:

```javascript
// backend/server.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

### Issue: Token not being sent

**Solution**: Check token is stored and withCredentials is enabled:

```javascript
// Check token
console.log(apiClient.getToken());

// Ensure withCredentials is true in api.config.js
withCredentials: true
```

### Issue: Requests timing out

**Solution**: Increase timeout in api.config.js:

```javascript
timeout: 60000, // 60 seconds
```

## Next Steps

1. **Create Service Layer**: Implement FormService, SubmissionService, FileService
2. **Add React Hooks**: Create useAuth, useForms, useSubmissions hooks
3. **Implement Error Boundaries**: Add React error boundaries for graceful error handling
4. **Add Loading States**: Implement skeleton loaders and progress indicators
5. **Setup Error Tracking**: Integrate Sentry or similar service for production

---

**Version**: 0.4.1
**Last Updated**: 2025-01-21