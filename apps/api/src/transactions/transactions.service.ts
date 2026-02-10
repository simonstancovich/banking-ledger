import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthedRequestUser } from '../auth/firebase-auth.guard';
import type { Prisma } from '../generated/prisma';
import {
  IdempotencyStatus,
  TransactionStatus,
  TransactionType,
} from '../generated/prisma';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import {
  GetAllTransactionsQueryDto,
  GET_ALL_TRANSACTIONS_DEFAULTS,
} from './dto/get-all-transactions-query.dto';
import { randomUUID } from 'crypto';

/** Reusable shape for a transaction in API responses (single leg). */
export interface TransactionSummary {
  id: string;
  accountId: string;
  amountCents: number;
  status: TransactionStatus;
}

/** Single transaction row for list and get-by-id responses. One source of truth for the read shape. */
export interface TransactionListItem {
  id: string;
  accountId: string;
  amountCents: number;
  transferId: string;
  transactionDate: Date;
  transactionNote: string | null;
  status: TransactionStatus;
  type: TransactionType;
  createdAt: Date;
}

function toTransactionSummary(tx: {
  id: string;
  accountId: string;
  amountCents: number;
  status: TransactionStatus;
}): TransactionSummary {
  return {
    id: tx.id,
    accountId: tx.accountId,
    amountCents: tx.amountCents,
    status: tx.status,
  };
}

/** Result of creating a transfer: both legs and the shared transferId. */
export interface CreateTransferResult {
  type: 'TRANSFER';
  transferId: string;
  fromTransaction: TransactionSummary;
  toTransaction: TransactionSummary;
}

/** Response of createTransfer: result + idempotency status for frontend (clear localStorage on COMPLETED replay). */
export interface CreateTransferResponse {
  result: CreateTransferResult;
  idempotencyStatus: 'CREATED' | 'COMPLETED';
}

/** Generic idempotency response for any operation (transfer, deposit, withdrawal). */
export interface IdempotencyResponse<T> {
  result: T;
  idempotencyStatus: 'CREATED' | 'COMPLETED';
}

const IDEMPOTENCY_CONFLICT_MESSAGE =
  'A request with this idempotency key is already in progress. Retry after a short delay.';

/** Result of a one-legged deposit (credit to own account). */
export interface CreateDepositResult {
  type: 'DEPOSIT';
  transferId: string;
  transaction: TransactionSummary;
}

/** Result of a one-legged withdrawal (debit from own account). */
export interface CreateWithdrawalResult {
  type: 'WITHDRAWAL';
  transferId: string;
  transaction: TransactionSummary;
}

/** Response of createDeposit (result + idempotency status). */
export type CreateDepositResponse = IdempotencyResponse<CreateDepositResult>;

/** Response of createWithdrawal (result + idempotency status). */
export type CreateWithdrawalResponse =
  IdempotencyResponse<CreateWithdrawalResult>;

