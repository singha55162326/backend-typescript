import mongoose, { Document, Model, Schema } from 'mongoose';

interface ILoyaltyTier {
  name: string;
  minPoints: number;
  discountPercentage: number;
  benefits: string[];
}

interface ILoyaltyPointsHistory {
  bookingId?: mongoose.Types.ObjectId;
  points: number;
  type: 'earned' | 'redeemed' | 'expired' | 'referral';
  description: string;
  createdAt: Date;
}

interface ILoyaltyReferral {
  referredUserId: mongoose.Types.ObjectId;
  pointsEarned: number;
  referralDate: Date;
  status: 'pending' | 'completed';
}

export interface ILoyaltyProgram extends Document {
  userId: mongoose.Types.ObjectId;
  totalPoints: number;
  currentTier: string;
  pointsHistory: ILoyaltyPointsHistory[];
  referrals: ILoyaltyReferral[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// const loyaltyTierSchema = new Schema<ILoyaltyTier>({
//   name: { type: String, required: true },
//   minPoints: { type: Number, required: true },
//   discountPercentage: { type: Number, required: true },
//   benefits: [String]
// });

const loyaltyPointsHistorySchema = new Schema<ILoyaltyPointsHistory>({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
  points: { type: Number, required: true },
  type: {
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'referral'],
    required: true
  },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const loyaltyReferralSchema = new Schema<ILoyaltyReferral>({
  referredUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  pointsEarned: { type: Number, default: 0 },
  referralDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  }
});

const loyaltyProgramSchema = new Schema<ILoyaltyProgram>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
    // Removed separate index as unique: true already creates an index
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  currentTier: {
    type: String,
    default: 'Bronze'
  },
  pointsHistory: [loyaltyPointsHistorySchema],
  referrals: [loyaltyReferralSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Define loyalty tiers
export const LOYALTY_TIERS: ILoyaltyTier[] = [
  {
    name: 'Bronze',
    minPoints: 0,
    discountPercentage: 0,
    benefits: ['Basic rewards']
  },
  {
    name: 'Silver',
    minPoints: 500,
    discountPercentage: 5,
    benefits: ['5% discount on bookings', 'Priority customer support']
  },
  {
    name: 'Gold',
    minPoints: 1500,
    discountPercentage: 10,
    benefits: ['10% discount on bookings', 'Priority customer support', 'Free cancellation']
  },
  {
    name: 'Platinum',
    minPoints: 3000,
    discountPercentage: 15,
    benefits: ['15% discount on bookings', 'Priority customer support', 'Free cancellation', 'Exclusive events access']
  }
];

// Index for efficient querying by points (userId already indexed by unique: true)
loyaltyProgramSchema.index({ totalPoints: -1 });

const LoyaltyProgram: Model<ILoyaltyProgram> = mongoose.model<ILoyaltyProgram>('LoyaltyProgram', loyaltyProgramSchema);

export default LoyaltyProgram;