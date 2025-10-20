import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPushSubscription extends Document {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema: Schema<IPushSubscription> = new mongoose.Schema({
  userId: {
    type: String,
    required: true
    // Removed index: true to prevent duplicate index warning
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
pushSubscriptionSchema.index({ userId: 1 });
pushSubscriptionSchema.index({ endpoint: 1 });

const PushSubscription: Model<IPushSubscription> = mongoose.model<IPushSubscription>('PushSubscription', pushSubscriptionSchema);

export default PushSubscription;