import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus } from '../../generated/prisma';

/** Single leg of a transfer (debit or credit) for API responses. */
export class TransferLegDto {
  @ApiProperty({
    description: 'Transaction ID (CUID)',
    example: 'clxx123456789012345678901',
  })
  id: string;

  @ApiProperty({
    description: 'Account ID (CUID)',
    example: 'clxx987654321098765432109',
  })
  accountId: string;

  @ApiProperty({
    description: 'Amount in cents (negative for debit, positive for credit)',
    example: -5000,
  })
  amountCents: number;

  @ApiProperty({ enum: TransactionStatus, description: 'Transaction status' })
  status: TransactionStatus;
}

/** Inner transfer result (both legs). */
export class CreateTransferResultDto {
  @ApiProperty({
    description: 'Discriminator for transfer result',
    enum: ['TRANSFER'],
    example: 'TRANSFER',
  })
  type: 'TRANSFER';

  @ApiProperty({
    description: 'Shared ID linking both legs of the transfer',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  transferId: string;

  @ApiProperty({
    type: TransferLegDto,
    description: 'Debit leg (from-account)',
  })
  fromTransaction: TransferLegDto;

  @ApiProperty({
    type: TransferLegDto,
    description: 'Credit leg (to-account)',
  })
  toTransaction: TransferLegDto;
}

/** 201 response for POST /transactions/transfer. Frontend can branch on idempotencyStatus. */
export class CreateTransferResponseDto {
  @ApiProperty({
    type: CreateTransferResultDto,
    description: 'The transfer (same on replay)',
  })
  result: CreateTransferResultDto;

  @ApiProperty({
    description:
      'CREATED = first time with this key; COMPLETED = replay (previous request already finished). Use COMPLETED to clear this key from localStorage and treat as final.',
    enum: ['CREATED', 'COMPLETED'],
    example: 'CREATED',
  })
  idempotencyStatus: 'CREATED' | 'COMPLETED';
}

/** Inner deposit result (single credit leg). */
export class CreateDepositResultDto {
  @ApiProperty({ enum: ['DEPOSIT'], example: 'DEPOSIT' })
  type: 'DEPOSIT';

  @ApiProperty({ description: 'Shared ID for this operation' })
  transferId: string;

  @ApiProperty({ type: TransferLegDto, description: 'Credit leg' })
  transaction: TransferLegDto;
}

/** 201 response for POST /transactions/deposit. */
export class CreateDepositResponseDto {
  @ApiProperty({ type: CreateDepositResultDto })
  result: CreateDepositResultDto;

  @ApiProperty({
    description: 'CREATED = first time; COMPLETED = replay.',
    enum: ['CREATED', 'COMPLETED'],
  })
  idempotencyStatus: 'CREATED' | 'COMPLETED';
}

/** Inner withdrawal result (single debit leg). */
export class CreateWithdrawalResultDto {
  @ApiProperty({ enum: ['WITHDRAWAL'], example: 'WITHDRAWAL' })
  type: 'WITHDRAWAL';

  @ApiProperty({ description: 'Shared ID for this operation' })
  transferId: string;

  @ApiProperty({ type: TransferLegDto, description: 'Debit leg' })
  transaction: TransferLegDto;
}

/** 201 response for POST /transactions/withdrawal. */
export class CreateWithdrawalResponseDto {
  @ApiProperty({ type: CreateWithdrawalResultDto })
  result: CreateWithdrawalResultDto;

  @ApiProperty({
    description: 'CREATED = first time; COMPLETED = replay.',
    enum: ['CREATED', 'COMPLETED'],
  })
  idempotencyStatus: 'CREATED' | 'COMPLETED';
}

/** 409 response when the same idempotency key is still processing. */
export class IdempotencyConflictResponseDto {
  @ApiProperty({ example: 'IDEMPOTENCY_IN_PROGRESS' })
  code: string;

  @ApiProperty({
    description:
      'Request with this key is still processing. Retry the same request after a short delay.',
    enum: ['PROCESSING'],
    example: 'PROCESSING',
  })
  idempotencyStatus: 'PROCESSING';

  @ApiProperty({
    example:
      'A request with this idempotency key is already in progress. Retry after a short delay.',
  })
  message: string;
}
