/**
 * Swagger/OpenAPI Configuration
 * Complete API documentation setup for Q-Collector Backend
 */

const swaggerJsdoc = require('swagger-jsdoc');

/**
 * OpenAPI 3.0 Specification Configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Q-Collector API',
      version: '0.4.1',
      description: `
# Q-Collector Backend API Documentation

**Modern React Form Builder Framework with Advanced Features**

## Overview
Q-Collector is an enterprise-grade form builder and data collection system built with React, Node.js, and PostgreSQL. This API provides comprehensive endpoints for form management, user authentication, file handling, and real-time collaboration.

## Features
- 🔐 **JWT Authentication** - Secure token-based authentication with role-based access control
- 📝 **Form Builder** - Complete CRUD operations for dynamic forms with 17 field types
- 📊 **Data Collection** - Form submissions with validation and export capabilities
- 📁 **File Management** - Upload, download, and manage files with MinIO integration
- 👥 **User Management** - Role-based user administration (Super Admin, Admin, User)
- 🔄 **Real-time Features** - WebSocket integration for live collaboration
- 📈 **Analytics** - Performance monitoring and usage statistics
- 🚀 **Caching** - Redis-based caching for optimal performance

## Architecture
- **Frontend**: React 18 + ShadCN UI + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express.js + Sequelize ORM
- **Database**: PostgreSQL with Redis for caching
- **Storage**: MinIO for file storage
- **Real-time**: Socket.IO for WebSocket communication

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting
API endpoints are rate-limited to prevent abuse:
- **Standard endpoints**: 100 requests per 15 minutes
- **Auth endpoints**: 5 requests per 15 minutes
- **File upload**: 10 requests per hour

## Error Handling
All API responses follow a consistent format:
\`\`\`json
{
  "success": boolean,
  "data": object | array,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": object,
    "timestamp": "ISO 8601 timestamp"
  },
  "meta": {
    "pagination": object,
    "filters": object
  }
}
\`\`\`
      `,
      contact: {
        name: 'Q-Collector Team',
        email: 'pongpanp@qcon.co.th'
      },
      license: {
        name: 'Internal Use Only',
        url: 'https://qcon.co.th'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Development Server'
      },
      {
        url: 'https://api.qcollector.qcon.co.th/api/v1',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
        }
      },
      parameters: {
        // Common path parameters
        userId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'User unique identifier'
        },
        formId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Form unique identifier'
        },
        submissionId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Submission unique identifier'
        },
        fileId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'File unique identifier'
        },
        // Common query parameters
        page: {
          name: 'page',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: 'Page number for pagination'
        },
        limit: {
          name: 'limit',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          },
          description: 'Number of items per page'
        },
        search: {
          name: 'search',
          in: 'query',
          required: false,
          schema: {
            type: 'string'
          },
          description: 'Search query string'
        },
        sortBy: {
          name: 'sortBy',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            enum: ['createdAt', 'updatedAt', 'name', 'email', 'title']
          },
          description: 'Field to sort by'
        },
        sortOrder: {
          name: 'sortOrder',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          },
          description: 'Sort order'
        }
      },
      responses: {
        // Common response schemas
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                  timestamp: '2025-09-30T12:00:00.000Z'
                }
              }
            }
          }
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                  timestamp: '2025-09-30T12:00:00.000Z'
                }
              }
            }
          }
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                  timestamp: '2025-09-30T12:00:00.000Z'
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationErrorResponse'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'An unexpected error occurred',
                  timestamp: '2025-09-30T12:00:00.000Z'
                }
              }
            }
          }
        }
      },
      schemas: {
        // Base response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            meta: {
              type: 'object',
              properties: {
                pagination: {
                  $ref: '#/components/schemas/Pagination'
                }
              }
            }
          },
          required: ['success']
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code'
                },
                message: {
                  type: 'string',
                  description: 'Human readable error message'
                },
                details: {
                  type: 'object',
                  description: 'Additional error details'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Error timestamp'
                }
              },
              required: ['code', 'message', 'timestamp']
            }
          },
          required: ['success', 'error']
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Validation failed'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        description: 'Field name'
                      },
                      message: {
                        type: 'string',
                        description: 'Validation error message'
                      },
                      value: {
                        description: 'Invalid value'
                      }
                    }
                  }
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'integer',
              minimum: 1
            },
            totalPages: {
              type: 'integer',
              minimum: 0
            },
            totalItems: {
              type: 'integer',
              minimum: 0
            },
            itemsPerPage: {
              type: 'integer',
              minimum: 1
            },
            hasNextPage: {
              type: 'boolean'
            },
            hasPrevPage: {
              type: 'boolean'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Users',
        description: 'User management operations (Super Admin only)'
      },
      {
        name: 'Forms',
        description: 'Form builder and management operations'
      },
      {
        name: 'Submissions',
        description: 'Form submission and data collection'
      },
      {
        name: 'Files',
        description: 'File upload, download, and management'
      },
      {
        name: 'WebSocket',
        description: 'Real-time communication and collaboration'
      },
      {
        name: 'Cache',
        description: 'Cache management and performance monitoring'
      },
      {
        name: 'System',
        description: 'System health and monitoring endpoints'
      }
    ]
  },
  apis: [
    './api/routes/*.js',
    './api/app.js',
    './config/swagger.schemas.js',
    './config/swagger.routes.js'
  ]
};

const specs = swaggerJsdoc(swaggerOptions);

module.exports = {
  swaggerOptions,
  specs
};