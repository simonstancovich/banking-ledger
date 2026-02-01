import { Module, Global } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin';

@Global()
@Module({
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class FirebaseAdminModule {}
