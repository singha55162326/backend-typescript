import { Request, Response, NextFunction } from 'express';
import { StadiumController } from '../controllers/stadium.controller';
import Stadium from '../models/Stadium';

// Mock the Stadium model
jest.mock('../models/Stadium', () => {
  return {
    __esModule: true,
    default: {
      find: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
    },
  };
});

describe('StadiumController.getNearbyStadiums', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonResponse: any;

  beforeEach(() => {
    jsonResponse = {};
    mockRequest = {
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        jsonResponse = result;
        return mockResponse;
      }),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if latitude is missing', async () => {
    mockRequest.query = { lng: '120.5' };

    await StadiumController.getNearbyStadiums(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Latitude and longitude are required for nearby search',
    });
  });

  it('should return 400 if longitude is missing', async () => {
    mockRequest.query = { lat: '30.5' };

    await StadiumController.getNearbyStadiums(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Latitude and longitude are required for nearby search',
    });
  });

  it('should return 400 for invalid coordinates', async () => {
    mockRequest.query = { lat: '100', lng: '200' };

    await StadiumController.getNearbyStadiums(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid coordinates provided',
    });
  });

  it('should return nearby stadiums for valid coordinates', async () => {
    mockRequest.query = { lat: '17.9667', lng: '102.6', radius: '5' };
    
    const mockStadiums = [
      {
        _id: '1',
        name: 'Test Stadium',
        address: {
          city: 'Vientiane',
          coordinates: {
            type: 'Point',
            coordinates: [102.6, 17.9667],
          },
        },
      },
    ];

    (Stadium.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockStadiums),
    });

    (Stadium.countDocuments as jest.Mock).mockResolvedValue(1);

    await StadiumController.getNearbyStadiums(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: 'Nearby stadiums retrieved successfully',
      data: mockStadiums,
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
      },
      location: {
        latitude: 17.9667,
        longitude: 102.6,
        radius: 5,
      },
    });
  });
});