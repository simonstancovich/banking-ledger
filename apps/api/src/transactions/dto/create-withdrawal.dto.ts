import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { IsCuid } from 'src/common/decorators/is-cuid.decorator';

export class CreateWithdrawalDto {
  @ApiProperty({
    description: 'Account ID to debit (withdraw from)',
    example: 'clxx123456789012345678901',
  })
  @IsCuid()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    description: 'Amount in cents',
    example: 1000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  @Transform(({ value }) => Number(value))
  @Type(() => Number)
  amountCents: number;

  @ApiPropertyOptional({
    description: 'Transaction note',
    example: 'ATM withdrawal',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim() ?? undefined)
  transactionNote?: string;
}
