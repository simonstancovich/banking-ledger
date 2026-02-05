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
import { PrismaService } from '../prisma/prisma.service';

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
    private prisma: PrismaService,
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

      const dbUser = await this.prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!dbUser) {
        this.logger.warn('User not found in database');
        throw new UnauthorizedException('User not found in database');
      }

      const email = decoded.email;
      if (!email) {
        this.logger.warn('Email not found in token');
        throw new UnauthorizedException('Email not found in token');
      }

      req.user = {
        firebaseUid: decoded.uid,
        email: dbUser.email,
        id: dbUser.id,
        role: dbUser.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn('Auth failed', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
