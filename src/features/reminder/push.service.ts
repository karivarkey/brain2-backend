/**
 * Push notification service
 * Handles FCM push notifications using Firebase Admin
 */

import admin from "firebase-admin";
import serviceAccount from "../../../admin.json" assert { type: "json" };

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushNotificationService {
  /**
   * Send a push notification to a specific device
   */
  static async send(payload: PushNotificationPayload): Promise<string> {
    const { token, title, body, data = {} } = payload;

    try {
      const messageId = await admin.messaging().send({
        token,
        data: {
          title,
          body,
          ...data,
        },
        webpush: {
          notification: {
            title,
            body,
            icon: "https://ai.karivarkey.in/icons/icon-192.png",
            badge: "https://ai.karivarkey.in/icons/icon-192.png",
          },
        },
      });

      console.log(`✅ Push notification sent successfully: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error("❌ Failed to send push notification:", error);
      throw error;
    }
  }

  /**
   * Send a reminder notification
   */
  static async sendReminder(
    token: string,
    title: string,
    body: string,
    reminderId?: string,
  ): Promise<string> {
    return this.send({
      token,
      title,
      body,
      data: {
        type: "reminder",
        ...(reminderId && { reminderId }),
      },
    });
  }
}

export const pushService = PushNotificationService;
