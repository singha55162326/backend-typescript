import mongoose from 'mongoose';
import { MembershipService } from '../services/membership.service';
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';

// Mock data
const mockStadiumId = new mongoose.Types.ObjectId().toString();
const mockFieldId = new mongoose.Types.ObjectId().toString();
const mockUserId = new mongoose.Types.ObjectId().toString();

describe('Membership Booking Service', () => {
  beforeAll(async () => {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/stadium_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as any);
  });

  afterAll(async () => {
    // Clean up test data
    await Booking.deleteMany({});
    await Stadium.deleteMany({});
    await mongoose.connection.close();
  });

  it('should create membership bookings', async () => {
    // Create a mock stadium with field
    const stadium = new Stadium({
      _id: mockStadiumId,
      ownerId: new mongoose.Types.ObjectId(),
      name: 'Test Stadium',
      address: {
        city: 'Test City'
      },
      capacity: 100,
      fields: [{
        _id: mockFieldId,
        name: 'Test Field',
        fieldType: '11v11',
        surfaceType: 'natural_grass',
        pricing: {
          baseHourlyRate: 10000,
          currency: 'LAK'
        }
      }]
    });
    await stadium.save();

    // Create membership booking parameters
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Tomorrow

    const params = {
      stadiumId: mockStadiumId,
      fieldId: mockFieldId,
      startDate,
      dayOfWeek: startDate.getDay(),
      startTime: '10:00',
      endTime: '12:00',
      userId: mockUserId,
      recurrencePattern: 'weekly' as const,
      totalOccurrences: 4
    };

    // Create membership bookings
    const bookings = await MembershipService.createMembershipBookings(params);

    // Assertions
    expect(bookings).toHaveLength(4);
    expect(bookings[0].bookingType).toBe('membership');
    expect(bookings[0].membershipDetails?.recurrencePattern).toBe('weekly');
    expect(bookings[0].membershipDetails?.recurrenceDayOfWeek).toBe(startDate.getDay());
    
    // Check that all bookings have the same time
    bookings.forEach(booking => {
      expect(booking.startTime).toBe('10:00');
      expect(booking.endTime).toBe('12:00');
    });
  });

  it('should handle field availability conflicts', async () => {
    // Create an existing booking that conflicts with our membership booking
    const conflictDate = new Date();
    conflictDate.setDate(conflictDate.getDate() + 8); // Next week
    
    const existingBooking = new Booking({
      userId: new mongoose.Types.ObjectId(),
      stadiumId: mockStadiumId,
      fieldId: mockFieldId,
      bookingDate: conflictDate,
      startTime: '10:00',
      endTime: '12:00',
      durationHours: 2,
      pricing: {
        baseRate: 10000,
        totalAmount: 20000,
        currency: 'LAK'
      },
      status: 'confirmed',
      paymentStatus: 'pending'
    });
    await existingBooking.save();

    // Create membership booking parameters
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Tomorrow

    const params = {
      stadiumId: mockStadiumId,
      fieldId: mockFieldId,
      startDate,
      dayOfWeek: startDate.getDay(),
      startTime: '10:00',
      endTime: '12:00',
      userId: mockUserId,
      recurrencePattern: 'weekly' as const,
      totalOccurrences: 4
    };

    // Create membership bookings
    const bookings = await MembershipService.createMembershipBookings(params);

    // Should create 3 bookings instead of 4 because one conflicts
    expect(bookings).toHaveLength(3);
  });
});