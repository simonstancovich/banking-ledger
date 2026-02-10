import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthedRequestUser } from '../auth/firebase-auth.guard';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountResponseDto } from './dto/account-response.dto';
import {
  AccountWithUserResponseDto,
  GetAllAccountsResponseDto,
} from './dto/account-with-user-response.dto';
import {
  GetAllAccountsQueryDto,
  GET_ALL_ACCOUNTS_DEFAULTS,
  SortableAccountField,
  SortOrder,
} from './dto/get-all-accounts-query.dto';
import { Prisma, AccountType } from '../generated/prisma';

/** Resolved query params for admin list-all-accounts (defaults applied). */
type ResolvedGetAllAccountsQuery = {
  page: number;
  limit: number;
  sortBy: SortableAccountField;
  sortOrder: SortOrder;
};

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  private static readonly ACCOUNT_SELECT_RESPONSE = {
    id: true,
    type: true,
    name: true,
    balanceCents: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private static readonly ACCOUNT_SELECT_WITH_USER = {
    ...AccountsService.ACCOUNT_SELECT_RESPONSE,
    user: { select: { id: true, email: true } },
  } as const;

  async createAccount(
    authedUser: AuthedRequestUser,
    createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    try {
      const account = await this.prisma.account.create({
        data: {
          userId: authedUser.id,
          name: createAccountDto.name,
          type: createAccountDto.type ?? AccountType.CHECKING,
          balanceCents: createAccountDto.balanceCents ?? 0,
        },
        select: AccountsService.ACCOUNT_SELECT_RESPONSE,
      });
      return account;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Account with name ${createAccountDto.name} already exists`,
        );
        throw new ConflictException('Account with this name already exists');
      }
      this.logger.error(`Failed to create account: ${error.message}`, error);
      throw error;
    }
  }

  async getAccount(
    authedUser: AuthedRequestUser,
    id: string,
  ): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { id, userId: authedUser.id },
      select: AccountsService.ACCOUNT_SELECT_RESPONSE,
    });
    if (!account) {
      this.logger.warn(`Account with id ${id} not found`);
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  async getAllAccounts(
    authedUser: AuthedRequestUser,
    query?: GetAllAccountsQueryDto,
  ): Promise<AccountResponseDto[] | GetAllAccountsResponseDto> {
    return this.authorization.isAdmin(authedUser)
      ? this.getAllAccountsAsAdmin(query)
      : this.getMyAccounts(authedUser.id);
  }

  async updateAccount(
    authedUser: AuthedRequestUser,
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.authorization.isAdmin(authedUser)
      ? this.updateAccountAsAdmin(id, updateAccountDto)
      : this.updateAccountAsUser(id, authedUser, updateAccountDto);
  }

  async deleteAccount(
    authedUser: AuthedRequestUser,
    id: string,
  ): Promise<void> {
    this.authorization.assertIsAdmin(authedUser);
    try {
      await this.prisma.account.delete({ where: { id } });
      this.logger.log(`Deleted account: ${id}`);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`Account with id ${id} not found`);
        throw new NotFoundException('Account not found');
      }
      this.logger.error(`Failed to delete account: ${id}`, error);
      throw error;
    }
  }

  private async getAllAccountsAsAdmin(
    query?: GetAllAccountsQueryDto,
  ): Promise<GetAllAccountsResponseDto> {
    const resolved = this.resolveGetAllAccountsQuery(query);
    const { accounts, total } =
      await this.fetchAccountsPaginatedAsAdmin(resolved);

    return {
      data: accounts,
      total,
      page: resolved.page,
      limit: resolved.limit,
      totalPages: Math.ceil(total / resolved.limit),
    };
  }

  private resolveUpdateData(updateAccountDto: UpdateAccountDto): {
    name?: string;
    type?: AccountType;
  } {
    const data: { name?: string; type?: AccountType } = {
      ...(updateAccountDto.name !== undefined && {
        name: updateAccountDto.name,
      }),
      ...(updateAccountDto.type !== undefined && {
        type: updateAccountDto.type,
      }),
    };
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }
    return data;
  }

  private async updateAccountAsUser(
    id: string,
    authedUser: AuthedRequestUser,
    updateAccountDto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    const data = this.resolveUpdateData(updateAccountDto);
    return this.performAccountUpdate({ id, userId: authedUser.id }, data);
  }

  private async updateAccountAsAdmin(
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    const data = this.resolveUpdateData(updateAccountDto);
    return this.performAccountUpdate({ id }, data);
  }

  private async performAccountUpdate(
    where: Prisma.AccountWhereUniqueInput,
    data: Prisma.AccountUpdateInput,
  ): Promise<AccountResponseDto> {
    try {
      return await this.prisma.account.update({
        where,
        data,
        select: AccountsService.ACCOUNT_SELECT_RESPONSE,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`Account with id ${where.id} not found`);
        throw new NotFoundException('Account not found');
      }
      this.logger.error(`Failed to update account: ${where.id}`, error);
      throw error;
    }
  }

  private resolveGetAllAccountsQuery(
    query?: GetAllAccountsQueryDto,
  ): ResolvedGetAllAccountsQuery {
    return {
      page: query?.page ?? GET_ALL_ACCOUNTS_DEFAULTS.page,
      limit: query?.limit ?? GET_ALL_ACCOUNTS_DEFAULTS.limit,
      sortBy: query?.sortBy ?? GET_ALL_ACCOUNTS_DEFAULTS.sortBy,
      sortOrder: query?.sortOrder ?? GET_ALL_ACCOUNTS_DEFAULTS.sortOrder,
    };
  }

  private async fetchAccountsPaginatedAsAdmin(
    resolved: ResolvedGetAllAccountsQuery,
  ): Promise<{
    accounts: AccountWithUserResponseDto[];
    total: number;
  }> {
    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        select: AccountsService.ACCOUNT_SELECT_WITH_USER,
        skip: (resolved.page - 1) * resolved.limit,
        take: resolved.limit,
        orderBy: { [resolved.sortBy]: resolved.sortOrder } as const,
      }),
      this.prisma.account.count(),
    ]);
    return { accounts, total };
  }

  private async getMyAccounts(userId: string): Promise<AccountResponseDto[]> {
    return this.prisma.account.findMany({
      where: { userId },
      select: AccountsService.ACCOUNT_SELECT_RESPONSE,
      orderBy: { createdAt: 'desc' },
    });
  }
}
