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

export class CreateTransferDto {
  @ApiProperty({
    description: 'From account ID',
    example: 'clxx123456789012345678901',
  })
  @IsCuid()
  @IsNotEmpty()
  fromAccountId: string;

  @ApiProperty({
    description: 'To account ID',
    example: 'clxx123456789012345678901',
  })
  @IsCuid()
  @IsNotEmpty()
  toAccountId: string;

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
    example: 'Transfer from checking to savings',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim() ?? undefined)
  transactionNote?: string;
}
