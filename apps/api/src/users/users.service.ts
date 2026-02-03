import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../generated/prisma';

export interface GetOrCreateUserResult {
  user: User;
  created: boolean;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async getOrCreateUser(
    firebaseUid: string,
    email: string,
  ): Promise<GetOrCreateUserResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { firebaseUid },
        });

        if (existingUser) {
          // User exists - update email only if changed
          if (existingUser.email !== email) {
            const user = await tx.user.update({
              where: { firebaseUid },
              data: {
                email,
              },
            });
            this.logger.log(
              `Updated existing user email: ${existingUser.email} -> ${email} (${firebaseUid})`,
            );
            return { user, created: false };
          }

          // Email unchanged - return existing user without update
          this.logger.log(`Found existing user: ${email} (${firebaseUid})`);
          return { user: existingUser, created: false };
        }

        // User doesn't exist - create
        const user = await tx.user.create({
          data: {
            firebaseUid,
            email,
            role: 'USER',
          },
        });

        this.logger.log(`Created new user: ${email} (${firebaseUid})`);
        return { user, created: true };
      });
    } catch (error) {
      this.logger.error(
        `Failed to get or create user: ${email} (${firebaseUid})`,
        error,
      );
      throw error;
    }
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, _updateUserDto: unknown) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
