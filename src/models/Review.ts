import mongoose, { Document, Model, Schema } from 'mongoose';

interface IReviewReport {
  userId: mongoose.Types.ObjectId;
  reason: string;
  reportedAt: Date;
}

interface IReview extends Document {
  userId: mongoose.Types.ObjectId;
  stadiumId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  rating: number; // 1-5 stars
  title: string;
  comment: string;
  isVerified: boolean; // Verified if user actually booked the stadium
  status: 'pending' | 'approved' | 'rejected'; // For moderation
  helpfulCount: number;
  reportedCount: number;
  reports: IReviewReport[];
  moderationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewReportSchema = new mongoose.Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  reason: String,
  reportedAt: { type: Date, default: Date.now }
});

const reviewSchema: Schema<IReview> = new mongoose.Schema({
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
  bookingId: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  reportedCount: {
    type: Number,
    default: 0
  },
  reports: [reviewReportSchema],
  moderationNotes: String
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ stadiumId: 1, status: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

const Review: Model<IReview> = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
export type { IReview };