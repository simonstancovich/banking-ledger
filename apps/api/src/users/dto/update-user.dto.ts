import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../generated/prisma';

const RoleEnum: Record<string, string> = {
  USER: 'USER',
  ADMIN: 'ADMIN',
};

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: RoleEnum,
  })
  @IsOptional()
  @IsEnum(RoleEnum)
  role?: Role;
}
