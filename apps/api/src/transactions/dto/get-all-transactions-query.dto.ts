import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export class GetAllTransactionsQueryDto {
  @ApiPropertyOptional({
    description:
      'Page size. Use with cursor for next page. Cursor-based pagination avoids slow OFFSET at scale.',
    default: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description:
      'Cursor for next page (opaque ID from previous response nextCursor). Omit for first page.',
    example: 'clxx123456789012345678901',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cursor?: string;

  @ApiPropertyOptional({
    description:
      'Only transactions for these account IDs (must belong to current user). Comma-separated or repeated param.',
    example: 'clxx111,clxx222',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(value)
        ? value
            .map((v) => (typeof v === 'string' ? v.trim() : v))
            .filter(Boolean)
        : value,
  )
  @IsArray()
  @IsCuid({ each: true })
  accountIds?: string[];

  @ApiPropertyOptional({
    description: 'Transactions on or after this date (ISO 8601).',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({
    description: 'Transactions on or before this date (ISO 8601).',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  until?: string;
}

export const GET_ALL_TRANSACTIONS_DEFAULTS = {
  limit: DEFAULT_LIMIT,
  maxLimit: MAX_LIMIT,
} as const;
