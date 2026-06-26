import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface FirebaseUserInfo {
  uid: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (getApps().length > 0) {
      this.app = getApps()[0]!;
      return;
    }

    try {
      const credPath = this.configService.get<string>('firebase.serviceAccountPath');
      const projectId = this.configService.get<string>('firebase.projectId');

      if (credPath && existsSync(resolve(credPath))) {
        const serviceAccount = JSON.parse(readFileSync(resolve(credPath), 'utf8'));
        this.app = initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId ?? serviceAccount.project_id,
        });
        this.logger.log('Firebase Admin initialized');
        return;
      }

      const clientEmail = this.configService.get<string>('firebase.clientEmail');
      const privateKey = this.configService.get<string>('firebase.privateKey');

      if (projectId && clientEmail && privateKey) {
        this.app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.logger.log('Firebase Admin initialized from env');
        return;
      }

      this.logger.warn(
        'Firebase غير مُعد — أضف FIREBASE_SERVICE_ACCOUNT_PATH أو مفاتيح Firebase في .env',
      );
    } catch (err) {
      this.logger.error('فشل تهيئة Firebase Admin', err);
    }
  }

  get isReady() {
    return this.app != null;
  }

  private getMessaging(): Messaging | null {
    if (!this.app) return null;
    return getMessaging(this.app);
  }

  async sendPushToDevice(
    fcmToken: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<boolean> {
    const messaging = this.getMessaging();
    if (!messaging || !fcmToken) return false;

    try {
      await messaging.send({
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'som_auctions_high',
            priority: 'max',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
      });
      return true;
    } catch (err) {
      this.logger.warn(`FCM send failed: ${(err as Error).message}`);
      return false;
    }
  }

  async verifyIdToken(idToken: string): Promise<FirebaseUserInfo> {
    if (!this.app) {
      throw new Error('Firebase Admin غير مُعد على السيرفر');
    }

    const decoded = await getAuth(this.app).verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) {
      throw new Error('حساب Google بدون بريد إلكتروني');
    }

    return {
      uid: decoded.uid,
      email,
      fullName: decoded.name ?? email.split('@')[0],
      avatarUrl: decoded.picture,
      emailVerified: decoded.email_verified ?? false,
    };
  }
}
