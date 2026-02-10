import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

/**
 * Rate limit by authenticated user id when available, otherwise by IP.
 * Use with APP_GUARD so transfer/deposit/withdrawal and list are throttled per user.
 */
@Injectable()
export class ThrottlerUserGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { id?: string } | undefined;
    if (user?.id) {
      return `user:${user.id}`;
    }
    const ip = req.ip ?? (req as { ips?: string[] }).ips?.[0] ?? 'unknown';
    return `ip:${ip}`;
  }
}
