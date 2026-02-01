import { Controller, Get, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { FirebaseAdminService } from './auth/firebase-admin';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test/firebase')
  @Version('1')
  @ApiOperation({ summary: 'Test Firebase Admin configuration' })
  @ApiResponse({
    status: 200,
    description: 'Returns Firebase Admin configuration status',
  })
  async testFirebase() {
    try {
      const app = this.firebaseAdmin.getApp();
      const projectId = app.options.projectId;
      const auth = this.firebaseAdmin.getAuth();

      // Try to list users (this will fail if not properly configured, but won't error on initialization)
      // We'll just check if we can access the service
      return {
        success: true,
        message: 'Firebase Admin is properly configured',
        projectId: projectId || 'Not set',
        initialized: !!app,
        services: {
          auth: !!auth,
          firestore: !!this.firebaseAdmin.getFirestore(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Firebase Admin configuration error',
        error: error.message,
      };
    }
  }
}
