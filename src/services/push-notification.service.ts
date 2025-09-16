import webpush from 'web-push';

import PushSubscription from '../models/PushSubscription';

// Configure web push with VAPID keys
// In production, these should be stored in environment variables
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'YOUR_PUBLIC_VAPID_KEY_HERE',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'YOUR_PRIVATE_VAPID_KEY_HERE',
};

webpush.setVapidDetails(
  'mailto:admin@stadiumbooking.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

export class PushNotificationService {
  // Add a subscription for a user
  static async addSubscription(userId: string, subscription: PushSubscriptionData): Promise<void> {
    try {
      // Remove any existing subscription with the same endpoint
      await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
      
      // Create new subscription
      await PushSubscription.create({
        userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      });
    } catch (error) {
      console.error('Error adding push subscription:', error);
      throw error;
    }
  }

  // Remove a subscription for a user
  static async removeSubscription(userId: string): Promise<void> {
    try {
      await PushSubscription.deleteMany({ userId });
    } catch (error) {
      console.error('Error removing push subscription:', error);
      throw error;
    }
  }

  // Remove a specific subscription by endpoint
  static async removeSubscriptionByEndpoint(endpoint: string): Promise<void> {
    try {
      await PushSubscription.deleteOne({ endpoint });
    } catch (error) {
      console.error('Error removing push subscription by endpoint:', error);
      throw error;
    }
  }

  // Get all subscriptions for a user
  static async getUserSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
    try {
      const subscriptions = await PushSubscription.find({ userId });
      return subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      }));
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      throw error;
    }
  }

  // Send notification to a specific user
  static async sendNotificationToUser(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      const subscriptions = await this.getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        throw new Error('No subscriptions found for user');
      }

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
      });

      // Send to all user subscriptions
      const promises = subscriptions.map(subscription => {
        return webpush.sendNotification(subscription, notificationPayload)
          .catch(async (error: any) => {
            console.error('Error sending push notification:', error);
            // Remove invalid subscription
            if (error instanceof webpush.WebPushError && error.statusCode === 410) {
              await this.removeSubscriptionByEndpoint(subscription.endpoint);
            }
            return null;
          });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending push notification to user:', error);
      throw error;
    }
  }

  // Send notification to all users
  static async sendNotificationToAll(payload: NotificationPayload): Promise<void> {
    try {
      const subscriptions = await PushSubscription.find({});
      
      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
      });

      const promises = subscriptions.map(subscription => {
        const subscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          }
        };

        return webpush.sendNotification(subscriptionData, notificationPayload)
          .catch(async (error: any) => {
            console.error('Error sending push notification:', error);
            // Remove invalid subscription
            if (error instanceof webpush.WebPushError && error.statusCode === 410) {
              await this.removeSubscriptionByEndpoint(subscription.endpoint);
            }
            return null;
          });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending push notification to all users:', error);
      throw error;
    }
  }

  // Send booking reminder notification
  static async sendBookingReminder(userId: string, bookingDetails: any): Promise<void> {
    const payload = {
      title: 'Booking Reminder',
      body: `Your booking for ${bookingDetails.stadiumName} is tomorrow at ${bookingDetails.startTime}`,
      url: '/bookings',
    };

    await this.sendNotificationToUser(userId, payload);
  }

  // Send booking confirmation notification
  static async sendBookingConfirmation(userId: string, bookingDetails: any): Promise<void> {
    const payload = {
      title: 'Booking Confirmed',
      body: `Your booking for ${bookingDetails.stadiumName} on ${bookingDetails.date} is confirmed`,
      url: '/bookings',
    };

    await this.sendNotificationToUser(userId, payload);
  }

  // Send special offer notification
  static async sendSpecialOffer(userId: string, offerDetails: any): Promise<void> {
    const payload = {
      title: 'Special Offer',
      body: offerDetails.message,
      url: '/stadiums',
    };

    await this.sendNotificationToUser(userId, payload);
  }
}