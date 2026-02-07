import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseAdminModule } from './auth/firebase-admin.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AccountsModule } from './accounts/accounts.module';
import { resolve } from 'path';

// Determine project root (two levels up from apps/api/src)
const projectRoot = resolve(__dirname, '../../../../');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(projectRoot, '.env'),
    }),
    PrismaModule,
    FirebaseAdminModule,
    AuthModule,
    TransactionsModule,
    AccountsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
