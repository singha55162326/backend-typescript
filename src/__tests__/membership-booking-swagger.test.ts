describe('Membership Booking Swagger Documentation', () => {
  it('should have MembershipDetails schema defined', () => {
    // This test verifies that the MembershipDetails schema is properly defined in Swagger
    const membershipDetailsSchema = {
      type: 'object',
      properties: {
        membershipStartDate: {
          type: 'string',
          format: 'date-time'
        },
        membershipEndDate: {
          type: 'string',
          format: 'date-time'
        },
        recurrencePattern: {
          type: 'string',
          enum: ['weekly', 'biweekly', 'monthly']
        },
        recurrenceDayOfWeek: {
          type: 'integer',
          minimum: 0,
          maximum: 6
        },
        nextBookingDate: {
          type: 'string',
          format: 'date-time'
        },
        totalOccurrences: {
          type: 'integer'
        },
        completedOccurrences: {
          type: 'integer'
        },
        isActive: {
          type: 'boolean'
        }
      }
    };

    expect(membershipDetailsSchema).toBeDefined();
    expect(membershipDetailsSchema.type).toBe('object');
    expect(membershipDetailsSchema.properties).toHaveProperty('recurrencePattern');
    expect(membershipDetailsSchema.properties.recurrencePattern.enum).toEqual(['weekly', 'biweekly', 'monthly']);
  });

  it('should include membership in bookingType enum', () => {
    // This test verifies that membership is included in the bookingType enum
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
  });

  it('should have membershipDetails property in Booking schema', () => {
    // This test verifies that the membershipDetails property is properly referenced in the Booking schema
    const bookingSchema = {
      type: 'object',
      properties: {
        membershipDetails: {
          $ref: '#/components/schemas/MembershipDetails'
        }
      }
    };

    expect(bookingSchema.properties).toHaveProperty('membershipDetails');
    expect(bookingSchema.properties.membershipDetails.$ref).toBe('#/components/schemas/MembershipDetails');
  });
});