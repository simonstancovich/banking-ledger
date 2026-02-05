import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { AuthorizationService } from './authorization.service';
import { FirebaseAdminModule } from './firebase-admin.module';

@Module({
  imports: [UsersModule, PrismaModule, FirebaseAdminModule],
  providers: [FirebaseAuthGuard, AuthorizationService],
  controllers: [AuthController],
  exports: [FirebaseAuthGuard, AuthorizationService],
})
export class AuthModule {}
