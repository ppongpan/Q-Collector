/**
 * Swagger Setup and Integration
 * Complete API documentation configuration for Q-Collector Backend
 */

const swaggerUi = require('swagger-ui-express');
const { specs } = require('./swagger.config');

/**
 * Swagger UI Options
 */
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestInterceptor: (request) => {
      // Add any request interceptor logic here
      return request;
    },
    responseInterceptor: (response) => {
      // Add any response interceptor logic here
      return response;
    },
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #f97316; }
    .swagger-ui .scheme-container { background: #fafafa; padding: 15px; border-radius: 5px; }
    .swagger-ui .auth-wrapper { margin-top: 20px; }
    .swagger-ui .btn.authorize { background-color: #f97316; border-color: #f97316; }
    .swagger-ui .btn.authorize:hover { background-color: #ea580c; border-color: #ea580c; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
    .swagger-ui .opblock.opblock-put { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
  `,
  customSiteTitle: "Q-Collector API Documentation",
  customfavIcon: "/favicon.ico",
  customJs: [
    '/api/v1/docs/swagger-custom.js'
  ]
};

/**
 * Setup Swagger middleware
 */
function setupSwagger(app) {
  // Serve Swagger UI at /api/v1/docs
  app.use('/api/v1/docs', swaggerUi.serve);
  app.get('/api/v1/docs', swaggerUi.setup(specs, swaggerOptions));

  // Serve OpenAPI JSON spec at /api/v1/docs.json
  app.get('/api/v1/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Serve custom JavaScript for Swagger UI
  app.get('/api/v1/docs/swagger-custom.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
      // Custom JavaScript for Swagger UI
      window.onload = function() {
        // Set default authorization
        const ui = window.ui;
        if (ui) {
          // Auto-focus on the first endpoint
          setTimeout(() => {
            const firstEndpoint = document.querySelector('.opblock-summary');
            if (firstEndpoint) {
              firstEndpoint.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 1000);

          // Add version info to title
          const title = document.querySelector('.info .title');
          if (title && !title.querySelector('.version-badge')) {
            const versionBadge = document.createElement('span');
            versionBadge.className = 'version-badge';
            versionBadge.style.cssText = \`
              background: #f97316;
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              margin-left: 10px;
              font-weight: normal;
            \`;
            versionBadge.textContent = 'v0.4.1';
            title.appendChild(versionBadge);
          }

          // Add environment indicator
          const info = document.querySelector('.info');
          if (info && !info.querySelector('.env-indicator')) {
            const envIndicator = document.createElement('div');
            envIndicator.className = 'env-indicator';
            envIndicator.style.cssText = \`
              background: #10b981;
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              margin: 16px 0;
              font-weight: 500;
              text-align: center;
            \`;
            envIndicator.textContent = \`Environment: \${window.location.hostname === 'localhost' ? 'Development' : 'Production'}\`;
            info.appendChild(envIndicator);
          }
        }
      };

      // Add keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        // Ctrl+K or Cmd+K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          const searchInput = document.querySelector('.filter-container input');
          if (searchInput) {
            searchInput.focus();
          }
        }

        // Escape to close all operations
        if (e.key === 'Escape') {
          const openOps = document.querySelectorAll('.opblock.is-open .opblock-summary');
          openOps.forEach(op => op.click());
        }
      });

      // Console.log for debugging
      console.log('Q-Collector API Documentation Loaded');
      console.log('Keyboard Shortcuts:');
      console.log('  Ctrl/Cmd + K: Focus search');
      console.log('  Escape: Close all open operations');
    `);
  });

  // Postman collection export endpoint
  app.get('/api/v1/docs/postman', (req, res) => {
    const postmanCollection = generatePostmanCollection(specs);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="Q-Collector-API.postman_collection.json"');
    res.json(postmanCollection);
  });

  console.log('✅ Swagger UI configured successfully');
  console.log('📖 API Documentation available at: /api/v1/docs');
  console.log('📄 OpenAPI JSON spec available at: /api/v1/docs.json');
  console.log('📮 Postman collection available at: /api/v1/docs/postman');
}

/**
 * Generate Postman collection from OpenAPI spec
 */
function generatePostmanCollection(openApiSpec) {
  const collection = {
    info: {
      name: "Q-Collector API",
      description: openApiSpec.info.description,
      version: openApiSpec.info.version,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    auth: {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: "{{access_token}}",
          type: "string"
        }
      ]
    },
    event: [
      {
        listen: "prerequest",
        script: {
          exec: [
            "// Auto-refresh token if expired",
            "const accessToken = pm.environment.get('access_token');",
            "if (!accessToken) {",
            "  console.log('No access token found. Please login first.');",
            "}"
          ]
        }
      }
    ],
    variable: [
      {
        key: "base_url",
        value: "http://localhost:5000/api/v1",
        type: "string"
      },
      {
        key: "access_token",
        value: "",
        type: "string"
      },
      {
        key: "refresh_token",
        value: "",
        type: "string"
      }
    ],
    item: []
  };

  // Convert OpenAPI paths to Postman requests
  Object.entries(openApiSpec.paths || {}).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      if (method === 'parameters') return;

      const item = {
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: "Content-Type",
              value: "application/json",
              type: "text"
            }
          ],
          url: {
            raw: `{{base_url}}${path}`,
            host: ["{{base_url}}"],
            path: path.split('/').filter(p => p)
          },
          description: operation.description
        }
      };

      // Add auth if required
      if (operation.security && operation.security.length > 0) {
        item.request.auth = {
          type: "bearer",
          bearer: [
            {
              key: "token",
              value: "{{access_token}}",
              type: "string"
            }
          ]
        };
      }

      // Add request body for POST/PUT requests
      if (operation.requestBody && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        const schema = operation.requestBody.content?.['application/json']?.schema;
        if (schema && schema.example) {
          item.request.body = {
            mode: "raw",
            raw: JSON.stringify(schema.example, null, 2),
            options: {
              raw: {
                language: "json"
              }
            }
          };
        }
      }

      collection.item.push(item);
    });
  });

  return collection;
}

module.exports = {
  setupSwagger,
  swaggerOptions,
  generatePostmanCollection
};