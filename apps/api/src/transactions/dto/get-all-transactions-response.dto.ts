import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus, TransactionType } from '../../generated/prisma';

/** Single transaction row for list view (no heavy fields). */
export class TransactionListItemDto {
  @ApiProperty({ description: 'Transaction ID (CUID)' })
  id: string;

  @ApiProperty({ description: 'Account ID (CUID)' })
  accountId: string;

  @ApiProperty({
    description: 'Amount in cents (negative = debit, positive = credit)',
  })
  amountCents: number;

  @ApiProperty({ description: 'Shared ID for transfer legs' })
  transferId: string;

  @ApiProperty({ description: 'Date of the transaction' })
  transactionDate: string;

  @ApiPropertyOptional({ description: 'Optional note' })
  transactionNote?: string | null;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty({ description: 'Created at' })
  createdAt: string;
}

/** Cursor-paginated list of transactions. */
export class GetAllTransactionsResponseDto {
  @ApiProperty({
    type: [TransactionListItemDto],
    description: 'Transactions for the current page (newest first by id)',
  })
  data: TransactionListItemDto[];

  @ApiPropertyOptional({
    description:
      'Pass as cursor query param for the next page. Omitted when there are no more pages.',
  })
  nextCursor?: string;

  @ApiProperty({
    description:
      'True when more results exist (use nextCursor to fetch next page)',
  })
  hasMore: boolean;
}
