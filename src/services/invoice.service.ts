import { IBooking } from '../models/Booking';
import { IStadium } from '../models/Stadium';
import { IUser } from '../models/User';
import mongoose from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Updated interface to include optional ownerName
export interface IInvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  booking: {
    bookingNumber: string;
    bookingDate: Date;
    startTime: string;
    endTime: string;
    durationHours: number;
  };
  customer: {
    customerId: string;
    name: string;
    email: string;
    phone: string;
  };
  stadium: {
    stadiumId: string;
    name: string;
    address: string;
    phone: string;
    ownerId: string;
    ownerName?: string; // Make ownerName optional
  };
  field?: { // Add optional field information
    fieldId: string;
    name: string;
    fieldType: string;
  };
  items: IInvoiceItem[];
  subtotal: number;
  taxes: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  notes?: string;
}

export class InvoiceService {
  static generateInvoiceData(
    booking: IBooking,
    stadium: IStadium,
    customer: IUser
  ): IInvoiceData {
    // Generate invoice number
    const invoiceNumber = `INV-${booking.bookingNumber}`;

    // Invoice dates
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 7);

    // Find the field information from the stadium's fields array
    let fieldInfo = undefined;
    let fieldName = '';
    
    try {
      if (stadium.fields && Array.isArray(stadium.fields) && booking.fieldId) {
        // Convert booking.fieldId to string for comparison
        const bookingFieldIdStr = booking.fieldId.toString();
        
        // Find the field in the stadium's fields array
        const field = stadium.fields.find((f: any) => {
          // Check multiple possible ways the _id might be stored
          if (f._id) {
            // If _id is an ObjectId, convert to string
            if (typeof f._id === 'object' && f._id.toString) {
              return f._id.toString() === bookingFieldIdStr;
            }
            // If _id is already a string
            if (typeof f._id === 'string') {
              return f._id === bookingFieldIdStr;
            }
          }
          return false;
        });
        
        if (field) {
          fieldInfo = {
            fieldId: bookingFieldIdStr,
            name: field.name || 'Unknown Field',
            fieldType: field.fieldType || 'Unknown Type'
          };
          fieldName = ` - ${field.name}`;
        } else {
          // Try to get field name from populated fieldId in booking
          if (booking.fieldId && typeof booking.fieldId === 'object' && 'name' in booking.fieldId) {
            const populatedField = booking.fieldId as any;
            fieldInfo = {
              fieldId: bookingFieldIdStr,
              name: populatedField.name || 'Unknown Field',
              fieldType: populatedField.fieldType || 'Unknown Type'
            };
            fieldName = ` - ${populatedField.name}`;
          }
        }
      }
    } catch (error) {
      console.error('Error extracting field information:', error);
    }

    // Build invoice items
    const items: IInvoiceItem[] = [
      {
        description: `Field rental: ${stadium.name}${fieldName}`,
        quantity: booking.durationHours,
        unitPrice: booking.pricing.baseRate,
        total: booking.pricing.baseRate * booking.durationHours
      }
    ];

    // Add referee charges
    booking.pricing.refereeCharges?.forEach((charge) => {
      items.push({
        description: `Referee service: ${charge.refereeName}`,
        quantity: charge.hours,
        unitPrice: charge.rate,
        total: charge.total
      });
    });

    // Apply discounts
    booking.pricing.discounts?.forEach((discount) => {
      items.push({
        description: discount.description || `${discount.type} discount`,
        quantity: 1,
        unitPrice: -discount.amount,
        total: -discount.amount
      });
    });

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxes = booking.pricing.taxes || 0;
    const totalAmount = subtotal + taxes;

    // Check if stadium owner is populated with name details
    let ownerName = undefined;
    if (stadium.ownerId && typeof stadium.ownerId === 'object' && 'firstName' in stadium.ownerId) {
      const populatedOwner = stadium.ownerId as any;
      ownerName = `${populatedOwner.firstName} ${populatedOwner.lastName}`;
    }

    return {
      invoiceNumber,
      invoiceDate,
      dueDate,
      booking: {
        bookingNumber: booking.bookingNumber,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        durationHours: booking.durationHours
      },
      customer: {
        customerId: (customer._id as mongoose.Types.ObjectId).toString(),
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone || ''
      },
      stadium: {
        stadiumId: (stadium._id as mongoose.Types.ObjectId).toString(),
        name: stadium.name,
        address: `${stadium.address.street || ''} ${stadium.address.city}, ${stadium.address.country}`,
        phone: '', // Optional, stadium doesn't have phone
        ownerId: stadium.ownerId.toString(), // Keep the ID for reference
        ownerName: ownerName // Add owner name if available
      },
      field: fieldInfo, // Add field information
      items,
      subtotal,
      taxes,
      totalAmount,
      currency: booking.pricing.currency || 'LAK',
      paymentStatus: booking.paymentStatus,
      notes: booking.notes || 'Thank you for your booking!'
    };
  }
}