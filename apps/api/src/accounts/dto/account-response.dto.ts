import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';
import { AccountType } from '../../generated/prisma';
import { IsDate, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Public account shape for API responses. Only exposes safe fields (no userId, no relations).
 */
export class AccountResponseDto {
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
}
