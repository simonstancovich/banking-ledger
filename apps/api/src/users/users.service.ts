import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma';
import { AuthedRequestUser } from '../auth/firebase-auth.guard';
import { AuthorizationService } from '../auth/authorization.service';
import {
  UserResponseDto,
  GetAllUsersResponseDto,
} from './dto/user-response.dto';
import {
  GetAllUsersQueryDto,
  GET_ALL_USERS_DEFAULTS,
  SortableUserField,
  SortOrder,
} from './dto/get-all-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '../generated/prisma';

export interface GetOrCreateUserResult {
  user: UserResponseDto;
  created: boolean;
}

/** Shape returned by USER_SELECT_PUBLIC. */
type UserSelectResult = {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

/** Resolved query params for list-all-users (defaults applied). */
type ResolvedGetAllUsersQuery = {
  page: number;
  limit: number;
  sortBy: SortableUserField;
  sortOrder: SortOrder;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  private static readonly USER_SELECT_PUBLIC = {
    id: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
  ) {}

  async getOrCreateUser(
    firebaseUid: string,
    email: string,
  ): Promise<GetOrCreateUserResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { firebaseUid },
          select: UsersService.USER_SELECT_PUBLIC,
        });

        return existingUser
          ? this.handleExistingUser(tx, existingUser, email, firebaseUid)
          : this.createNewUser(tx, firebaseUid, email);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to get or create user: ${email} (${firebaseUid})`,
        error,
      );
      throw error;
    }
  }

  private async handleExistingUser(
    tx: Prisma.TransactionClient,
    existingUser: UserSelectResult,
    email: string,
    firebaseUid: string,
  ): Promise<GetOrCreateUserResult> {
    if (existingUser.email !== email) {
      const user = await tx.user.update({
        where: { firebaseUid },
        data: { email },
      });
      this.logger.log(
        `Updated existing user email: ${existingUser.email} -> ${email} (${firebaseUid})`,
      );
      return { user: this.toUserResponse(user), created: false };
    }
    this.logger.log(`Found existing user: ${email} (${firebaseUid})`);
    return { user: this.toUserResponse(existingUser), created: false };
  }

  private async createNewUser(
    tx: Prisma.TransactionClient,
    firebaseUid: string,
    email: string,
  ): Promise<GetOrCreateUserResult> {
    const user = await tx.user.create({
      data: { firebaseUid, email, role: 'USER' },
    });
    this.logger.log(`Created new user: ${email} (${firebaseUid})`);
    return { user: this.toUserResponse(user), created: true };
  }

  async getUser(
    id: string,
    authedUser: AuthedRequestUser,
  ): Promise<UserResponseDto> {
    this.authorization.assertCanAccessUser(authedUser, id);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: UsersService.USER_SELECT_PUBLIC,
    });

    if (!user) {
      this.logger.warn(`User with id ${id} not found`);
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async getAllUsers(
    authedUser: AuthedRequestUser,
    query: GetAllUsersQueryDto,
  ): Promise<GetAllUsersResponseDto> {
    this.authorization.assertIsAdmin(authedUser);

    const resolved = this.resolveGetAllUsersQuery(query);
    const { users, total } = await this.fetchUsersPaginated(resolved);

    return {
      data: users.map((user) => this.toUserResponse(user)),
      total,
      page: resolved.page,
      limit: resolved.limit,
      totalPages: Math.ceil(total / resolved.limit),
    };
  }

  private async fetchUsersPaginated(
    resolved: ResolvedGetAllUsersQuery,
  ): Promise<{ users: UserSelectResult[]; total: number }> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        select: UsersService.USER_SELECT_PUBLIC,
        skip: (resolved.page - 1) * resolved.limit,
        take: resolved.limit,
        orderBy: { [resolved.sortBy]: resolved.sortOrder } as const,
      }),
      this.prisma.user.count(),
    ]);
    return { users, total };
  }

  private resolveGetAllUsersQuery(
    query: GetAllUsersQueryDto,
  ): ResolvedGetAllUsersQuery {
    return {
      page: query.page ?? GET_ALL_USERS_DEFAULTS.page,
      limit: query.limit ?? GET_ALL_USERS_DEFAULTS.limit,
      sortBy: query.sortBy ?? GET_ALL_USERS_DEFAULTS.sortBy,
      sortOrder: query.sortOrder ?? GET_ALL_USERS_DEFAULTS.sortOrder,
    };
  }

  async updateUser(
    authedUser: AuthedRequestUser,
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.authorization.assertCanAccessUser(authedUser, id);

    const data = this.resolveUpdateData(authedUser, updateUserDto);

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        select: UsersService.USER_SELECT_PUBLIC,
      });
      this.logger.log(`Updated user: ${user.email} (${user.id})`);
      return this.toUserResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update user: ${id}`, error);
      throw new InternalServerErrorException('Failed to update user', {
        cause: error,
      });
    }
  }

  private resolveUpdateData(
    authedUser: AuthedRequestUser,
    updateUserDto: UpdateUserDto,
  ): { email?: string; role?: Role } {
    const data: { email?: string; role?: Role } = {
      ...(updateUserDto.email !== undefined && { email: updateUserDto.email }),
    };
    if (updateUserDto.role !== undefined) {
      if (!this.authorization.isAdmin(authedUser)) {
        throw new ForbiddenException('Only admins can change user role');
      }
      data.role = updateUserDto.role;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }
    return data;
  }

  async deleteUser(authedUser: AuthedRequestUser, id: string): Promise<void> {
    this.authorization.assertIsAdmin(authedUser);
    await this.performDeleteUser(id);
  }

  private async performDeleteUser(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
      this.logger.log(`Deleted user: ${id}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`User with id ${id} not found`);
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  private toUserResponse(user: UserSelectResult): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
