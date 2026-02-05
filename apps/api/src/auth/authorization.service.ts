import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AuthedRequestUser } from './firebase-auth.guard';

/**
 * Centralized authorization checks for use across services.
 * - isAdmin: whether the user can act on behalf of many resources (e.g. any user id).
 * - isSelf: whether the user is the owner of the requested resource (e.g. their own data).
 * Keep these separate: admins can access many ids; isSelf restricts non-admins to their own data.
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);
  /** True if the user has admin role (can access any user's data, list users, etc.). */
  isAdmin(user: AuthedRequestUser): boolean {
    return user.role === 'ADMIN';
  }

  /** True if the authenticated user is the same as the given resource user id (own data only). */
  isSelf(authedUser: AuthedRequestUser, resourceUserId: string): boolean {
    return authedUser.id === resourceUserId;
  }

  /**
   * True if the user can access the target user's data (admin or self).
   * Use when you need "allow if admin OR requesting own user".
   */
  canAccessUser(authedUser: AuthedRequestUser, targetUserId: string): boolean {
    return this.isAdmin(authedUser) || this.isSelf(authedUser, targetUserId);
  }

  /**
   * Throws ForbiddenException if the user cannot access the target user's data.
   * Use in services when you want to fail fast with a clear error.
   */
  assertCanAccessUser(
    authedUser: AuthedRequestUser,
    targetUserId: string,
    message = 'You are not authorized to access this resource',
  ): void {
    if (!this.canAccessUser(authedUser, targetUserId)) {
      this.logger.warn(
        `User ${authedUser.id} is not authorized to access user ${targetUserId}`,
      );
      throw new ForbiddenException(message);
    }
  }
  /**
   * Throws ForbiddenException if the user is not an admin.
   * Use in services when you want to fail fast with a clear error.
   */
  assertIsAdmin(
    authedUser: AuthedRequestUser,
    message = 'You are not authorized to access this resource',
  ): void {
    if (!this.isAdmin(authedUser)) {
      this.logger.warn(`User ${authedUser.id} is not an admin`);
      throw new ForbiddenException(message);
    }
  }
}
