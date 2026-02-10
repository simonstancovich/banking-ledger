import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseAdminModule } from './auth/firebase-admin.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AccountsModule } from './accounts/accounts.module';
import { ThrottlerUserGuard } from './common/guards/throttler-user.guard';
import { resolve } from 'path';

// Determine project root (two levels up from apps/api/src)
const projectRoot = resolve(__dirname, '../../../../');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(projectRoot, '.env'),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute
        limit: 100, // 100 requests per minute per user (or per IP when unauthenticated)
      },
    ]),
    PrismaModule,
    FirebaseAdminModule,
    AuthModule,
    TransactionsModule,
    AccountsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerUserGuard }],
})
export class AppModule {}
