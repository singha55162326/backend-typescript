import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stadium Booking API',
      version: '1.0.0',
      description: 'API documentation for the Stadium Booking System with full support for users, stadiums, bookings, staff, payments, and analytics.',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'https://api-pos.edl.com.la/api',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // 🔹 User Schema
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            role: {
              type: 'string',
              enum: ['general_user', 'stadium_owner', 'superadmin'],
            },
            status: {
              type: 'string',
              enum: ['active', 'suspended', 'inactive'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['email', 'firstName', 'lastName'],
        },

        // 🔹 Address Schema
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            postalCode: { type: 'string' },
            coordinates: {
              type: 'array',
              items: { type: 'number' },
              example: [102.6, 17.9],
            },
          },
        },

        // 🔹 Pricing Schema
        Pricing: {
          type: 'object',
          properties: {
            baseRate: { type: 'number', minimum: 0 },
            totalAmount: { type: 'number', minimum: 0 },
            currency: { type: 'string', default: 'LAK' },
            taxes: { type: 'number', minimum: 0 },
            refereeCharges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  staffId: { type: 'string' },
                  refereeName: { type: 'string' },
                  hours: { type: 'number' },
                  rate: { type: 'number' },
                  total: { type: 'number' },
                },
              },
            },
            discounts: {
              type: 'array',
              items: { $ref: '#/components/schemas/Discount' },
            },
          },
        },

        // 🔹 Discount Schema
        Discount: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['percentage', 'fixed'] },
            amount: { type: 'number' },
            description: { type: 'string' },
          },
        },

        // 🔹 Payment Schema
        Payment: {
          type: 'object',
          properties: {
            paymentMethod: {
              type: 'string',
              enum: ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'cash'],
            },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'cancelled', 'completed', 'failed', 'refunded'],
            },
            transactionId: { type: 'string' },
            gatewayResponse: { type: 'object' },
            processedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // 🔹 Team Info Schema
        TeamInfo: {
          type: 'object',
          properties: {
            teamName: { type: 'string' },
            contactPerson: { type: 'string' },
            contactPhone: { type: 'string' },
            numberOfPlayers: { type: 'number' },
            experience: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced'],
            },
          },
        },

        // 🔹 Staff Member Schema
        StaffMember: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            specializations: {
              type: 'array',
              items: { type: 'string' },
            },
            certifications: { type: 'array', items: {} },
            availability: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dayOfWeek: { type: 'number', minimum: 0, maximum: 6 },
                  startTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                  endTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                  isAvailable: { type: 'boolean' },
                },
              },
            },
            rates: {
              type: 'object',
              properties: {
                hourlyRate: { type: 'number' },
                currency: { type: 'string' },
                overtime: { type: 'number' },
              },
            },
          },
        },

        // 🔹 Stadium Schema
        Stadium: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
            capacity: { type: 'number' },
            status: { type: 'string', enum: ['active', 'inactive', 'maintenance'] },
            facilities: {
              type: 'object',
              properties: {
                parking: { type: 'boolean' },
                changingRooms: { type: 'number' },
                lighting: { type: 'boolean' },
                seating: { type: 'boolean' },
                refreshments: { type: 'boolean' },
                firstAid: { type: 'boolean' },
                security: { type: 'boolean' },
              },
            },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  fieldType: { type: 'string' },
                  surfaceType: { type: 'string' },
                  dimensions: { type: 'string' },
                  capacity: { type: 'number' },
                  pricing: {
                    type: 'object',
                    properties: {
                      baseHourlyRate: { type: 'number' },
                      currency: { type: 'string' },
                    },
                  },
                },
              },
            },
            images: {
              type: 'array',
              items: { type: 'string' },
            },
            ownerId: { type: 'string', format: 'ObjectId' },
            staff: { type: 'array', items: { $ref: '#/components/schemas/StaffMember' } },
            stats: {
              type: 'object',
              properties: {
                averageRating: { type: 'number' },
                totalBookings: { type: 'number' },
                totalRevenue: { type: 'number' },
                lastUpdated: { type: 'string', format: 'date-time' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        // 🔹 Booking Schema
        Booking: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            bookingNumber: { type: 'string' },
            userId: { type: 'string', format: 'ObjectId' },
            stadiumId: { type: 'string', format: 'ObjectId' },
            fieldId: { type: 'string', format: 'ObjectId' },
            bookingDate: { type: 'string', format: 'date' },
            startTime: {
              type: 'string',
              pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
              example: '14:00',
            },
            endTime: {
              type: 'string',
              pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
              example: '16:00',
            },
            durationHours: { type: 'number', minimum: 0.5 },
            pricing: { $ref: '#/components/schemas/Pricing' },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
              default: 'pending',
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'paid', 'overdue'],
            },
            teamInfo: { $ref: '#/components/schemas/TeamInfo' },
            specialRequests: {
              type: 'array',
              items: { type: 'string' },
            },
            assignedStaff: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  staffId: { type: 'string' },
                  staffName: { type: 'string' },
                  role: { type: 'string', enum: ['referee', 'manager', 'assistant'] },
                },
              },
            },
            cancellation: {
              type: 'object',
              properties: {
                cancelledBy: { type: 'string', format: 'ObjectId' },
                cancelledAt: { type: 'string', format: 'date-time' },
                reason: { type: 'string' },
                refundAmount: { type: 'number' },
              },
            },
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  changedBy: { type: 'string', format: 'ObjectId' },
                  oldValue: { type: 'object' },
                  newValue: { type: 'object' },
                  notes: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
            payments: {
              type: 'array',
              items: { $ref: '#/components/schemas/Payment' },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        // 🔹 Analytics Response
        AnalyticsResponse: {
          type: 'object',
          properties: {
            dailyAnalytics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  totalBookings: { type: 'number' },
                  totalRevenue: { type: 'number' },
                  totalRefereeRevenue: { type: 'number' },
                  statusBreakdown: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        count: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
            staffPerformance: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  refereeName: { type: 'string' },
                  totalBookings: { type: 'number' },
                  totalHours: { type: 'number' },
                  totalEarnings: { type: 'number' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalBookings: { type: 'number' },
                totalRevenue: { type: 'number' },
                totalRefereeRevenue: { type: 'number' },
                currency: { type: 'string' },
              },
            },
          },
        },

        // 🔹 Generic Success Response
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },

    // ======================
    // 🔖 Tags
    // ======================
    tags: [
      { name: 'Authentication', description: 'User login, registration, and profile' },
      { name: 'Users', description: 'Manage users (admin only)' },
      { name: 'Stadiums', description: 'CRUD operations for stadiums' },
      { name: 'Bookings', description: 'Create, view, update, cancel bookings' },
      { name: 'Analytics', description: 'Analytics for stadium owners and admins' },
    ],
  },

  // ======================
  // 📁 Scan All Route Files
  // ======================
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../models/*.ts'),
  ],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      swaggerOptions: {
        persistAuthorization: true,
        tryItOutEnabled: true,
      },
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
      `,
      customSiteTitle: 'Stadium Booking API - Documentation',
    })
  );
};