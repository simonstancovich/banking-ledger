import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { FirebaseAdminService } from './firebase-admin';
import { Role } from '../generated/prisma';
import { UsersService } from '../users/users.service';

export type AuthedRequestUser = {
  firebaseUid: string;
  email: string;
  id: string;
  role: Role;
};

/** Request with optional user (set by FirebaseAuthGuard on protected routes). */
export interface AuthedRequest extends Request {
  user?: AuthedRequestUser;
}

/** Request after guard has run; user is always set. Use in controller handlers. */
export type AuthedRequestGuarded = AuthedRequest & { user: AuthedRequestUser };

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private firebaseAdmin: FirebaseAdminService,
    private usersService: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();

    const authHeader: string | undefined = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.warn('Missing bearer token');
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    try {
      const decoded = await this.firebaseAdmin.verifyIdToken(token);

      const email = decoded.email;
      if (!email) {
        this.logger.warn('Email not found in token');
        throw new UnauthorizedException('Email not found in token');
      }

      // Always sync: create DB user if missing (e.g. first login after Firebase signup)
      const result = await this.usersService.getOrCreateUser(
        decoded.uid,
        email,
      );

      req.user = {
        firebaseUid: decoded.uid,
        email: result.user.email,
        id: result.user.id,
        role: result.user.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn('Auth failed', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
