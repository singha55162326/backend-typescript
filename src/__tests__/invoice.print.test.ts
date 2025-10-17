import { InvoiceService } from '../services/invoice.service';
import mongoose from 'mongoose';

// Mock mongoose
jest.mock('mongoose', () => {
  return {
    Types: {
      ObjectId: {
        isValid: jest.fn().mockReturnValue(true)
      }
    }
  };
});

describe('InvoiceService', () => {
  describe('generateInvoiceData', () => {
    it('should generate invoice data with account number and image', () => {
      // Mock booking data
      const mockBooking: any = {
        bookingNumber: 'B001',
        bookingDate: new Date(),
        startTime: '10:00',
        endTime: '12:00',
        durationHours: 2,
        pricing: {
          baseRate: 50000,
          totalAmount: 100000,
          currency: 'LAK'
        },
        fieldId: 'field1'
      };

      // Mock stadium data with account information
      const mockStadium: any = {
        _id: 'stadium1',
        name: 'Test Stadium',
        address: {
          street: '123 Test St',
          city: 'Test City'
        },
        ownerId: 'owner1',
        fields: [
          {
            _id: 'field1',
            name: 'Test Field',
            fieldType: '11v11'
          }
        ],
        accountNumber: '1234567890',
        accountNumberImage: '/uploads/account.jpg'
      };

      // Mock customer data
      const mockCustomer: any = {
        _id: 'customer1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '123456789'
      };

      const result = InvoiceService.generateInvoiceData(mockBooking, mockStadium, mockCustomer);

      // Verify the invoice data includes account information
      expect(result.stadium.accountNumber).toBe('1234567890');
      expect(result.stadium.accountNumberImage).toBe('/uploads/account.jpg');
      expect(result.invoiceNumber).toBe('INV-B001');
    });
  });
});