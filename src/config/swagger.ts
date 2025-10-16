import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express, Request, Response } from 'express';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stadium Booking API',
      version: '1.0.0',
      description: 'API for managing stadium bookings in Laos - Complete Test Suite',
      contact: {
        name: 'API Support',
        email: 'support@stadiumbooking.la',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://api-pos.edl.com.la/api'
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production'
          ? 'Production Server'
          : 'Development Server',
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
        // ======================
        // 🔹 USER
        // ======================
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
              enum: ['general_user', 'stadium_owner', 'admin', 'superadmin'],
            },
            profile: {
              type: 'object',
              properties: {
                gender: { type: 'string', enum: ['male', 'female', 'other'] },
                dateOfBirth: { type: 'string', format: 'date' },
                avatar: { type: 'string' },
                notificationPreferences: {
                  type: 'object',
                  properties: {
                    email: { type: 'boolean' },
                    sms: { type: 'boolean' },
                    promotions: { type: 'boolean' },
                  },
                },
              },
            },
            ownerProfile: {
              type: 'object',
              properties: {
                businessName: { type: 'string' },
                businessRegistrationNumber: { type: 'string' },
                taxId: { type: 'string' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['email', 'role'],
        },

        // ======================
        // 🔹 STADIUM
        // ======================
        Stadium: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                province: { type: 'string' },
                postalCode: { type: 'string' },
                country: { type: 'string', default: 'Laos' },
                coordinates: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['Point'], default: 'Point' },
                    coordinates: {
                      type: 'array',
                      items: { type: 'number' },
                      example: [102.6, 17.9667],
                    },
                  },
                },
              },
            },
            capacity: { type: 'number' },
            facilities: {
              type: 'array',
              items: { type: 'string' },
            },
            contact: {
              type: 'object',
              properties: {
                phone: { type: 'string' },
                email: { type: 'string' },
                website: { type: 'string' },
              },
            },
            images: {
              type: 'array',
              items: { type: 'string' },
            },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  fieldType: {
                    type: 'string',
                    enum: ['5v5', '7v7', '9v9', '11v11', 'futsal', 'basketball', 'tennis'],
                  },
                  surfaceType: {
                    type: 'string',
                    enum: ['natural_grass', 'artificial_turf', 'clay', 'hard_court'],
                  },
                  size: { type: 'string' },
                  lighting: { type: 'boolean' },
                  indoor: { type: 'boolean' },
                  pricing: {
                    type: 'object',
                    properties: {
                      baseHourlyRate: { type: 'number' },
                      currency: { type: 'string', default: 'LAK' },
                    },
                  },
                },
              },
            },
            staff: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['referee', 'manager', 'maintenance'] },
                  status: { type: 'string', enum: ['active', 'inactive'] },
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
                    },
                  },
                },
              },
            },
            ownerId: { type: 'string', format: 'ObjectId' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['name', 'address', 'fields'],
        },

        // ======================
        // 🔹 CALENDAR
        // ======================
        CalendarEvent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
            status: { 
              type: 'string', 
              enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] 
            },
            bookingId: { type: 'string' },
            stadiumId: { type: 'string' },
            fieldId: { type: 'string' },
            userId: { type: 'string' },
            backgroundColor: { type: 'string' },
            borderColor: { type: 'string' },
            textColor: { type: 'string' },
            className: { type: 'string' },
            extendedProps: {
              type: 'object',
              properties: {
                bookingType: { 
                  type: 'string',
                  enum: ['regular', 'tournament', 'training', 'event']
                },
                totalPrice: { type: 'number' },
                currency: { type: 'string' },
                customerName: { type: 'string' },
                fieldName: { type: 'string' },
                stadiumName: { type: 'string' }
              }
            }
          },
          required: ['id', 'title', 'start', 'end', 'status']
        },
        
        VisualCalendarData: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: { $ref: '#/components/schemas/CalendarEvent' }
            },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              }
            },
            summary: {
              type: 'object',
              properties: {
                totalEvents: { type: 'number' },
                eventsByStatus: { 
                  type: 'object',
                  additionalProperties: { type: 'number' }
                },
                eventsByType: { 
                  type: 'object',
                  additionalProperties: { type: 'number' }
                },
                revenue: { type: 'number' },
                currency: { type: 'string' }
              }
            },
            monthlyBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string' },
                  year: { type: 'number' },
                  events: { type: 'number' },
                  revenue: { type: 'number' }
                }
              }
            }
          }
        },

        // ======================
        // 🔹 PAYMENT
        // ======================
        Payment: {
          type: 'object',
          required: ['paymentMethod', 'amount'],
          properties: {
            paymentMethod: {
              type: 'string',
              enum: ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'cash'],
              example: 'digital_wallet',
            },
            amount: { type: 'number', minimum: 0, example: 500000 },
            currency: { type: 'string', default: 'LAK' },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
              default: 'completed',
            },
            transactionId: { type: 'string', example: 'txn_123456789' },
            gatewayResponse: { type: 'object' },
            processedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ======================
        // 🔹 DISCOUNT
        // ======================
        Discount: {
          type: 'object',
          required: ['type', 'amount'],
          properties: {
            type: { type: 'string', enum: ['percentage', 'fixed'] },
            amount: { type: 'number', minimum: 0 },
            description: { type: 'string' },
          },
        },

        // ======================
        // 🔹 ASSIGNED STAFF
        // ======================
        AssignedStaff: {
          type: 'object',
          required: ['staffId', 'staffName', 'role'],
          properties: {
            staffId: { type: 'string', format: 'ObjectId' },
            staffName: { type: 'string' },
            role: { type: 'string', example: 'referee' },
            assignedAt: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['assigned', 'confirmed', 'completed', 'cancelled'],
              default: 'assigned',
            },
          },
        },

        // ======================
        // 🔹 CANCELLATION
        // ======================
        Cancellation: {
          type: 'object',
          required: ['cancelledAt', 'cancelledBy'],
          properties: {
            cancelledAt: { type: 'string', format: 'date-time' },
            cancelledBy: { type: 'string', format: 'ObjectId' },
            reason: { type: 'string' },
            refundAmount: { type: 'number', minimum: 0 },
            refundStatus: { type: 'string' },
          },
        },

        // ======================
        // 🔹 HISTORY ITEM
        // ======================
        HistoryItem: {
          type: 'object',
          required: ['action', 'changedBy', 'timestamp'],
          properties: {
            action: {
              type: 'string',
              enum: ['created', 'updated', 'confirmed', 'cancelled', 'completed'],
            },
            changedBy: { type: 'string', format: 'ObjectId' },
            oldValues: { type: 'object' },
            newValues: { type: 'object' },
            notes: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },

        // ======================
        // 🔹 PRICING
        // ======================
        Pricing: {
          type: 'object',
          required: ['totalAmount'],
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

        // ======================
        // 🔹 TEAM INFO
        // ======================
        TeamInfo: {
          type: 'object',
          properties: {
            teamName: { type: 'string' },
            contactPerson: { type: 'string' },
            contactPhone: { type: 'string' },
            numberOfPlayers: { type: 'number' },
            experience: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          },
        },

        // ======================
        // 🔹 BOOKING (Main)
        // ======================
        Booking: {
          type: 'object',
          required: [
            'userId', 'stadiumId', 'fieldId', 'bookingDate',
            'startTime', 'endTime', 'durationHours', 'pricing',
          ],
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
              enum: ['pending', 'paid', 'failed', 'refunded'],
              default: 'pending',
            },
            bookingType: {
              type: 'string',
              enum: ['regular', 'tournament', 'training', 'event', 'membership'],
              default: 'regular',
            },
            teamInfo: { $ref: '#/components/schemas/TeamInfo' },
            notes: { type: 'string' },
            specialRequests: {
              type: 'array',
              items: { type: 'string' },
            },
            assignedStaff: {
              type: 'array',
              items: { $ref: '#/components/schemas/AssignedStaff' },
            },
            payments: {
              type: 'array',
              items: { $ref: '#/components/schemas/Payment' },
            },
            cancellation: { $ref: '#/components/schemas/Cancellation' },
            history: {
              type: 'array',
              items: { $ref: '#/components/schemas/HistoryItem' },
            },
            // ✅ Added membershipDetails property
            membershipDetails: {
              type: 'object',
              properties: {
                membershipStartDate: { type: 'string', format: 'date-time' },
                membershipEndDate: { type: 'string', format: 'date-time' },
                recurrencePattern: {
                  type: 'string',
                  enum: ['weekly', 'biweekly', 'monthly']
                },
                recurrenceDayOfWeek: { type: 'integer', minimum: 0, maximum: 6 },
                nextBookingDate: { type: 'string', format: 'date-time' },
                totalOccurrences: { type: 'integer' },
                completedOccurrences: { type: 'integer' },
                isActive: { type: 'boolean' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        
        // ✅ Added MembershipDetails schema
        MembershipDetails: {
          type: 'object',
          properties: {
            membershipStartDate: { type: 'string', format: 'date-time' },
            membershipEndDate: { type: 'string', format: 'date-time' },
            recurrencePattern: {
              type: 'string',
              enum: ['weekly', 'biweekly', 'monthly']
            },
            recurrenceDayOfWeek: { type: 'integer', minimum: 0, maximum: 6 },
            nextBookingDate: { type: 'string', format: 'date-time' },
            totalOccurrences: { type: 'integer' },
            completedOccurrences: { type: 'integer' },
            isActive: { type: 'boolean' }
          }
        },
      },
    },

    // ======================
    // 🔹 API PATHS
    // ======================
    paths: {
      // ————————————————————
      // AUTH
      // ————————————————————
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register new user',
          description: 'Create a new user account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
                examples: {
                  generalUser: {
                    summary: 'General User Registration',
                    value: {
                      email: 'user@example.com',
                      password: 'Test@1234',
                      firstName: 'John',
                      lastName: 'Doe',
                      phone: '+8562012345678',
                      role: 'general_user',
                    },
                  },
                  stadiumOwner: {
                    summary: 'Stadium Owner Registration',
                    value: {
                      email: 'owner@stadium.la',
                      password: 'Owner@1234',
                      firstName: 'Somsak',
                      lastName: 'Stadium',
                      phone: '+8562098765432',
                      role: 'stadium_owner',
                      ownerProfile: {
                        businessName: 'Vientiane Sports Center',
                        businessRegistrationNumber: '123456789',
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'User created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate user and get JWT token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
                examples: {
                  validLogin: {
                    value: {
                      email: 'user@example.com',
                      password: 'Test@1234',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ————————————————————
      // USERS
      // ————————————————————
      '/api/auth/users': {
        get: {
          tags: ['Users'],
          summary: 'Get all users (Admin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of users',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Users'],
          summary: 'Create new user',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          responses: {
            '201': {
              description: 'User created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
      '/api/auth/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get user by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'User details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
        patch: {
          tags: ['Users'],
          summary: 'Update user profile',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
                examples: {
                  updateProfile: {
                    value: {
                      profile: {
                        gender: 'male',
                        dateOfBirth: '1990-01-01',
                        notificationPreferences: { promotions: true },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'User updated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },

      // ————————————————————
      // STADIUMS
      // ————————————————————
     // ————————————————————
// STADIUMS
// ————————————————————
'/api/stadiums': {
  get: {
    tags: ['Stadiums'],
    summary: 'Get all stadiums (public)',
    parameters: [
      { name: 'city', in: 'query', schema: { type: 'string' }, description: 'Filter by city' },
      { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Page number' },
      { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50 }, description: 'Items per page' },
      { name: 'lat', in: 'query', schema: { type: 'number' }, description: 'Latitude for location search' },
      { name: 'lng', in: 'query', schema: { type: 'number' }, description: 'Longitude for location search' },
      { name: 'radius', in: 'query', schema: { type: 'number' }, description: 'Search radius in km' },
    ],
    responses: {
      '200': {
        description: 'List of stadiums with pagination',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: { type: 'array', items: { $ref: '#/components/schemas/Stadium' } },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    pages: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  post: {
          tags: ['Stadiums'],
          summary: 'Create a new stadium with images (owner/admin only)',
          description: 'Upload stadium details and images. Fields like `address`, `facilities`, and `fields` should be sent as JSON strings.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['name', 'address', 'capacity'],
                  properties: {
                    name: { type: 'string', example: 'Vientiane Sports Arena' },
                    description: { type: 'string', example: 'A modern football complex with floodlights.' },
                   address: {
  type: 'string',
  
  description: 'Address as a valid JSON string. Must include city and coordinates array [longitude, latitude]',
},
                    capacity: { type: 'integer', minimum: 1, example: 3000 },
                    facilities: {
                      type: 'string',
                      example: '{"parking": true, "changingRooms": 2}',
                      description: 'Facilities as a JSON string (optional)',
                    },
                    fields: {
                      type: 'string',
                      example: '[{"name": "Field 1", "fieldType": "7v7", "surfaceType": "artificial_grass", "pricing": {"baseHourlyRate": 400000}}]',
                      description: 'Array of fields as a JSON string',
                    },
                    status: { type: 'string', enum: ['active', 'inactive', 'maintenance'], default: 'active' },
                    images: {
                      type: 'array',
                      items: { type: 'string', format: 'binary' },
                      description: 'Upload up to 5 images (JPEG, PNG, WEBP, max 5MB each)',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Stadium created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Stadium created successfully' },
                      data: { $ref: '#/components/schemas/Stadium' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation or file error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      errors: { type: 'array', items: { type: 'object' } },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '403': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Not authorized' },
                    },
                  },
                },
              },
            },
          },
        },
},

      // ————————————————————
      // BOOKINGS
      // ————————————————————
      '/api/bookings': {
        post: {
          tags: ['Bookings'],
          summary: 'Create a new booking',
          description: 'Create a new booking. For regular bookings, provide bookingDate, startTime, and endTime. For membership bookings, provide startDate, dayOfWeek, startTime, endTime, and recurrencePattern. Membership bookings will create a series of recurring bookings based on the specified pattern.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { 
                  type: 'object',
                  oneOf: [
                    {
                      title: 'Regular Booking',
                      required: ['stadiumId', 'fieldId', 'bookingDate', 'startTime', 'endTime'],
                      properties: {
                        stadiumId: { type: 'string', format: 'ObjectId' },
                        fieldId: { type: 'string', format: 'ObjectId' },
                        bookingDate: { type: 'string', format: 'date' },
                        startTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                        endTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                        teamInfo: { $ref: '#/components/schemas/TeamInfo' },
                        specialRequests: { type: 'array', items: { type: 'string' } },
                        bookingType: { type: 'string', enum: ['regular', 'tournament', 'training', 'event'] }
                      }
                    },
                    {
                      title: 'Membership Booking',
                      required: ['stadiumId', 'fieldId', 'startDate', 'dayOfWeek', 'startTime', 'endTime', 'recurrencePattern'],
                      properties: {
                        stadiumId: { type: 'string', format: 'ObjectId' },
                        fieldId: { type: 'string', format: 'ObjectId' },
                        startDate: { type: 'string', format: 'date' },
                        endDate: { type: 'string', format: 'date' },
                        dayOfWeek: { type: 'integer', minimum: 0, maximum: 6 },
                        startTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                        endTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                        recurrencePattern: { type: 'string', enum: ['weekly', 'biweekly', 'monthly'] },
                        totalOccurrences: { type: 'integer', minimum: 1 },
                        teamInfo: { $ref: '#/components/schemas/TeamInfo' },
                        specialRequests: { type: 'array', items: { type: 'string' } },
                        bookingType: { type: 'string', enum: ['membership'] }
                      }
                    }
                  ]
                },
                examples: {
                  regularBooking: {
                    value: {
                      stadiumId: '64a1b2c3d4e5f6789012345',
                      fieldId: '64a1b2c3d4e5f6789012346',
                      bookingDate: '2025-12-25',
                      startTime: '14:00',
                      endTime: '16:00',
                      teamInfo: { teamName: 'Vientiane FC', numberOfPlayers: 12 },
                      specialRequests: ['Extra balls'],
                    },
                  },
                  membershipBooking: {
                    value: {
                      stadiumId: '64a1b2c3d4e5f6789012345',
                      fieldId: '64a1b2c3d4e5f6789012346',
                      startDate: '2025-12-01',
                      endDate: '2026-06-01',
                      dayOfWeek: 3, // Wednesday
                      startTime: '18:00',
                      endTime: '20:00',
                      recurrencePattern: 'weekly',
                      totalOccurrences: 26,
                      teamInfo: { teamName: 'Vientiane FC', numberOfPlayers: 12 },
                      bookingType: 'membership'
                    }
                  }
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Booking created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Booking' },
                },
              },
            },
          },
        },
      },
      '/api/bookings/my-bookings': {
        get: {
          tags: ['Bookings'],
          summary: 'Get current user’s bookings',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
          ],
          responses: {
            '200': {
              description: 'List of user bookings with pagination',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Booking' } },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'number' },
                          limit: { type: 'number' },
                          total: { type: 'number' },
                          pages: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/bookings/{bookingId}': {
        get: {
          tags: ['Bookings'],
          summary: 'Get booking details by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Booking retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Booking' },
                },
              },
            },
          },
        },
      },
      '/api/bookings/{bookingId}/payment': {
        post: {
          tags: ['Bookings'],
          summary: 'Add payment to booking',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Payment' },
                examples: {
                  digitalWallet: {
                    value: { paymentMethod: 'digital_wallet', amount: 500000, transactionId: 'pay_lao123' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Payment added successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Booking' },
                },
              },
            },
          },
        },
      },
      '/api/bookings/{bookingId}/assign-staff': {
        post: {
          tags: ['Bookings'],
          summary: 'Assign staff to booking',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AssignedStaff' },
                },
                example: [
                  {
                    staffId: '507f1f77bcf86cd799439011',
                    staffName: 'Seng',
                    role: 'referee',
                  },
                ],
              },
            },
          },
          responses: {
            '200': {
              description: 'Staff assigned successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Booking' },
                },
              },
            },
          },
        },
      },
      '/api/bookings/{bookingId}/apply-discount': {
        post: {
          tags: ['Bookings'],
          summary: 'Apply discount to booking',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Discount' },
                example: {
                  type: 'percentage',
                  amount: 10,
                  description: '10% off for early booking',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Discount applied successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Booking' },
                },
              },
            },
          },
        },
      },
      '/api/bookings/{bookingId}/cancel': {
        put: {
          tags: ['Bookings'],
          summary: 'Cancel a booking',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { reason: { type: 'string' } },
                },
                examples: {
                  userCancellation: {
                    value: { reason: 'Schedule conflict' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Booking cancelled successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      data: {
                        type: 'object',
                        properties: {
                          booking: { $ref: '#/components/schemas/Booking' },
                          refundAmount: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // Scan route files for JSDoc comments
  apis: [
    path.join(__dirname, '../routes/*.' + (process.env.NODE_ENV === 'production' ? 'js' : 'ts')),
    path.join(__dirname, '../models/*.' + (process.env.NODE_ENV === 'production' ? 'js' : 'ts')),
  ],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
    `,
    customSiteTitle: 'Stadium Booking API - Test Suite',
  }));

  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};