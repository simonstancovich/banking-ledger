import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AccountType } from '../../generated/prisma';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Account name',
    example: 'Checking Account',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Account type',
    example: 'CHECKING',
    enum: AccountType,
  })
  @IsOptional()
  @IsEnum(AccountType)
  @Transform(({ value }) => value ?? AccountType.CHECKING)
  type?: AccountType;

  @ApiPropertyOptional({
    description: 'Account balance in cents (defaults to 0 if omitted)',
    example: 1000,
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? Number(value) : 0,
  )
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  balanceCents?: number = 0;
}
