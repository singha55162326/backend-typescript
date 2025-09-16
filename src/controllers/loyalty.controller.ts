import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import LoyaltyProgram, {  LOYALTY_TIERS } from '../models/LoyaltyProgram';

import Booking from '../models/Booking';

export class LoyaltyController {
  // Get user loyalty program details
  static async getLoyaltyDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?._id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      let loyaltyProgram = await LoyaltyProgram.findOne({ userId });
      
      // If user doesn't have a loyalty program record, create one
      if (!loyaltyProgram) {
        loyaltyProgram = new LoyaltyProgram({
          userId,
          totalPoints: 0,
          currentTier: 'Bronze',
          pointsHistory: [],
          referrals: []
        });
        await loyaltyProgram.save();
      }

      // Get current tier details
      const currentTier = LOYALTY_TIERS.find(tier => tier.name === loyaltyProgram?.currentTier) || LOYALTY_TIERS[0];

      res.json({
        success: true,
        data: {
          totalPoints: loyaltyProgram.totalPoints,
          currentTier: loyaltyProgram.currentTier,
          tierDetails: currentTier,
          nextTier: this.getNextTier(loyaltyProgram.totalPoints),
          pointsHistory: loyaltyProgram.pointsHistory.slice(-10), // Last 10 transactions
          referrals: loyaltyProgram.referrals
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Calculate points for a booking
  static calculatePointsForBooking(bookingTotal: number): number {
    // 1 point for every 1000 currency units spent
    return Math.floor(bookingTotal / 1000);
  }

  // Add points for a completed booking
  static async addPointsForBooking(bookingId: mongoose.Types.ObjectId): Promise<void> {
    try {
      const booking = await Booking.findById(bookingId).populate('userId');
      
      if (!booking || booking.status !== 'completed' || booking.paymentStatus !== 'paid') {
        return;
      }

      // Check if points have already been added for this booking
      const existingLoyaltyProgram = await LoyaltyProgram.findOne({ userId: booking.userId });
      const pointsAlreadyAdded = existingLoyaltyProgram?.pointsHistory.some(
        history => history.bookingId?.toString() === bookingId.toString() && history.type === 'earned'
      );

      if (pointsAlreadyAdded) {
        return;
      }

      // Calculate points
      const points = this.calculatePointsForBooking(booking.pricing.totalAmount);

      // Update or create loyalty program record
      const loyaltyProgram = await LoyaltyProgram.findOneAndUpdate(
        { userId: booking.userId },
        {
          $inc: { totalPoints: points },
          $push: {
            pointsHistory: {
              bookingId: booking._id,
              points: points,
              type: 'earned',
              description: `Points earned for booking ${booking.bookingNumber}`
            }
          },
          $set: { lastUpdated: new Date() }
        },
        { new: true, upsert: true }
      );

      // Update tier if needed
      await this.updateUserTier(loyaltyProgram.userId);
    } catch (error) {
      console.error('Error adding points for booking:', error);
    }
  }

  // Update user's loyalty tier based on total points
  static async updateUserTier(userId: mongoose.Types.ObjectId): Promise<void> {
    try {
      const loyaltyProgram = await LoyaltyProgram.findOne({ userId });
      
      if (!loyaltyProgram) {
        return;
      }

      // Find the highest tier the user qualifies for
      let newTier = 'Bronze';
      for (const tier of LOYALTY_TIERS.sort((a, b) => b.minPoints - a.minPoints)) {
        if (loyaltyProgram.totalPoints >= tier.minPoints) {
          newTier = tier.name;
          break;
        }
      }

      // Update tier if it changed
      if (loyaltyProgram.currentTier !== newTier) {
        await LoyaltyProgram.updateOne(
          { userId },
          {
            $set: { 
              currentTier: newTier,
              lastUpdated: new Date()
            },
            $push: {
              pointsHistory: {
                points: 0,
                type: 'earned',
                description: `Tier upgraded to ${newTier}`
              }
            }
          }
        );
      }
    } catch (error) {
      console.error('Error updating user tier:', error);
    }
  }

  // Get available tiers
  static async getLoyaltyTiers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({
        success: true,
        data: LOYALTY_TIERS
      });
    } catch (error) {
      next(error);
    }
  }

  // Redeem points for discount
  static async redeemPoints(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?._id;
      const { points } = req.body;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!points || points <= 0) {
        res.status(400).json({ message: 'Valid points amount required' });
        return;
      }

      // Check if user has enough points
      const loyaltyProgram = await LoyaltyProgram.findOne({ userId });
      
      if (!loyaltyProgram || loyaltyProgram.totalPoints < points) {
        res.status(400).json({ message: 'Insufficient points' });
        return;
      }

      // Deduct points
      await LoyaltyProgram.updateOne(
        { userId },
        {
          $inc: { totalPoints: -points },
          $push: {
            pointsHistory: {
              points: -points,
              type: 'redeemed',
              description: `Redeemed ${points} points for discount`
            }
          },
          $set: { lastUpdated: new Date() }
        }
      );

      // Calculate discount value (10 points = 1 currency unit)
      const discountValue = points / 10;

      res.json({
        success: true,
        message: 'Points redeemed successfully',
        data: {
          pointsRedeemed: points,
          discountValue: discountValue
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's referral code
  static async getReferralCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?._id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // In a real implementation, this would generate a unique referral code
      // For now, we'll use the user ID as the referral identifier
      const referralCode = `REF-${userId.toString().substring(0, 8)}`;

      res.json({
        success: true,
        data: {
          referralCode,
          referralLink: `${process.env.FRONTEND_URL}/register?ref=${referralCode}`
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Process referral when a new user signs up
  static async processReferral(referralCode: string, newUserId: mongoose.Types.ObjectId): Promise<void> {
    try {
      // Extract userId from referral code (in a real implementation, you'd look up the code in a separate collection)
      const referrerId = referralCode.replace('REF-', '');
      
      if (!mongoose.Types.ObjectId.isValid(referrerId)) {
        return;
      }

      // Add referral record to referrer's loyalty program
      await LoyaltyProgram.findOneAndUpdate(
        { userId: referrerId },
        {
          $push: {
            referrals: {
              referredUserId: newUserId,
              pointsEarned: 100, // Bonus points for successful referral
              referralDate: new Date(),
              status: 'completed'
            },
            pointsHistory: {
              points: 100,
              type: 'referral',
              description: 'Points earned for successful referral'
            }
          },
          $inc: { totalPoints: 100 },
          $set: { lastUpdated: new Date() }
        },
        { new: true, upsert: true }
      );

      // Update referrer's tier
      await this.updateUserTier(new mongoose.Types.ObjectId(referrerId));
    } catch (error) {
      console.error('Error processing referral:', error);
    }
  }

  // Apply loyalty discount to a booking
  static async applyLoyaltyDiscount(userId: mongoose.Types.ObjectId, bookingId: mongoose.Types.ObjectId): Promise<number> {
    try {
      // Get user's loyalty program
      const loyaltyProgram = await LoyaltyProgram.findOne({ userId });
      
      if (!loyaltyProgram) {
        return 0; // No discount if user doesn't have a loyalty program
      }

      // Get current tier details
      const currentTier = LOYALTY_TIERS.find(tier => tier.name === loyaltyProgram.currentTier);
      
      if (!currentTier || currentTier.discountPercentage <= 0) {
        return 0; // No discount for this tier
      }

      // Get booking details
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Calculate discount amount
      const discountAmount = (booking.pricing.totalAmount * currentTier.discountPercentage) / 100;

      // Apply discount to booking
      if (!booking.pricing.discounts) {
        booking.pricing.discounts = [];
      }

      booking.pricing.discounts.push({
        type: 'percentage',
        amount: currentTier.discountPercentage,
        description: `${currentTier.name} tier discount (${currentTier.discountPercentage}%)`
      });

      booking.pricing.totalAmount = booking.pricing.totalAmount - discountAmount;

      // Add history entry
      booking.history.push({
        action: 'updated',
        changedBy: userId,
        oldValues: { totalAmount: booking.pricing.totalAmount + discountAmount },
        newValues: { totalAmount: booking.pricing.totalAmount },
        notes: `Applied ${currentTier.discountPercentage}% loyalty discount (${currentTier.name} tier)`
      } as any);

      await booking.save();

      return discountAmount;
    } catch (error) {
      console.error('Error applying loyalty discount:', error);
      throw error;
    }
  }

  // Helper method to get next tier
  private static getNextTier(currentPoints: number): { tier: string; pointsNeeded: number } | null {
    const sortedTiers = LOYALTY_TIERS.sort((a, b) => a.minPoints - b.minPoints);
    
    for (const tier of sortedTiers) {
      if (currentPoints < tier.minPoints) {
        return {
          tier: tier.name,
          pointsNeeded: tier.minPoints - currentPoints
        };
      }
    }
    
    // User is at the highest tier
    return null;
  }
}