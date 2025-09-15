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

    // Build invoice items
    const items: IInvoiceItem[] = [
      {
        description: `Field rental: ${stadium.name}`,
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