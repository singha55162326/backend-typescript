import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  stadiumId: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const favoriteSchema: Schema<IFavorite> = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
      // Removed index: true to prevent duplicate index warning
    },
    stadiumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stadium',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure a user cannot favorite the same stadium twice
favoriteSchema.index({ userId: 1, stadiumId: 1 }, { unique: true });

export const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema);