import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: admin.app.App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeFirebaseAdmin();
  }

  private initializeFirebaseAdmin() {
    try {
      // Check if Firebase Admin is already initialized
      if (admin.apps.length > 0) {
        this.app = admin.app();
        this.logger.log('Using existing Firebase Admin app');
        return;
      }

      // Try to get service account from environment
      const serviceAccountPath = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_PATH',
      );
      const serviceAccountJson = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_JSON',
      );

      let credential: admin.credential.Credential;
      let projectId: string | undefined;

      if (serviceAccountPath) {
        // Initialize with service account file path
        credential = admin.credential.cert(serviceAccountPath);
        this.logger.log('Initialized Firebase Admin with service account file');
      } else if (serviceAccountJson) {
        // Initialize with service account JSON string
        const serviceAccount = JSON.parse(serviceAccountJson);
        credential = admin.credential.cert(serviceAccount);
        projectId = serviceAccount.project_id || serviceAccount.projectId;
        this.logger.log('Initialized Firebase Admin with service account JSON');
      } else {
        // Try individual config values
        projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
        const privateKey = this.configService
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n');
        const clientEmail = this.configService.get<string>(
          'FIREBASE_CLIENT_EMAIL',
        );

        if (projectId && privateKey && clientEmail) {
          credential = admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          });
          this.logger.log('Initialized Firebase Admin with individual config');
        } else {
          // Fallback to default credentials (for GCP environments)
          credential = admin.credential.applicationDefault();
          projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
          this.logger.log(
            'Initialized Firebase Admin with application default credentials',
          );
        }
      }

      this.app = admin.initializeApp({
        credential,
        projectId:
          projectId || this.configService.get<string>('FIREBASE_PROJECT_ID'),
      });

      this.logger.log('Firebase Admin initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
      throw error;
    }
  }

  /**
   * Get the Firebase Admin app instance
   */
  getApp(): admin.app.App {
    if (!this.app) {
      throw new Error('Firebase Admin not initialized');
    }
    return this.app;
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth(): admin.auth.Auth {
    return this.getApp().auth();
  }

  /**
   * Get Firebase Firestore instance
   */
  getFirestore(): admin.firestore.Firestore {
    return this.getApp().firestore();
  }

  /**
   * Verify and decode a Firebase ID token
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.getAuth().verifyIdToken(idToken);
    } catch (error) {
      this.logger.error('Failed to verify ID token', error);
      throw error;
    }
  }

  /**
   * Get user by UID
   */
  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    try {
      return await this.getAuth().getUser(uid);
    } catch (error) {
      this.logger.error(`Failed to get user ${uid}`, error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    try {
      return await this.getAuth().getUserByEmail(email);
    } catch (error) {
      this.logger.error(`Failed to get user by email ${email}`, error);
      throw error;
    }
  }
}
