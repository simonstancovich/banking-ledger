import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';
import { AccountType } from '../../generated/prisma';
import { IsDate, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Account response including owner info. Used for admin list of all accounts.
 */
export class AccountWithUserResponseDto {
  @ApiProperty({
    description: 'Account ID (CUID)',
    example: 'clxx123456789012345678901',
    pattern: '^c[0-9a-z]{24}$',
  })
  @IsCuid()
  id: string;

  @ApiPropertyOptional({
    description: 'Account type',
    example: 'CHECKING',
    enum: AccountType,
  })
  type: AccountType;

  @ApiProperty({
    description: 'Account display name',
    example: 'Main Checking',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Balance in cents',
    example: 10000,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  balanceCents: number;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsDate()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsDate()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  updatedAt: Date;

  @ApiProperty({
    description: 'Account owner (included for admin list only)',
    example: { id: 'clxx987654321098765432109', email: 'user@example.com' },
  })
  user: {
    id: string;
    email: string;
  };
}

/** Paginated list of accounts with owner (admin only). */
export class GetAllAccountsResponseDto {
  @ApiProperty({
    type: [AccountWithUserResponseDto],
    description: 'Accounts for the current page',
  })
  data: AccountWithUserResponseDto[];

  @ApiProperty({ description: 'Total number of accounts' })
  total: number;

  @ApiProperty({ description: 'Current page (1-based)' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