export type CreateTransactionResult =
  | CreateTransferResult
  | CreateDepositResult
  | CreateWithdrawalResult;

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  // ─── Public: mutations (idempotent) ───────────────────────────────────────

  async createTransfer(
    authedUser: AuthedRequestUser,
    createTransactionDto: CreateTransferDto,
    idempotencyKey: string,
  ): Promise<CreateTransferResponse> {
    if (!idempotencyKey?.trim()) {
      this.logger.warn('Idempotency-Key header is required');
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const key = idempotencyKey.trim();

    if (
      createTransactionDto.fromAccountId === createTransactionDto.toAccountId
    ) {
      this.logger.warn('From and to account IDs cannot be the same');
      throw new BadRequestException(
        'From account and to account cannot be the same',
      );
    }
    if (createTransactionDto.amountCents <= 0) {
      this.logger.warn('Amount cannot be less than or equal to 0');
      throw new BadRequestException(
        `Amount ${createTransactionDto.amountCents} cannot be less than or equal to 0`,
      );
    }

    return this.withIdempotency<CreateTransferResult>(
      authedUser.id,
      key,
      async (tx) => this.doTransfer(tx, authedUser.id, createTransactionDto),
    );
  }

  async createDeposit(
    authedUser: AuthedRequestUser,
    dto: CreateDepositDto,
    idempotencyKey: string,
  ): Promise<CreateDepositResponse> {
    if (!idempotencyKey?.trim()) {
      this.logger.warn('Idempotency-Key header is required');
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const key = idempotencyKey.trim();
    if (dto.amountCents <= 0) {
      this.logger.warn('Amount cannot be less than or equal to 0');
      throw new BadRequestException(
        `Amount ${dto.amountCents} cannot be less than or equal to 0`,
      );
    }
    return this.withIdempotency<CreateDepositResult>(
      authedUser.id,
      key,
      async (tx) => this.doDeposit(tx, authedUser.id, dto),
    );
  }

  async createWithdrawal(
    authedUser: AuthedRequestUser,
    dto: CreateWithdrawalDto,
    idempotencyKey: string,
  ): Promise<CreateWithdrawalResponse> {
    if (!idempotencyKey?.trim()) {
      this.logger.warn('Idempotency-Key header is required');
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const key = idempotencyKey.trim();
    if (dto.amountCents <= 0) {
      this.logger.warn('Amount cannot be less than or equal to 0');
      throw new BadRequestException(
        `Amount ${dto.amountCents} cannot be less than or equal to 0`,
      );
    }
    return this.withIdempotency<CreateWithdrawalResult>(
      authedUser.id,
      key,
      async (tx) => this.doWithdrawal(tx, authedUser.id, dto),
    );
  }

  // ─── Public: reads ───────────────────────────────────────────────────────

  async getTransactions(
    authedUser: AuthedRequestUser,
    query?: GetAllTransactionsQueryDto,
  ): Promise<{
    data: TransactionListItem[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const limit = Math.min(
      query?.limit ?? GET_ALL_TRANSACTIONS_DEFAULTS.limit,
      GET_ALL_TRANSACTIONS_DEFAULTS.maxLimit,
    );

    const accountIds = await this.resolveAccountIdsForTransactions(
      authedUser.id,
      query?.accountIds,
    );
    if (accountIds.length === 0) {
      return { data: [], hasMore: false };
    }

    const where: Prisma.TransactionWhereInput = {
      accountId: { in: accountIds },
    };
    if (query?.cursor) {
      where.id = { lt: query.cursor };
    }
    if (query?.since ?? query?.until) {
      where.transactionDate = {
        ...(query?.since && { gte: new Date(query.since) }),
        ...(query?.until && { lte: new Date(query.until) }),
      };
    }

    const take = limit + 1;
    const rows = await this.prisma.transaction.findMany({
      where,
      select: {
        id: true,
        accountId: true,
        amountCents: true,
        transferId: true,
        transactionDate: true,
        transactionNote: true,
        status: true,
        type: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
      take,
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  /**
   * [Admin] List transactions for a specific user (by userId).
   * @throws ForbiddenException if not admin
   */
  async getTransactionsByUserId(
    authedUser: AuthedRequestUser,
    userId: string,
    query?: GetAllTransactionsQueryDto,
  ): Promise<{
    data: TransactionListItem[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    this.authorization.assertIsAdmin(authedUser);
    return this.getTransactions(
      { ...authedUser, id: userId } as AuthedRequestUser,
      query,
    );
  }

  /**
   * [Admin] List all transactions (cursor-paginated).
   * @throws ForbiddenException if not admin
   */
  async getAllTransactionsAdmin(
    authedUser: AuthedRequestUser,
    query?: GetAllTransactionsQueryDto,
  ): Promise<{
    data: TransactionListItem[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    this.authorization.assertIsAdmin(authedUser);
    const limit = Math.min(
      query?.limit ?? GET_ALL_TRANSACTIONS_DEFAULTS.limit,
      GET_ALL_TRANSACTIONS_DEFAULTS.maxLimit,
    );
    const where: Prisma.TransactionWhereInput = {};
    if (query?.cursor) where.id = { lt: query.cursor };
    if (query?.since ?? query?.until) {
      where.transactionDate = {
        ...(query?.since && { gte: new Date(query.since) }),
        ...(query?.until && { lte: new Date(query.until) }),
      };
    }
    const take = limit + 1;
    const rows = await this.prisma.transaction.findMany({
      where,
      select: {
        id: true,
        accountId: true,
        amountCents: true,
        transferId: true,
        transactionDate: true,
        transactionNote: true,
        status: true,
        type: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
      take,
    });
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;
    return { data, nextCursor, hasMore };
  }

  /**
   * Fetch a single transaction by id. Returns it only if it belongs to one of the user's accounts.
   * @throws NotFoundException if not found or not owned by the user
   */
  async getTransaction(
    authedUser: AuthedRequestUser,
    id: string,
  ): Promise<TransactionListItem> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        accountId: true,
        amountCents: true,
        transferId: true,
        transactionDate: true,
        transactionNote: true,
        status: true,
        type: true,
        createdAt: true,
        account: { select: { userId: true } },
      },
    });
    if (!transaction || transaction.account.userId !== authedUser.id) {
      throw new NotFoundException('Transaction not found');
    }
    const { account, ...rest } = transaction;
    return rest;
  }

  // ─── Private: idempotency ───────────────────────────────────────────────

  /**
   * Runs an operation with idempotency: same key returns stored result (COMPLETED) or 409 if still PROCESSING.
   * Use for transfer, deposit, withdrawal. Worker receives the Prisma transaction client and must return a JSON-serializable result.
   */
  private async withIdempotency<T extends object>(
    userId: string,
    idempotencyKey: string,
    worker: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<IdempotencyResponse<T>> {
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: {
        userId_idempotencyKey: { userId, idempotencyKey },
      },
    });
    if (existing) {
      if (
        existing.status === IdempotencyStatus.COMPLETED &&
        existing.responsePayload
      ) {
        this.logger.log(
          `Idempotency replay: key ${idempotencyKey}, user ${userId}`,
        );
        const result = existing.responsePayload as unknown as T;
        return { result, idempotencyStatus: 'COMPLETED' };
      }
      if (existing.status === IdempotencyStatus.PROCESSING) {
        this.logger.warn(
          `Idempotency conflict: key ${idempotencyKey} in progress`,
        );
        throw new ConflictException({
          code: 'IDEMPOTENCY_IN_PROGRESS',
          idempotencyStatus: 'PROCESSING',
          message: IDEMPOTENCY_CONFLICT_MESSAGE,
        });
      }
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.idempotencyRecord.create({
          data: {
            userId,
            idempotencyKey,
            status: IdempotencyStatus.PROCESSING,
          },
        });

        const result = await worker(tx as Prisma.TransactionClient);

        await tx.idempotencyRecord.update({
          where: {
            userId_idempotencyKey: { userId, idempotencyKey },
          },
          data: {
            status: IdempotencyStatus.COMPLETED,
            responsePayload: result as object,
          },
        });

        return result;
      });
      return { result, idempotencyStatus: 'CREATED' };
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2002') {
        const record = await this.prisma.idempotencyRecord.findUnique({
          where: {
            userId_idempotencyKey: { userId, idempotencyKey },
          },
        });
        if (
          record?.status === IdempotencyStatus.COMPLETED &&
          record.responsePayload
        ) {
          this.logger.log(
            `Idempotency replay after conflict: key ${idempotencyKey}`,
          );
          const result = record.responsePayload as unknown as T;
          return { result, idempotencyStatus: 'COMPLETED' };
        }
        this.logger.warn(
          `Idempotency conflict: key ${idempotencyKey} in progress`,
        );
        throw new ConflictException({
          code: 'IDEMPOTENCY_IN_PROGRESS',
          idempotencyStatus: 'PROCESSING',
          message: IDEMPOTENCY_CONFLICT_MESSAGE,
        });
      }
      throw err;
    }
  }

  // ─── Private: mutation workers (run inside idempotent transaction) ────────

  private async doTransfer(
    tx: Prisma.TransactionClient,
    userId: string,
    dto: CreateTransferDto,
  ): Promise<CreateTransferResult> {
    const fromAccount = await tx.account.findUnique({
      where: { id: dto.fromAccountId, userId },
    });
    if (!fromAccount) {
      this.logger.warn(
        `From account with id ${dto.fromAccountId}, user ${userId} not found`,
      );
      throw new NotFoundException('From account not found');
    }
    if (fromAccount.balanceCents < dto.amountCents) {
      this.logger.warn(
        `Insufficient balance for account ${fromAccount.id}, user ${userId}`,
      );
      throw new BadRequestException('Insufficient balance');
    }
    const toAccount = await tx.account.findUnique({
      where: { id: dto.toAccountId },
    });
    if (!toAccount) {
      this.logger.warn(`To account with id ${dto.toAccountId} not found`);
      throw new NotFoundException('To account not found');
    }

    const transferId = randomUUID();
    const fromTransaction = await tx.transaction.create({
      data: {
        accountId: fromAccount.id,
        transferId,
        amountCents: -dto.amountCents,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.COMPLETED,
        transactionNote: dto.transactionNote,
      },
    });
    const toTransaction = await tx.transaction.create({
      data: {
        accountId: toAccount.id,
        transferId,
        amountCents: dto.amountCents,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.COMPLETED,
        transactionNote: dto.transactionNote,
      },
    });

    await tx.account.update({
      where: { id: fromAccount.id },
      data: { balanceCents: { decrement: dto.amountCents } },
    });
    await tx.account.update({
      where: { id: toAccount.id },
      data: { balanceCents: { increment: dto.amountCents } },
    });

    this.logger.log(
      `Transfer ${transferId}, from account ${fromAccount.id} to account ${toAccount.id}, amount ${dto.amountCents} cents, created successfully`,
    );

    return {
      type: 'TRANSFER',
      transferId,
      fromTransaction: toTransactionSummary(fromTransaction),
      toTransaction: toTransactionSummary(toTransaction),
    };
  }

  private async doDeposit(
    tx: Prisma.TransactionClient,
    userId: string,
    dto: CreateDepositDto,
  ): Promise<CreateDepositResult> {
    const account = await tx.account.findUnique({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      this.logger.warn(
        `Account with id ${dto.accountId}, user ${userId} not found`,
      );
      throw new NotFoundException('Account not found');
    }

    const transferId = randomUUID();
    const transaction = await tx.transaction.create({
      data: {
        accountId: account.id,
        transferId,
        amountCents: dto.amountCents,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        transactionNote: dto.transactionNote,
      },
    });

    await tx.account.update({
      where: { id: account.id },
      data: { balanceCents: { increment: dto.amountCents } },
    });

    this.logger.log(
      `Deposit ${transferId}, account ${account.id}, amount ${dto.amountCents} cents, created successfully`,
    );

    return {
      type: 'DEPOSIT',
      transferId,
      transaction: toTransactionSummary(transaction),
    };
  }

  private async doWithdrawal(
    tx: Prisma.TransactionClient,
    userId: string,
    dto: CreateWithdrawalDto,
  ): Promise<CreateWithdrawalResult> {
    const account = await tx.account.findUnique({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      this.logger.warn(
        `Account with id ${dto.accountId}, user ${userId} not found`,
      );
      throw new NotFoundException('Account not found');
    }
    if (account.balanceCents < dto.amountCents) {
      this.logger.warn(
        `Insufficient balance for account ${account.id}, user ${userId}`,
      );
      throw new BadRequestException('Insufficient balance');
    }

    const transferId = randomUUID();
    const transaction = await tx.transaction.create({
      data: {
        accountId: account.id,
        transferId,
        amountCents: -dto.amountCents,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.COMPLETED,
        transactionNote: dto.transactionNote,
      },
    });

    await tx.account.update({
      where: { id: account.id },
      data: { balanceCents: { decrement: dto.amountCents } },
    });

    this.logger.log(
      `Withdrawal ${transferId}, account ${account.id}, amount ${dto.amountCents} cents, created successfully`,
    );

    return {
      type: 'WITHDRAWAL',
      transferId,
      transaction: toTransactionSummary(transaction),
    };
  }

  // ─── Private: helpers ────────────────────────────────────────────────────

  /**
   * Returns account IDs to filter transactions: either the user's accounts (if no filter)
   * or the intersection of query.accountIds with the user's accounts (validates ownership).
   */
  private async resolveAccountIdsForTransactions(
    userId: string,
    filterAccountIds?: string[],
  ): Promise<string[]> {
    const userAccounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const userAccountIds = new Set(userAccounts.map((a) => a.id));

    if (!filterAccountIds?.length) {
      return Array.from(userAccountIds);
    }
    return filterAccountIds.filter((id) => userAccountIds.has(id));
  }
}
