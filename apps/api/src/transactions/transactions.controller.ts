import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Body,
  Query,
  Version,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import {
  CreateTransferResponseDto,
  CreateDepositResponseDto,
  CreateWithdrawalResponseDto,
  IdempotencyConflictResponseDto,
} from './dto/create-transfer-response.dto';
import { GetAllTransactionsQueryDto } from './dto/get-all-transactions-query.dto';
import {
  GetAllTransactionsResponseDto,
  TransactionListItemDto,
} from './dto/get-all-transactions-response.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import type { AuthedRequestGuarded } from '../auth/firebase-auth.guard';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

@ApiTags('transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
@UseGuards(FirebaseAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('transfer')
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create transfer',
    description:
      'Creates a two-legged transfer (debit from one account, credit to another). Requires Idempotency-Key header. Same key returns the same result without creating a duplicate transfer.',
  })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    description: 'Unique key for idempotency (e.g. UUID). Required.',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer created',
    type: CreateTransferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g. missing Idempotency-Key)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description:
      'Idempotency key in progress (idempotencyStatus: PROCESSING). Retry the same request after a short delay.',
    type: IdempotencyConflictResponseDto,
  })
  async createTransfer(
    @Request() req: AuthedRequestGuarded,
    @Body() body: CreateTransferDto,
    @Headers(IDEMPOTENCY_KEY_HEADER) idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    return this.transactionsService.createTransfer(
      req.user,
      body,
      idempotencyKey.trim(),
    );
  }

  @Post('deposit')
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create deposit',
    description:
      'Credits an account (one-legged deposit). Requires Idempotency-Key header.',
  })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    description: 'Unique key for idempotency (e.g. UUID). Required.',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Deposit created',
    type: CreateDepositResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Idempotency key in progress',
    type: IdempotencyConflictResponseDto,
  })
  async createDeposit(
    @Request() req: AuthedRequestGuarded,
    @Body() body: CreateDepositDto,
    @Headers(IDEMPOTENCY_KEY_HEADER) idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    return this.transactionsService.createDeposit(
      req.user,
      body,
      idempotencyKey.trim(),
    );
  }

  @Post('withdrawal')
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create withdrawal',
    description:
      'Debits an account (one-legged withdrawal). Requires Idempotency-Key header. Fails if insufficient balance.',
  })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    description: 'Unique key for idempotency (e.g. UUID). Required.',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal created',
    type: CreateWithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g. insufficient balance)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Idempotency key in progress',
    type: IdempotencyConflictResponseDto,
  })
  async createWithdrawal(
    @Request() req: AuthedRequestGuarded,
    @Body() body: CreateWithdrawalDto,
    @Headers(IDEMPOTENCY_KEY_HEADER) idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    return this.transactionsService.createWithdrawal(
      req.user,
      body,
      idempotencyKey.trim(),
    );
  }

  @Get('admin/by-user/:userId')
  @Version('1')
  @ApiOperation({
    summary: '[Admin] List transactions for a user',
    description:
      'Returns cursor-paginated transactions for the given userId. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated transactions for the user',
    type: GetAllTransactionsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAllByUserId(
    @Request() req: AuthedRequestGuarded,
    @Param('userId') userId: string,
    @Query() query: GetAllTransactionsQueryDto,
  ) {
    return this.transactionsService.getTransactionsByUserId(
      req.user,
      userId,
      query,
    );
  }

  @Get('admin/all')
  @Version('1')
  @ApiOperation({
    summary: '[Admin] List all transactions',
    description:
      'Returns cursor-paginated list of all transactions. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated transactions',
    type: GetAllTransactionsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAllAdmin(
    @Request() req: AuthedRequestGuarded,
    @Query() query: GetAllTransactionsQueryDto,
  ) {
    return this.transactionsService.getAllTransactionsAdmin(req.user, query);
  }

  @Get()
  @Version('1')
  @ApiOperation({
    summary: 'List transactions',
    description:
      'Cursor-paginated list of transactions for the current user. Optimized for large datasets (no OFFSET). Use nextCursor for the next page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated transactions',
    type: GetAllTransactionsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Request() req: AuthedRequestGuarded,
    @Query() query: GetAllTransactionsQueryDto,
  ) {
    return this.transactionsService.getTransactions(req.user, query);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({
    summary: 'Get transaction by ID',
    description:
      "Returns a single transaction by id. Only succeeds if the transaction belongs to one of the current user's accounts.",
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction',
    type: TransactionListItemDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findOne(@Request() req: AuthedRequestGuarded, @Param('id') id: string) {
    return this.transactionsService.getTransaction(req.user, id);
  }
}
