# API Client - Quick Reference Card

## Import

```javascript
import apiClient from './services/ApiClient';
import API_CONFIG from './config/api.config';
import { parseApiError, buildQueryString, formatApiDate } from './utils/apiHelpers';
```

---

## HTTP Methods

```javascript
// GET
const data = await apiClient.get('/api/forms');
const data = await apiClient.get('/api/forms/123');

// POST
const result = await apiClient.post('/api/forms', { title: 'Form' });

// PUT
const result = await apiClient.put('/api/forms/123', { title: 'Updated' });

// PATCH
const result = await apiClient.patch('/api/forms/123', { status: 'published' });

// DELETE
const result = await apiClient.delete('/api/forms/123');
```

---

## Authentication

```javascript
// Login
const { token, refreshToken } = await apiClient.post(
  API_CONFIG.endpoints.auth.login,
  { email: 'user@example.com', password: 'pass' }
);
apiClient.setToken(token);
apiClient.setRefreshToken(refreshToken);

// Check token
const token = apiClient.getToken(); // Returns token or null

// Logout
await apiClient.post(API_CONFIG.endpoints.auth.logout);
apiClient.clearAuth();
```

---

## File Upload

```javascript
// With progress
const formData = new FormData();
formData.append('file', fileObject);

const result = await apiClient.upload(
  '/api/files/upload',
  formData,
  (progress) => console.log(`${progress}%`)
);

// Multiple files
import { createFormData } from './utils/apiHelpers';
const formData = createFormData({
  files: [file1, file2],
  formId: '123'
});
```

---

## File Download

```javascript
await apiClient.download('/api/files/123/download', 'filename.pdf');
```

---

## Query Strings

```javascript
import { buildQueryString } from './utils/apiHelpers';

const params = { page: 1, limit: 10, search: 'test' };
const query = buildQueryString(params);
// Returns: "page=1&limit=10&search=test"

await apiClient.get(`/api/forms?${query}`);
```

---

## Error Handling

```javascript
import { parseApiError, isNetworkError, isAuthError } from './utils/apiHelpers';

try {
  await apiClient.get('/api/forms');
} catch (error) {
  // Get Thai error message
  const message = parseApiError(error);
  console.error(message);

  // Check error type
  if (isNetworkError(error)) {
    // Network problem
  } else if (isAuthError(error)) {
    // 401 or 403
  } else if (error.status === 404) {
    // Not found
  }
}
```

---

## Date Formatting

```javascript
import { formatApiDate, parseApiDate, formatDisplayDate } from './utils/apiHelpers';

// For API (ISO 8601)
const apiDate = formatApiDate(new Date());
// "2025-01-21T10:30:00.000Z"

// From API
const date = parseApiDate("2025-01-21T10:30:00.000Z");
// Date object

// For display (Thai)
const display = formatDisplayDate(new Date());
// "21 ม.ค. 2568"
```

---

## Validation

```javascript
import { isValidEmail, isValidThaiPhone } from './utils/apiHelpers';

isValidEmail('user@example.com'); // true
isValidThaiPhone('0812345678'); // true
```

---

## Utilities

```javascript
import { formatFileSize, debounce, throttle, sanitizeInput } from './utils/apiHelpers';

// File size
formatFileSize(1048576); // "1 MB"

// Debounce (wait for user to stop)
const search = debounce(async (query) => {
  await apiClient.get(`/api/search?q=${query}`);
}, 300);

// Throttle (limit rate)
const track = throttle(() => {
  apiClient.post('/api/analytics', { data });
}, 1000);

// Sanitize input
const clean = sanitizeInput(userInput);
```

---

## Request Cancellation

```javascript
const cancelToken = apiClient.createCancelToken();

const promise = apiClient.get('/api/forms', {
  cancelToken: cancelToken.token
});

// Cancel request
cancelToken.cancel('User cancelled');

// Check if cancelled
try {
  await promise;
} catch (error) {
  if (apiClient.isCancel(error)) {
    console.log('Cancelled');
  }
}
```

---

## Predefined Endpoints

```javascript
import API_CONFIG from './config/api.config';

// Auth
API_CONFIG.endpoints.auth.login          // '/api/auth/login'
API_CONFIG.endpoints.auth.register       // '/api/auth/register'
API_CONFIG.endpoints.auth.logout         // '/api/auth/logout'
API_CONFIG.endpoints.auth.refresh        // '/api/auth/refresh'

// Forms
API_CONFIG.endpoints.forms.base          // '/api/forms'
API_CONFIG.endpoints.forms.byId('123')   // '/api/forms/123'
API_CONFIG.endpoints.forms.publish('123') // '/api/forms/123/publish'

// Submissions
API_CONFIG.endpoints.submissions.base              // '/api/submissions'
API_CONFIG.endpoints.submissions.byId('123')       // '/api/submissions/123'
API_CONFIG.endpoints.submissions.byForm('456')     // '/api/submissions/form/456'
API_CONFIG.endpoints.submissions.export('456')     // '/api/submissions/form/456/export'

// Files
API_CONFIG.endpoints.files.upload        // '/api/files/upload'
API_CONFIG.endpoints.files.byId('123')   // '/api/files/123'
API_CONFIG.endpoints.files.download('123') // '/api/files/123/download'
```

---

## Configuration

```javascript
// .env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development

// In code
console.log(API_CONFIG.baseURL);    // 'http://localhost:5000'
console.log(API_CONFIG.timeout);    // 30000
console.log(API_CONFIG.retry.maxRetries); // 3
```

---

## Common Patterns

### React Component
```javascript
function FormList() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadForms = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get('/api/forms');
        setForms(data);
      } catch (err) {
        setError(parseApiError(err));
      } finally {
        setLoading(false);
      }
    };
    loadForms();
  }, []);

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {forms.map(form => <div key={form.id}>{form.title}</div>)}
    </div>
  );
}
```

### Service Class
```javascript
class FormService {
  async getForms(params = {}) {
    const query = buildQueryString(params);
    return apiClient.get(`/api/forms?${query}`);
  }

  async getForm(id) {
    return apiClient.get(`/api/forms/${id}`);
  }

  async createForm(data) {
    return apiClient.post('/api/forms', data);
  }

  async updateForm(id, data) {
    return apiClient.put(`/api/forms/${id}`, data);
  }

  async deleteForm(id) {
    return apiClient.delete(`/api/forms/${id}`);
  }
}

export default new FormService();
```

### Custom Hook
```javascript
function useApi(apiFunc) {
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
      setError(parseApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

// Usage
const { data, loading, error, execute } = useApi(apiClient.get);
await execute('/api/forms');
```

---

## Thai Error Messages

| Status | Message (Thai) |
|--------|----------------|
| 400 | ข้อมูลที่ส่งมาไม่ถูกต้อง |
| 401 | กรุณาเข้าสู่ระบบใหม่ |
| 403 | คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ |
| 404 | ไม่พบข้อมูลที่ต้องการ |
| 409 | ข้อมูลซ้ำกับที่มีอยู่แล้ว |
| 422 | ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด |
| 500 | เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ |
| Network | ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ |
| Timeout | การเชื่อมต่อหมดเวลา |

---

## Development Logging

```javascript
// Automatic in development mode
// Request logs show: method, url, data, params
// Response logs show: status, url, data
// Error logs show: status, url, message, data

// Disable by setting:
REACT_APP_ENV=production
```

---

**Version**: 0.4.1 | **Updated**: 2025-01-21