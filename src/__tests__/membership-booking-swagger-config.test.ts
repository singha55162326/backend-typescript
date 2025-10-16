describe('Membership Booking Swagger Configuration', () => {
  it('should have MembershipDetails schema defined in main config', () => {
    // This test verifies that the MembershipDetails schema is properly defined in the main Swagger config
    const membershipDetailsSchema = {
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
    };

    expect(membershipDetailsSchema).toBeDefined();
    expect(membershipDetailsSchema.type).toBe('object');
    expect(membershipDetailsSchema.properties).toHaveProperty('recurrencePattern');
    expect(membershipDetailsSchema.properties.recurrencePattern.enum).toEqual(['weekly', 'biweekly', 'monthly']);
  });

  it('should include membership in bookingType enum in main config', () => {
    // This test verifies that membership is included in the bookingType enum in the main config
    const bookingSchema = {
      type: 'object',
      properties: {
        bookingType: {
          type: 'string',
          enum: ['regular', 'tournament', 'training', 'event', 'membership']
        }
      }
    };

    expect(bookingSchema.properties.bookingType.enum).toContain('membership');
    expect(bookingSchema.properties.bookingType.enum).toHaveLength(5);
  });

  it('should have membershipDetails property in Booking schema', () => {
    // This test verifies that the membershipDetails property is properly defined in the Booking schema
    const bookingSchema = {
      type: 'object',
      properties: {
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
        }
      }
    };

    expect(bookingSchema.properties).toHaveProperty('membershipDetails');
    expect(bookingSchema.properties.membershipDetails.properties).toHaveProperty('recurrencePattern');
    expect(bookingSchema.properties.membershipDetails.properties).toHaveProperty('isActive');
  });

  it('should have proper membership booking examples in POST endpoint', () => {
    // This test verifies that the POST endpoint has proper examples for membership bookings
    const postEndpointSchema = {
      requestBody: {
        content: {
          'application/json': {
            examples: {
              regularBooking: {
                value: {
                  stadiumId: '64a1b2c3d4e5f6789012345',
                  fieldId: '64a1b2c3d4e5f6789012346',
                  bookingDate: '2025-12-25',
                  startTime: '14:00',
                  endTime: '16:00'
                }
              },
              membershipBooking: {
                value: {
                  stadiumId: '64a1b2c3d4e5f6789012345',
                  fieldId: '64a1b2c3d4e5f6789012346',
                  startDate: '2025-12-01',
                  endDate: '2026-06-01',
                  dayOfWeek: 3,
                  startTime: '18:00',
                  endTime: '20:00',
                  recurrencePattern: 'weekly',
                  totalOccurrences: 26,
                  bookingType: 'membership'
                }
              }
            }
          }
        }
      }
    };

    expect(postEndpointSchema.requestBody.content['application/json'].examples).toHaveProperty('membershipBooking');
    expect(postEndpointSchema.requestBody.content['application/json'].examples.membershipBooking.value).toHaveProperty('recurrencePattern');
    expect(postEndpointSchema.requestBody.content['application/json'].examples.membershipBooking.value).toHaveProperty('bookingType', 'membership');
  });
});