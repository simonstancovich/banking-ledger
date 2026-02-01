import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { FirebaseAdminService } from './firebase-admin';

export type AuthedRequestUser = {
    firebaseUid: string;
    email: string;
};

interface AuthedRequest extends Request {
  user?: AuthedRequestUser;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private firebaseAdmin: FirebaseAdminService) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();

    const authHeader: string | undefined = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing bearer token');
        }

        const token = authHeader.slice('Bearer '.length).trim();
        try {
      const decoded = await this.firebaseAdmin.verifyIdToken(token);

            const email = decoded.email;
            if (!email) throw new UnauthorizedException('Token missing email');

            req.user = {
                firebaseUid: decoded.uid,
                email,
      };

            return true;
        } catch {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
