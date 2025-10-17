import { ServiceFeeController } from '../controllers/serviceFee.controller';
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';
import User from '../models/User';
import moment from 'moment-timezone';

// Mock the models
jest.mock('../models/Booking');
jest.mock('../models/Stadium');
jest.mock('../models/User');

describe('ServiceFeeController', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      query: {},
      params: {}
    };
    
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getServiceFeeReport', () => {
    it('should generate service fee report for stadium owners', async () => {
      // Mock stadium owners
      const mockOwners = [
        {
          _id: 'owner1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'stadium_owner',
          status: 'active'
        }
      ];
      
      (User.find as jest.Mock).mockResolvedValue(mockOwners);
      
      // Mock stadiums
      const mockStadiums = [
        {
          _id: 'stadium1',
          name: 'Test Stadium',
          ownerId: 'owner1'
        }
      ];
      
      (Stadium.find as jest.Mock).mockImplementation((query) => {
        if (query.ownerId) {
          return Promise.resolve(mockStadiums);
        }
        return Promise.resolve([]);
      });
      
      // Mock bookings
      const mockBookings = [
        {
          _id: 'booking1',
          bookingNumber: 'B001',
          bookingDate: new Date(),
          status: 'confirmed',
          paymentStatus: 'paid',
          pricing: {
            totalAmount: 1000
          },
          stadiumId: { name: 'Test Stadium' }
        }
      ];
      
      (Booking.find as jest.Mock).mockResolvedValue(mockBookings);
      
      await ServiceFeeController.getServiceFeeReport(mockRequest, mockResponse, mockNext);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          report: [
            {
              ownerId: 'owner1',
              ownerName: 'John Doe',
              ownerEmail: 'john@example.com',
              stadiums: [{ id: 'stadium1', name: 'Test Stadium' }],
              totalBookings: 1,
              totalRevenue: 1000,
              serviceFee: 100, // 10% of 1000
              period: expect.objectContaining({
                startDate: expect.any(Date),
                endDate: expect.any(Date)
              })
            }
          ],
          summary: {
            totalOwners: 1,
            totalServiceFee: 100,
            period: expect.objectContaining({
              startDate: expect.any(Date),
              endDate: expect.any(Date)
            })
          }
        }
      });
    });
  });

  describe('getOwnerServiceFeeDetails', () => {
    it('should return 400 for invalid owner ID', async () => {
      mockRequest.params.ownerId = 'invalid-id';
      
      await ServiceFeeController.getOwnerServiceFeeDetails(mockRequest, mockResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid owner ID'
      });
    });
    
    it('should return 404 for non-existent owner', async () => {
      mockRequest.params.ownerId = 'owner1';
      
      (User.findById as jest.Mock).mockResolvedValue(null);
      
      await ServiceFeeController.getOwnerServiceFeeDetails(mockRequest, mockResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Stadium owner not found'
      });
    });
  });
});