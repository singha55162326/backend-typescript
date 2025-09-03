// src/types/booking.types.ts

import { Document, Types } from 'mongoose';

export interface IRefereeCharge {
  staffId: Types.ObjectId;
  refereeName: string;
  hours: number;
  rate: number;
  total: number;
}

export interface IDiscount {
  type: string;
  amount: number;
  description?: string;
}

export interface IPayment {
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet' | 'cash';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionId?: string;
  gatewayResponse?: any;
  processedAt?: Date;
  createdAt: Date;
}

export interface IAssignedStaff {
  staffId: Types.ObjectId;
  staffName: string;
  role: string;
  assignedAt: Date;
  status: 'assigned' | 'confirmed' | 'completed' | 'cancelled';
}

export interface ITeamInfo {
  teamName?: string;
  contactPerson?: string;
  contactPhone?: string;
  numberOfPlayers?: number;
  experience?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ICancellation {
  cancelledAt: Date;
  cancelledBy: Types.ObjectId;
  reason?: string;
  refundAmount?: number;
  refundStatus?: string;
}

export interface IHistoryItem {
  action: 'created' | 'updated' | 'confirmed' | 'cancelled' | 'completed';
  changedBy: Types.ObjectId;
  oldValues?: any;
  newValues?: any;
  notes?: string;
  timestamp: Date;
}

export interface IPricing {
  baseRate: number;
  totalAmount: number;
  currency: string;
  taxes?: number;
  refereeCharges?: IRefereeCharge[];
  discounts?: IDiscount[];
}

export interface IBooking extends Document {
  bookingNumber: string;
  userId: Types.ObjectId;
  stadiumId: Types.ObjectId;
  fieldId: Types.ObjectId;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  durationHours: number;
  pricing: IPricing;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  bookingType: 'regular' | 'tournament' | 'training' | 'event';
  teamInfo?: ITeamInfo;
  notes?: string;
  specialRequests?: string[];
  assignedStaff?: IAssignedStaff[];
  payments?: IPayment[];
  cancellation?: ICancellation;
  history: IHistoryItem[];
}


