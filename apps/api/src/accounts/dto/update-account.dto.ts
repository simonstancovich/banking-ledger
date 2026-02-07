import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountType } from '../../generated/prisma';

/**
 * Fields allowed when updating an account. balanceCents is intentionally
 * excluded—balance changes must go through transactions.
 */
export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: 'Account display name',
    example: 'Main Checking',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Account type',
    example: 'CHECKING',
    enum: AccountType,
  })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;
}
