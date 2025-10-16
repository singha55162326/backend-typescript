import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server'; // Adjust path as needed
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';

// Mock authentication middleware for testing
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-id' };
    next();
  }
}));

describe('Membership Booking API', () => {
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

  it('should create a membership booking', async () => {
    // Create a mock stadium with field
    const stadium = new Stadium({
      ownerId: new mongoose.Types.ObjectId(),
      name: 'Test Stadium',
      address: {
        city: 'Test City'
      },
      capacity: 100,
      fields: [{
        _id: new mongoose.Types.ObjectId(),
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

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Send request to create membership booking
    const response = await request(app)
      .post('/api/bookings')
      .send({
        stadiumId: stadium._id.toString(),
        fieldId: stadium.fields[0]._id.toString(),
        startDate: tomorrow.toISOString().split('T')[0],
        dayOfWeek: tomorrow.getDay(),
        startTime: '10:00',
        endTime: '12:00',
        recurrencePattern: 'weekly',
        totalOccurrences: 4,
        bookingType: 'membership'
      })
      .set('Authorization', 'Bearer test-token')
      .expect(201);

    // Assertions
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(4);
    expect(response.body.data[0].bookingType).toBe('membership');
  });

  it('should validate required fields for membership booking', async () => {
    // Send request with missing required fields
    const response = await request(app)
      .post('/api/bookings')
      .send({
        stadiumId: 'test-stadium-id',
        fieldId: 'test-field-id',
        bookingType: 'membership'
        // Missing required fields: startDate, dayOfWeek, startTime, endTime, recurrencePattern
      })
      .set('Authorization', 'Bearer test-token')
      .expect(400);

    // Assertions
    expect(response.body.success).toBe(false);
  });
});