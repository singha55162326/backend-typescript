import mongoose, { Document, Model, Schema } from 'mongoose';
import { IRefereeCharge, IDiscount, IPayment } from '../types/booking.types';

interface IAssignedStaff {
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  role: string;
  assignedAt: Date;
  status: 'assigned' | 'confirmed' | 'completed' | 'cancelled';
}

interface ITeamInfo {
  teamName?: string;
  contactPerson?: string;
  contactPhone?: string;
  numberOfPlayers?: number;
  experience?: 'beginner' | 'intermediate' | 'advanced';
}

interface ICancellation {
  cancelledAt: Date;
  cancelledBy: mongoose.Types.ObjectId;
  reason?: string;
  refundAmount?: number;
  refundStatus?: string;
}

interface IHistoryItem {
  action: 'created' | 'updated' | 'confirmed' | 'cancelled' | 'completed';
  changedBy: mongoose.Types.ObjectId;
  oldValues?: any;
  newValues?: any;
  notes?: string;
  timestamp: Date;
}

interface IPricing {
  baseRate: number;
  totalAmount: number;
  currency: string;
  taxes?: number;
  refereeCharges?: IRefereeCharge[];
  discounts?: IDiscount[];
}

export interface IBooking extends Document {
  bookingNumber: string;
  userId: mongoose.Types.ObjectId;
  stadiumId: mongoose.Types.ObjectId;
  fieldId: mongoose.Types.ObjectId;
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
  payments?: import('../types/booking.types').IPayment[];
  cancellation?: ICancellation;
  history: IHistoryItem[];
}

const refereeChargeSchema = new Schema<IRefereeCharge>({
  staffId: { type: Schema.Types.ObjectId, required: true },
  refereeName: { type: String, required: true },
  hours: { type: Number, required: true },
  rate: { type: Number, required: true },
  total: { type: Number, required: true }
});

const discountSchema = new Schema<IDiscount>({
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String }
});

const paymentSchema = new Schema<IPayment>({
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'qrcode', 'bank_transfer', 'digital_wallet', 'cash'],
    required: true
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'LAK' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  // QR Code specific fields
  qrCodeData: { type: String }, // Base64 encoded QR code image
  accountNumber: { type: String }, // Bank account number
  accountName: { type: String }, // Account holder name
  transactionId: String,
  gatewayResponse: Schema.Types.Mixed,
  processedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const assignedStaffSchema = new Schema<IAssignedStaff>({
  staffId: { type: Schema.Types.ObjectId, required: true },
  staffName: { type: String, required: true },
  role: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['assigned', 'confirmed', 'completed', 'cancelled'],
    default: 'assigned'
  }
});

const teamInfoSchema = new Schema<ITeamInfo>({
  teamName: String,
  contactPerson: String,
  contactPhone: String,
  numberOfPlayers: Number,
  experience: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  }
});

const cancellationSchema = new Schema<ICancellation>({
  cancelledAt: { type: Date, default: Date.now },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reason: String,
  refundAmount: Number,
  refundStatus: String
});

const historyItemSchema = new Schema<IHistoryItem>({
  action: {
    type: String,
    enum: ['created', 'updated', 'confirmed', 'cancelled', 'completed'],
    required: true
  },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  oldValues: Schema.Types.Mixed,
  newValues: Schema.Types.Mixed,
  notes: String,
  timestamp: { type: Date, default: Date.now }
});

const bookingSchema = new Schema<IBooking>({
  bookingNumber: {
    type: String,
    unique: true,
   
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stadiumId: {
    type: Schema.Types.ObjectId,
    ref: 'Stadium',
    required: true
  },
  fieldId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  durationHours: {
    type: Number,
    required: true
  },
  pricing: {
    baseRate: Number,
    totalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'LAK'
    },
    taxes: Number,
    refereeCharges: [refereeChargeSchema],
    discounts: [discountSchema]
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'confirmed'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  bookingType: {
    type: String,
    enum: ['regular', 'tournament', 'training', 'event'],
    default: 'regular'
  },
  teamInfo: teamInfoSchema,
  notes: String,
  specialRequests: [String],
  assignedStaff: [assignedStaffSchema],
  payments: [paymentSchema],
  cancellation: cancellationSchema,
  history: [historyItemSchema]
}, {
  timestamps: true
});

// Compound unique index to prevent double bookings
bookingSchema.index({ 
  fieldId: 1, 
  bookingDate: 1, 
  startTime: 1, 
  endTime: 1 
}, { unique: true });

// Generate booking number
bookingSchema.pre<IBooking>('save', async function(next) {
  if (!this.bookingNumber) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingNumber = `BK${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const Booking: Model<IBooking> = mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;